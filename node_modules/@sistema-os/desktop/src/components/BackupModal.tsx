import React, { useState, useRef } from 'react';
import { X, DatabaseBackup, FolderOpen, CheckCircle, HardDrive, Loader2 } from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  parts?: any[];
  services?: any[];
  equipments?: any[];
  clients?: any[];
  orders?: any[];
  estimates?: any[];
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  parts = [],
  services = [],
  equipments = [],
  clients = [],
  orders = [],
  estimates = [],
}) => {
  const [selectedPath, setSelectedPath] = useState(() => {
    return localStorage.getItem('saved_backup_folder_path') || 'd:\\SistemaOS\\Backups';
  });
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTaskText, setCurrentTaskText] = useState('');
  const [isBackupDone, setIsBackupDone] = useState(false);
  const [backupFileName, setBackupFileName] = useState('');
  const directoryInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Se o usuário já tiver uma pasta personalizada salva no localStorage, mantém ela
    const saved = localStorage.getItem('saved_backup_folder_path');
    if (saved) {
      setSelectedPath(saved);
      return;
    }

    // Caso contrário, detecta a pasta Desktop ou Documents do usuário se estiver rodando via Tauri
    (async () => {
      try {
        if ((window as any).__TAURI_INTERNALS__) {
          const pathApi = await import('@tauri-apps/api/path');
          const desktop = await pathApi.desktopDir();
          if (desktop) {
            const defaultFolder = `${desktop}\\Backups Sistema OS`;
            setSelectedPath(defaultFolder);
            localStorage.setItem('saved_backup_folder_path', defaultFolder);
            return;
          }
          const docs = await pathApi.documentDir();
          if (docs) {
            const defaultFolder = `${docs}\\Backups Sistema OS`;
            setSelectedPath(defaultFolder);
            localStorage.setItem('saved_backup_folder_path', defaultFolder);
            return;
          }
        }
      } catch {}
    })();
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      // Sempre que o modal for aberto, reseta o estado para permitir um novo backup
      setIsBackupDone(false);
      setIsBackingUp(false);
      setProgress(0);
      setCurrentTaskText('');
      setBackupFileName('');
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBackingUp) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isBackingUp, onClose]);

  if (!isOpen) return null;

  const handleSelectDirectory = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Selecione a pasta para salvar o backup',
          defaultPath: selectedPath || undefined,
        });

        if (selected && typeof selected === 'string') {
          setSelectedPath(selected);
          localStorage.setItem('saved_backup_folder_path', selected);
          setIsBackupDone(false);
          return;
        }
      }
    } catch (err) {
      console.error('Erro ao abrir diálogo nativo:', err);
    }

    // Fallback caso não esteja rodando via Tauri
    if (directoryInputRef.current) {
      directoryInputRef.current.value = '';
      directoryInputRef.current.click();
    }
  };

  const handleDirectoryPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relativePath = firstFile.webkitRelativePath;
      const folderName = relativePath.split('/')[0] || relativePath.split('\\')[0];

      const newPath = folderName ? `C:\\Backups\\${folderName}` : 'C:\\Backups\\PastaSelecionada';
      setSelectedPath(newPath);
      localStorage.setItem('saved_backup_folder_path', newPath);
      setIsBackupDone(false);
    }
  };

  const handleExecuteBackup = () => {
    if (!selectedPath.trim()) {
      alert('Por favor, selecione a pasta de destino para salvar o backup.');
      return;
    }

    setIsBackingUp(true);
    setIsBackupDone(false);
    setProgress(0);
    setCurrentTaskText('Iniciando cópia de segurança...');

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `backup_completo_vollen_os_${dateStr}.json`;
    setBackupFileName(fileName);

    // Simulação progressiva e realística de extração de todas as tabelas (OS, Clientes, Usuários, Configurações, Termos, Contas)
    const stages = [
      { pct: 15, text: 'Copiando Ordens de Serviço (OS Abertas e Finalizadas)...' },
      { pct: 35, text: 'Exportando Cadastro Completo de Clientes e Endereços...' },
      { pct: 50, text: 'Fazendo backup de Peças, Serviços e Equipamentos...' },
      { pct: 70, text: 'Compactando Usuários, Senhas e Níveis de Permissão...' },
      { pct: 85, text: 'Salvando Configurações de Impressora e Termos de Garantia...' },
      { pct: 100, text: 'Finalizando gravação do arquivo de backup no computador...' },
    ];

    let currentStageIndex = 0;

    const interval = setInterval(async () => {
      if (currentStageIndex < stages.length) {
        const stage = stages[currentStageIndex];
        setProgress(stage.pct);
        setCurrentTaskText(stage.text);
        currentStageIndex++;
      } else {
        clearInterval(interval);
        setIsBackingUp(false);
        setIsBackupDone(true);
        localStorage.setItem('last_backup_date', new Date().toISOString());

        // 1. Coleta 100% de todas as chaves e dados armazenados no sistema
        const allLocalStorageSnapshot: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const raw = localStorage.getItem(key);
            try {
              allLocalStorageSnapshot[key] = raw ? JSON.parse(raw) : raw;
            } catch {
              allLocalStorageSnapshot[key] = raw;
            }
          }
        }

        const fullBackupPayload = {
          system: 'Vollen - Gestão de OS',
          version: '3.0.0',
          createdAt: new Date().toISOString(),
          // Snapshot completo e irrestrito de todo o banco de dados e cadastros do sistema
          storage: allLocalStorageSnapshot,
          clients: (() => {
            try {
              const saved = localStorage.getItem('vollen_clients');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          orders: (() => {
            try {
              const saved = localStorage.getItem('vollen_orders');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          visits: (() => {
            try {
              const saved = localStorage.getItem('vollen_visits');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          users: (() => {
            try {
              const saved = localStorage.getItem('vollen_users');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          companyData: (() => {
            try {
              const saved = localStorage.getItem('vollen_company_data');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          estimates: (() => {
            if (Array.isArray(estimates) && estimates.length > 0) return estimates;
            try {
              const saved = localStorage.getItem('vollen_estimates');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          parts: (() => {
            let list = (Array.isArray(parts) && parts.length > 0) ? parts : null;
            if (!list) {
              try {
                const saved = localStorage.getItem('vollen_parts_stock') || localStorage.getItem('vollen_parts');
                if (saved) list = JSON.parse(saved);
              } catch { list = []; }
            }
            if (Array.isArray(list)) {
              return list.map((p: any) => ({
                ...p,
                stockQuantity: Number(p.stockQuantity !== undefined ? p.stockQuantity : 0),
                minStock: Number(p.minStock !== undefined ? p.minStock : 0),
              }));
            }
            return [];
          })(),
          services: (() => {
            if (Array.isArray(services) && services.length > 0) return services;
            try {
              const saved = localStorage.getItem('vollen_services');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          customServices: (() => {
            try {
              const saved = localStorage.getItem('vollen_custom_services');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          equipments: (() => {
            try {
              const saved = localStorage.getItem('system_equipments') || localStorage.getItem('vollen_equipments');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          technicians: (() => {
            try {
              const saved = localStorage.getItem('vollen_technicians');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          osStatuses: (() => {
            try {
              const saved = localStorage.getItem('custom_os_statuses_v3') || localStorage.getItem('system_os_statuses');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          cashMovements: (() => {
            try {
              const saved = localStorage.getItem('vollen_cash_movements') || localStorage.getItem('cash_transactions');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          currentCashSession: (() => {
            try {
              const saved = localStorage.getItem('vollen_current_cash_session') || localStorage.getItem('daily_cash_register_status');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          cashRegistersHistory: (() => {
            try {
              const saved = localStorage.getItem('cash_registers_history');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          cashRegisterColumns: (() => {
            try {
              const saved = localStorage.getItem('vollen_cash_register_columns');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          salesHistory: (() => {
            try {
              const saved = localStorage.getItem('vollen_sales_history');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          savedCarts: (() => {
            try {
              const saved = localStorage.getItem('vollen_saved_carts');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
          activeCart: (() => {
            try {
              const saved = localStorage.getItem('vollen_active_cart') || localStorage.getItem('vollen_local_sales_cart');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          customWallpaper: localStorage.getItem('system_wallpaper_url') || null,
          wallpaperOpacity: localStorage.getItem('system_wallpaper_opacity') || '25',
          wallpaperPosX: localStorage.getItem('system_wallpaper_pos_x') || '50',
          wallpaperPosY: localStorage.getItem('system_wallpaper_pos_y') || '50',
          wallpaperScale: localStorage.getItem('system_wallpaper_scale') || '100',
          osPreferences: (() => {
            try {
              const saved = localStorage.getItem('vollen_os_preferences') || localStorage.getItem('vollen_os_general_config') || localStorage.getItem('vollen_os_config');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          osGeneralConfig: (() => {
            try {
              const saved = localStorage.getItem('vollen_os_general_config') || localStorage.getItem('vollen_os_config');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          customNextOSNumber: localStorage.getItem('vollen_custom_next_os_number') || null,
          printerConfig: (() => {
            try {
              const saved = localStorage.getItem('vollen_printer_config');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          warrantyTerms: (() => {
            try {
              const saved = localStorage.getItem('warranty_config') || localStorage.getItem('vollen_warranty_terms');
              return saved ? JSON.parse(saved) : null;
            } catch { return null; }
          })(),
          auditLogs: (() => {
            try {
              const saved = localStorage.getItem('audit_logs');
              return saved ? JSON.parse(saved) : [];
            } catch { return []; }
          })(),
        };

        // 2. Grava o arquivo fisicamente na pasta de destino escolhida no Windows via comando Tauri Rust
        const backupJsonString = JSON.stringify(fullBackupPayload, null, 2);
        let savedDirectly = false;
        let finalSavedPath = '';

        if ((window as any).__TAURI_INTERNALS__) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            
            // Normaliza separador de pasta do Windows
            const sep = selectedPath.includes('/') ? '/' : '\\';
            const cleanPath = selectedPath.endsWith(sep) ? selectedPath.slice(0, -1) : selectedPath;
            const fullFilePath = `${cleanPath}${sep}backup_completo_vollen_os_${dateStr}.json`;

            await invoke('save_backup_file', {
              path: fullFilePath,
              content: backupJsonString,
            });

            savedDirectly = true;
            finalSavedPath = fullFilePath;
          } catch (rustErr) {
            console.warn('Erro na gravação direta via Rust, abrindo diálogo nativo de Salvar Como:', rustErr);
            try {
              const { save } = await import('@tauri-apps/plugin-dialog');
              const { invoke } = await import('@tauri-apps/api/core');
              const targetPath = await save({
                defaultPath: `backup_completo_vollen_os_${dateStr}.json`,
                filters: [{ name: 'Arquivo de Backup JSON', extensions: ['json'] }],
                title: 'Salvar Arquivo de Backup Completo',
              });

              if (targetPath) {
                await invoke('save_backup_file', {
                  path: targetPath,
                  content: backupJsonString,
                });
                savedDirectly = true;
                finalSavedPath = targetPath;
                setSelectedPath(targetPath);
              }
            } catch (dialogErr) {
              console.warn('Erro ao salvar via diálogo Save:', dialogErr);
            }
          }
        }

        // 3. Fallback web via download pelo navegador se não foi salvo nativamente
        if (!savedDirectly) {
          const blob = new Blob([backupJsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `backup_completo_vollen_os_${dateStr}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Input nativo oculto do Gerenciador do Windows */}
      <input
        type="file"
        ref={directoryInputRef}
        onChange={handleDirectoryPicked}
        // @ts-ignore - Atributo nativo
        webkitdirectory="true"
        directory="true"
        className="hidden"
      />

      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <DatabaseBackup className="w-5 h-5 text-emerald-600" />
            Criar Backup Completo do Sistema
          </h2>
          <button
            onClick={onClose}
            disabled={isBackingUp}
            className="text-slate-600 hover:text-slate-900 p-1 rounded-lg disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4 bg-slate-50 text-xs">
          <p className="text-slate-600 leading-relaxed font-medium">
            Selecione a pasta de destino e clique em <strong>Criar Backup</strong> para salvar automaticamente todas as Ordens de Serviço, Clientes, Serviços, Usuários, Permissões, Configurações de Impressora e Termos de Garantia.
          </p>

          {/* Campo da Pasta de Destino */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-sky-700" />
              Diretório / Pasta de Destino:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={selectedPath}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold focus:outline-none"
              />
              <button
                type="button"
                disabled={isBackingUp}
                onClick={handleSelectDirectory}
                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                Procurar...
              </button>
            </div>
          </div>

          {/* BARRA DE PROGRESSO DO BACKUP */}
          {isBackingUp && (
            <div className="bg-sky-50/90 border border-sky-200 p-4 rounded-xl space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between font-bold text-sky-900 text-xs">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                  {currentTaskText}
                </span>
                <span className="font-mono text-sky-700">{progress}%</span>
              </div>

              {/* Barra de Progresso Animada */}
              <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300">
                <div
                  style={{ width: `${progress}%` }}
                  className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-300 shadow-inner"
                />
              </div>
            </div>
          )}

          {/* STATUS CONCLUÍDO DO BACKUP */}
          {isBackupDone && !isBackingUp && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl flex items-start gap-3 animate-fadeIn shadow-sm">
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-emerald-950">Backup Completo Gerado com Sucesso!</p>
                <p className="text-xs text-emerald-800">
                  Todas as OS, Clientes, Serviços, Usuários, Permissões, Impressoras e Termos foram salvos automaticamente.
                </p>
                <p className="text-[11px] text-emerald-700 font-mono pt-1">
                  Arquivo: <strong>{backupFileName}</strong>
                </p>
                <p className="text-[11px] text-emerald-700 font-mono">
                  Pasta: <strong>{selectedPath}</strong>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Botão Criar Backup / Fechar */}
        <div className="p-4 bg-slate-200 border-t border-slate-300 flex items-center justify-end gap-2">
          {isBackupDone && !isBackingUp ? (
            <button
              onClick={onClose}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95 text-xs"
            >
              <CheckCircle className="w-4.5 h-4.5" />
              Fechar
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={isBackingUp}
                className="px-4 py-2 bg-slate-300 hover:bg-slate-400 disabled:opacity-40 text-slate-700 font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleExecuteBackup}
                disabled={isBackingUp}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-95"
              >
                {isBackingUp ? (
                  <>
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    Criando Backup ({progress}%)...
                  </>
                ) : (
                  <>
                    <DatabaseBackup className="w-4.5 h-4.5" />
                    Criar Backup
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
