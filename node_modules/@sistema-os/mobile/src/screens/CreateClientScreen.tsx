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
import { ArrowLeft, Save, User, Phone, MapPin } from 'lucide-react-native';
import { saveClientMobile } from '../services/api';

interface CreateClientScreenProps {
  onBack: () => void;
  onSaved: (newClient: any) => void;
}

export const CreateClientScreen: React.FC<CreateClientScreenProps> = ({
  onBack,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [submitting, setSubmitting] = useState(false);

  const handleFetchCep = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || 'SP');
      }
    } catch {}
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do cliente.');
      return;
    }

    setSubmitting(true);
    try {
      const client = await saveClientMobile({
        name,
        phone,
        whatsapp,
        cep,
        address,
        number,
        neighborhood,
        city,
        state,
      });

      Alert.alert('Sucesso', 'Cliente cadastrado com sucesso!');
      onSaved(client);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o cliente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Novo Cliente</Text>
        <TouchableOpacity onPress={handleSave} disabled={submitting} style={styles.saveButton}>
          <Save size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Dados Pessoais</Text>
          </View>

          <Text style={styles.label}>Nome Completo / Razão Social</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Maria Silva"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.label}>Telefone Fixo</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 0000-0000"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>WhatsApp / Celular</Text>
              <TextInput
                style={styles.input}
                placeholder="(00) 90000-0000"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={whatsapp}
                onChangeText={setWhatsapp}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Endereço</Text>
          </View>

          <Text style={styles.label}>CEP (Busca Automática)</Text>
          <TextInput
            style={styles.input}
            placeholder="00000-000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={cep}
            onChangeText={(t) => {
              setCep(t);
              if (t.replace(/\D/g, '').length === 8) {
                setTimeout(handleFetchCep, 200);
              }
            }}
          />

          <View style={styles.row}>
            <View style={{ flex: 3, marginRight: 8 }}>
              <Text style={styles.label}>Rua / Logradouro</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Rua das Flores"
                placeholderTextColor="#94a3b8"
                value={address}
                onChangeText={setAddress}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Nº</Text>
              <TextInput
                style={styles.input}
                placeholder="123"
                placeholderTextColor="#94a3b8"
                value={number}
                onChangeText={setNumber}
              />
            </View>
          </View>

          <Text style={styles.label}>Bairro</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Centro"
            placeholderTextColor="#94a3b8"
            value={neighborhood}
            onChangeText={setNeighborhood}
          />

          <View style={styles.row}>
            <View style={{ flex: 3, marginRight: 8 }}>
              <Text style={styles.label}>Cidade</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: São Paulo"
                placeholderTextColor="#94a3b8"
                value={city}
                onChangeText={setCity}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>UF</Text>
              <TextInput
                style={styles.input}
                placeholder="SP"
                placeholderTextColor="#94a3b8"
                value={state}
                onChangeText={setState}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={submitting}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Salvando...' : 'SALVAR CLIENTE'}
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
  primaryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: 'bold' },
});
