import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  Printer,
  PlusCircle,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  QrCode,
  Banknote,
  Receipt,
  FileText,
  Trash2,
  Clock,
  User,
  Search,
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useDialog } from './DialogContext';

export interface CashMovement {
  id: string;
  type: 'ENTRADA' | 'SAIDA';
  category: 'OS' | 'ORCAMENTO' | 'VENDA' | 'SANGRIA' | 'DESPESA' | 'SUPRIMENTO' | 'OUTROS';
  description: string;
  amount: number;
  paymentMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'BOLETO' | 'OUTROS';
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  userName: string;
  orderCode?: string;
  clientName?: string;
  notes?: string;
  registerId?: string; // ID da sessão do caixa aberto
}

export interface CashRegisterSession {
  id: string;
  openedAt: string; // ISO string
  openedBy: string;
  initialBalance: number;
  closedAt?: string;
  closedBy?: string;
  closingBalanceCalculated?: number;
  closingBalanceReal?: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  companyInfo?: any;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  companyInfo,
}) => {
  const isAdmin = Boolean(
    !currentUser ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'admin' ||
    currentUser?.isAdmin === true ||
    currentUser?.username?.toLowerCase() === 'admin' ||
    (currentUser?.name || '').toLowerCase().includes('admin')
  );

  const canOpenClose = Boolean(
    isAdmin ||
    currentUser?.permissions?.openCloseCashRegister === true ||
    currentUser?.permissions?.openCloseCashRegister === undefined
  );

  const canManageManual = Boolean(
    isAdmin ||
    currentUser?.permissions?.manageManualCashMovement === true ||
    currentUser?.permissions?.manageManualCashMovement === undefined
  );

  const [movements, setMovements] = useState<CashMovement[]>(() => {
    try {
      const saved = localStorage.getItem('vollen_cash_movements');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [currentSession, setCurrentSession] = useState<CashRegisterSession | null>(() => {
    try {
      const saved = localStorage.getItem('vollen_current_cash_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  // Filtros
  const [selectedPeriod, setSelectedPeriod] = useState<'HOJE' | 'SEMANA' | 'MES' | 'TODOS' | 'CUSTOM'>('HOJE');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('TODOS');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Configuração das Colunas Redimensionáveis do Caixa
  const [columns, setColumns] = useState<{ id: string; label: string; width: number }[]>(() => {
    const defaultCols = [
      { id: 'dateTime', label: 'Data / Hora', width: 110 },
      { id: 'type', label: 'Tipo', width: 85 },
      { id: 'category', label: 'Categoria', width: 110 },
      { id: 'description', label: 'Descrição / Origem', width: 280 },
      { id: 'clientOrder', label: 'Cliente / OS', width: 150 },
      { id: 'paymentMethod', label: 'Forma Pgto', width: 120 },
      { id: 'user', label: 'Operador', width: 100 },
      { id: 'amount', label: 'Valor', width: 100 },
      { id: 'actions', label: 'Ações', width: 60 },
    ];
    try {
      const saved = localStorage.getItem('vollen_cash_register_columns');
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultCols;
  });

  const handleMouseDownResize = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = columns.find((c) => c.id === columnId)?.width || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(40, initialWidth + deltaX);
      setColumns((prev) => {
        const updated = prev.map((col) => (col.id === columnId ? { ...col, width: newWidth } : col));
        try {
          localStorage.setItem('vollen_cash_register_columns', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Modais internos
  const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
  const [isOpenRegisterModalOpen, setIsOpenRegisterModalOpen] = useState(false);
  const [isCloseRegisterModalOpen, setIsCloseRegisterModalOpen] = useState(false);
  const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

  // Form de novo lançamento
  const [newMovementForm, setNewMovementForm] = useState({
    type: 'ENTRADA' as 'ENTRADA' | 'SAIDA',
    category: 'OUTROS' as CashMovement['category'],
    description: '',
    amount: '',
    paymentMethod: 'DINHEIRO' as CashMovement['paymentMethod'],
    notes: '',
    clientName: '',
  });

  // Form de abertura/fechamento
  const [initialBalanceInput, setInitialBalanceInput] = useState('0,00');
  const [closingRealInput, setClosingRealInput] = useState('');
  const [closingNotesInput, setClosingNotesInput] = useState('');

  // Sincronização com Firestore
  useEffect(() => {
    if (!isOpen) return;

    try {
      // 1. Ouvinte de Sessão Atual do Caixa
      const sessionRef = doc(db, 'cash_registers', 'current_session');
      const unsubSession = onSnapshot(sessionRef, (snap) => {
        if (snap.exists()) {
          const sess = snap.data() as CashRegisterSession;
          setCurrentSession(sess);
          localStorage.setItem('vollen_current_cash_session', JSON.stringify(sess));
        } else {
          setCurrentSession(null);
          localStorage.removeItem('vollen_current_cash_session');
        }
      });

      // 2. Carrega Movimentações
      const movCol = collection(db, 'cash_movements');
      const unsubMovements = onSnapshot(movCol, (snap) => {
        const list: CashMovement[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        // Ordena por data e hora decrescente
        list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
        setMovements(list);
        if (list.length > 0) {
          localStorage.setItem('vollen_cash_movements', JSON.stringify(list));
        } else {
          localStorage.removeItem('vollen_cash_movements');
        }
      });

      return () => {
        unsubSession();
        unsubMovements();
      };
    } catch (e) {
      console.warn('Erro ao conectar ao Firestore de Caixa:', e);
    }
  }, [isOpen]);

  // Tecla ESC para fechar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isNewMovementModalOpen) setIsNewMovementModalOpen(false);
        else if (isOpenRegisterModalOpen) setIsOpenRegisterModalOpen(false);
        else if (isCloseRegisterModalOpen) setIsCloseRegisterModalOpen(false);
        else if (isPrintSummaryOpen) setIsPrintSummaryOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isNewMovementModalOpen, isOpenRegisterModalOpen, isCloseRegisterModalOpen, isPrintSummaryOpen, onClose]);

  // Formatação monetária
  const formatMoney = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0 : val;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseMoney = (valStr: string): number => {
    if (!valStr) return 0;
    const clean = valStr.replace(/[^\d,-]/g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  };

  // Filtragem dos lançamentos
  const filteredMovements = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    return movements.filter((m) => {
      // Filtro de Data
      if (selectedPeriod === 'HOJE') {
        if (m.date !== today) return false;
      } else if (selectedPeriod === 'SEMANA') {
        const d = new Date(m.date);
        const now = new Date();
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7 || diffDays < 0) return false;
      } else if (selectedPeriod === 'MES') {
        const currentMonth = today.substring(0, 7);
        if (!m.date.startsWith(currentMonth)) return false;
      } else if (selectedPeriod === 'CUSTOM') {
        if (startDate && m.date < startDate) return false;
        if (endDate && m.date > endDate) return false;
      }

      // Filtro de Tipo
      if (filterType !== 'TODOS' && m.type !== filterType) return false;

      // Filtro de Forma de Pagamento
      if (filterPaymentMethod !== 'TODOS' && m.paymentMethod !== filterPaymentMethod) return false;

      // Filtro de Busca Textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchDesc = m.description.toLowerCase().includes(term);
        const matchClient = (m.clientName || '').toLowerCase().includes(term);
        const matchOS = (m.orderCode || '').toLowerCase().includes(term);
        if (!matchDesc && !matchClient && !matchOS) return false;
      }

      return true;
    });
  }, [movements, selectedPeriod, startDate, endDate, filterType, filterPaymentMethod, searchTerm]);

  // Cálculos dos Totais
  const summary = useMemo(() => {
    let totalEntradas = 0;
    let totalSaidas = 0;

    let dinheiroTotal = 0;
    let pixTotal = 0;
    let cartaoDebitoTotal = 0;
    let cartaoCreditoTotal = 0;
    let boletoTotal = 0;

    filteredMovements.forEach((m) => {
      if (m.type === 'ENTRADA') {
        totalEntradas += m.amount;
        if (m.paymentMethod === 'DINHEIRO') dinheiroTotal += m.amount;
        else if (m.paymentMethod === 'PIX') pixTotal += m.amount;
        else if (m.paymentMethod === 'CARTAO_DEBITO') cartaoDebitoTotal += m.amount;
        else if (m.paymentMethod === 'CARTAO_CREDITO') cartaoCreditoTotal += m.amount;
        else if (m.paymentMethod === 'BOLETO') boletoTotal += m.amount;
      } else {
        totalSaidas += m.amount;
        if (m.paymentMethod === 'DINHEIRO') dinheiroTotal -= m.amount;
        else if (m.paymentMethod === 'PIX') pixTotal -= m.amount;
      }
    });

    const saldoPeriodo = totalEntradas - totalSaidas;
    const saldoInicial = currentSession?.status === 'OPEN' ? currentSession.initialBalance : 0;
    const saldoTotalEmCaixa = saldoInicial + dinheiroTotal;

    return {
      totalEntradas,
      totalSaidas,
      saldoPeriodo,
      saldoInicial,
      saldoTotalEmCaixa,
      dinheiroTotal,
      pixTotal,
      cartaoDebitoTotal,
      cartaoCreditoTotal,
      boletoTotal,
      totalRegistros: filteredMovements.length,
    };
  }, [filteredMovements, currentSession]);

  // Salvar novo lançamento manual
  const handleSaveNewMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseMoney(newMovementForm.amount);
    if (amountNum <= 0) {
      alert('Por favor, informe um valor válido maior que zero.');
      return;
    }
    if (!newMovementForm.description.trim()) {
      alert('Por favor, informe a descrição do lançamento.');
      return;
    }

    const now = new Date();
    const newMov: CashMovement = {
      id: 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: newMovementForm.type,
      category: newMovementForm.category,
      description: newMovementForm.description.trim(),
      amount: amountNum,
      paymentMethod: newMovementForm.paymentMethod,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('pt-BR'),
      userName: currentUser?.name || 'Operador',
      clientName: newMovementForm.clientName.trim() || undefined,
      notes: newMovementForm.notes.trim() || undefined,
      registerId: currentSession?.id,
    };

    const updated = [newMov, ...movements];
    setMovements(updated);
    localStorage.setItem('vollen_cash_movements', JSON.stringify(updated));

    // Nuvem
    try {
      await setDoc(doc(db, 'cash_movements', newMov.id), newMov);
    } catch (err) {
      console.warn('Erro ao salvar movimentação na nuvem:', err);
    }

    setIsNewMovementModalOpen(false);
    setNewMovementForm({
      type: 'ENTRADA',
      category: 'OUTROS',
      description: '',
      amount: '',
      paymentMethod: 'DINHEIRO',
      notes: '',
      clientName: '',
    });
  };

  // Abrir Caixa
  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const initialBal = parseMoney(initialBalanceInput);
    const newSess: CashRegisterSession = {
      id: 'sess_' + Date.now(),
      openedAt: new Date().toISOString(),
      openedBy: currentUser?.name || 'Operador',
      initialBalance: initialBal,
      status: 'OPEN',
    };

    setCurrentSession(newSess);
    localStorage.setItem('vollen_current_cash_session', JSON.stringify(newSess));

    // Nuvem
    try {
      await setDoc(doc(db, 'cash_registers', 'current_session'), newSess);
    } catch (err) {
      console.warn('Erro ao abrir caixa na nuvem:', err);
    }

    setIsOpenRegisterModalOpen(false);
  };

  // Fechar Caixa
  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const realBal = parseMoney(closingRealInput);
    const calculatedBal = (currentSession.initialBalance || 0) + summary.dinheiroTotal;

    const closedSess: CashRegisterSession = {
      ...currentSession,
      closedAt: new Date().toISOString(),
      closedBy: currentUser?.name || 'Operador',
      closingBalanceCalculated: calculatedBal,
      closingBalanceReal: realBal,
      status: 'CLOSED',
      notes: closingNotesInput.trim() || undefined,
    };

    setCurrentSession(closedSess);
    localStorage.setItem('vollen_current_cash_session', JSON.stringify(closedSess));

    try {
      await setDoc(doc(db, 'cash_registers', 'current_session'), closedSess);
      await setDoc(doc(db, 'cash_registers_history', closedSess.id), closedSess);
    } catch (err) {
      console.warn('Erro ao fechar caixa na nuvem:', err);
    }

    setIsCloseRegisterModalOpen(false);
    setIsPrintSummaryOpen(true);
  };

  const { confirm: confirmDialog } = useDialog();

  // Excluir movimentação
  const handleDeleteMovement = async (id: string) => {
    const ok = await confirmDialog({
      title: 'Excluir Lançamento',
      message: 'Deseja realmente excluir este lançamento do caixa?',
      variant: 'danger',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });
    if (!ok) return;

    const updated = movements.filter((m) => m.id !== id);
    setMovements(updated);
    localStorage.setItem('vollen_cash_movements', JSON.stringify(updated));

    try {
      await deleteDoc(doc(db, 'cash_movements', id));
    } catch (err) {
      console.warn('Erro ao deletar movimentação na nuvem:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn select-none font-sans">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Controle de Fluxo de Caixa</h3>
                {currentSession?.status === 'OPEN' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full animate-pulse">
                    <Unlock className="w-3 h-3" /> Caixa Aberto
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-700 text-slate-300 border border-slate-600 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Caixa Fechado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                Gestão diária de entradas, saídas, sangrias e fechamento financeiro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Abrir/Fechar Caixa */}
            {currentSession?.status === 'OPEN' ? (
              <button
                type="button"
                onClick={() => {
                  if (!canOpenClose) {
                    alert('Acesso Negado: Seu usuário não possui permissão para abrir ou fechar o caixa.');
                    return;
                  }
                  setClosingRealInput(summary.saldoTotalEmCaixa.toFixed(2).replace('.', ','));
                  setIsCloseRegisterModalOpen(true);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                  canOpenClose ? 'bg-red-600/90 hover:bg-red-600 text-white' : 'bg-slate-700 text-slate-400 opacity-60'
                }`}
                title={canOpenClose ? 'Fechar Caixa' : 'Permissão para fechar caixa desativada'}
              >
                <Lock className="w-3.5 h-3.5" />
                Fechar Caixa
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!canOpenClose) {
                    alert('Acesso Negado: Seu usuário não possui permissão para abrir ou fechar o caixa.');
                    return;
                  }
                  setInitialBalanceInput('0,00');
                  setIsOpenRegisterModalOpen(true);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                  canOpenClose ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400 opacity-60'
                }`}
                title={canOpenClose ? 'Abrir Caixa' : 'Permissão para abrir caixa desativada'}
              >
                <Unlock className="w-3.5 h-3.5" />
                Abrir Caixa
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (!canManageManual) {
                  alert('Acesso Negado: Seu usuário não possui permissão para realizar lançamentos manuais ou sangrias no caixa.');
                  return;
                }
                setIsNewMovementModalOpen(true);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${
                canManageManual ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-slate-700 text-slate-400 opacity-60'
              }`}
              title={canManageManual ? 'Registrar Novo Lançamento' : 'Permissão para lançamentos manuais desativada'}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Novo Lançamento
            </button>

            <button
              type="button"
              onClick={() => setIsPrintSummaryOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer border border-slate-700"
              title="Imprimir Relatório do Caixa"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              Imprimir
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO FINANCEIRO NO TOPO */}
        <div className="grid grid-cols-4 gap-3 p-3.5 bg-slate-100 border-b border-slate-200">
          {/* Card Entradas */}
          <div className="bg-white p-3 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-800 font-bold block uppercase tracking-wider">Total Entradas</span>
              <strong className="text-base font-mono text-emerald-700 font-extrabold">{formatMoney(summary.totalEntradas)}</strong>
            </div>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>

          {/* Card Saídas / Sangrias */}
          <div className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-red-800 font-bold block uppercase tracking-wider">Total Saídas / Despesas</span>
              <strong className="text-base font-mono text-red-700 font-extrabold">{formatMoney(summary.totalSaidas)}</strong>
            </div>
            <div className="p-2 bg-red-100 text-red-700 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          {/* Card Saldo do Período */}
          <div className="bg-white p-3 rounded-xl border border-sky-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-sky-800 font-bold block uppercase tracking-wider">Saldo do Período</span>
              <strong className={`text-base font-mono font-extrabold ${summary.saldoPeriodo >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
                {formatMoney(summary.saldoPeriodo)}
              </strong>
            </div>
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card Dinheiro em Espécie (Físico em Gaveta) */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-950 p-3 rounded-xl shadow-xs text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider">Dinheiro em Caixa (Gaveta)</span>
              <strong className="text-base font-mono text-emerald-400 font-extrabold">{formatMoney(summary.saldoTotalEmCaixa)}</strong>
              {currentSession?.status === 'OPEN' && (
                <span className="text-[9.5px] text-slate-300 block">Fundo inicial: {formatMoney(summary.saldoInicial)}</span>
              )}
            </div>
            <div className="p-2 bg-white/10 text-emerald-400 rounded-xl border border-white/10">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Seletor de Período Rápido */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px]">
              {(['HOJE', 'SEMANA', 'MES', 'TODOS', 'CUSTOM'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPeriod(p)}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    selectedPeriod === p ? 'bg-indigo-600 text-white shadow-2xs' : 'hover:bg-slate-200'
                  }`}
                >
                  {p === 'HOJE' ? 'Hoje' : p === 'SEMANA' ? '7 Dias' : p === 'MES' ? 'Este Mês' : p === 'TODOS' ? 'Todos' : 'Personalizado'}
                </button>
              ))}
            </div>

            {/* Intervalo Personalizado */}
            {selectedPeriod === 'CUSTOM' && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none"
                />
                <span className="text-slate-400 text-xs">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none"
                />
              </div>
            )}

            {/* Filtro Tipo */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="ENTRADA">Apenas Entradas</option>
              <option value="SAIDA">Apenas Saídas / Despesas</option>
            </select>

            {/* Filtro Método */}
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="TODOS">Todas as Formas</option>
              <option value="DINHEIRO">Dinheiro (Espécie)</option>
              <option value="PIX">PIX</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="BOLETO">Boleto Bancário</option>
            </select>
          </div>

          {/* Busca Textual */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por descrição, cliente, OS..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1 text-slate-800 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* TABELA DE LANÇAMENTOS */}
        <div className="flex-1 overflow-x-auto overflow-y-auto bg-slate-50 p-3 select-none">
          <div
            className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
            style={{ minWidth: `${columns.reduce((a, b) => a + b.width, 0)}px` }}
          >
            <table
              className="w-full text-left text-xs border-collapse"
              style={{ tableLayout: 'fixed' }}
            >
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                  {columns.map((col) => (
                    <th
                      key={col.id}
                      style={{ width: `${col.width}px` }}
                      className={`py-2 px-2.5 relative group ${
                        col.id === 'amount' ? 'text-right' : col.id === 'actions' ? 'text-center' : 'text-left'
                      }`}
                    >
                      <span className="truncate block font-bold">{col.label}</span>
                      {/* Divisor de redimensionamento da coluna */}
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, col.id)}
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-400/50 group-hover:bg-slate-300/60 transition-colors z-20"
                        title="Arraste para ajustar a largura desta coluna"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      Nenhuma movimentação financeira encontrada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Data / Hora */}
                      <td style={{ width: `${columns[0]?.width || 110}px` }} className="py-2 px-2.5 font-mono text-slate-600 text-[11px] truncate">
                        {mov.date.split('-').reverse().join('/')} <span className="text-slate-400">{mov.time}</span>
                      </td>

                      {/* Tipo */}
                      <td style={{ width: `${columns[1]?.width || 85}px` }} className="py-2 px-2.5 truncate">
                        {mov.type === 'ENTRADA' ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                            <ArrowDownLeft className="w-3 h-3" /> Entrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 text-[10px]">
                            <ArrowUpRight className="w-3 h-3" /> Saída
                          </span>
                        )}
                      </td>

                      {/* Categoria */}
                      <td style={{ width: `${columns[2]?.width || 110}px` }} className="py-2 px-2.5 font-bold text-slate-700 text-[11px] truncate">
                        {mov.category === 'OS' ? (
                          <span className="text-sky-700">Ordem de Serviço</span>
                        ) : mov.category === 'ORCAMENTO' ? (
                          <span className="text-indigo-700">Orçamento</span>
                        ) : mov.category === 'SANGRIA' ? (
                          <span className="text-amber-700">Sangria</span>
                        ) : mov.category === 'DESPESA' ? (
                          <span className="text-rose-700">Despesa</span>
                        ) : mov.category === 'SUPRIMENTO' ? (
                          <span className="text-teal-700">Suprimento</span>
                        ) : (
                          <span className="text-slate-600">Geral</span>
                        )}
                      </td>

                      {/* Descrição / Origem */}
                      <td
                        style={{ width: `${columns[3]?.width || 280}px` }}
                        className="py-2 px-2.5 font-medium text-slate-900 truncate"
                        title={mov.notes ? `${mov.description} | ${mov.notes}` : mov.description}
                      >
                        <span className="font-bold text-slate-900">{mov.description}</span>
                        {mov.notes && (
                          <span className="ml-1.5 text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 rounded px-1 py-0.2 font-medium">
                            {mov.notes}
                          </span>
                        )}
                      </td>

                      {/* Cliente / OS */}
                      <td style={{ width: `${columns[4]?.width || 150}px` }} className="py-2 px-2.5 text-slate-700 truncate">
                        {mov.orderCode && (
                          <span className="font-mono font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 mr-1 text-[10.5px]">
                            #{mov.orderCode}
                          </span>
                        )}
                        <span className="text-slate-600 text-[11px]">{mov.clientName || '-'}</span>
                      </td>

                      {/* Forma Pgto */}
                      <td style={{ width: `${columns[5]?.width || 120}px` }} className="py-2 px-2.5 font-bold text-slate-700 text-[11px] truncate">
                        {mov.paymentMethod === 'DINHEIRO' ? (
                          <span className="flex items-center gap-1 text-emerald-800"><Banknote className="w-3 h-3 text-emerald-600 shrink-0" /> Dinheiro</span>
                        ) : mov.paymentMethod === 'PIX' ? (
                          <span className="flex items-center gap-1 text-teal-800"><QrCode className="w-3 h-3 text-teal-600 shrink-0" /> PIX</span>
                        ) : mov.paymentMethod === 'CARTAO_DEBITO' ? (
                          <span className="flex items-center gap-1 text-sky-800"><CreditCard className="w-3 h-3 text-sky-600 shrink-0" /> Débito</span>
                        ) : mov.paymentMethod === 'CARTAO_CREDITO' ? (
                          <span className="flex items-center gap-1 text-indigo-800"><CreditCard className="w-3 h-3 text-indigo-600 shrink-0" /> Crédito</span>
                        ) : (
                          <span className="text-slate-600 truncate">{mov.paymentMethod}</span>
                        )}
                      </td>

                      {/* Operador */}
                      <td style={{ width: `${columns[6]?.width || 100}px` }} className="py-2 px-2.5 text-slate-500 text-[11px] truncate">
                        {mov.userName}
                      </td>

                      {/* Valor */}
                      <td style={{ width: `${columns[7]?.width || 100}px` }} className={`py-2 px-2.5 text-right font-mono font-bold truncate ${mov.type === 'ENTRADA' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {mov.type === 'ENTRADA' ? '+' : '-'} {formatMoney(mov.amount)}
                      </td>

                      {/* Ações */}
                      <td style={{ width: `${columns[8]?.width || 60}px` }} className="py-2 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteMovement(mov.id)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-200 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center shadow-2xs"
                          title="Excluir este lançamento do caixa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RODAPÉ RESUMO DOS MÉTODOS DE PAGAMENTO */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-4 text-[11px]">
            <span className="font-bold text-slate-600">Por Forma de Pagamento:</span>
            <span className="text-emerald-800 font-bold">💵 Dinheiro: {formatMoney(summary.dinheiroTotal)}</span>
            <span className="text-teal-800 font-bold">📱 PIX: {formatMoney(summary.pixTotal)}</span>
            <span className="text-sky-800 font-bold">💳 Débito: {formatMoney(summary.cartaoDebitoTotal)}</span>
            <span className="text-indigo-800 font-bold">💳 Crédito: {formatMoney(summary.cartaoCreditoTotal)}</span>
            {summary.boletoTotal > 0 && <span className="text-slate-800 font-bold">📄 Boleto: {formatMoney(summary.boletoTotal)}</span>}
          </div>

          <div className="text-slate-500 text-[11px]">
            Total de Lançamentos: <strong>{summary.totalRegistros}</strong>
          </div>
        </div>
      </div>

      {/* MODAL: NOVO LANÇAMENTO */}
      {isNewMovementModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-xs font-sans">
            <div className="p-4 bg-gradient-to-r from-sky-900 to-indigo-950 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-sky-400" />
                Novo Lançamento Financeiro
              </h4>
              <button onClick={() => setIsNewMovementModalOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMovement} className="p-4 space-y-3 bg-slate-50">
              {/* Tipo */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNewMovementForm({ ...newMovementForm, type: 'ENTRADA' })}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    newMovementForm.type === 'ENTRADA'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" /> Entrada (Receita)
                </button>
                <button
                  type="button"
                  onClick={() => setNewMovementForm({ ...newMovementForm, type: 'SAIDA' })}
                  className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    newMovementForm.type === 'SAIDA'
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" /> Saída (Despesa)
                </button>
              </div>

              {/* Valor e Forma de Pgto */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Valor (R$) *</label>
                  <input
                    type="text"
                    required
                    value={newMovementForm.amount}
                    onChange={(e) => setNewMovementForm({ ...newMovementForm, amount: e.target.value })}
                    placeholder="0,00"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Forma de Pagamento *</label>
                  <select
                    value={newMovementForm.paymentMethod}
                    onChange={(e) => setNewMovementForm({ ...newMovementForm, paymentMethod: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                  >
                    <option value="DINHEIRO">Dinheiro (Espécie)</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="OUTROS">Outros</option>
                  </select>
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">Categoria</label>
                <select
                  value={newMovementForm.category}
                  onChange={(e) => setNewMovementForm({ ...newMovementForm, category: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="OUTROS">Geral / Diversos</option>
                  <option value="SANGRIA">Sangria (Retirada de Dinheiro)</option>
                  <option value="SUPRIMENTO">Suprimento (Entrada de Troco)</option>
                  <option value="DESPESA">Despesa Operacional / Compra</option>
                  <option value="VENDA">Venda de Acessório / Produto</option>
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">Descrição do Lançamento *</label>
                <input
                  type="text"
                  required
                  value={newMovementForm.description}
                  onChange={(e) => setNewMovementForm({ ...newMovementForm, description: e.target.value })}
                  placeholder="Ex: Pagamento de fornecedor, Venda de cabo USB..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Cliente Opcional */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">Cliente / Fornecedor (Opcional)</label>
                <input
                  type="text"
                  value={newMovementForm.clientName}
                  onChange={(e) => setNewMovementForm({ ...newMovementForm, clientName: e.target.value })}
                  placeholder="Nome do cliente ou destinatário"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMovementModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ABRIR CAIXA */}
      {isOpenRegisterModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col text-xs font-sans">
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Unlock className="w-4 h-4" />
                Abertura de Caixa Diário
              </h4>
              <button onClick={() => setIsOpenRegisterModalOpen(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOpenRegister} className="p-4 space-y-3 bg-slate-50">
              <p className="text-slate-600 leading-relaxed">
                Informe o valor inicial disponível na gaveta (Fundo de Troco) para iniciar as movimentações do dia:
              </p>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Saldo Inicial / Fundo de Troco (R$)</label>
                <input
                  type="text"
                  required
                  value={initialBalanceInput}
                  onChange={(e) => setInitialBalanceInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-emerald-900 font-mono font-black text-base focus:outline-none focus:border-emerald-600 text-center"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenRegisterModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  Confirmar Abertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FECHAR CAIXA */}
      {isCloseRegisterModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-xs font-sans">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                Fechamento de Caixa
              </h4>
              <button onClick={() => setIsCloseRegisterModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCloseRegister} className="p-4 space-y-3 bg-slate-50">
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Fundo de Troco Inicial:</span>
                  <strong className="font-mono">{formatMoney(currentSession?.initialBalance || 0)}</strong>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Entradas em Dinheiro:</span>
                  <strong className="font-mono">+{formatMoney(summary.dinheiroTotal)}</strong>
                </div>
                <div className="border-t border-slate-200 pt-1 flex justify-between font-bold text-slate-900">
                  <span>Total Esperado em Gaveta:</span>
                  <strong className="font-mono text-emerald-800 text-sm">{formatMoney(summary.saldoTotalEmCaixa)}</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Valor Contado em Gaveta (R$) *</label>
                <input
                  type="text"
                  required
                  value={closingRealInput}
                  onChange={(e) => setClosingRealInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-black text-base focus:outline-none focus:border-indigo-600 text-center"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Observações de Fechamento</label>
                <textarea
                  rows={2}
                  value={closingNotesInput}
                  onChange={(e) => setClosingNotesInput(e.target.value)}
                  placeholder="Justificativa de sobras, faltas ou sangrias..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-indigo-600 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloseRegisterModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer"
                >
                  Fechar Caixa e Imprimir Resumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TELA DE IMPRESSÃO DO RESUMO DE FECHAMENTO */}
      {isPrintSummaryOpen && (
        <div className="fixed inset-0 z-70 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-sky-400" />
                Comprovante de Fechamento de Caixa
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Agora
                </button>
                <button onClick={() => setIsPrintSummaryOpen(false)} className="text-slate-300 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DOCUMENTO IMPRESSO */}
            <div className="p-6 overflow-y-auto bg-white font-mono text-xs text-slate-900 space-y-4">
              <div className="text-center border-b border-slate-300 pb-3">
                <h2 className="font-bold text-sm uppercase">{companyInfo?.tradingName || companyInfo?.name || 'VOLLEN ASSISTÊNCIA TÉCNICA'}</h2>
                <p className="text-[10px] text-slate-600">FECHAMENTO E RESUMO FINANCEIRO DE CAIXA</p>
                <p className="text-[10px] text-slate-500 mt-1">Emissão: {new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div className="space-y-1 text-[11px] border-b border-slate-200 pb-2">
                <div>Operador: <strong>{currentUser?.name || 'Administrador'}</strong></div>
                <div>Período: <strong>{selectedPeriod === 'HOJE' ? 'Hoje' : `${startDate} até ${endDate}`}</strong></div>
                <div>Status do Caixa: <strong>{currentSession?.status === 'OPEN' ? 'ABERTO' : 'FECHADO'}</strong></div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Fundo de Troco (Inicial):</span>
                  <strong>{formatMoney(currentSession?.initialBalance || 0)}</strong>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total de Entradas:</span>
                  <strong>+{formatMoney(summary.totalEntradas)}</strong>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Total de Saídas / Sangrias:</span>
                  <strong>-{formatMoney(summary.totalSaidas)}</strong>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold text-sm">
                  <span>Saldo Final do Caixa:</span>
                  <strong>{formatMoney(summary.saldoTotalEmCaixa)}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px]">
                <div className="font-bold uppercase text-[10px] text-slate-500 mb-1">Detalhamento por Meio de Pagamento:</div>
                <div className="flex justify-between"><span>Dinheiro em Espécie:</span> <strong>{formatMoney(summary.dinheiroTotal)}</strong></div>
                <div className="flex justify-between"><span>Transferência PIX:</span> <strong>{formatMoney(summary.pixTotal)}</strong></div>
                <div className="flex justify-between"><span>Cartão de Débito:</span> <strong>{formatMoney(summary.cartaoDebitoTotal)}</strong></div>
                <div className="flex justify-between"><span>Cartão de Crédito:</span> <strong>{formatMoney(summary.cartaoCreditoTotal)}</strong></div>
              </div>

              <div className="pt-8 border-t border-slate-300 text-center space-y-4">
                <div className="w-48 border-b border-slate-400 mx-auto"></div>
                <p className="text-[10px] text-slate-500">Assinatura do Responsável</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Função utilitária exportada para registrar entrada automática de OS finalizada ou Orçamento
export async function registerCashEntryFromOS(order: {
  code?: string;
  totalAmount?: number | string;
  client?: { name?: string };
  paymentMethod?: string;
  advancePayment?: string;
  userName?: string;
}) {
  try {
    const rawVal = typeof order.totalAmount === 'string'
      ? parseFloat(order.totalAmount.replace(/\./g, '').replace(',', '.')) || 0
      : order.totalAmount || 0;

    if (rawVal <= 0) return;

    let pMethod: CashMovement['paymentMethod'] = 'DINHEIRO';
    const methodStr = (order.paymentMethod || '').toUpperCase();
    if (methodStr.includes('PIX')) pMethod = 'PIX';
    else if (methodStr.includes('DEBITO') || methodStr.includes('DÉBITO')) pMethod = 'CARTAO_DEBITO';
    else if (methodStr.includes('CREDITO') || methodStr.includes('CRÉDITO')) pMethod = 'CARTAO_CREDITO';
    else if (methodStr.includes('BOLETO')) pMethod = 'BOLETO';

    const now = new Date();
    const newMov: CashMovement = {
      id: 'mov_os_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      type: 'ENTRADA',
      category: 'OS',
      description: `Recebimento OS #${order.code || 'OS'} - ${order.client?.name || 'Cliente'}`,
      amount: rawVal,
      paymentMethod: pMethod,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('pt-BR'),
      userName: order.userName || 'Sistema OS',
      orderCode: order.code,
      clientName: order.client?.name,
    };

    const saved = localStorage.getItem('vollen_cash_movements');
    const list: CashMovement[] = saved ? JSON.parse(saved) : [];
    const updated = [newMov, ...list];
    localStorage.setItem('vollen_cash_movements', JSON.stringify(updated));

    // Nuvem
    await setDoc(doc(db, 'cash_movements', newMov.id), newMov);
  } catch (err) {
    console.warn('Erro ao registrar entrada automática de caixa:', err);
  }
}
