import React, { useState } from 'react';
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
  Users,
  Search,
  PlusCircle,
  Phone,
  MapPin,
  MessageCircle,
  ChevronRight,
  User,
  Trash2,
  Edit3,
  AlertTriangle,
} from 'lucide-react-native';
import { deleteClientMobile } from '../services/api';

interface ClientsListScreenProps {
  clients: any[];
  onOpenCreateClient: () => void;
  onEditClient?: (client: any) => void;
  onDeleteClient?: (client: any) => void;
  onRefresh: () => void;
}

export const ClientsListScreen: React.FC<ClientsListScreenProps> = ({
  clients,
  onOpenCreateClient,
  onEditClient,
  onDeleteClient,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientForModal, setSelectedClientForModal] = useState<any | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredClients = clients.filter((c) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;

    const digitsSearch = term.replace(/\D/g, '');
    const phoneDigits = (c.phone || '').replace(/\D/g, '');
    const whatsappDigits = (c.whatsapp || '').replace(/\D/g, '');
    const cpfCnpjDigits = (c.cpfCnpj || c.cpf || c.cnpj || '').replace(/\D/g, '');
    const codeDigits = (c.code || '').replace(/\D/g, '');

    const matchesDigits = digitsSearch.length >= 1 && (
      phoneDigits.includes(digitsSearch) ||
      whatsappDigits.includes(digitsSearch) ||
      cpfCnpjDigits.includes(digitsSearch) ||
      codeDigits.includes(digitsSearch)
    );

    return (
      matchesDigits ||
      (c.name || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.whatsapp || '').toLowerCase().includes(term) ||
      (c.address || '').toLowerCase().includes(term) ||
      (c.neighborhood || '').toLowerCase().includes(term) ||
      (c.city || '').toLowerCase().includes(term)
    );
  });

  const handleCallPhone = (phoneNum?: string) => {
    if (!phoneNum) return;
    const clean = phoneNum.replace(/\D/g, '');
    if (clean) {
      Linking.openURL(`tel:${clean}`);
    }
  };

  const handleOpenWhatsApp = (whatsappNum?: string, name?: string) => {
    if (!whatsappNum) return;
    const clean = whatsappNum.replace(/\D/g, '');
    if (clean) {
      const message = `Olá, ${name || 'Cliente'}! Entramos em contato da Vollen Assistência Técnica.`;
      Linking.openURL(`https://wa.me/55${clean}?text=${encodeURIComponent(message)}`);
    }
  };

  const handleLongPressClient = (client: any) => {
    setSelectedClientForModal(client);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClientForModal) return;
    setIsDeleting(true);
    try {
      if (onDeleteClient) {
        await onDeleteClient(selectedClientForModal);
      } else {
        await deleteClientMobile(selectedClientForModal.id);
        onRefresh();
      }
      setIsConfirmDeleteOpen(false);
      setSelectedClientForModal(null);
    } catch {
      Alert.alert('Erro', 'Não foi possível excluir o cliente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Barra de Busca Superior */}
      <View style={styles.topBar}>
        <View style={styles.searchBox}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, telefone, endereço..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{filteredClients.length} Clientes</Text>
        </View>
      </View>

      {/* Lista de Clientes */}
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id || `cli-${Math.random()}`}
        contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
        refreshing={false}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Users size={42} color="#334155" />
            <Text style={styles.emptyText}>Nenhum cliente cadastrado ou encontrado.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const phoneDisplay = item.phone || item.whatsapp || '';
          const addressDisplay = [
            item.address,
            item.number ? `Nº ${item.number}` : '',
            item.neighborhood,
            item.city ? `${item.city}${item.state ? `/${item.state}` : ''}` : '',
          ].filter(Boolean).join(' - ');

          return (
            <TouchableOpacity
              style={styles.clientListItem}
              onPress={() => onEditClient && onEditClient(item)}
              onLongPress={() => handleLongPressClient(item)}
              delayLongPress={400}
              activeOpacity={0.7}
            >
              <View style={styles.clientListContent}>
                <View style={styles.clientListTopRow}>
                  <Text style={styles.clientListName} numberOfLines={1}>
                    {item.name?.toUpperCase() || 'CLIENTE SEM NOME'}
                  </Text>
                  {item.code ? (
                    <Text style={styles.clientListCode}>#{item.code}</Text>
                  ) : null}
                </View>

                {addressDisplay ? (
                  <View style={styles.clientListInfoRow}>
                    <MapPin size={12} color="#64748b" style={{ marginTop: 1 }} />
                    <Text style={styles.clientListAddress} numberOfLines={1}>
                      {addressDisplay}
                    </Text>
                  </View>
                ) : null}

                {phoneDisplay ? (
                  <View style={styles.clientListInfoRow}>
                    <Phone size={12} color="#0284c7" style={{ marginTop: 1 }} />
                    <Text style={styles.clientListPhone}>
                      {phoneDisplay}
                    </Text>
                    {item.whatsapp && (
                      <TouchableOpacity
                        style={styles.whatsAppBadge}
                        onPress={() => handleOpenWhatsApp(item.whatsapp, item.name)}
                      >
                        <MessageCircle size={10} color="#16a34a" />
                        <Text style={styles.whatsAppBadgeText}>WhatsApp</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </View>

              <ChevronRight size={18} color="#cbd5e1" />
            </TouchableOpacity>
          );
        }}
      />

      {/* Botão Flutuante Criar Novo Cliente */}
      <TouchableOpacity style={styles.fabButton} onPress={onOpenCreateClient}>
        <PlusCircle size={22} color="#ffffff" />
        <Text style={styles.fabText}>NOVO CLIENTE</Text>
      </TouchableOpacity>

      {/* MODAL DE AÇÕES RÁPIDAS AO SEGURAR O CLIENTE */}
      <Modal visible={Boolean(selectedClientForModal && !isConfirmDeleteOpen)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalBox}>
            <View style={styles.actionModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionModalTitle} numberOfLines={1}>
                  {selectedClientForModal?.name || 'Cliente'}
                </Text>
                <Text style={styles.actionModalSubtitle}>
                  {selectedClientForModal?.code ? `Código #${selectedClientForModal.code}` : 'Opções do Cliente'}
                </Text>
              </View>
            </View>

            <View style={styles.actionButtonsList}>
              {/* EDITAR CLIENTE */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#0284c7' }]}
                onPress={() => {
                  const cli = selectedClientForModal;
                  setSelectedClientForModal(null);
                  if (onEditClient) onEditClient(cli);
                }}
              >
                <Edit3 size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Editar Dados do Cliente</Text>
              </TouchableOpacity>

              {/* LIGAR */}
              {Boolean(selectedClientForModal?.phone) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#334155' }]}
                  onPress={() => {
                    handleCallPhone(selectedClientForModal?.phone);
                    setSelectedClientForModal(null);
                  }}
                >
                  <Phone size={18} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Ligar ({selectedClientForModal?.phone})</Text>
                </TouchableOpacity>
              )}

              {/* WHATSAPP */}
              {Boolean(selectedClientForModal?.whatsapp) && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#16a34a' }]}
                  onPress={() => {
                    handleOpenWhatsApp(selectedClientForModal?.whatsapp, selectedClientForModal?.name);
                    setSelectedClientForModal(null);
                  }}
                >
                  <MessageCircle size={18} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Conversar no WhatsApp</Text>
                </TouchableOpacity>
              )}

              {/* EXCLUIR CLIENTE */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#dc2626' }]}
                onPress={() => setIsConfirmDeleteOpen(true)}
              >
                <Trash2 size={18} color="#ffffff" />
                <Text style={styles.actionBtnText}>Excluir Cliente</Text>
              </TouchableOpacity>

              {/* BOTAO FECHAR */}
              <TouchableOpacity
                style={styles.actionBtnClose}
                onPress={() => setSelectedClientForModal(null)}
              >
                <Text style={styles.actionBtnCloseText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal visible={isConfirmDeleteOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.actionModalBox, { borderColor: '#ef4444' }]}>
            <View style={styles.confirmHeader}>
              <AlertTriangle size={24} color="#ef4444" />
              <Text style={styles.confirmTitle}>Confirmar Exclusão</Text>
            </View>
            <Text style={styles.confirmMessage}>
              Deseja realmente excluir o cliente <Text style={{ fontWeight: 'bold', color: '#ffffff' }}>{selectedClientForModal?.name || ''}</Text>? Esta ação removerá o cliente do sistema.
            </Text>
            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                style={styles.confirmCancelNo}
                disabled={isDeleting}
                onPress={() => setIsConfirmDeleteOpen(false)}
              >
                <Text style={styles.confirmBtnNoText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancelYes}
                disabled={isDeleting}
                onPress={handleConfirmDelete}
              >
                <Trash2 size={16} color="#ffffff" />
                <Text style={styles.confirmBtnYesText}>{isDeleting ? 'Excluindo...' : 'Sim, Excluir'}</Text>
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
    gap: 8,
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
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  countText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  clientListItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  clientListContent: {
    flex: 1,
    marginRight: 8,
    gap: 4,
  },
  clientListTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  clientListName: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  clientListCode: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0284c7',
    fontFamily: 'monospace',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  clientListInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clientListAddress: {
    flex: 1,
    fontSize: 11,
    color: '#64748b',
  },
  clientListPhone: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  whatsAppBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  whatsAppBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#0284c7',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  emptyBox: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  // ESTILOS DOS MODAIS (PADRAO SISTEMA OS)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
    marginBottom: 14,
  },
  actionModalTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actionModalSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  actionButtonsList: {
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionBtnClose: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionBtnCloseText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  // MODAL DE CONFIRMACAO
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  confirmTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmMessage: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  confirmCancelNo: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  confirmBtnNoText: {
    color: '#cbd5e1',
    fontWeight: 'bold',
    fontSize: 13,
  },
  confirmCancelYes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  confirmBtnYesText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
