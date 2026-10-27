export type AppEdition = 'v1.0.0' | 'v2.0.0' | 'v3.0.0' | 'v4.0.0';

export interface AppFeaturesConfig {
  edition: AppEdition;
  name: string;
  description: string;
  hasCloud: boolean;            // Conexão e sincronização em nuvem (Firestore)
  hasApk: boolean;              // Conexão e pareamento com aplicativo celular (APK)
  hasWhatsApp: boolean;         // Botões de envio de mensagens automáticas no WhatsApp
  isLocalServer: boolean;       // Servidor local no PC do cliente (v2.0.0)
  allowCloudLicenseCheck: boolean; // Validação remota de serial (apenas se houver internet)

  // Granularidade v1.0.0 vs v2.0.0 / v3.0.0 / v4.0.0
  hasCashRegister: boolean;     // Caixa / Fluxo de caixa
  hasOSTabServicesParts: boolean; // Aba Serviços & Peças na OS
  hasOSTabData: boolean;          // Aba Dados na OS
  hasAddMoreEquipmentInOS: boolean; // Botão +Novo Equipamento (+1 Aparelho) na OS
  hasClientPreviousEquipments: boolean; // Botão Aparelhos Anteriores na OS
  hasClientOSHistoryInOS: boolean; // Botão Histórico de OS do Cliente no cabeçalho da OS
  hasPartsTechPrice: boolean;   // Campo Valor Técnico no cadastro e lista de peças
  hasPartsReservedColumn: boolean; // Coluna Reservada na lista de peças
  hasSeparatePartsInOS: boolean; // Botão "Separar Peças" na lista de peças da OS
  hasSplitPaymentInOS: boolean; // Opção de "Dividir em 2 Formas" ao finalizar a OS
  hasOSDiscountAndAdvance: boolean; // Campos Desconto e Adiantamento na barra inferior da OS
  hasWarrantyReturnInReopen: boolean; // Opção de "Retorno em Garantia" ao reabrir OS finalizada (v3 apenas)
  hasClientTechnicianType: boolean; // Botão Técnico/Revendedor no cadastro do cliente
  hasClientAdditionalContacts: boolean; // Campos Contato / Telefone Contato / Adicionar Contatos no cliente
  hasEquipmentsMenu: boolean;   // Botão / Cadastro de Equipamentos no menu superior
  hasEquipmentTypeSelect: boolean; // Modo seleção/dropdown de equipamentos na OS (se false, é digitação livre sem botão +Novo tipo)
  hasCloudDatabaseIndicator: boolean; // Indicador de BANCO: NUVEM / BANCO: LOCAL na StatusBar

  hasEditClientInOS: boolean;   // Botão "Editar Cadastro" no cabeçalho da OS
  hasOSTypeSelector: boolean;   // Seletor "Tipo da OS" na aba agendamento (se false, é sempre ORÇAMENTO padrão)
  hasFactoryWarrantyOption: boolean; // Opção "Garantia de Fábrica" no seletor de modalidade de garantia
  hasAutoCepSearch: boolean;    // Busca automática por CEP no cadastro de cliente
  hasPartsGroupSelect: boolean; // Seletor/dropdown de grupo em peças (se false, é campo de digitação livre)
  hasAuditHistoryInOSAndEstimate: boolean; // Botão de Histórico (auditoria) na OS e no Orçamento
  hasSalesPartnerButton: boolean; // Botão "Técnico / Parceiro" na tela de vendas
  hasSalesSavedCarts: boolean;  // Opção "Salvar Carrinho" e aba "Carrinhos Salvos" em Vendas

  hasHomeEstimateButton: boolean; // Botão "Orçamento" na tela inicial
  hasHomeClientsButton: boolean;  // Botão "Clientes" na tela inicial
  hasHomeScheduleButton: boolean; // Botão "Agenda" na tela inicial
  hasOSTableTypeColumn: boolean;  // Coluna "Tipo OS" nas tabelas de OS abertas e finalizadas
  hasOSTableProblemColumn: boolean; // Coluna "Problema Relatado" nas tabelas de OS abertas e finalizadas
  hasOSTableWarrantyColumn: boolean; // Coluna "Garantia" nas tabelas de OS abertas e finalizadas
  hasGenerateOSFromEstimate: boolean; // Botão "Gerar OS" no orçamento (ficha e lista)

  hasEquipmentsReportInConsolidated: boolean; // Aba "Equipamentos" no relatório consolidado por período
  hasTechnicianReportExcelExport: boolean;    // Botão "Excel / CSV" no relatório por técnico
  hasOSGeneralConfigWhatsApp: boolean;        // Notificação WhatsApp e Aba WhatsApp em Parâmetros e Regras
  hasStatusStockActions: boolean;             // Opções e colunas de dar baixa / retornar ao estoque nos status
  hasServicesMenu: boolean;                   // Menu Superior: Cadastro / Gestão de Serviços
  hasEstimateSearchServicesButton: boolean;   // Botão "Buscar Serviços" no formulário de Orçamento

  // ── Recursos Exclusivos v4.0.0 (Enterprise) ──
  hasNfeXmlImport: boolean;                   // Importação de XML de NF-e para Entrada de Estoque
  hasStockAlerts: boolean;                    // Alerta de Estoque Mínimo e Sugestão de Compras
  hasFinancialDRE: boolean;                   // DRE, Lucro Líquido Real por OS e Ranking Financeiro
  hasLabelPrinting: boolean;                  // Central de Etiquetas (OS, Peças e Lacres)
  hasFiscalInvoices: boolean;                 // Emissão de NF-e e NFS-e
  hasPurchaseOrders: boolean;                 // Ordens de Compra Automáticas e Reposição
}

export const APP_EDITIONS: Record<AppEdition, AppFeaturesConfig> = {
  'v1.0.0': {
    edition: 'v1.0.0',
    name: 'Vollen OS - Básico Local',
    description: 'Sistema 100% autônomo e offline no computador (sem nuvem, sem APK, sem WhatsApp).',
    hasCloud: false,
    hasApk: false,
    hasWhatsApp: false,
    isLocalServer: true,
    allowCloudLicenseCheck: false,

    hasCashRegister: false,
    hasOSTabServicesParts: false,
    hasOSTabData: false,
    hasAddMoreEquipmentInOS: false,
    hasClientPreviousEquipments: false,
    hasClientOSHistoryInOS: false,
    hasPartsTechPrice: false,
    hasPartsReservedColumn: false,
    hasSeparatePartsInOS: false,
    hasSplitPaymentInOS: false,
    hasOSDiscountAndAdvance: false,
    hasWarrantyReturnInReopen: false,
    hasClientTechnicianType: false,
    hasClientAdditionalContacts: false,
    hasEquipmentsMenu: false,
    hasEquipmentTypeSelect: false,
    hasCloudDatabaseIndicator: false,

    hasEditClientInOS: false,
    hasOSTypeSelector: false,
    hasFactoryWarrantyOption: false,
    hasAutoCepSearch: false,
    hasPartsGroupSelect: false,
    hasAuditHistoryInOSAndEstimate: false,
    hasSalesPartnerButton: false,
    hasSalesSavedCarts: false,

    hasHomeEstimateButton: false,
    hasHomeClientsButton: false,
    hasHomeScheduleButton: false,
    hasOSTableTypeColumn: false,
    hasOSTableProblemColumn: false,
    hasOSTableWarrantyColumn: false,
    hasGenerateOSFromEstimate: false,

    hasEquipmentsReportInConsolidated: false,
    hasTechnicianReportExcelExport: false,
    hasOSGeneralConfigWhatsApp: false,
    hasStatusStockActions: false,
    hasServicesMenu: false,
    hasEstimateSearchServicesButton: false,

    hasNfeXmlImport: false,
    hasStockAlerts: false,
    hasFinancialDRE: false,
    hasLabelPrinting: false,
    hasFiscalInvoices: false,
    hasPurchaseOrders: false,
  },
  'v2.0.0': {
    edition: 'v2.0.0',
    name: 'Vollen OS - Local & WhatsApp',
    description: 'Sistema em rede local offline autônomo com envio de mensagens via WhatsApp.',
    hasCloud: false,
    hasApk: false, // Removido na v2
    hasWhatsApp: true,
    isLocalServer: true,
    allowCloudLicenseCheck: false,

    hasCashRegister: true,
    hasOSTabServicesParts: true,
    hasOSTabData: true,
    hasAddMoreEquipmentInOS: false, // Removido na v2
    hasClientPreviousEquipments: false, // Removido na v2
    hasClientOSHistoryInOS: true,
    hasPartsTechPrice: true,
    hasPartsReservedColumn: true,
    hasSeparatePartsInOS: false, // Removido na v2
    hasSplitPaymentInOS: false, // Removido na v2
    hasOSDiscountAndAdvance: false, // Removido na v2
    hasWarrantyReturnInReopen: false, // Removido na v2: reabre direto para ABERTA com confirmação
    hasClientTechnicianType: true,
    hasClientAdditionalContacts: false, // Removido na v2
    hasEquipmentsMenu: true,
    hasEquipmentTypeSelect: true,
    hasCloudDatabaseIndicator: false,

    hasEditClientInOS: false, // Removido na v2
    hasOSTypeSelector: true,
    hasFactoryWarrantyOption: true,
    hasAutoCepSearch: true,
    hasPartsGroupSelect: true,
    hasAuditHistoryInOSAndEstimate: true,
    hasSalesPartnerButton: true,
    hasSalesSavedCarts: true,

    hasHomeEstimateButton: false, // Removido na v2
    hasHomeClientsButton: false, // Removido na v2
    hasHomeScheduleButton: true,
    hasOSTableTypeColumn: true,
    hasOSTableProblemColumn: true,
    hasOSTableWarrantyColumn: true,
    hasGenerateOSFromEstimate: true,

    hasEquipmentsReportInConsolidated: true,
    hasTechnicianReportExcelExport: true,
    hasOSGeneralConfigWhatsApp: true,
    hasStatusStockActions: false, // Removido na v2
    hasServicesMenu: true,
    hasEstimateSearchServicesButton: true,

    hasNfeXmlImport: false,
    hasStockAlerts: false,
    hasFinancialDRE: false,
    hasLabelPrinting: false,
    hasFiscalInvoices: false,
    hasPurchaseOrders: false,
  },
  'v3.0.0': {
    edition: 'v3.0.0',
    name: 'Vollen OS - Pro Cloud',
    description: 'Sincronização híbrida (Nuvem em tempo real + Rede Local Offline), APK de qualquer lugar e atualizações automáticas.',
    hasCloud: true,
    hasApk: true,
    hasWhatsApp: true,
    isLocalServer: true,
    allowCloudLicenseCheck: true,

    hasCashRegister: true,
    hasOSTabServicesParts: true,
    hasOSTabData: true,
    hasAddMoreEquipmentInOS: true,
    hasClientPreviousEquipments: true,
    hasClientOSHistoryInOS: true,
    hasPartsTechPrice: true,
    hasPartsReservedColumn: true,
    hasSeparatePartsInOS: true,
    hasSplitPaymentInOS: true,
    hasOSDiscountAndAdvance: true,
    hasWarrantyReturnInReopen: true,
    hasClientTechnicianType: true,
    hasClientAdditionalContacts: true,
    hasEquipmentsMenu: true,
    hasEquipmentTypeSelect: true,
    hasCloudDatabaseIndicator: true,

    hasEditClientInOS: true,
    hasOSTypeSelector: true,
    hasFactoryWarrantyOption: true,
    hasAutoCepSearch: true,
    hasPartsGroupSelect: true,
    hasAuditHistoryInOSAndEstimate: true,
    hasSalesPartnerButton: true,
    hasSalesSavedCarts: true,

    hasHomeEstimateButton: true,
    hasHomeClientsButton: true,
    hasHomeScheduleButton: true,
    hasOSTableTypeColumn: true,
    hasOSTableProblemColumn: true,
    hasOSTableWarrantyColumn: true,
    hasGenerateOSFromEstimate: true,

    hasEquipmentsReportInConsolidated: true,
    hasTechnicianReportExcelExport: true,
    hasOSGeneralConfigWhatsApp: true,
    hasStatusStockActions: true,
    hasServicesMenu: true,
    hasEstimateSearchServicesButton: true,

    hasNfeXmlImport: false,
    hasStockAlerts: false,
    hasFinancialDRE: false,
    hasLabelPrinting: false,
    hasFiscalInvoices: false,
    hasPurchaseOrders: false,
  },
  'v4.0.0': {
    edition: 'v4.0.0',
    name: 'Vollen - Gestão de OS e Vendas V4',
    description: 'Gestão Completa de OS, Vendas & PDV Balcão, Módulo Fiscal (NF-e/NFS-e), Central de Etiquetas, Ordens de Compra e DRE.',
    hasCloud: true,
    hasApk: true,
    hasWhatsApp: true,
    isLocalServer: true,
    allowCloudLicenseCheck: true,

    hasCashRegister: true,
    hasOSTabServicesParts: true,
    hasOSTabData: true,
    hasAddMoreEquipmentInOS: true,
    hasClientPreviousEquipments: true,
    hasClientOSHistoryInOS: true,
    hasPartsTechPrice: true,
    hasPartsReservedColumn: true,
    hasSeparatePartsInOS: true,
    hasSplitPaymentInOS: true,
    hasOSDiscountAndAdvance: true,
    hasWarrantyReturnInReopen: true,
    hasClientTechnicianType: true,
    hasClientAdditionalContacts: true,
    hasEquipmentsMenu: true,
    hasEquipmentTypeSelect: true,
    hasCloudDatabaseIndicator: true,

    hasEditClientInOS: true,
    hasOSTypeSelector: true,
    hasFactoryWarrantyOption: true,
    hasAutoCepSearch: true,
    hasPartsGroupSelect: true,
    hasAuditHistoryInOSAndEstimate: true,
    hasSalesPartnerButton: true,
    hasSalesSavedCarts: true,

    hasHomeEstimateButton: true,
    hasHomeClientsButton: true,
    hasHomeScheduleButton: true,
    hasOSTableTypeColumn: true,
    hasOSTableProblemColumn: true,
    hasOSTableWarrantyColumn: true,
    hasGenerateOSFromEstimate: true,

    hasEquipmentsReportInConsolidated: true,
    hasTechnicianReportExcelExport: true,
    hasOSGeneralConfigWhatsApp: true,
    hasStatusStockActions: true,
    hasServicesMenu: true,
    hasEstimateSearchServicesButton: true,

    // ── V4.0.0 Exclusives ──
    hasNfeXmlImport: true,
    hasStockAlerts: true,
    hasFinancialDRE: true,
    hasLabelPrinting: true,
    hasFiscalInvoices: true,
    hasPurchaseOrders: true,
  },
};

/**
 * Define a edição atual ativa do sistema.
 * Prioridade:
 * 1. Variável de ambiente de compilação VITE_APP_EDITION (ex: 'v1.0.0' / 'v2.0.0' / 'v3.0.0')
 * 2. Licença do tenant salva localmente
 * 3. Padrão inicial: 'v1.0.0' (100% Local)
 */
export function getCurrentEdition(): AppEdition {
  // 1. Variável de compilação explícita
  const envEdition = import.meta.env?.VITE_APP_EDITION as AppEdition | undefined;
  if (envEdition && APP_EDITIONS[envEdition]) {
    return envEdition;
  }

  // 2. Versão injetada no build (__APP_VERSION__)
  if (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) {
    const formatted = `v${__APP_VERSION__}` as AppEdition;
    if (APP_EDITIONS[formatted]) {
      return formatted;
    }
    const major = __APP_VERSION__.split('.')[0];
    const majorEdition = `v${major}.0.0` as AppEdition;
    if (APP_EDITIONS[majorEdition]) {
      return majorEdition;
    }
  }

  // 3. Licença salva no sistema
  try {
    const rawTenant = localStorage.getItem('system_tenant_info');
    if (rawTenant) {
      const parsed = JSON.parse(rawTenant);
      if (parsed.appVersion && APP_EDITIONS[parsed.appVersion as AppEdition]) {
        return parsed.appVersion as AppEdition;
      }
    }
  } catch {}

  // 4. Padrão: Versão 1.0.0
  return 'v1.0.0';
}

/**
 * Retorna as flags de funcionalidades ativas para a edição atual
 */
export function getCurrentFeatures(): AppFeaturesConfig {
  const edition = getCurrentEdition();
  return APP_EDITIONS[edition] || APP_EDITIONS['v1.0.0'];
}
