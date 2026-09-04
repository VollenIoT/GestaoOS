import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Sparkles, MapPin, Wrench, Clock, ChevronRight } from 'lucide-react-native';
import { fetchVisitsByTechnician } from '../services/api';
import { getViewedVisitIds, markVisitAsViewed } from '../services/notifications';

interface DailyVisitsScreenProps {
  technicianName: string;
  onSelectVisit: (visit: any) => void;
}

export const DailyVisitsScreen: React.FC<DailyVisitsScreenProps> = ({
  technicianName,
  onSelectVisit,
}) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVisits = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [data, viewed] = await Promise.all([
        fetchVisitsByTechnician(technicianName, todayStr),
        getViewedVisitIds(),
      ]);
      setVisits(data);
      setViewedIds(viewed);
    } catch (error) {
      console.error('Erro ao carregar visitas do dia:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, [technicianName]);

  const onRefresh = () => {
    setRefreshing(true);
    loadVisits();
  };

  const handleSelect = async (item: any) => {
    const vId = item.id || item.orderId;
    if (vId) {
      await markVisitAsViewed(vId);
      setViewedIds((prev) => (prev.includes(vId) ? prev : [...prev, vId]));
    }
    onSelectVisit(item);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADA':
        return '#3b82f6';
      case 'EM_ROTA':
        return '#a855f7';
      case 'EM_ANDAMENTO':
        return '#f59e0b';
      case 'CONCLUIDA':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda de Visitas</Text>
        <Text style={styles.headerSubtitle}>Técnico Responsável: {technicianName}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id || `v-${Math.random()}`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284c7" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma visita agendada para você no momento.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isUnread = !viewedIds.includes(item.id || item.orderId);

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  isUnread && styles.cardUnread,
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.8}
              >
                {isUnread && (
                  <View style={styles.unreadBanner}>
                    <Sparkles size={12} color="#ffffff" />
                    <Text style={styles.unreadBannerText}>NOVA VISITA NÃO LIDA</Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isUnread && <View style={styles.unreadDot} />}
                    <Text style={styles.osCode}>{item.orderCode || item.order?.code || 'OS'}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) + '33' },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <Text style={styles.clientName}>{item.clientName || item.order?.client?.name}</Text>

                <View style={styles.detailRow}>
                  <MapPin size={13} color="#64748b" style={{ marginTop: 2 }} />
                  <Text style={styles.detailText} numberOfLines={2}>
                    {item.clientAddress || (item.order?.client?.address ? `${item.order.client.address}, ${item.order.client.number || 'S/N'}` : 'Endereço não informado')}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Wrench size={13} color="#0284c7" />
                  <Text style={[styles.detailText, { color: '#0f172a', fontWeight: 'bold' }]}>
                    {typeof item.equipment === 'object' && item.equipment !== null
                      ? [item.equipment.type, item.equipment.brand, item.equipment.model].filter(Boolean).join(' - ')
                      : item.deviceType || item.order?.equipment?.type || 'Aparelho'}
                  </Text>
                </View>

                {item.problemReported ? (
                  <Text style={styles.problemText} numberOfLines={2}>
                    Defeito: {item.problemReported}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                      <Clock size={11} color="#0369a1" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369a1' }}>
                        {item.date || item.scheduledDate
                          ? new Date(
                              (item.date || item.scheduledDate).includes('T')
                                ? item.date || item.scheduledDate
                                : `${item.date || item.scheduledDate}T12:00:00`
                            ).toLocaleDateString('pt-BR')
                          : 'Sem data definida'}
                      </Text>
                    </View>
                    {item.period ? (
                      <Text style={styles.periodText}>
                        {item.period === 'MANHA'
                          ? 'Manhã (08h - 12h)'
                          : item.period === 'TARDE'
                          ? 'Tarde (13h - 18h)'
                          : item.period && item.period.includes(':')
                          ? `${item.period}h`
                          : item.period}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <Text style={[styles.actionText, isUnread && { color: '#0284c7', fontWeight: 'bold' }]}>
                      {isUnread ? 'Visualizar e Iniciar →' : 'Executar Serviço →'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#0284c7',
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardUnread: {
    borderColor: '#0284c7',
    borderWidth: 1.5,
    backgroundColor: '#f0f9ff',
  },
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  unreadBannerText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  problemText: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  osCode: {
    color: '#0284c7',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  clientName: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  detailText: {
    flex: 1,
    color: '#64748b',
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  periodText: {
    color: '#64748b',
    fontSize: 12,
  },
  actionText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
});
