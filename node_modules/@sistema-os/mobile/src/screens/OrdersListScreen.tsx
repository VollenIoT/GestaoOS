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
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface OrdersListScreenProps {
  orders: any[];
  onSelectOrder: (order: any) => void;
  onOpenCreateOrder: () => void;
  onRefresh: () => void;
}

export const OrdersListScreen: React.FC<OrdersListScreenProps> = ({
  orders,
  onSelectOrder,
  onOpenCreateOrder,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ABERTA' | 'FINALIZADA'>('ALL');

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.equipment?.type || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (activeFilter === 'ABERTA') {
      return matchesSearch && (o.status || 'ABERTA').toUpperCase() !== 'FINALIZADA';
    }
    if (activeFilter === 'FINALIZADA') {
      return matchesSearch && (o.status || '').toUpperCase() === 'FINALIZADA';
    }
    return matchesSearch;
  });

  const handleShareWhatsApp = (order: any) => {
    const phone = (order.client?.whatsapp || order.client?.phone || '').replace(/\D/g, '');
    if (!phone) {
      Alert.alert('Atenção', 'Este cliente não possui telefone ou WhatsApp cadastrado.');
      return;
    }

    const message = `Olá, ${order.client?.name}!\n\nInformações da sua Ordem de Serviço *${order.code}*:\nEquipamento: ${order.equipment?.type || 'Aparelho'} - ${order.equipment?.brand || ''}\nStatus: *${order.status || 'ABERTA'}*\nValor Total: R$ ${order.totalAmount || '0,00'}\n\nQualquer dúvida estamos à disposição!`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const handleGeneratePDF = async (order: any) => {
    try {
      const htmlContent = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px;">
              <h1 style="color: #0284c7; margin: 0;">VOLLEN - GESTÃO DE OS</h1>
              <p style="margin: 4px 0; font-size: 12px; color: #64748b;">Comprovante de Ordem de Serviço</p>
            </div>

            <div style="margin-top: 20px; padding: 10px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
              <h2 style="color: #0369a1; margin: 0 0 10px 0;">ORDEM DE SERVIÇO: ${order.code}</h2>
              <p><strong>Status:</strong> ${order.status || 'ABERTA'}</p>
              <p><strong>Data:</strong> ${new Date(order.createdAt || Date.now()).toLocaleDateString('pt-BR')}</p>
            </div>

            <div style="margin-top: 15px;">
              <h3 style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">DADOS DO CLIENTE</h3>
              <p><strong>Nome:</strong> ${order.client?.name || 'Não informado'}</p>
              <p><strong>Telefone:</strong> ${order.client?.phone || order.client?.whatsapp || '-'}</p>
              <p><strong>Endereço:</strong> ${order.client?.address ? `${order.client.address}, ${order.client.number || 'S/N'} - ${order.client.neighborhood || ''}` : 'Não informado'}</p>
            </div>

            <div style="margin-top: 15px;">
              <h3 style="border-bottom: 1px solid #cbd5e1; padding-bottom: 4px;">EQUIPAMENTO</h3>
              <p><strong>Aparelho:</strong> ${order.equipment?.type || '-'} ${order.equipment?.brand || ''} ${order.equipment?.model || ''}</p>
              <p><strong>Defeito Reclamado:</strong> ${order.problemDescription || 'Nenhum'}</p>
              <p><strong>Laudo Técnico:</strong> ${order.technicalReport || 'Em análise'}</p>
            </div>

            <div style="margin-top: 20px; text-align: right;">
              <h2 style="color: #0284c7;">VALOR TOTAL: R$ ${order.totalAmount || '0,00'}</h2>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    }
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
            style={[styles.filterTab, activeFilter === 'ALL' && styles.filterTabActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterTabText, activeFilter === 'ALL' && styles.filterTabTextActive]}>
              Todas ({orders.length})
            </Text>
          </TouchableOpacity>

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
        </View>
      </View>

      {/* Lista de Ordens de Serviço */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 80 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <FileText size={42} color="#334155" />
            <Text style={styles.emptyText}>Nenhuma Ordem de Serviço encontrada</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.orderCard} onPress={() => onSelectOrder(item)}>
            <View style={styles.orderCardHeader}>
              <Text style={styles.orderCode}>{item.code}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      (item.status || '').toUpperCase() === 'FINALIZADA'
                        ? '#065f46'
                        : '#075985',
                  },
                ]}
              >
                <Text style={styles.statusBadgeText}>{item.status || 'ABERTA'}</Text>
              </View>
            </View>

            <View style={styles.orderCardBody}>
              <View style={styles.infoRow}>
                <User size={14} color="#94a3b8" />
                <Text style={styles.clientName}>{item.client?.name || 'Cliente Sem Nome'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Wrench size={14} color="#94a3b8" />
                <Text style={styles.equipmentInfo}>
                  {item.equipment?.type} {item.equipment?.brand ? `- ${item.equipment?.brand}` : ''}
                </Text>
              </View>

              {item.totalAmount ? (
                <Text style={styles.amountText}>Valor: R$ {item.totalAmount}</Text>
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
                onPress={() => handleGeneratePDF(item)}
              >
                <Share2 size={14} color="#38bdf8" />
                <Text style={[styles.actionBtnText, { color: '#38bdf8' }]}>PDF / Imprimir</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  topBar: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    color: '#ffffff',
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
    backgroundColor: '#0f172a',
  },
  filterTabActive: {
    backgroundColor: '#0284c7',
  },
  filterTabText: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8' },
  filterTabTextActive: { color: '#ffffff' },
  orderCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 8,
  },
  orderCode: { fontSize: 14, fontWeight: 'bold', color: '#38bdf8', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
  orderCardBody: { paddingVertical: 8, gap: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
  equipmentInfo: { fontSize: 12, color: '#94a3b8' },
  amountText: { fontSize: 12, fontWeight: 'bold', color: '#34d399', marginTop: 2 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
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
});
