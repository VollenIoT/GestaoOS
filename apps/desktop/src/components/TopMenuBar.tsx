import React, { useState } from 'react';
import {
  Folder,
  UserPlus,
  Users,
  FileText,
  Settings,
  Printer,
  SlidersHorizontal,
  ChevronDown,
  LogOut,
  PlusCircle,
  DatabaseBackup,
  RotateCcw,
  Package,
  Wrench,
  Cpu,
  FileCheck,
  Search,
  KeyRound,
  ShieldCheck,
  Image as ImageIcon,
  Calendar,
  Calculator,
  Hash,
} from 'lucide-react';

interface TopMenuBarProps {
  onNewOrder: () => void;
  onLogout: () => void;
  onOpenTab: (tab: 'dashboard' | 'schedule') => void;
  onOpenRegister: (type: 'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE') => void;
  onOpenMenuOSModal: () => void;
  onOpenUsersModal: () => void;
  onOpenBackupModal: () => void;
  onOpenClientsModal?: (initialSearch?: string) => void;
  onOpenPartsModal?: () => void;
  onOpenEquipmentsModal?: () => void;
  onOpenServicesModal?: () => void;
  onOpenOrderStatusModal?: () => void;
  onOpenCompanyModal?: () => void;
  onOpenWallpaperModal?: () => void;
  onOpenPeriodReportModal?: () => void;
  onOpenTechniciansModal?: () => void;
  onOpenFactoryResetModal?: () => void;
  onOpenOSGeneralConfigModal?: () => void;
  onOpenOrderSequenceModal?: () => void;
  onOpenPrinterConfigModal?: () => void;
  onOpenEstimatesModal?: () => void;
  onOpenCreateEstimateModal?: () => void;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onNewOrder,
  onLogout,
  onOpenTab,
  onOpenRegister,
  onOpenMenuOSModal,
  onOpenUsersModal,
  onOpenBackupModal,
  onOpenClientsModal,
  onOpenPartsModal,
  onOpenOrderSequenceModal,
  onOpenEquipmentsModal,
  onOpenServicesModal,
  onOpenOrderStatusModal,
  onOpenCompanyModal,
  onOpenWallpaperModal,
  onOpenPeriodReportModal,
  onOpenTechniciansModal,
  onOpenFactoryResetModal,
  onOpenOSGeneralConfigModal,
  onOpenPrinterConfigModal,
  onOpenEstimatesModal,
  onOpenCreateEstimateModal,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const handleAction = (action: () => void) => {
    action();
    setOpenMenu(null);
  };

  const handleRestoreBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.db,.sqlite';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      if (file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            if (data.clients) localStorage.setItem('vollen_clients', JSON.stringify(data.clients));
            if (data.orders) localStorage.setItem('vollen_orders', JSON.stringify(data.orders));
            if (data.visits) localStorage.setItem('vollen_visits', JSON.stringify(data.visits));
            if (data.users) localStorage.setItem('vollen_users', JSON.stringify(data.users));
            if (data.companyData) localStorage.setItem('vollen_company_data', JSON.stringify(data.companyData));
            if (data.estimates) localStorage.setItem('vollen_estimates', JSON.stringify(data.estimates));
            if (data.parts) localStorage.setItem('vollen_parts', JSON.stringify(data.parts));
            if (data.services) localStorage.setItem('vollen_services', JSON.stringify(data.services));
            if (data.equipments) localStorage.setItem('system_equipments', JSON.stringify(data.equipments));
            if (data.technicians) localStorage.setItem('vollen_technicians', JSON.stringify(data.technicians));
            if (data.customWallpaper) localStorage.setItem('system_wallpaper_url', data.customWallpaper);
            if (data.wallpaperOpacity) localStorage.setItem('system_wallpaper_opacity', data.wallpaperOpacity);
            if (data.wallpaperPosX) localStorage.setItem('system_wallpaper_pos_x', data.wallpaperPosX);
            if (data.wallpaperPosY) localStorage.setItem('system_wallpaper_pos_y', data.wallpaperPosY);
            if (data.wallpaperScale) localStorage.setItem('system_wallpaper_scale', data.wallpaperScale);
            if (data.osPreferences) localStorage.setItem('vollen_os_preferences', JSON.stringify(data.osPreferences));
            if (data.customNextOSNumber) localStorage.setItem('vollen_custom_next_os_number', data.customNextOSNumber);
            if (data.printerConfig) localStorage.setItem('vollen_printer_config', JSON.stringify(data.printerConfig));
            if (data.warrantyTerms) localStorage.setItem('warranty_config', JSON.stringify(data.warrantyTerms));

            window.location.reload();
          } catch (err) {
            console.error('Arquivo de backup inválido:', err);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handlePrintSystem = () => {
    window.print();
  };

  return (
    <div
      className="bg-slate-200 border-b border-slate-300 text-xs font-bold text-slate-800 flex items-center px-2 select-none relative z-50 shadow-sm"
      onMouseLeave={() => setOpenMenu(null)}
    >
      {/* 1. Arquivos */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('arquivos')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'arquivos' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Folder className="w-3.5 h-3.5 text-sky-700" />
          Arquivos
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'arquivos' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[210px] z-50 text-slate-800">
            <button
              onClick={() => handleAction(onOpenUsersModal)}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 font-semibold"
            >
              <KeyRound className="w-3.5 h-3.5 text-sky-700" />
              Usuários e Senhas
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              onClick={() => handleAction(onOpenBackupModal)}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2"
            >
              <DatabaseBackup className="w-3.5 h-3.5 text-emerald-600" />
              Criar Backup
            </button>

            <button
              onClick={() => handleAction(handleRestoreBackup)}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              Restaurar Backup
            </button>

            <button
              onClick={() => handleAction(() => {
                if (onOpenPrinterConfigModal) onOpenPrinterConfigModal();
                else handlePrintSystem();
              })}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 cursor-pointer font-medium"
            >
              <Printer className="w-3.5 h-3.5 text-sky-700" />
              <span>Configurações de Impressora</span>
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              onClick={() => handleAction(onLogout)}
              className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-700 flex items-center gap-2 font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair do Sistema
            </button>
          </div>
        )}
      </div>

      {/* 2. Cadastro */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('cadastro')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'cadastro' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <UserPlus className="w-3.5 h-3.5 text-sky-700" />
          Cadastro
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'cadastro' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[240px] z-50 text-slate-800 text-xs">
            <button
              onClick={() => handleAction(() => onOpenClientsModal ? onOpenClientsModal() : onOpenRegister('CLIENT'))}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 font-bold cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              Cadastrar Cliente
            </button>

            <button
              onClick={() => handleAction(() => onOpenTechniciansModal ? onOpenTechniciansModal() : onOpenRegister('TECHNICIAN'))}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-indigo-700 flex items-center gap-2 font-bold text-indigo-900 cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-indigo-600" />
              Cadastrar Técnico Responsável
            </button>

            <button
              onClick={() => handleAction(() => onOpenPartsModal ? onOpenPartsModal() : onOpenRegister('PART'))}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-amber-700 flex items-center gap-2 font-bold text-amber-900 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-amber-600" />
              Cadastrar Peças
            </button>

            <button
              onClick={() => handleAction(() => onOpenEquipmentsModal ? onOpenEquipmentsModal() : onOpenRegister('EQUIPMENT'))}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-purple-700 flex items-center gap-2 font-bold text-purple-700 cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-600" />
              Cadastrar Equipamento
            </button>

            <button
              onClick={() => handleAction(() => onOpenServicesModal ? onOpenServicesModal() : onOpenRegister('SERVICE'))}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 font-bold text-sky-700 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5 text-sky-700" />
              Cadastrar Serviço
            </button>

            <div className="my-1 border-t border-slate-200" />

            <button
              onClick={() => handleAction(onOpenUsersModal)}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 font-bold text-slate-800 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-sky-700" />
              Cadastrar Usuário / Senha
            </button>
          </div>
        )}
      </div>

      {/* 3. Clientes */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('clientes')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer ${
            openMenu === 'clientes' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Users className="w-3.5 h-3.5 text-sky-700" />
          Clientes
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'clientes' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-2 min-w-[280px] z-50 text-slate-800 text-xs font-medium animate-fadeIn">
            {/* 1. Acessar Clientes */}
            <button
              onClick={() => handleAction(() => onOpenClientsModal && onOpenClientsModal())}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 font-bold cursor-pointer"
            >
              <Users className="w-4 h-4 text-sky-700 shrink-0" />
              <span>Acessar Clientes (Central)</span>
            </button>

            {/* 2. Cadastrar Novo Cliente */}
            <button
              onClick={() => handleAction(() => onOpenRegister('CLIENT'))}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-emerald-700 flex items-center gap-2 font-bold cursor-pointer text-emerald-800"
            >
              <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cadastrar Novo Cliente</span>
            </button>

            <div className="border-t border-slate-200 my-1.5"></div>

            {/* 3. Campo de Busca com Enter */}
            <div className="px-3 py-1">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-indigo-600" />
                Buscar Cliente:
              </label>
              <input
                type="text"
                autoFocus
                placeholder="Nome, telefone ou endereço (Enter)..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const value = (e.currentTarget.value || '').trim();
                    handleAction(() => onOpenClientsModal && onOpenClientsModal(value));
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-xs"
              />
              <span className="text-[10px] text-slate-500 italic mt-1 block">
                Pressione <strong className="text-slate-700">Enter</strong> para abrir e filtrar
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Peças */}
      <button
        onClick={() => {
          if (onOpenPartsModal) onOpenPartsModal();
        }}
        className="flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-amber-700 transition-colors cursor-pointer font-bold"
      >
        <Package className="w-3.5 h-3.5 text-amber-600" />
        Peças
      </button>

      {/* Equipamentos */}
      <button
        onClick={() => {
          if (onOpenEquipmentsModal) onOpenEquipmentsModal();
        }}
        className="flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-purple-700 transition-colors cursor-pointer font-bold"
      >
        <Cpu className="w-3.5 h-3.5 text-purple-600" />
        Equipamentos
      </button>

      {/* Serviços */}
      <button
        onClick={() => {
          if (onOpenServicesModal) onOpenServicesModal();
        }}
        className="flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer font-bold"
      >
        <FileCheck className="w-3.5 h-3.5 text-sky-600" />
        Serviços
      </button>

      <button
        onClick={() => handleAction(onOpenMenuOSModal)}
        className="flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer font-bold"
      >
        <FileText className="w-3.5 h-3.5 text-sky-700" />
        Menu OS
      </button>

      {/* Orçamentos */}
      <button
        onClick={() => {
          if (onOpenEstimatesModal) onOpenEstimatesModal();
        }}
        className="flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-amber-700 transition-colors cursor-pointer font-bold text-amber-900"
      >
        <Calculator className="w-3.5 h-3.5 text-amber-600" />
        Orçamentos
      </button>

      {/* 5. Configuração de OS */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('configos')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors cursor-pointer ${
            openMenu === 'configos' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-sky-700" />
          Configuração de OS
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'configos' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[270px] z-50 text-slate-800 text-xs">
            {/* 1. Parâmetros e Preferências Gerais de OS */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenOSGeneralConfigModal) onOpenOSGeneralConfigModal();
              })}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 font-bold cursor-pointer text-slate-800"
            >
              <Settings className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Parâmetros e Regras da OS</span>
            </button>

            {/* 2. Definir Numeração Inicial de OS (Isolado) */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenOrderSequenceModal) onOpenOrderSequenceModal();
              })}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-indigo-700 flex items-center gap-2 font-bold cursor-pointer text-indigo-950"
            >
              <Hash className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Definir Numeração Inicial da OS</span>
            </button>

            {/* 3. Status de Atendimento */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenOrderStatusModal) onOpenOrderStatusModal();
              })}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-amber-700 flex items-center gap-2 font-bold cursor-pointer text-amber-900"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Status de Atendimento</span>
            </button>

            <div className="border-t border-slate-200 my-1"></div>

            {/* 4. Termos de Garantia & Orçamento */}
            <button
              onClick={() => handleAction(() => onOpenRegister ? onOpenRegister('WARRANTY_TERMS' as any) : null)}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-purple-700 font-bold text-purple-700 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Termos de Garantia & Orçamento</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. Impressão */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('impressao')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'impressao' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <Printer className="w-3.5 h-3.5 text-sky-700" />
          Impressão
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'impressao' && (
          <div className="absolute left-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[240px] z-50 text-slate-800 text-xs">
            <button
              onClick={() => handleAction(() => {
                if (onOpenPeriodReportModal) onOpenPeriodReportModal();
                else handlePrintSystem();
              })}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2 font-bold cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Imprimir Relatório Geral de OS</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. Opções */}
      <div className="relative">
        <button
          onClick={() => toggleMenu('opcoes')}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 hover:bg-slate-300 hover:text-sky-700 transition-colors ${
            openMenu === 'opcoes' ? 'bg-slate-300 text-sky-700' : ''
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-sky-700" />
          Opções
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>

        {openMenu === 'opcoes' && (
          <div className="absolute right-0 top-full bg-slate-100 border border-slate-300 rounded-b-xl shadow-xl py-1.5 min-w-[280px] z-50 text-slate-800 text-xs">
            {/* 1. Alterar Plano de Fundo */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenWallpaperModal) onOpenWallpaperModal();
              })}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-200 hover:text-sky-700 flex items-center gap-2.5 font-bold cursor-pointer text-slate-800"
            >
              <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />
              <span>Alterar Plano de Fundo</span>
            </button>

            {/* 2. Ver Lista de OS por Períodos */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenPeriodReportModal) onOpenPeriodReportModal();
              })}
              className="w-full text-left px-4 py-2.5 hover:bg-slate-200 hover:text-indigo-700 flex items-center gap-2.5 font-bold cursor-pointer text-indigo-900"
            >
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Lista de OS por Períodos (Relatório)</span>
            </button>

            <div className="border-t border-slate-200 my-1"></div>

            {/* 3. Dados da Empresa */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenCompanyModal) onOpenCompanyModal();
              })}
              className="w-full text-left px-4 py-2 hover:bg-slate-200 hover:text-slate-900 flex items-center gap-2.5 font-medium cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Dados da Empresa</span>
            </button>

            <div className="border-t border-red-200 my-1"></div>

            {/* 4. Restaurar Padrão de Fábrica */}
            <button
              onClick={() => handleAction(() => {
                if (onOpenFactoryResetModal) onOpenFactoryResetModal();
              })}
              className="w-full text-left px-4 py-2.5 hover:bg-red-100 text-red-700 flex items-center gap-2.5 font-bold cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-red-600 shrink-0" />
              <span>Restaurar Padrão de Fábrica</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
