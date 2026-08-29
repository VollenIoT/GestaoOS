import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  Smartphone,
  ShieldCheck,
  Sparkles,
  Key,
  ArrowRight,
} from 'lucide-react-native';
import { linkCompanyMobile, setTestModeMobile } from '../services/api';

interface QrLinkScreenProps {
  onLinkedSuccess: (companyData: any) => void;
}

export const QrLinkScreen: React.FC<QrLinkScreenProps> = ({ onLinkedSuccess }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Formata automaticamente para XXXXX-XXXXX-XXXXX enquanto digita
  const handleTextChange = (val: string) => {
    let clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length > 15) clean = clean.substring(0, 15);

    const parts = [];
    for (let i = 0; i < clean.length; i += 5) {
      parts.push(clean.substring(i, i + 5));
    }
    setApiKeyInput(parts.join('-'));
  };

  const handleProcessLink = async () => {
    const key = apiKeyInput.trim();
    if (!key) {
      Alert.alert('Atenção', 'Digite a ApiKey fornecida pelo sistema no computador (Ex: ABC12-DEF34-GHI56).');
      return;
    }

    if (key.length < 17) {
      Alert.alert('ApiKey Incompleta', 'A ApiKey deve conter o formato completo de 15 caracteres: XXXXX-XXXXX-XXXXX.');
      return;
    }

    setLoading(true);
    try {
      const companyPayload = {
        app: 'VOLLEN_OS',
        apiKey: key,
        companyName: 'Vollen Assistência Técnica',
        timestamp: new Date().toISOString(),
      };

      await linkCompanyMobile(companyPayload);
      Alert.alert('Vinculado com Sucesso!', `Empresa conectada com a ApiKey:\n${key}`);
      onLinkedSuccess(companyPayload);
    } catch (err: any) {
      Alert.alert('Falha na Vinculação', err.message || 'ApiKey não reconhecida.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterTestMode = async () => {
    setLoading(true);
    try {
      const testData = await setTestModeMobile();
      Alert.alert(
        'Modo de Teste Ativado',
        'Você entrou no Modo de Teste e Demonstração!\n\nTodas as funções do APK Vollen OS estão disponíveis (abertura de OS, clientes, orçamentos, visitas), porém NENHUM dado será gravado em servidores ou bancos na nuvem — tudo operará estritamente no armazenamento local do seu celular.',
        [{ text: 'Começar a Testar', onPress: () => onLinkedSuccess(testData) }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao iniciar modo teste');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Key size={38} color="#38bdf8" />
            </View>
            <Text style={styles.title}>Vincular Empresa</Text>
            <Text style={styles.subtitle}>
              Digite a ApiKey gerada no seu computador em Opções &gt; Vincular Celular ou entre como Teste.
            </Text>
          </View>

          {/* Card Principal */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <ShieldCheck size={18} color="#38bdf8" />
              <Text style={styles.badgeText}>Acesso Exclusivo &amp; Seguro</Text>
            </View>
            <Text style={styles.cardDesc}>
              No seu computador, acesse Opções &gt; Vincular Celular (ApiKey) e digite o código de 15 dígitos abaixo:
            </Text>

            {/* Campo da ApiKey Formatada */}
            <Text style={styles.inputLabel}>ApiKey da Empresa (XXXXX-XXXXX-XXXXX):</Text>
            <TextInput
              style={styles.inputArea}
              placeholder="Ex: ABC12-DEF34-GHI56"
              placeholderTextColor="#64748b"
              value={apiKeyInput}
              onChangeText={handleTextChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={17}
            />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleProcessLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Key size={18} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Vincular Empresa</Text>
                  <ArrowRight size={16} color="#ffffff" />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou experimente sem vínculo</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* BOTÃO: ENTRAR COMO TESTE */}
            <TouchableOpacity
              style={styles.testModeBtn}
              onPress={handleEnterTestMode}
              disabled={loading}
            >
              <View style={styles.testModeContent}>
                <View style={styles.testBadgeIcon}>
                  <Sparkles size={18} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testModeTitle}>Entrar como Teste (Offline)</Text>
                  <Text style={styles.testModeSubtitle}>
                    Acesse todas as funções do aplicativo Vollen OS sem vincular a nenhuma empresa (salva apenas no celular).
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 19,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0284c720',
    borderColor: '#0284c750',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  inputLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  inputArea: {
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#0284c7',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748b',
    fontSize: 11,
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  testModeBtn: {
    backgroundColor: '#78350f25',
    borderWidth: 1,
    borderColor: '#d9770660',
    borderRadius: 14,
    padding: 14,
  },
  testModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f59e0b20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  testModeTitle: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
  },
  testModeSubtitle: {
    color: '#d97706',
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
});
