import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  Search,
  Filter,
  Save,
  FileText,
  User,
  Building2,
  TrendingDown,
  TrendingUp,
  Receipt,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';
import { matchesSearchTerm } from '../utils/searchUtils';
import { SupplierItem } from './SuppliersModal';

export type AccountType = 'PAGAR' | 'RECEBER';
export type AccountStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO';

export interface AccountBill {
  id: string;
  type: AccountType; // PAGAR ou RECEBER
  description: string; // Descrição / Referência da Conta
  entityName: string; // Fornecedor (Pagar) ou Cliente (Receber)
  entityId?: string; // ID do Fornecedor ou Cliente
  documentNumber?: string; // Nº Nota / Documento / Boleto
  category?: string; // Categoria (Peças, Aluguel, Água/Luz, Serviços, Venda, etc.)
  amount: number; // Valor Total Previsto
  amountPaid?: number; // Valor Efetivamente Pago / Recebido
  dueDate: string; // Data de Vencimento YYYY-MM-DD
  paymentDate?: string; // Data do Pagamento / Quitação YYYY-MM-DD
  paymentMethod?: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'BOLETO' | 'TRANSFERENCIA' | 'OUTROS';
  status: AccountStatus;
  notes?: string;
  orderCode?: string; // Vinculação com OS se aplicável
  createdAt?: string;
  updatedAt?: string;
}

interface AccountsModalProps {
  isOpen: boolean;
  initialType?: AccountType;
  currentUser?: any;
  suppliers?: SupplierItem[];
  clients?: any[];
  onClose: () => void;
}

export const AccountsModal: React.FC<AccountsModalProps> = ({
  isOpen,
  initialType = 'PAGAR',
  currentUser,
  suppliers = [],
  clients = [],
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AccountType>(initialType);
  const [bills, setBills] = useState<AccountBill[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_accounts_bills');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTES_E_VENCIDOS' | 'PENDENTE' | 'PAGO' | 'VENCIDO'>('TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 25; // Padrão A4: 25 lançamentos por página
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<AccountBill | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const [formData, setFormData] = useState<{
    description: string;
    entityName: string;
    entityId: string;
    documentNumber: string;
    category: string;
    amount: string;
    dueDate: string;
    paymentMethod: AccountBill['paymentMethod'];
    notes: string;
  }>({
    description: '',
    entityName: '',
    entityId: '',
    documentNumber: '',
    category: 'Geral',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'PIX',
    notes: '',
  });

  const [paymentFormData, setPaymentFormData] = useState<{
    paymentDate: string;
    amountPaid: string;
    paymentMethod: AccountBill['paymentMethod'];
    notes: string;
  }>({
    paymentDate: new Date().toISOString().split('T')[0],
    amountPaid: '',
    paymentMethod: 'DINHEIRO',
    notes: '',
  });

  // Atualiza a aba inicial sempre que abrir
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialType);
      setSelectedBillId(null);
      setIsFormOpen(false);
      setIsPaymentModalOpen(false);
    }
  }, [isOpen, initialType]);

  // Carrega e sincroniza com Firebase / localStorage
  const loadLocalBills = () => {
    try {
      const saved = localStorage.getItem('vollen_accounts_bills');
      if (saved) {
        const parsed = JSON.parse(saved);
        setBills(Array.isArray(parsed) ? parsed : []);
      } else {
        setBills([]);
      }
    } catch {
      setBills([]);
    }
  };

  useEffect(() => {
    loadLocalBills();
    const handleStorage = () => loadLocalBills();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    loadLocalBills();

    if (!db) return;
    try {
      const colRef = collection(db, 'accounts_bills');
      const unsub = onSnapshot(colRef, (snap) => {
        const cloudBills: AccountBill[] = [];
        snap.forEach((docSnap) => {
          cloudBills.push({ ...(docSnap.data() as AccountBill), id: docSnap.id });
        });
        setBills(cloudBills);
        if (cloudBills.length > 0) {
          localStorage.setItem('vollen_accounts_bills', JSON.stringify(cloudBills));
        } else {
          localStorage.removeItem('vollen_accounts_bills');
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('Erro ao conectar Firestore para Contas:', e);
    }
  }, [isOpen]);

  const saveBillsToStorage = async (newBills: AccountBill[]) => {
    setBills(newBills);
    localStorage.setItem('vollen_accounts_bills', JSON.stringify(newBills));
    if (db) {
      try {
        for (const b of newBills) {
          await setDoc(doc(db, 'accounts_bills', b.id), b, { merge: true });
        }
      } catch (err) {
        console.warn('Erro ao salvar conta na nuvem:', err);
      }
    }
  };

  // Gerenciamento de Fechamento Seguro (ESC / Stack)
  const handleRequestCloseForm = async () => {
    if (isDirty) {
      const ok = await dlgConfirm({
        title: 'Sair sem Salvar?',
        message: 'Existem informações não salvas no formulário. Deseja descartar as alterações?',
        variant: 'warning',
        confirmText: 'Descartar e Sair',
      });
      if (ok) {
        setIsDirty(false);
        setIsFormOpen(false);
      }
    } else {
      setIsFormOpen(false);
    }
  };

  const handleRequestCloseMain = () => {
    if (isFormOpen) {
      handleRequestCloseForm();
    } else if (isPaymentModalOpen) {
      setIsPaymentModalOpen(false);
    } else {
      onClose();
    }
  };

  const handleRequestCloseMainRef = useRef(handleRequestCloseMain);
  handleRequestCloseMainRef.current = handleRequestCloseMain;

  useEffect(() => {
    if (isOpen) {
      modalStack.register('AccountsModal', () => {
        handleRequestCloseMainRef.current();
      });
      return () => modalStack.unregister('AccountsModal');
    }
  }, [isOpen]);

  // Tecla de atalho F2 para nova conta
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2' && !isFormOpen && !isPaymentModalOpen) {
        e.preventDefault();
        handleOpenCreate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFormOpen, isPaymentModalOpen, activeTab]);

  // Atualização dinâmica de status baseado em data atual
  const todayStr = new Date().toISOString().split('T')[0];

  const processedBills = bills.map((b) => {
    if (b.status === 'PAGO' || b.status === 'CANCELADO') return b;
    if (b.dueDate && b.dueDate < todayStr) {
      return { ...b, status: 'VENCIDO' as AccountStatus };
    }
    return { ...b, status: 'PENDENTE' as AccountStatus };
  });

  // Filtros
  const filteredBills = processedBills.filter((b) => {
    if (b.type !== activeTab) return false;

    // Filtro por mês
    if (selectedMonth && b.dueDate && !b.dueDate.startsWith(selectedMonth)) {
      // Se não tem mês selecionado ou não bate, filtra fora
      return false;
    }

    // Filtro por Status
    if (statusFilter === 'PENDENTES_E_VENCIDOS') {
      if (b.status !== 'PENDENTE' && b.status !== 'VENCIDO') return false;
    } else if (statusFilter !== 'TODOS') {
      if (b.status !== statusFilter) return false;
    }

    // Filtro por termo de busca
    if (!searchTerm.trim()) return true;
    return (
      matchesSearchTerm(b.description, searchTerm) ||
      matchesSearchTerm(b.entityName, searchTerm) ||
      matchesSearchTerm(b.documentNumber, searchTerm) ||
      matchesSearchTerm(b.category, searchTerm) ||
      matchesSearchTerm(b.orderCode, searchTerm)
    );
  });

  // Reset de página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedMonth, statusFilter, searchTerm]);

  // Paginação padrão folha A4 (25 itens por página)
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedBills = useMemo(() => {
    const page = Math.min(Math.max(1, currentPage), totalPages);
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredBills.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBills, currentPage, totalPages]);

  // Estatísticas e Totais Rápidos
  const currentTabBills = processedBills.filter((b) => b.type === activeTab && (!selectedMonth || (b.dueDate && b.dueDate.startsWith(selectedMonth))));
  
  const totalPendente = currentTabBills
    .filter((b) => b.status === 'PENDENTE')
    .reduce((acc, b) => acc + (b.amount || 0), 0);

  const totalVencido = currentTabBills
    .filter((b) => b.status === 'VENCIDO')
    .reduce((acc, b) => acc + (b.amount || 0), 0);

  const totalPago = currentTabBills
    .filter((b) => b.status === 'PAGO')
    .reduce((acc, b) => acc + (b.amountPaid || b.amount || 0), 0);

  const totalGeral = currentTabBills.reduce((acc, b) => acc + (b.amount || 0), 0);

  // Manipuladores de Ação
  const handleOpenCreate = () => {
    setEditingBill(null);
    setIsDirty(false);
    setFormData({
      description: '',
      entityName: '',
      entityId: '',
      documentNumber: '',
      category: activeTab === 'PAGAR' ? 'Fornecedores' : 'Serviços / Vendas',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'PIX',
      notes: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (bill?: AccountBill) => {
    const target = bill || filteredBills.find((b) => b.id === selectedBillId);
    if (!target) {
      dlgAlert({
        title: 'Selecione uma Conta',
        message: 'Por favor, selecione uma conta na lista para editar.',
        variant: 'info',
      });
      return;
    }

    setEditingBill(target);
    setIsDirty(false);
    setFormData({
      description: target.description || '',
      entityName: target.entityName || '',
      entityId: target.entityId || '',
      documentNumber: target.documentNumber || '',
      category: target.category || 'Geral',
      amount: target.amount ? target.amount.toFixed(2).replace('.', ',') : '',
      dueDate: target.dueDate || new Date().toISOString().split('T')[0],
      paymentMethod: target.paymentMethod || 'PIX',
      notes: target.notes || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (billOrEvent?: AccountBill | React.MouseEvent) => {
    let target: AccountBill | undefined;
    if (billOrEvent && 'id' in billOrEvent) {
      target = billOrEvent as AccountBill;
    } else {
      target = filteredBills.find((b) => b.id === selectedBillId);
    }

    if (!target) {
      dlgAlert({
        title: 'Selecione uma Conta',
        message: 'Por favor, selecione uma conta para excluir.',
        variant: 'info',
      });
      return;
    }

    const ok = await dlgConfirm({
      title: 'Excluir Conta',
      message: `Deseja realmente excluir o lançamento "${target.description}" no valor de R$ ${(target.amount || 0).toFixed(2)}?`,
      variant: 'danger',
      confirmText: 'Excluir',
    });

    if (ok) {
      const updated = bills.filter((b) => b.id !== target!.id);
      saveBillsToStorage(updated);
      if (db) {
        try {
          await deleteDoc(doc(db, 'accounts_bills', target!.id));
        } catch (e) {}
      }
      if (selectedBillId === target.id) {
        setSelectedBillId(null);
      }
      if (isFormOpen && editingBill?.id === target.id) {
        setIsFormOpen(false);
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      dlgAlert({
        title: 'Campo Obrigatório',
        message: 'Por favor, informe a Descrição da Conta.',
        variant: 'warning',
      });
      return;
    }

    const numAmount = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.')) || 0;
    if (numAmount <= 0) {
      dlgAlert({
        title: 'Valor Inválido',
        message: 'Por favor, informe um valor maior que zero.',
        variant: 'warning',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const newBill: AccountBill = {
      id: editingBill?.id || `bill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type: activeTab,
      description: formData.description.trim(),
      entityName: formData.entityName.trim(),
      entityId: formData.entityId || undefined,
      documentNumber: formData.documentNumber.trim(),
      category: formData.category.trim(),
      amount: numAmount,
      amountPaid: editingBill?.amountPaid || 0,
      dueDate: formData.dueDate,
      paymentDate: editingBill?.paymentDate,
      paymentMethod: formData.paymentMethod,
      status: editingBill ? editingBill.status : (formData.dueDate < todayStr ? 'VENCIDO' : 'PENDENTE'),
      notes: formData.notes.trim(),
      createdAt: editingBill?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const updated = editingBill
      ? bills.map((b) => (b.id === newBill.id ? newBill : b))
      : [newBill, ...bills];

    saveBillsToStorage(updated);
    setIsDirty(false);
    setIsFormOpen(false);
    setSelectedBillId(newBill.id);
  };

  const handleOpenQuitarModal = (bill?: AccountBill) => {
    const target = bill || filteredBills.find((b) => b.id === selectedBillId);
    if (!target) {
      dlgAlert({
        title: 'Selecione uma Conta',
        message: 'Por favor, selecione uma conta para dar baixa / quitar.',
        variant: 'info',
      });
      return;
    }

    setEditingBill(target);
    setPaymentFormData({
      paymentDate: new Date().toISOString().split('T')[0],
      amountPaid: (target.amount || 0).toFixed(2).replace('.', ','),
      paymentMethod: target.paymentMethod || 'DINHEIRO',
      notes: target.notes || '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;

    const numPaid = parseFloat(paymentFormData.amountPaid.replace(/\./g, '').replace(',', '.')) || 0;
    if (numPaid <= 0) {
      dlgAlert({
        title: 'Valor Inválido',
        message: 'Por favor, informe o valor pago válido.',
        variant: 'warning',
      });
      return;
    }

    const updatedBill: AccountBill = {
      ...editingBill,
      status: 'PAGO',
      amountPaid: numPaid,
      paymentDate: paymentFormData.paymentDate,
      paymentMethod: paymentFormData.paymentMethod,
      notes: paymentFormData.notes.trim(),
      updatedAt: new Date().toISOString(),
    };

    const updated = bills.map((b) => (b.id === updatedBill.id ? updatedBill : b));
    saveBillsToStorage(updated);
    setIsPaymentModalOpen(false);
  };

  const handleReopenBill = async () => {
    const target = filteredBills.find((b) => b.id === selectedBillId);
    if (!target || target.status !== 'PAGO') return;

    const ok = await dlgConfirm({
      title: 'Reabrir Conta',
      message: `Deseja desfazer a baixa e reabrir a conta "${target.description}" como pendente?`,
      variant: 'warning',
      confirmText: 'Reabrir Conta',
    });

    if (ok) {
      const updatedBill: AccountBill = {
        ...target,
        status: target.dueDate < todayStr ? 'VENCIDO' : 'PENDENTE',
        amountPaid: 0,
        paymentDate: undefined,
        updatedAt: new Date().toISOString(),
      };
      const updated = bills.map((b) => (b.id === updatedBill.id ? updatedBill : b));
      saveBillsToStorage(updated);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return dateStr;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none font-sans"
      onClick={() => setSelectedBillId(null)}
    >
      <div
        className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 p-2 rounded-xl border border-white/20">
              <CreditCard className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold leading-tight">
                  Contas Financeiras
                </h2>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
                  {activeTab === 'PAGAR' ? 'Contas a Pagar' : 'Contas a Receber'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Gerencie despesas, fornecedores, boletos, faturamentos e recebimentos com controle de quitação
              </p>
            </div>
          </div>

          {/* Abas Alternadoras Contas a Pagar / Contas a Receber */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('PAGAR');
                  setSelectedBillId(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'PAGAR'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4 text-red-300" />
                Contas a Pagar
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('RECEBER');
                  setSelectedBillId(null);
                }}
                className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'RECEBER'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-300" />
                Contas a Receber
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer ml-2 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO FINANCEIRO */}
        <div className="grid grid-cols-4 gap-3 p-3 bg-slate-100 border-b border-slate-200">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Pendente</span>
              <span className="text-sm font-black text-amber-600 font-mono">{formatCurrency(totalPendente)}</span>
            </div>
            <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Vencido</span>
              <span className="text-sm font-black text-red-600 font-mono">{formatCurrency(totalVencido)}</span>
            </div>
            <div className="bg-red-100 text-red-700 p-2 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">
                {activeTab === 'PAGAR' ? 'Total Pago' : 'Total Recebido'}
              </span>
              <span className="text-sm font-black text-emerald-600 font-mono">{formatCurrency(totalPago)}</span>
            </div>
            <div className="bg-emerald-100 text-emerald-700 p-2 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total do Período</span>
              <span className="text-sm font-black text-slate-800 font-mono">{formatCurrency(totalGeral)}</span>
            </div>
            <div className="bg-slate-100 text-slate-700 p-2 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* BARRA DE AÇÕES E FILTROS */}
        <div className="p-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className={`${
                activeTab === 'PAGAR' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer`}
            >
              <PlusCircle className="w-4 h-4" />
              {activeTab === 'PAGAR' ? 'Nova Conta a Pagar (F2)' : 'Nova Conta a Receber (F2)'}
            </button>

            {selectedBillId && (
              <>
                {filteredBills.find((b) => b.id === selectedBillId)?.status !== 'PAGO' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenQuitarModal()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {activeTab === 'PAGAR' ? 'Dar Baixa / Pagar' : 'Receber / Quitar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleReopenBill}
                    className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    Desfazer Baixa
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEdit()}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro de Mês */}
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
              />
              {selectedMonth && (
                <button
                  type="button"
                  title="Limpar filtro de mês (Ver Todos)"
                  onClick={() => setSelectedMonth('')}
                  className="text-slate-400 hover:text-slate-600 ml-1 cursor-pointer font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-600"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PENDENTES_E_VENCIDOS">Em Aberto (Pendentes + Vencidos)</option>
              <option value="PENDENTE">Apenas Pendentes</option>
              <option value="VENCIDO">Apenas Vencidos</option>
              <option value="PAGO">Apenas Quitados / Pagos</option>
            </select>

            {/* Busca Rápida */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar descrição, contato, nota..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* TABELA DE CONTAS */}
        <div
          className="flex-1 overflow-auto bg-slate-50 p-3"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedBillId(null);
            }
          }}
        >
          <table className="w-full text-left text-xs text-slate-800 border-collapse bg-white rounded-xl shadow-xs overflow-hidden">
            <thead className="bg-slate-200 text-slate-800 font-bold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-300">
              <tr>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Vencimento</th>
                <th className="p-2.5">Descrição / Referência</th>
                <th className="p-2.5">{activeTab === 'PAGAR' ? 'Fornecedor / Beneficiário' : 'Cliente / Pagador'}</th>
                <th className="p-2.5">Doc / Nota</th>
                <th className="p-2.5">Categoria</th>
                <th className="p-2.5 text-right">Valor Previsto</th>
                <th className="p-2.5 text-right">{activeTab === 'PAGAR' ? 'Valor Pago' : 'Valor Recebido'}</th>
                <th className="p-2.5">Data Pagamento</th>
                <th className="p-2.5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {paginatedBills.map((b) => {
                const isSelected = b.id === selectedBillId;
                const isPaid = b.status === 'PAGO';
                const isOverdue = b.status === 'VENCIDO';

                return (
                  <tr
                    key={b.id}
                    data-row="true"
                    onClick={() => setSelectedBillId(b.id)}
                    onDoubleClick={() => {
                      if (!isPaid) handleOpenQuitarModal(b);
                      else handleOpenEdit(b);
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-100 font-semibold'
                        : isOverdue
                        ? 'bg-red-50/50 hover:bg-red-50'
                        : isPaid
                        ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                        : 'hover:bg-slate-100 bg-white'
                    }`}
                  >
                    <td className="p-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isOverdue
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isPaid && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isOverdue && <AlertCircle className="w-3 h-3 text-red-600" />}
                        {!isPaid && !isOverdue && <Clock className="w-3 h-3 text-amber-600" />}
                        {b.status}
                      </span>
                    </td>
                    <td className={`p-2.5 font-mono font-bold ${isOverdue ? 'text-red-700' : 'text-slate-800'}`}>
                      {formatDate(b.dueDate)}
                    </td>
                    <td className="p-2.5 font-bold text-slate-900 truncate max-w-xs">
                      {b.description}
                      {b.orderCode && (
                        <span className="ml-1.5 text-[10px] font-mono text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-200">
                          OS #{b.orderCode}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-700 truncate max-w-xs">{b.entityName || '-'}</td>
                    <td className="p-2.5 font-mono text-slate-600">{b.documentNumber || '-'}</td>
                    <td className="p-2.5 text-slate-600">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium border border-slate-200">
                        {b.category || 'Geral'}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(b.amount || 0)}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                      {b.amountPaid ? formatCurrency(b.amountPaid) : '-'}
                    </td>
                    <td className="p-2.5 font-mono text-slate-600">{formatDate(b.paymentDate)}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {!isPaid ? (
                          <button
                            type="button"
                            title={activeTab === 'PAGAR' ? 'Pagar / Quitar' : 'Receber / Quitar'}
                            onClick={() => handleOpenQuitarModal(b)}
                            className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Desfazer Baixa"
                            onClick={() => {
                              setSelectedBillId(b.id);
                              handleReopenBill();
                            }}
                            className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Editar lançamento"
                          onClick={() => handleOpenEdit(b)}
                          className="p-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Excluir lançamento"
                          onClick={() => handleDelete(b)}
                          className="p-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBills.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-slate-400 italic">
                    Nenhuma conta encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BARRA DE PAGINAÇÃO (PADRÃO A4: 25 ITENS POR PÁGINA) */}
        {filteredBills.length > 0 && (
          <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-600 font-medium">
              Exibindo <span className="font-bold text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a{' '}
              <span className="font-bold text-slate-800">
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredBills.length)}
              </span>{' '}
              de <span className="font-bold text-slate-800">{filteredBills.length}</span> contas (Padrão A4: 25/pág.)
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg border font-bold transition-colors cursor-pointer text-xs ${
                  currentPage <= 1
                    ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Página Anterior
              </button>

              <div className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 text-xs">
                Página {currentPage} de {totalPages}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg border font-bold transition-colors cursor-pointer text-xs ${
                  currentPage >= totalPages
                    ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                    : activeTab === 'PAGAR'
                    ? 'bg-red-600 text-white border-red-700 hover:bg-red-700 shadow-xs'
                    : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                }`}
              >
                Ver Próxima Página
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* RODAPÉ */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between text-xs">
          <span className="text-slate-600 italic">
            Dê 2 cliques para {activeTab === 'PAGAR' ? 'dar baixa/pagar' : 'receber/quitar'} ou selecione a conta para editar.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="bg-slate-300 hover:bg-slate-400 text-slate-800 px-4 py-1.5 rounded-xl font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* MODAL FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden font-sans text-xs flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`p-3.5 ${
                activeTab === 'PAGAR' ? 'bg-gradient-to-r from-slate-900 to-red-950' : 'bg-gradient-to-r from-slate-900 to-emerald-950'
              } text-white flex items-center justify-between`}
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold">
                  {editingBill
                    ? `Editar ${activeTab === 'PAGAR' ? 'Conta a Pagar' : 'Conta a Receber'}`
                    : `Cadastrar ${activeTab === 'PAGAR' ? 'Nova Conta a Pagar' : 'Nova Conta a Receber'}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRequestCloseForm}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} onChange={() => setIsDirty(true)} className="p-4 space-y-3.5 bg-slate-50">
              <div className="grid grid-cols-12 gap-2.5">
                <div className="col-span-12">
                  <label className="block font-bold text-slate-800 mb-1">
                    Descrição / Referência <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Ex: Compra de Telas Fornecedor X / Aluguel / Conta de Luz"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="col-span-7">
                  <label className="block font-semibold text-slate-700 mb-1">
                    {activeTab === 'PAGAR' ? 'Fornecedor / Beneficiário' : 'Cliente / Pagador'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={activeTab === 'PAGAR' ? 'Nome do Fornecedor' : 'Nome do Cliente'}
                      value={formData.entityName}
                      onChange={(e) => setFormData({ ...formData, entityName: e.target.value, entityId: '' })}
                      list="entities-list"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                    <datalist id="entities-list">
                      {activeTab === 'PAGAR'
                        ? suppliers.map((s) => <option key={s.id} value={s.name} />)
                        : clients.map((c) => <option key={c.id || c.code} value={c.name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="col-span-5">
                  <label className="block font-semibold text-slate-700 mb-1">Nº Documento / Boleto</label>
                  <input
                    type="text"
                    placeholder="Ex: NF 1042 / Boleto 449"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="col-span-6">
                  <label className="block font-bold text-slate-800 mb-1">
                    Valor (R$) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="col-span-6">
                  <label className="block font-bold text-slate-800 mb-1">
                    Data de Vencimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="col-span-6">
                  <label className="block font-semibold text-slate-700 mb-1">Categoria / Classificação</label>
                  <input
                    type="text"
                    placeholder="Ex: Peças, Despesas Fixas, Aluguel, Impostos"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    list="categories-list"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <datalist id="categories-list">
                    <option value="Fornecedores / Peças" />
                    <option value="Aluguel / Condomínio" />
                    <option value="Energia / Água / Internet" />
                    <option value="Salários / Comissões" />
                    <option value="Impostos / Tributos" />
                    <option value="Marketing / Publicidade" />
                    <option value="Vendas e Serviços" />
                    <option value="Outros" />
                  </datalist>
                </div>

                <div className="col-span-6">
                  <label className="block font-semibold text-slate-700 mb-1">Forma Prevista de Pagamento</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e: any) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600 font-bold"
                  >
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div className="col-span-12">
                  <label className="block font-semibold text-slate-700 mb-1">Observações Adicionais</label>
                  <textarea
                    rows={2}
                    placeholder="Código de barras do boleto, chave PIX, notas de entrega..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-indigo-600 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  {editingBill && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingBill)}
                      className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Lançamento
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRequestCloseForm}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 ${
                      activeTab === 'PAGAR' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    } text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer`}
                  >
                    <Save className="w-4 h-4" />
                    Salvar Conta
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE QUITAÇÃO / BAIXA */}
      {isPaymentModalOpen && editingBill && (
        <div className="fixed inset-0 z-[70] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden font-sans text-xs flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 bg-gradient-to-r from-slate-900 to-emerald-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">
                  {editingBill.type === 'PAGAR' ? 'Confirmar Pagamento da Conta' : 'Confirmar Recebimento da Conta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-4 space-y-3.5 bg-slate-50">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-950">
                <span className="font-bold block text-sm">{editingBill.description}</span>
                <span className="text-xs text-emerald-800 block mt-0.5">
                  Valor Original: <strong>{formatCurrency(editingBill.amount || 0)}</strong> | Vencimento:{' '}
                  <strong>{formatDate(editingBill.dueDate)}</strong>
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    {editingBill.type === 'PAGAR' ? 'Valor Efetivamente Pago (R$)' : 'Valor Efetivamente Recebido (R$)'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={paymentFormData.amountPaid}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, amountPaid: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono font-black text-slate-900 text-base focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Data da Quitação / Baixa</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Forma de Pagamento Utilizada</label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e: any) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600 font-bold"
                  >
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFERENCIA">Transferência / TED</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Observações da Baixa</label>
                  <input
                    type="text"
                    placeholder="Ex: Pago com desconto / Comprovante arquivado"
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
