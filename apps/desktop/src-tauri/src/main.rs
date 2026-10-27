// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

#[derive(Clone, serde::Serialize)]
struct DownloadProgressPayload {
  downloaded: u64,
  total: u64,
  percent: u32,
  status: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub struct TrialStatusPayload {
  pub is_trial: bool,
  pub is_expired: bool,
  pub is_licensed: bool,
  pub days_left: u32,
  pub total_days: u32,
  pub machine_id: String,
  pub is_tampered: bool,
  pub first_run_timestamp: u64,
  pub max_seen_timestamp: u64,
  pub accumulated_seconds: u64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
struct SecureTrialStore {
  machine_id: String,
  first_run: u64,
  max_seen_time: u64,
  accumulated_seconds: u64,
  is_licensed: bool,
  license_serial: Option<String>,
  tampered: bool,
  checksum: String,
}

static SESSION_START: Mutex<Option<Instant>> = Mutex::new(None);
static CACHED_MACHINE_ID: Mutex<Option<String>> = Mutex::new(None);

fn get_stable_machine_id() -> String {
  let mut cached = CACHED_MACHINE_ID.lock().unwrap();
  if let Some(ref id) = *cached {
    return id.clone();
  }

  // Coleta múltiplos identificadores do sistema operacional / hardware
  let computer_name = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "UNKNOWN_PC".to_string());
  let user_name = std::env::var("USERNAME").unwrap_or_else(|_| "DEFAULT_USER".to_string());
  let sys_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
  let processor_id = std::env::var("PROCESSOR_IDENTIFIER").unwrap_or_else(|_| "CPU".to_string());

  // Gera hash SHA256 simulado ou FNV-1a / DJB2 robusto
  let seed = format!("{}_{}_{}_{}_VOLLEN_SECURE_GUARD_2026", computer_name, user_name, sys_root, processor_id);
  let mut hash: u64 = 0xcbf29ce484222325;
  for byte in seed.bytes() {
    hash ^= byte as u64;
    hash = hash.wrapping_mul(0x100000001b3);
  }
  let machine_id = format!("VMID-{:016X}", hash);
  *cached = Some(machine_id.clone());
  machine_id
}

fn compute_store_checksum(store: &SecureTrialStore) -> String {
  let raw = format!(
    "{}#{}:{}#{}:{}:{}:#VOLLEN_SALT_KEY_2026",
    store.machine_id,
    store.first_run,
    store.max_seen_time,
    store.accumulated_seconds,
    store.is_licensed,
    store.tampered
  );
  let mut hash: u64 = 0x84222325cbf29ce4;
  for byte in raw.bytes() {
    hash ^= byte as u64;
    hash = hash.wrapping_mul(0x100000001b3);
  }
  format!("{:016X}", hash)
}

// Retorna múltiplos caminhos independentes de âncora no sistema de arquivos
// que sobrevivem à desinstalação / reinstalação do aplicativo.
fn get_anchor_paths() -> Vec<PathBuf> {
  let mut paths = Vec::new();

  // Âncora 1: ProgramData raiz e subpastas do sistema
  if let Ok(prog_data) = std::env::var("ProgramData") {
    paths.push(PathBuf::from(&prog_data).join("VollenOS").join(".sys_lic_guard.dat"));
    paths.push(PathBuf::from(&prog_data).join("Microsoft").join("Crypto").join("RSA").join("MachineKeys").join(".vln_sys_guard.dat"));
    paths.push(PathBuf::from(&prog_data).join("Microsoft").join("Vault").join(".vln_reg_core.bin"));
  }

  // Âncora 2: AppData Local (Caches do Windows)
  if let Ok(local_app) = std::env::var("LOCALAPPDATA") {
    paths.push(PathBuf::from(&local_app).join("Microsoft").join("Windows").join("Caches").join(".vln_reg_sys.bin"));
    paths.push(PathBuf::from(&local_app).join("Microsoft").join("Vault").join(".sys_lic_guard.dat"));
  }

  // Âncora 3: AppData Roaming do usuário
  if let Ok(app_data) = std::env::var("APPDATA") {
    paths.push(PathBuf::from(&app_data).join("Microsoft").join("Protect").join(".vln_sec_token.dat"));
    paths.push(PathBuf::from(&app_data).join("VollenOS").join(".trial_anchor.dat"));
  }

  // Âncora 4: Diretório raiz do perfil do usuário
  if let Ok(user_prof) = std::env::var("USERPROFILE") {
    paths.push(PathBuf::from(&user_prof).join(".vln_machine_anchor.dat"));
  }

  paths
}

// Lê todas as âncoras disponíveis e consolida para evitar que a reinstalação reverta a contagem:
// - Mantém o `first_run` mais antigo registrado na máquina
// - Mantém o `max_seen_time` e `accumulated_seconds` mais altos
// - Mantém licença permanente caso qualquer âncora esteja licenciada
fn read_anchor_store() -> Option<SecureTrialStore> {
  let mut candidate_stores = Vec::new();

  for path in get_anchor_paths() {
    if path.exists() {
      if let Ok(data) = fs::read_to_string(&path) {
        if let Ok(store) = serde_json::from_str::<SecureTrialStore>(&data) {
          let expected_sum = compute_store_checksum(&store);
          if store.checksum == expected_sum {
            candidate_stores.push(store);
          }
        }
      }
    }
  }

  if candidate_stores.is_empty() {
    return None;
  }

  // Consolidação segura entre todas as âncoras encontradas
  let mut consolidated = candidate_stores[0].clone();
  for s in &candidate_stores[1..] {
    if s.is_licensed {
      consolidated.is_licensed = true;
      if s.license_serial.is_some() {
        consolidated.license_serial = s.license_serial.clone();
      }
    }
    if s.tampered {
      consolidated.tampered = true;
    }
    if s.first_run > 0 && (consolidated.first_run == 0 || s.first_run < consolidated.first_run) {
      consolidated.first_run = s.first_run;
    }
    if s.max_seen_time > consolidated.max_seen_time {
      consolidated.max_seen_time = s.max_seen_time;
    }
    if s.accumulated_seconds > consolidated.accumulated_seconds {
      consolidated.accumulated_seconds = s.accumulated_seconds;
    }
  }

  Some(consolidated)
}

fn save_anchor_store(store: &SecureTrialStore) {
  let mut store_with_sum = store.clone();
  store_with_sum.checksum = compute_store_checksum(&store_with_sum);
  if let Ok(json) = serde_json::to_string(&store_with_sum) {
    for path in get_anchor_paths() {
      if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
      }
      let _ = fs::write(&path, &json);
      // Marca arquivo como oculto/sistema no Windows
      #[cfg(target_os = "windows")]
      {
        use std::ffi::OsStr;
        use std::os::windows::ffi::OsStrExt;
        let wide_path: Vec<u16> = OsStr::new(path.as_os_str()).encode_wide().chain(std::iter::once(0)).collect();
        extern "system" {
          fn SetFileAttributesW(lpFileName: *const u16, dwFileAttributes: u32) -> i32;
        }
        unsafe {
          // FILE_ATTRIBUTE_HIDDEN (0x2)
          SetFileAttributesW(wide_path.as_ptr(), 0x2);
        }
      }
    }
  }
}

fn init_or_tick_trial(is_heartbeat: bool) -> TrialStatusPayload {
  let machine_id = get_stable_machine_id();
  let now_epoch = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();

  // Inicializa sessão Instant se não estiver inicializada
  let mut session_guard = SESSION_START.lock().unwrap();
  let _session_elapsed_secs = match *session_guard {
    Some(inst) => inst.elapsed().as_secs(),
    None => {
      *session_guard = Some(Instant::now());
      0
    }
  };

  let store = match read_anchor_store() {
    Some(mut s) => {
      // Se a máquina for a mesma, atualiza métricas
      let mut is_tampered = s.tampered;

      // Proteção Anti-Clock Tampering (Retrocesso de Data):
      // Se a data atual for menor que o máximo já visto no passado com tolerância de 2 horas (fuso/drift)
      if now_epoch + 7200 < s.max_seen_time {
        is_tampered = true;
      }

      let new_max_seen = s.max_seen_time.max(now_epoch);
      let session_delta = if is_heartbeat { 60 } else { 0 };
      let new_accumulated = s.accumulated_seconds + session_delta;

      s.max_seen_time = new_max_seen;
      s.accumulated_seconds = new_accumulated;
      s.tampered = is_tampered;
      s
    }
    None => {
      // Primeiro registro do sistema nesta máquina
      SecureTrialStore {
        machine_id: machine_id.clone(),
        first_run: now_epoch,
        max_seen_time: now_epoch,
        accumulated_seconds: 0,
        is_licensed: false,
        license_serial: None,
        tampered: false,
        checksum: String::new(),
      }
    }
  };

  save_anchor_store(&store);

  let total_trial_days: u32 = 10;
  let trial_total_seconds: u64 = total_trial_days as u64 * 86400; // 10 dias = 864.000 segundos

  // Se já possui licença definitiva ativada
  if store.is_licensed {
    return TrialStatusPayload {
      is_trial: false,
      is_expired: false,
      is_licensed: true,
      days_left: 9999,
      total_days: total_trial_days,
      machine_id,
      is_tampered: false,
      first_run_timestamp: store.first_run,
      max_seen_timestamp: store.max_seen_time,
      accumulated_seconds: store.accumulated_seconds,
    };
  }

  // Cálculo de tempo decorrido seguro:
  // Usa o maior entre:
  // 1. Diferença de calendário (max_seen_time - first_run)
  // 2. Tempo de uso ativo (accumulated_seconds)
  let elapsed_calendar_seconds = if store.max_seen_time >= store.first_run {
    store.max_seen_time - store.first_run
  } else {
    0
  };

  let effective_elapsed_seconds = elapsed_calendar_seconds.max(store.accumulated_seconds);

  let is_expired = store.tampered || effective_elapsed_seconds >= trial_total_seconds;
  let seconds_left = if effective_elapsed_seconds < trial_total_seconds {
    trial_total_seconds - effective_elapsed_seconds
  } else {
    0
  };

  let days_left = if is_expired {
    0
  } else {
    let days = (seconds_left as f64 / 86400.0).ceil() as u32;
    days.clamp(1, total_trial_days)
  };

  TrialStatusPayload {
    is_trial: true,
    is_expired,
    is_licensed: false,
    days_left,
    total_days: total_trial_days,
    machine_id,
    is_tampered: store.tampered,
    first_run_timestamp: store.first_run,
    max_seen_timestamp: store.max_seen_time,
    accumulated_seconds: store.accumulated_seconds,
  }
}

#[tauri::command]
fn get_system_trial_status() -> TrialStatusPayload {
  init_or_tick_trial(false)
}

#[tauri::command]
fn heartbeat_trial_tick() -> TrialStatusPayload {
  init_or_tick_trial(true)
}

#[tauri::command]
fn activate_system_permanent_license(serial: String) -> Result<TrialStatusPayload, String> {
  let clean_serial = serial.trim().to_uppercase();
  if clean_serial.len() < 10 {
    return Err("Chave serial inválida.".to_string());
  }

  let mut store = read_anchor_store().unwrap_or_else(|| {
    let machine_id = get_stable_machine_id();
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    SecureTrialStore {
      machine_id,
      first_run: now,
      max_seen_time: now,
      accumulated_seconds: 0,
      is_licensed: true,
      license_serial: Some(clean_serial.clone()),
      tampered: false,
      checksum: String::new(),
    }
  });

  store.is_licensed = true;
  store.license_serial = Some(clean_serial);
  store.tampered = false;
  save_anchor_store(&store);

  Ok(init_or_tick_trial(false))
}

#[tauri::command]
fn deactivate_system_permanent_license() -> Result<TrialStatusPayload, String> {
  if let Some(mut store) = read_anchor_store() {
    store.is_licensed = false;
    store.license_serial = None;
    save_anchor_store(&store);
  }
  Ok(init_or_tick_trial(false))
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

  // Executar instalador com privilégios de administrador (UAC) para evitar erro 740
  #[cfg(target_os = "windows")]
  {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    let path_wide: Vec<u16> = OsStr::new(&installer_path)
      .encode_wide()
      .chain(std::iter::once(0))
      .collect();

    let verb_wide: Vec<u16> = OsStr::new("runas")
      .encode_wide()
      .chain(std::iter::once(0))
      .collect();

    extern "system" {
      fn ShellExecuteW(
        hwnd: isize,
        lpOperation: *const u16,
        lpFile: *const u16,
        lpParameters: *const u16,
        lpDirectory: *const u16,
        nShowCmd: i32,
      ) -> isize;
    }

    let res = unsafe {
      ShellExecuteW(
        0,
        verb_wide.as_ptr(),
        path_wide.as_ptr(),
        std::ptr::null(),
        std::ptr::null(),
        1, // SW_SHOWNORMAL
      )
    };

    if res <= 32 {
      // Se 'runas' falhar, tenta com 'open' padrão
      let verb_open: Vec<u16> = OsStr::new("open")
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

      let res_open = unsafe {
        ShellExecuteW(
          0,
          verb_open.as_ptr(),
          path_wide.as_ptr(),
          std::ptr::null(),
          std::ptr::null(),
          1,
        )
      };

      if res_open <= 32 {
        return Err(format!("Erro ao executar o instalador (código de erro Windows: {}).", res_open));
      }
    }
  }

  #[cfg(not(target_os = "windows"))]
  {
    Command::new("open")
      .arg(&installer_path)
      .spawn()
      .map_err(|e| format!("Erro ao iniciar o instalador: {}", e))?;
  }

  std::thread::sleep(std::time::Duration::from_millis(800));
  std::process::exit(0);
}

#[tauri::command]
fn get_local_machine_ip() -> Result<Vec<String>, String> {
  use std::net::UdpSocket;
  let mut ips = Vec::new();

  // Método 1: Tenta descobrir a rota local conectando um socket UDP fictício na rede
  if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
    if socket.connect("8.8.8.8:80").is_ok() {
      if let Ok(local_addr) = socket.local_addr() {
        let ip = local_addr.ip().to_string();
        if ip != "127.0.0.1" && !ip.is_empty() {
          ips.push(ip);
        }
      }
    }
  }

  // Se não obteve via rota externa (ambiente 100% offline sem gateway), tenta socket broadcast local
  if ips.is_empty() {
    if let Ok(socket) = UdpSocket::bind("0.0.0.0:0") {
      if socket.connect("192.168.1.255:80").is_ok() {
        if let Ok(local_addr) = socket.local_addr() {
          let ip = local_addr.ip().to_string();
          if ip != "127.0.0.1" && !ip.is_empty() && !ips.contains(&ip) {
            ips.push(ip);
          }
        }
      }
    }
  }

  if ips.is_empty() {
    ips.push("127.0.0.1".to_string());
  }

  Ok(ips)
}

#[tauri::command]
fn test_tcp_port_connection(host: String, port: u16) -> Result<bool, String> {
  use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
  use std::time::Duration;

  let target = format!("{}:{}", host.trim(), port);
  let addrs: Vec<SocketAddr> = target
    .to_socket_addrs()
    .map_err(|e| format!("Endereço ou IP inválido: {}", e))?
    .collect();

  if addrs.is_empty() {
    return Err("Nenhum endereço encontrado para o IP informado.".to_string());
  }

  for addr in addrs {
    if let Ok(_) = TcpStream::connect_timeout(&addr, Duration::from_millis(2500)) {
      return Ok(true);
    }
  }

  Err(format!("Não foi possível conectar a {}:{}. Verifique se o Servidor está ligado e a porta {} está aberta.", host, port, port))
}

static EMBEDDED_SERVER_RUNNING: Mutex<bool> = Mutex::new(false);
static SERVER_DATABASE_STATE: Mutex<Option<serde_json::Value>> = Mutex::new(None);

#[tauri::command]
fn update_server_local_state(data: serde_json::Value) -> Result<bool, String> {
  let mut state = SERVER_DATABASE_STATE.lock().map_err(|e| e.to_string())?;
  *state = Some(data);
  Ok(true)
}

#[tauri::command]
fn get_server_local_state() -> Result<Option<serde_json::Value>, String> {
  let state = SERVER_DATABASE_STATE.lock().map_err(|e| e.to_string())?;
  Ok((*state).clone())
}

#[tauri::command]
fn stop_embedded_local_server() -> Result<bool, String> {
  let mut running = EMBEDDED_SERVER_RUNNING.lock().unwrap();
  *running = false;
  Ok(true)
}

#[tauri::command]
fn start_embedded_local_server(port: u16) -> Result<String, String> {
  use std::net::TcpListener;
  use std::io::{Read, Write};
  use std::thread;

  let mut running = EMBEDDED_SERVER_RUNNING.lock().unwrap();
  if *running {
    return Ok(format!("Servidor local já está em execução na porta {}", port));
  }

  let bind_addr = format!("0.0.0.0:{}", port);
  let listener = match TcpListener::bind(&bind_addr) {
    Ok(l) => l,
    Err(e) => return Err(format!("Falha ao abrir porta {} do servidor: {}", port, e)),
  };

  *running = true;
  drop(running);

  thread::spawn(move || {
    for stream in listener.incoming() {
      if let Ok(mut stream) = stream {
        thread::spawn(move || {
          let mut buffer = Vec::new();
          let mut temp_buf = [0u8; 8192];
          let mut content_length: Option<usize> = None;
          let mut header_end_pos: Option<usize> = None;

          loop {
            match stream.read(&mut temp_buf) {
              Ok(0) => break,
              Ok(n) => {
                buffer.extend_from_slice(&temp_buf[..n]);

                if header_end_pos.is_none() {
                  if let Some(pos) = buffer.windows(4).position(|w| w == b"\r\n\r\n") {
                    header_end_pos = Some(pos + 4);
                    let header_str = String::from_utf8_lossy(&buffer[..pos]);
                    for line in header_str.lines() {
                      if line.to_lowercase().starts_with("content-length:") {
                        if let Some(len_str) = line.split(':').nth(1) {
                          content_length = len_str.trim().parse::<usize>().ok();
                        }
                      }
                    }
                  }
                }

                if let (Some(header_end), Some(cl)) = (header_end_pos, content_length) {
                  if buffer.len() >= header_end + cl {
                    break;
                  }
                } else if header_end_pos.is_some() && content_length.is_none() {
                  break;
                }
              }
              Err(_) => break,
            }
          }

          if !buffer.is_empty() {
            let raw_req = String::from_utf8_lossy(&buffer);
            let first_line = raw_req.lines().next().unwrap_or("");
            let is_options = first_line.starts_with("OPTIONS");

            let mut status_code = "200 OK";
            let content_type = "application/json; charset=utf-8";
            let body: String;

            if is_options {
              let cors_response = "HTTP/1.1 204 No Content\r\n\
                Access-Control-Allow-Origin: *\r\n\
                Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n\
                Access-Control-Allow-Headers: *\r\n\
                Access-Control-Max-Age: 86400\r\n\
                Content-Length: 0\r\n\
                Connection: close\r\n\r\n";
              let _ = stream.write_all(cors_response.as_bytes());
              let _ = stream.flush();
              return;
            }

            let is_server_active = *EMBEDDED_SERVER_RUNNING.lock().unwrap();
            if !is_server_active {
              status_code = "503 Service Unavailable";
              body = r#"{"status":"offline","error":"Servidor Local foi desativado ou migrado para nuvem."}"#.to_string();
            } else if first_line.contains("GET /health") || first_line.contains("GET / ") {
              body = r#"{"status":"ok","server":"VollenOS Native LAN Server","version":"3.0.0"}"#.to_string();
            } else if first_line.contains("GET /api/sync/all") {
              // Retorna todos os dados armazenados no Servidor
              if let Ok(state_lock) = SERVER_DATABASE_STATE.lock() {
                if let Some(ref current_state) = *state_lock {
                  body = current_state.to_string();
                } else {
                  body = r#"{"orders":[],"clients":[],"parts":[],"services":[],"equipments":[],"users":[],"technicians":[],"statuses":[],"estimates":[],"cashMovements":[],"currentCashSession":null,"salesHistory":[],"savedCarts":[],"osConfig":null,"warrantyTerms":null}"#.to_string();
                }
              } else {
                body = r#"{"orders":[],"clients":[],"parts":[],"services":[],"equipments":[],"users":[],"technicians":[],"statuses":[],"estimates":[],"cashMovements":[],"currentCashSession":null,"salesHistory":[],"savedCarts":[],"osConfig":null,"warrantyTerms":null}"#.to_string();
              }
            } else if first_line.contains("POST /api/sync/push") || first_line.contains("POST /api/sync/state") {
              // Recebe atualização de dados de um terminal ou do próprio servidor
              if let Some(json_start) = raw_req.find("\r\n\r\n") {
                let json_payload = &raw_req[json_start + 4..];
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_payload.trim()) {
                  if let Ok(mut state_lock) = SERVER_DATABASE_STATE.lock() {
                    // Mescla se já houver estado ou define novo estado completo
                    if let Some(ref mut existing) = *state_lock {
                      if let (Some(existing_obj), Some(parsed_obj)) = (existing.as_object_mut(), parsed.as_object()) {
                        for (k, v) in parsed_obj {
                          existing_obj.insert(k.clone(), v.clone());
                        }
                      } else {
                        *state_lock = Some(parsed);
                      }
                    } else {
                      *state_lock = Some(parsed);
                    }
                  }
                  body = r#"{"success":true,"message":"Dados sincronizados com o servidor."}"#.to_string();
                } else {
                  status_code = "400 Bad Request";
                  body = r#"{"success":false,"error":"JSON inválido"}"#.to_string();
                }
              } else {
                status_code = "400 Bad Request";
                body = r#"{"success":false,"error":"Payload não encontrado"}"#.to_string();
              }
            } else {
              body = r#"{"status":"ok","app":"VollenOS Native Server"}"#.to_string();
            }

            let response = format!(
              "HTTP/1.1 {}\r\n\
               Access-Control-Allow-Origin: *\r\n\
               Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n\
               Access-Control-Allow-Headers: *\r\n\
               Content-Type: {}\r\n\
               Content-Length: {}\r\n\
               Connection: close\r\n\r\n{}",
              status_code,
              content_type,
              body.len(),
              body
            );

            let _ = stream.write_all(response.as_bytes());
            let _ = stream.flush();
          }
        });
      }
    }
  });

  Ok(format!("Servidor local iniciado com sucesso na porta {}", port))
}

#[tauri::command]
fn is_embedded_server_running() -> Result<bool, String> {
  let running = EMBEDDED_SERVER_RUNNING.lock().unwrap();
  Ok(*running)
}

#[tauri::command]
fn get_installed_printers() -> Result<Vec<String>, String> {
  let mut printers = Vec::new();

  #[cfg(target_os = "windows")]
  {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    // Executa PowerShell oculto para consultar as impressoras reais instaladas no Windows
    let output = Command::new("powershell")
      .args(&["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name"])
      .creation_flags(0x08000000) // CREATE_NO_WINDOW
      .output();

    if let Ok(out) = output {
      if out.status.success() {
        let stdout = String::from_utf8_lossy(&out.stdout);
        for line in stdout.lines() {
          let trimmed = line.trim();
          if !trimmed.is_empty() && !printers.contains(&trimmed.to_string()) {
            printers.push(trimmed.to_string());
          }
        }
      }
    }
  }

  // Fallback seguro se nenhuma impressora for retornada
  if printers.is_empty() {
    printers.push("Impressora Padrão do Windows".to_string());
  }

  Ok(printers)
}

#[tauri::command]
fn read_local_image_data_url(path: String) -> Result<String, String> {
  let clean_path = path.trim().trim_matches('"').trim_matches('\'');
  if clean_path.is_empty() {
    return Err("Caminho vazio".to_string());
  }
  let p = Path::new(clean_path);
  if !p.exists() || !p.is_file() {
    return Err(format!("Arquivo não encontrado: {}", clean_path));
  }
  let bytes = fs::read(p).map_err(|e| format!("Erro ao ler imagem do disco: {}", e))?;
  let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
  let mime = match ext.as_str() {
    "jpg" | "jpeg" => "image/jpeg",
    "png" => "image/png",
    "webp" => "image/webp",
    "bmp" => "image/bmp",
    _ => "image/jpeg",
  };

  const BASE64_CHARS: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let mut encoded = String::with_capacity((bytes.len() * 4 / 3) + 4);
  for chunk in bytes.chunks(3) {
    let b0 = chunk[0];
    let b1 = if chunk.len() > 1 { chunk[1] } else { 0 };
    let b2 = if chunk.len() > 2 { chunk[2] } else { 0 };

    encoded.push(BASE64_CHARS[(b0 >> 2) as usize] as char);
    encoded.push(BASE64_CHARS[(((b0 & 0x03) << 4) | (b1 >> 4)) as usize] as char);
    if chunk.len() > 1 {
      encoded.push(BASE64_CHARS[(((b1 & 0x0F) << 2) | (b2 >> 6)) as usize] as char);
    } else {
      encoded.push('=');
    }
    if chunk.len() > 2 {
      encoded.push(BASE64_CHARS[(b2 & 0x3F) as usize] as char);
    } else {
      encoded.push('=');
    }
  }

  Ok(format!("data:{};base64,{}", mime, encoded))
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
      download_and_run_installer,
      get_local_machine_ip,
      get_installed_printers,
      test_tcp_port_connection,
      start_embedded_local_server,
      stop_embedded_local_server,
      is_embedded_server_running,
      update_server_local_state,
      get_server_local_state,
      get_system_trial_status,
      heartbeat_trial_tick,
      activate_system_permanent_license,
      deactivate_system_permanent_license,
      read_local_image_data_url
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

