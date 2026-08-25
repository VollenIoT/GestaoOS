import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { PlusCircle, ArrowLeft, Save, User, Phone, MapPin, Wrench, DollarSign } from 'lucide-react-native';
import { saveOrderMobile } from '../services/api';

interface CreateOrderScreenProps {
  clients: any[];
  onBack: () => void;
  onSaved: () => void;
  onOpenCreateClient: () => void;
}

export const CreateOrderScreen: React.FC<CreateOrderScreenProps> = ({
  clients,
  onBack,
  onSaved,
  onOpenCreateClient,
}) => {
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  // Equipamento
  const [equipmentType, setEquipmentType] = useState('Lavadora');
  const [equipmentBrand, setEquipmentBrand] = useState('');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');

  // Detalhes da OS
  const [problemDescription, setProblemDescription] = useState('');
  const [technicalReport, setTechnicalReport] = useState('');
  const [orderType, setOrderType] = useState<'ORCAMENTO' | 'AGENDAMENTO' | 'GARANTIA'>('ORCAMENTO');
  const [totalAmount, setTotalAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredClients = clients.filter((c) =>
    (c.name || '').toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.phone || '').includes(clientSearch)
  );

  const handleSave = async () => {
    if (!selectedClient) {
      Alert.alert('Atenção', 'Selecione um cliente para criar a OS.');
      return;
    }
    if (!equipmentType.trim()) {
      Alert.alert('Atenção', 'Informe o tipo de equipamento.');
      return;
    }

    setSubmitting(true);
    try {
      await saveOrderMobile({
        clientId: selectedClient.id,
        client: selectedClient,
        equipment: {
          type: equipmentType,
          brand: equipmentBrand,
          model: equipmentModel,
          serialNumber: serialNumber,
        },
        problemDescription,
        technicalReport,
        type: orderType,
        status: 'ABERTA',
        totalAmount: parseFloat(totalAmount.replace(',', '.')) || 0,
      });

      Alert.alert('Sucesso', 'Ordem de Serviço criada com sucesso!');
      onSaved();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar a OS.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Ordem de Serviço</Text>
        <TouchableOpacity onPress={handleSave} disabled={submitting} style={styles.saveButton}>
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 1. SELEÇÃO DE CLIENTE */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Dados do Cliente</Text>
          </View>

          {selectedClient ? (
            <View style={styles.selectedClientBox}>
              <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
              <Text style={styles.selectedClientDetails}>
                {selectedClient.phone || selectedClient.whatsapp || 'Sem telefone'}
              </Text>
              {selectedClient.address ? (
                <Text style={styles.selectedClientAddress}>
                  {selectedClient.address}, {selectedClient.number} - {selectedClient.neighborhood}
                </Text>
              ) : null}
              <TouchableOpacity
                onPress={() => {
                  setSelectedClient(null);
                  setClientSearch('');
                }}
                style={styles.changeClientBtn}
              >
                <Text style={styles.changeClientText}>Trocar Cliente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Buscar cliente por nome ou telefone..."
                placeholderTextColor="#94a3b8"
                value={clientSearch}
                onChangeText={(text) => {
                  setClientSearch(text);
                  setClientDropdownOpen(true);
                }}
                onFocus={() => setClientDropdownOpen(true)}
              />

              {clientDropdownOpen && (
                <View style={styles.dropdownList}>
                  {filteredClients.slice(0, 5).map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedClient(c);
                        setClientDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemName}>{c.name}</Text>
                      <Text style={styles.dropdownItemPhone}>{c.phone || c.whatsapp || '-'}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={styles.createClientShortcut}
                    onPress={onOpenCreateClient}
                  >
                    <PlusCircle size={16} color="#0284c7" />
                    <Text style={styles.createClientText}>Cadastrar Novo Cliente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 2. EQUIPAMENTO */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wrench size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Aparelho / Equipamento</Text>
          </View>

          <Text style={styles.label}>Tipo de Aparelho</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Lavadora, Geladeira, Ar-Condicionado..."
            placeholderTextColor="#94a3b8"
            value={equipmentType}
            onChangeText={setEquipmentType}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Marca</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Brastemp"
                placeholderTextColor="#94a3b8"
                value={equipmentBrand}
                onChangeText={setEquipmentBrand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Modelo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: BWF15"
                placeholderTextColor="#94a3b8"
                value={equipmentModel}
                onChangeText={setEquipmentModel}
              />
            </View>
          </View>
        </View>

        {/* 3. DEFEITO E LAUDO */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Defeito e Laudo Técnico</Text>

          <Text style={styles.label}>Defeito Reclamado pelo Cliente</Text>
          <TextInput
            style={[styles.input, { height: 70 }]}
            placeholder="Descreva o problema relatado..."
            placeholderTextColor="#94a3b8"
            multiline
            value={problemDescription}
            onChangeText={setProblemDescription}
          />

          <Text style={styles.label}>Laudo / Diagnóstico Técnico</Text>
          <TextInput
            style={[styles.input, { height: 70 }]}
            placeholder="Serviço a ser realizado e peças necessárias..."
            placeholderTextColor="#94a3b8"
            multiline
            value={technicalReport}
            onChangeText={setTechnicalReport}
          />

          <Text style={styles.label}>Valor Total (R$)</Text>
          <TextInput
            style={styles.input}
            placeholder="0,00"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={totalAmount}
            onChangeText={setTotalAmount}
          />
        </View>

        {/* Botão Final Salvar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={submitting}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Salvando...' : 'GERAR ORDEM DE SERVIÇO'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  saveButton: {
    backgroundColor: '#0284c7',
    padding: 8,
    borderRadius: 8,
  },
  scroll: { padding: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc' },
  label: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#f8fafc',
    fontSize: 13,
  },
  row: { flexDirection: 'row' },
  selectedClientBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  selectedClientName: { fontSize: 14, fontWeight: 'bold', color: '#38bdf8' },
  selectedClientDetails: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  selectedClientAddress: { fontSize: 11, color: '#64748b', marginTop: 2 },
  changeClientBtn: { marginTop: 8, alignSelf: 'flex-start' },
  changeClientText: { fontSize: 11, color: '#f43f5e', fontWeight: 'bold' },
  dropdownList: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  dropdownItemName: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
  dropdownItemPhone: { color: '#64748b', fontSize: 11 },
  createClientShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#1e293b',
  },
  createClientText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
  primaryButton: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
});
