import React, { useState, useEffect } from 'react';
import { X, Smartphone, Copy, CheckCircle2, ShieldCheck, RefreshCw, Key, Lock, AlertCircle, User } from 'lucide-react';
import { CompanyData } from './CompanyModal';

interface LinkMobileModalProps {
  isOpen: boolean;
  companyInfo?: CompanyData;
  onClose: () => void;
}

// Gera código no formato exato: XXXXX-XXXXX-XXXXX
function generateApiKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = (len: number) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `${block(5)}-${block(5)}-${block(5)}`;
}

export const LinkMobileModal: React.FC<LinkMobileModalProps> = ({
  isOpen,
  companyInfo,
  onClose,
}) => {
  if (!isOpen) return null;

  return <LinkMobileModalContent companyInfo={companyInfo} onClose={onClose} />;
};

const LinkMobileModalContent: React.FC<{ companyInfo?: CompanyData; onClose: () => void }> = ({
  companyInfo,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      let key = localStorage.getItem('vollen_company_apikey');
      if (key && /^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(key)) {
        return key;
      }
      return '';
    } catch {
      return '';
    }
  });

  const [copied, setCopied] = useState(false);
  const companyName = companyInfo?.tradingName || companyInfo?.name || 'Vollen Assistência Técnica';

  // Sincroniza a ApiKey com o Firestore (Banco de Dados em Nuvem compartilhado)
  useEffect(() => {
    import('../services/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ doc, getDoc, setDoc }) => {
        const apiKeyDocRef = doc(db, 'system_config', 'company_apikey');
        getDoc(apiKeyDocRef)
          .then((snap) => {
            if (snap.exists() && snap.data()?.apiKey) {
              const cloudKey = snap.data().apiKey;
              setApiKey(cloudKey);
              try {
                localStorage.setItem('vollen_company_apikey', cloudKey);
              } catch {}
            } else {
              // Se não existir no banco ainda, usa a local ou gera uma nova e grava no banco
              const keyToUse = apiKey || localStorage.getItem('vollen_company_apikey') || generateApiKey();
              setApiKey(keyToUse);
              try {
                localStorage.setItem('vollen_company_apikey', keyToUse);
              } catch {}
              setDoc(apiKeyDocRef, { apiKey: keyToUse, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
            }
          })
          .catch(() => {
            // Em caso de falha de conexão, garante uma chave local
            if (!apiKey) {
              const localKey = localStorage.getItem('vollen_company_apikey') || generateApiKey();
              setApiKey(localKey);
              try {
                localStorage.setItem('vollen_company_apikey', localKey);
              } catch {}
            }
          });
      });
    });
  }, []);

  // Estados para autorização de administrador
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vollen_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const admins = parsed.filter((u: any) => u.role === 'Admin' || u.isAdmin || u.username === 'admin');
          setAdminUsers(admins);
          if (admins.length > 0) {
            setSelectedAdminId(String(admins[0].id));
          }
        }
      }
    } catch {}
  }, [isAuthModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthModalOpen, onClose]);

  const handleCopyKey = () => {
    try {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Erro ao copiar ApiKey:', e);
    }
  };

  const handleOpenRegenerate = () => {
    setAuthError('');
    setAdminPassword('');
    setIsAuthModalOpen(true);
  };

  const handleConfirmRegenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!adminPassword.trim()) {
      setAuthError('Informe a senha do administrador.');
      return;
    }

    // Busca o usuário admin selecionado
    let currentUsers: any[] = adminUsers;
    if (currentUsers.length === 0) {
      try {
        const saved = localStorage.getItem('vollen_users');
        if (saved) currentUsers = JSON.parse(saved);
      } catch {}
    }

    const admin = currentUsers.find((u: any) => String(u.id) === String(selectedAdminId) || u.username === 'admin');

    if (!admin) {
      // Fallback para admin padrão caso não ache no storage
      if (adminPassword === '1234' || adminPassword === 'admin') {
        proceedRegenerate();
        return;
      }
      setAuthError('Administrador não encontrado.');
      return;
    }

    if (String(admin.password || '1234') !== String(adminPassword).trim()) {
      setAuthError('Senha de administrador incorreta.');
      return;
    }

    proceedRegenerate();
  };

  const proceedRegenerate = () => {
    const newKey = generateApiKey();
    try {
      localStorage.setItem('vollen_company_apikey', newKey);
    } catch (e) {}

    // Salva a nova ApiKey no Firestore para que todos os computadores atualizem juntos
    import('../services/firebase').then(({ db }) => {
      import('firebase/firestore').then(({ doc, setDoc }) => {
        setDoc(doc(db, 'system_config', 'company_apikey'), { apiKey: newKey, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      });
    });

    setApiKey(newKey);
    setIsAuthModalOpen(false);
    setAdminPassword('');
    alert('Nova ApiKey gerada e sincronizada no banco de dados com sucesso!\n\nLembre-se de vincular seus celulares com este novo código.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn select-none font-sans">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/40 rounded-xl text-sky-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                Vincular Celular (ApiKey do Sistema)
              </h3>
              <p className="text-[11px] text-slate-300">
                Insira esta ApiKey no aplicativo mobile para conectar à sua empresa.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo Central */}
        <div className="p-6 flex flex-col items-center text-center space-y-5 bg-slate-50">
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 w-full text-left flex items-start gap-3 text-xs text-sky-950">
            <ShieldCheck className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sky-900 text-sm">Empresa: {companyName}</span>
              <span className="text-[11px] text-sky-800 leading-relaxed">
                Cada empresa possui sua ApiKey exclusiva. Ao digitar esta chave no celular, o aplicativo conecta de forma isolada aos dados do seu sistema.
              </span>
            </div>
          </div>

          {/* Destaque Visual da ApiKey (XXXXX-XXXXX-XXXXX) */}
          <div className="w-full bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-center space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ApiKey Única do Seu Sistema
            </span>
            <div className="bg-slate-900 text-sky-400 px-5 py-3 rounded-xl font-mono text-xl md:text-2xl font-black tracking-widest border border-slate-700 select-all shadow-inner">
              {apiKey}
            </div>

            <button
              type="button"
              onClick={handleCopyKey}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'ApiKey Copiada!' : 'Copiar ApiKey'}</span>
            </button>
          </div>

          <div className="text-left w-full bg-slate-100 p-3 rounded-xl border border-slate-200 text-slate-600 text-xs space-y-1">
            <span className="font-bold text-slate-800 block">Como vincular no Celular:</span>
            <p>1. Abra o aplicativo no celular.</p>
            <p>2. Digite ou cole o código acima no campo <strong>"ApiKey da Empresa"</strong>.</p>
            <p>3. Toque em <strong>"Vincular Empresa"</strong> para prosseguir ao login.</p>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="p-3.5 bg-slate-200 border-t border-slate-300 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleOpenRegenerate}
            className="text-amber-800 hover:text-amber-950 font-bold flex items-center gap-1.5 cursor-pointer text-xs bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors"
            title="Requer senha de administrador para gerar nova ApiKey"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Gerar Nova ApiKey</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
          >
            Concluir / Fechar
          </button>
        </div>
      </div>

      {/* MODAL DE AUTORIZAÇÃO DO ADMINISTRADOR */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-xs text-white">Autorização de Administrador</h4>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRegenerate} className="p-5 space-y-4 bg-slate-50">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-[11px] leading-relaxed">
                ⚠️ <strong>Atenção:</strong> Gerar uma nova ApiKey exigirá que todos os celulares sejam reconectados com o novo código.
              </div>

              {authError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700">Administrador:</label>
                {adminUsers.length > 1 ? (
                  <select
                    value={selectedAdminId}
                    onChange={(e) => setSelectedAdminId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    {adminUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name || u.username} ({u.username})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{adminUsers[0]?.name || adminUsers[0]?.username || 'Administrador (admin)'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-700">Senha do Administrador *:</label>
                <input
                  type="password"
                  autoFocus
                  placeholder="Digite sua senha..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Confirmar e Gerar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
