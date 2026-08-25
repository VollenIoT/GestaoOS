import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { updateVisitStatus } from '../services/api';
import { SignatureCanvas } from '../components/SignatureCanvas';

interface VisitExecutionScreenProps {
  visit: any;
  onBack: () => void;
  onRefresh: () => void;
}

export const VisitExecutionScreen: React.FC<VisitExecutionScreenProps> = ({
  visit,
  onBack,
  onRefresh,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(visit.status);
  const [notes, setNotes] = useState<string>(visit.notes || '');

  // Checklist
  const [checklist, setChecklist] = useState({
    diagnostico: false,
    limpeza: false,
    testeEletrico: false,
    testeCentrifugacao: false,
  });

  // Peças
  const [parts, setParts] = useState<Array<{ name: string; price: number; quantity: number }>>(
    visit.partsUsed || []
  );
  const [partName, setPartName] = useState('');
  const [partPrice, setPartPrice] = useState('');

  // Fotos e Assinatura
  const [photos, setPhotos] = useState<string[]>(
    visit.photos ? JSON.parse(visit.photos) : []
  );
  const [signatureUrl, setSignatureUrl] = useState<string | null>(
    visit.signatureUrl || null
  );

  const [saving, setSaving] = useState(false);

  const openGPS = () => {
    const address = `${visit.order?.client?.address}, ${visit.order?.client?.number}, ${visit.order?.client?.city}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o app de mapas.');
    });
  };

  const handleAddPart = () => {
    if (!partName || !partPrice) return;
    const priceNum = parseFloat(partPrice.replace(',', '.'));
    if (isNaN(priceNum)) return;

    setParts((prev) => [...prev, { name: partName, price: priceNum, quantity: 1 }]);
    setPartName('');
    setPartPrice('');
  };

  const handleAddPhoto = () => {
    const mockPhoto = `https://picsum.photos/300/200?random=${Math.random()}`;
    setPhotos((prev) => [...prev, mockPhoto]);
  };

  const handleSaveStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      await updateVisitStatus(visit.id, {
        status: newStatus,
        notes,
        photos,
        signatureUrl: signatureUrl || undefined,
        partsUsed: parts,
      });
      setCurrentStatus(newStatus);
      setSaving(false);
      onRefresh();
      Alert.alert('Sucesso', `Status alterado para ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      setSaving(false);
      Alert.alert('Erro', 'Falha ao atualizar visita.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Botão Voltar */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backBtnText}>← Voltar para Lista de Visitas</Text>
      </TouchableOpacity>

      {/* Header OS */}
      <View style={styles.card}>
        <Text style={styles.osCode}>{visit.order?.code}</Text>
        <Text style={styles.clientName}>{visit.order?.client?.name}</Text>
        <Text style={styles.addressText}>
          📍 {visit.order?.client?.address}, {visit.order?.client?.number} - {visit.order?.client?.neighborhood}
        </Text>

        <TouchableOpacity style={styles.gpsBtn} onPress={openGPS}>
          <Text style={styles.gpsBtnText}>🚗 Abrir Endereço no Waze / Maps</Text>
        </TouchableOpacity>
      </View>

      {/* Alteração de Status em Tempo Real */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Status Atual da Visita</Text>
        <Text style={styles.currentStatusText}>{currentStatus.replace('_', ' ')}</Text>

        <View style={styles.statusButtonsGrid}>
          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: '#8b5cf6' }]}
            onPress={() => handleSaveStatus('EM_ROTA')}
          >
            <Text style={styles.statusBtnText}>🚚 Em Rota</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: '#f59e0b' }]}
            onPress={() => handleSaveStatus('EM_ANDAMENTO')}
          >
            <Text style={styles.statusBtnText}>⚡ Em Andamento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: '#ea580c' }]}
            onPress={() => handleSaveStatus('AGUARDANDO_PECA')}
          >
            <Text style={styles.statusBtnText}>📦 Aguardando Peça</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusBtn, { backgroundColor: '#10b981' }]}
            onPress={() => handleSaveStatus('CONCLUIDA')}
          >
            <Text style={styles.statusBtnText}>✅ Concluir Visita</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Checklist Técnico */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Checklist Técnico</Text>
        
        <TouchableOpacity
          style={styles.checkItem}
          onPress={() => setChecklist({ ...checklist, diagnostico: !checklist.diagnostico })}
        >
          <Text style={styles.checkText}>
            {checklist.diagnostico ? '☑' : '☐'} Diagnóstico Inicial Realizado
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkItem}
          onPress={() => setChecklist({ ...checklist, testeEletrico: !checklist.testeEletrico })}
        >
          <Text style={styles.checkText}>
            {checklist.testeEletrico ? '☑' : '☐'} Teste Elétrico e de Tensão
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkItem}
          onPress={() => setChecklist({ ...checklist, limpeza: !checklist.limpeza })}
        >
          <Text style={styles.checkText}>
            {checklist.limpeza ? '☑' : '☐'} Higienização / Limpeza dos Componentes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkItem}
          onPress={() => setChecklist({ ...checklist, testeCentrifugacao: !checklist.testeCentrifugacao })}
        >
          <Text style={styles.checkText}>
            {checklist.testeCentrifugacao ? '☑' : '☐'} Teste de Funcionamento Final
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lançamento de Peças Utilizadas */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Peças Utilizadas</Text>

        <View style={styles.partInputRow}>
          <TextInput
            style={[styles.input, { flex: 2 }]}
            placeholder="Nome da peça"
            placeholderTextColor="#64748b"
            value={partName}
            onChangeText={setPartName}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Preço R$"
            keyboardType="numeric"
            placeholderTextColor="#64748b"
            value={partPrice}
            onChangeText={setPartPrice}
          />
          <TouchableOpacity style={styles.addPartBtn} onPress={handleAddPart}>
            <Text style={styles.addPartBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {parts.map((p, idx) => (
          <View key={idx} style={styles.partItem}>
            <Text style={styles.partItemText}>• {p.name}</Text>
            <Text style={styles.partItemPrice}>R$ {p.price.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      {/* Fotos do Serviço */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Anexo de Fotos ({photos.length})</Text>

        <TouchableOpacity style={styles.photoBtn} onPress={handleAddPhoto}>
          <Text style={styles.photoBtnText}>📷 Capturar Foto do Aparelho</Text>
        </TouchableOpacity>
      </View>

      {/* Assinatura do Cliente */}
      <View style={styles.card}>
        <SignatureCanvas
          onOK={(sig) => {
            setSignatureUrl(sig);
            Alert.alert('Sucesso', 'Assinatura capturada com sucesso!');
          }}
          onClear={() => setSignatureUrl(null)}
        />
      </View>

      {/* Observações */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Observações do Técnico</Text>
        <TextInput
          style={[styles.input, { height: 70 }]}
          multiline
          placeholder="Digite observações sobre o serviço..."
          placeholderTextColor="#64748b"
          value={notes}
          onChangeText={setNotes}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  backBtn: {
    marginBottom: 12,
  },
  backBtnText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  osCode: {
    color: '#38bdf8',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  clientName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  addressText: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 12,
  },
  gpsBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  gpsBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionTitle: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  currentStatusText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkItem: {
    paddingVertical: 6,
  },
  checkText: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  partInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  addPartBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addPartBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  partItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  partItemText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  partItemPrice: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  photoBtn: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  photoBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
});
