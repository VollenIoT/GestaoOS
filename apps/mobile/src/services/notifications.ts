import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Gerenciamento de visitas lidas/visualizadas pelo técnico
const VIEWED_VISITS_KEY = 'vollen_viewed_visits_ids';

export async function registerForPushNotificationsAsync(): Promise<boolean> {
  // Inicialização segura sem quebrar o dev client ou hermes
  return true;
}

// Dispara aviso/notificação de nova visita técnica
export async function sendLocalVisitNotification(visit: any, onOpenVisit?: (visit: any) => void) {
  try {
    const code = visit.orderCode || visit.order?.code || '';
    const client = visit.clientName || visit.order?.client?.name || 'Cliente';
    const device = visit.deviceType || visit.order?.equipment?.type || 'Aparelho';

    Alert.alert(
      `📅 Nova Visita Agendada: ${code}`,
      `Cliente: ${client}\nAparelho: ${device}\n\nUma nova visita técnica foi vinculada a você!`,
      [
        { text: 'Ver Depois', style: 'cancel' },
        {
          text: 'Abrir Visita Agora',
          onPress: () => {
            if (onOpenVisit) onOpenVisit(visit);
          },
        },
      ]
    );
  } catch (err) {
    console.warn('Erro ao notificar visita:', err);
  }
}

export async function getViewedVisitIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(VIEWED_VISITS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function markVisitAsViewed(visitId: string): Promise<void> {
  if (!visitId) return;
  try {
    const current = await getViewedVisitIds();
    if (!current.includes(visitId)) {
      const updated = [...current, visitId];
      await AsyncStorage.setItem(VIEWED_VISITS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Erro ao marcar visita como lida:', err);
  }
}
