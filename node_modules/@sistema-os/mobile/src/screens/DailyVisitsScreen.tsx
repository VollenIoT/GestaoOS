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
import { fetchVisitsByTechnician } from '../services/api';

interface DailyVisitsScreenProps {
  technicianName: string;
  onSelectVisit: (visit: any) => void;
}

export const DailyVisitsScreen: React.FC<DailyVisitsScreenProps> = ({
  technicianName,
  onSelectVisit,
}) => {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadVisits = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const data = await fetchVisitsByTechnician(technicianName, todayStr);
      setVisits(data);
    } catch (error) {
      console.error('Erro ao carregar visitas do dia:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadVisits();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadVisits();
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
        <Text style={styles.headerTitle}>Agenda do Técnico</Text>
        <Text style={styles.headerSubtitle}>Técnico Logado: {technicianName}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284c7" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Nenhuma visita agendada para hoje.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onSelectVisit(item)}>
              <View style={styles.cardHeader}>
                <Text style={styles.osCode}>{item.order?.code}</Text>
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

              <Text style={styles.clientName}>{item.order?.client?.name}</Text>
              
              <Text style={styles.detailText}>
                📍 {item.order?.client?.address}, {item.order?.client?.number} - {item.order?.client?.neighborhood}
              </Text>

              <Text style={styles.detailText}>
                🔧 {item.order?.equipment?.type} ({item.order?.equipment?.brand})
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.periodText}>
                  Período: {item.period === 'MANHA' ? 'Manhã (08h - 12h)' : 'Tarde (13h - 18h)'}
                </Text>
                <Text style={styles.actionText}>Executar Serviço →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#38bdf8',
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  osCode: {
    color: '#38bdf8',
    fontSize: 12,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  detailText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  periodText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  actionText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});
