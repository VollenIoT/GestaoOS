import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  RotateCcw,
  Clock,
  FileText,
  User,
  Package,
  Wrench,
  X,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';
import {
  getTrashItems,
  SoftDeletedItem,
  logAuditEvent,
} from '../services/auditLogService';

interface TrashBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  /** Chamado quando um item é restaurado, para o App.tsx recarregar os dados */
  onRestored?: (entityType: SoftDeletedItem['entityType'], data: any) => void;
}

type FilterType = 'all' | SoftDeletedItem['entityType'];

const ENTITY_LABELS: Record<SoftDeletedItem['entityType'], string> = {
  order: 'Ordem de Serviço',
  client: 'Cliente',
  part: 'Peça',
  service: 'Serviço',
};

const ENTITY_ICONS: Record<SoftDeletedItem['entityType'], React.ReactNode> = {
  order: <FileText className="w-4 h-4 text-sky-600" />,
  client: <User className="w-4 h-4 text-emerald-600" />,
  part: <Package className="w-4 h-4 text-amber-600" />,
  service: <Wrench className="w-4 h-4 text-purple-600" />,
};

const ENTITY_COLORS: Record<SoftDeletedItem['entityType'], string> = {
  order: 'bg-sky-50 border-sky-200 text-sky-700',
  client: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  part: 'bg-amber-50 border-amber-200 text-amber-700',
  service: 'bg-purple-50 border-purple-200 text-purple-700',
};

function getDaysRemaining(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getItemLabel(item: SoftDeletedItem): string {
  const d = item.data;
  if (item.entityType === 'order') return d.code || `OS #${item.originalId.slice(-4)}`;
  if (item.entityType === 'client') return d.name || 'Cliente sem nome';
  if (item.entityType === 'part') return d.name || 'Peça sem nome';
  if (item.entityType === 'service') return d.name || 'Serviço sem nome';
  return item.originalId;
}

function getItemSubtitle(item: SoftDeletedItem): string {
  const d = item.data;
  if (item.entityType === 'order') {
    return `Cliente: ${d.client?.name || 'N/D'} · ${d.equipment?.type || 'N/D'}`;
  }
  if (item.entityType === 'client') {
    return `Telefone: ${d.phone || d.whatsapp || 'N/D'}`;
  }
  if (item.entityType === 'part') {
    return `Código: ${d.code || 'N/D'} · Estoque: ${d.stockQuantity ?? 'N/D'}`;
  }
  if (item.entityType === 'service') {
    return `Código: ${d.code || 'N/D'} · Preço: R$ ${d.price || '0,00'}`;
  }
  return '';
}

function removeFromTrash(trashId: string) {
  try {
    const raw = localStorage.getItem('vollen_trash_bin');
    if (!raw) return;
    const list: SoftDeletedItem[] = JSON.parse(raw);
    const updated = list.filter((i) => i.id !== trashId);
    localStorage.setItem('vollen_trash_bin', JSON.stringify(updated));
  } catch {}
}

export const TrashBinModal: React.FC<TrashBinModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRestored,
}) => {
  const [items, setItems] = useState<SoftDeletedItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoredId, setRestoredId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const loadItems = useCallback(() => {
    setItems(getTrashItems());
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadItems();
      setSearch('');
      setFilter('all');
      setRestoredId(null);
      setConfirmDelete(null);
    }
  }, [isOpen, loadItems]);

  const handleRestore = async (item: SoftDeletedItem) => {
    setRestoring(item.id);
    try {
      // Tenta restaurar no Firestore se disponível
      try {
        const { db } = await import('../services/firebase');
        const { doc, setDoc } = await import('firebase/firestore');
        const collectionName =
          item.entityType === 'order' ? 'orders'
          : item.entityType === 'client' ? 'clients'
          : item.entityType === 'part' ? 'parts'
          : 'services';
        await setDoc(doc(db, collectionName, item.originalId), item.data, { merge: true });
      } catch {
        // Firestore offline — apenas restaura localmente
      }

      // Restaura no localStorage conforme o tipo
      const storageKeys: Record<SoftDeletedItem['entityType'], string> = {
        order: 'vollen_os_list',
        client: 'vollen_clients_list',
        part: 'vollen_parts_stock',
        service: 'vollen_services',
      };
      const key = storageKeys[item.entityType];
      try {
        const raw = localStorage.getItem(key);
        const list: any[] = raw ? JSON.parse(raw) : [];
        const alreadyExists = list.some((i) => i.id === item.originalId);
        if (!alreadyExists) {
          const updated = [{ ...item.data, id: item.originalId }, ...list];
          localStorage.setItem(key, JSON.stringify(updated));
        }
      } catch {}

      // Remove da lixeira
      removeFromTrash(item.id);

      // Registra log de auditoria da restauração
      logAuditEvent({
        userId: currentUser?.id || currentUser?.username || 'sistema',
        userName: currentUser?.name || currentUser?.username || 'Sistema',
        action: 'RESTORE_ITEM',
        targetType: item.entityType,
        targetId: item.originalId,
        details: { restoredFrom: 'trash_bin', label: getItemLabel(item) },
      });

      setRestoredId(item.id);
      setTimeout(() => setRestoredId(null), 2500);
      loadItems();

      // Notifica o App.tsx para recarregar os dados
      if (onRestored) {
        onRestored(item.entityType, { ...item.data, id: item.originalId });
      }
    } catch (err) {
      console.error('Erro ao restaurar item:', err);
    } finally {
      setRestoring(null);
    }
  };

  const handlePermanentDelete = (item: SoftDeletedItem) => {
    removeFromTrash(item.id);
    logAuditEvent({
      userId: currentUser?.id || currentUser?.username || 'sistema',
      userName: currentUser?.name || currentUser?.username || 'Sistema',
      action: item.entityType === 'order' ? 'DELETE_OS' : item.entityType === 'client' ? 'DELETE_CLIENT' : 'DELETE_PART',
      targetType: item.entityType,
      targetId: item.originalId,
      details: { permanentDelete: true, label: getItemLabel(item) },
    });
    setConfirmDelete(null);
    loadItems();
  };

  const handleEmptyTrash = () => {
    try {
      localStorage.setItem('vollen_trash_bin', JSON.stringify([]));
    } catch {}
    setConfirmDelete(null);
    loadItems();
  };

  if (!isOpen) return null;

  const filtered = items.filter((item) => {
    const matchType = filter === 'all' || item.entityType === filter;
    const label = getItemLabel(item).toLowerCase();
    const sub = getItemSubtitle(item).toLowerCase();
    const matchSearch = !search || label.includes(search.toLowerCase()) || sub.includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const counts: Record<FilterType, number> = {
    all: items.length,
    order: items.filter((i) => i.entityType === 'order').length,
    client: items.filter((i) => i.entityType === 'client').length,
    part: items.filter((i) => i.entityType === 'part').length,
    service: items.filter((i) => i.entityType === 'service').length,
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col max-h-[88vh] overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Lixeira Virtual</h2>
              <p className="text-xs text-slate-500">Itens excluídos recentemente — disponíveis por 7 dias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Filtros e busca */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 bg-slate-50 space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar na lixeira..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
            />
          </div>

          {/* Filtro por tipo */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {(['all', 'order', 'client', 'part', 'service'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-red-500 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-red-300 hover:text-red-600'
                }`}
              >
                {f === 'all' ? 'Todos' : ENTITY_LABELS[f as SoftDeletedItem['entityType']]}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  filter === f ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {counts[f]}
                </span>
              </button>
            ))}

            {items.length > 0 && (
              <button
                onClick={() => setConfirmDelete('__all__')}
                className="ml-auto px-3 py-1 rounded-full text-xs font-medium bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-all"
              >
                Esvaziar lixeira
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">
                {items.length === 0 ? 'A lixeira está vazia' : 'Nenhum item encontrado'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {items.length === 0
                  ? 'Itens excluídos aparecem aqui por 7 dias antes de serem removidos permanentemente.'
                  : 'Tente outro filtro ou termo de busca.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const daysLeft = getDaysRemaining(item.expiresAt);
              const isRestoring = restoring === item.id;
              const isRestored = restoredId === item.id;

              return (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                    isRestored
                      ? 'bg-emerald-50 border-emerald-300 scale-[0.99]'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Ícone do tipo */}
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${ENTITY_COLORS[item.entityType]}`}>
                    {ENTITY_ICONS[item.entityType]}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ENTITY_COLORS[item.entityType]}`}>
                        {ENTITY_LABELS[item.entityType]}
                      </span>
                      {daysLeft <= 1 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Expira em breve!
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1 truncate">{getItemLabel(item)}</p>
                    <p className="text-xs text-slate-500 truncate">{getItemSubtitle(item)}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Excluído em {new Date(item.deletedAt).toLocaleDateString('pt-BR')} por {item.deletedBy}
                      </span>
                      <span className={`font-semibold ${daysLeft <= 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {daysLeft === 0 ? 'Expira hoje' : `${daysLeft} dia${daysLeft > 1 ? 's' : ''} restante${daysLeft > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isRestored ? (
                      <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        Restaurado!
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isRestoring}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                          {isRestoring ? 'Restaurando...' : 'Restaurar'}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 flex items-center justify-center transition-all"
                          title="Excluir permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com info */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-[10px] text-slate-400">
            {items.length} {items.length === 1 ? 'item' : 'itens'} na lixeira · Expiração automática após 7 dias
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de confirmação de exclusão permanente */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">
              {confirmDelete === '__all__' ? 'Esvaziar lixeira?' : 'Excluir permanentemente?'}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {confirmDelete === '__all__'
                ? 'Todos os itens serão removidos permanentemente. Esta ação não pode ser desfeita.'
                : 'Este item será removido definitivamente e não poderá ser recuperado.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmDelete === '__all__') {
                    handleEmptyTrash();
                  } else {
                    const item = items.find((i) => i.id === confirmDelete);
                    if (item) handlePermanentDelete(item);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors shadow-sm"
              >
                {confirmDelete === '__all__' ? 'Esvaziar' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
