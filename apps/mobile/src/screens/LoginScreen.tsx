import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { Wrench, Lock, User, Eye, EyeOff, Building2, ChevronDown, Check } from 'lucide-react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { loginUserMobile, fetchCompanyDataMobile, subscribeCompanyDataMobile, fetchUsersMobile } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onUnlinkCompany?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onUnlinkCompany }) => {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubUsers = () => {};

    // Carrega usuários cadastrados
    const loadUsers = () => {
      fetchUsersMobile().then((users) => {
        if (isMounted && users && users.length > 0) {
          setUsersList(users);
          setSelectedUser((prev: any) => {
            if (!prev) return users[0];
            const found = users.find((u: any) => u.id === prev.id || u.username === prev.username);
            return found || users[0];
          });
        }
      });
    };

    loadUsers();

    // Sincronização em tempo real com o banco de dados dinâmico da empresa
    import('../services/firebase').then(async ({ getActiveMobileFirestore }) => {
      try {
        const activeDb = await getActiveMobileFirestore();
        if (isMounted) {
          unsubUsers = onSnapshot(collection(activeDb, 'users'), () => {
            loadUsers();
          });
        }
      } catch {}
    });

    fetchCompanyDataMobile().then((data) => {
      if (isMounted && data) setCompanyInfo(data);
    });
    const unsubCompany = subscribeCompanyDataMobile((data) => {
      if (isMounted && data) setCompanyInfo(data);
    });

    return () => {
      isMounted = false;
      unsubUsers();
      unsubCompany();
    };
  }, []);

  const handleLogin = async () => {
    if (!selectedUser) {
      Alert.alert('Atenção', 'Selecione um usuário cadastrado.');
      return;
    }

    setLoading(true);
    try {
      const user = await loginUserMobile(selectedUser.username || selectedUser.name || selectedUser.id, password);
      onLoginSuccess(user);
    } catch (err: any) {
      Alert.alert('Erro de Acesso', err.message || 'Senha incorreta.');
    } finally {
      setLoading(false);
    }
  };

  const companyName = companyInfo?.tradingName || companyInfo?.name || 'Vollen OS';
  const companySlogan = companyInfo?.slogan || 'Acesso de Técnicos e Funcionários';
  const companyLogo = companyInfo?.logoUrl || null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logotipo e Cabeçalho Personalizado da Empresa */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {companyLogo ? (
              <Image
                source={{ uri: companyLogo }}
                style={{ width: 56, height: 56, borderRadius: 12 }}
                resizeMode="contain"
              />
            ) : (
              <Wrench size={38} color="#38bdf8" />
            )}
          </View>
          <Text style={styles.title}>{companyName}</Text>
          <Text style={styles.subtitle}>{companySlogan}</Text>
        </View>

        {/* Card do Formulário */}
        <View style={styles.card}>
          <Text style={styles.label}>Selecione o Usuário / Funcionário</Text>
          
          {/* Dropdown de Seleção de Usuário */}
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setIsUserDropdownOpen(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
              <User size={20} color="#38bdf8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownSelectedText} numberOfLines={1}>
                  {selectedUser ? (selectedUser.name || selectedUser.username) : 'Selecione o usuário...'}
                </Text>
                {selectedUser && (
                  <Text style={styles.dropdownSelectedSubText}>
                    Login: {selectedUser.username} • Cargo: {selectedUser.role || (selectedUser.isAdmin ? 'Admin' : 'Técnico')}
                  </Text>
                )}
              </View>
            </View>
            <ChevronDown size={20} color="#94a3b8" />
          </TouchableOpacity>

          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputContainer}>
            <Lock size={20} color="#94a3b8" />
            <TextInput
              style={styles.input}
              placeholder="Digite sua senha"
              placeholderTextColor="#64748b"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color="#94a3b8" />
              ) : (
                <Eye size={20} color="#94a3b8" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Entrar no Sistema</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Opção para trocar de empresa / ler novo QR Code */}
        {onUnlinkCompany && (
          <TouchableOpacity
            style={{ marginTop: 16, alignItems: 'center', padding: 8 }}
            onPress={onUnlinkCompany}
          >
            <Text style={{ color: '#38bdf8', fontSize: 12, fontWeight: 'bold' }}>
              🔄 Conectar a Outra Empresa (Ler Novo QR Code)
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footerNote}>Sincronização em Nuvem Ativa</Text>
      </View>

      {/* Modal Dropdown com Lista de Usuários Cadastrados */}
      <Modal
        visible={isUserDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUserDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsUserDropdownOpen(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione seu Usuário</Text>
              <TouchableOpacity onPress={() => setIsUserDropdownOpen(false)}>
                <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>Fechar</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={usersList}
              keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
              renderItem={({ item }) => {
                const isSelected = selectedUser?.id === item.id || selectedUser?.username === item.username;
                return (
                  <TouchableOpacity
                    style={[styles.userOptionItem, isSelected && styles.userOptionItemSelected]}
                    onPress={() => {
                      setSelectedUser(item);
                      setIsUserDropdownOpen(false);
                      setPassword('');
                    }}
                  >
                    <View style={styles.userAvatar}>
                      <User size={18} color="#38bdf8" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.userOptionName, isSelected && styles.userOptionNameSelected]}>
                        {item.name || item.username}
                      </Text>
                      <Text style={styles.userOptionRole}>
                        Login: <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{item.username}</Text> • Cargo: {item.role || (item.isAdmin ? 'Admin' : 'Técnico')}
                      </Text>
                    </View>
                    {isSelected && <Check size={18} color="#38bdf8" />}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={() => (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>Nenhum usuário encontrado</Text>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
    gap: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    minHeight: 52,
  },
  dropdownSelectedText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  dropdownSelectedSubText: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    backgroundColor: '#0f172a',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  userOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  userOptionItemSelected: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userOptionName: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  userOptionNameSelected: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  userOptionRole: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#334155',
  },
  button: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerNote: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 24,
  },
});
