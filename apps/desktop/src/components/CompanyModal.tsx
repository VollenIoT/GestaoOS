import React, { useState, useEffect } from 'react';
import { X, Building2, Save, Upload, Image, MapPin, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';

export interface CompanyData {
  name: string;
  tradingName: string;
  cnpj: string;
  ie?: string;
  im?: string;
  phone: string;
  whatsapp: string;
  email: string;
  website?: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  logoUrl: string;
  slogan: string;
}

export const defaultCompanyData: CompanyData = {
  name: 'VOLLEN ASSISTÊNCIA TÉCNICA E SERVIÇOS LTDA',
  tradingName: 'VOLLEN ASSISTÊNCIA TÉCNICA',
  cnpj: '00.000.000/0001-00',
  ie: 'ISENTO',
  im: '',
  phone: '(11) 3000-0000',
  whatsapp: '(11) 99999-0000',
  email: 'contato@assistenciavollen.com.br',
  website: 'www.assistenciavollen.com.br',
  cep: '01001-000',
  address: 'AVENIDA PAULISTA',
  number: '1000',
  complement: 'SALA 101',
  neighborhood: 'BELA VISTA',
  city: 'SÃO PAULO',
  state: 'SP',
  logoUrl: '',
  slogan: 'ASSISTÊNCIA TÉCNICA ESPECIALIZADA E MANUTENÇÃO',
};

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CompanyData) => void;
}

export const CompanyModal: React.FC<CompanyModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<CompanyData>(() => {
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) return JSON.parse(saved);
    } catch (err) {}
    return defaultCompanyData;
  });

  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 1. Tenta carregar do localStorage imediatamente
      let baseData = defaultCompanyData;
      try {
        const saved = localStorage.getItem('vollen_company_data');
        if (saved) {
          baseData = { ...defaultCompanyData, ...JSON.parse(saved) };
        }
      } catch (err) {}

      // Aplica os nomes oficiais da licença ativa
      try {
        const rawTenant = localStorage.getItem('system_tenant_info');
        if (rawTenant) {
          const tenant = JSON.parse(rawTenant);
          if (tenant.tradeName) baseData.tradingName = tenant.tradeName;
          else if (tenant.companyName) baseData.tradingName = tenant.companyName;

          if (tenant.legalName) baseData.name = tenant.legalName;
          else if (tenant.companyName) baseData.name = tenant.companyName;
        } else {
          baseData.tradingName = 'Vollen Assistência Técnica';
          baseData.name = 'Vollen Assistência Técnica';
        }
      } catch {}

      setFormData(baseData);

      // 2. Busca a versão mais atualizada do Firestore (mantendo os nomes da licença)
      import('../services/firebase').then(({ db }) => {
        import('firebase/firestore').then(({ doc, getDoc }) => {
          if (db) {
            getDoc(doc(db, 'system_config', 'company_data'))
              .then((snap) => {
                if (snap.exists()) {
                  const cloudData = snap.data() as CompanyData;
                  const merged = { ...cloudData, tradingName: baseData.tradingName, name: baseData.name };
                  setFormData(merged);
                  try {
                    localStorage.setItem('vollen_company_data', JSON.stringify(merged));
                  } catch (e) {}
                }
              })
              .catch(() => {});
          }
        });
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem do logotipo deve ser menor que 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Obtém o nome oficial protegido da licença ativa ou o padrão
    let protectedTradeName = 'Vollen Assistência Técnica';
    let protectedLegalName = 'Vollen Assistência Técnica';

    try {
      const savedTenantInfo = localStorage.getItem('system_tenant_info');
      if (savedTenantInfo) {
        const parsed = JSON.parse(savedTenantInfo);
        if (parsed.tradeName || parsed.companyName) {
          protectedTradeName = parsed.tradeName || parsed.companyName;
        }
        if (parsed.legalName || parsed.companyName) {
          protectedLegalName = parsed.legalName || parsed.companyName;
        }
      }
    } catch {}

    const finalData = {
      ...formData,
      tradingName: protectedTradeName,
      name: protectedLegalName,
    };

    try {
      localStorage.setItem('vollen_company_data', JSON.stringify(finalData));
      window.dispatchEvent(new Event('storage'));

      import('../services/firebase').then(({ db }) => {
        import('firebase/firestore').then(({ doc, setDoc }) => {
          if (db) {
            setDoc(doc(db, 'system_config', 'company_data'), finalData, { merge: true }).catch(() => {});
          }
        });
      });
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
    }

    onSave(finalData);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 600);
  };

  const formatPhone = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    if (nums.length > 6) {
      if (nums.length === 11) {
        return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
      }
      return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    } else if (nums.length > 2) {
      return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    }
    return nums;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden font-sans text-xs flex flex-col animate-fadeIn">
        {/* Cabeçalho */}
        <div className="p-3 bg-slate-800 text-white flex items-center justify-between shrink-0">
          <h3 className="font-bold text-xs flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            Dados da Empresa & Logotipo
          </h3>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário Compacto em 2 Colunas */}
        <form onSubmit={handleSubmit} className="p-3.5 space-y-2.5 bg-slate-50">
          {successMsg && (
            <div className="bg-emerald-600 text-white p-2 rounded-xl font-bold flex items-center gap-2 text-xs animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              Dados da Empresa e Logotipo salvos com sucesso!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-start">
            {/* COLUNA ESQUERDA: LOGO + SLOGAN (4 colunas) */}
            <div className="md:col-span-4 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5 text-[11px] uppercase">
                <Image className="w-3.5 h-3.5 text-sky-600" /> Logotipo da Empresa
              </h4>
              <div className="flex flex-col items-center gap-2">
                <div className="w-full h-24 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center overflow-hidden shrink-0">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold text-center px-1">Sem Logotipo</span>
                  )}
                </div>
                <div className="flex items-center gap-2 w-full">
                  <label className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded-lg font-bold flex-1 text-center cursor-pointer transition-all shadow-xs text-[11px] truncate">
                    <Upload className="w-3 h-3 inline mr-1" />
                    Carregar Foto
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="text-red-600 hover:text-red-800 text-[10px] font-bold underline shrink-0 cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Slogan / Especialidade</label>
                <input
                  type="text"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder="Ex: Assistência Técnica Especializada"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-medium text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                />
              </div>
            </div>

            {/* COLUNA DIREITA: IDENTIFICAÇÃO E CONTATO (8 colunas) */}
            <div className="md:col-span-8 space-y-2.5">
              {/* DADOS JURÍDICOS E NOME FANTASIA */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5 text-[11px] uppercase">
                  <FileText className="w-3.5 h-3.5 text-sky-600" /> Identificação & Registro Fiscal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                      <span>Nome Fantasia (Comercial)</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                        🔒 Vinculado à Licença
                      </span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formData.tradingName || 'Vollen Assistência Técnica'}
                      title="O Nome Fantasia é gerenciado exclusivamente pela Chave Serial da Licença do sistema."
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-600 cursor-not-allowed select-none text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5 flex items-center justify-between">
                      <span>Razão Social</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold flex items-center gap-1">
                        🔒 Vinculado à Licença
                      </span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={formData.name || formData.tradingName || 'Vollen Assistência Técnica'}
                      title="A Razão Social é gerenciada exclusivamente pela Chave Serial da Licença do sistema."
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-600 cursor-not-allowed select-none text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">CNPJ / CPF *</label>
                    <input
                      type="text"
                      required
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      placeholder="00.000.000/0001-00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Inscrição Estadual (IE)</label>
                    <input
                      type="text"
                      value={formData.ie || ''}
                      onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                      placeholder="Ex: ISENTO ou 000.000.000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Inscrição Municipal (IM)</label>
                    <input
                      type="text"
                      value={formData.im || ''}
                      onChange={(e) => setFormData({ ...formData, im: e.target.value })}
                      placeholder="Ex: 123456"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* CONTATO E ENDEREÇO */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5 text-[11px] uppercase">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" /> Contatos & Localização
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Telefone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                      placeholder="(00) 0000-0000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">WhatsApp</label>
                    <input
                      type="text"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: formatPhone(e.target.value) })}
                      placeholder="(00) 90000-0000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">E-mail</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contato@empresa.com"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-medium text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Site / Instagram</label>
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="www.empresa.com.br"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-medium text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">CEP</label>
                    <input
                      type="text"
                      value={formData.cep || ''}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Endereço</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua / Av..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Número</label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="1000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Bairro</label>
                    <input
                      type="text"
                      value={formData.neighborhood}
                      onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                      placeholder="Centro"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Cidade</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="São Paulo"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 uppercase focus:outline-none focus:border-sky-600 text-xs text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO FIXOS NO RODAPÉ */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 bg-slate-300 hover:bg-slate-400 text-slate-800 font-bold rounded-xl transition-all cursor-pointer text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-8 bg-sky-600 hover:bg-sky-700 text-white px-4 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              Salvar Dados da Empresa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
