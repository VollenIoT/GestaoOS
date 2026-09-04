import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import {
  FileText,
  Search,
  PlusCircle,
  Clock,
  CheckCircle,
  Wrench,
  User,
  Share2,
  ChevronRight,
  Phone,
  Edit3,
  Trash2,
  X,
  AlertTriangle,
  Navigation,
  MapPin,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { getCurrentUserMobile, fetchOSPreferencesMobile, subscribeOSPreferencesMobile } from '../services/api';

interface OrdersListScreenProps {
  orders: any[];
  onSelectOrder: (order: any) => void;
  onOpenCreateOrder: () => void;
  onEditOrder?: (order: any) => void;
  onCancelOrder?: (order: any) => void;
  onRefresh: () => void;
}

export const OrdersListScreen: React.FC<OrdersListScreenProps> = ({
  orders,
  onSelectOrder,
  onOpenCreateOrder,
  onEditOrder,
  onCancelOrder,
  onRefresh,
}) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ABERTA' | 'FINALIZADA' | 'ALL'>('ABERTA');
  const [showCancelled, setShowCancelled] = useState(false);
  const [routeOrderSelected, setRouteOrderSelected] = useState<any | null>(null);
  const [osPreferences, setOsPreferences] = useState<any>(null);

  useEffect(() => {
    getCurrentUserMobile().then(setCurrentUser);
    fetchOSPreferencesMobile().then((p) => {
      if (p) setOsPreferences(p);
    });
    const unsub = subscribeOSPreferencesMobile((p) => {
      if (p) setOsPreferences(p);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const roleUpper = (currentUser?.role || '').toUpperCase();
  const isAdmin = Boolean(
    currentUser?.isAdmin ||
    roleUpper === 'ADMIN' ||
    (currentUser?.username || '').toLowerCase() === 'admin'
  );

  const filteredOrders = orders.filter((o) => {
    // Se não for Admin, restringe a visualização para as OS atribuídas a ele ou sem técnico atribuído
    if (!isAdmin && currentUser) {
      const orderTech = (o.technician || o.technicianName || o.assignedTechnician || '').toLowerCase().trim();
      const techId = String(o.technicianId || '').toLowerCase().trim();
      const myName = (currentUser.name || '').toLowerCase().trim();
      const myUser = (currentUser.username || '').toLowerCase().trim();
      const myId = String(currentUser.id || '').toLowerCase().trim();

      if (orderTech || techId) {
        const isMine =
          (orderTech && myName && orderTech === myName) ||
          (orderTech && myUser && orderTech === myUser) ||
          (techId && myId && techId === myId);

        if (!isMine) return false;
      }
    }

    const stUpper = (o.status || '').toUpperCase();
    const isCancelled = stUpper === 'CANCELADA';
    // Se showCancelled estiver falso, oculta as ordens canceladas em todas as abas
    if (isCancelled && !showCancelled) {
      return false;
    }

    const term = searchTerm.toLowerCase().trim();
    const digitsSearch = term.replace(/\D/g, '');
    const orderCodeDigits = (o.code || '').replace(/\D/g, '');
    const clientPhoneDigits = (o.client?.phone || '').replace(/\D/g, '');
    const clientWhatsappDigits = (o.client?.whatsapp || '').replace(/\D/g, '');
    const clientCpfCnpjDigits = (o.client?.cpfCnpj || o.client?.cpf || o.client?.cnpj || '').replace(/\D/g, '');
    const serialDigits = (o.equipment?.serialNumber || '').replace(/\D/g, '');

    const matchesDigits = digitsSearch.length >= 1 && (
      orderCodeDigits.includes(digitsSearch) ||
      clientPhoneDigits.includes(digitsSearch) ||
      clientWhatsappDigits.includes(digitsSearch) ||
      clientCpfCnpjDigits.includes(digitsSearch) ||
      serialDigits.includes(digitsSearch)
    );

    const matchesSearch =
      matchesDigits ||
      (o.code || '').toLowerCase().includes(term) ||
      (o.client?.name || '').toLowerCase().includes(term) ||
      (o.client?.phone || '').toLowerCase().includes(term) ||
      (o.client?.whatsapp || '').toLowerCase().includes(term) ||
      (o.equipment?.type || '').toLowerCase().includes(term) ||
      (o.equipment?.brand || '').toLowerCase().includes(term) ||
      (o.equipment?.model || '').toLowerCase().includes(term) ||
      (o.technician || o.technicianName || '').toLowerCase().includes(term);

    const isFinished = stUpper === 'FINALIZADA' || stUpper === 'CONCLUIDA' || stUpper === 'GARANTIA_FINALIZADA' || stUpper === 'GARANTIA/FINALIZADA';
    if (activeFilter === 'ABERTA') {
      return matchesSearch && !isFinished && !isCancelled;
    }
    if (activeFilter === 'FINALIZADA') {
      return matchesSearch && isFinished;
    }
    return matchesSearch;
  }).filter((o, idx, arr) => {
    // Deduplicação estrita: se for código temporário de espera (ex: 'Aguardando...'), deduplica APENAS por ID
    const isTempCode = !o.code || String(o.code).includes('Aguardando');
    if (isTempCode) {
      return arr.findIndex((item) => item.id === o.id) === idx;
    }
    // Para OS com número oficial definitivo, deduplica por ID ou Código
    return arr.findIndex((item) => (item.id && item.id === o.id) || (item.code && item.code === o.code)) === idx;
  }).sort((a, b) => {
    // Ordenação: a última OS gerada deve aparecer no topo
    // 1. Pelo timestamp de criação (createdAt ou data)
    const timeA = new Date(a.createdAt || a.entryDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.entryDate || 0).getTime();
    if (timeA && timeB && timeA !== timeB) return timeB - timeA;

    // 2. Fallback pelo número da OS (ex: OS-0005 vs OS-0004)
    const numA = parseInt(String(a.code || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.code || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numB - numA;

    return 0;
  });

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === '') return '0,00';
    const num = typeof val === 'number' ? val : Number(String(val).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return String(val);
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleShareWhatsApp = (order: any) => {
    const phone = (order.client?.whatsapp || order.client?.phone || '').replace(/\D/g, '');
    if (!phone) {
      Alert.alert('Atenção', 'Este cliente não possui telefone ou WhatsApp cadastrado.');
      return;
    }

    const clientName = order.client?.name || 'Cliente';
    const osCode = order.code || 'OS';
    const equipName = [order.equipment?.type, order.equipment?.brand, order.equipment?.model].filter(Boolean).join(' ') || 'Equipamento';
    const stName = (order.status || 'Em Andamento').replace(/_/g, ' ');
    const totalValStr = `R$ ${formatCurrency(order.totalAmount || 0)}`;

    const isLiberado = order.status === 'APARELHO_LIBERADO' || order.status === 'LIBERADO';
    const templateToUse = isLiberado
      ? (osPreferences?.whatsappMessageStatusLiberado || `Olá, *{cliente}*! Tudo bem?\n\nPassando para informar que a sua Ordem de Serviço *#{numero_os}* (*{equipamento}*) está com status *APARELHO LIBERADO* e o aparelho já se encontra pronto e disponível para retirada!\n\n💰 *Valor Total:* {valor_total}\n\nFicamos à disposição!`)
      : (osPreferences?.whatsappMessageStatusGeneral || `Olá, *{cliente}*! Tudo bem?\n\nInformamos que a sua Ordem de Serviço *#{numero_os}* (*{equipamento}*) teve o status atualizado para: *{status}*.\n\n💰 *Valor Total:* {valor_total}\n\nQualquer dúvida estamos à disposição!`);

    const readyMessage = templateToUse
      .replace(/{cliente}/gi, clientName)
      .replace(/{numero_os}/gi, osCode)
      .replace(/{equipamento}/gi, equipName)
      .replace(/{status}/gi, stName)
      .replace(/{valor_total}/gi, totalValStr);

    Alert.alert(
      `WhatsApp — ${clientName}`,
      'Escolha como deseja abrir a conversa:',
      [
        {
          text: '💬 Mensagem Pronta',
          onPress: () => {
            const url = `https://wa.me/55${phone}?text=${encodeURIComponent(readyMessage)}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
            });
          },
        },
        {
          text: '✉️ Conversa em Branco',
          onPress: () => {
            const url = `https://wa.me/55${phone}`;
            Linking.openURL(url).catch(() => {
              Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
            });
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  // Formata o endereço limpo ignorando complementos como AP, Bloco, Sala, etc.
  const getCleanAddressQuery = (client: any) => {
    if (!client) return '';
    const rawAddress = client.address || '';
    const number = client.number && client.number !== 'S/N' ? client.number : '';
    const neighborhood = client.neighborhood || '';
    const city = client.city || '';
    const state = client.state || '';

    // Remove menções a complementos comuns do logradouro principal se existirem
    const cleanStreet = rawAddress
      .replace(/,\s*(ap|apt|apto|apartamento|bloco|bl|sala|sl|fundos|casa|sobrado)\s*[\w\d-]*/gi, '')
      .replace(/\s+(ap|apt|apto|apartamento|bloco|bl|sala|sl)\s*[\w\d-]*/gi, '')
      .trim();

    const cityState = city && state ? `${city} - ${state}` : city || state;

    const parts = [
      cleanStreet,
      number,
      neighborhood,
      cityState,
    ].filter((p) => Boolean(p && String(p).trim().length > 0));

    return parts.join(', ');
  };

  const handleOpenMapsApp = async (type: 'MAPS' | 'WAZE', order: any) => {
    const query = getCleanAddressQuery(order?.client);
    setRouteOrderSelected(null);

    if (type === 'MAPS') {
      if (!query) {
        // Se não tiver endereço válido, abre apenas o app Maps
        Linking.openURL('geo:0,0?q=');
        return;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      Linking.openURL(url).catch(() => {
        Linking.openURL(`geo:0,0?q=${encodeURIComponent(query)}`);
      });
    } else if (type === 'WAZE') {
      if (!query) {
        // Se não tiver endereço válido, abre apenas o app Waze
        Linking.openURL('waze://').catch(() => {
          Linking.openURL('https://www.waze.com/ul');
        });
        return;
      }
      const wazeUrl = `waze://?q=${encodeURIComponent(query)}&navigate=yes`;
      Linking.openURL(wazeUrl).catch(() => {
        Linking.openURL(`https://www.waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`);
      });
    }
  };

  const [selectedOrderForModal, setSelectedOrderForModal] = useState<any | null>(null);
  const [isConfirmCancelOpen, setIsConfirmCancelOpen] = useState(false);

  const handleLongPressOrder = (order: any) => {
    setSelectedOrderForModal(order);
  };

  return (
    <View style={styles.container}>
      {/* Barra de Busca e Filtros */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por OS, cliente ou aparelho..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'ABERTA' && styles.filterTabActive]}
            onPress={() => setActiveFilter('ABERTA')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'ABERTA' && styles.filterTabTextActive]}>
              Abertas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'FINALIZADA' && styles.filterTabActive]}
            onPress={() => setActiveFilter('FINALIZADA')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'FINALIZADA' && styles.filterTabTextActive]}>
              Finalizadas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeFilter === 'ALL' && styles.filterTabActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'ALL' && styles.filterTabTextActive]}>
              Todas ({orders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              styles.filterTabCancel,
              showCancelled && styles.filterTabCancelActive,
            ]}
            onPress={() => setShowCancelled(!showCancelled)}
          >
            {showCancelled ? (
              <Eye size={12} color="#ffffff" style={{ marginRight: 4 }} />
            ) : (
              <EyeOff size={12} color="#dc2626" style={{ marginRight: 4 }} />
            )}
            <Text
              style={[
                styles.filterTabText,
                { color: showCancelled ? '#ffffff' : '#dc2626' },
              ]}
            >
              {showCancelled ? 'Canceladas' : 'Canceladas'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Ordens de Serviço */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
        refreshing={false}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <FileText size={42} color="#334155" />
            <Text style={styles.emptyText}>Nenhuma Ordem de Serviço encontrada</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.orderCard}
            onPress={() => onSelectOrder(item)}
            onLongPress={() => handleLongPressOrder(item)}
            delayLongPress={500}
          >
            <View style={styles.orderCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.orderCode, String(item.code).includes('Aguardando') && { color: '#f59e0b', fontSize: 13 }]}>
                  {item.code || 'Aguardando Rede...'}
                </Text>
                {String(item.code).includes('Aguardando') && (
                  <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fde68a' }}>
                    <Text style={{ color: '#b45309', fontSize: 9, fontWeight: 'bold' }}>⏳ MODO ESPERA</Text>
                  </View>
                )}
              </View>
              {(() => {
                const st = (item.status || 'ABERTA').toUpperCase();
                const bg =
                  st === 'FINALIZADA' || st === 'CONCLUIDA' ? '#047857'
                  : st === 'APARELHO_LIBERADO' ? '#059669'
                  : st === 'CANCELADA' ? '#dc2626'
                  : st === 'ORCAMENTO_APROVADO' ? '#7c3aed'
                  : st === 'VISITA_TECNICA' ? '#6b21a8'
                  : st === 'AGUARDANDO_PECA' ? '#ea580c'
                  : st === 'RETORNO_GARANTIA' ? '#d97706'
                  : st === 'EM_ATENDIMENTO' || st === 'EM_ANDAMENTO' ? '#0284c7'
                  : '#eab308';

                const label =
                  st === 'ORCAMENTO_APROVADO' ? 'Orçamento Aprovado'
                  : st === 'VISITA_TECNICA' ? 'Visita Técnica'
                  : st === 'AGUARDANDO_PECA' ? 'Aguardando Peça'
                  : st === 'APARELHO_LIBERADO' ? 'Aparelho Liberado'
                  : st === 'RETORNO_GARANTIA' ? 'Retorno em Garantia'
                  : st === 'EM_ATENDIMENTO' ? 'Em Atendimento'
                  : st === 'EM_ANDAMENTO' ? 'Em Andamento'
                  : st === 'FINALIZADA' ? 'Finalizada'
                  : st === 'CANCELADA' ? 'Cancelada'
                  : st === 'ABERTA' ? 'Aberta'
                  : st.replace('_', ' ');

                return (
                  <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                    <Text style={styles.statusBadgeText}>{label}</Text>
                  </View>
                );
              })()}
            </View>

            <View style={styles.orderCardBody}>
              <View style={styles.infoRow}>
                <User size={14} color="#94a3b8" />
                <Text style={styles.clientName}>{String(item.client?.name || 'Cliente Sem Nome')}</Text>
              </View>

              <View style={styles.infoRow}>
                <Wrench size={14} color="#94a3b8" />
                <Text style={styles.equipmentInfo}>
                  {typeof item.equipment === 'object' && item.equipment !== null
                    ? [item.equipment.type, item.equipment.brand, item.equipment.model].filter(Boolean).join(' - ')
                    : String(item.equipment || 'Equipamento Geral')}
                </Text>
              </View>

              {/* Técnico Responsável (Discreto para visualização rápida sem abrir a OS) */}
              {(item.technician || item.technicianName) ? (
                <View style={styles.infoRow}>
                  <Text style={styles.techLabel}>Técnico:</Text>
                  <Text style={styles.techNameText} numberOfLines={1}>
                    {item.technician || item.technicianName}
                  </Text>
                </View>
              ) : null}

              {(item.totalAmount || item.totalValue) ? (
                <Text style={styles.amountText}>Valor: R$ {formatCurrency(item.totalAmount || item.totalValue)}</Text>
              ) : null}
            </View>

            {/* Ações Rápidas do Card */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleShareWhatsApp(item)}
              >
                <Phone size={14} color="#10b981" />
                <Text style={[styles.actionBtnText, { color: '#10b981' }]}>WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setRouteOrderSelected(item)}
              >
                <Navigation size={14} color="#38bdf8" />
                <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>Rota GPS</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Botão Flutuante Criar OS */}
      <TouchableOpacity style={styles.fabButton} onPress={onOpenCreateOrder}>
        <PlusCircle size={22} color="#ffffff" />
        <Text style={styles.fabText}>NOVA OS</Text>
      </TouchableOpacity>

      {/* MODAL DE AÇÕES DA OS (PADRÃO VISUAL DO SISTEMA) */}
      <Modal visible={Boolean(selectedOrderForModal) && !isConfirmCancelOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalBox}>
            <View style={styles.actionModalHeader}>
              <View>
                <Text style={styles.actionModalTitle}>Ordem de Serviço {selectedOrderForModal?.code || ''}</Text>
                <Text style={styles.actionModalSubtitle}>
                  Cliente: <Text style={{ color: '#38bdf8' }}>{selectedOrderForModal?.client?.name || 'Não informado'}</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrderForModal(null)} style={{ padding: 4 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionModalBody}>
              <View style={styles.actionOrderInfoTag}>
                <Text style={styles.actionOrderInfoText}>
                  Status: <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>{selectedOrderForModal?.status || 'ABERTA'}</Text>
                </Text>
                <Text style={styles.actionOrderInfoText}>
                  Aparelho: <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>{selectedOrderForModal?.equipment?.type || '-'}</Text>
                </Text>
              </View>

              {/* BOTAO EDITAR OS */}
              <TouchableOpacity
                style={[
                  styles.actionBtnEdit,
                  !isAdmin && (selectedOrderForModal?.status || '').toUpperCase() === 'FINALIZADA' && {
                    backgroundColor: '#334155',
                    opacity: 0.6,
                  },
                ]}
                onPress={() => {
                  const ord = selectedOrderForModal;
                  const isFinal = (ord?.status || '').toUpperCase() === 'FINALIZADA';
                  if (isFinal && !isAdmin) {
                    Alert.alert(
                      'OS Finalizada',
                      'Esta Ordem de Serviço já foi finalizada. Apenas o Administrador possui permissão para reabrir ou alterar uma OS finalizada.'
                    );
                    return;
                  }
                  setSelectedOrderForModal(null);
                  if (onEditOrder) onEditOrder(ord);
                }}
              >
                <Edit3 size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>
                  {!isAdmin && (selectedOrderForModal?.status || '').toUpperCase() === 'FINALIZADA'
                    ? '🔒 OS Finalizada (Bloqueada)'
                    : 'Editar Ordem de Serviço'}
                </Text>
              </TouchableOpacity>

              {/* BOTAO COMPARTILHAR WHATSAPP */}
              <TouchableOpacity
                style={styles.actionBtnShare}
                onPress={() => {
                  const ord = selectedOrderForModal;
                  setSelectedOrderForModal(null);
                  handleShareWhatsApp(ord);
                }}
              >
                <Share2 size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Enviar por WhatsApp</Text>
              </TouchableOpacity>

              {/* BOTAO CANCELAR OS (Apenas se não for finalizada ou se for Admin) */}
              {(isAdmin || (selectedOrderForModal?.status || '').toUpperCase() !== 'FINALIZADA') && (
                <TouchableOpacity
                  style={styles.actionBtnCancel}
                  onPress={() => setIsConfirmCancelOpen(true)}
                >
                  <Trash2 size={18} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Cancelar Ordem de Serviço</Text>
                </TouchableOpacity>
              )}

              {/* BOTAO FECHAR */}
              <TouchableOpacity
                style={styles.actionBtnClose}
                onPress={() => setSelectedOrderForModal(null)}
              >
                <Text style={styles.actionBtnCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO (PADRÃO VISUAL DO SISTEMA) */}
      <Modal visible={isConfirmCancelOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.actionModalBox, { borderColor: '#ef4444' }]}>
            <View style={styles.confirmHeader}>
              <AlertTriangle size={24} color="#ef4444" />
              <Text style={styles.confirmTitle}>Confirmar Cancelamento</Text>
            </View>
            <Text style={styles.confirmMessage}>
              Deseja realmente cancelar a <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>OS {selectedOrderForModal?.code || ''}</Text>? Esta ação marcará a OS como Cancelada.
            </Text>
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.confirmCancelNo}
                onPress={() => setIsConfirmCancelOpen(false)}
              >
                <Text style={styles.confirmBtnNoText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancelYes}
                onPress={() => {
                  const ord = selectedOrderForModal;
                  setIsConfirmCancelOpen(false);
                  setSelectedOrderForModal(null);
                  if (onCancelOrder) onCancelOrder(ord);
                }}
              >
                <Trash2 size={16} color="#ffffff" />
                <Text style={styles.confirmBtnYesText}>Sim, Cancelar OS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE ESCOLHA DE APP DE GPS (GOOGLE MAPS OU WAZE) */}
      <Modal visible={Boolean(routeOrderSelected)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.actionModalBox, { borderColor: '#0284c7' }]}>
            <View style={[styles.actionModalHeader, { backgroundColor: '#0f172a' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Navigation size={20} color="#38bdf8" />
                <View>
                  <Text style={styles.actionModalTitle}>Traçar Rota no GPS</Text>
                  <Text style={styles.actionModalSubtitle}>
                    OS #{routeOrderSelected?.code || ''} - {routeOrderSelected?.client?.name || 'Cliente'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setRouteOrderSelected(null)} style={{ padding: 4 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionModalBody}>
              {/* Endereço de Destino Limpo (Sem Complemento) */}
              <View style={styles.routeAddressCard}>
                <MapPin size={16} color="#38bdf8" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeAddressTitle}>Endereço de Destino:</Text>
                  <Text style={styles.routeAddressText}>
                    {getCleanAddressQuery(routeOrderSelected?.client) || 'Nenhum endereço cadastrado para este cliente.'}
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginVertical: 4 }}>
                Escolha o aplicativo para iniciar a navegação:
              </Text>

              {/* Botão Google Maps */}
              <TouchableOpacity
                style={styles.mapsBtn}
                onPress={() => handleOpenMapsApp('MAPS', routeOrderSelected)}
              >
                <Navigation size={18} color="#ffffff" />
                <Text style={styles.routeBtnText}>Abrir no Google Maps</Text>
              </TouchableOpacity>

              {/* Botão Waze */}
              <TouchableOpacity
                style={styles.wazeBtn}
                onPress={() => handleOpenMapsApp('WAZE', routeOrderSelected)}
              >
                <Navigation size={18} color="#ffffff" />
                <Text style={styles.routeBtnText}>Abrir no Waze</Text>
              </TouchableOpacity>

              {/* Botão Cancelar */}
              <TouchableOpacity
                style={styles.actionBtnClose}
                onPress={() => setRouteOrderSelected(null)}
              >
                <Text style={styles.actionBtnCloseText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  topBar: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    color: '#0f172a',
    fontSize: 13,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterTabActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filterTabCancel: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  filterTabCancelActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  filterTabText: { fontSize: 11, fontWeight: 'bold', color: '#64748b' },
  filterTabTextActive: { color: '#ffffff' },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  orderCode: { fontSize: 14, fontWeight: 'bold', color: '#0284c7', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
  orderCardBody: { paddingVertical: 8, gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontSize: 13, fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase' },
  equipmentInfo: { fontSize: 12, color: '#64748b' },
  techLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold' },
  techNameText: { fontSize: 11.5, color: '#0369a1', fontWeight: '600' },
  amountText: { fontSize: 12, fontWeight: 'bold', color: '#059669', marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 11, fontWeight: 'bold' },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#10b981',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#64748b', fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  actionModalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  actionModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  actionModalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  actionModalBody: {
    padding: 14,
    gap: 10,
  },
  actionOrderInfoTag: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 4,
  },
  actionOrderInfoText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  actionBtnEdit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnShare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionBtnClose: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#334155',
    borderRadius: 8,
    marginTop: 2,
  },
  actionBtnCloseText: {
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 12,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#450a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#7f1d1d',
  },
  confirmTitle: {
    color: '#fca5a5',
    fontSize: 15,
    fontWeight: 'bold',
  },
  confirmMessage: {
    padding: 14,
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    paddingTop: 0,
  },
  confirmCancelNo: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#334155',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnNoText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  confirmCancelYes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
  },
  confirmBtnYesText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  routeAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  routeAddressTitle: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  routeAddressText: {
    color: '#f8fafc',
    fontSize: 12,
    lineHeight: 16,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ea4335',
    paddingVertical: 12,
    borderRadius: 10,
  },
  wazeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#33ccff',
    paddingVertical: 12,
    borderRadius: 10,
  },
  routeBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
