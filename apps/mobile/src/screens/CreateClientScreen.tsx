import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  BackHandler,
} from 'react-native';
import { ArrowLeft, Save, User, Phone, MapPin } from 'lucide-react-native';
import { saveClientMobile } from '../services/api';

interface CreateClientScreenProps {
  clientToEdit?: any;
  onBack: () => void;
  onSaved: (newClient: any) => void;
}

export const CreateClientScreen: React.FC<CreateClientScreenProps> = ({
  clientToEdit,
  onBack,
  onSaved,
}) => {
  const [name, setName] = useState(clientToEdit?.name || '');
  const [phone, setPhone] = useState(clientToEdit?.phone || '');
  const [whatsapp, setWhatsapp] = useState(clientToEdit?.whatsapp || '');
  const [cep, setCep] = useState(clientToEdit?.cep || '');
  const [address, setAddress] = useState(clientToEdit?.address || '');
  const [number, setNumber] = useState(clientToEdit?.number || '');
  const [neighborhood, setNeighborhood] = useState(clientToEdit?.neighborhood || '');
  const [city, setCity] = useState(clientToEdit?.city || '');
  const [state, setState] = useState(clientToEdit?.state || '');
  const [submitting, setSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  // Formata CEP automaticamente: 00000-000
  const formatCep = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  };

  // Formata telefone/celular automaticamente com parênteses e traço
  const formatPhone = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 11);
    if (nums.length > 6) {
      if (nums.length === 11) {
        return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
      }
      return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    } else if (nums.length > 2) {
      return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    }
    return nums;
  };

  // Busca automática do CEP via ViaCEP
  const searchCepData = async (rawCep: string) => {
    const cleanCep = rawCep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        if (data.logradouro) setAddress(data.logradouro);
        if (data.bairro) setNeighborhood(data.bairro);
        if (data.localidade) setCity(data.localidade);
        if (data.uf) setState(data.uf);
      } else {
        Alert.alert('CEP não encontrado', 'O CEP informado não retornou endereço. Preencha manualmente.');
      }
    } catch (err) {
      console.warn('Erro ao consultar CEP:', err);
    } finally {
      setLoadingCep(false);
    }
  };

  // Monitora alterações não salvas no formulário
  const isDirty = useMemo(() => {
    return (
      name !== (clientToEdit?.name || '') ||
      phone !== (clientToEdit?.phone || '') ||
      whatsapp !== (clientToEdit?.whatsapp || '') ||
      cep !== (clientToEdit?.cep || '') ||
      address !== (clientToEdit?.address || '') ||
      number !== (clientToEdit?.number || '') ||
      neighborhood !== (clientToEdit?.neighborhood || '') ||
      city !== (clientToEdit?.city || '') ||
      state !== (clientToEdit?.state || '')
    );
  }, [name, phone, whatsapp, cep, address, number, neighborhood, city, state, clientToEdit]);

  const handleRequestBack = () => {
    if (isDirty) {
      Alert.alert(
        'Sair sem Salvar',
        'Você alterou informações deste cliente que ainda não foram salvas. Deseja realmente sair sem salvar?',
        [
          { text: 'Continuar Editando', style: 'cancel' },
          {
            text: 'Sim, Sair sem Salvar',
            style: 'destructive',
            onPress: () => onBack(),
          },
        ]
      );
    } else {
      onBack();
    }
  };

  useEffect(() => {
    const backAction = () => {
      handleRequestBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [name, phone, whatsapp, cep, address, number, neighborhood, city, state, clientToEdit]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome do cliente.');
      return;
    }

    setSubmitting(true);
    try {
      const client = await saveClientMobile({
        id: clientToEdit?.id,
        code: clientToEdit?.code,
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

      Alert.alert('Sucesso', clientToEdit ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
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
        <TouchableOpacity onPress={handleRequestBack} style={styles.backButton}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}</Text>
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
                onChangeText={(text) => setPhone(formatPhone(text))}
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
                onChangeText={(text) => setWhatsapp(formatPhone(text))}
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color="#0284c7" />
            <Text style={styles.cardTitle}>Endereço</Text>
          </View>

          <Text style={styles.label}>CEP (Busca Automática) {loadingCep ? '⏳ Buscando endereço...' : ''}</Text>
          <TextInput
            style={[styles.input, loadingCep && { borderColor: '#38bdf8' }]}
            placeholder="00000-000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={9}
            value={cep}
            onChangeText={(t) => {
              const formatted = formatCep(t);
              setCep(formatted);
              const clean = formatted.replace(/\D/g, '');
              if (clean.length === 8) {
                searchCepData(clean);
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
