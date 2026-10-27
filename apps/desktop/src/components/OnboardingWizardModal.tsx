import React, { useState } from 'react';
import {
  Sparkles,
  KeyRound,
  Building2,
  Lock,
  Printer,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  Image as ImageIcon,
  Rocket,
  ShieldCheck,
  Zap,
  Loader2,
  Check,
} from 'lucide-react';
import {
  validateAndFetchSerialLicense,
  activateLicense,
  LicenseTenantData,
} from '../services/licenseService';
import { CompanyData, defaultCompanyData } from './CompanyModal';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onFinish: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onFinish,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Estado do Passo 1: Licenciamento
  const [licenseMode, setLicenseMode] = useState<'SERIAL' | 'TRIAL'>('SERIAL');
  const [serialInput, setSerialInput] = useState('');
  const [loadingSerial, setLoadingSerial] = useState(false);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [serialSuccess, setSerialSuccess] = useState<string | null>(null);
  const [activatedLicenseData, setActivatedLicenseData] = useState<LicenseTenantData | null>(null);

  // Estado do Passo 2: Empresa
  const [companyData, setCompanyData] = useState<CompanyData>(() => {
    try {
      const saved = localStorage.getItem('vollen_company_data');
      if (saved) return { ...defaultCompanyData, ...JSON.parse(saved) };
    } catch {}
    return defaultCompanyData;
  });

  // Estado do Passo 3: Administrador
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminName, setAdminName] = useState('Administrador');
  const [adminPassword, setAdminPassword] = useState('1234');
  const [confirmPassword, setConfirmPassword] = useState('1234');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Estado do Passo 4: Impressão e Termos
  const [printerPaperWidth, setPrinterPaperWidth] = useState<'80mm' | '58mm' | 'A4'>('80mm');
  const [autoPrintOS, setAutoPrintOS] = useState(true);

  if (!isOpen) return null;

  const handleFormatSerial = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    const chunks = raw.match(/.{1,5}/g);
    setSerialInput(chunks ? chunks.join('-') : raw);
  };

  const handleValidateSerialStep = async () => {
    setSerialError(null);
    setSerialSuccess(null);

    if (licenseMode === 'TRIAL') {
      setActivatedLicenseData(null);
      setSerialSuccess('Modo de Demonstração (Sem Serial) ativado!');
      setTimeout(() => setCurrentStep(2), 600);
      return;
    }

    if (!serialInput.trim()) {
      setSerialError('Por favor, digite sua Chave Serial ou escolha o Modo Demonstração.');
      return;
    }

    setLoadingSerial(true);
    try {
      const res = await validateAndFetchSerialLicense(serialInput);
      if (!res.success || !res.data) {
        setSerialError(res.message || 'Chave serial inválida.');
        return;
      }

      activateLicense(res.data);
      setActivatedLicenseData(res.data);
      setSerialSuccess('Chave Serial validada e ativada com sucesso!');

      // Atualiza nome da empresa com os dados da licença
      setCompanyData((prev) => ({
        ...prev,
        tradingName: res.data?.tradeName || prev.tradingName,
        name: res.data?.legalName || prev.name,
      }));

      setTimeout(() => setCurrentStep(2), 800);
    } catch (err: any) {
      setSerialError(err?.message || 'Erro ao validar chave serial.');
    } finally {
      setLoadingSerial(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCompanyData((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const formatCpfCnpj = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 14);
    if (nums.length <= 11) {
      if (nums.length > 9) {
        return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
      } else if (nums.length > 6) {
        return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
      } else if (nums.length > 3) {
        return `${nums.slice(0, 3)}.${nums.slice(3)}`;
      }
      return nums;
    } else {
      if (nums.length > 12) {
        return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`;
      } else if (nums.length > 8) {
        return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`;
      } else if (nums.length > 5) {
        return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
      } else if (nums.length > 2) {
        return `${nums.slice(0, 2)}.${nums.slice(2)}`;
      }
      return nums;
    }
  };

  const handleNextStep2 = () => {
    if (!companyData.tradingName.trim()) {
      alert('Por favor, informe ao menos o Nome Fantasia da sua empresa.');
      return;
    }
    // Salva empresa no localStorage
    localStorage.setItem('vollen_company_data', JSON.stringify(companyData));
    setCurrentStep(3);
  };

  const handleNextStep3 = () => {
    setAdminError(null);
    if (!adminUsername.trim()) {
      setAdminError('Informe um nome de usuário.');
      return;
    }
    if (adminPassword && adminPassword !== confirmPassword) {
      setAdminError('As senhas digitadas não coincidem.');
      return;
    }

    // Salva ou atualiza o usuário administrador
    const defaultPermissions = {
      createOS: true,
      editOS: true,
      cancelOS: true,
      finalizeOS: true,
      reopenOS: true,
      deleteOS: true,
      viewOpenOrders: true,
      viewFinishedOrders: true,
      viewAuditHistory: true,
      printOS: true,
      manageEstimates: true,
      manageSales: true,
      manageCashRegister: true,
      openCloseCashRegister: true,
      manageManualCashMovement: true,
      manageClients: true,
      manageParts: true,
      manageServices: true,
      manageEquipments: true,
      manageTechnicians: true,
      manageOrderStatus: true,
      manageOSGeneralConfig: true,
      manageOrderSequence: true,
      manageWarrantyTerms: true,
      managePrinterConfig: true,
      viewGeneralReports: true,
      viewTechnicianReports: true,
      manageCompanyData: true,
      manageMobileLink: true,
      manageWallpaper: true,
      manageUsers: true,
      accessBackup: true,
      accessFactoryReset: true,
    };

    const initialUsers = [
      {
        id: '1',
        username: adminUsername.trim().toLowerCase(),
        name: adminName.trim() || 'Administrador',
        role: 'Admin',
        password: adminPassword.trim(),
        isAdmin: true,
        isTechnician: true,
        isAttendant: true,
        permissions: defaultPermissions,
      },
    ];

    localStorage.setItem('vollen_users', JSON.stringify(initialUsers));
    setCurrentStep(4);
  };

  const handleCompleteOnboarding = () => {
    // 1. Salva preferências de impressora
    try {
      const printerConfig = {
        paperWidth: printerPaperWidth,
        autoPrint: autoPrintOS,
      };
      localStorage.setItem('vollen_printer_config', JSON.stringify(printerConfig));
    } catch {}

    // 2. Marca onboarding como concluído
    localStorage.setItem('system_onboarding_completed', 'true');

    // 3. Notifica término
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-9999 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        {/* Top Header com Stepper */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-8 py-6 text-white shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/20 rounded-2xl border border-indigo-400/30">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Bem-vindo ao Vollen OS</span>
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                    Passo {currentStep} de {totalSteps}
                  </span>
                </h1>
                <p className="text-xs text-slate-300">
                  Configure seu sistema em menos de 2 minutos para começar a emitir OS
                </p>
              </div>
            </div>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  step <= currentStep
                    ? 'bg-gradient-to-r from-indigo-500 to-indigo-400'
                    : 'bg-slate-700/60'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6 text-slate-700 text-xs">
          {/* ================= PASSO 1: LICENCIAMENTO ================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                  <span>Escolha como deseja começar</span>
                </h2>
                <p className="text-slate-500 text-xs">
                  Você pode ativar sua Chave Serial de licença ou testar o sistema gratuitamente por 15 dias.
                </p>
              </div>

              {/* Opções Serial vs Trial */}
              <div className="grid grid-cols-2 gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => setLicenseMode('SERIAL')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    licenseMode === 'SERIAL'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <KeyRound className={`w-5 h-5 ${licenseMode === 'SERIAL' ? 'text-indigo-600' : 'text-slate-500'}`} />
                    {licenseMode === 'SERIAL' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div className="mt-3">
                    <span className="font-bold text-sm block">Tenho uma Chave Serial</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                      Ativação oficial com sincronização em nuvem
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setLicenseMode('TRIAL')}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                    licenseMode === 'TRIAL'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Zap className={`w-5 h-5 ${licenseMode === 'TRIAL' ? 'text-indigo-600' : 'text-slate-500'}`} />
                    {licenseMode === 'TRIAL' && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div className="mt-3">
                    <span className="font-bold text-sm block">Modo Demonstração (Trial)</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block leading-tight">
                      Teste gratuito de 15 dias com todas as funções
                    </span>
                  </div>
                </button>
              </div>

              {licenseMode === 'SERIAL' && (
                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-800 block">
                    Digite sua Chave Serial:
                  </label>
                  <input
                    type="text"
                    value={serialInput}
                    onChange={(e) => handleFormatSerial(e.target.value)}
                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                    disabled={loadingSerial}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl px-4 py-3 font-mono font-bold text-slate-800 text-sm tracking-wider outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-500">
                    A chave serial é fornecida pelo suporte ou na contratação do plano.
                  </p>
                </div>
              )}

              {serialError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                  {serialError}
                </div>
              )}

              {serialSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{serialSuccess}</span>
                </div>
              )}
            </div>
          )}

          {/* ================= PASSO 2: DADOS DA EMPRESA ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <span>Identidade da sua Empresa</span>
                </h2>
                <p className="text-slate-500 text-xs">
                  Esses dados aparecerão no cabeçalho das Ordens de Serviço, recibos e relatórios.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome Fantasia: *</label>
                  <input
                    type="text"
                    value={companyData.tradingName}
                    onChange={(e) => setCompanyData({ ...companyData, tradingName: e.target.value })}
                    placeholder="Ex: Assistência SmartTech"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Razão Social:</label>
                  <input
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    placeholder="Ex: SmartTech Serviços LTDA"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">WhatsApp / Celular:</label>
                  <input
                    type="text"
                    value={companyData.whatsapp}
                    onChange={(e) => setCompanyData({ ...companyData, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Telefone Fixo:</label>
                  <input
                    type="text"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    placeholder="(00) 0000-0000"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">CNPJ / CPF:</label>
                  <input
                    type="text"
                    value={companyData.cnpj || ''}
                    onChange={(e) => setCompanyData({ ...companyData, cnpj: formatCpfCnpj(e.target.value) })}
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Cidade / UF:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={companyData.city}
                      onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                      placeholder="Cidade"
                      className="flex-1 bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                    />
                    <input
                      type="text"
                      value={companyData.state}
                      maxLength={2}
                      onChange={(e) => setCompanyData({ ...companyData, state: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      className="w-16 bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 text-center outline-none uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Upload de Logo */}
              <div className="pt-2">
                <label className="font-bold text-slate-700 block mb-1.5">Logotipo da Empresa:</label>
                <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {companyData.logoUrl ? (
                      <img src={companyData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-2xs text-xs">
                      <Upload className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Selecionar Imagem</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    <p className="text-[10px] text-slate-400">PNG ou JPEG até 2MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PASSO 3: ADMINISTRADOR ================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-indigo-600" />
                  <span>Segurança e Usuário Administrador</span>
                </h2>
                <p className="text-slate-500 text-xs">
                  Defina o usuário principal que terá acesso total às configurações e relatórios.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome do Administrador:</label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Login de Usuário:</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value.toLowerCase())}
                    placeholder="admin"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Senha de Acesso:</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Senha"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Confirmar Senha:</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirmar senha"
                      className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl px-3.5 py-2 font-medium text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {adminError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                    {adminError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= PASSO 4: IMPRESSÃO & CONCLUSÃO ================= */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  <span>Impressão e Conclusão</span>
                </h2>
                <p className="text-slate-500 text-xs">
                  Escolha o formato padrão de impressão para os comprovantes de OS.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { id: '80mm', title: 'Térmica 80mm', desc: 'Bobina padrão cupom largo' },
                  { id: '58mm', title: 'Térmica 58mm', desc: 'Bobina estreita compacta' },
                  { id: 'A4', title: 'Folha A4', desc: 'Impressora comum laser/jato' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPrinterPaperWidth(item.id as any)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      printerPaperWidth === item.id
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Printer className={`w-5 h-5 ${printerPaperWidth === item.id ? 'text-indigo-600' : 'text-slate-500'}`} />
                      {printerPaperWidth === item.id && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <div className="mt-3">
                      <span className="font-bold text-xs block">{item.title}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <Rocket className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 text-xs">
                    Tudo pronto para alavancar seu atendimento!
                  </p>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Você pode alterar qualquer uma dessas configurações a qualquer momento pelo menu superior.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2 bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep === 1 && (
            <button
              type="button"
              onClick={handleValidateSerialStep}
              disabled={loadingSerial}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2 text-xs"
            >
              {loadingSerial ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <span>Avançar</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {currentStep === 2 && (
            <button
              type="button"
              onClick={handleNextStep2}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2 text-xs"
            >
              <span>Avançar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 3 && (
            <button
              type="button"
              onClick={handleNextStep3}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2 text-xs"
            >
              <span>Avançar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {currentStep === 4 && (
            <button
              type="button"
              onClick={handleCompleteOnboarding}
              className="px-7 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 text-xs"
            >
              <Rocket className="w-4 h-4" />
              <span>Concluir e Começar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
