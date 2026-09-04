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
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Part } from './PartsModal';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';

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
  paymentMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'OUTROS';
  creditInstallments: number;
  notes?: string;
}

export interface SaleRecord {
  id: string;
  saleCode: string; // Ex: V-1001
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
  totalAmount: number;
  paymentMethod: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'OUTROS';
  installments?: number;
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

  // Lista de vendedores/usuários do sistema para seleção (apenas cadastrados)
  const [availableSellers, setAvailableSellers] = useState<string[]>([]);

  useEffect(() => {
    try {
      const allNames: string[] = [];

      // 1. Pega do localStorage de usuários cadastrados (vollen_users e system_users)
      const parseUsers = (key: string) => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach((u: any) => {
                const displayName = (u.name || u.username || '').trim();
                if (displayName) allNames.push(displayName);
              });
            }
          }
        } catch {}
      };

      parseUsers('vollen_users');
      parseUsers('system_users');

      // 2. Pega do localStorage de técnicos cadastrados
      try {
        const techsSaved = localStorage.getItem('vollen_technicians');
        if (techsSaved) {
          const techsList = JSON.parse(techsSaved);
          if (Array.isArray(techsList)) {
            techsList.forEach((t: any) => {
              const techName = (t.name || '').trim();
              if (techName && techName !== 'Técnico Exemplo' && techName !== 'Técnico Roberto') {
                allNames.push(techName);
              }
            });
          }
        }
      } catch {}

      // Usuário logado atual
      if (currentUser?.name) allNames.push(currentUser.name.trim());
      else if (currentUser?.username) allNames.push(currentUser.username.trim());

      // Normalização inteligente: elimina redundâncias (ex: "admin" quando já existe "Administrador" ou vice-versa)
      const cleanList: string[] = [];
      const seenLower = new Set<string>();

      allNames.forEach((n) => {
        const trimmed = n.trim();
        if (!trimmed) return;
        const lower = trimmed.toLowerCase();

        // Se for "admin" simples mas temos "Administrador", prioriza "Administrador"
        if (lower === 'admin' && allNames.some((o) => o.toLowerCase() === 'administrador')) {
          return;
        }

        if (!seenLower.has(lower)) {
          seenLower.add(lower);
          cleanList.push(trimmed);
        }
      });

      const finalList = cleanList.length > 0 ? cleanList : ['Administrador'];
      setAvailableSellers(finalList);

      if (!sellerName || !finalList.includes(sellerName)) {
        setSellerName(finalList[0]);
      }

      // Sincroniza do Firestore também
      getDocs(collection(db, 'users')).then((snap) => {
        if (!snap.empty) {
          const remoteUsers = snap.docs.map((d) => (d.data().name || d.data().username || '').trim()).filter(Boolean);
          setAvailableSellers((prev) => {
            const merged = [...prev];
            remoteUsers.forEach((ru) => {
              const ruLower = ru.toLowerCase();
              if (ruLower === 'admin' && merged.some((o) => o.toLowerCase() === 'administrador')) return;
              if (!merged.some((m) => m.toLowerCase() === ruLower)) {
                merged.push(ru);
              }
            });
            return merged;
          });
        }
      }).catch(() => {});
    } catch {}
  }, [currentUser]);

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

  // Registro na pilha de modais para a tecla ESC disparar a confirmação de fechamento
  useEffect(() => {
    if (isOpen) {
      modalStack.register('SalesModal', () => handleRequestCloseRef.current?.());
      return () => modalStack.unregister('SalesModal');
    }
  }, [isOpen]);

  // Busca e Seleção de Peças
  const [partSearch, setPartSearch] = useState('');
  const [isPartSearchFocused, setIsPartSearchFocused] = useState(false);
  const [selectedPartForAdd, setSelectedPartForAdd] = useState<Part | null>(null);
  const [addQty, setAddQty] = useState<string>('1');
  const [addCustomPrice, setAddCustomPrice] = useState<string>('');

  // Fechamento e Pagamento
  const [paymentMethod, setPaymentMethod] = useState<'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'OUTROS'>('DINHEIRO');
  const [creditInstallments, setCreditInstallments] = useState<number>(1);
  const [discountInput, setDiscountInput] = useState<string>('0');
  const [saleNotes, setSaleNotes] = useState<string>('');

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
  const [saveCartLabelInput, setSaveCartLabelInput] = useState('');

  const [activeTab, setActiveTab] = useState<'POS' | 'HISTORY' | 'SAVED_CARTS'>('POS');
  const [historySearch, setHistorySearch] = useState('');
  const [viewingSaleReceipt, setViewingSaleReceipt] = useState<SaleRecord | null>(null);
  const [viewingSaleDetails, setViewingSaleDetails] = useState<SaleRecord | null>(null);
  const partSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Sempre que o modal de vendas for aberto (ou reaberto após fechar), inicia obrigatoriamente na aba Nova Venda (POS)
  useEffect(() => {
    if (isOpen) {
      setActiveTab('POS');
      setViewingSaleDetails(null);
      setViewingSaleReceipt(null);
      setIsSaveCartModalOpen(false);
      setIsSearchClientModalOpen(false);

      // Carrega os itens do carrinho e cliente gerados externamente (ex: do Orçamento)
      try {
        const localCart = localStorage.getItem('vollen_local_sales_cart');
        if (localCart) {
          setCart(JSON.parse(localCart));
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
        }
      });
      return () => unsub();
    } catch {}
  }, []);

  // Atalho de Teclado (ESC fecha o modal interno ativo primeiro, ou volta/fecha o módulo de vendas)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingSaleDetails) {
          e.preventDefault();
          e.stopPropagation();
          setViewingSaleDetails(null);
        } else if (viewingSaleReceipt) {
          e.preventDefault();
          e.stopPropagation();
          setViewingSaleReceipt(null);
        } else if (isSaveCartModalOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsSaveCartModalOpen(false);
        } else if (isSearchClientModalOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsSearchClientModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, viewingSaleDetails, viewingSaleReceipt, isSaveCartModalOpen, isSearchClientModalOpen, onClose]);

  // Filtragem de Peças para adicionar ao carrinho
  const filteredParts = useMemo(() => {
    const term = partSearch.trim().toLowerCase();
    if (!term || !Array.isArray(parts)) return [];
    return parts.filter(
      (p) =>
        p &&
        ((p.name && p.name.toLowerCase().includes(term)) ||
          (p.code && p.code.toLowerCase().includes(term)) ||
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

  // Totais do Carrinho
  const cartSubtotal = (Array.isArray(cart) ? cart : []).reduce((acc, item) => {
    const sub = typeof item.subtotal === 'number' ? item.subtotal : (parseFloat(String(item?.subtotal || '0')) || 0);
    return acc + sub;
  }, 0);
  const discountVal = Math.max(0, parseFloat((discountInput || '0').replace(',', '.')) || 0);
  const cartTotal = Math.max(0, cartSubtotal - discountVal);

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

  const handleSelectPart = (part: Part) => {
    setSelectedPartForAdd(part);

    // Verifica se o cliente atualmente selecionado é um técnico cadastrado ou botão atalho 'Técnico / Parceiro'
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

    const parsedPrice = parseFloat(String(priceToUse).replace(/\./g, '').replace(',', '.')) || 0;
    setAddCustomPrice(parsedPrice.toFixed(2).replace('.', ','));
    setAddQty('1');
    setPartSearch(part.name);
    setIsPartSearchFocused(false);
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

  // Finalização da Venda (Baixa Estoque + Lança Caixa + Grava Venda)
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      await alert({ title: 'Carrinho Vazio', message: 'Adicione pelo menos uma peça para concluir a venda.', variant: 'warning' });
      return;
    }

    const nextSaleNum = salesHistory.length + 1;
    const saleCode = `VD-${String(nextSaleNum).padStart(4, '0')}`;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('pt-BR');

    const paymentMethodDisplay = paymentMethod === 'CARTAO_CREDITO'
      ? `CARTÃO DE CRÉDITO (${creditInstallments}x de R$ ${(cartTotal / creditInstallments).toFixed(2).replace('.', ',')})`
      : paymentMethod;

    const newSale: SaleRecord = {
      id: `sale_${Date.now()}`,
      saleCode,
      date: dateStr,
      time: timeStr,
      createdAt: now.toISOString(),
      clientId: selectedClientId || undefined,
      clientName: selectedClientName || 'Consumidor Final (Balcão)',
      clientPhone: selectedClientPhone || '',
      clientDocument: selectedClientDoc || '',
      sellerName: sellerName || currentUser?.name || currentUser?.username || 'Atendente Balcão',
      items: [...cart],
      subtotal: cartSubtotal,
      discountAmount: discountVal,
      totalAmount: cartTotal,
      paymentMethod,
      installments: paymentMethod === 'CARTAO_CREDITO' ? creditInstallments : undefined,
      notes: saleNotes,
    };

    // 1. Atualiza e decrementa o estoque das peças vendidas
    const updatedPartsList = parts.map((p) => {
      const soldItem = cart.find((item) => item.partId === p.id);
      if (soldItem) {
        const currentStock = p.stockQuantity ?? 0;
        const newStock = Math.max(0, currentStock - soldItem.qty);
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

    // 2. Lança automaticamente entrada no Caixa
    try {
      const cashSaved = localStorage.getItem('vollen_cash_movements');
      const movements = cashSaved ? JSON.parse(cashSaved) : [];
      const itemsDetailsFormatted = cart
        .map((i) => `${i.qty}x ${i.name} (R$ ${i.unitPrice.toFixed(2).replace('.', ',')} un = R$ ${i.subtotal.toFixed(2).replace('.', ',')})`)
        .join(' | ');

      const newCashMovement = {
        id: `mov_${Date.now()}`,
        type: 'ENTRADA',
        category: 'VENDA',
        description: `Venda Balcão (${saleCode}) - ${cart.map((i) => `${i.qty}x ${i.name} (R$ ${i.subtotal.toFixed(2).replace('.', ',')})`).join(', ')} [${paymentMethodDisplay}]`,
        amount: cartTotal,
        paymentMethod: paymentMethod === 'CARTAO_CREDITO' ? `CARTÃO DE CRÉDITO (${creditInstallments}x)` : paymentMethod,
        date: dateStr,
        time: timeStr,
        userName: sellerName || currentUser?.name || currentUser?.username || 'Sistema Balcão',
        orderCode: saleCode,
        clientName: selectedClientName || 'Consumidor Final',
        notes: `Itens Detalhados: ${itemsDetailsFormatted}`,
      };
      movements.unshift(newCashMovement);
      localStorage.setItem('vollen_cash_movements', JSON.stringify(movements));

      // Sincroniza movimento de caixa com Firestore
      setDoc(doc(db, 'cash_movements', newCashMovement.id), newCashMovement, { merge: true }).catch(() => {});
    } catch (err) {
      console.warn('Erro ao lançar venda no caixa:', err);
    }

    // 3. Salva Venda no Histórico Local e Nuvem
    const updatedHistory = [newSale, ...salesHistory];
    setSalesHistory(updatedHistory);
    try {
      localStorage.setItem('vollen_sales_history', JSON.stringify(updatedHistory));
      await setDoc(doc(db, 'sales', newSale.id), newSale, { merge: true });
    } catch (err) {
      console.warn('Erro ao sincronizar venda na nuvem:', err);
    }

    // Se este carrinho veio de um carrinho salvo, remove-o agora que a venda foi concluída
    if (activeSavedCartId) {
      try {
        setSavedCarts((prev) => prev.filter((sc) => sc.id !== activeSavedCartId));
        await deleteDoc(doc(db, 'saved_carts', activeSavedCartId));
      } catch (err) {
        console.warn('Erro ao remover carrinho salvo concluído:', err);
      }
      setActiveSavedCartId(null);
    }

    // Se esta venda se originou de um Orçamento, marca o Orçamento como APROVADO automaticamente
    try {
      const originEstimateId = localStorage.getItem('vollen_origin_estimate_id');
      if (originEstimateId) {
        const estimatesSaved = localStorage.getItem('vollen_estimates');
        if (estimatesSaved) {
          const estimatesArr = JSON.parse(estimatesSaved);
          if (Array.isArray(estimatesArr)) {
            const nowFormatted = new Date().toLocaleString('pt-BR');
            const respUser = currentUser?.name || sellerName || 'Atendente Balcão';

            const updatedEstimates = estimatesArr.map((est: any) => {
              if (est.id === originEstimateId) {
                const newAuditEntry = {
                  date: nowFormatted,
                  user: respUser,
                  changes: [`Orçamento APROVADO automaticamente após conclusão da Venda Balcão #${saleCode}`],
                };
                const updatedAuditHistory = [newAuditEntry, ...(est.auditHistory || [])];
                const newEstObj = { ...est, status: 'APROVADO', auditHistory: updatedAuditHistory };

                // Atualiza Firestore se estiver conectado
                setDoc(doc(db, 'estimates', originEstimateId), newEstObj, { merge: true }).catch(() => {});

                return newEstObj;
              }
              return est;
            });

            localStorage.setItem('vollen_estimates', JSON.stringify(updatedEstimates));
          }
        }
        localStorage.removeItem('vollen_origin_estimate_id');
      }
    } catch (e) {
      console.warn('Erro ao atualizar status do orçamento para APROVADO:', e);
    }

    if (onSaleCompleted) {
      onSaleCompleted();
    }

    // 4. Limpa formulário e abre visualização de comprovante de venda
    setCart([]);
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
    setViewingSaleReceipt(newSale);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-sans text-xs">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-6xl h-[92vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="p-3.5 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0 shadow-md">
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
            </div>

            <button
              onClick={handleRequestClose}
              className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Principal */}
        {activeTab === 'POS' ? (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 bg-slate-100 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* COLUNA ESQUERDA: Busca de Peças e Carrinho (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col h-full overflow-hidden bg-slate-50">
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
                    placeholder="Digite o nome da peça, código ou referência..."
                    value={partSearch}
                    onChange={(e) => {
                      setPartSearch(e.target.value);
                      setIsPartSearchFocused(true);
                    }}
                    onFocus={() => setIsPartSearchFocused(true)}
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
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-700" />
                    Itens da Venda ({cart.reduce((a, b) => a + b.qty, 0)} unid.):
                  </span>
                  {cart.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSaveCartLabelInput(
                            selectedClientName && selectedClientName !== 'Consumidor Final (Balcão)'
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

            {/* COLUNA DIREITA: Cliente Rápido, Pagamento e Fechamento (5 Cols - Compacto Sem Rolagem) */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full p-3.5 bg-white space-y-2.5 overflow-hidden">
              {/* 1. SELEÇÃO RÁPIDA DE CLIENTE / DESTINATÁRIO */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2 shrink-0">
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
                <div className="grid grid-cols-3 gap-1.5">
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
                    className={`py-2 px-1 rounded-lg border font-bold text-xs transition-all cursor-pointer truncate ${
                      !selectedClientId && selectedClientName.includes('Consumidor Final')
                        ? 'bg-sky-700 text-white border-sky-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    👤 Consumidor Final
                  </button>

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
                    className={`py-2 px-1 rounded-lg border font-bold text-xs transition-all cursor-pointer truncate ${
                      !selectedClientId && selectedClientName.includes('Técnico')
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    🛠️ Técnico / Parceiro
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClientSearchFilter('');
                      setIsSearchClientModalOpen(true);
                    }}
                    className={`py-2 px-1 rounded-lg border font-bold text-xs transition-all cursor-pointer truncate flex items-center justify-center gap-1.5 ${
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
                <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9.5px] font-bold uppercase text-slate-400 block tracking-wider">
                      Emitir Comprovante Para:
                    </span>
                    <span className="font-extrabold text-slate-900 text-xs truncate block">
                      {selectedClientName}
                    </span>
                    {(selectedClientPhone || selectedClientDoc) && (
                      <span className="text-[10px] text-slate-500 block truncate">
                        {selectedClientPhone ? `Tel: ${selectedClientPhone}` : ''}
                        {selectedClientPhone && selectedClientDoc ? ' • ' : ''}
                        {selectedClientDoc ? `Doc: ${selectedClientDoc}` : ''}
                      </span>
                    )}
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
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer transition-colors text-[10.5px] font-bold"
                      title="Remover cliente e voltar para Consumidor Final"
                    >
                      ✕ Limpar
                    </button>
                  )}
                </div>
              </div>

              {/* 2. FORMA DE PAGAMENTO COMPACTA */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 shrink-0">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  Forma de Pagamento:
                </span>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('DINHEIRO')}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer text-[11px] ${
                      paymentMethod === 'DINHEIRO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    Dinheiro
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer text-[11px] ${
                      paymentMethod === 'PIX'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    PIX
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARTAO_DEBITO')}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer text-[11px] ${
                      paymentMethod === 'CARTAO_DEBITO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Débito
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARTAO_CREDITO')}
                    className={`py-1.5 px-1 rounded-lg border flex items-center justify-center gap-1 font-bold transition-all cursor-pointer text-[11px] ${
                      paymentMethod === 'CARTAO_CREDITO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Crédito
                  </button>
                </div>

                {/* SELETOR DE PARCELAS (CRÉDITO) */}
                {paymentMethod === 'CARTAO_CREDITO' && (
                  <div className="mt-1.5 bg-emerald-50 border border-emerald-300 rounded-lg p-2 flex items-center justify-between gap-2 animate-fadeIn">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="text-[11px] font-bold text-emerald-950">Parcelamento:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={creditInstallments}
                        onChange={(e) => setCreditInstallments(parseInt(e.target.value, 10))}
                        className="bg-white border border-emerald-400 rounded-lg px-2 py-1 text-xs font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                          const valParcela = cartTotal > 0 ? (cartTotal / num).toFixed(2).replace('.', ',') : '0,00';
                          return (
                            <option key={num} value={num}>
                              {num === 1 ? `1x à vista (R$ ${valParcela})` : `${num}x de R$ ${valParcela}`}
                            </option>
                          );
                        })}
                      </select>
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
              <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-2xl p-3.5 shadow-md space-y-2 shrink-0">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Subtotal: <strong>R$ {cartSubtotal.toFixed(2).replace('.', ',')}</strong></span>
                  {discountVal > 0 && (
                    <span className="text-emerald-400 font-semibold">Desc: -R$ {discountVal.toFixed(2).replace('.', ',')}</span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-300">Vendedor:</span>
                    <select
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      className="bg-slate-800 text-emerald-300 border border-emerald-500/40 rounded-lg px-2 py-0.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer max-w-[140px] truncate"
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

                <div className="border-t border-white/20 pt-1.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Total a Pagar:</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    R$ {cartTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleFinalizeSale}
                  disabled={cart.length === 0}
                  className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                    cart.length > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:shadow-emerald-500/25 active:scale-98'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  CONCLUIR VENDA E EMITIR RECIBO
                </button>
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
                              setPaymentMethod(sc.paymentMethod || 'DINHEIRO');
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
        ) : (
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
        )}

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
        )}

        {/* MODAL DE VISUALIZAÇÃO E IMPRESSÃO DO COMPROVANTE DE VENDA */}
        {viewingSaleReceipt && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans max-h-[90vh]">
              {/* Topo Modal Impressão */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
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
              <div className="p-4 overflow-y-auto flex-1 bg-slate-100 flex justify-center" id="sale-print-area">
                <div
                  className={`bg-white border border-slate-300 p-4 rounded-xl shadow-xs text-xs text-slate-800 space-y-3 ${
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
              <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center gap-2">
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
                    className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-md cursor-pointer"
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
                <button
                  type="button"
                  onClick={() => setIsSearchClientModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
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
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verifique os termos digitados na busca.
                    </p>
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
                            <td className="p-2.5 font-bold text-slate-900">{client.name}</td>
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
                        try {
                          await setDoc(doc(db, 'saved_carts', cartId), newSavedCart, { merge: true });
                        } catch (err) {
                          console.warn('Erro ao salvar carrinho na nuvem:', err);
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
                    try {
                      await setDoc(doc(db, 'saved_carts', cartId), newSavedCart, { merge: true });
                    } catch (err) {
                      console.warn('Erro ao salvar carrinho na nuvem:', err);
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
      </div>
    </div>
  );
};
