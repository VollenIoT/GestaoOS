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
  name: 'Vollen Assistência Técnica LTDA',
  tradingName: 'Vollen Assistência Técnica',
  cnpj: '00.000.000/0001-00',
  ie: 'ISENTO',
  im: '',
  phone: '(11) 99999-9999',
  whatsapp: '(11) 99999-9999',
  email: 'atendimento@vollen.com.br',
  website: 'www.vollen.com.br',
  cep: '01000-000',
  address: 'Av. Principal',
  number: '1000',
  complement: '',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'SP',
  logoUrl: '',
  slogan: 'Assistência Técnica e Manutenção Especializada',
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
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) setFormData(JSON.parse(saved));
    } catch (err) {}
  }, [isOpen]);

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
    try {
      localStorage.setItem('vollen_company_data', JSON.stringify(formData));
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('Erro ao salvar no localStorage:', err);
    }
    onSave(formData);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 800);
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
                    <label className="block text-[11px] font-bold text-sky-900 mb-0.5">
                      Nome Fantasia (Comercial) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.tradingName}
                      onChange={(e) => setFormData({ ...formData, tradingName: e.target.value })}
                      placeholder="Nome comercial ex: Vollen Assistência"
                      className="w-full bg-sky-50 border border-sky-300 rounded-lg px-2 py-1 font-bold text-sky-950 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Razão Social</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome jurídico da empresa"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
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
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 0000-0000"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">WhatsApp</label>
                    <input
                      type="text"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
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
