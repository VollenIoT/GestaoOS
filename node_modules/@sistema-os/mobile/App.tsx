import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { FileText, Users, Calendar, Wrench, Settings } from 'lucide-react-native';
import { OrdersListScreen } from './src/screens/OrdersListScreen';
import { CreateOrderScreen } from './src/screens/CreateOrderScreen';
import { CreateClientScreen } from './src/screens/CreateClientScreen';
import { DailyVisitsScreen } from './src/screens/DailyVisitsScreen';
import { VisitExecutionScreen } from './src/screens/VisitExecutionScreen';
import {
  fetchOrdersMobile,
  fetchClientsMobile,
  getServerUrl,
  setServerUrl,
} from './src/services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'orders' | 'clients' | 'schedule' | 'settings'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Telas ativas em pilha
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);

  const loadAllData = async () => {
    try {
      const [ords, clis] = await Promise.all([fetchOrdersMobile(), fetchClientsMobile()]);
      setOrders(ords);
      setClients(clis);
    } catch (err) {
      console.error('Erro ao carregar dados móveis:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header Principal do App */}
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Wrench size={16} color="#38bdf8" />
        </View>
        <Text style={styles.headerTitle}>Vollen OS Mobile</Text>
      </View>

      {/* Roteamento de Telas */}
      <View style={styles.content}>
        {isCreatingOrder ? (
          <CreateOrderScreen
            clients={clients}
            onBack={() => setIsCreatingOrder(false)}
            onSaved={() => {
              setIsCreatingOrder(false);
              loadAllData();
            }}
            onOpenCreateClient={() => setIsCreatingClient(true)}
          />
        ) : isCreatingClient ? (
          <CreateClientScreen
            onBack={() => setIsCreatingClient(false)}
            onSaved={(newClient) => {
              setIsCreatingClient(false);
              loadAllData();
            }}
          />
        ) : selectedVisit ? (
          <VisitExecutionScreen
            visit={selectedVisit}
            onBack={() => setSelectedVisit(null)}
            onRefresh={() => {
              setSelectedVisit(null);
              loadAllData();
            }}
          />
        ) : activeTab === 'orders' ? (
          <OrdersListScreen
            orders={orders}
            onSelectOrder={(order) => {}}
            onOpenCreateOrder={() => setIsCreatingOrder(true)}
            onRefresh={loadAllData}
          />
        ) : activeTab === 'schedule' ? (
          <DailyVisitsScreen
            technicianName="Técnico Roberto"
            onSelectVisit={(visit) => setSelectedVisit(visit)}
          />
        ) : (
          <OrdersListScreen
            orders={orders}
            onSelectOrder={() => {}}
            onOpenCreateOrder={() => setIsCreatingOrder(true)}
            onRefresh={loadAllData}
          />
        )}
      </View>

      {/* Barra de Navegação Inferior (Bottom Navigation) */}
      {!isCreatingOrder && !isCreatingClient && !selectedVisit && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'orders' && styles.navItemActive]}
            onPress={() => setActiveTab('orders')}
          >
            <FileText size={20} color={activeTab === 'orders' ? '#38bdf8' : '#64748b'} />
            <Text style={[styles.navText, activeTab === 'orders' && styles.navTextActive]}>
              Ordens OS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'schedule' && styles.navItemActive]}
            onPress={() => setActiveTab('schedule')}
          >
            <Calendar size={20} color={activeTab === 'schedule' ? '#38bdf8' : '#64748b'} />
            <Text style={[styles.navText, activeTab === 'schedule' && styles.navTextActive]}>
              Visitas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setIsCreatingClient(true)}
          >
            <Users size={20} color="#64748b" />
            <Text style={styles.navText}>+ Cliente</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    gap: 8,
  },
  logoBadge: {
    backgroundColor: '#0369a1',
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1 },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#38bdf8',
  },
  navText: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  navTextActive: { color: '#38bdf8' },
});
