import React, { useState, useRef, useEffect } from 'react';
import { X, Search, PlusCircle, FolderOpen, Edit3, Trash2, LogOut, User, Check } from 'lucide-react';

import { matchesSearchTerm } from '../utils/searchUtils';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';

interface ColumnConfig {
  id: string;
  label: string;
  width: number;
  visible: boolean;
  fixed?: boolean;
}

interface ClientsModalProps {
  isOpen: boolean;
  clients: any[];
  currentUser?: any;
  initialSearchTerm?: string;
  onClose: () => void;
  onSelectClient?: (client: any) => void;
  onOpenCreateClient: () => void;
  onOpenViewClient?: (client: any, startInEditMode?: boolean) => void;
  onDeleteClient?: (clientId: string) => void;
}

export const ClientsModal: React.FC<ClientsModalProps> = ({
  isOpen,
  clients,
  currentUser,
  initialSearchTerm = '',
  onClose,
  onSelectClient,
  onOpenCreateClient,
  onOpenViewClient,
  onDeleteClient,
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialSearchTerm || '');
      setSelectedClientId(null);
    } else {
      setSearchTerm('');
      setSelectedClientId(null);
    }
  }, [isOpen, initialSearchTerm]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const canManage = Boolean(currentUser?.role === 'Admin' || currentUser?.permissions?.manageClients);

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('clients_modal_columns_v2');
      if (saved) return JSON.parse(saved);
    } catch (err) { }
    return [
      { id: 'code', label: 'Código', width: 80, visible: true, fixed: true },
      { id: 'name', label: 'Nome do Cliente', width: 200, visible: true, fixed: true },
      { id: 'phone', label: 'Telefone Fixo', width: 130, visible: true },
      { id: 'whatsapp', label: 'WhatsApp', width: 130, visible: true },
      { id: 'contactName', label: 'Contato', width: 150, visible: true },
      { id: 'contactPhone', label: 'Tel. Contato', width: 130, visible: true },
      { id: 'address', label: 'Endereço', width: 200, visible: true },
      { id: 'number', label: 'Nº', width: 65, visible: true },
      { id: 'complement', label: 'Complemento', width: 120, visible: false },
      { id: 'neighborhood', label: 'Bairro', width: 130, visible: true },
      { id: 'city', label: 'Cidade', width: 130, visible: true },
      { id: 'state', label: 'UF', width: 60, visible: true },
      { id: 'cep', label: 'CEP', width: 95, visible: false },
      { id: 'reference', label: 'Referência / Ponto', width: 160, visible: false },
      { id: 'email', label: 'E-mail', width: 180, visible: false },
    ];
  });

  const saveColumnsToStorage = (newCols: ColumnConfig[]) => {
    try {
      localStorage.setItem('clients_modal_columns_v2', JSON.stringify(newCols));
    } catch (err) { }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);

  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // Registro na pilha de modais para ESC fechar apenas o último modal aberto
  React.useEffect(() => {
    if (isOpen) {
      modalStack.register('ClientsModal', () => onCloseRef.current?.());
      return () => modalStack.unregister('ClientsModal');
    }
  }, [isOpen]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'F2') {
        e.preventDefault();
        onClose();
        onOpenCreateClient();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenCreateClient, onClose]);

  // Estado para arraste direto via Mouse
  const [draggingColId, setDraggingColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);

  // Limpa estados ao fechar ou desmontar
  useEffect(() => {
    return () => {
      isDraggingRef.current = false;
      setDraggingColId(null);
      setDragOverColId(null);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMouseDownHeader = (e: React.MouseEvent, colId: string) => {
    if ((e.target as HTMLElement).getAttribute('data-resize') === 'true') {
      return;
    }
    e.preventDefault();
    isDraggingRef.current = true;
    setDraggingColId(colId);

    const onGlobalMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const elem = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
      const th = elem?.closest('th[data-col-id]') as HTMLElement | null;
      if (th) {
        const targetId = th.getAttribute('data-col-id');
        if (targetId && targetId !== colId) {
          setDragOverColId(targetId);
        } else {
          setDragOverColId(null);
        }
      } else {
        setDragOverColId(null);
      }
    };

    const cleanup = () => {
      window.removeEventListener('mousemove', onGlobalMouseMove);
      window.removeEventListener('mouseup', onGlobalMouseUp);
      isDraggingRef.current = false;
      setDraggingColId(null);
      setDragOverColId(null);
    };

    const onGlobalMouseUp = (upEvent: MouseEvent) => {
      const wasDragging = isDraggingRef.current;
      cleanup();

      if (!wasDragging) return;

      const elem = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const th = elem?.closest('th[data-col-id]') as HTMLElement | null;
      const targetId = th?.getAttribute('data-col-id');

      if (targetId && targetId !== colId) {
        setColumns((prev) => {
          const srcIdx = prev.findIndex((c) => c.id === colId);
          const destIdx = prev.findIndex((c) => c.id === targetId);
          if (srcIdx === -1 || destIdx === -1) return prev;
          const newCols = [...prev];
          const [moved] = newCols.splice(srcIdx, 1);
          newCols.splice(destIdx, 0, moved);
          saveColumnsToStorage(newCols);
          return newCols;
        });
      }
    };

    window.addEventListener('mousemove', onGlobalMouseMove);
    window.addEventListener('mouseup', onGlobalMouseUp);
  };

  const handleMouseDownResize = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const initialWidth = columns.find((c) => c.id === columnId)?.width || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, initialWidth + deltaX);
      setColumns((prev) => {
        const updated = prev.map((col) => (col.id === columnId ? { ...col, width: newWidth } : col));
        saveColumnsToStorage(updated);
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

  const handleMoveColumn = (columnId: string, direction: 'left' | 'right') => {
    const idx = columns.findIndex((c) => c.id === columnId);
    if (idx === -1) return;
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= columns.length) return;

    const newCols = [...columns];
    const [moved] = newCols.splice(idx, 1);
    newCols.splice(targetIdx, 0, moved);
    setColumns(newCols);
    saveColumnsToStorage(newCols);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const toggleColumnVisibility = (columnId: string) => {
    setColumns((prev) => {
      const updated = prev.map((col) => {
        if (col.fixed) return col;
        return col.id === columnId ? { ...col, visible: !col.visible } : col;
      });
      saveColumnsToStorage(updated);
      return updated;
    });
  };

  const filteredClients = (clients || []).filter((c) => {
    if (!c) return false;
    if (!searchTerm.trim()) return true;
    const nameMatch = matchesSearchTerm(c.name, searchTerm);
    const phoneMatch = matchesSearchTerm(c.phone, searchTerm);
    const whatsappMatch = matchesSearchTerm(c.whatsapp, searchTerm);
    const addressMatch = matchesSearchTerm(c.address, searchTerm);
    const numberMatch = matchesSearchTerm(String(c.number || ''), searchTerm);
    const complementMatch = matchesSearchTerm(c.complement, searchTerm);
    const referenceMatch = matchesSearchTerm(c.reference, searchTerm);
    const cityMatch = matchesSearchTerm(c.city, searchTerm);
    const neighborhoodMatch = matchesSearchTerm(c.neighborhood, searchTerm);
    const codeMatch = matchesSearchTerm(String(c.code || ''), searchTerm);

    return (
      nameMatch ||
      phoneMatch ||
      whatsappMatch ||
      addressMatch ||
      numberMatch ||
      complementMatch ||
      referenceMatch ||
      cityMatch ||
      neighborhoodMatch ||
      codeMatch
    );
  });

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleOpenClient = () => {
    if (!selectedClient) return alert('Por favor, selecione um cliente na tabela.');
    if (onOpenViewClient) {
      onOpenViewClient(selectedClient, false);
    }
  };

  const handleEditClient = () => {
    if (!selectedClient) return alert('Por favor, selecione um cliente na tabela.');
    if (onOpenViewClient) {
      onOpenViewClient(selectedClient, true);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return alert('Por favor, selecione um cliente na tabela.');
    const ok = await dlgConfirm({
      title: 'Excluir Cliente',
      message: `Deseja realmente EXCLUIR o cadastro do cliente "${selectedClient.name}"?`,
      variant: 'danger',
      confirmText: 'Excluir',
    });
    if (ok) {
      if (onDeleteClient) {
        onDeleteClient(selectedClient.id);
      }
      setSelectedClientId(null);
    }
  };

  const renderCellContent = (c: any, columnId: string, index: number) => {
    switch (columnId) {
      case 'code':
        let formattedCode = '0001';
        if (c.code) {
          const num = parseInt(String(c.code).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            formattedCode = String(num).padStart(4, '0');
          } else {
            formattedCode = String(c.code);
          }
        } else if (c.id) {
          const num = parseInt(String(c.id).replace(/\D/g, ''), 10);
          if (!isNaN(num) && num > 0) {
            formattedCode = String(num).padStart(4, '0');
          }
        }
        return (
          <span className="font-mono font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
            {formattedCode}
          </span>
        );
      case 'name':
        return <span className="font-bold text-slate-900">{c.name}</span>;
      case 'phone':
        return <span className="font-semibold text-slate-800">{c.phone || '-'}</span>;
      case 'whatsapp':
        return <span className="font-semibold text-emerald-700">{c.whatsapp || '-'}</span>;
      case 'contactName':
        return <span className="font-semibold text-sky-900">{c.contactName || c.contact1 || '-'}</span>;
      case 'contactPhone':
        return <span className="font-semibold text-slate-700">{c.contactPhone || c.contact1Phone || '-'}</span>;
      case 'address':
        return <span className="truncate">{c.address || '-'}</span>;
      case 'number':
        return <span>{c.number || '-'}</span>;
      case 'complement':
        return <span className="truncate">{c.complement || '-'}</span>;
      case 'neighborhood':
        return <span>{c.neighborhood || '-'}</span>;
      case 'city':
        return <span>{c.city || '-'}</span>;
      case 'state':
        return <span className="uppercase font-bold">{c.state || '-'}</span>;
      case 'cep':
        return <span className="font-mono">{c.cep || '-'}</span>;
      case 'reference':
        return <span className="truncate text-slate-600 italic">{c.reference || '-'}</span>;
      case 'email':
        return <span className="truncate">{c.email || '-'}</span>;
      default:
        return null;
    }
  };

  const isSelectionModeForOS = Boolean(onSelectClient);

  // Calcula a soma exata em pixels das colunas ativas para travar o contêiner da tabela
  const totalPixels = columns
    .filter((c) => c.visible)
    .reduce((acc, col) => acc + col.width, 0);

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => setContextMenu(null)}
    >
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        {/* Header do Modal */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-sky-700" />
            Central de Clientes Cadastrados
          </h2>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra Superior de Pesquisa */}
        <div className="p-4 bg-slate-100 border-b border-slate-300">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente por nome, telefone ou bairro..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-600"
            />
          </div>
        </div>

        {/* Tabela em Modo Unset com Largura Explícita em Pixels (Nenhum campo à esquerda é afetado mesmo sem scroll) */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-slate-50 select-none"
          onContextMenu={handleContextMenu}
          onClick={(e) => {
            // Desseleciona ao clicar em área vazia (fora das linhas da tabela)
            if ((e.target as HTMLElement).closest('tr[data-row]') === null) {
              setSelectedClientId(null);
            }
          }}
        >
          <div style={{ width: `${totalPixels}px`, minWidth: '100%' }}>
            <table
              style={{ tableLayout: 'fixed', width: `${totalPixels}px` }}
              className="text-left text-[11px] text-slate-800 border-collapse"
            >
              <colgroup>
                {columns
                  .filter((col) => col.visible)
                  .map((col) => (
                    <col key={col.id} style={{ width: `${col.width}px` }} />
                  ))}
              </colgroup>
              <thead className="bg-slate-200 text-slate-800 font-bold uppercase sticky top-0 z-20 text-[10px]">
                <tr>
                  {columns
                    .filter((col) => col.visible)
                    .map((col) => {
                      const isDraggingThis = draggingColId === col.id;
                      const isOverThis = dragOverColId === col.id;

                      return (
                        <th
                          key={col.id}
                          data-col-id={col.id}
                          onMouseDown={(e) => handleMouseDownHeader(e, col.id)}
                          style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px`, userSelect: 'none' }}
                          className={`p-1.5 border-b border-r border-slate-300 relative group select-none transition-all cursor-grab active:cursor-grabbing hover:bg-slate-300/90 ${
                            isDraggingThis
                              ? 'opacity-40 bg-sky-300 border-sky-500 scale-[0.98]'
                              : isOverThis
                              ? 'bg-sky-200 border-l-4 border-l-sky-600'
                              : ''
                          }`}
                        >
                          <div className="flex items-center justify-between pointer-events-none select-none">
                            <span className="truncate pr-1 font-bold">{col.label}</span>
                            <span className="text-[10px] text-slate-400 opacity-60 group-hover:opacity-100">⠿</span>
                          </div>
                          <div
                            data-resize="true"
                            onMouseDown={(e) => handleMouseDownResize(e, col.id)}
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-sky-500/60 z-30 opacity-0 group-hover:opacity-100"
                          />
                        </th>
                      );
                    })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredClients.map((c, idx) => {
                  const isSelected = c.id === selectedClientId;
                  return (
                    <tr
                      key={c.id}
                      data-row="true"
                      onClick={() => setSelectedClientId(c.id)}
                      onDoubleClick={() => {
                        setSelectedClientId(c.id);
                        if (onSelectClient) {
                          onSelectClient(c);
                          onClose();
                        } else if (onOpenViewClient) {
                          onOpenViewClient(c, true);
                        }
                      }}
                      className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-sky-100/90 text-sky-950'
                          : 'hover:bg-slate-100 bg-white'
                        }`}
                    >
                      {columns
                        .filter((col) => col.visible)
                        .map((col) => (
                          <td
                            key={col.id}
                            style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}
                            className="p-1.5 border-r border-slate-200 truncate"
                          >
                            {renderCellContent(c, col.id, idx)}
                          </td>
                        ))}
                    </tr>
                  );
                })}

                {filteredClients.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.filter((c) => c.visible).length}
                      className="text-center py-12 text-slate-400"
                    >
                      Nenhum cliente cadastrado ou encontrado para a pesquisa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Menu de Contexto */}
        {contextMenu && (
          <div
            style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
            className="fixed bg-white border border-slate-300 rounded-xl shadow-2xl py-2 min-w-[230px] z-50 text-xs text-slate-800 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100 mb-1">
              Exibir / Remover Colunas
            </div>
            {columns
              .filter((col) => !col.fixed)
              .map((col) => (
                <button
                  key={col.id}
                  onClick={() => toggleColumnVisibility(col.id)}
                  className="w-full text-left px-3 py-1.5 hover:bg-sky-50 text-slate-800 flex items-center justify-between cursor-pointer"
                >
                  <span>{col.label}</span>
                  {col.visible && <Check className="w-3.5 h-3.5 text-sky-600" />}
                </button>
              ))}
          </div>
        )}

        {/* Rodapé Fixo com Ações e Atalho Discreto F2 */}
        <div className="p-3 bg-slate-200 border-t border-slate-300 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 truncate min-w-0">
            <span className="font-semibold text-slate-700 truncate">
              {selectedClient ? (
                <span>
                  Cliente Selecionado: <strong className="text-sky-700">{selectedClient.name}</strong> (
                  {selectedClient.phone})
                </span>
              ) : (
                'Selecione um cliente na tabela acima'
              )}
            </span>
            <span className="text-[11px] text-slate-500 font-mono bg-slate-300/80 px-2 py-0.5 rounded border border-slate-300 shrink-0">
              [F2] Cadastrar Novo Cliente
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSelectClient && (
              <button
                onClick={() => {
                  if (selectedClient) {
                    onSelectClient(selectedClient);
                    onClose();
                  } else {
                    alert('Por favor, selecione um cliente na tabela.');
                  }
                }}
                disabled={!selectedClientId}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span>Selecionar Cliente</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenCreateClient();
              }}
              disabled={!canManage}
              title={!canManage ? 'Você não tem permissão para cadastrar clientes.' : undefined}
              className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Cadastrar Novo Cliente</span>
            </button>

            <button
              onClick={handleOpenClient}
              disabled={!selectedClientId}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Abrir</span>
            </button>

            <button
              onClick={handleEditClient}
              disabled={!selectedClientId || !canManage}
              title={!canManage ? 'Você não tem permissão para editar clientes.' : undefined}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>Editar Cliente</span>
            </button>

            <button
              onClick={handleDeleteClient}
              disabled={!selectedClientId || !canManage}
              title={!canManage ? 'Você não tem permissão para excluir clientes.' : undefined}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>Excluir</span>
            </button>

            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
