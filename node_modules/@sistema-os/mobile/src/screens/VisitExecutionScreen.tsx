import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  MapPin,
  Phone,
  MessageCircle,
  Wrench,
  Package,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  User,
  Navigation,
  Edit3,
} from 'lucide-react-native';
import { getCurrentUserMobile } from '../services/api';

interface VisitExecutionScreenProps {
  visit: any;
  onBack: () => void;
  onRefresh: () => void;
  onEditOrder?: (order: any) => void;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  ABERTA: { label: 'Aberta', color: '#0284c7', bg: '#e0f2fe' },
  ORCAMENTO_APROVADO: { label: 'Orçamento Aprovado', color: '#0d9488', bg: '#ccfbf1' },
  VISITA_TECNICA: { label: 'Visita Técnica', color: '#7c3aed', bg: '#f3e8ff' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', color: '#d97706', bg: '#fef3c7' },
  EM_ANDAMENTO: { label: 'Em Andamento', color: '#d97706', bg: '#fef3c7' },
  AGUARDANDO_PECA: { label: 'Aguardando Peça', color: '#ea580c', bg: '#fff7ed' },
  APARELHO_LIBERADO: { label: 'Aparelho Liberado', color: '#059669', bg: '#dcfce7' },
  RETORNO_GARANTIA: { label: 'Retorno em Garantia', color: '#b45309', bg: '#fef3c7' },
  CONCLUIDA: { label: 'Finalizada', color: '#059669', bg: '#dcfce7' },
  FINALIZADA: { label: 'Finalizada', color: '#059669', bg: '#dcfce7' },
  CANCELADA: { label: 'Cancelada', color: '#dc2626', bg: '#fee2e2' },
};

export const VisitExecutionScreen: React.FC<VisitExecutionScreenProps> = ({
  visit,
  onBack,
  onRefresh,
  onEditOrder,
}) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    getCurrentUserMobile().then(setCurrentUser);
  }, []);

  const openGPS = () => {
    const address = [
      visit.clientAddress || visit.client?.address || visit.order?.client?.address || '',
      visit.client?.city || visit.order?.client?.city || '',
    ].filter(Boolean).join(', ');
    if (!address) {
      Alert.alert('Endereço não disponível', 'Esta OS não possui endereço cadastrado.');
      return;
    }

    Alert.alert(
      'Navegação GPS',
      'Escolha qual aplicativo de navegação você deseja usar para traçar a rota:',
      [
        {
          text: '🚗 Waze',
          onPress: async () => {
            const wazeUrl = `waze://?q=${encodeURIComponent(address)}&navigate=yes`;
            const wazeWebUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;
            try {
              const supported = await Linking.canOpenURL(wazeUrl);
              if (supported) {
                await Linking.openURL(wazeUrl);
              } else {
                await Linking.openURL(wazeWebUrl);
              }
            } catch {
              await Linking.openURL(wazeWebUrl).catch(() => {
                Alert.alert('Erro', 'Não foi possível abrir o Waze.');
              });
            }
          },
        },
        {
          text: '🗺️ Google Maps',
          onPress: () => {
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            Linking.openURL(mapsUrl).catch(() => {
              Alert.alert('Erro', 'Não foi possível abrir o Google Maps.');
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

  const handleCallPhone = (phoneNum?: string, name?: string) => {
    if (!phoneNum) return;
    const clean = phoneNum.replace(/\D/g, '');
    if (!clean) return;

    Alert.alert(
      `Contato — ${name || 'Cliente'}`,
      phoneNum,
      [
        {
          text: '📞 Ligar',
          onPress: () => Linking.openURL(`tel:${clean}`),
        },
        {
          text: '💬 WhatsApp',
          onPress: () => {
            Linking.openURL(`https://wa.me/55${clean}`);
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleOpenWhatsApp = (whatsappNum?: string, name?: string) => {
    if (!whatsappNum) return;
    const clean = whatsappNum.replace(/\D/g, '');
    if (!clean) return;

    Alert.alert(
      `Contato — ${name || 'Cliente'}`,
      whatsappNum,
      [
        {
          text: '📞 Ligar',
          onPress: () => Linking.openURL(`tel:${clean}`),
        },
        {
          text: '💬 WhatsApp',
          onPress: () => {
            Linking.openURL(`https://wa.me/55${clean}`);
          },
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  // Dados da OS
  const order = visit.order || visit;
  const client = order.client || visit.client || {};
  const displayCode = order.code || visit.orderCode || visit.code || 'OS';
  const displayClient = client.name || visit.clientName || 'Cliente';
  const displayAddress = [
    client.address || visit.clientAddress,
    client.number ? `nº ${client.number}` : null,
    client.neighborhood,
    client.city ? `${client.city}/${client.state || ''}` : null,
  ].filter(Boolean).join(', ') || 'Endereço não informado';

  const statusKey = (order.status || visit.status || '').toUpperCase().replace(/ /g, '_');
  const statusInfo = STATUS_MAP[statusKey] || { label: order.status || visit.status || 'Indefinido', color: '#64748b', bg: '#f1f5f9' };

  // Equipamento (pode ser objeto ou string)
  const eqRaw = order.equipment || visit.equipment || visit.equipmentType || '';
  const eqObj = typeof eqRaw === 'object' && eqRaw !== null ? eqRaw : null;
  const equipmentSummary = eqObj
    ? [eqObj.type, eqObj.model, eqObj.brand].filter(Boolean).join(' — ')
    : String(eqRaw || '');

  // Campos textuais com suporte a formatos legados
  let rawProblem = String(order.problemDescription || order.problemReported || order.problem ||
    visit.problemReported || visit.problem || '').trim();
  let rawReport = String(order.technicalReport || visit.technicalReport || visit.notes || '').trim();
  
  // Se o laudo foi gravado junto com o defeito no formato ' | Laudo: '
  if (!rawReport && rawProblem.includes(' | Laudo: ')) {
    const spl = rawProblem.split(' | Laudo: ');
    rawProblem = spl[0].trim();
    rawReport = spl.slice(1).join(' | Laudo: ').trim();
  }

  const problem = rawProblem;
  const technicalReport = rawReport;
  const servicePerformed = String(order.servicePerformed || order.executedService || order.servicoExecutado || visit.servicePerformed || '').trim();
  const orderType = (order.type || visit.orderType || '').toUpperCase();
  const orderTypeLabel = orderType === 'AGENDAMENTO' ? 'Agendamento / Visita Técnica'
    : orderType === 'ORCAMENTO' ? 'Orçamento / Ordem de Serviço'
    : orderType || null;

  // Técnico e agendamento
  const technician = String(order.technician || order.technicianName || visit.technician || visit.technicianName || '').trim();
  const period = visit.period || order.period;
  const scheduledDate = visit.scheduledDate || visit.date || order.scheduledDate;
  const entryDate = order.entryDate || visit.entryDate || order.createdAt;
  const exitDate = order.exitDate || visit.exitDate;

  // Peças e Serviços
  const services: any[] = order.services || order.servicesExecuted || visit.services || [];
  const parts: any[] = order.parts || order.partsUsed || visit.parts || visit.partsUsed || [];
  const totalValue = order.totalValue || order.totalAmount || visit.totalValue;

  // Garantia
  const warrantyType = order.warrantyType || visit.warrantyType;
  const warrantyDays = order.warrantyDays || visit.warrantyDays;
  const warrantyTypeLabel = warrantyType === 'GARANTIA_LOJA' ? 'Garantia da Loja'
    : warrantyType === 'GARANTIA_FABRICA' ? 'Garantia de Fábrica'
    : warrantyType === 'NAO_SE_APLICA' ? 'Sem Garantia'
    : warrantyType || null;

  const formatDate = (d?: string) => {
    if (!d) return null;
    try {
      const clean = d.includes('T') ? d : d + 'T00:00:00';
      return new Date(clean).toLocaleDateString('pt-BR');
    } catch { return d; }
  };

  const periodLabel = period === 'MANHA' ? 'Manhã (08h – 12h)'
    : period === 'TARDE' ? 'Tarde (13h – 18h)'
    : period === 'COMERCIAL' ? 'Horário Comercial'
    : period || null;

  const formatCurrency = (val: any) => {
    if (val === undefined || val === null || val === '') return '0,00';
    const num = typeof val === 'number' ? val : Number(String(val).replace(/\./g, '').replace(',', '.'));
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header com botão voltar e botão Editar OS */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerCode}>{displayCode}</Text>
          <Text style={styles.headerSub}>Detalhes da Ordem de Serviço</Text>
        </View>
        {onEditOrder && (
          <TouchableOpacity
            style={styles.headerEditBtn}
            onPress={() => onEditOrder(order)}
          >
            <Edit3 size={15} color="#ffffff" />
            <Text style={styles.headerEditBtnText}>Editar</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
      </View>

      {/* Card: Cliente */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <User size={16} color="#0284c7" />
          <Text style={styles.cardTitle}>Cliente</Text>
        </View>
        <Text style={styles.clientName}>{displayClient}</Text>

        {(client.phone || client.whatsapp) && (
          <View style={styles.contactRow}>
            {client.phone && (
              <TouchableOpacity style={styles.contactChip} onPress={() => handleCallPhone(client.phone, client.name)}>
                <Phone size={13} color="#0284c7" />
                <Text style={styles.contactChipText}>{client.phone}</Text>
              </TouchableOpacity>
            )}
            {client.whatsapp && (
              <TouchableOpacity style={[styles.contactChip, styles.waChip]} onPress={() => handleOpenWhatsApp(client.whatsapp, client.name)}>
                <MessageCircle size={13} color="#16a34a" />
                <Text style={[styles.contactChipText, { color: '#16a34a' }]}>WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.infoRow}>
          <MapPin size={14} color="#64748b" style={{ marginTop: 2 }} />
          <Text style={styles.infoText} numberOfLines={3}>{displayAddress}</Text>
        </View>

        {(client.phone || client.whatsapp || visit.clientPhone) && !client.phone && (
          <View style={styles.infoRow}>
            <Phone size={14} color="#64748b" />
            <Text style={styles.infoText}>{client.phone || client.whatsapp || visit.clientPhone}</Text>
          </View>
        )}

        {entryDate && (
          <View style={[styles.infoRow, { marginTop: 4, backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }]}>
            <Calendar size={14} color="#0284c7" />
            <Text style={[styles.infoText, { color: '#0369a1', fontWeight: '600' }]}>Entrada: {formatDate(entryDate)}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.gpsBtn} onPress={openGPS}>
          <Navigation size={16} color="#ffffff" />
          <Text style={styles.gpsBtnText}>Abrir Rota no Waze / Maps</Text>
        </TouchableOpacity>
      </View>

      {/* Card: Tipo e Status da OS */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Clock size={16} color="#0284c7" />
          <Text style={styles.cardTitle}>Status e Tipo da OS</Text>
        </View>
        <View style={[styles.statusFullBadge, { backgroundColor: statusInfo.bg, borderColor: statusInfo.color }]}>
          <Text style={[styles.statusFullText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
        </View>
        {orderTypeLabel && (
          <View style={styles.infoRow2}>
            <Text style={styles.infoLabel}>Tipo</Text>
            <Text style={styles.infoValue2}>{orderTypeLabel}</Text>
          </View>
        )}
        <View style={styles.infoRow2}>
          <Text style={styles.infoLabel}>Técnico Responsável</Text>
          <Text style={styles.infoValue2}>{technician || 'Nenhum'}</Text>
        </View>
      </View>

      {/* Card: Agendamento */}
      {(scheduledDate || entryDate) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Calendar size={16} color="#7c3aed" />
            <Text style={styles.cardTitle}>Datas e Agendamento</Text>
          </View>
          {entryDate && (
            <View style={styles.infoRow2}>
              <Text style={styles.infoLabel}>Entrada</Text>
              <Text style={styles.infoValue2}>{formatDate(entryDate)}</Text>
            </View>
          )}
          {exitDate && (
            <View style={styles.infoRow2}>
              <Text style={styles.infoLabel}>Previsão de Saída</Text>
              <Text style={styles.infoValue2}>{formatDate(exitDate)}</Text>
            </View>
          )}
          {scheduledDate && (
            <View style={styles.infoRow2}>
              <Text style={styles.infoLabel}>Agendado para</Text>
              <Text style={styles.infoValue2}>
                {formatDate(scheduledDate)}{periodLabel ? ` — ${periodLabel}` : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Card: Equipamento completo */}
      {eqObj || equipmentSummary ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wrench size={16} color="#0284c7" />
            <Text style={styles.cardTitle}>Dados do Equipamento</Text>
          </View>
          {eqObj ? (
            <>
              {eqObj.type ? <View style={styles.infoRow2}><Text style={styles.infoLabel}>Tipo</Text><Text style={styles.infoValue2}>{eqObj.type}</Text></View> : null}
              {eqObj.brand ? <View style={styles.infoRow2}><Text style={styles.infoLabel}>Marca</Text><Text style={styles.infoValue2}>{eqObj.brand}</Text></View> : null}
              {eqObj.model ? <View style={styles.infoRow2}><Text style={styles.infoLabel}>Modelo</Text><Text style={styles.infoValue2}>{eqObj.model}</Text></View> : null}
              {eqObj.serialNumber ? <View style={styles.infoRow2}><Text style={styles.infoLabel}>N° de Série</Text><Text style={styles.infoValue2}>{eqObj.serialNumber}</Text></View> : null}
              {eqObj.code ? <View style={styles.infoRow2}><Text style={styles.infoLabel}>Código</Text><Text style={styles.infoValue2}>{eqObj.code}</Text></View> : null}
            </>
          ) : (
            <Text style={styles.infoValue}>{equipmentSummary}</Text>
          )}
        </View>
      ) : null}

      {/* Card: Defeito e Laudo */}
      {(problem || technicalReport || servicePerformed) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FileText size={16} color="#dc2626" />
            <Text style={styles.cardTitle}>Diagnóstico e Laudo</Text>
          </View>
          {problem ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Defeito Reclamado</Text>
              <Text style={[styles.infoValue, { color: '#dc2626' }]}>{problem}</Text>
            </View>
          ) : null}
          {technicalReport ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Laudo Técnico</Text>
              <Text style={styles.infoValue}>{technicalReport}</Text>
            </View>
          ) : null}
          {servicePerformed ? (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Serviço Executado</Text>
              <Text style={styles.infoValue}>{servicePerformed}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Card: Serviços */}
      {services.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wrench size={16} color="#0284c7" />
            <Text style={styles.cardTitle}>Serviços Aplicados ({services.length})</Text>
          </View>
          {services.map((s: any, i: number) => {
            const sQty = Number(s.qty || s.quantity || 1);
            const sPrice = typeof s.price === 'number' ? s.price : Number(String(s.price || '0').replace(/\./g, '').replace(',', '.'));
            const sTotal = sPrice * sQty;

            return (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{String(s.name || s.description || 'Serviço')}</Text>
                  <Text style={[styles.itemSub, { color: sQty > 1 ? '#0284c7' : '#64748b', fontWeight: sQty > 1 ? 'bold' : 'normal' }]}>
                    Qtd: {sQty} {sQty > 1 && sPrice > 0 ? `(R$ ${formatCurrency(sPrice)} un.)` : ''}
                  </Text>
                </View>
                {sPrice > 0 ? (
                  <Text style={styles.itemPrice}>R$ {formatCurrency(sTotal)}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Card: Peças */}
      {parts.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={16} color="#d97706" />
            <Text style={styles.cardTitle}>Peças Utilizadas ({parts.length})</Text>
          </View>
          {parts.map((p: any, i: number) => {
            const pQty = Number(p.qty || p.quantity || 1);
            const pPrice = typeof p.price === 'number' ? p.price : Number(String(p.price || p.finalPrice || '0').replace(/\./g, '').replace(',', '.'));
            const pTotal = pPrice * pQty;

            return (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{String(p.name || p.description || 'Peça')}</Text>
                  <Text style={[styles.itemSub, { color: pQty > 1 ? '#d97706' : '#64748b', fontWeight: pQty > 1 ? 'bold' : 'normal' }]}>
                    Qtd: {pQty} {pQty > 1 && pPrice > 0 ? `(R$ ${formatCurrency(pPrice)} un.)` : ''}
                  </Text>
                </View>
                {pPrice > 0 ? (
                  <Text style={styles.itemPrice}>R$ {formatCurrency(pTotal)}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Card: Garantia */}
      {(warrantyTypeLabel || warrantyDays) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <DollarSign size={16} color="#7c3aed" />
            <Text style={styles.cardTitle}>Garantia</Text>
          </View>
          {warrantyTypeLabel && (
            <View style={styles.infoRow2}>
              <Text style={styles.infoLabel}>Tipo de Garantia</Text>
              <Text style={styles.infoValue2}>{warrantyTypeLabel}</Text>
            </View>
          )}
          {warrantyDays && warrantyType !== 'NAO_SE_APLICA' && (
            <View style={styles.infoRow2}>
              <Text style={styles.infoLabel}>Prazo</Text>
              <Text style={styles.infoValue2}>{warrantyDays} dias</Text>
            </View>
          )}
        </View>
      )}

      {/* Card: Valor Total */}
      {totalValue ? (
        <View style={[styles.card, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
          <View style={styles.cardHeader}>
            <DollarSign size={16} color="#059669" />
            <Text style={[styles.cardTitle, { color: '#059669' }]}>Valor Total da OS</Text>
          </View>
          <Text style={styles.totalValue}>R$ {formatCurrency(totalValue)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: {
    padding: 4,
  },
  headerCode: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  headerEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 6,
  },
  headerEditBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 12,
    marginBottom: 0,
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
    gap: 8,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  clientName: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  waChip: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  contactChipText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  infoRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 12,
  },
  infoValue2: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  infoText: {
    flex: 1,
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
  },
  gpsBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusFullBadge: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  statusFullText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  infoSubText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  infoBlock: {
    marginBottom: 10,
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    color: '#0f172a',
    fontSize: 13,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    gap: 8,
  },
  itemName: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  itemSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  itemPrice: {
    color: '#059669',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  totalValue: {
    color: '#059669',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
