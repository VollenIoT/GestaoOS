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
} from 'lucide-react-native';

interface ClientsListScreenProps {
  clients: any[];
  onOpenCreateClient: () => void;
  onEditClient?: (client: any) => void;
  onRefresh: () => void;
}

export const ClientsListScreen: React.FC<ClientsListScreenProps> = ({
  clients,
  onOpenCreateClient,
  onEditClient,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

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
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Users size={42} color="#334155" />
            <Text style={styles.emptyText}>Nenhum cliente cadastrado ou encontrado.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.clientCard}
            onPress={() => onEditClient && onEditClient(item)}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.avatarBox}>
                <User size={18} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.clientName}>{item.name || 'Cliente Sem Nome'}</Text>
                {item.code && <Text style={styles.clientCode}>Cód: #{item.code}</Text>}
              </View>
              <ChevronRight size={18} color="#94a3b8" />
            </View>

            <View style={styles.cardBody}>
              {/* Telefone / WhatsApp */}
              {(item.phone || item.whatsapp) && (
                <View style={styles.contactRow}>
                  {item.phone ? (
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => handleCallPhone(item.phone)}
                    >
                      <Phone size={13} color="#0284c7" />
                      <Text style={styles.actionChipText}>{item.phone}</Text>
                    </TouchableOpacity>
                  ) : null}

                  {item.whatsapp ? (
                    <TouchableOpacity
                      style={[styles.actionChip, styles.whatsappChip]}
                      onPress={() => handleOpenWhatsApp(item.whatsapp, item.name)}
                    >
                      <MessageCircle size={13} color="#16a34a" />
                      <Text style={[styles.actionChipText, { color: '#16a34a' }]}>WhatsApp</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}

              {/* Endereço */}
              {item.address ? (
                <View style={styles.addressRow}>
                  <MapPin size={13} color="#94a3b8" style={{ marginTop: 2 }} />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {item.address}
                    {item.number ? `, ${item.number}` : ''}
                    {item.neighborhood ? ` - ${item.neighborhood}` : ''}
                    {item.city ? ` (${item.city}/${item.state || 'SP'})` : ''}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Botão Flutuante Criar Novo Cliente */}
      <TouchableOpacity style={styles.fabButton} onPress={onOpenCreateClient}>
        <PlusCircle size={22} color="#ffffff" />
        <Text style={styles.fabText}>NOVO CLIENTE</Text>
      </TouchableOpacity>
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
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  clientName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  clientCode: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  cardBody: {
    paddingTop: 10,
    gap: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  whatsappChip: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  actionChipText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  addressText: {
    flex: 1,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 16,
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
});
