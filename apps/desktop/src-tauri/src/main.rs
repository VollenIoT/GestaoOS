// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::process::Command;
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct DownloadProgressPayload {
  downloaded: u64,
  total: u64,
  percent: u32,
  status: String,
}

#[tauri::command]
fn close_app() {
  std::process::exit(0);
}

#[tauri::command]
fn save_backup_file(path: String, content: String) -> Result<(), String> {
  let file_path = Path::new(&path);
  if let Some(parent) = file_path.parent() {
    if !parent.exists() {
      fs::create_dir_all(parent).map_err(|e| format!("Erro ao criar diretório: {}", e))?;
    }
  }
  fs::write(file_path, content).map_err(|e| format!("Erro ao gravar arquivo de backup: {}", e))?;
  Ok(())
}

#[tauri::command]
fn read_backup_file(path: String) -> Result<String, String> {
  let file_path = Path::new(&path);
  if !file_path.exists() {
    return Err(format!("Arquivo de backup não encontrado no caminho: {}", path));
  }
  fs::read_to_string(file_path).map_err(|e| format!("Erro ao ler arquivo de backup: {}", e))
}

#[tauri::command]
async fn download_and_run_installer(
  app: AppHandle,
  url: String,
  version: String,
) -> Result<(), String> {
  let temp_dir = std::env::temp_dir();
  let timestamp = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap_or_default()
    .as_secs();
  let installer_filename = format!("VollenOS_Setup_{}_{}.exe", version.replace(".", "_"), timestamp);
  let installer_path = temp_dir.join(&installer_filename);

  // Se o arquivo por acaso já existir, remove para não colidir ou reutilizar arquivo corrompido
  if installer_path.exists() {
    let _ = fs::remove_file(&installer_path);
  }

  let _ = app.emit(
    "update-download-progress",
    DownloadProgressPayload {
      downloaded: 0,
      total: 0,
      percent: 0,
      status: "Conectando ao servidor...".to_string(),
    },
  );

  // Converte links do Google Drive para link direto de download se aplicável
  let mut download_target_url = url.clone();
  if url.contains("drive.google.com") {
    if let Some(pos) = url.find("/d/") {
      let rest = &url[pos + 3..];
      let file_id = rest.split('/').next().unwrap_or("").split('?').next().unwrap_or("");
      if !file_id.is_empty() {
        download_target_url = format!("https://drive.google.com/uc?export=download&id={}", file_id);
      }
    } else if let Some(pos) = url.find("id=") {
      let rest = &url[pos + 3..];
      let file_id = rest.split('&').next().unwrap_or("");
      if !file_id.is_empty() {
        download_target_url = format!("https://drive.google.com/uc?export=download&id={}", file_id);
      }
    }
  }

  let client = reqwest::blocking::Client::builder()
    .timeout(std::time::Duration::from_secs(600))
    .cookie_store(true)
    .redirect(reqwest::redirect::Policy::limited(15))
    .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    .build()
    .map_err(|e| format!("Falha ao iniciar cliente HTTP: {}", e))?;

  let mut response = client
    .get(&download_target_url)
    .send()
    .map_err(|e| format!("Falha ao conectar com o link de atualização: {}", e))?;

  if !response.status().is_success() {
    return Err(format!(
      "Servidor retornou erro HTTP {}: {}",
      response.status(),
      response.status().canonical_reason().unwrap_or("Desconhecido")
    ));
  }

  // Se o Google Drive responder com HTML de tela de confirmação de vírus (para arquivos grandes > 100MB)
  let is_html = response
    .headers()
    .get(reqwest::header::CONTENT_TYPE)
    .and_then(|v| v.to_str().ok())
    .map(|ct| ct.to_lowercase().contains("text/html"))
    .unwrap_or(false);

  if is_html && download_target_url.contains("drive.google.com") {
    let html_body = response.text().unwrap_or_default();
    let mut confirmed_url: Option<String> = None;

    if let Some(pos) = html_body.find("confirm=") {
      let rest = &html_body[pos + 8..];
      let token = rest.split('&').next().unwrap_or("").split('"').next().unwrap_or("").split('\'').next().unwrap_or("");
      if !token.is_empty() {
        confirmed_url = Some(format!("{}&confirm={}", download_target_url, token));
      }
    } else if html_body.contains("action=\"https://drive.google.com/uc") {
      if let Some(uuid_pos) = html_body.find("name=\"uuid\" value=\"") {
        let uuid = &html_body[uuid_pos + 19..].split('"').next().unwrap_or("");
        confirmed_url = Some(format!("{}&confirm=t&uuid={}", download_target_url, uuid));
      }
    }

    if let Some(next_url) = confirmed_url {
      response = client
        .get(&next_url)
        .send()
        .map_err(|e| format!("Falha ao confirmar download do Google Drive: {}", e))?;
    } else {
      return Err("O link do Google Drive requer permissão de acesso público ('Qualquer pessoa com o link').".to_string());
    }
  }

  let total_size = response.content_length().unwrap_or(0);

  let mut dest_file = File::create(&installer_path)
    .map_err(|e| format!("Não foi possível criar o arquivo do instalador: {}", e))?;

  let mut downloaded: u64 = 0;
  let mut buffer = [0u8; 32768]; // 32KB buffer

  loop {
    let bytes_read = response
      .read(&mut buffer)
      .map_err(|e| format!("Erro durante o download do pacote: {}", e))?;

    if bytes_read == 0 {
      break;
    }

    dest_file
      .write_all(&buffer[..bytes_read])
      .map_err(|e| format!("Erro ao gravar dados no disco: {}", e))?;

    downloaded += bytes_read as u64;

    let percent = if total_size > 0 {
      ((downloaded as f64 / total_size as f64) * 100.0) as u32
    } else {
      0
    };

    let _ = app.emit(
      "update-download-progress",
      DownloadProgressPayload {
        downloaded,
        total: total_size,
        percent: percent.min(100),
        status: if total_size > 0 {
          format!("Baixando atualização: {}%", percent.min(100))
        } else {
          format!("Baixando atualização: {:.1} MB", downloaded as f64 / (1024.0 * 1024.0))
        },
      },
    );
  }

  let _ = dest_file.flush();
  let _ = dest_file.sync_all();
  drop(dest_file);

  if downloaded < 100_000 {
    let _ = fs::remove_file(&installer_path);
    return Err("O arquivo baixado está corrompido ou o link fornecido não aponta para um instalador executável (.exe direto).".to_string());
  }

  let _ = app.emit(
    "update-download-progress",
    DownloadProgressPayload {
      downloaded,
      total: total_size,
      percent: 100,
      status: "Download finalizado! Executando instalador...".to_string(),
    },
  );

  // Executar instalador silenciosamente ou em janela padrão do NSIS
  #[cfg(target_os = "windows")]
  {
    Command::new(&installer_path)
      .spawn()
      .map_err(|e| format!("Erro ao iniciar o instalador: {}", e))?;
  }

  #[cfg(not(target_os = "windows"))]
  {
    Command::new("open")
      .arg(&installer_path)
      .spawn()
      .map_err(|e| format!("Erro ao iniciar o instalador: {}", e))?;
  }

  // Dar 1 segundo e encerrar a aplicação atual para permitir que o instalador substitua os arquivos
  std::thread::sleep(std::time::Duration::from_millis(800));
  std::process::exit(0);
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![
      close_app,
      save_backup_file,
      read_backup_file,
      download_and_run_installer
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

