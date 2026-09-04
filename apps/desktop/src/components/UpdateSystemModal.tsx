import React, { useState, useEffect } from 'react';
import { X, RefreshCw, CheckCircle2, Download, AlertCircle, Sparkles, ShieldCheck, ArrowUpCircle, Check, Loader2 } from 'lucide-react';
import { getMasterFirestore } from '../services/licenseService';
import { doc, getDoc } from 'firebase/firestore';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check as checkTauriUpdate } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { modalStack } from '../utils/modalStack';

export const CURRENT_SYSTEM_VERSION = '3.0.1';

export interface AppVersionInfo {
  version: string;
  releaseDate?: string;
  title?: string;
  releaseNotes?: string[];
  downloadUrl?: string;
  mandatory?: boolean;
}

interface UpdateSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
}

export const UpdateSystemModal: React.FC<UpdateSystemModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [checking, setChecking] = useState(false);
  const [latestVersionInfo, setLatestVersionInfo] = useState<AppVersionInfo | null>(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>('');

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      modalStack.register('UpdateSystemModal', onClose);
      return () => modalStack.unregister('UpdateSystemModal');
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      try {
        unlisten = await listen<{ downloaded: number; total: number; percent: number; status: string }>(
          'update-download-progress',
          (event) => {
            const payload = event.payload;
            if (payload.percent !== undefined) {
              setDownloadProgress(payload.percent);
            }
            if (payload.status) {
              setUpdateStatus(payload.status);
            }
          }
        );
      } catch (err) {
        console.warn('Não foi possível escutar eventos de progresso de download:', err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const isVersionNewer = (remote: string, current: string): boolean => {
    try {
      const rParts = remote.replace(/[^0-9.]/g, '').split('.').map(Number);
      const cParts = current.replace(/[^0-9.]/g, '').split('.').map(Number);
      
      const rMajor = rParts[0] || 0;
      const cMajor = cParts[0] || 0;

      // Importante: A versão inicial (major) precisa ser idêntica (Ex: 3.x.x só recebe 3.x.x; 2.x.x não recebe 3.x.x)
      if (rMajor !== cMajor) {
        return false;
      }

      for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
        const r = rParts[i] || 0;
        const c = cParts[i] || 0;
        if (r > c) return true;
        if (r < c) return false;
      }
      return false;
    } catch {
      return false;
    }
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setErrorMessage(null);
    setLastCheckedTime(new Date().toLocaleTimeString('pt-BR'));

    try {
      const masterDb = getMasterFirestore();
      const currentMajor = CURRENT_SYSTEM_VERSION.split('.')[0] || '1';

      // 1. Tenta verificar pelo Atualizador Nativo (GitHub Releases / Tauri)
      try {
        const tauriUpdate = await checkTauriUpdate();
        if (tauriUpdate?.available && isVersionNewer(tauriUpdate.version, CURRENT_SYSTEM_VERSION)) {
          setHasUpdate(true);
          setLatestVersionInfo({
            version: tauriUpdate.version,
            title: `Atualização v${tauriUpdate.version}`,
            releaseNotes: tauriUpdate.body ? tauriUpdate.body.split('\n').filter(Boolean) : ['Melhorias de desempenho e novas correções.'],
          });
          return;
        }
      } catch (tauriErr) {
        console.warn('Verificação nativa Tauri não obteve atualização:', tauriErr);
      }

      // 2. Fallback: Consulta canal do Firebase Central
      const docRef = doc(masterDb, 'system_config', `app_version_v${currentMajor}`);
      let docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const globalDoc = doc(masterDb, 'system_config', 'app_version');
        docSnap = await getDoc(globalDoc);
      }

      if (docSnap.exists()) {
        const data = docSnap.data() as AppVersionInfo;
        setLatestVersionInfo(data);

        if (data.version && isVersionNewer(data.version, CURRENT_SYSTEM_VERSION)) {
          setHasUpdate(true);
        } else {
          setHasUpdate(false);
        }
      } else {
        setHasUpdate(false);
      }
    } catch (err: any) {
      console.warn('Erro ao consultar atualizações:', err);
      setErrorMessage('Não foi possível verificar atualizações no momento. Verifique sua conexão.');
      setHasUpdate(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkForUpdates();
    }
  }, [isOpen]);

  const handlePerformAutoUpdate = async () => {
    setIsUpdating(true);
    setUpdateStatus('Iniciando atualização...');
    setDownloadProgress(0);

    try {
      let tauriUpdate = null;
      try {
        tauriUpdate = await checkTauriUpdate();
      } catch (e) {
        console.warn('Tauri updater check normal falhou, prosseguindo com instalador direto:', e);
      }

      if (tauriUpdate?.available) {
        let downloadedBytes = 0;
        let totalBytes = 0;

        setUpdateStatus('Baixando pacote de atualização...');

        await tauriUpdate.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              totalBytes = event.data.contentLength || 0;
              setUpdateStatus('Baixando arquivos...');
              break;
            case 'Progress':
              downloadedBytes += event.data.chunkLength;
              if (totalBytes > 0) {
                const percent = Math.round((downloadedBytes / totalBytes) * 100);
                setDownloadProgress(percent);
                setUpdateStatus(`Baixando atualização: ${percent}%`);
              }
              break;
            case 'Finished':
              setDownloadProgress(100);
              setUpdateStatus('Instalação concluída! Reiniciando sistema...');
              break;
          }
        });

        setUpdateSuccess(true);
        setTimeout(async () => {
          await relaunch();
        }, 1500);
        return;
      }

      if (latestVersionInfo?.downloadUrl) {
        setUpdateStatus('Conectando ao servidor para baixar nova versão...');
        
        try {
          await invoke('download_and_run_installer', {
            url: latestVersionInfo.downloadUrl,
            version: latestVersionInfo.version || 'latest',
          });
          return;
        } catch (rustErr: any) {
          console.error('Falha no download via Rust:', rustErr);
          throw new Error(typeof rustErr === 'string' ? rustErr : (rustErr?.message || 'Falha ao baixar o instalador automaticamente.'));
        }
      }

      throw new Error('Nenhum link de atualização disponível no momento.');
    } catch (err: any) {
      console.error('Erro na atualização automática:', err);
      setIsUpdating(false);
      setUpdateStatus('');
      
      const errorMsg = err?.message || String(err) || 'Erro desconhecido durante o download';
      alert(`Erro na atualização automática:\n${errorMsg}\n\nVerifique sua conexão com a internet e tente novamente.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn select-none font-sans">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-400">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                Atualização do Sistema
                <span className="text-[10px] font-mono bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-1.5 py-0.2 rounded font-semibold">
                  v{CURRENT_SYSTEM_VERSION}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Verifique novidades, melhorias de desempenho e correções
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Central (Interface Única e Idêntica para Todos os Clientes) */}
        <div className="p-5 space-y-4 bg-slate-50 overflow-y-auto max-h-[75vh]">
          {/* Status Atual */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-bold block uppercase tracking-wider">Versão Instalada:</span>
              <strong className="text-base font-mono text-slate-900 font-extrabold">v{CURRENT_SYSTEM_VERSION}</strong>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {lastCheckedTime ? `Última checagem: hoje às ${lastCheckedTime}` : 'Checando...'}
              </span>
            </div>

            <button
              type="button"
              disabled={checking}
              onClick={checkForUpdates}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Verificando...' : 'Verificar Agora'}</span>
            </button>
          </div>

          {/* Banner de Garantia de Dados */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <strong className="block text-emerald-900 font-bold mb-0.5">100% dos Seus Dados Preservados</strong>
              Todas as suas Ordens de Serviço, Clientes, Estoque e Configurações ficam salvos em segurança no banco de dados e nunca são apagados durante atualizações.
            </div>
          </div>

          {/* Resultado da Verificação */}
          {checking ? (
            <div className="p-6 text-center space-y-2 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">Consultando o servidor de atualizações...</p>
              <p className="text-[11px] text-slate-400">Verificando se há novas versões disponíveis</p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <strong className="block font-bold">Aviso de Conexão:</strong>
                {errorMessage}
              </div>
            </div>
          ) : hasUpdate ? (
            /* NOVA VERSÃO DISPONÍVEL */
            <div className="bg-white p-4 rounded-xl border-2 border-indigo-400 shadow-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                  </span>
                  <strong className="text-sm text-indigo-950 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Nova Versão Disponível: v{latestVersionInfo?.version}
                  </strong>
                </div>
                {latestVersionInfo?.releaseDate && (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {latestVersionInfo.releaseDate}
                  </span>
                )}
              </div>

              {latestVersionInfo?.title && (
                <p className="text-xs font-bold text-slate-800">{latestVersionInfo.title}</p>
              )}

              {latestVersionInfo?.releaseNotes && latestVersionInfo.releaseNotes.length > 0 && (
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">O que há de novo:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11.5px]">
                    {latestVersionInfo.releaseNotes.map((note, idx) => (
                      <li key={idx} className="leading-snug">{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                {isUpdating ? (
                  <div className="space-y-2 bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                        {updateStatus || 'Atualizando sistema...'}
                      </span>
                      {downloadProgress > 0 && (
                        <span className="font-mono text-indigo-700">{downloadProgress}%</span>
                      )}
                    </div>
                    {downloadProgress > 0 && (
                      <div className="w-full bg-indigo-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                    )}
                    <p className="text-[10.5px] text-indigo-600">
                      O sistema será reiniciado automaticamente assim que o processo for concluído.
                    </p>
                  </div>
                ) : updateSuccess ? (
                  <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span>Atualização concluída com sucesso! Reiniciando...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePerformAutoUpdate}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Atualizar Sistema Agora (Sem Sair do Programa)</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* SISTEMA ATUALIZADO */
            <div className="p-5 text-center space-y-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Seu Sistema Está Totalmente Atualizado!</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                Você já está utilizando a versão mais recente (v{CURRENT_SYSTEM_VERSION}) com todas as correções e recursos ativos.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Vollen - Gestão Profissional de OS
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
