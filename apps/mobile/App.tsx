import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StatusBar,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { FileText, Users, Calendar, Wrench, LogOut, Settings, Sliders, Building2, WifiOff } from 'lucide-react-native';
import { Image } from 'react-native';
import { OrdersListScreen } from './src/screens/OrdersListScreen';
import { ClientsListScreen } from './src/screens/ClientsListScreen';
import { OptionsScreen } from './src/screens/OptionsScreen';
import { CreateOrderScreen } from './src/screens/CreateOrderScreen';
import { CreateClientScreen } from './src/screens/CreateClientScreen';
import { DailyVisitsScreen } from './src/screens/DailyVisitsScreen';
import { VisitExecutionScreen } from './src/screens/VisitExecutionScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { QrLinkScreen } from './src/screens/QrLinkScreen';
import {
  fetchOrdersMobile,
  fetchClientsMobile,
  fetchVisitsByTechnician,
  fetchCompanyDataMobile,
  subscribeCompanyDataMobile,
  TEST_MODE_COMPANY,
  saveOrderMobile,
  syncPendingOrdersMobile,
  subscribeOrdersMobile,
  subscribeClientsMobile,
  getCurrentUserMobile,
  logoutUserMobile,
  getLinkedCompanyMobile,
  unlinkCompanyMobile,
  verifyAndSyncApiKeyMobile,
  subscribeSecurityValidationMobile,
} from './src/services/api';
import {
  sendLocalVisitNotification,
  getViewedVisitIds,
} from './src/services/notifications';

export default function App() {
  const [linkedCompany, setLinkedCompany] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'clients' | 'schedule' | 'options'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [clientToEdit, setClientToEdit] = useState<any | null>(null);
  const [unreadVisitsCount, setUnreadVisitsCount] = useState<number>(0);
  
  // Telas ativas em pilha
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  // Sub-seção da tela de Opções (para o botão voltar funcionar)
  const [optionsSection, setOptionsSection] = useState<'MENU' | 'PARTS' | 'EQUIPMENTS' | 'SERVICES'>('MENU');

  const prevVisitIdsRef = useRef<string[]>([]);
  const isFirstLoadRef = useRef(true);

  // Trata o botão físico / gestual de voltar do celular Android
  useEffect(() => {
    const onBackPress = () => {
      // 1. Fechar detalhes de visita
      if (selectedVisit) {
        setSelectedVisit(null);
        return true;
      }

      // 2. Quando o formulário de OS está aberto, o próprio CreateOrderScreen cuida do botão voltar (e de seus modais como Selecionar Cliente)
      if (isCreatingOrder) {
        return false;
      }

      // 3. Sair do formulário de cliente (pede confirmação)
      if (isCreatingClient) {
        const { Alert } = require('react-native');
        Alert.alert(
          'Descartar alterações?',
          'Há informações preenchidas nesta tela. Deseja voltar e descartar as alterações?',
          [
            { text: 'Continuar editando', style: 'cancel' },
            { text: 'Descartar', style: 'destructive', onPress: () => { setIsCreatingClient(false); setClientToEdit(null); } },
          ]
        );
        return true;
      }

      // 4. Voltar da sub-tela de Opções para o menu de Opções
      if (activeTab === 'options' && optionsSection !== 'MENU') {
        setOptionsSection('MENU');
        return true;
      }

      // 5. Voltar de qualquer aba para a aba principal (OS)
      if (activeTab !== 'orders') {
        setActiveTab('orders');
        return true;
      }

      // 6. Na tela principal: perguntar antes de sair do app
      const { Alert } = require('react-native');
      Alert.alert(
        'Sair do aplicativo?',
        'Deseja realmente sair do Vollen OS?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]
      );
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedVisit, isCreatingClient, isCreatingOrder, activeTab, optionsSection]);

  useEffect(() => {
    async function checkAuth() {
      // 1. Verificação silenciosa da ApiKey com o servidor
      const keyCheck = await verifyAndSyncApiKeyMobile();
      if (!keyCheck.valid) {
        setLinkedCompany(null);
        setCurrentUser(null);
        setAuthChecked(true);
        return;
      }

      const linked = await getLinkedCompanyMobile();
      setLinkedCompany(linked);

      const user = await getCurrentUserMobile();

      // Em modo de teste, sempre usar dados neutros sem buscar do Firestore
      if (linked?.isTestMode) {
        setCompanyInfo(TEST_MODE_COMPANY);
      } else {
        const company = await fetchCompanyDataMobile();
        if (company) setCompanyInfo(company);
      }

      setCurrentUser(user);
      setAuthChecked(true);
    }
    checkAuth();

    const unsubComp = subscribeCompanyDataMobile((data) => {
      if (data) setCompanyInfo(data);
    });

    // Escuta em tempo real: se ApiKey for alterada no PC ou se o usuário logado for deletado
    const unsubSec = subscribeSecurityValidationMobile({
      onApiKeyInvalidated: () => {
        const { Alert } = require('react-native');
        Alert.alert(
          'ApiKey Invalidada',
          'A ApiKey desta empresa foi alterada ou revogada no sistema principal. Por favor, insira a nova ApiKey para reconectar.'
        );
        setLinkedCompany(null);
        setCurrentUser(null);
      },
      onUserInvalidated: () => {
        const { Alert } = require('react-native');
        Alert.alert(
          'Acesso Revogado',
          'Sua conta de usuário foi excluída ou desativada no sistema principal. Sua sessão foi encerrada.'
        );
        setCurrentUser(null);
      },
    });

    return () => {
      unsubComp();
      unsubSec();
    };
  }, []);

  const filterOrdersForCurrentUser = (rawOrders: any[], user: any) => {
    if (!user) return [];
    const roleUpper = (user.role || '').toUpperCase();
    const isAdmin = user.isAdmin || roleUpper === 'ADMIN' || (user.username || '').toLowerCase() === 'admin';
    if (isAdmin) return rawOrders;

    const currentName = (user.name || '').toLowerCase().trim();
    const currentUsername = (user.username || '').toLowerCase().trim();
    const currentId = String(user.id || '').toLowerCase().trim();

    return rawOrders.filter((o) => {
      const assigned = (o.technician || o.technicianName || o.assignedTechnician || '').toLowerCase().trim();
      const techId = String(o.technicianId || '').toLowerCase().trim();

      // Se a OS não tem técnico específico atribuído, técnicos também podem ver para atender
      if (!assigned && !techId) return true;

      return (
        (assigned && currentName && assigned === currentName) ||
        (assigned && currentUsername && assigned === currentUsername) ||
        (techId && currentId && techId === currentId)
      );
    });
  };

  const updateVisitsAndNotify = async (user: any) => {
    if (!user) return;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const visits = await fetchVisitsByTechnician(user.name || user.username, todayStr);
      const viewedIds = await getViewedVisitIds();

      const currentVisitIds = visits.map((v) => v.id || v.orderId);
      const unread = visits.filter((v) => !viewedIds.includes(v.id || v.orderId));
      setUnreadVisitsCount(unread.length);

      // Se não for a primeira carga, detecta visitas inseridas recentemente e notifica
      if (!isFirstLoadRef.current) {
        const newVisits = visits.filter((v) => !prevVisitIdsRef.current.includes(v.id || v.orderId));
        for (const nv of newVisits) {
          sendLocalVisitNotification(nv, (targetVisit) => {
            setSelectedVisit(targetVisit);
          });
        }
      } else {
        isFirstLoadRef.current = false;
      }

      prevVisitIdsRef.current = currentVisitIds;
    } catch (err) {
      console.warn('Erro ao atualizar contador de visitas:', err);
    }
  };

  const loadAllData = async () => {
    try {
      await syncPendingOrdersMobile();
      const [ords, clis] = await Promise.all([fetchOrdersMobile(), fetchClientsMobile()]);
      setOrders(filterOrdersForCurrentUser(ords, currentUser));
      setClients(clis);
      await updateVisitsAndNotify(currentUser);
    } catch (err) {
      console.error('Erro ao carregar dados móveis:', err);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadAllData();
    syncPendingOrdersMobile();

    // Monitor de conectividade simples e leve
    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 2000);
        await fetch('https://clients3.google.com/generate_204', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(t);
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    // Escuta em tempo real direto da nuvem
    const unsubOrders = subscribeOrdersMobile((realtimeOrders) => {
      setOrders(filterOrdersForCurrentUser(realtimeOrders, currentUser));
      updateVisitsAndNotify(currentUser);
    });
    const unsubClients = subscribeClientsMobile((realtimeClients) => {
      setClients(realtimeClients);
    });

    return () => {
      clearInterval(interval);
      unsubOrders();
      unsubClients();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await logoutUserMobile();
    setCurrentUser(null);
  };

  if (!authChecked) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </SafeAreaView>
    );
  }

  // 1. Se o celular ainda não foi vinculado a uma empresa via QR Code / SuperLogin
  if (!linkedCompany) {
    return (
      <QrLinkScreen
        onLinkedSuccess={async (linked) => {
          const compData = linked?.testPayload || linked;
          setLinkedCompany(compData);
          setCurrentUser(null);
          fetchCompanyDataMobile().then((comp) => {
            if (comp) setCompanyInfo(comp);
          });
        }}
      />
    );
  }

  // 2. Se já foi vinculado à empresa, exibe a tela de login do técnico
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => setCurrentUser(user)}
        onUnlinkCompany={async () => {
          await unlinkCompanyMobile();
          setLinkedCompany(null);
          setCurrentUser(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header Principal do App (Identidade da Empresa Conectada) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBadge}>
            {companyInfo?.logoUrl ? (
              <Image
                source={{ uri: companyInfo.logoUrl }}
                style={{ width: 28, height: 28, borderRadius: 6 }}
                resizeMode="contain"
              />
            ) : (
              <Wrench size={16} color="#38bdf8" />
            )}
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {companyInfo?.tradingName || companyInfo?.name || 'Vollen OS'}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {currentUser.name || currentUser.username} {currentUser.role === 'Admin' || currentUser.isAdmin ? '👑 (Admin)' : ''}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <WifiOff size={12} color="#f59e0b" />
              <Text style={styles.offlineBadgeText}>Offline</Text>
            </View>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Roteamento de Telas */}
      <View style={styles.content}>
        {isCreatingOrder ? (
          <CreateOrderScreen
            clients={clients}
            orderToEdit={orderToEdit}
            onBack={() => {
              setIsCreatingOrder(false);
              setOrderToEdit(null);
            }}
            onSaved={() => {
              loadAllData();
            }}
            onOpenCreateClient={() => {
              setClientToEdit(null);
              setIsCreatingClient(true);
            }}
          />
        ) : isCreatingClient ? (
          <CreateClientScreen
            clientToEdit={clientToEdit}
            onBack={() => {
              setIsCreatingClient(false);
              setClientToEdit(null);
            }}
            onSaved={() => {
              setIsCreatingClient(false);
              setClientToEdit(null);
              loadAllData();
            }}
          />
        ) : selectedVisit ? (
          <VisitExecutionScreen
            visit={selectedVisit}
            onBack={() => {
              setSelectedVisit(null);
              updateVisitsAndNotify(currentUser);
            }}
            onRefresh={() => {
              setSelectedVisit(null);
              loadAllData();
            }}
            onEditOrder={(order) => {
              setSelectedVisit(null);
              setOrderToEdit(order);
              setIsCreatingOrder(true);
            }}
          />
        ) : activeTab === 'orders' ? (
          <OrdersListScreen
            orders={orders}
            onSelectOrder={(order) => setSelectedVisit(order)}
            onOpenCreateOrder={() => {
              setOrderToEdit(null);
              setIsCreatingOrder(true);
            }}
            onEditOrder={(order) => {
              setOrderToEdit(order);
              setIsCreatingOrder(true);
            }}
            onCancelOrder={async (order) => {
              try {
                await saveOrderMobile({ ...order, status: 'CANCELADA' });
                loadAllData();
              } catch (err) {
                console.error('Erro ao cancelar OS:', err);
              }
            }}
            onRefresh={loadAllData}
          />
        ) : activeTab === 'schedule' ? (
          <DailyVisitsScreen
            technicianName={currentUser?.name || currentUser?.username || 'Técnico'}
            onSelectVisit={(visit) => {
              setSelectedVisit(visit);
              updateVisitsAndNotify(currentUser);
            }}
          />
        ) : activeTab === 'clients' ? (
          <ClientsListScreen
            clients={clients}
            onOpenCreateClient={() => {
              setClientToEdit(null);
              setIsCreatingClient(true);
            }}
            onEditClient={(client) => {
              setClientToEdit(client);
              setIsCreatingClient(true);
            }}
            onDeleteClient={async (client) => {
              try {
                const { deleteClientMobile } = await import('./src/services/api');
                await deleteClientMobile(client.id);
                loadAllData();
              } catch (err) {
                console.error('Erro ao deletar cliente:', err);
              }
            }}
            onRefresh={loadAllData}
          />
        ) : activeTab === 'options' ? (
          <OptionsScreen
            onRefreshAll={loadAllData}
            section={optionsSection}
            onSectionChange={setOptionsSection}
          />
        ) : null}
      </View>

      {/* Barra de Navegação Inferior (Bottom Navigation com Aba Clientes, Visitas e Opções para Admin) */}
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
            onPress={() => {
              setActiveTab('schedule');
              updateVisitsAndNotify(currentUser);
            }}
          >
            <View style={{ position: 'relative' }}>
              <Calendar size={20} color={activeTab === 'schedule' ? '#38bdf8' : '#64748b'} />
              {unreadVisitsCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>
                    {unreadVisitsCount > 9 ? '9+' : unreadVisitsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navText,
                activeTab === 'schedule' && styles.navTextActive,
                unreadVisitsCount > 0 && { color: '#38bdf8', fontWeight: 'bold' },
              ]}
            >
              Visitas {unreadVisitsCount > 0 ? `(${unreadVisitsCount})` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'clients' && styles.navItemActive]}
            onPress={() => setActiveTab('clients')}
          >
            <Users size={20} color={activeTab === 'clients' ? '#38bdf8' : '#64748b'} />
            <Text style={[styles.navText, activeTab === 'clients' && styles.navTextActive]}>
              Clientes ({clients.length})
            </Text>
          </TouchableOpacity>

          {/* Aba Opções (Exibida para Usuários Administradores) */}
          {(currentUser?.role === 'Admin' || currentUser?.isAdmin || currentUser?.username === 'admin') && (
            <TouchableOpacity
              style={[styles.navItem, activeTab === 'options' && styles.navItemActive]}
              onPress={() => {
                setOptionsSection('MENU');
                setActiveTab('options');
              }}
            >
              <Sliders size={20} color={activeTab === 'options' ? '#38bdf8' : '#64748b'} />
              <Text style={[styles.navText, activeTab === 'options' && styles.navTextActive]}>
                Opções
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    backgroundColor: '#0284c7',
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  headerSubtitle: { fontSize: 12, color: '#38bdf8', marginTop: 1 },
  logoutBtn: {
    padding: 8,
    backgroundColor: '#1e293b',
    borderRadius: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  content: { flex: 1, backgroundColor: '#f1f5f9' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 2,
    position: 'relative',
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#0284c7',
  },
  navText: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },
  navTextActive: { color: '#0284c7' },
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#0284c7',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});

