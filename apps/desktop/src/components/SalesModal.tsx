import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ShoppingCart,
  Search,
  Plus,
  Trash2,
  Package,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  History,
  Tag,
  ArrowRight,
  Bookmark,
  Save,
  Clock,
  Eye,
  Info,
  AlertTriangle,
  Edit3,
  MessageSquare,
  Share2,
  Percent,
  Settings,
  Layers,
  Calendar,
  UserCheck,
  Coins,
  Receipt,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Part } from './PartsModal';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';
import { getCurrentFeatures } from '../config/appFeatures';
import { assertTerminalCanSave } from '../services/localNetworkService';
import { recordStockMovement } from '../services/stockService';

export interface SaleItem {
  partId: string;
  code: string;
  name: string;
  application?: string;
  unitPrice: number;
  qty: number;
  subtotal: number;
  costPrice?: number;
}

export interface SalePayment {
  id?: string;
  method: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'A_PRAZO' | 'PROMISSORIA' | 'BOLETO' | 'OUTROS';
  amount: number;
  installments?: number;
  cardFeeRate?: number;
  cardFeeAmount?: number;
  dueDate?: string;
}

export interface ClientDebtInstallment {
  id?: string;
  number: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  paidAmount: number;
  status: 'PENDENTE' | 'PAGO' | 'VENCIDO';
  paidAt?: string;
  paymentMethod?: string;
}

export interface ClientDebtRecord {
  id: string;
  saleId: string;
  saleCode: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientDocument?: string;
  date: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'PENDENTE' | 'PARCIAL' | 'QUITADO';
  installments: ClientDebtInstallment[];
  notes?: string;
  createdAt: string;
}

export interface CardFeeConfig {
  debitFee: number;
  creditFees: Record<number, number>;
  passFeeToClientDefault: boolean;
}

export interface SellerCommissionConfig {
  defaultRate: number; // ex: 3%
  sellersRates: Record<string, number>;
}

export interface SavedCart {
  id: string;
  label: string; // Nome ou identificação da espera (Ex: "Orçamento do João", "Mesa 2")
  savedAt: string; // Data e Hora formatadas
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientDocument?: string;
  sellerName?: string;
  items: SaleItem[];
  subtotal: number;
  discountInput: string;
  paymentMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'A_PRAZO' | 'PROMISSORIA' | 'MISTO' | 'OUTROS' | string;
  creditInstallments: number;
  payments?: SalePayment[];
  notes?: string;
}

export interface SaleRecord {
  id: string;
  saleCode: string; // Ex: VD-0001
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  createdAt: string; // ISO
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientDocument?: string;
  sellerName: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  cardFeeAmount?: number;
  totalAmount: number;
  paymentMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'A_PRAZO' | 'PROMISSORIA' | 'MISTO' | 'OUTROS' | string;
  installments?: number;
  payments?: SalePayment[];
  commissionRate?: number;
  commissionAmount?: number;
  isDebt?: boolean;
  debtId?: string;
  notes?: string;
}

interface SalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted?: () => void;
  parts: Part[];
  clients: any[];
  currentUser?: any;
  companyInfo?: any;
  onUpdatePartsStock?: (updatedParts: Part[]) => void;
  onOpenPartsModal?: () => void;
  selectedPartToAdd?: Part | null;
  onOpenCreateClient?: () => void;
  onViewPartDetails?: (part: Part) => void;
}

export const SalesModal: React.FC<SalesModalProps> = ({
  isOpen,
  onClose,
  onSaleCompleted,
  parts = [],
  clients = [],
  currentUser,
  companyInfo,
  onUpdatePartsStock,
  onOpenPartsModal,
  selectedPartToAdd = null,
  onOpenCreateClient,
  onViewPartDetails,
}) => {
  const { alert, confirm } = useDialog();

  // Estados da Venda em Andamento (Exclusivo e Local por Computador)
  const [cart, setCart] = useState<SaleItem[]>(() => {
    try {
      const localCart = localStorage.getItem('vollen_local_sales_cart');
      if (localCart) return JSON.parse(localCart);
    } catch {}
    return [];
  });

  // Salva alterações no carrinho local do navegador/computador
  useEffect(() => {
    try {
      localStorage.setItem('vollen_local_sales_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('Consumidor Final (Balcão)');
  const [selectedClientPhone, setSelectedClientPhone] = useState<string>('');
  const [selectedClientDoc, setSelectedClientDoc] = useState<string>('');
  const [isSearchClientModalOpen, setIsSearchClientModalOpen] = useState(false);
  const [clientSearchFilter, setClientSearchFilter] = useState('');

  // Função para limpar completamente a tela de vendas
  const resetSalesForm = () => {
    setCart([]);
    setSelectedClientId('');
    setSelectedClientName('Consumidor Final (Balcão)');
    setSelectedClientPhone('');
    setSelectedClientDoc('');
    setDiscountInput('0');
    setSaleNotes('');
    setPartSearch('');
    setSelectedPartForAdd(null);
    setAddQty('1');
    setAddCustomPrice('');
    setReopenedSaleBackup(null);
    try {
      localStorage.removeItem('vollen_local_sales_cart');
      localStorage.removeItem('vollen_origin_estimate_id');
      localStorage.removeItem('vollen_active_saved_cart_id');
      localStorage.removeItem('vollen_local_sales_client');
    } catch {}
  };

  // Solicitação de fechamento com confirmação de saída se houver itens ou cliente selecionado
  const handleRequestClose = async () => {
    const hasItems = cart.length > 0;
    const hasCustomClient = Boolean(selectedClientId || (selectedClientName && !selectedClientName.includes('Consumidor Final')));

    if (hasItems || hasCustomClient) {
      const ok = await confirm({
        title: 'Sair da Tela de Venda?',
        message: 'Você tem itens no carrinho ou um cliente selecionado nesta venda.\n\nDeseja realmente fechar sem concluir a venda? Os dados da venda em andamento serão descartados.',
        variant: 'warning',
        confirmText: 'Sair e Descartar',
      });
      if (!ok) return;
    }

    resetSalesForm();
    onClose();
  };

  const handleRequestCloseRef = useRef(handleRequestClose);
  handleRequestCloseRef.current = handleRequestClose;

  // Vendedor Selecionado (Padrão: usuário logado, com dropdown apenas com usuários cadastrados)
  const [sellerName, setSellerName] = useState<string>(() => {
    return currentUser?.name || currentUser?.username || '';
  });

  // Função auxiliar para carregar e desduplicar a lista de vendedores/usuários/técnicos
  const loadAvailableSellers = (): string[] => {
    const list: string[] = [];
    try {
      // 1. Usuários cadastrados (Gestão de Usuários)
      const savedUsers = localStorage.getItem('vollen_users');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((u: any) => {
            const name = (u.name || u.username || '').trim();
            if (name) list.push(name);
          });
        }
      }

      const sysUsers = localStorage.getItem('system_users');
      if (sysUsers) {
        const parsedSys = JSON.parse(sysUsers);
        if (Array.isArray(parsedSys)) {
          parsedSys.forEach((u: any) => {
            const name = (u.name || u.username || '').trim();
            if (name) list.push(name);
          });
        }
      }

      // 2. Técnicos cadastrados (Cadastros -> Técnicos)
      const savedTechs = localStorage.getItem('vollen_technicians');
      if (savedTechs) {
        const parsedTechs = JSON.parse(savedTechs);
        if (Array.isArray(parsedTechs)) {
          parsedTechs.forEach((t: any) => {
            const name = (t.name || '').trim();
            if (name && name !== 'Técnico Exemplo' && name !== 'Técnico Roberto') {
              list.push(name);
            }
          });
        }
      }

      // 3. Usuário logado atualmente
      if (currentUser?.name) list.push(currentUser.name.trim());
      else if (currentUser?.username) list.push(currentUser.username.trim());
    } catch {}

    const map = new Map<string, string>();
    list.forEach((n) => {
      const trimmed = n.trim();
      if (!trimmed) return;
      const key = trimmed.toUpperCase();
      if (!map.has(key)) {
        map.set(key, trimmed);
      }
    });

    if (!map.has('ADMINISTRADOR') && !map.has('ADMIN')) {
      map.set('ADMINISTRADOR', 'Administrador');
    }

    return Array.from(map.values());
  };

  // Lista de vendedores/usuários do sistema para seleção (apenas cadastrados)
  const [availableSellers, setAvailableSellers] = useState<string[]>(() => {
    return loadAvailableSellers();
  });

  // Recarrega lista de vendedores sempre que o modal abre ou quando o usuário logado muda
  useEffect(() => {
    if (isOpen) {
      const list = loadAvailableSellers();
      setAvailableSellers(list);

      if (!sellerName || !list.some((s) => s.toUpperCase() === sellerName.toUpperCase())) {
        const defaultSeller = currentUser?.name || currentUser?.username || list[0] || 'Administrador';
        const matched = list.find((s) => s.toUpperCase() === defaultSeller.toUpperCase()) || list[0] || 'Administrador';
        setSellerName(matched);
      }

      // Sincroniza do Firestore também se houver conexão
      if (db) {
        getDocs(collection(db, 'users')).then((snap) => {
          if (!snap.empty) {
            const remoteUsers = snap.docs.map((d) => (d.data().name || d.data().username || '').trim()).filter(Boolean);
            setAvailableSellers((prev) => {
              const map = new Map<string, string>();
              prev.forEach((p) => map.set(p.toUpperCase(), p));
              remoteUsers.forEach((ru) => {
                const key = ru.toUpperCase();
                if (!map.has(key)) {
                  map.set(key, ru);
                }
              });
              if (!map.has('ADMINISTRADOR') && !map.has('ADMIN')) {
                map.set('ADMINISTRADOR', 'Administrador');
              }
              return Array.from(map.values());
            });
          }
        }).catch(() => {});
      }
    }
  }, [isOpen, currentUser]);

  // ID do carrinho salvo atualmente em edição (para sobrescrever ao clicar em Salvar)
  const [activeSavedCartId, setActiveSavedCartId] = useState<string | null>(() => {
    return localStorage.getItem('vollen_active_saved_cart_id') || null;
  });

  useEffect(() => {
    if (activeSavedCartId) {
      localStorage.setItem('vollen_active_saved_cart_id', activeSavedCartId);
    } else {
      localStorage.removeItem('vollen_active_saved_cart_id');
    }
  }, [activeSavedCartId]);

  // Busca e Seleção de Peças
  const [partSearch, setPartSearch] = useState('');
  const [isPartSearchFocused, setIsPartSearchFocused] = useState(false);
  const [selectedPartForAdd, setSelectedPartForAdd] = useState<Part | null>(null);
  const [addQty, setAddQty] = useState<string>('1');
  const [addCustomPrice, setAddCustomPrice] = useState<string>('');

  // Fechamento e Pagamento
  const [paymentMethod, setPaymentMethod] = useState<'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'A_PRAZO' | 'PROMISSORIA' | 'MISTO' | 'OUTROS'>('DINHEIRO');
  const [creditInstallments, setCreditInstallments] = useState<number>(1);
  const [autoPrintPromissoryNote, setAutoPrintPromissoryNote] = useState<boolean>(true);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [saleNotes, setSaleNotes] = useState<string>('');

  // Taxas de Cartão & Repasse
  const [cardFeeConfig, setCardFeeConfig] = useState<CardFeeConfig>(() => {
    try {
      const saved = localStorage.getItem('vollen_card_fee_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      debitFee: 1.5,
      creditFees: {
        1: 3.5,
        2: 4.5,
        3: 5.5,
        4: 6.5,
        5: 7.5,
        6: 8.5,
        7: 9.5,
        8: 10.5,
        9: 11.5,
        10: 12.5,
        11: 13.5,
        12: 14.5,
      },
      passFeeToClientDefault: false,
    };
  });
  const [passCardFeeToClient, setPassCardFeeToClient] = useState<boolean>(false);

  // Comissões de Vendedores
  const [sellerCommissionConfig, setSellerCommissionConfig] = useState<SellerCommissionConfig>(() => {
    try {
      const saved = localStorage.getItem('vollen_seller_commission_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      defaultRate: 3.0,
      sellersRates: {},
    };
  });

  // Crediário / Venda a Prazo
  const [debtInstallmentsCount, setDebtInstallmentsCount] = useState<number>(1);
  const [debtFirstDueDate, setDebtFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [clientDebts, setClientDebts] = useState<ClientDebtRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_client_debts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [debtFilterStatus, setDebtFilterStatus] = useState<'ALL' | 'PENDENTE' | 'VENCIDAS' | 'QUITADO'>('PENDENTE');
  const [debtSearch, setDebtSearch] = useState('');
  const [debtStartDate, setDebtStartDate] = useState<string>('');
  const [debtEndDate, setDebtEndDate] = useState<string>('');
  const [debtDateFilterType, setDebtDateFilterType] = useState<'VENCIMENTO' | 'EMISSAO'>('VENCIMENTO');
  const [isDebtDateFilterOpen, setIsDebtDateFilterOpen] = useState<boolean>(false);
  const [debtCurrentPage, setDebtCurrentPage] = useState<number>(1);
  const [debtItemsPerPage, setDebtItemsPerPage] = useState<number>(20);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [isReceiveDebtModalOpen, setIsReceiveDebtModalOpen] = useState(false);
  const [selectedDebtToPay, setSelectedDebtToPay] = useState<ClientDebtRecord | null>(null);
  const [selectedInstallmentToPay, setSelectedInstallmentToPay] = useState<ClientDebtInstallment | null>(null);
  const [receiveDebtAmountInput, setReceiveDebtAmountInput] = useState<string>('');
  const [receiveDebtMethod, setReceiveDebtMethod] = useState<'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'OUTROS'>('DINHEIRO');

  // Múltiplos Pagamentos (Misto)
  const [splitPayments, setSplitPayments] = useState<SalePayment[]>([]);


  // Histórico de Vendas
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_sales_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Carrinhos Salvos em Espera / Orçamentos Rápidos (EM REDE / NUVEM + LOCAL)
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_saved_carts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [isSaveCartModalOpen, setIsSaveCartModalOpen] = useState(false);
  const [isConfirmFinalizeModalOpen, setIsConfirmFinalizeModalOpen] = useState(false);
  const [saveCartLabelInput, setSaveCartLabelInput] = useState('');
  const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY' | 'SAVED_CARTS' | 'CLIENT_DEBTS'>('POS');
  const [historySearch, setHistorySearch] = useState('');
  const [viewingSaleReceipt, setViewingSaleReceipt] = useState<SaleRecord | null>(null);
  const [viewingSaleDetails, setViewingSaleDetails] = useState<SaleRecord | null>(null);
  const [reopenedSaleBackup, setReopenedSaleBackup] = useState<SaleRecord | null>(null);
  const [reopenedDebtBackup, setReopenedDebtBackup] = useState<ClientDebtRecord | null>(null);
  const partSearchInputRef = useRef<HTMLInputElement | null>(null);
  const debtDateFilterContainerRef = useRef<HTMLDivElement | null>(null);

  // Reabertura de Venda para Edição (adicionar/remover itens)
  const handleReopenSaleForEdit = async (saleToReopen: SaleRecord) => {
    try {
      await assertTerminalCanSave('reabrir venda de peças');
    } catch (err: any) {
      await alert({
        title: 'Servidor Desconectado',
        message: err.message || 'O Computador Servidor está offline. Não é possível editar vendas no terminal neste momento.',
        variant: 'danger',
      });
      return;
    }

    if (cart.length > 0) {
      const ok = await confirm({
        title: 'Substituir Carrinho Atual?',
        message: `Já existem itens no carrinho atual da tela de vendas.\n\nDeseja descartar o carrinho atual para reabrir e editar a venda ${saleToReopen.saleCode}?`,
        variant: 'warning',
        confirmText: 'Reabrir e Substituir',
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: `Reabrir Venda ${saleToReopen.saleCode}?`,
        message: `A venda ${saleToReopen.saleCode} será reaberta na tela de vendas para edição.\n\n• O estoque dos itens vendidos será retornado ao estoque.\n• O lançamento financeiro correspondente no caixa será estornado.\n• Você poderá adicionar ou remover itens e concluir novamente para atualizar o estoque e o caixa.`,
        variant: 'info',
        confirmText: 'Reabrir para Edição',
      });
      if (!ok) return;
    }

    // 1. Estorna estoque dos itens da venda
    const updatedPartsList = parts.map((p) => {
      const soldItem = saleToReopen.items.find((item) => item.partId === p.id);
      if (soldItem) {
        const currentStock = p.stockQuantity ?? 0;
        const newStock = currentStock + soldItem.qty;
        try {
          recordStockMovement({
            partId: p.id,
            partName: p.name,
            type: 'ENTRADA',
            quantity: soldItem.qty,
            previousStock: currentStock,
            newStock: newStock,
            unitCost: soldItem.costPrice || 0,
            orderCode: saleToReopen.saleCode,
            reason: `Estorno por Reabertura de Venda (${saleToReopen.saleCode})`,
            responsibleUser: currentUser?.name || currentUser?.username || 'Sistema Balcão',
          });
        } catch (mErr) {
          console.warn('Erro ao gravar estorno de estoque:', mErr);
        }
        return { ...p, stockQuantity: newStock };
      }
      return p;
    });

    if (onUpdatePartsStock) {
      onUpdatePartsStock(updatedPartsList);
    }
    try {
      localStorage.setItem('vollen_parts', JSON.stringify(updatedPartsList));
    } catch {}

    // 2. Estorna lançamento no Caixa
    try {
      const cashSaved = localStorage.getItem('vollen_cash_movements');
      if (cashSaved) {
        const movements = JSON.parse(cashSaved);
        if (Array.isArray(movements)) {
          const filteredMovements = movements.filter(
            (m: any) => m.orderCode !== saleToReopen.saleCode && !m.description?.includes(saleToReopen.saleCode)
          );
          localStorage.setItem('vollen_cash_movements', JSON.stringify(filteredMovements));
          window.dispatchEvent(new Event('vollen_cash_updated'));
        }
      }
    } catch (err) {
      console.warn('Erro ao estornar movimento do caixa:', err);
    }

    // 3. Remove venda temporariamente do histórico
    const updatedHistory = salesHistory.filter((s) => s.id !== saleToReopen.id);
    setSalesHistory(updatedHistory);
    try {
      localStorage.setItem('vollen_sales_history', JSON.stringify(updatedHistory));
      if (db) {
        await deleteDoc(doc(db, 'sales', saleToReopen.id));
      }
    } catch (err) {
      console.warn('Erro ao remover venda temporariamente do histórico:', err);
    }

    // 4. Remove débito/promissória temporariamente do controle de promissórias se houver
    const existingDebt = clientDebts.find((d) => d.saleId === saleToReopen.id || d.saleCode === saleToReopen.saleCode);
    if (existingDebt) {
      setReopenedDebtBackup(existingDebt);
      const updatedDebts = clientDebts.filter((d) => d.id !== existingDebt.id && d.saleCode !== saleToReopen.saleCode);
      setClientDebts(updatedDebts);
      try {
        localStorage.setItem('vollen_client_debts', JSON.stringify(updatedDebts));
        if (db) {
          await deleteDoc(doc(db, 'client_debts', existingDebt.id));
        }
      } catch (err) {
        console.warn('Erro ao remover dívida/promissória temporariamente:', err);
      }
    } else {
      setReopenedDebtBackup(null);
    }

    // 5. Carrega dados no PDV para edição
    setReopenedSaleBackup(saleToReopen);
    setCart([...saleToReopen.items]);
    setSelectedClientId(saleToReopen.clientId || '');
    setSelectedClientName(saleToReopen.clientName || 'Consumidor Final (Balcão)');
    setSelectedClientPhone(saleToReopen.clientPhone || '');
    setSelectedClientDoc(saleToReopen.clientDocument || '');
    setSellerName(saleToReopen.sellerName || currentUser?.name || currentUser?.username || '');
    setPaymentMethod((saleToReopen.paymentMethod as any) || 'DINHEIRO');
    setCreditInstallments(saleToReopen.installments || 1);
    setDiscountInput(saleToReopen.discountAmount ? String(saleToReopen.discountAmount).replace('.', ',') : '0');
    setSaleNotes(saleToReopen.notes || '');
    setViewingSaleDetails(null);
    setActiveTab('POS');
  };

  // Cancelar reabertura e restaurar venda original
  const handleCancelReopenSale = async () => {
    if (!reopenedSaleBackup) {
      resetSalesForm();
      return;
    }

    const ok = await confirm({
      title: 'Cancelar Edição da Venda?',
      message: `Deseja cancelar a edição e restaurar a venda ${reopenedSaleBackup.saleCode} como estava originalmente no histórico?`,
      variant: 'warning',
      confirmText: 'Restaurar Venda Original',
    });
    if (!ok) return;

    // 1. Re-decrementa o estoque dos itens originais
    const updatedPartsList = parts.map((p) => {
      const soldItem = reopenedSaleBackup.items.find((item) => item.partId === p.id);
      if (soldItem) {
        const currentStock = p.stockQuantity ?? 0;
        const newStock = Math.max(0, currentStock - soldItem.qty);
        try {
          recordStockMovement({
            partId: p.id,
            partName: p.name,
            type: 'SAIDA',
            quantity: soldItem.qty,
            previousStock: currentStock,
            newStock: newStock,
            unitCost: soldItem.costPrice || 0,
            orderCode: reopenedSaleBackup.saleCode,
            reason: `Restauração de Venda Cancelada (${reopenedSaleBackup.saleCode})`,
            responsibleUser: currentUser?.name || currentUser?.username || 'Sistema Balcão',
          });
        } catch (mErr) {
          console.warn('Erro ao gravar movimentação de saída:', mErr);
        }
        return { ...p, stockQuantity: newStock };
      }
      return p;
    });

    if (onUpdatePartsStock) onUpdatePartsStock(updatedPartsList);
    try {
      localStorage.setItem('vollen_parts', JSON.stringify(updatedPartsList));
    } catch {}

    // 2. Re-adiciona a venda ao histórico
    const restoredHistory = [reopenedSaleBackup, ...salesHistory.filter((s) => s.id !== reopenedSaleBackup.id)];
    setSalesHistory(restoredHistory);
    try {
      localStorage.setItem('vollen_sales_history', JSON.stringify(restoredHistory));
      if (db) {
        await setDoc(doc(db, 'sales', reopenedSaleBackup.id), reopenedSaleBackup, { merge: true });
      }
    } catch {}

    // 3. Re-adiciona o movimento no caixa
    try {
      const cashSaved = localStorage.getItem('vollen_cash_movements');
      const movements = cashSaved ? JSON.parse(cashSaved) : [];
      let pMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'BOLETO' | 'OUTROS' = 'DINHEIRO';
      const methodUpper = (reopenedSaleBackup.paymentMethod || '').toUpperCase();
      if (methodUpper.includes('PIX')) pMethod = 'PIX';
      else if (methodUpper.includes('DEBITO') || methodUpper.includes('DÉBITO')) pMethod = 'CARTAO_DEBITO';
      else if (methodUpper.includes('CREDITO') || methodUpper.includes('CRÉDITO')) pMethod = 'CARTAO_CREDITO';
      else if (methodUpper.includes('BOLETO')) pMethod = 'BOLETO';
      else if (methodUpper.includes('DINHEIRO')) pMethod = 'DINHEIRO';

      const restoredCashMovement = {
        id: `mov_venda_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'ENTRADA' as const,
        category: 'VENDA' as const,
        description: `Venda Balcão (${reopenedSaleBackup.saleCode}) - ${reopenedSaleBackup.items.map((i) => `${i.qty}x ${i.name}`).join(', ')} [${reopenedSaleBackup.paymentMethod}]`,
        amount: reopenedSaleBackup.totalAmount,
        paymentMethod: pMethod,
        date: reopenedSaleBackup.date,
        time: reopenedSaleBackup.time,
        userName: reopenedSaleBackup.sellerName || 'Sistema Balcão',
        orderCode: reopenedSaleBackup.saleCode,
        clientName: reopenedSaleBackup.clientName || 'Consumidor Final',
        notes: `Restaurada após cancelamento de edição`,
      };
      movements.unshift(restoredCashMovement);
      localStorage.setItem('vollen_cash_movements', JSON.stringify(movements));
      window.dispatchEvent(new Event('vollen_cash_updated'));
    } catch {}

    // 4. Restaura débito/promissória se existia
    if (reopenedDebtBackup) {
      const restoredDebts = [reopenedDebtBackup, ...clientDebts.filter((d) => d.id !== reopenedDebtBackup.id)];
      setClientDebts(restoredDebts);
      try {
        localStorage.setItem('vollen_client_debts', JSON.stringify(restoredDebts));
        if (db) {
          await setDoc(doc(db, 'client_debts', reopenedDebtBackup.id), reopenedDebtBackup, { merge: true });
        }
      } catch {}
    }

    setReopenedSaleBackup(null);
    setReopenedDebtBackup(null);
    resetSalesForm();
    await alert({
      title: 'Edição Cancelada',
      message: `A venda ${reopenedSaleBackup.saleCode} foi restaurada no histórico com sucesso.`,
      variant: 'info',
    });
  };

  // Registro na pilha de modais para a tecla ESC com tratamento de submodais
  useEffect(() => {
    if (isOpen) {
      modalStack.register('SalesModal', () => {
        // 1. Se o modal de confirmação de conclusão da venda estiver aberto, fecha apenas ele
        if (isConfirmFinalizeModalOpen) {
          setIsConfirmFinalizeModalOpen(false);
          return;
        }

        // 2. Se o modal de busca de clientes estiver aberto, fecha apenas ele
        if (isSearchClientModalOpen) {
          setIsSearchClientModalOpen(false);
          return;
        }

        // 3. Se o modal de salvar carrinho estiver aberto, fecha apenas ele
        if (isSaveCartModalOpen) {
          setIsSaveCartModalOpen(false);
          return;
        }

        // 4. Se o modal de comprovante de venda estiver aberto, fecha apenas ele
        if (viewingSaleReceipt) {
          setViewingSaleReceipt(null);
          return;
        }

        // 5. Se o modal de detalhes da venda estiver aberto, fecha apenas ele
        if (viewingSaleDetails) {
          setViewingSaleDetails(null);
          return;
        }

        // 6. Caso nenhum submodal esteja aberto, solicita o fechamento da tela de venda
        handleRequestCloseRef.current?.();
      });
      return () => modalStack.unregister('SalesModal');
    }
  }, [isOpen, isConfirmFinalizeModalOpen, isSearchClientModalOpen, isSaveCartModalOpen, viewingSaleReceipt, viewingSaleDetails]);

  // Fechar popover de filtro de datas ao clicar fora
  useEffect(() => {
    if (!isDebtDateFilterOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        debtDateFilterContainerRef.current &&
        !debtDateFilterContainerRef.current.contains(e.target as Node)
      ) {
        setIsDebtDateFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDebtDateFilterOpen]);

  // Sempre que o modal de vendas for aberto (ou reaberto após fechar), inicia obrigatoriamente na aba Nova Venda (POS)
  useEffect(() => {
    if (isOpen) {
      setActiveTab('POS');
      setViewingSaleDetails(null);
      setViewingSaleReceipt(null);
      setIsSaveCartModalOpen(false);
      setIsSearchClientModalOpen(false);
      setIsConfirmFinalizeModalOpen(false);

      // Recarrega histórico de vendas e carrinhos salvos locais
      try {
        const savedHistory = localStorage.getItem('vollen_sales_history');
        if (savedHistory) {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed)) setSalesHistory(parsed);
          else setSalesHistory([]);
        } else {
          setSalesHistory([]);
        }

        const savedCartsLocal = localStorage.getItem('vollen_saved_carts');
        if (savedCartsLocal) {
          const parsedCarts = JSON.parse(savedCartsLocal);
          if (Array.isArray(parsedCarts)) setSavedCarts(parsedCarts);
          else setSavedCarts([]);
        } else {
          setSavedCarts([]);
        }
      } catch {
        setSalesHistory([]);
        setSavedCarts([]);
      }

      // Carrega os itens do carrinho e cliente gerados externamente (ex: do Orçamento)
      try {
        const localCart = localStorage.getItem('vollen_local_sales_cart');
        if (localCart) {
          setCart(JSON.parse(localCart));
        } else {
          setCart([]);
        }

        const localClient = localStorage.getItem('vollen_local_sales_client');
        if (localClient) {
          const clientData = JSON.parse(localClient);
          if (clientData) {
            if (clientData.id) setSelectedClientId(clientData.id);
            if (clientData.name) setSelectedClientName(clientData.name);
            if (clientData.phone) setSelectedClientPhone(clientData.phone);
            if (clientData.doc) setSelectedClientDoc(clientData.doc);
          }
        }
      } catch (err) {}
    }
  }, [isOpen]);

  // Configurações de Impressão (para formatar comprovante de venda)
  const [printerConfig, setPrinterConfig] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('vollen_printer_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      salesReceiptFormat: 'THERMAL_80MM',
      printSaleWarrantyTerms: true,
      printSaleSignatureLine: true,
      thermalFooterMessage: 'Obrigado pela preferência! Guarde este cupom.',
    };
  });

  // Atualiza configurações de impressão sempre que o modal de comprovante for aberto
  useEffect(() => {
    if (viewingSaleReceipt) {
      try {
        const saved = localStorage.getItem('vollen_printer_config');
        if (saved) setPrinterConfig(JSON.parse(saved));
      } catch {}
    }
  }, [viewingSaleReceipt]);

  // Sincronização em tempo real dos Carrinhos Salvos (saved_carts) com Firestore para Rede
  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(db, 'saved_carts');
      const unsub = onSnapshot(colRef, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedCart));
        list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
        setSavedCarts(list);
        try {
          localStorage.setItem('vollen_saved_carts', JSON.stringify(list));
        } catch {}
      });
      return () => unsub();
    } catch (err) {
      console.warn('Erro ao sincronizar saved_carts da rede:', err);
    }
  }, []);

  // Detecta peça vinda de fora (Ficha da Peça / Central de Peças) e adiciona diretamente ao carrinho de vendas
  useEffect(() => {
    if (selectedPartToAdd) {
      // Verifica se o cliente atualmente selecionado é um técnico cadastrado ou botão atalho 'Técnico / Parceiro'
      const cleanClientName = (selectedClientName || '').trim().toLowerCase();
      const currentClientObj = (clients || []).find(
        (c) => (selectedClientId && c.id === selectedClientId) || (cleanClientName && c.name && c.name.trim().toLowerCase() === cleanClientName)
      );
      const isTechClient = Boolean(currentClientObj?.isTechnician) || selectedClientName.includes('Técnico');

      let priceToUse = selectedPartToAdd.finalPrice;
      if (isTechClient && selectedPartToAdd.techPrice) {
        const techVal = parseFloat(String(selectedPartToAdd.techPrice).replace(/\./g, '').replace(',', '.')) || 0;
        if (techVal > 0) {
          priceToUse = selectedPartToAdd.techPrice;
        }
      }

      const parsedPrice = parseFloat(String(priceToUse).replace(/\./g, '').replace(',', '.')) || 0;
      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.partId === selectedPartToAdd.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const newQty = updated[existingIdx].qty + 1;
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: newQty,
            unitPrice: parsedPrice,
            subtotal: newQty * parsedPrice,
          };
          return updated;
        }
        return [
          ...prev,
          {
            partId: selectedPartToAdd.id,
            code: selectedPartToAdd.code,
            name: selectedPartToAdd.name,
            application: selectedPartToAdd.application,
            unitPrice: parsedPrice,
            qty: 1,
            subtotal: parsedPrice,
            costPrice: parseFloat(String(selectedPartToAdd.costPrice || '0').replace(',', '.')) || 0,
          },
        ];
      });
      setActiveTab('POS');
    }
  }, [selectedPartToAdd, selectedClientId, selectedClientName, clients]);

  // Sincronização de Vendas com Nuvem (Firestore)
  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(db, 'sales');
      const unsub = onSnapshot(colRef, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SaleRecord));
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setSalesHistory(list);
          try {
            localStorage.setItem('vollen_sales_history', JSON.stringify(list));
          } catch {}
        } else {
          setSalesHistory([]);
          try {
            localStorage.removeItem('vollen_sales_history');
          } catch {}
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  // Recarrega dados locais quando o modal abre ou quando há reset de fábrica/storage event
  const reloadLocalSalesData = () => {
    try {
      const savedDebts = localStorage.getItem('vollen_client_debts');
      setClientDebts(savedDebts ? JSON.parse(savedDebts) : []);
    } catch {
      setClientDebts([]);
    }
    try {
      const savedSales = localStorage.getItem('vollen_sales_history');
      setSalesHistory(savedSales ? JSON.parse(savedSales) : []);
    } catch {
      setSalesHistory([]);
    }
    try {
      const savedC = localStorage.getItem('vollen_saved_carts');
      setSavedCarts(savedC ? JSON.parse(savedC) : []);
    } catch {
      setSavedCarts([]);
    }
  };

  useEffect(() => {
    const handleStorage = () => reloadLocalSalesData();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (isOpen) {
      reloadLocalSalesData();
    }
  }, [isOpen]);

  // Sincronização de Crediário / Contas de Clientes com Nuvem (Firestore)
  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(db, 'client_debts');
      const unsub = onSnapshot(colRef, (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ClientDebtRecord));
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          setClientDebts(list);
          try {
            localStorage.setItem('vollen_client_debts', JSON.stringify(list));
          } catch {}
        } else {
          setClientDebts([]);
          try {
            localStorage.removeItem('vollen_client_debts');
          } catch {}
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  // ESC é controlado exclusivamente pelo modalStack (veja o registro acima)
  // para evitar conflito com o ClientsModal e outros modais empilhados.

  // Filtragem de Peças para adicionar ao carrinho
  const filteredParts = useMemo(() => {
    const term = partSearch.trim().toLowerCase();
    if (!term || !Array.isArray(parts)) return [];
    return parts.filter(
      (p) =>
        p &&
        ((p.name && p.name.toLowerCase().includes(term)) ||
          (p.code && p.code.toLowerCase().includes(term)) ||
          (p.barcode && p.barcode.toLowerCase().includes(term)) ||
          (p.manufacturerCode && p.manufacturerCode.toLowerCase().includes(term)) ||
          (p.application && p.application.toLowerCase().includes(term)))
    ).slice(0, 15);
  }, [parts, partSearch]);

  // Filtragem de Clientes para o Modal de Busca
  const filteredClients = useMemo(() => {
    const term = clientSearchFilter.trim().toLowerCase();
    const safeClients = Array.isArray(clients) ? clients : [];
    if (!term) return safeClients;
    return safeClients.filter(
      (c) =>
        c &&
        ((c.name && c.name.toLowerCase().includes(term)) ||
          (c.phone && c.phone.includes(term)) ||
          (c.whatsapp && c.whatsapp.includes(term)) ||
          (c.cpf && c.cpf.includes(term)) ||
          (c.cnpj && c.cnpj.includes(term)) ||
          (c.city && c.city.toLowerCase().includes(term)))
    );
  }, [clients, clientSearchFilter]);

  // Totais do Carrinho e Cálculos Financeiros
  const cartSubtotal = (Array.isArray(cart) ? cart : []).reduce((acc, item) => {
    const sub = typeof item.subtotal === 'number' ? item.subtotal : (parseFloat(String(item?.subtotal || '0')) || 0);
    return acc + sub;
  }, 0);
  const discountVal = Math.max(0, parseFloat((discountInput || '0').replace(',', '.')) || 0);
  const baseAfterDiscount = Math.max(0, cartSubtotal - discountVal);

  // Taxa de Cartão Ativa
  const activeCardFeeRate = useMemo(() => {
    if (paymentMethod === 'CARTAO_DEBITO') {
      return cardFeeConfig.debitFee || 0;
    }
    if (paymentMethod === 'CARTAO_CREDITO') {
      return cardFeeConfig.creditFees[creditInstallments] || 0;
    }
    return 0;
  }, [paymentMethod, creditInstallments, cardFeeConfig]);

  const cardFeeAmount = passCardFeeToClient && activeCardFeeRate > 0
    ? (baseAfterDiscount * (activeCardFeeRate / 100))
    : 0;

  const cartTotal = baseAfterDiscount + cardFeeAmount;

  // Valor Líquido Real que a loja recebe no cartão
  const storeNetTotal = activeCardFeeRate > 0 && !passCardFeeToClient
    ? cartTotal * (1 - (activeCardFeeRate / 100))
    : cartTotal;

  // Total de Pagamentos Divididos (Misto)
  const splitTotal = useMemo(() => {
    return (splitPayments || []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [splitPayments]);

  const remainingToPay = Math.max(0, cartTotal - splitTotal);
  const changeAmount = Math.max(0, splitTotal - cartTotal);

  // Helper para obter % de comissão do vendedor
  const getSellerCommissionRate = (sName: string): number => {
    if (!sName) return sellerCommissionConfig.defaultRate || 0;
    if (sellerCommissionConfig.sellersRates[sName] !== undefined) {
      return sellerCommissionConfig.sellersRates[sName];
    }
    return sellerCommissionConfig.defaultRate || 0;
  };

  // Recalcula o valor unitário da peça selecionada em tempo real quando o destinatário/cliente for alterado
  useEffect(() => {
    if (selectedPartForAdd) {
      const cleanClientName = (selectedClientName || '').trim().toLowerCase();
      const currentClientObj = (clients || []).find(
        (c) => (selectedClientId && c.id === selectedClientId) || (cleanClientName && c.name && c.name.trim().toLowerCase() === cleanClientName)
      );
      const isTechClient = Boolean(currentClientObj?.isTechnician) || selectedClientName.includes('Técnico');

      let priceToUse = selectedPartForAdd.finalPrice;
      if (isTechClient && selectedPartForAdd.techPrice) {
        const techVal = parseFloat(String(selectedPartForAdd.techPrice).replace(/\./g, '').replace(',', '.')) || 0;
        if (techVal > 0) {
          priceToUse = selectedPartForAdd.techPrice;
        }
      }

      const parsedPrice = parseFloat(String(priceToUse).replace(/\./g, '').replace(',', '.')) || 0;
      setAddCustomPrice(parsedPrice.toFixed(2).replace('.', ','));
    }
  }, [selectedPartForAdd, selectedClientId, selectedClientName, clients]);

  if (!isOpen) return null;

  const getEffectivePartPrice = (part: Part): number => {
    const cleanClientName = (selectedClientName || '').trim().toLowerCase();
    const currentClientObj = (clients || []).find(
      (c) => (selectedClientId && c.id === selectedClientId) || (cleanClientName && c.name && c.name.trim().toLowerCase() === cleanClientName)
    );
    const isTechClient = Boolean(currentClientObj?.isTechnician) || selectedClientName.includes('Técnico');

    let priceToUse = part.finalPrice;
    if (isTechClient && part.techPrice) {
      const techVal = parseFloat(String(part.techPrice).replace(/\./g, '').replace(',', '.')) || 0;
      if (techVal > 0) {
        priceToUse = part.techPrice;
      }
    }
    return parseFloat(String(priceToUse).replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleSelectPart = (part: Part) => {
    setSelectedPartForAdd(part);

    const parsedPrice = getEffectivePartPrice(part);
    setAddCustomPrice(parsedPrice.toFixed(2).replace('.', ','));
    setAddQty('1');
    setPartSearch(part.name);
    setIsPartSearchFocused(false);
  };

  // Leitura rápida por Leitor de Código de Barras (ou digitação rápida com Enter)
  const handleBarcodeOrEnterScan = (inputVal: string) => {
    const term = inputVal.trim();
    if (!term || !Array.isArray(parts) || parts.length === 0) return;

    const lower = term.toLowerCase();
    const digitsOnly = term.replace(/\D/g, '');
    const strippedDigits = digitsOnly.replace(/^0+/, '');

    // 1. Procura por correspondência exata de Código de Barras, Código Interno ou Fabricante
    let exactMatch = parts.find((p) => {
      const pBarcode = String(p.barcode || '').trim().toLowerCase();
      const pCode = String(p.code || '').trim().toLowerCase();
      const pManuf = String(p.manufacturerCode || '').trim().toLowerCase();
      const pId = String(p.id || '').trim().toLowerCase();

      if (pBarcode === lower || pCode === lower || pManuf === lower || pId === lower) return true;

      if (strippedDigits) {
        const pBarcodeDigits = pBarcode.replace(/\D/g, '').replace(/^0+/, '');
        const pCodeDigits = pCode.replace(/\D/g, '').replace(/^0+/, '');
        if (pBarcodeDigits === strippedDigits || pCodeDigits === strippedDigits) return true;
      }
      return false;
    });

    // Se não encontrou por código/barcode direto, mas há apenas 1 resultado na lista filtrada, seleciona esse
    if (!exactMatch && filteredParts.length === 1) {
      exactMatch = filteredParts[0];
    }

    if (exactMatch) {
      const unitPrice = getEffectivePartPrice(exactMatch);
      const targetPart = exactMatch;

      setCart((prev) => {
        const existingIdx = prev.findIndex((item) => item.partId === targetPart.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          const newQty = updated[existingIdx].qty + 1;
          updated[existingIdx] = {
            ...updated[existingIdx],
            qty: newQty,
            unitPrice,
            subtotal: newQty * unitPrice,
          };
          return updated;
        }
        return [
          ...prev,
          {
            partId: targetPart.id,
            code: targetPart.code,
            name: targetPart.name,
            application: targetPart.application,
            unitPrice,
            qty: 1,
            subtotal: unitPrice,
            costPrice: parseFloat(String(targetPart.costPrice || '0').replace(',', '.')) || 0,
          },
        ];
      });

      // Limpa a busca e mantém foco no input para bipagens sucessivas
      setPartSearch('');
      setSelectedPartForAdd(null);
      setIsPartSearchFocused(false);
      setTimeout(() => {
        partSearchInputRef.current?.focus();
      }, 50);
    }
  };



  const handleAddToCart = async () => {
    if (!selectedPartForAdd) {
      await alert({ title: 'Atenção', message: 'Selecione uma peça válida do catálogo.', variant: 'warning' });
      return;
    }

    const qty = parseInt(addQty, 10);
    if (isNaN(qty) || qty <= 0) {
      await alert({ title: 'Atenção', message: 'Informe uma quantidade válida (mínimo 1).', variant: 'warning' });
      return;
    }

    const price = parseFloat(addCustomPrice.replace(/\./g, '').replace(',', '.'));
    if (isNaN(price) || price < 0) {
      await alert({ title: 'Atenção', message: 'Informe um valor unitário válido.', variant: 'warning' });
      return;
    }

    const currentStock = selectedPartForAdd.stockQuantity ?? 0;
    if (currentStock < qty) {
      const ok = await confirm({
        title: 'Estoque Baixo',
        message: `Esta peça possui apenas ${currentStock} unidade(s) em estoque. Deseja adicionar ${qty} à venda mesmo assim?`,
        confirmText: 'Sim, Adicionar',
        cancelText: 'Cancelar',
        variant: 'warning',
      });
      if (!ok) return;
    }

    doAddItem(qty, price);
  };

  const doAddItem = (qty: number, unitPrice: number) => {
    if (!selectedPartForAdd) return;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.partId === selectedPartForAdd.id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].qty + qty;
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: newQty,
          unitPrice,
          subtotal: newQty * unitPrice,
        };
        return updated;
      }
      return [
        ...prev,
        {
          partId: selectedPartForAdd.id,
          code: selectedPartForAdd.code,
          name: selectedPartForAdd.name,
          application: selectedPartForAdd.application,
          unitPrice,
          qty,
          subtotal: qty * unitPrice,
          costPrice: parseFloat(String(selectedPartForAdd.costPrice || '0').replace(',', '.')) || 0,
        },
      ];
    });

    setSelectedPartForAdd(null);
    setPartSearch('');
    setAddQty('1');
    setAddCustomPrice('');
  };

  const handleRemoveFromCart = (partId: string) => {
    setCart((prev) => prev.filter((item) => item.partId !== partId));
  };

  const handleUpdateCartQty = (partId: string, newQtyStr: string) => {
    const qty = parseInt(newQtyStr, 10);
    if (isNaN(qty) || qty <= 0) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.partId === partId) {
          return {
            ...item,
            qty,
            subtotal: qty * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  // Validação e Abertura do Modal de Confirmação
  const handleInitiateFinalizeSale = async () => {
    if (cart.length === 0) {
      await alert({ title: 'Carrinho Vazio', message: 'Adicione pelo menos uma peça para concluir a venda.', variant: 'warning' });
      return;
    }

    // Se a venda for A Prazo ou Promissória, exige cliente cadastrado com telefone/documento
    if (paymentMethod === 'A_PRAZO' || paymentMethod === 'PROMISSORIA') {
      if (!selectedClientId || selectedClientName.includes('Consumidor Final')) {
        await alert({
          title: `Cliente Obrigatório para ${paymentMethod === 'PROMISSORIA' ? 'Nota Promissória' : 'Venda a Prazo'}`,
          message: `Para emitir uma venda em ${paymentMethod === 'PROMISSORIA' ? 'Nota Promissória' : 'Crediário a Prazo'}, selecione um cliente cadastrado para vincular os dados e parcelas.`,
          variant: 'warning',
        });
        setIsSearchClientModalOpen(true);
        return;
      }
    }

    // Se for pagamento Misto, valida se o valor total foi atingido
    if (paymentMethod === 'MISTO') {
      if (splitPayments.length === 0) {
        await alert({
          title: 'Pagamentos Não Definidos',
          message: 'Adicione pelo menos uma forma de pagamento na lista de pagamentos múltiplos.',
          variant: 'warning',
        });
        return;
      }

      if (splitTotal < cartTotal - 0.01) {
        await alert({
          title: 'Valor Incompleto',
          message: `O total dos pagamentos adicionados (R$ ${splitTotal.toFixed(2).replace('.', ',')}) é menor que o total da venda (R$ ${cartTotal.toFixed(2).replace('.', ',')}).\n\nFalta adicionar R$ ${remainingToPay.toFixed(2).replace('.', ',')}.`,
          variant: 'warning',
        });
        return;
      }

      // Se houver parcela a prazo ou promissória no pagamento misto, exige cliente cadastrado
      const hasDebtPayment = splitPayments.some((p) => p.method === 'A_PRAZO' || p.method === 'PROMISSORIA');
      if (hasDebtPayment && (!selectedClientId || selectedClientName.includes('Consumidor Final'))) {
        await alert({
          title: 'Cliente Obrigatório para Venda a Prazo / Promissória',
          message: 'Foi adicionado um pagamento a prazo/promissória no fechamento misto. Selecione um cliente cadastrado para vincular a conta.',
          variant: 'warning',
        });
        setIsSearchClientModalOpen(true);
        return;
      }
    }

    try {
      await assertTerminalCanSave('concluir venda de peças');
    } catch (err: any) {
      await alert({
        title: 'Servidor Desconectado',
        message: err.message || 'O Computador Servidor está offline. Não é possível concluir vendas no terminal neste momento.',
        variant: 'danger',
      });
      return;
    }

    setIsConfirmFinalizeModalOpen(true);
  };

  // Execução Real da Venda (Baixa Estoque + Lança Caixa + Grava Venda + Crediário/Promissória)
  const executeFinalizeSale = async (printAfter: boolean) => {
    setIsConfirmFinalizeModalOpen(false);

    const nextSaleNum = salesHistory.length + 1;
    const saleCode = reopenedSaleBackup ? reopenedSaleBackup.saleCode : `VD-${String(nextSaleNum).padStart(4, '0')}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('pt-BR');

    const activeSellerName = sellerName || currentUser?.name || currentUser?.username || 'Atendente Balcão';
    const commRate = getSellerCommissionRate(activeSellerName);
    const commAmount = (baseAfterDiscount) * (commRate / 100);

    let paymentMethodDisplay: string = paymentMethod;
    if (paymentMethod === 'CARTAO_CREDITO') {
      paymentMethodDisplay = `CARTÃO DE CRÉDITO (${creditInstallments}x de R$ ${(cartTotal / creditInstallments).toFixed(2).replace('.', ',')})`;
    } else if (paymentMethod === 'A_PRAZO') {
      paymentMethodDisplay = `A PRAZO / CREDIÁRIO (${debtInstallmentsCount}x de R$ ${(cartTotal / debtInstallmentsCount).toFixed(2).replace('.', ',')})`;
    } else if (paymentMethod === 'PROMISSORIA') {
      paymentMethodDisplay = `PROMISSÓRIA (${debtInstallmentsCount}x de R$ ${(cartTotal / debtInstallmentsCount).toFixed(2).replace('.', ',')})`;
    } else if (paymentMethod === 'MISTO') {
      paymentMethodDisplay = `PAGAMENTO MISTO (${splitPayments.map((p) => `${p.method}: R$ ${p.amount.toFixed(2).replace('.', ',')}`).join(' + ')})`;
    }

    const newSaleId = reopenedSaleBackup ? reopenedSaleBackup.id : `sale_${Date.now()}`;
    let debtRecordId: string | undefined = undefined;
    let createdDebtRecord: ClientDebtRecord | null = null;

    // 1. Atualiza e decrementa o estoque das peças vendidas e registra movimentações de auditoria
    const updatedPartsList = parts.map((p) => {
      const soldItem = cart.find((item) => item.partId === p.id);
      if (soldItem) {
        const currentStock = p.stockQuantity ?? 0;
        const newStock = Math.max(0, currentStock - soldItem.qty);
        try {
          recordStockMovement({
            partId: p.id,
            partName: p.name,
            type: 'SAIDA',
            quantity: soldItem.qty,
            previousStock: currentStock,
            newStock: newStock,
            unitCost: soldItem.costPrice || 0,
            orderCode: saleCode,
            reason: `Venda Balcão (${saleCode})`,
            responsibleUser: activeSellerName,
          });
        } catch (mErr) {
          console.warn('Erro ao gravar movimentação de estoque da venda:', mErr);
        }
        return { ...p, stockQuantity: newStock };
      }
      return p;
    });

    if (onUpdatePartsStock) {
      onUpdatePartsStock(updatedPartsList);
    }
    try {
      localStorage.setItem('vollen_parts', JSON.stringify(updatedPartsList));
    } catch {}

    // 2. Registro de Crediário / Nota Promissória se aplicável
    if (paymentMethod === 'A_PRAZO' || paymentMethod === 'PROMISSORIA') {
      debtRecordId = `debt_${Date.now()}`;
      const instCount = Math.max(1, debtInstallmentsCount || 1);
      const valPerInst = cartTotal / instCount;
      const installments: ClientDebtInstallment[] = [];

      for (let i = 1; i <= instCount; i++) {
        const instDate = new Date(debtFirstDueDate || dateStr);
        instDate.setMonth(instDate.getMonth() + (i - 1));
        const dueDateFormatted = instDate.toISOString().split('T')[0];

        installments.push({
          id: `inst_${debtRecordId}_${i}`,
          number: i,
          dueDate: dueDateFormatted,
          amount: i === instCount ? (cartTotal - (valPerInst * (instCount - 1))) : valPerInst,
          paidAmount: 0,
          status: 'PENDENTE',
        });
      }

      const newDebtRecord: ClientDebtRecord = {
        id: debtRecordId,
        saleId: newSaleId,
        saleCode,
        clientId: selectedClientId || 'client_unknown',
        clientName: selectedClientName,
        clientPhone: selectedClientPhone,
        clientDocument: selectedClientDoc,
        date: dateStr,
        totalAmount: cartTotal,
        paidAmount: 0,
        remainingAmount: cartTotal,
        status: 'PENDENTE',
        installments,
        notes: saleNotes || (paymentMethod === 'PROMISSORIA' ? 'Venda emitida via Nota Promissória' : 'Venda emitida a Prazo / Crediário'),
        createdAt: now.toISOString(),
      };
      createdDebtRecord = newDebtRecord;

      setClientDebts((prev) => [newDebtRecord, ...prev]);
      try {
        const savedDebts = localStorage.getItem('vollen_client_debts');
        const list = savedDebts ? JSON.parse(savedDebts) : [];
        const updated = [newDebtRecord, ...list.filter((d: any) => d.id !== debtRecordId)];
        localStorage.setItem('vollen_client_debts', JSON.stringify(updated));

        if (db) {
          setDoc(doc(db, 'client_debts', debtRecordId), newDebtRecord, { merge: true }).catch(() => {});
        }
      } catch (e) {
        console.warn('Erro ao salvar crediário / promissória:', e);
      }
    }

    // 3. Lança movimentações no Caixa
    try {
      const cashSaved = localStorage.getItem('vollen_cash_movements');
      const movements = cashSaved ? JSON.parse(cashSaved) : [];
      const itemsDetailsFormatted = cart
        .map((i) => `${i.qty}x ${i.name} (R$ ${i.unitPrice.toFixed(2).replace('.', ',')} un = R$ ${i.subtotal.toFixed(2).replace('.', ',')})`)
        .join(' | ');

      const movementsToAdd: any[] = [];

      if (paymentMethod === 'MISTO') {
        // Para pagamento misto, cria uma entrada de caixa para cada pagamento em dinheiro/pix/cartao
        splitPayments.forEach((sp, idx) => {
          if (sp.method === 'A_PRAZO' || sp.method === 'PROMISSORIA') {
            // Se tiver parte a prazo / promissória no misto, gera registro de dívida
            const debtMistoId = `debt_${Date.now()}_${idx}`;
            const instDate = new Date(debtFirstDueDate || dateStr);
            const newDebtRecord: ClientDebtRecord = {
              id: debtMistoId,
              saleId: newSaleId,
              saleCode,
              clientId: selectedClientId || 'client_unknown',
              clientName: selectedClientName,
              clientPhone: selectedClientPhone,
              clientDocument: selectedClientDoc,
              date: dateStr,
              totalAmount: sp.amount,
              paidAmount: 0,
              remainingAmount: sp.amount,
              status: 'PENDENTE',
              installments: [
                {
                  id: `inst_${debtMistoId}_1`,
                  number: 1,
                  dueDate: instDate.toISOString().split('T')[0],
                  amount: sp.amount,
                  paidAmount: 0,
                  status: 'PENDENTE',
                },
              ],
              notes: sp.method === 'PROMISSORIA' ? `Parte em promissória da venda mista #${saleCode}` : `Parte a prazo da venda mista #${saleCode}`,
              createdAt: now.toISOString(),
            };

            setClientDebts((prev) => [newDebtRecord, ...prev]);
            try {
              const savedDebts = localStorage.getItem('vollen_client_debts');
              const list = savedDebts ? JSON.parse(savedDebts) : [];
              const updated = [newDebtRecord, ...list];
              localStorage.setItem('vollen_client_debts', JSON.stringify(updated));
              if (db) setDoc(doc(db, 'client_debts', debtMistoId), newDebtRecord, { merge: true }).catch(() => {});
            } catch {}
            return;
          }

          let pMethod: any = 'DINHEIRO';
          if (sp.method === 'PIX') pMethod = 'PIX';
          else if (sp.method === 'CARTAO_DEBITO') pMethod = 'CARTAO_DEBITO';
          else if (sp.method === 'CARTAO_CREDITO') pMethod = 'CARTAO_CREDITO';
          else if (sp.method === 'BOLETO') pMethod = 'BOLETO';

          movementsToAdd.push({
            id: `mov_venda_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            type: 'ENTRADA' as const,
            category: 'VENDA' as const,
            description: `Venda Balcão (${saleCode}) - Pagamento Parcial [${sp.method}] - ${cart.map((i) => `${i.qty}x ${i.name}`).join(', ')}`,
            amount: sp.amount,
            paymentMethod: pMethod,
            date: dateStr,
            time: timeStr,
            userName: activeSellerName,
            orderCode: saleCode,
            clientName: selectedClientName || 'Consumidor Final',
            notes: `Itens Detalhados: ${itemsDetailsFormatted}`,
          });
        });
      } else if (paymentMethod !== 'A_PRAZO' && paymentMethod !== 'PROMISSORIA') {
        let pMethod: any = 'DINHEIRO';
        const methodUpper = (paymentMethod || '').toUpperCase();
        if (methodUpper.includes('PIX')) pMethod = 'PIX';
        else if (methodUpper.includes('DEBITO') || methodUpper.includes('DÉBITO')) pMethod = 'CARTAO_DEBITO';
        else if (methodUpper.includes('CREDITO') || methodUpper.includes('CRÉDITO')) pMethod = 'CARTAO_CREDITO';
        else if (methodUpper.includes('BOLETO')) pMethod = 'BOLETO';
        else if (methodUpper.includes('DINHEIRO')) pMethod = 'DINHEIRO';

        movementsToAdd.push({
          id: `mov_venda_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'ENTRADA' as const,
          category: 'VENDA' as const,
          description: `Venda Balcão (${saleCode}) - ${cart.map((i) => `${i.qty}x ${i.name} (R$ ${i.subtotal.toFixed(2).replace('.', ',')})`).join(', ')} [${paymentMethodDisplay}]`,
          amount: cartTotal,
          paymentMethod: pMethod,
          date: dateStr,
          time: timeStr,
          userName: activeSellerName,
          orderCode: saleCode,
          clientName: selectedClientName || 'Consumidor Final',
          notes: `Itens Detalhados: ${itemsDetailsFormatted}`,
        });
      }

      if (movementsToAdd.length > 0) {
        movementsToAdd.forEach((m) => movements.unshift(m));
        localStorage.setItem('vollen_cash_movements', JSON.stringify(movements));
        window.dispatchEvent(new Event('vollen_cash_updated'));

        if (db) {
          movementsToAdd.forEach((m) => {
            setDoc(doc(db, 'cash_movements', m.id), m, { merge: true }).catch(() => {});
          });
        }
      }
    } catch (err) {
      console.warn('Erro ao lançar venda no caixa:', err);
    }

    // 4. Cria e Salva Registro da Venda Completo
    const newSale: SaleRecord = {
      id: newSaleId,
      saleCode,
      date: dateStr,
      time: timeStr,
      createdAt: reopenedSaleBackup ? reopenedSaleBackup.createdAt : now.toISOString(),
      clientId: selectedClientId || undefined,
      clientName: selectedClientName || 'Consumidor Final (Balcão)',
      clientPhone: selectedClientPhone || '',
      clientDocument: selectedClientDoc || '',
      sellerName: activeSellerName,
      items: [...cart],
      subtotal: cartSubtotal,
      discountAmount: discountVal,
      cardFeeAmount: cardFeeAmount > 0 ? cardFeeAmount : undefined,
      totalAmount: cartTotal,
      paymentMethod,
      installments: paymentMethod === 'CARTAO_CREDITO' ? creditInstallments : (paymentMethod === 'A_PRAZO' || paymentMethod === 'PROMISSORIA') ? debtInstallmentsCount : undefined,
      payments: paymentMethod === 'MISTO' ? [...splitPayments] : undefined,
      commissionRate: commRate,
      commissionAmount: commAmount,
      isDebt: paymentMethod === 'A_PRAZO' || paymentMethod === 'PROMISSORIA' || splitPayments.some((p) => p.method === 'A_PRAZO' || p.method === 'PROMISSORIA'),
      debtId: debtRecordId,
      notes: saleNotes,
    };

    const updatedHistory = [newSale, ...salesHistory];
    setSalesHistory(updatedHistory);
    try {
      localStorage.setItem('vollen_sales_history', JSON.stringify(updatedHistory));

      // Sincroniza vendas e peças na Rede Local
      import('../services/localNetworkService').then(({ emitLocalDataChange }) => {
        emitLocalDataChange('salesHistory', updatedHistory);
        emitLocalDataChange('parts', updatedPartsList);
      }).catch(() => {});

      if (db) {
        await setDoc(doc(db, 'sales', newSale.id), newSale, { merge: true });
      }
    } catch (err) {
      console.warn('Erro ao sincronizar venda na nuvem:', err);
    }

    // Remove carrinho em espera se ativo
    if (activeSavedCartId) {
      try {
        setSavedCarts((prev) => prev.filter((sc) => sc.id !== activeSavedCartId));
        if (db) {
          await deleteDoc(doc(db, 'saved_carts', activeSavedCartId));
        }
      } catch {}
      setActiveSavedCartId(null);
    }

    // Atualiza Orçamento de origem se aplicável
    try {
      const originEstimateId = localStorage.getItem('vollen_origin_estimate_id');
      if (originEstimateId) {
        const estimatesSaved = localStorage.getItem('vollen_estimates');
        if (estimatesSaved) {
          const estimatesArr = JSON.parse(estimatesSaved);
          if (Array.isArray(estimatesArr)) {
            const nowFormatted = new Date().toLocaleString('pt-BR');
            const updatedEstimates = estimatesArr.map((est: any) => {
              if (est.id === originEstimateId) {
                const newAuditEntry = {
                  date: nowFormatted,
                  user: activeSellerName,
                  changes: [`Orçamento APROVADO automaticamente após conclusão da Venda Balcão #${saleCode}`],
                };
                return { ...est, status: 'APROVADO', auditHistory: [newAuditEntry, ...(est.auditHistory || [])] };
              }
              return est;
            });
            localStorage.setItem('vollen_estimates', JSON.stringify(updatedEstimates));
            if (db) setDoc(doc(db, 'estimates', originEstimateId), { status: 'APROVADO' }, { merge: true }).catch(() => {});
          }
        }
        localStorage.removeItem('vollen_origin_estimate_id');
      }
    } catch {}

    if (onSaleCompleted) {
      onSaleCompleted();
    }

    // Se for venda em Nota Promissória e estiver configurado para imprimir automaticamente
    if (paymentMethod === 'PROMISSORIA' && autoPrintPromissoryNote && createdDebtRecord) {
      handlePrintPromissoryNote(createdDebtRecord);
    }

    // 5. Limpa formulário
    setCart([]);
    setSplitPayments([]);
    setReopenedSaleBackup(null);
    setReopenedDebtBackup(null);
    try {
      localStorage.removeItem('vollen_local_sales_cart');
      localStorage.removeItem('vollen_origin_estimate_id');
      localStorage.removeItem('vollen_local_sales_client');
    } catch {}
    setSelectedClientId('');
    setSelectedClientName('Consumidor Final (Balcão)');
    setSelectedClientPhone('');
    setSelectedClientDoc('');
    setDiscountInput('0');
    setSaleNotes('');
    setPassCardFeeToClient(false);

    // 6. Impressão do Recibo ou Conclusão
    if (printAfter) {
      setViewingSaleReceipt(newSale);
    } else if (paymentMethod !== 'PROMISSORIA' || !autoPrintPromissoryNote) {
      setViewingSaleReceipt(null);
      await alert({
        title: 'Venda Concluída',
        message: `Venda ${newSale.saleCode} concluída com sucesso!`,
        variant: 'info',
      });
    }
  };

  // ─── RECEBIMENTO DE PARCELA / QUITAÇÃO DE CREDIÁRIO ───
  const handleReceiveDebtPayment = async () => {
    if (!selectedDebtToPay) return;
    const paymentVal = parseFloat(receiveDebtAmountInput.replace(/\./g, '').replace(',', '.'));
    if (isNaN(paymentVal) || paymentVal <= 0) {
      await alert({ title: 'Valor Inválido', message: 'Informe um valor de pagamento válido maior que zero.', variant: 'warning' });
      return;
    }

    if (paymentVal > selectedDebtToPay.remainingAmount + 0.05) {
      await alert({
        title: 'Valor Superior',
        message: `O valor informado (R$ ${paymentVal.toFixed(2).replace('.', ',')}) é superior ao saldo devedor restante (R$ ${selectedDebtToPay.remainingAmount.toFixed(2).replace('.', ',')}).`,
        variant: 'warning',
      });
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('pt-BR');
    const respUser = sellerName || currentUser?.name || currentUser?.username || 'Sistema Balcão';

    let leftToApply = paymentVal;
    const updatedInstallments = selectedDebtToPay.installments.map((inst) => {
      if (leftToApply <= 0 || inst.status === 'PAGO') return inst;

      const instRemaining = inst.amount - (inst.paidAmount || 0);
      const applyToThis = Math.min(leftToApply, instRemaining);
      const newPaid = (inst.paidAmount || 0) + applyToThis;
      leftToApply -= applyToThis;

      const isFullyPaid = newPaid >= inst.amount - 0.01;
      return {
        ...inst,
        paidAmount: newPaid,
        status: isFullyPaid ? ('PAGO' as const) : ('PENDENTE' as const),
        paidAt: isFullyPaid ? now.toISOString() : inst.paidAt,
        paymentMethod: receiveDebtMethod,
      };
    });

    const newTotalPaid = (selectedDebtToPay.paidAmount || 0) + paymentVal;
    const newRemaining = Math.max(0, selectedDebtToPay.totalAmount - newTotalPaid);
    const newStatus = newRemaining <= 0.01 ? ('QUITADO' as const) : ('PARCIAL' as const);

    const updatedDebt: ClientDebtRecord = {
      ...selectedDebtToPay,
      paidAmount: newTotalPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      installments: updatedInstallments,
    };

    // 1. Atualiza lista de dívidas local e Firestore
    const updatedDebtsList = clientDebts.map((d) => (d.id === updatedDebt.id ? updatedDebt : d));
    setClientDebts(updatedDebtsList);
    try {
      localStorage.setItem('vollen_client_debts', JSON.stringify(updatedDebtsList));
      if (db) {
        await setDoc(doc(db, 'client_debts', updatedDebt.id), updatedDebt, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao atualizar débito:', e);
    }

    // 2. Lança entrada no Caixa
    try {
      const cashSaved = localStorage.getItem('vollen_cash_movements');
      const movements = cashSaved ? JSON.parse(cashSaved) : [];

      let pMethod: any = 'DINHEIRO';
      if (receiveDebtMethod === 'PIX') pMethod = 'PIX';
      else if (receiveDebtMethod === 'CARTAO_DEBITO') pMethod = 'CARTAO_DEBITO';
      else if (receiveDebtMethod === 'CARTAO_CREDITO') pMethod = 'CARTAO_CREDITO';
      else pMethod = 'OUTROS';

      const newCashMov = {
        id: `mov_crediario_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: 'ENTRADA' as const,
        category: 'VENDA' as const,
        description: `Recebimento Crediário #${selectedDebtToPay.saleCode} (${selectedDebtToPay.clientName}) [${receiveDebtMethod}]`,
        amount: paymentVal,
        paymentMethod: pMethod,
        date: dateStr,
        time: timeStr,
        userName: respUser,
        orderCode: selectedDebtToPay.saleCode,
        clientName: selectedDebtToPay.clientName,
        notes: `Quitação ${newStatus === 'QUITADO' ? 'Total' : 'Parcial'} de Crediário. Saldo restante: R$ ${newRemaining.toFixed(2).replace('.', ',')}`,
      };

      movements.unshift(newCashMov);
      localStorage.setItem('vollen_cash_movements', JSON.stringify(movements));
      window.dispatchEvent(new Event('vollen_cash_updated'));

      if (db) {
        setDoc(doc(db, 'cash_movements', newCashMov.id), newCashMov, { merge: true }).catch(() => {});
      }
    } catch (cErr) {
      console.warn('Erro ao lançar recebimento no caixa:', cErr);
    }

    setIsReceiveDebtModalOpen(false);
    setSelectedDebtToPay(null);
    setSelectedInstallmentToPay(null);
    setReceiveDebtAmountInput('');

    await alert({
      title: 'Recebimento Registrado!',
      message: `Recebimento de R$ ${paymentVal.toFixed(2).replace('.', ',')} lançado no caixa com sucesso!\n\nStatus da conta: ${newStatus === 'QUITADO' ? 'QUITADA TOTALMENTE' : `Saldo Restante: R$ ${newRemaining.toFixed(2).replace('.', ',')}`}`,
      variant: 'info',
    });
  };

  // ─── ENVIO DE EXTRATO / COBRANÇA AMIGÁVEL VIA WHATSAPP ───
  const handleSendDebtWhatsApp = (debt: ClientDebtRecord) => {
    const rawClean = (debt.clientPhone || '').replace(/\D/g, '');
    if (!rawClean) {
      alert({
        title: 'Cliente sem Telefone / WhatsApp',
        message: 'Este cliente não possui número de WhatsApp ou celular cadastrado.',
        variant: 'warning',
      });
      return;
    }
    let phoneWithCountry = rawClean;
    if (rawClean.length <= 11 && !rawClean.startsWith('55')) {
      phoneWithCountry = `55${rawClean}`;
    }

    const compName = companyInfo?.tradingName || companyInfo?.name || 'Nossa Loja';
    let msg = `Olá, *${debt.clientName}*! Tudo bem? 👋\n\n`;
    msg += `📋 *EXTRATO DE CONTA / CREDIÁRIO - ${compName.toUpperCase()}*\n`;
    msg += `Referente à compra *#${debt.saleCode}* realizada em ${debt.date}.\n`;
    msg += `----------------------------------------\n`;
    msg += `💰 *Valor Total da Compra:* R$ ${debt.totalAmount.toFixed(2).replace('.', ',')}\n`;
    msg += `✅ *Total Pago:* R$ ${debt.paidAmount.toFixed(2).replace('.', ',')}\n`;
    msg += `⏳ *Saldo Devedor Restante:* *R$ ${debt.remainingAmount.toFixed(2).replace('.', ',')}*\n`;
    msg += `----------------------------------------\n`;
    msg += `📅 *Situação das Parcelas:*\n`;
    debt.installments.forEach((inst) => {
      const st = inst.status === 'PAGO' ? '✅ Pago' : `⏳ Vence em ${inst.dueDate.split('-').reverse().join('/')}`;
      msg += `   • Parcela ${inst.number}: R$ ${inst.amount.toFixed(2).replace('.', ',')} [${st}]\n`;
    });
    if (companyInfo?.pixKey) {
      msg += `\n🔑 *Chave PIX para Pagamento:* \`${companyInfo.pixKey}\`\n`;
    }
    msg += `\nFicamos à disposição para qualquer dúvida ou para o envio do comprovante!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
    openExternalUrl(waUrl);
  };

  // Helper para converter número monetário em texto por extenso
  const numeroParaExtenso = (valor: number): string => {
    if (!valor || isNaN(valor) || valor === 0) return 'zero reais';
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const converterGrupo = (n: number): string => {
      if (n === 100) return 'cem';
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;
      const partes: string[] = [];
      if (c > 0) partes.push(centenas[c]);
      if (d === 1) {
        partes.push(especiais[u]);
      } else {
        if (d > 1) partes.push(dezenas[d]);
        if (u > 0) partes.push(unidades[u]);
      }
      return partes.join(' e ');
    };

    const inteiro = Math.floor(valor);
    const centavos = Math.round((valor - inteiro) * 100);

    const milhares = Math.floor(inteiro / 1000);
    const restoMilhar = inteiro % 1000;

    const partesInteiro: string[] = [];
    if (milhares > 0) {
      if (milhares === 1) {
        partesInteiro.push('mil');
      } else {
        partesInteiro.push(`${converterGrupo(milhares)} mil`);
      }
    }
    if (restoMilhar > 0) {
      partesInteiro.push(converterGrupo(restoMilhar));
    }

    const textoReais = partesInteiro.length > 0 ? partesInteiro.join(restoMilhar > 0 && restoMilhar < 100 ? ' e ' : ' ') + (inteiro === 1 ? ' real' : ' reais') : '';
    const textoCentavos = centavos > 0 ? `${converterGrupo(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}` : '';

    if (textoReais && textoCentavos) return `${textoReais} e ${textoCentavos}`;
    if (textoReais) return textoReais;
    if (textoCentavos) return textoCentavos;
    return 'zero reais';
  };

  // ─── IMPRESSÃO DE NOTA PROMISSÓRIA / CARNÊ OFICIAL ───
  const handlePrintPromissoryNote = (debt: ClientDebtRecord) => {
    const compName = companyInfo?.tradingName || companyInfo?.name || 'Nossa Empresa';
    const compRazao = companyInfo?.companyName || companyInfo?.name || compName;
    const compDoc = companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj}` : (companyInfo?.cpf ? `CPF: ${companyInfo.cpf}` : '');
    const compPhone = companyInfo?.phone || companyInfo?.whatsapp || '';
    const compCity = companyInfo?.city || '';
    const compState = companyInfo?.state || '';
    const compAddress = [companyInfo?.address, companyInfo?.number, companyInfo?.neighborhood].filter(Boolean).join(', ');
    const pracaPagamento = compCity ? `${compCity} - ${compState}` : 'Praça Emitente';

    // Tenta encontrar o cadastro completo do cliente para endereço e RG
    const fullClientObj = clients.find((c) => c.id === debt.clientId || c.name === debt.clientName);
    const clientFullAddress = fullClientObj?.address 
      ? [fullClientObj.address, fullClientObj.number, fullClientObj.neighborhood, fullClientObj.city, fullClientObj.state].filter(Boolean).join(', ')
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Nota_Promissoria_${debt.saleCode}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            font-family: 'Segoe UI', Arial, -apple-system, sans-serif;
            padding: 10px;
            font-size: 11px;
            color: #0f172a;
            background: #fff;
          }
          .promissory-wrapper {
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 20px;
            page-break-inside: avoid;
            background: #ffffff;
            position: relative;
          }
          .promissory-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .main-title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .sub-title {
            font-size: 10px;
            color: #475569;
            font-weight: 600;
          }
          .badges-row {
            display: flex;
            gap: 10px;
            align-items: center;
          }
          .badge-box {
            border: 1.5px solid #0f172a;
            border-radius: 6px;
            padding: 4px 10px;
            text-align: center;
            background: #f8fafc;
          }
          .badge-lbl {
            font-size: 8.5px;
            text-transform: uppercase;
            font-weight: bold;
            color: #64748b;
            display: block;
          }
          .badge-val {
            font-size: 13px;
            font-weight: 900;
            font-family: 'Courier New', monospace;
            color: #0f172a;
          }
          .legal-statement {
            line-height: 1.6;
            margin-bottom: 10px;
            text-align: justify;
            font-size: 11.5px;
          }
          .extenso-box {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 10px;
            font-weight: bold;
            font-style: italic;
            margin: 6px 0 12px 0;
            font-size: 11px;
            color: #1e293b;
          }
          .parties-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 10px;
            margin-bottom: 18px;
            font-size: 10.5px;
            background: #fafafa;
            padding: 8px 12px;
            border-radius: 6px;
          }
          .party-head {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9.5px;
            color: #475569;
            margin-bottom: 3px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 2px;
          }
          .sig-container {
            display: flex;
            justify-content: space-between;
            gap: 30px;
            margin-top: 25px;
            padding-top: 5px;
          }
          .sig-block {
            flex: 1;
            text-align: center;
          }
          .sig-line {
            border-top: 1.5px solid #0f172a;
            padding-top: 4px;
            font-size: 10.5px;
            font-weight: bold;
            color: #0f172a;
          }
          .sig-sub {
            font-size: 9px;
            color: #64748b;
          }
          .cut-separator {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 18px 0;
            color: #94a3b8;
            font-size: 10px;
            font-family: monospace;
          }
          .cut-separator::before, .cut-separator::after {
            content: '';
            flex: 1;
            border-bottom: 1.5px dashed #94a3b8;
            margin: 0 8px;
          }
          @media print {
            body { padding: 0; }
            .promissory-wrapper { border-color: #000; }
          }
        </style>
      </head>
      <body>
        ${debt.installments.map((inst, index) => {
          const valorExtenso = numeroParaExtenso(inst.amount);
          const dueDateFormatted = inst.dueDate ? inst.dueDate.split('-').reverse().join('/') : '';
          const emissionDateFormatted = debt.date ? debt.date.split('-').reverse().join('/') : '';

          return `
            <div class="promissory-wrapper">
              <div class="promissory-header">
                <div>
                  <div class="main-title">NOTA PROMISSÓRIA</div>
                  <div class="sub-title">Nº ${String(inst.number).padStart(2, '0')}/${String(debt.installments.length).padStart(2, '0')} • Venda Balcão #${debt.saleCode} • Emissão: ${emissionDateFormatted}</div>
                </div>
                <div class="badges-row">
                  <div class="badge-box">
                    <span class="badge-lbl">Vencimento</span>
                    <span class="badge-val">${dueDateFormatted}</span>
                  </div>
                  <div class="badge-box">
                    <span class="badge-lbl">Valor da Parcela</span>
                    <span class="badge-val">R$ ${inst.amount.toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              </div>

              <div class="legal-statement">
                No dia <strong>${dueDateFormatted}</strong> (Vencimento), pagarei(emos) por esta única via de <strong>NOTA PROMISSÓRIA</strong> a <strong>${compRazao}</strong> (${compDoc}), ou à sua ordem, a quantia de:
              </div>

              <div class="extenso-box">
                ( ${valorExtenso.toUpperCase()} )
              </div>

              <div class="legal-statement" style="font-size: 10.5px; color: #334155;">
                em moeda corrente deste país. Pagável na praça de <strong>${pracaPagamento}</strong>, referente à compra de mercadorias/peças comerciais.
              </div>

              <div class="parties-grid">
                <div>
                  <div class="party-head">Emitente / Devedor:</div>
                  <strong>${debt.clientName}</strong><br/>
                  ${debt.clientDocument ? `<strong>CPF/CNPJ:</strong> ${debt.clientDocument}<br/>` : ''}
                  ${debt.clientPhone ? `<strong>Telefone:</strong> ${debt.clientPhone}<br/>` : ''}
                  ${clientFullAddress ? `<strong>Endereço:</strong> ${clientFullAddress}<br/>` : ''}
                </div>
                <div>
                  <div class="party-head">Credor / Beneficiário:</div>
                  <strong>${compName}</strong><br/>
                  ${compDoc ? `<strong>${compDoc}</strong><br/>` : ''}
                  ${compPhone ? `<strong>Telefone:</strong> ${compPhone}<br/>` : ''}
                  ${compAddress ? `<strong>Endereço:</strong> ${compAddress}<br/>` : ''}
                </div>
              </div>

              <div class="sig-container">
                <div class="sig-block">
                  <div class="sig-line">
                    ${debt.clientName}
                  </div>
                  <div class="sig-sub">Assinatura do Emitente / Devedor</div>
                </div>
                <div class="sig-block">
                  <div class="sig-line">
                    Avalista / Testemunha
                  </div>
                  <div class="sig-sub">Nome / CPF do Avalista (Opcional)</div>
                </div>
              </div>
            </div>
            ${index < debt.installments.length - 1 ? '<div class="cut-separator">✂ - - - - - - - - - - - - - - CORTE AQUI - - - - - - - - - - - - - - ✂</div>' : ''}
          `;
        }).join('')}
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 250);
    }
  };

  const handlePrintReceipt = (customSale?: SaleRecord | null) => {
    const sale = customSale || viewingSaleReceipt;
    if (!sale) return;

    const isThermal80 = printerConfig.salesReceiptFormat === 'THERMAL_80MM';
    const isThermal58 = printerConfig.salesReceiptFormat === 'THERMAL_58MM';
    const isA4Half = printerConfig.salesReceiptFormat === 'A4_HALF';

    const formatWidth = isThermal58 ? '58mm' : isThermal80 ? '80mm' : isA4Half ? '148mm' : '100%';
    const fontFamilies = (isThermal80 || isThermal58)
      ? "'Courier New', Courier, monospace"
      : "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

    let paymentDisplay: string = String(sale.paymentMethod || 'DINHEIRO');
    if (sale.paymentMethod === 'CARTAO_CREDITO' && sale.installments && sale.installments > 1) {
      paymentDisplay = `Cartão de Crédito (${sale.installments}x de R$ ${(sale.totalAmount / sale.installments).toFixed(2).replace('.', ',')})`;
    } else if (sale.paymentMethod === 'A_PRAZO' && sale.installments && sale.installments > 1) {
      paymentDisplay = `A Prazo / Crediário (${sale.installments}x de R$ ${(sale.totalAmount / sale.installments).toFixed(2).replace('.', ',')})`;
    } else if (sale.paymentMethod === 'PROMISSORIA') {
      paymentDisplay = `Nota Promissória ${sale.installments ? `(${sale.installments}x de R$ ${(sale.totalAmount / sale.installments).toFixed(2).replace('.', ',')})` : ''}`;
    } else if (sale.paymentMethod === 'MISTO' && sale.payments && sale.payments.length > 0) {
      paymentDisplay = `Misto: ${sale.payments.map((p) => `${p.method} (R$ ${p.amount.toFixed(2).replace('.', ',')})`).join(' + ')}`;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Comprovante_Venda_${sale.saleCode}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page {
            margin: ${isThermal80 || isThermal58 ? '2mm' : '8mm'};
            size: ${isThermal80 ? '80mm auto' : isThermal58 ? '58mm auto' : isA4Half ? 'A5' : 'A4 portrait'};
          }
          body {
            font-family: ${fontFamilies};
            color: #0f172a;
            background: #fff;
            padding: ${isThermal80 || isThermal58 ? '4px' : '15px'};
            width: ${formatWidth};
            margin: 0 auto;
            font-size: ${isThermal58 ? '10px' : isThermal80 ? '11px' : '12px'};
            line-height: 1.3;
          }
          .header { text-align: center; border-bottom: 1px dashed #94a3b8; padding-bottom: 8px; margin-bottom: 8px; }
          .logo { max-height: 40px; margin: 0 auto 4px auto; display: block; }
          .company-title { font-size: ${isThermal58 ? '11px' : isThermal80 ? '13px' : '15px'}; font-weight: 800; text-transform: uppercase; }
          .company-sub { font-size: 9px; color: #475569; margin-top: 2px; }
          .sale-badge { display: inline-block; margin-top: 6px; padding: 2px 6px; font-weight: 800; border: 1px solid #059669; color: #065f46; background: #ecfdf5; border-radius: 4px; font-size: 10.5px; }
          
          .info-block { border-bottom: 1px dashed #cbd5e1; padding-bottom: 6px; margin-bottom: 6px; font-size: ${isThermal58 ? '9.5px' : '10.5px'}; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          
          table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: ${isThermal58 ? '9.5px' : '10.5px'}; }
          th { border-bottom: 1px solid #0f172a; border-top: 1px solid #0f172a; padding: 3px 2px; font-weight: 700; text-align: left; }
          td { padding: 3px 2px; border-bottom: 1px dashed #e2e8f0; }
          
          .totals { border-top: 1px dashed #94a3b8; padding-top: 6px; margin-top: 6px; font-size: ${isThermal58 ? '10px' : '11px'}; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .total-final { font-weight: 900; font-size: ${isThermal58 ? '12px' : '13px'}; border-top: 1px solid #0f172a; padding-top: 4px; margin-top: 3px; }
          
          .warranty-terms { border-top: 1px dashed #94a3b8; padding-top: 8px; margin-top: 8px; font-size: 8.5px; color: #475569; text-align: center; }
          .signature-area { margin-top: 20px; text-align: center; }
          .signature-line { width: 80%; margin: 0 auto 3px auto; border-bottom: 1px solid #000; }
          .signature-label { font-size: 9px; font-weight: bold; }
          
          .footer-msg { margin-top: 8px; font-size: 9px; text-align: center; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${companyInfo?.logoUrl ? `<img src="${companyInfo.logoUrl}" class="logo" alt="Logo" />` : ''}
          <div class="company-title">${companyInfo?.tradingName || companyInfo?.name || 'Vollen Assistência Técnica'}</div>
          <div class="company-sub">
            ${companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj}<br/>` : ''}
            ${companyInfo?.phone || companyInfo?.whatsapp ? `Tel: ${companyInfo?.phone || companyInfo?.whatsapp}` : ''}
            ${companyInfo?.address ? `<br/>${companyInfo.address}` : ''}
          </div>
          <div class="sale-badge">COMPROVANTE DE VENDA #${sale.saleCode}</div>
        </div>

        <div class="info-block">
          <div class="info-row">
            <span><strong>Cliente:</strong> ${sale.clientName}</span>
          </div>
          ${sale.clientPhone ? `<div class="info-row"><span><strong>WhatsApp/Tel:</strong> ${sale.clientPhone}</span></div>` : ''}
          ${sale.clientDocument ? `<div class="info-row"><span><strong>CPF/CNPJ:</strong> ${sale.clientDocument}</span></div>` : ''}
          <div class="info-row" style="margin-top: 3px;">
            <span><strong>Data:</strong> ${sale.date} às ${sale.time}</span>
            <span><strong>Vend:</strong> ${sale.sellerName}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center; width: 30px;">Qtd</th>
              <th style="text-align: right; width: 60px;">Unit.</th>
              <th style="text-align: right; width: 65px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((i) => `
              <tr>
                <td>
                  <strong>${i.name}</strong>
                  ${i.application ? `<br/><span style="font-size: 8.5px; color: #64748b;">Ref: ${i.application}</span>` : ''}
                </td>
                <td style="text-align: center; font-weight: bold;">${i.qty}</td>
                <td style="text-align: right;">R$ ${(Number(i.unitPrice) || 0).toFixed(2).replace('.', ',')}</td>
                <td style="text-align: right; font-weight: bold;">R$ ${(Number(i.subtotal) || 0).toFixed(2).replace('.', ',')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>R$ ${sale.subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          ${sale.discountAmount && sale.discountAmount > 0 ? `
            <div class="total-row" style="color: #b91c1c;">
              <span>Desconto:</span>
              <span>- R$ ${sale.discountAmount.toFixed(2).replace('.', ',')}</span>
            </div>
          ` : ''}
          ${sale.cardFeeAmount && sale.cardFeeAmount > 0 ? `
            <div class="total-row" style="color: #d97706;">
              <span>Acréscimo Taxa Maquininha:</span>
              <span>+ R$ ${sale.cardFeeAmount.toFixed(2).replace('.', ',')}</span>
            </div>
          ` : ''}
          <div class="total-row total-final">
            <span>TOTAL PAGO:</span>
            <span>R$ ${sale.totalAmount.toFixed(2).replace('.', ',')}</span>
          </div>
          <div style="font-size: 9.5px; margin-top: 4px;">
            <strong>Forma de Pagamento:</strong> ${paymentDisplay}
          </div>
        </div>

        ${sale.notes ? `
          <div style="margin-top: 6px; padding: 4px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 9px;">
            <strong>Obs:</strong> ${sale.notes}
          </div>
        ` : ''}

        ${printerConfig.printSaleWarrantyTerms !== false ? `
          <div class="warranty-terms">
            * As peças vendidas possuem garantia legal contra defeitos de fabricação pelo período de 90 dias a contar da data de emissão deste comprovante, mediante apresentação do mesmo.
          </div>
        ` : ''}

        ${printerConfig.printSaleSignatureLine !== false ? `
          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="signature-label">Assinatura da Empresa / Balcão</div>
          </div>
        ` : ''}

        ${printerConfig.thermalFooterMessage ? `
          <div class="footer-msg">
            ${printerConfig.thermalFooterMessage}
          </div>
        ` : ''}
      </body>
      </html>
    `;

    // 1. Tenta abrir em Popup Window
    let opened = false;
    try {
      const printWindow = window.open('', '_blank', `width=${isThermal80 || isThermal58 ? '400' : '850'},height=800`);
      if (printWindow && printWindow.document) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {}
        }, 250);
        opened = true;
      }
    } catch {}

    // 2. Fallback via Iframe invisível
    if (!opened) {
      const existingIframe = document.getElementById('sale_receipt_print_frame');
      if (existingIframe) existingIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'sale_receipt_print_frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          }
        }, 250);
      }
    }
  };

  // Helper para abrir links externos tanto no Electron Desktop quanto em navegadores Web
  const openExternalUrl = (targetUrl: string) => {
    try {
      const electron = (window as any).require ? (window as any).require('electron') : null;
      if (electron?.shell) {
        electron.shell.openExternal(targetUrl);
        return;
      }
    } catch {}

    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch {}
      }, 100);
    } catch {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // ─── ENVIO DE LISTA DE PEÇAS / ORÇAMENTO VIA WHATSAPP (FORMATO TEXTO) ───
  const handleSendWhatsAppText = () => {
    if (cart.length === 0) {
      alert({
        title: 'Carrinho Vazio',
        message: 'Adicione pelo menos uma peça ao carrinho para enviar a lista.',
        variant: 'warning',
      });
      return;
    }

    // Busca o cliente selecionado para obter o WhatsApp / Telefone
    const cleanClientName = (selectedClientName || '').trim().toLowerCase();
    const currentClientObj = (clients || []).find(
      (c) => (selectedClientId && c.id === selectedClientId) || (cleanClientName && c.name && c.name.trim().toLowerCase() === cleanClientName)
    );

    const clientPhone = selectedClientPhone || currentClientObj?.whatsapp || currentClientObj?.phone || '';
    const rawClean = (clientPhone || '').replace(/\D/g, '');

    if (!rawClean) {
      alert({
        title: 'Cliente sem Telefone / WhatsApp',
        message: 'Para abrir a conversa direta no WhatsApp, selecione um cliente cadastrado que possua número de WhatsApp ou celular com DDD.',
        variant: 'warning',
      });
      setIsSearchClientModalOpen(true);
      return;
    }

    // Garante DDI 55 (Brasil) caso tenha DDD + número (10 ou 11 dígitos)
    let phoneWithCountry = rawClean;
    if (rawClean.length <= 11 && !rawClean.startsWith('55')) {
      phoneWithCountry = `55${rawClean}`;
    }

    const clientName = selectedClientName && !selectedClientName.includes('Consumidor Final')
      ? selectedClientName
      : (currentClientObj?.name || 'Cliente');

    const compName = companyInfo?.tradingName || companyInfo?.name || 'Nossa Empresa';

    let msg = `Olá, *${clientName}*! 👋\n\n`;
    msg += `📋 *ORÇAMENTO DE PEÇAS - ${compName.toUpperCase()}*\n`;
    msg += `----------------------------------------\n`;

    cart.forEach((item) => {
      const unitFmt = (Number(item.unitPrice) || 0).toFixed(2).replace('.', ',');
      const subFmt = (Number(item.subtotal) || 0).toFixed(2).replace('.', ',');
      msg += `📦 *${item.name}*\n`;
      msg += `   • Cód: #${item.code || '-'} | Qtd: *${item.qty} un* x R$ ${unitFmt} = *R$ ${subFmt}*\n`;
      if (item.application) {
        msg += `   • Ref: _${item.application}_\n`;
      }
    });

    msg += `----------------------------------------\n`;
    msg += `💰 *Subtotal:* R$ ${cartSubtotal.toFixed(2).replace('.', ',')}\n`;
    if (discountVal > 0) {
      msg += `🏷️ *Desconto:* - R$ ${discountVal.toFixed(2).replace('.', ',')}\n`;
    }
    msg += `💵 *TOTAL GERAL: R$ ${cartTotal.toFixed(2).replace('.', ',')}*\n`;
    if (saleNotes) {
      msg += `\n📝 *Observações:* ${saleNotes}\n`;
    }
    msg += `\nCaso tenha alguma dúvida ou queira confirmar o pedido, estamos à disposição!`;

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
    openExternalUrl(waUrl);
  };

  // ─── IMPRESSÃO / SALVAR EM PDF DO ORÇAMENTO DE PEÇAS NO PC ───
  const handleSavePdfPrint = () => {
    if (cart.length === 0) {
      alert({
        title: 'Carrinho Vazio',
        message: 'Adicione pelo menos uma peça ao carrinho para gerar o PDF.',
        variant: 'warning',
      });
      return;
    }

    const cleanClientName = (selectedClientName || '').trim().toLowerCase();
    const currentClientObj = (clients || []).find(
      (c) => (selectedClientId && c.id === selectedClientId) || (cleanClientName && c.name && c.name.trim().toLowerCase() === cleanClientName)
    );

    const clientPhone = selectedClientPhone || currentClientObj?.whatsapp || currentClientObj?.phone || '';
    const clientName = selectedClientName && !selectedClientName.includes('Consumidor Final')
      ? selectedClientName
      : (currentClientObj?.name || 'Consumidor');

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Orcamento_Pecas_${clientName.replace(/\s+/g, '_')}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; padding: 25px; color: #1e293b; background: #fff; font-size: 12px; }
          .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
          .company-name { font-size: 17px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
          .badge { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; text-align: right; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11.5px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 7px 10px; border-bottom: 2px solid #cbd5e1; font-size: 11px; }
          td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
          .total-box { margin-left: auto; width: 280px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; font-size: 11.5px; }
          .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
          .total-final { border-top: 2px solid #059669; padding-top: 6px; margin-top: 4px; font-size: 13.5px; font-weight: 800; color: #047857; }
          .footer { border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; color: #64748b; font-size: 10.5px; margin-top: 20px; }
          .btn-print { position: fixed; bottom: 20px; right: 20px; background: #059669; color: #fff; border: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
          @media print {
            body { padding: 0; }
            .btn-print { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="btn-print" onclick="window.print()">🖨️ Salvar em PDF / Imprimir</button>

        <div class="header">
          <div>
            <div class="company-name">${companyInfo?.tradingName || companyInfo?.name || 'Vollen Assistência Técnica'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
              ${companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj} • ` : ''}Tel/WhatsApp: ${companyInfo?.phone || companyInfo?.whatsapp || 'Não informado'}
            </div>
            ${companyInfo?.address ? `<div style="font-size: 10.5px; color: #64748b;">${companyInfo.address}</div>` : ''}
          </div>
          <div class="badge">
            LISTA DE PEÇAS / ORÇAMENTO
            <div style="font-size: 10px; font-weight: normal; color: #64748b; margin-top: 2px;">${dateFormatted} às ${timeFormatted}</div>
          </div>
        </div>

        <div class="info-box">
          <div>
            <strong>Cliente / Destinatário:</strong> ${clientName}<br/>
            ${clientPhone ? `<strong>WhatsApp / Contato:</strong> ${clientPhone}<br/>` : ''}
            ${selectedClientDoc ? `<strong>CPF / CNPJ:</strong> ${selectedClientDoc}` : ''}
          </div>
          <div style="text-align: right;">
            <strong>Atendente / Vendedor:</strong> ${sellerName || 'Atendente Balcão'}<br/>
            <strong>Módulo:</strong> Balcão de Peças
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 70px;">Cód.</th>
              <th>Descrição da Peça</th>
              <th style="text-align: center; width: 60px;">Qtd</th>
              <th style="text-align: right; width: 100px;">Valor Unit.</th>
              <th style="text-align: right; width: 100px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${cart.map((i) => `
              <tr>
                <td style="font-family: monospace; font-weight: bold; color: #047857;">#${i.code || '-'}</td>
                <td>
                  <strong>${i.name}</strong>
                  ${i.application ? `<div style="font-size: 10px; color: #64748b;">Ref: ${i.application}</div>` : ''}
                </td>
                <td style="text-align: center; font-weight: bold;">${i.qty}</td>
                <td style="text-align: right;">R$ ${(Number(i.unitPrice) || 0).toFixed(2).replace('.', ',')}</td>
                <td style="text-align: right; font-weight: bold; color: #047857;">R$ ${(Number(i.subtotal) || 0).toFixed(2).replace('.', ',')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div class="total-row">
            <span>Subtotal:</span>
            <strong>R$ ${cartSubtotal.toFixed(2).replace('.', ',')}</strong>
          </div>
          ${discountVal > 0 ? `
            <div class="total-row" style="color: #dc2626;">
              <span>Desconto:</span>
              <strong>- R$ ${discountVal.toFixed(2).replace('.', ',')}</strong>
            </div>
          ` : ''}
          <div class="total-row total-final">
            <span>TOTAL GERAL:</span>
            <span>R$ ${cartTotal.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        ${saleNotes ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 16px; font-size: 11px;">
            <strong>Observações:</strong> ${saleNotes}
          </div>
        ` : ''}

        <div class="footer">
          Orçamento de peças gerado pelo sistema. Valores sujeitos a alteração conforme disponibilidade de estoque.
        </div>
      </body>
      </html>
    `;

    let openedPrint = false;
    try {
      const printWindow = window.open('', '_blank', 'width=850,height=900');
      if (printWindow && printWindow.document) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {}
        }, 300);
        openedPrint = true;
      }
    } catch {}

    if (!openedPrint) {
      const existingIframe = document.getElementById('sales_print_frame');
      if (existingIframe) existingIframe.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'sales_print_frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {}
        }, 300);
      }
    }
  };


  const handleSendReceiptWhatsApp = (sale: SaleRecord) => {
    const cleanClientName = (sale.clientName || '').trim().toLowerCase();
    const currentClientObj = (clients || []).find(
      (c) => (sale.clientId && c.id === sale.clientId) || (cleanClientName && c.name && c.name.trim().toLowerCase() === cleanClientName)
    );

    const clientPhone = sale.clientPhone || currentClientObj?.whatsapp || currentClientObj?.phone || '';
    const clientName = sale.clientName && !sale.clientName.includes('Consumidor Final')
      ? sale.clientName
      : (currentClientObj?.name || 'Cliente');

    const compName = companyInfo?.tradingName || companyInfo?.name || 'Nossa Empresa';
    let msg = `Olá, *${clientName}*! 👋\n\n`;
    msg += `🧾 *COMPROVANTE DE VENDA #${sale.saleCode}*\n`;
    msg += `🏢 *${compName}*\n`;
    msg += `📅 Data: ${sale.date} às ${sale.time}\n`;
    msg += `💳 Forma de Pgto: ${sale.paymentMethod}\n`;
    msg += `----------------------------------------\n`;

    sale.items.forEach((item) => {
      const unitFmt = (Number(item.unitPrice) || 0).toFixed(2).replace('.', ',');
      const subFmt = (Number(item.subtotal) || 0).toFixed(2).replace('.', ',');
      msg += `📦 *${item.name}*\n`;
      msg += `   • Cód: #${item.code || '-'} | Qtd: *${item.qty} un* x R$ ${unitFmt} = *R$ ${subFmt}*\n`;
    });

    msg += `----------------------------------------\n`;
    if (sale.discountAmount && sale.discountAmount > 0) {
      msg += `🏷️ *Desconto:* - R$ ${sale.discountAmount.toFixed(2).replace('.', ',')}\n`;
    }
    msg += `💵 *TOTAL PAGO: R$ ${sale.totalAmount.toFixed(2).replace('.', ',')}*\n`;
    if (sale.notes) {
      msg += `\n📝 *Obs:* ${sale.notes}\n`;
    }
    const rawClean = (clientPhone || '').replace(/\D/g, '');
    if (!rawClean) {
      alert({
        title: 'Cliente sem Telefone / WhatsApp',
        message: 'Esta venda não possui número de WhatsApp/celular cadastrado para envio direto.',
        variant: 'warning',
      });
      return;
    }

    let phoneWithCountry = rawClean;
    if (rawClean.length <= 11 && !rawClean.startsWith('55')) {
      phoneWithCountry = `55${rawClean}`;
    }

    const waUrl = `https://api.whatsapp.com/send?phone=${phoneWithCountry}&text=${encodeURIComponent(msg)}`;
    openExternalUrl(waUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 select-none font-sans text-xs">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-7xl h-[96vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-3 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 border border-emerald-400/40 p-2 rounded-xl text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight leading-none text-white">
                  Módulo de vendas de peças (Balcão)
                </h2>
                <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40">
                  PDV Integrado
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                Venda direta de peças do estoque, emissão de comprovante e integração com o fluxo de caixa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Abas Superiores */}
            <div className="flex bg-black/20 p-0.5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('POS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'POS'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Nova Venda
              </button>
              {getCurrentFeatures().hasSalesSavedCarts && (
                <button
                  type="button"
                  onClick={() => setActiveTab('SAVED_CARTS')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'SAVED_CARTS'
                      ? 'bg-white text-emerald-900 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  Carrinhos Salvos ({savedCarts.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('HISTORY')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'HISTORY'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Histórico ({salesHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('CLIENT_DEBTS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'CLIENT_DEBTS'
                    ? 'bg-white text-emerald-900 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                Promissórias & Crediário
                {clientDebts.filter((d) => d.status !== 'QUITADO').length > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                    {clientDebts.filter((d) => d.status !== 'QUITADO').length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">

              <button
                onClick={handleRequestClose}
                className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Corpo Principal */}
        {activeTab === 'POS' ? (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-100 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* COLUNA ESQUERDA: Busca de Peças e Carrinho (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-slate-50">
              {/* Alerta de Venda Reaberta para Edição */}
              {reopenedSaleBackup && (
                <div className="bg-amber-500/15 border-b border-amber-500/40 px-3.5 py-2 flex items-center justify-between text-amber-950 shrink-0">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span className="bg-amber-500 text-slate-900 px-2 py-0.5 rounded-md font-black text-[10px]">
                      EDITANDO
                    </span>
                    <span>
                      Venda <strong>{reopenedSaleBackup.saleCode}</strong> reaberta para alteração. Adicione ou remova itens e clique em Concluir Venda.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelReopenSale}
                    className="text-xs font-bold text-amber-900 hover:text-red-700 underline cursor-pointer shrink-0 ml-2"
                  >
                    Cancelar e Restaurar
                  </button>
                </div>
              )}

              {/* Barra de Busca de Peças Rápida com Botão de Abrir Peças */}
              <div className="p-3 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-700" />
                    Pesquisar Peça por Nome, Código ou Aplicação:
                  </label>
                  {onOpenPartsModal && (
                    <button
                      type="button"
                      onClick={onOpenPartsModal}
                      className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border border-slate-300 hover:border-emerald-300 font-bold px-2.5 py-1 rounded-lg text-[10.5px] flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Abrir Central de Peças e Estoque"
                    >
                      <Package className="w-3.5 h-3.5 text-emerald-600" />
                      Abrir Cadastro de Peças
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    ref={partSearchInputRef}
                    type="text"
                    placeholder="Bipe o código de barras ou digite o nome/código (Enter)..."
                    value={partSearch}
                    onChange={(e) => {
                      setPartSearch(e.target.value);
                      setIsPartSearchFocused(true);
                    }}
                    onFocus={() => setIsPartSearchFocused(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBarcodeOrEnterScan(partSearch);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-600/20"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />

                  {/* Dropdown de Resultados */}
                  {isPartSearchFocused && filteredParts.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-300 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {filteredParts.map((p) => {
                        const cleanClientName = (selectedClientName || '').trim().toLowerCase();
                        const currentClientObj = (clients || []).find(
                          (c) => (selectedClientId && c.id === selectedClientId) || (cleanClientName && c.name && c.name.trim().toLowerCase() === cleanClientName)
                        );
                        const isTechClient = Boolean(currentClientObj?.isTechnician) || selectedClientName.includes('Técnico');

                        let priceValStr = p.finalPrice;
                        if (isTechClient && p.techPrice) {
                          const techVal = parseFloat(String(p.techPrice).replace(/\./g, '').replace(',', '.')) || 0;
                          if (techVal > 0) {
                            priceValStr = p.techPrice;
                          }
                        }

                        const price = parseFloat(String(priceValStr).replace(/\./g, '').replace(',', '.')) || 0;
                        const stock = p.stockQuantity ?? 0;
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleSelectPart(p)}
                            onDoubleClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (onViewPartDetails) onViewPartDetails(p);
                            }}
                            title="Clique para selecionar • Duplo clique para ver ficha da peça"
                            className="p-2.5 hover:bg-emerald-50 transition-colors cursor-pointer flex items-center justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs truncate">{p.name}</span>
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                  #{p.code}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-slate-500 truncate">
                                {p.group ? `${p.group} • ` : ''}{p.application || 'Peça avulsa'}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-black text-emerald-700 text-xs block">
                                R$ {price.toFixed(2).replace('.', ',')}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  stock > 0 ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'
                                }`}
                              >
                                Est: {stock}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Box de Configuração da Peça Selecionada para Inserir */}
                {selectedPartForAdd && (
                  <div className="mt-2.5 bg-emerald-50/80 border border-emerald-300 rounded-xl p-2.5 flex items-center gap-3 animate-fadeIn">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                          Peça Selecionada:
                        </span>
                        <span className="text-[10.5px] font-mono font-bold bg-white text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-200">
                          Cód: #{selectedPartForAdd.code}
                        </span>
                        {selectedPartForAdd.manufacturerCode && (
                          <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1 rounded">
                            Fab: {selectedPartForAdd.manufacturerCode}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-slate-900 text-xs truncate block mt-0.5">
                        {selectedPartForAdd.name}
                      </span>
                      {/* CAMPO DE REFERÊNCIA / APLICAÇÃO EM DESTAQUE */}
                      <div className="mt-1 bg-white/90 border border-emerald-200/80 rounded-md px-2 py-0.5 text-[10.5px] text-slate-700 font-medium truncate">
                        <strong className="text-emerald-900">Referência / Aplicação:</strong>{' '}
                        {selectedPartForAdd.application || 'Sem referência informada'}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                        Estoque Disponível: <strong className="text-slate-800">{selectedPartForAdd.stockQuantity ?? 0} {selectedPartForAdd.unit || 'UN'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Qtd:</label>
                        <input
                          type="number"
                          min="1"
                          value={addQty}
                          onChange={(e) => setAddQty(e.target.value)}
                          className="w-14 bg-white border border-slate-300 rounded-lg px-2 py-1 text-center font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Valor Unit. (R$):</label>
                        <input
                          type="text"
                          readOnly
                          disabled
                          value={addCustomPrice}
                          title="O valor unitário é definido pelo cadastro da peça (Consumidor ou Técnico)"
                          className="w-24 bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-right font-bold text-xs text-slate-700 select-none cursor-default"
                        />
                      </div>

                      <div className="flex items-center gap-1 mt-3.5">
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPartForAdd(null);
                            setPartSearch('');
                            setAddQty('1');
                            setAddCustomPrice('');
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer text-xs"
                          title="Cancelar seleção desta peça"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela do Carrinho */}
              <div className="flex-1 overflow-y-auto p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                    Itens no Carrinho ({cart.reduce((acc, i) => acc + i.qty, 0)} {cart.reduce((acc, i) => acc + i.qty, 0) === 1 ? 'peça' : 'peças'}):
                  </span>
                  {cart.length > 0 && (
                    <div className="flex items-center gap-2">

                      {getCurrentFeatures().hasSalesSavedCarts && (
                        <button
                          type="button"
                          onClick={() => {
                            setSaveCartLabelInput(
                              selectedClientName && !selectedClientName.includes('Consumidor Final')
                                ? selectedClientName
                                : `Carrinho ${savedCarts.length + 1}`
                            );
                            setIsSaveCartModalOpen(true);
                          }}
                          className="text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                          title="Salvar este carrinho para continuar ou finalizar mais tarde"
                        >
                          <Bookmark className="w-3 h-3" />
                          Salvar Carrinho
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Esvaziar Carrinho',
                            message: 'Tem certeza que deseja remover todos os itens deste carrinho?',
                            variant: 'danger',
                          });
                          if (ok) {
                            setCart([]);
                            try {
                              localStorage.removeItem('vollen_local_sales_cart');
                            } catch {}
                          }
                        }}
                        className="text-red-600 hover:text-red-700 text-[11px] font-semibold cursor-pointer px-1"
                      >
                        Esvaziar
                      </button>
                    </div>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6">
                    <ShoppingCart className="w-10 h-10 mb-2 stroke-[1.2] text-slate-300" />
                    <p className="font-bold text-slate-600 text-xs">Nenhum item adicionado à venda</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 text-center">
                      Use a barra de pesquisa acima para selecionar as peças do estoque.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Item / Descrição</th>
                          <th className="p-2.5 text-center w-20">Qtd</th>
                          <th className="p-2.5 text-right w-24">Unitário</th>
                          <th className="p-2.5 text-right w-24">Subtotal</th>
                          <th className="p-2.5 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cart.map((item) => (
                          <tr key={item.partId} className="hover:bg-slate-50/80">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono">Cód: #{item.code}</span>
                                {item.application && (
                                  <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.2 rounded truncate max-w-[220px]">
                                    Ref: {item.application}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleUpdateCartQty(item.partId, e.target.value)}
                                className="w-14 bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-center font-bold text-xs"
                              />
                            </td>
                            <td className="p-2.5 text-right font-medium text-slate-700">
                              R$ {(Number(item.unitPrice) || 0).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2.5 text-right font-black text-emerald-700">
                              R$ {(Number(item.subtotal) || 0).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveFromCart(item.partId)}
                                className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* COLUNA DIREITA: Cliente Rápido, Pagamento e Fechamento (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full p-2.5 bg-white space-y-2 overflow-hidden">
              {/* 1. SELEÇÃO RÁPIDA DE CLIENTE / DESTINATÁRIO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-700" />
                    Destinatário da Venda:
                  </span>
                  {selectedClientId ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      Cliente Cadastrado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                      Balcão
                    </span>
                  )}
                </div>

                {/* BOTÕES DE SELEÇÃO RÁPIDA */}
                <div className={`grid ${getCurrentFeatures().hasSalesPartnerButton ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId('');
                      setSelectedClientName('Consumidor Final (Balcão)');
                      setSelectedClientPhone('');
                      setSelectedClientDoc('');

                      // Recalcula itens do carrinho para Preço de Consumidor Final
                      setCart((prevCart) =>
                        prevCart.map((item) => {
                          const matchedPart = (parts || []).find((p) => p.id === item.partId || p.code === item.code);
                          if (matchedPart) {
                            const finalVal = parseFloat(String(matchedPart.finalPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
                            if (finalVal > 0) {
                              return {
                                ...item,
                                unitPrice: finalVal,
                                subtotal: finalVal * item.qty,
                              };
                            }
                          }
                          return item;
                        })
                      );
                    }}
                    className={`py-1.5 px-1 rounded-lg border font-bold text-xs transition-all cursor-pointer truncate ${
                      !selectedClientId && selectedClientName.includes('Consumidor Final')
                        ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    👤 Consumidor Final
                  </button>

                  {getCurrentFeatures().hasSalesPartnerButton && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId('');
                        setSelectedClientName('Técnico Parceiro / Oficina');
                        setSelectedClientPhone('');
                        setSelectedClientDoc('');

                        // Recalcula itens do carrinho para Preço de Técnico
                        setCart((prevCart) =>
                          prevCart.map((item) => {
                            const matchedPart = (parts || []).find((p) => p.id === item.partId || p.code === item.code);
                            if (matchedPart && matchedPart.techPrice) {
                              const techVal = parseFloat(String(matchedPart.techPrice).replace(/\./g, '').replace(',', '.')) || 0;
                              if (techVal > 0) {
                                return {
                                  ...item,
                                  unitPrice: techVal,
                                  subtotal: techVal * item.qty,
                                };
                              }
                            }
                            return item;
                          })
                        );
                      }}
                      className={`py-1.5 px-1 rounded-lg border font-bold text-xs transition-all cursor-pointer truncate ${
                        !selectedClientId && selectedClientName.includes('Técnico')
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      🛠️ Técnico / Parceiro
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setClientSearchFilter('');
                      setIsSearchClientModalOpen(true);
                    }}
                    className={`py-1.5 px-1 rounded-lg border font-bold text-xs transition-all cursor-pointer truncate flex items-center justify-center gap-1.5 ${
                      selectedClientId
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-emerald-800 border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    Buscar Cadastrado
                  </button>
                </div>

                {/* EXIBIÇÃO CLARA DO CLIENTE ATUALMENTE SELECIONADO */}
                <div className="bg-white border border-slate-200 rounded-lg p-1.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider leading-none">
                      Emitir Comprovante Para:
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs truncate block mt-0.5">
                      {selectedClientName}
                    </span>
                    {(selectedClientPhone || selectedClientDoc) && (
                      <span className="text-[9.5px] text-slate-500 block truncate">
                        {selectedClientPhone ? `Tel: ${selectedClientPhone}` : ''}
                        {selectedClientPhone && selectedClientDoc ? ' • ' : ''}
                        {selectedClientDoc ? `Doc: ${selectedClientDoc}` : ''}
                      </span>
                    )}

                    {(() => {
                      const matched = (clients || []).find(
                        (c: any) =>
                          (selectedClientId && c.id === selectedClientId) ||
                          (selectedClientName && c.name && c.name.trim().toLowerCase() === selectedClientName.trim().toLowerCase())
                      );
                      if (matched?.hasRestriction) {
                        return (
                          <div className="mt-1 bg-rose-50 border border-rose-300 text-rose-900 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>RESTRIÇÃO: {matched.restrictionReason || 'Cliente com restrição ativa'}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {selectedClientId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId('');
                        setSelectedClientName('Consumidor Final (Balcão)');
                        setSelectedClientPhone('');
                        setSelectedClientDoc('');

                        // Recalcula itens do carrinho para Preço de Consumidor Final
                        setCart((prevCart) =>
                          prevCart.map((item) => {
                            const matchedPart = (parts || []).find((p) => p.id === item.partId || p.code === item.code);
                            if (matchedPart) {
                              const finalVal = parseFloat(String(matchedPart.finalPrice || '0').replace(/\./g, '').replace(',', '.')) || 0;
                              if (finalVal > 0) {
                                return {
                                  ...item,
                                  unitPrice: finalVal,
                                  subtotal: finalVal * item.qty,
                                };
                              }
                            }
                            return item;
                          })
                        );
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors text-[10px] font-bold"
                      title="Remover cliente e voltar para Consumidor Final"
                    >
                      ✕ Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* 2. FORMA DE PAGAMENTO COMPACTA COM SUPORTE A PRAZO, TAXAS E MISTO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 space-y-1.5 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    Forma de Pagamento:
                  </span>
                  {activeCardFeeRate > 0 && (paymentMethod === 'CARTAO_DEBITO' || paymentMethod === 'CARTAO_CREDITO') && (
                    <span className="text-[9.5px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded border border-sky-200">
                      Taxa Maq: {activeCardFeeRate}%
                    </span>
                  )}
                </div>

                {/* BOTÕES DE FORMAS DE PAGAMENTO (6 FORMAS EM 1 LINHA - APENAS TEXTO LIMPO) */}
                <div className="grid grid-cols-6 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('DINHEIRO');
                      setPassCardFeeToClient(false);
                    }}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center font-bold transition-all cursor-pointer text-[10px] whitespace-nowrap ${
                      paymentMethod === 'DINHEIRO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Dinheiro
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('PIX');
                      setPassCardFeeToClient(false);
                    }}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center font-bold transition-all cursor-pointer text-[10px] whitespace-nowrap ${
                      paymentMethod === 'PIX'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    PIX
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CARTAO_DEBITO');
                      setPassCardFeeToClient(cardFeeConfig.passFeeToClientDefault || false);
                    }}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center font-bold transition-all cursor-pointer text-[10px] whitespace-nowrap ${
                      paymentMethod === 'CARTAO_DEBITO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Débito
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CARTAO_CREDITO');
                      setPassCardFeeToClient(cardFeeConfig.passFeeToClientDefault || false);
                    }}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center font-bold transition-all cursor-pointer text-[10px] whitespace-nowrap ${
                      paymentMethod === 'CARTAO_CREDITO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Crédito
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('PROMISSORIA');
                      setPassCardFeeToClient(false);
                    }}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center font-bold transition-all cursor-pointer text-[10px] whitespace-nowrap ${
                      paymentMethod === 'PROMISSORIA'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-50'
                    }`}
                    title="Emitir Nota Promissória oficial / Título de crédito para cliente assinar"
                  >
                    Promissória
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('MISTO');
                      setPassCardFeeToClient(false);
                      if (splitPayments.length === 0 && cartTotal > 0) {
                        setSplitPayments([{ method: 'DINHEIRO', amount: cartTotal }]);
                      }
                    }}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center font-bold transition-all cursor-pointer text-[10px] whitespace-nowrap ${
                      paymentMethod === 'MISTO'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-indigo-900 border-indigo-300 hover:bg-indigo-50'
                    }`}
                    title="Dividir pagamento entre múltiplas formas"
                  >
                    Misto
                  </button>
                </div>

                {/* OPÇÃO DE DÉBITO: REPASSE DE TAXA */}
                {paymentMethod === 'CARTAO_DEBITO' && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-1.5 flex items-center justify-between gap-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-sky-950 font-bold text-[10.5px]">
                      <input
                        type="checkbox"
                        checked={passCardFeeToClient}
                        onChange={(e) => setPassCardFeeToClient(e.target.checked)}
                        className="rounded border-sky-400 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Repassar taxa da maquininha ao cliente (+{cardFeeConfig.debitFee}%)</span>
                    </label>
                    <span className="font-mono font-bold text-sky-900 text-[10.5px]">
                      {passCardFeeToClient ? `+ R$ ${cardFeeAmount.toFixed(2).replace('.', ',')}` : `Líquido: R$ ${storeNetTotal.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                )}

                {/* OPÇÃO DE CRÉDITO: PARCELAS E REPASSE DE TAXA */}
                {paymentMethod === 'CARTAO_CREDITO' && (
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-1.5 space-y-1.5 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-sky-700" />
                        <span className="text-[10.5px] font-bold text-sky-950">Parcelamento:</span>
                      </div>

                      <select
                        value={creditInstallments}
                        onChange={(e) => setCreditInstallments(parseInt(e.target.value, 10))}
                        className="bg-white border border-sky-300 rounded-lg px-2 py-0.5 text-xs font-bold text-sky-950 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                          const rate = cardFeeConfig.creditFees[num] || 0;
                          const base = baseAfterDiscount;
                          const totalWithFee = passCardFeeToClient ? (base * (1 + rate / 100)) : base;
                          const valParcela = totalWithFee > 0 ? (totalWithFee / num).toFixed(2).replace('.', ',') : '0,00';
                          return (
                            <option key={num} value={num}>
                              {num === 1 ? `1x à vista (R$ ${valParcela})` : `${num}x de R$ ${valParcela}`} {rate > 0 ? `[${rate}%]` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex items-center justify-between border-t border-sky-200/80 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-sky-950 font-bold text-[10.5px]">
                        <input
                          type="checkbox"
                          checked={passCardFeeToClient}
                          onChange={(e) => setPassCardFeeToClient(e.target.checked)}
                          className="rounded border-sky-400 text-sky-600 focus:ring-sky-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Repassar taxa (+{activeCardFeeRate}%)</span>
                      </label>
                      <span className="font-mono font-bold text-sky-900 text-[10.5px]">
                        {passCardFeeToClient ? `+ R$ ${cardFeeAmount.toFixed(2).replace('.', ',')}` : `Líquido: R$ ${storeNetTotal.toFixed(2).replace('.', ',')}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* OPÇÃO DE NOTA PROMISSÓRIA */}
                {paymentMethod === 'PROMISSORIA' && (
                  <div className="bg-amber-50/90 border border-amber-400 rounded-xl p-2 space-y-1.5 animate-fadeIn text-xs shadow-xs">
                    {!selectedClientId && (
                      <div className="bg-rose-100 border border-rose-300 text-rose-900 px-2 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Selecione um cliente cadastrado acima para emitir a Promissória!</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-950 mb-0.5">
                          Nº de Promissórias:
                        </label>
                        <select
                          value={debtInstallmentsCount}
                          onChange={(e) => setDebtInstallmentsCount(parseInt(e.target.value, 10))}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-amber-950 cursor-pointer focus:ring-1 focus:ring-amber-500"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((num) => {
                            const valParcela = cartTotal > 0 ? (cartTotal / num).toFixed(2).replace('.', ',') : '0,00';
                            return (
                              <option key={num} value={num}>
                                {num === 1 ? `1 Nota Única (R$ ${valParcela})` : `${num}x de R$ ${valParcela}`}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-amber-950 mb-0.5">
                          1º Vencimento:
                        </label>
                        <input
                          type="date"
                          value={debtFirstDueDate}
                          onChange={(e) => setDebtFirstDueDate(e.target.value)}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-amber-950 cursor-pointer focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-amber-200/80 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-amber-950 font-bold text-[10px]">
                        <input
                          type="checkbox"
                          checked={autoPrintPromissoryNote}
                          onChange={(e) => setAutoPrintPromissoryNote(e.target.checked)}
                          className="rounded border-amber-400 text-amber-700 focus:ring-amber-600 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Imprimir Promissória ao finalizar</span>
                      </label>
                      <span className="font-mono font-bold text-amber-900 text-[10.5px]">
                        Total: R$ {cartTotal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                )}

                {/* OPÇÃO DE MISTO (MÚLTIPLAS FORMAS) */}
                {paymentMethod === 'MISTO' && (
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-2 space-y-1.5 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between border-b border-indigo-200 pb-1">
                      <span className="text-[10.5px] font-bold text-indigo-950 flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                        Divisão de Pagamentos:
                      </span>
                      <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                        Math.abs(remainingToPay) < 0.01
                          ? 'bg-emerald-100 text-emerald-800'
                          : remainingToPay > 0
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-sky-100 text-sky-900'
                      }`}>
                        {Math.abs(remainingToPay) < 0.01
                          ? '✓ Total Fechado'
                          : remainingToPay > 0
                            ? `Falta: R$ ${remainingToPay.toFixed(2).replace('.', ',')}`
                            : `Troco: R$ ${changeAmount.toFixed(2).replace('.', ',')}`}
                      </span>
                    </div>

                    {/* Lista de formas adicionadas */}
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {splitPayments.map((sp, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white border border-indigo-200/80 rounded-md px-2 py-0.5 text-[10.5px]">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">
                              {sp.method === 'DINHEIRO' ? 'Dinheiro' :
                               sp.method === 'PIX' ? 'PIX' :
                               sp.method === 'CARTAO_DEBITO' ? 'Débito' :
                               sp.method === 'CARTAO_CREDITO' ? `Crédito (${sp.installments || 1}x)` :
                               sp.method === 'PROMISSORIA' || sp.method === 'A_PRAZO' ? 'Promissória' : sp.method}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={sp.amount}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setSplitPayments((prev) =>
                                   prev.map((item, i) => (i === idx ? { ...item, amount: val } : item))
                                );
                              }}
                              className="w-16 bg-slate-50 border border-slate-300 rounded px-1 py-0.5 text-right font-bold text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setSplitPayments((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-slate-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                              title="Remover esta forma"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botões rápidos para adicionar formas */}
                    <div className="flex items-center gap-1 pt-1 border-t border-indigo-200/60 flex-wrap">
                      <span className="text-[9.5px] text-slate-500 font-bold">Adicionar:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, remainingToPay);
                          setSplitPayments((prev) => [...prev, { method: 'DINHEIRO', amount: rem }]);
                        }}
                        className="bg-white hover:bg-indigo-100 border border-indigo-300 text-indigo-900 font-bold px-1 py-0.5 rounded text-[9.5px] cursor-pointer"
                      >
                        + Dinheiro
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, remainingToPay);
                          setSplitPayments((prev) => [...prev, { method: 'PIX', amount: rem }]);
                        }}
                        className="bg-white hover:bg-indigo-100 border border-indigo-300 text-indigo-900 font-bold px-1 py-0.5 rounded text-[9.5px] cursor-pointer"
                      >
                        + PIX
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, remainingToPay);
                          setSplitPayments((prev) => [...prev, { method: 'CARTAO_DEBITO', amount: rem }]);
                        }}
                        className="bg-white hover:bg-indigo-100 border border-indigo-300 text-indigo-900 font-bold px-1 py-0.5 rounded text-[9.5px] cursor-pointer"
                      >
                        + Débito
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, remainingToPay);
                          setSplitPayments((prev) => [...prev, { method: 'CARTAO_CREDITO', amount: rem, installments: 1 }]);
                        }}
                        className="bg-white hover:bg-indigo-100 border border-indigo-300 text-indigo-900 font-bold px-1 py-0.5 rounded text-[9.5px] cursor-pointer"
                      >
                        + Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, remainingToPay);
                          setSplitPayments((prev) => [...prev, { method: 'PROMISSORIA', amount: rem, installments: 1, dueDate: debtFirstDueDate }]);
                        }}
                        className="bg-amber-50 hover:bg-amber-100 border border-amber-400 text-amber-950 font-extrabold px-1 py-0.5 rounded text-[9.5px] cursor-pointer"
                      >
                        + Promissória
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. DESCONTO E OBSERVAÇÕES EM UMA LINHA */}
              <div className="grid grid-cols-3 gap-2 shrink-0">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Desconto (R$):</label>
                  <input
                    type="text"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-bold text-right"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Observações da Venda:</label>
                  <input
                    type="text"
                    placeholder="Garantia 90 dias, etc..."
                    value={saleNotes}
                    onChange={(e) => setSaleNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* 4. TOTAL E BOTÃO CONCLUIR COMPACTO */}
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-xl p-3 shadow-md space-y-1.5 shrink-0">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Subtotal: <strong>R$ {cartSubtotal.toFixed(2).replace('.', ',')}</strong></span>
                  {discountVal > 0 && (
                    <span className="text-emerald-400 font-semibold">Desc: -R$ {discountVal.toFixed(2).replace('.', ',')}</span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] text-slate-300">Vendedor:</span>
                    <select
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      className="bg-slate-800 text-emerald-300 border border-emerald-500/40 rounded-lg px-2 py-0.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer max-w-[130px] truncate"
                      title="Selecione o vendedor/atendente responsável por esta venda"
                    >
                      {availableSellers.map((name, idx) => (
                        <option key={idx} value={name} className="bg-slate-900 text-white font-semibold">
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t border-white/20 pt-1 flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Total a Pagar:</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    R$ {cartTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleSendWhatsAppText}
                    disabled={cart.length === 0}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      cart.length > 0
                        ? 'bg-emerald-800/50 hover:bg-emerald-700/70 text-emerald-200 border-emerald-500/50 hover:text-white'
                        : 'bg-slate-800/40 border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                    title="Enviar orçamento diretamente pelo WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleInitiateFinalizeSale}
                    disabled={cart.length === 0}
                    className={`flex-[2] py-2 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer ${
                      cart.length > 0
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/25 active:scale-98'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>CONCLUIR VENDA</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'SAVED_CARTS' ? (
          /* ABA DE CARRINHOS SALVOS / EM ESPERA */
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                  Carrinhos Salvos em Espera / Orçamentos Rápidos
                </h3>
                <p className="text-[11px] text-slate-500">
                  Carrinhos pausados para você recuperar e finalizar a venda a qualquer momento neste computador.
                </p>
              </div>

              <span className="font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-xl text-xs shadow-2xs">
                Total de Carrinhos Salvos: <strong>{savedCarts.length}</strong>
              </span>
            </div>

            {savedCarts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8">
                <Bookmark className="w-12 h-12 mb-3 stroke-[1.2] text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">Nenhum carrinho salvo no momento</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
                  Ao montar uma venda na aba "Nova Venda", clique no botão <strong>"Salvar Carrinho"</strong> para deixá-la em espera e atender outro cliente.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {savedCarts.map((sc) => {
                  const itemsCount = sc.items.reduce((acc, it) => acc + it.qty, 0);
                  const total = sc.items.reduce((acc, it) => acc + it.subtotal, 0) - (parseFloat(sc.discountInput.replace(',', '.')) || 0);

                  return (
                    <div
                      key={sc.id}
                      className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-3.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div>
                            <span className="font-extrabold text-slate-900 text-xs block">
                              {sc.label}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {sc.savedAt}
                            </span>
                          </div>

                          <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-lg text-[10px] shrink-0">
                            {itemsCount} {itemsCount === 1 ? 'item' : 'itens'}
                          </span>
                        </div>

                        {/* Cliente e Vendedor */}
                        <div className="mt-2 text-[11px] text-slate-600 space-y-0.5">
                          <div>
                            <span className="text-slate-400">Cliente: </span>
                            <strong className="text-slate-800">{sc.clientName}</strong>
                          </div>
                          {sc.sellerName && (
                            <div>
                              <span className="text-slate-400">Vendedor: </span>
                              <strong className="text-emerald-800">{sc.sellerName}</strong>
                            </div>
                          )}
                        </div>

                        {/* Resumo de itens */}
                        <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-2 max-h-24 overflow-y-auto space-y-1 text-[10.5px]">
                          {sc.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700">
                              <span className="truncate pr-2">
                                {it.qty}x {it.name}
                              </span>
                              <span className="font-semibold shrink-0">
                                R$ {it.subtotal.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Rodapé do Card */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total:</span>
                          <span className="font-black text-emerald-700 text-sm">
                            R$ {Math.max(0, total).toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Excluir Carrinho Salvo',
                                message: `Tem certeza que deseja excluir permanentemente "${sc.label}"?`,
                                variant: 'danger',
                              });
                              if (ok) {
                                setSavedCarts((prev) => prev.filter((item) => item.id !== sc.id));
                                try {
                                  await deleteDoc(doc(db, 'saved_carts', sc.id));
                                } catch (e) {
                                  console.warn('Erro ao excluir carrinho salvo da nuvem:', e);
                                }
                                if (activeSavedCartId === sc.id) {
                                  setActiveSavedCartId(null);
                                }
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir este carrinho salvo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (cart.length > 0) {
                                const ok = await confirm({
                                  title: 'Substituir Carrinho Atual',
                                  message: 'Existe uma venda em andamento no momento. Deseja carregar este carrinho salvo para continuar?',
                                  variant: 'warning',
                                });
                                if (!ok) return;
                              }

                              // Carrega carrinho salvo mantendo ele salvo na nuvem
                              setActiveSavedCartId(sc.id);
                              setCart(sc.items);
                              setSelectedClientId(sc.clientId || '');
                              setSelectedClientName(sc.clientName || 'Consumidor Final (Balcão)');
                              setSelectedClientPhone(sc.clientPhone || '');
                              setSelectedClientDoc(sc.clientDocument || '');
                              if (sc.sellerName) setSellerName(sc.sellerName);
                              setDiscountInput(sc.discountInput || '0');
                              setPaymentMethod((sc.paymentMethod as any) || 'DINHEIRO');
                              setCreditInstallments(sc.creditInstallments || 1);
                              setSaleNotes(sc.notes || '');

                              setActiveTab('POS');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Abrir Carrinho
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'HISTORY' ? (
          /* HISTÓRICO DE VENDAS */
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Buscar por código de venda, cliente ou vendedor..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <span className="font-bold text-slate-600 text-xs">
                Total de Vendas Realizadas: <strong>{salesHistory.length}</strong>
              </span>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-y-auto shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Data / Hora</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Itens Vendidos</th>
                    <th className="p-3">Pagamento</th>
                    <th className="p-3 text-right">Valor Total</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesHistory
                    .filter((s) => {
                      const t = historySearch.toLowerCase();
                      return (
                        s.saleCode.toLowerCase().includes(t) ||
                        s.clientName.toLowerCase().includes(t) ||
                        s.sellerName.toLowerCase().includes(t)
                      );
                    })
                    .map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-black text-emerald-800">{sale.saleCode}</td>
                        <td className="p-3 text-slate-600 font-medium">{sale.date} às {sale.time}</td>
                        <td className="p-3 font-bold text-slate-900">{sale.clientName}</td>
                        <td className="p-3 text-slate-600">
                          {sale.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px]">
                            {sale.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-right font-black text-emerald-700 text-xs">
                          R$ {sale.totalAmount.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReopenSaleForEdit(sale)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-2xs cursor-pointer transition-all text-xs"
                              title="Reabrir / Editar esta venda para adicionar ou remover itens"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => setViewingSaleDetails(sale)}
                              className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-2xs cursor-pointer transition-all text-xs"
                              title="Ver Detalhes Completos da Venda"
                            >
                              <Eye className="w-3.5 h-3.5 text-sky-600" />
                              Detalhes
                            </button>

                            <button
                              type="button"
                              onClick={() => setViewingSaleReceipt(sale)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-xs cursor-pointer transition-all text-xs"
                              title="Imprimir Comprovante / Recibo"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Recibo
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'CLIENT_DEBTS' ? (
          /* ABA CREDIÁRIO / VENDAS A PRAZO E NOTAS PROMISSÓRIAS */
          (() => {
            const todayStr = new Date().toISOString().split('T')[0];

            // Filtragem
            const filteredDebts = clientDebts.filter((d) => {
              const hasOverdue = d.installments.some((i) => i.status !== 'PAGO' && i.dueDate < todayStr);

              // Filtro de Status
              if (debtFilterStatus === 'PENDENTE' && d.status === 'QUITADO') return false;
              if (debtFilterStatus === 'QUITADO' && d.status !== 'QUITADO') return false;
              if (debtFilterStatus === 'VENCIDAS') {
                if (d.status === 'QUITADO') return false;
                if (!hasOverdue) return false;
              }

              // Busca de Texto
              if (debtSearch) {
                const term = debtSearch.toLowerCase();
                const matchClient = d.clientName.toLowerCase().includes(term);
                const matchSale = d.saleCode.toLowerCase().includes(term);
                const matchDoc = d.clientDocument && d.clientDocument.toLowerCase().includes(term);
                const matchPhone = d.clientPhone && d.clientPhone.toLowerCase().includes(term);
                if (!matchClient && !matchSale && !matchDoc && !matchPhone) return false;
              }

              // Filtro por Data
              if (debtStartDate || debtEndDate) {
                if (debtDateFilterType === 'EMISSAO') {
                  if (debtStartDate && d.date < debtStartDate) return false;
                  if (debtEndDate && d.date > debtEndDate) return false;
                } else {
                  const matchingInst = d.installments.some((inst) => {
                    if (debtStartDate && inst.dueDate < debtStartDate) return false;
                    if (debtEndDate && inst.dueDate > debtEndDate) return false;
                    return true;
                  });
                  if (!matchingInst) return false;
                }
              }

              return true;
            });

            // Paginação
            const totalItems = filteredDebts.length;
            const totalPages = Math.max(1, Math.ceil(totalItems / debtItemsPerPage));
            const validPage = Math.min(debtCurrentPage, totalPages);
            const startIndex = (validPage - 1) * debtItemsPerPage;
            const paginatedDebts = filteredDebts.slice(startIndex, startIndex + debtItemsPerPage);

            const pendingCount = clientDebts.filter((d) => d.status !== 'QUITADO').length;
            const overdueCount = clientDebts.filter((d) => {
              if (d.status === 'QUITADO') return false;
              return d.installments.some((i) => i.status !== 'PAGO' && i.dueDate < todayStr);
            }).length;
            const quitadoCount = clientDebts.filter((d) => d.status === 'QUITADO').length;
            const totalOpenAmount = clientDebts
              .filter((d) => d.status !== 'QUITADO')
              .reduce((sum, d) => sum + d.remainingAmount, 0);

            const hasActiveDateFilter = !!(debtStartDate || debtEndDate);

            return (
              <div className="flex-1 overflow-hidden flex flex-col bg-slate-50 p-2.5 space-y-2">
                {/* Barra Única Compacta: Busca + Status + Filtro de Data + Saldo Aberto */}
                <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                  {/* Busca Rápida */}
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <input
                      type="text"
                      placeholder="Buscar cliente, doc, fone ou venda..."
                      value={debtSearch}
                      onChange={(e) => {
                        setDebtSearch(e.target.value);
                        setDebtCurrentPage(1);
                      }}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-600 focus:bg-white"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>

                  {/* Status Chips */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setDebtFilterStatus('PENDENTE');
                        setDebtCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        debtFilterStatus === 'PENDENTE'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white/60'
                      }`}
                    >
                      Pendentes ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDebtFilterStatus('VENCIDAS');
                        setDebtCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                        debtFilterStatus === 'VENCIDAS'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-rose-700 hover:bg-white/60'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Vencidas ({overdueCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDebtFilterStatus('QUITADO');
                        setDebtCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        debtFilterStatus === 'QUITADO'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white/60'
                      }`}
                    >
                      Quitados ({quitadoCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDebtFilterStatus('ALL');
                        setDebtCurrentPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        debtFilterStatus === 'ALL'
                          ? 'bg-slate-800 text-white shadow-xs'
                          : 'text-slate-700 hover:bg-white/60'
                      }`}
                    >
                      Todos ({clientDebts.length})
                    </button>
                  </div>

                  {/* Botão Dropdown Filtro por Data */}
                  <div className="relative" ref={debtDateFilterContainerRef}>
                    <button
                      type="button"
                      onClick={() => setIsDebtDateFilterOpen((prev) => !prev)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all ${
                        hasActiveDateFilter
                          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                      }`}
                      title="Filtrar por data de vencimento ou emissão"
                    >
                      <Calendar className={`w-3.5 h-3.5 ${hasActiveDateFilter ? 'text-amber-600' : 'text-slate-500'}`} />
                      <span>
                        {hasActiveDateFilter
                          ? `${debtDateFilterType === 'VENCIMENTO' ? 'Venc:' : 'Emis:'} ${debtStartDate ? debtStartDate.split('-').reverse().slice(0, 2).join('/') : '...'} a ${debtEndDate ? debtEndDate.split('-').reverse().slice(0, 2).join('/') : '...'}`
                          : 'Filtrar Datas'}
                      </span>
                      {isDebtDateFilterOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Popover Compacto de Datas */}
                    {isDebtDateFilterOpen && (
                      <div className="absolute right-0 top-full mt-1 z-30 bg-white border border-slate-300 rounded-xl shadow-xl p-2.5 w-72 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <span className="font-bold text-[11px] text-slate-800 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-600" />
                            Filtrar por Data
                          </span>
                          {hasActiveDateFilter && (
                            <button
                              type="button"
                              onClick={() => {
                                setDebtStartDate('');
                                setDebtEndDate('');
                                setDebtCurrentPage(1);
                              }}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                            >
                              Limpar
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Tipo de Data:</label>
                          <select
                            value={debtDateFilterType}
                            onChange={(e) => {
                              setDebtDateFilterType(e.target.value as 'VENCIMENTO' | 'EMISSAO');
                              setDebtCurrentPage(1);
                            }}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800"
                          >
                            <option value="VENCIMENTO">Data de Vencimento</option>
                            <option value="EMISSAO">Data de Emissão</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">De:</label>
                            <input
                              type="date"
                              value={debtStartDate}
                              onChange={(e) => {
                                setDebtStartDate(e.target.value);
                                setDebtCurrentPage(1);
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Até:</label>
                            <input
                              type="date"
                              value={debtEndDate}
                              onChange={(e) => {
                                setDebtEndDate(e.target.value);
                                setDebtCurrentPage(1);
                              }}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setDebtStartDate(today);
                              setDebtEndDate(today);
                              setDebtDateFilterType('VENCIMENTO');
                              setDebtCurrentPage(1);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            Hoje
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
                              setDebtStartDate(firstDay);
                              setDebtEndDate(lastDay);
                              setDebtDateFilterType('VENCIMENTO');
                              setDebtCurrentPage(1);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            Este Mês
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const nextMonthFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
                              const nextMonthLast = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split('T')[0];
                              setDebtStartDate(nextMonthFirst);
                              setDebtEndDate(nextMonthLast);
                              setDebtDateFilterType('VENCIMENTO');
                              setDebtCurrentPage(1);
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            Próx. Mês
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsDebtDateFilterOpen(false)}
                            className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resumo Total em Aberto Compacto */}
                  <div className="bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg text-right shrink-0">
                    <span className="text-[9px] font-bold text-amber-800 uppercase inline mr-1">Em Aberto:</span>
                    <span className="font-black text-amber-900 font-mono text-xs">
                      R$ {totalOpenAmount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                {/* Tabela de Débitos com Vencimentos Explícitos */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-y-auto shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Cliente / Contato</th>
                        <th className="p-2.5">Venda / Emissão</th>
                        <th className="p-2.5">Vencimento</th>
                        <th className="p-2.5 text-right">Valor Total</th>
                        <th className="p-2.5 text-right">Pago</th>
                        <th className="p-2.5 text-right">Saldo Restante</th>
                        <th className="p-2.5 text-center">Parcelas</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedDebts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                            <p className="font-bold text-slate-600 text-xs">Nenhum registro de promissória encontrado</p>
                            <p className="text-[11px] text-slate-400">Ajuste os filtros de status ou datas acima.</p>
                          </td>
                        </tr>
                      ) : (
                        paginatedDebts.map((debt) => {
                          const nextPending = debt.installments.find((i) => i.status !== 'PAGO');
                          const isExpanded = expandedDebtId === debt.id;
                          const hasOverdue = debt.installments.some((i) => i.status !== 'PAGO' && i.dueDate < todayStr);

                          return (
                            <React.Fragment key={debt.id}>
                              <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-amber-50/30' : ''}`}>
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{debt.clientName}</span>
                                    {hasOverdue && debt.status !== 'QUITADO' && (
                                      <span className="bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[9px] px-1.5 py-0.2 rounded shrink-0">
                                        Vencida
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {debt.clientPhone && <span>Tel: {debt.clientPhone}</span>}
                                    {debt.clientPhone && debt.clientDocument && <span> • </span>}
                                    {debt.clientDocument && <span>Doc: {debt.clientDocument}</span>}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <div className="font-mono font-bold text-emerald-800">{debt.saleCode}</div>
                                  <div className="text-[10px] text-slate-500">Emissão: {debt.date.split('-').reverse().join('/')}</div>
                                </td>
                                <td className="p-2.5">
                                  {debt.status === 'QUITADO' ? (
                                    <div className="text-[11px] text-emerald-700 font-bold">
                                      Quitado
                                    </div>
                                  ) : nextPending ? (
                                    <div>
                                      <div className={`font-bold font-mono text-xs ${
                                        nextPending.dueDate < todayStr
                                          ? 'text-rose-700 font-black'
                                          : nextPending.dueDate === todayStr
                                            ? 'text-amber-700 font-black'
                                            : 'text-slate-800'
                                      }`}>
                                        {nextPending.dueDate.split('-').reverse().join('/')}
                                      </div>
                                      <div className="text-[9.5px] text-slate-500">
                                        {nextPending.dueDate < todayStr ? (
                                          <span className="text-rose-600 font-bold">Venceu (Parc. {nextPending.number})</span>
                                        ) : nextPending.dueDate === todayStr ? (
                                          <span className="text-amber-600 font-bold">Vence Hoje (Parc. {nextPending.number})</span>
                                        ) : (
                                          <span>Próx. Parcela {nextPending.number}/{debt.installments.length}</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right font-medium text-slate-700">
                                  R$ {debt.totalAmount.toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2.5 text-right font-bold text-emerald-700">
                                  R$ {debt.paidAmount.toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2.5 text-right font-mono font-black text-amber-800 text-xs">
                                  R$ {debt.remainingAmount.toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1 cursor-pointer transition-all border border-slate-200"
                                    title="Ver datas e valores de todas as parcelas"
                                  >
                                    <span>{debt.installments.filter((i) => i.status === 'PAGO').length}/{debt.installments.length} pagas</span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </button>
                                </td>
                                <td className="p-2.5 text-center">
                                  {debt.status === 'QUITADO' ? (
                                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded text-[10px]">
                                      Quitado
                                    </span>
                                  ) : hasOverdue ? (
                                    <span className="bg-rose-100 text-rose-900 border border-rose-300 font-bold px-2 py-0.5 rounded text-[10px]">
                                      Vencida
                                    </span>
                                  ) : debt.status === 'PARCIAL' ? (
                                    <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">
                                      Parcial
                                    </span>
                                  ) : (
                                    <span className="bg-slate-100 text-slate-800 border border-slate-300 font-bold px-2 py-0.5 rounded text-[10px]">
                                      Pendente
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {debt.status !== 'QUITADO' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedDebtToPay(debt);
                                          const nextP = debt.installments.find((i) => i.status !== 'PAGO');
                                          setSelectedInstallmentToPay(nextP || null);
                                          setReceiveDebtAmountInput(nextP ? (nextP.amount - nextP.paidAmount).toFixed(2) : debt.remainingAmount.toFixed(2));
                                          setReceiveDebtMethod('DINHEIRO');
                                          setIsReceiveDebtModalOpen(true);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 shadow-xs cursor-pointer transition-all text-xs"
                                        title="Receber parcela ou quitar valor deste débito"
                                      >
                                        <DollarSign className="w-3.5 h-3.5" />
                                        Receber
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleSendDebtWhatsApp(debt)}
                                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all text-xs"
                                      title="Enviar extrato de cobrança por WhatsApp"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                      WhatsApp
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handlePrintPromissoryNote(debt)}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all text-xs"
                                      title="Imprimir Nota Promissória / Carnê"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                                      Promissória
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Detalhamento Expandido de Cada Parcela / Vencimento */}
                              {isExpanded && (
                                <tr className="bg-amber-50/40 border-b border-amber-200/60">
                                  <td colSpan={9} className="p-3 pl-8">
                                    <div className="bg-white border border-amber-200 rounded-xl p-3 shadow-2xs space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                          Cronograma Detalhado de Vencimentos ({debt.installments.length} parcelas)
                                        </span>
                                        <span className="text-[10.5px] text-slate-500">
                                          Venda #{debt.saleCode} • Emitida em {debt.date.split('-').reverse().join('/')}
                                        </span>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {debt.installments.map((inst) => {
                                          const isPaid = inst.status === 'PAGO';
                                          const isOverdue = !isPaid && inst.dueDate < todayStr;
                                          const isToday = !isPaid && inst.dueDate === todayStr;

                                          return (
                                            <div
                                              key={inst.number}
                                              className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                                                isPaid
                                                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                                  : isOverdue
                                                    ? 'bg-rose-50 border-rose-300 text-rose-900 ring-1 ring-rose-200'
                                                    : isToday
                                                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-200'
                                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                              }`}
                                            >
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="font-extrabold text-[11px]">
                                                  Parcela {inst.number} de {debt.installments.length}
                                                </span>
                                                {isPaid ? (
                                                  <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
                                                    ✓ Paga
                                                  </span>
                                                ) : isOverdue ? (
                                                  <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
                                                    ⚠️ Vencida
                                                  </span>
                                                ) : isToday ? (
                                                  <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
                                                    ⏰ Vence Hoje
                                                  </span>
                                                ) : (
                                                  <span className="bg-slate-200/70 text-slate-700 font-bold px-1.5 py-0.2 rounded text-[9.5px]">
                                                    Em Aberto
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex items-baseline justify-between">
                                                <span className="text-[10.5px] text-slate-500">Vencimento:</span>
                                                <strong className="font-mono text-xs">
                                                  {inst.dueDate.split('-').reverse().join('/')}
                                                </strong>
                                              </div>

                                              <div className="flex items-baseline justify-between mt-0.5">
                                                <span className="text-[10.5px] text-slate-500">Valor:</span>
                                                <span className="font-mono font-bold text-xs">
                                                  R$ {inst.amount.toFixed(2).replace('.', ',')}
                                                </span>
                                              </div>

                                              {!isPaid && (
                                                <div className="mt-2 pt-1.5 border-t border-slate-200/60 flex justify-end">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setSelectedDebtToPay(debt);
                                                      setSelectedInstallmentToPay(inst);
                                                      setReceiveDebtAmountInput((inst.amount - inst.paidAmount).toFixed(2));
                                                      setReceiveDebtMethod('DINHEIRO');
                                                      setIsReceiveDebtModalOpen(true);
                                                    }}
                                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded text-[10.5px] flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                  >
                                                    <DollarSign className="w-3 h-3" />
                                                    Receber Parcela {inst.number}
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Barra de Paginação Inferior */}
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                    <span>
                      Exibindo <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> a <strong>{Math.min(startIndex + debtItemsPerPage, totalItems)}</strong> de <strong>{totalItems}</strong> registros
                    </span>
                    <span className="text-slate-300">•</span>
                    <div className="flex items-center gap-1">
                      <span>Por página:</span>
                      <select
                        value={debtItemsPerPage}
                        onChange={(e) => {
                          setDebtItemsPerPage(Number(e.target.value));
                          setDebtCurrentPage(1);
                        }}
                        className="bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {/* Controles de Página */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={validPage <= 1}
                        onClick={() => setDebtCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="Página Anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === totalPages || Math.abs(p - validPage) <= 2)
                          .map((p, idx, arr) => {
                            const prevP = arr[idx - 1];
                            const showEllipsis = prevP && p - prevP > 1;

                            return (
                              <React.Fragment key={p}>
                                {showEllipsis && <span className="px-1 text-slate-400 text-xs">...</span>}
                                <button
                                  type="button"
                                  onClick={() => setDebtCurrentPage(p)}
                                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    validPage === p
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {p}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        disabled={validPage >= totalPages}
                        onClick={() => setDebtCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        title="Próxima Página"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ) : null}

        {/* MODAL DE DETALHES COMPLETOS DA VENDA */}
        {viewingSaleDetails && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-sans max-h-[92vh] animate-fadeIn">
              {/* Header do Modal */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-500/20 border border-sky-400/40 rounded-xl text-sky-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">
                        Detalhes da Venda {viewingSaleDetails.saleCode}
                      </h3>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40">
                        Concluída
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Realizada em {viewingSaleDetails.date} às {viewingSaleDetails.time}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingSaleDetails(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo dos Detalhes */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 text-xs">
                {/* Cards de Resumo Rápido */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Código Venda</span>
                    <strong className="text-emerald-800 font-mono text-xs">{viewingSaleDetails.saleCode}</strong>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Data / Hora</span>
                    <strong className="text-slate-800 text-xs">{viewingSaleDetails.date} {viewingSaleDetails.time}</strong>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Forma Pgto</span>
                    <strong className="text-sky-800 text-xs truncate block">{viewingSaleDetails.paymentMethod}</strong>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Valor Total</span>
                    <strong className="text-emerald-700 font-mono text-sm font-extrabold block">
                      R$ {viewingSaleDetails.totalAmount.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                </div>

                {/* Cliente e Vendedor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-sky-600" /> Destinatário / Cliente
                    </span>
                    <div className="font-bold text-slate-900 text-xs">{viewingSaleDetails.clientName || 'Consumidor Final (Balcão)'}</div>
                    {viewingSaleDetails.clientPhone && (
                      <div className="text-slate-600 text-[11px]">Telefone/Whats: {viewingSaleDetails.clientPhone}</div>
                    )}
                    {viewingSaleDetails.clientDocument && (
                      <div className="text-slate-600 text-[11px]">CPF/CNPJ: {viewingSaleDetails.clientDocument}</div>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-emerald-600" /> Vendedor Responsável
                    </span>
                    <div className="font-bold text-slate-900 text-xs">{viewingSaleDetails.sellerName || 'Atendente Balcão'}</div>
                    <div className="text-slate-500 text-[11px]">Módulo: Balcão de Vendas Diretas</div>
                  </div>
                </div>

                {/* Tabela de Itens Vendidos */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                      Itens Discriminados da Venda ({viewingSaleDetails.items.reduce((a, b) => a + b.qty, 0)} un.)
                    </span>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">Código / Descrição do Item</th>
                        <th className="p-2.5 text-center w-16">Qtd</th>
                        <th className="p-2.5 text-right w-24">Valor Unit.</th>
                        <th className="p-2.5 text-right w-24">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingSaleDetails.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2.5">
                            <div className="font-bold text-slate-900">{it.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10.5px]">
                              <span className="font-mono text-slate-500">Cód: #{it.code}</span>
                              {it.application && (
                                <span className="text-slate-600 bg-slate-100 px-1 rounded truncate max-w-xs">
                                  Ref: {it.application}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-800">{it.qty}</td>
                          <td className="p-2.5 text-right font-medium text-slate-700">
                            R$ {it.unitPrice.toFixed(2).replace('.', ',')}
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">
                            R$ {it.subtotal.toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                      {viewingSaleDetails.discountAmount > 0 && (
                        <>
                          <tr>
                            <td colSpan={3} className="p-2 text-right text-slate-600">Subtotal sem Desconto:</td>
                            <td className="p-2 text-right font-mono text-slate-800">
                              R$ {viewingSaleDetails.subtotal.toFixed(2).replace('.', ',')}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="p-2 text-right text-red-600">Desconto Aplicado:</td>
                            <td className="p-2 text-right font-mono text-red-600">
                              - R$ {viewingSaleDetails.discountAmount.toFixed(2).replace('.', ',')}
                            </td>
                          </tr>
                        </>
                      )}
                      <tr className="bg-emerald-50/80 text-emerald-950">
                        <td colSpan={3} className="p-2.5 text-right font-extrabold text-xs">TOTAL FINAL DA VENDA:</td>
                        <td className="p-2.5 text-right font-black text-sm text-emerald-700">
                          R$ {viewingSaleDetails.totalAmount.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Observações da Venda se houver */}
                {viewingSaleDetails.notes && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Observações da Venda:</span>
                    <p className="text-slate-800 font-medium text-xs whitespace-pre-wrap">{viewingSaleDetails.notes}</p>
                  </div>
                )}
              </div>

              {/* Rodapé com Ações */}
              <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewingSaleDetails(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs"
                >
                  Fechar
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sale = viewingSaleDetails;
                      setViewingSaleDetails(null);
                      handleReopenSaleForEdit(sale);
                    }}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                    title="Reabrir esta venda na tela de vendas para adicionar ou remover itens"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar / Reabrir Venda
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendReceiptWhatsApp(viewingSaleDetails)}
                    className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs border border-emerald-600"
                    title="Enviar comprovante desta venda por WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-300" />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const sale = viewingSaleDetails;
                      setViewingSaleDetails(null);
                      setViewingSaleReceipt(sale);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Comprovante
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO DO COMPROVANTE DE VENDA */}
        {viewingSaleReceipt && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:z-auto">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
              {/* Topo Modal Impressão */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-xs text-white">
                    Comprovante de Venda de Peças (#{viewingSaleReceipt.saleCode})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingSaleReceipt(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Folha do Comprovante A4 / Meia Folha / Cupom Térmico */}
              <div className="p-4 overflow-y-auto flex-1 bg-slate-100 flex justify-center print:p-0 print:bg-white" id="sale-print-area">
                <div
                  className={`bg-white border border-slate-300 p-4 rounded-xl shadow-xs text-xs text-slate-800 space-y-3 print:border-none print:shadow-none print:p-0 ${
                    printerConfig.salesReceiptFormat === 'THERMAL_58MM'
                      ? 'max-w-[280px] w-full font-mono text-[10.5px]'
                      : printerConfig.salesReceiptFormat === 'THERMAL_80MM'
                        ? 'max-w-[360px] w-full font-mono text-[11px]'
                        : printerConfig.salesReceiptFormat === 'A4_HALF'
                          ? 'max-w-md w-full'
                          : 'max-w-xl w-full'
                  }`}
                >
                  {/* Topo da Empresa */}
                  <div className="border-b border-slate-200 pb-2.5 text-center">
                    {companyInfo?.logoUrl && (
                      <img src={companyInfo.logoUrl} alt="Logo" className="h-9 mx-auto mb-1.5 object-contain" />
                    )}
                    <h4 className="font-black text-sm uppercase text-slate-900 leading-tight">
                      {companyInfo?.tradingName || companyInfo?.name || 'Vollen Assistência Técnica'}
                    </h4>
                    <p className="text-[10px] text-slate-500">
                      {companyInfo?.cnpj ? `CNPJ: ${companyInfo.cnpj} • ` : ''}
                      {companyInfo?.phone || companyInfo?.whatsapp || ''}
                    </p>
                    <div className="mt-1.5 inline-block bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-black px-2.5 py-0.5 rounded text-[11px]">
                      COMPROVANTE DE VENDA #{viewingSaleReceipt.saleCode}
                    </div>
                  </div>

                  {/* Detalhes da Venda */}
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] border-b border-slate-200 pb-2.5">
                    <div>
                      <span className="text-slate-500 block">Cliente:</span>
                      <strong className="text-slate-900">{viewingSaleReceipt.clientName}</strong>
                      {viewingSaleReceipt.clientPhone && (
                        <span className="text-slate-600 block">{viewingSaleReceipt.clientPhone}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block">Data / Hora:</span>
                      <strong className="text-slate-900">{viewingSaleReceipt.date} às {viewingSaleReceipt.time}</strong>
                      <span className="text-slate-600 block">Vendedor: {viewingSaleReceipt.sellerName}</span>
                    </div>
                  </div>

                  {/* Tabela de Itens */}
                  <div>
                    <span className="font-bold text-slate-900 text-[11px] block mb-1">Itens Vendidos:</span>
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead className="bg-slate-100 font-bold text-slate-700 border-y border-slate-200">
                        <tr>
                          <th className="py-1 px-1">Item</th>
                          <th className="py-1 px-1 text-center">Qtd</th>
                          <th className="py-1 px-1 text-right">Unit.</th>
                          <th className="py-1 px-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingSaleReceipt.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-1 px-1 font-medium leading-tight">
                              <div>{item.name}</div>
                              {item.application && (
                                <div className="text-[9.5px] text-slate-500 italic">Ref: {item.application}</div>
                              )}
                            </td>
                            <td className="py-1 px-1 text-center font-bold">{item.qty}</td>
                            <td className="py-1 px-1 text-right">R$ {item.unitPrice.toFixed(2).replace('.', ',')}</td>
                            <td className="py-1 px-1 text-right font-black text-slate-900">R$ {item.subtotal.toFixed(2).replace('.', ',')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totais */}
                  <div className="border-t border-slate-200 pt-2 space-y-1 text-right text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="font-semibold">R$ {viewingSaleReceipt.subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {viewingSaleReceipt.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Desconto:</span>
                        <span>- R$ {viewingSaleReceipt.discountAmount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-200 pt-1">
                      <span>TOTAL DA VENDA:</span>
                      <span className="text-emerald-800 text-sm font-mono font-black">
                        R$ {viewingSaleReceipt.totalAmount.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-700 mt-1 font-semibold text-left">
                      Forma de Pagamento:{' '}
                      <strong className="text-slate-900">
                        {viewingSaleReceipt.paymentMethod === 'CARTAO_CREDITO' && viewingSaleReceipt.installments && viewingSaleReceipt.installments > 1
                          ? `Cartão de Crédito (${viewingSaleReceipt.installments}x de R$ ${(viewingSaleReceipt.totalAmount / viewingSaleReceipt.installments).toFixed(2).replace('.', ',')})`
                          : viewingSaleReceipt.paymentMethod === 'CARTAO_CREDITO'
                            ? 'Cartão de Crédito à Vista (1x)'
                            : viewingSaleReceipt.paymentMethod}
                      </strong>
                    </div>
                  </div>

                  {/* Termos e Assinatura (Conforme Configurações de Impressão) */}
                  {(printerConfig.printSaleWarrantyTerms !== false || printerConfig.printSaleSignatureLine !== false) && (
                    <div className="border-t border-slate-200 pt-2.5 text-center space-y-3">
                      {printerConfig.printSaleWarrantyTerms !== false && (
                        <p className="text-[9px] text-slate-500 leading-tight">
                          * As peças vendidas possuem garantia legal contra defeitos de fabricação pelo período de 90 dias a contar da data de emissão deste comprovante, mediante apresentação do mesmo.
                        </p>
                      )}
                      {printerConfig.printSaleSignatureLine !== false && (
                        <div>
                          <div className="border-b border-slate-400 w-3/4 mx-auto pt-3"></div>
                          <span className="text-[9.5px] font-bold text-slate-700 block mt-1">Assinatura da Empresa / Balcão</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mensagem de Rodapé (Cupom) */}
                  {printerConfig.thermalFooterMessage && (
                    <div className="text-center text-[9px] text-slate-500 border-t border-dashed border-slate-200 pt-1.5">
                      {printerConfig.thermalFooterMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Botões Rodapé */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center gap-2 print:hidden">
                <span className="text-[11px] text-slate-500 font-semibold">
                  Modelo: <strong className="text-emerald-700">
                    {printerConfig.salesReceiptFormat === 'THERMAL_80MM'
                      ? 'Cupom 80mm'
                      : printerConfig.salesReceiptFormat === 'THERMAL_58MM'
                        ? 'Cupom 58mm'
                        : printerConfig.salesReceiptFormat === 'A4_HALF'
                          ? 'Meia Folha (A5)'
                          : 'Folha A4 Completa'}
                  </strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingSaleReceipt(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendReceiptWhatsApp(viewingSaleReceipt)}
                    className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer text-xs border border-emerald-600"
                    title="Enviar este comprovante por WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-300" />
                    Enviar WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(viewingSaleReceipt)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-md cursor-pointer text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Comprovante
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* MODAL COMPLETO DE BUSCA E SELEÇÃO DE CLIENTES CADASTRADOS */}
        {isSearchClientModalOpen && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-3xl h-[80vh] shadow-2xl overflow-hidden flex flex-col font-sans">
              {/* Topo do Modal de Clientes */}
              <div className="p-3.5 bg-gradient-to-r from-sky-900 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-sky-400" />
                  <h3 className="font-bold text-sm text-white">
                    Selecionar Cliente Cadastrado ({clients.length} no total)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {onOpenCreateClient && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCreateClient();
                      }}
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all border border-sky-400/40"
                      title="Cadastrar um novo cliente no sistema"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Cadastrar Novo Cliente</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSearchClientModalOpen(false)}
                    className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Barra de Pesquisa de Cliente */}
              <div className="p-3 bg-slate-100 border-b border-slate-200">
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Digite o nome do cliente, CPF, CNPJ, telefone ou cidade..."
                    value={clientSearchFilter}
                    onChange={(e) => setClientSearchFilter(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Tabela de Todos os Clientes */}
              <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
                {filteredClients.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                    <User className="w-10 h-10 mb-2 stroke-[1.2] text-slate-300" />
                    <p className="font-bold text-slate-600 text-xs">Nenhum cliente encontrado</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                      Verifique os termos digitados na busca ou cadastre um novo cliente.
                    </p>
                    {onOpenCreateClient && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenCreateClient();
                        }}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Cadastrar Novo Cliente Agora
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Nome do Cliente</th>
                          <th className="p-2.5">Telefone / WhatsApp</th>
                          <th className="p-2.5">CPF / CNPJ</th>
                          <th className="p-2.5">Cidade</th>
                          <th className="p-2.5 text-center w-24">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredClients.map((client) => (
                          <tr
                            key={client.id}
                            className="hover:bg-sky-50/70 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setSelectedClientName(client.name);
                              setSelectedClientPhone(client.phone || client.whatsapp || '');
                              setSelectedClientDoc(client.cpf || client.cnpj || '');
                              setIsSearchClientModalOpen(false);

                              if (client.hasRestriction) {
                                alert(`⚠️ ATENÇÃO: ESTE CLIENTE POSSUI RESTRIÇÃO CADASTRAL!\n\nCliente: ${client.name}\nMotivo: ${client.restrictionReason || 'Sem motivo especificado'}`);
                              }

                              // Atualiza os itens do carrinho para o tipo de preço correto (Técnico vs Consumidor)
                              setCart((prevCart) =>
                                prevCart.map((item) => {
                                  const matchedPart = (parts || []).find((p) => p.id === item.partId || p.code === item.code);
                                  if (matchedPart) {
                                    const targetPrice = (client.isTechnician && matchedPart.techPrice)
                                      ? matchedPart.techPrice
                                      : (matchedPart.finalPrice || '0');
                                    const numVal = parseFloat(String(targetPrice).replace(/\./g, '').replace(',', '.')) || 0;
                                    if (numVal > 0) {
                                      return {
                                        ...item,
                                        unitPrice: numVal,
                                        subtotal: numVal * item.qty,
                                      };
                                    }
                                  }
                                  return item;
                                })
                              );
                            }}
                          >
                            <td className="p-2.5 font-bold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <span>{client.name}</span>
                                {client.hasRestriction && (
                                  <span
                                    className="bg-rose-100 border border-rose-300 text-rose-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0"
                                    title={`Motivo: ${client.restrictionReason || 'Restrição ativa'}`}
                                  >
                                    ⚠️ Restrição
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-slate-600 font-medium">{client.phone || client.whatsapp || '-'}</td>
                            <td className="p-2.5 text-slate-600 font-mono">{client.cpf || client.cnpj || '-'}</td>
                            <td className="p-2.5 text-slate-600">{client.city || '-'}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1 rounded-lg shadow-xs cursor-pointer text-[11px]"
                              >
                                Selecionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                <span>Exibindo {filteredClients.length} de {clients.length} cliente(s)</span>
                <button
                  type="button"
                  onClick={() => setIsSearchClientModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL PARA SALVAR CARRINHO EM ESPERA */}
        {isSaveCartModalOpen && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col font-sans">
              <div className="p-3.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-200" />
                  <h3 className="font-bold text-sm text-white">Salvar Carrinho em Espera</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSaveCartModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-600">
                  Dê um nome ou identificador para este carrinho para localizá-lo com facilidade mais tarde:
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nome / Identificação do Carrinho:
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Ex: João - Troca de tela, Mesa 2, Orçamento WhatsApp..."
                    value={saveCartLabelInput}
                    onChange={(e) => setSaveCartLabelInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const label = saveCartLabelInput.trim() || `Carrinho ${savedCarts.length + 1}`;
                        const now = new Date();
                        const cartId = activeSavedCartId || `cart_${Date.now()}`;
                        const newSavedCart: SavedCart = {
                          id: cartId,
                          label,
                          savedAt: `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`,
                          clientId: selectedClientId,
                          clientName: selectedClientName,
                          clientPhone: selectedClientPhone,
                          clientDocument: selectedClientDoc,
                          sellerName: sellerName || currentUser?.name || currentUser?.username || 'Balcão',
                          items: [...cart],
                          subtotal: cartSubtotal,
                          discountInput,
                          paymentMethod,
                          creditInstallments,
                          notes: saleNotes,
                        };

                        setSavedCarts((prev) => {
                          const filtered = prev.filter((item) => item.id !== cartId);
                          return [newSavedCart, ...filtered];
                        });

                        // Sincroniza em Rede / Nuvem (Firestore)
                        if (db) {
                          try {
                            await setDoc(doc(db, 'saved_carts', cartId), newSavedCart, { merge: true });
                          } catch (err) {
                            console.warn('Erro ao salvar carrinho na nuvem:', err);
                          }
                        }

                        setCart([]);
                        try {
                          localStorage.removeItem('vollen_local_sales_cart');
                        } catch {}
                        setActiveSavedCartId(null);
                        setIsSaveCartModalOpen(false);
                        setSelectedClientId('');
                        setSelectedClientName('Consumidor Final (Balcão)');
                        setSelectedClientPhone('');
                        setSelectedClientDoc('');
                        setDiscountInput('0');
                        setSaleNotes('');
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 focus:bg-white"
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-[11px] text-amber-900 space-y-1">
                  <div><strong>Total do Carrinho:</strong> R$ {cartTotal.toFixed(2).replace('.', ',')}</div>
                  <div><strong>Itens:</strong> {cart.length} peça(s) ({cart.reduce((a, b) => a + b.qty, 0)} unid.)</div>
                  <div><strong>Cliente:</strong> {selectedClientName}</div>
                  <div><strong>Vendedor:</strong> {sellerName}</div>
                  {activeSavedCartId && (
                    <div className="text-amber-800 font-bold bg-amber-100/70 p-1 rounded mt-1 border border-amber-300">
                      ℹ Este carrinho já estava salvo e será atualizado com as novas peças.
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSaveCartModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const label = saveCartLabelInput.trim() || `Carrinho ${savedCarts.length + 1}`;
                    const now = new Date();
                    const cartId = activeSavedCartId || `cart_${Date.now()}`;
                    const newSavedCart: SavedCart = {
                      id: cartId,
                      label,
                      savedAt: `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`,
                      clientId: selectedClientId,
                      clientName: selectedClientName,
                      clientPhone: selectedClientPhone,
                      clientDocument: selectedClientDoc,
                      sellerName: sellerName || currentUser?.name || currentUser?.username || 'Balcão',
                      items: [...cart],
                      subtotal: cartSubtotal,
                      discountInput,
                      paymentMethod,
                      creditInstallments,
                      notes: saleNotes,
                    };

                    setSavedCarts((prev) => {
                      const filtered = prev.filter((item) => item.id !== cartId);
                      return [newSavedCart, ...filtered];
                    });

                    // Sincroniza em Rede / Nuvem (Firestore)
                    if (db) {
                      try {
                        await setDoc(doc(db, 'saved_carts', cartId), newSavedCart, { merge: true });
                      } catch (err) {
                        console.warn('Erro ao salvar carrinho na nuvem:', err);
                      }
                    }

                    setCart([]);
                    try {
                      localStorage.removeItem('vollen_local_sales_cart');
                    } catch {}
                    setActiveSavedCartId(null);
                    setIsSaveCartModalOpen(false);
                    setSelectedClientId('');
                    setSelectedClientName('Consumidor Final (Balcão)');
                    setSelectedClientPhone('');
                    setSelectedClientDoc('');
                    setDiscountInput('0');
                    setSaleNotes('');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {activeSavedCartId ? 'Atualizar e Sobrescrever' : 'Salvar em Espera'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMAÇÃO DE CONCLUSÃO DA VENDA */}
        {isConfirmFinalizeModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Finalizar Venda</h3>
                    <p className="text-xs text-slate-400">Confirme a forma de conclusão desta venda</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmFinalizeModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body / Resumo da Venda */}
              <div className="p-6 space-y-4">
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Cliente:</span>
                    <span className="font-bold text-white text-right max-w-[260px] truncate">
                      {selectedClientName || 'Consumidor Final (Balcão)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Pagamento:</span>
                    <span className="font-semibold text-slate-200">
                      {paymentMethod === 'CARTAO_CREDITO'
                        ? `Crédito (${creditInstallments}x)`
                        : paymentMethod === 'CARTAO_DEBITO'
                        ? 'Débito'
                        : paymentMethod === 'DINHEIRO'
                        ? 'Dinheiro'
                        : paymentMethod === 'PIX'
                        ? 'PIX'
                        : paymentMethod}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Quantidade de Itens:</span>
                    <span className="font-semibold text-slate-200">
                      {cart.reduce((sum, i) => sum + i.qty, 0)} {cart.reduce((sum, i) => sum + i.qty, 0) === 1 ? 'item' : 'itens'} ({cart.length} {cart.length === 1 ? 'produto' : 'produtos'})
                    </span>
                  </div>

                  {discountVal > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Desconto Aplicado:</span>
                      <span className="font-semibold text-rose-400">
                        - R$ {discountVal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-300">Total a Pagar:</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono">
                      R$ {cartTotal.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 text-center font-medium">
                  Selecione se deseja emitir o comprovante para impressão ou apenas concluir:
                </p>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsConfirmFinalizeModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={() => executeFinalizeSale(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apenas Concluir</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeFinalizeSale(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98"
                >
                  <Printer className="w-4 h-4" />
                  <span>Concluir e Imprimir</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL DE RECEBIMENTO / QUITAÇÃO DE CREDIÁRIO */}
        {isReceiveDebtModalOpen && selectedDebtToPay && (
          <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-emerald-800 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Receber Débito / Parcela</h3>
                    <p className="text-[11px] text-emerald-200">
                      Cliente: <strong>{selectedDebtToPay.clientName}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiveDebtModalOpen(false);
                    setSelectedDebtToPay(null);
                    setSelectedInstallmentToPay(null);
                  }}
                  className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 overflow-y-auto space-y-3.5 bg-slate-50 text-xs">
                {/* Resumo da Dívida */}
                <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Original</span>
                    <strong className="text-slate-800 font-mono text-xs">
                      R$ {selectedDebtToPay.totalAmount.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Já Pago</span>
                    <strong className="text-emerald-700 font-mono text-xs">
                      R$ {selectedDebtToPay.paidAmount.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Saldo Devedor</span>
                    <strong className="text-amber-800 font-mono text-sm font-black">
                      R$ {selectedDebtToPay.remainingAmount.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                </div>

                {/* Lista de Parcelas */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Selecione a Parcela para Quitar:
                  </label>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {selectedDebtToPay.installments.map((inst) => {
                      const isSelected = selectedInstallmentToPay?.number === inst.number;
                      const instRemaining = Math.max(0, inst.amount - inst.paidAmount);

                      return (
                        <div
                          key={inst.number}
                          onClick={() => {
                            if (inst.status !== 'PAGO') {
                              setSelectedInstallmentToPay(inst);
                              setReceiveDebtAmountInput(instRemaining.toFixed(2));
                            }
                          }}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                            inst.status === 'PAGO'
                              ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                              : isSelected
                                ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-1 ring-emerald-500'
                                : 'bg-white border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              Parcela {inst.number}/{selectedDebtToPay.installments.length}
                            </span>
                            <span className="text-[10.5px] text-slate-500">
                              Vencimento: {inst.dueDate.split('-').reverse().join('/')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-800">
                              R$ {inst.amount.toFixed(2).replace('.', ',')}
                            </span>
                            {inst.status === 'PAGO' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Paga
                              </span>
                            ) : inst.paidAmount > 0 ? (
                              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Parcial (Falta R$ {instRemaining.toFixed(2).replace('.', ',')})
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                Pendente
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Valor do Pagamento e Forma */}
                <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      Valor a Receber (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={receiveDebtAmountInput}
                      onChange={(e) => setReceiveDebtAmountInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 font-mono text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-700 mb-1">
                      Forma de Pagamento:
                    </label>
                    <select
                      value={receiveDebtMethod}
                      onChange={(e) => setReceiveDebtMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="DINHEIRO">💵 Dinheiro</option>
                      <option value="PIX">⚡ PIX</option>
                      <option value="CARTAO_DEBITO">💳 Cartão Débito</option>
                      <option value="CARTAO_CREDITO">💳 Cartão Crédito</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-500 italic">
                  * Este recebimento será automaticamente lançado como entrada no <strong>Fluxo de Caixa / Caixa Balcão</strong> com a forma de pagamento selecionada.
                </p>
              </div>

              {/* Rodapé */}
              <div className="p-3 bg-white border-t border-slate-200 flex justify-end items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsReceiveDebtModalOpen(false);
                    setSelectedDebtToPay(null);
                    setSelectedInstallmentToPay(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleReceiveDebtPayment}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-md cursor-pointer text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Recebimento
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};
