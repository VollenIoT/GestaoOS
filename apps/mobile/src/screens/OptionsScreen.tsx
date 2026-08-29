import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Package,
  Wrench,
  Cpu,
  PlusCircle,
  Search,
  Trash2,
  Edit3,
  X,
  Save,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RefreshCw,
  Info,
  Database,
  Settings,
} from 'lucide-react-native';
import {
  fetchPartsMobile,
  fetchEquipmentsMobile,
  fetchServicesMobile,
  savePartMobile,
  deletePartMobile,
  saveEquipmentMobile,
  deleteEquipmentMobile,
  saveServiceMobile,
  deleteServiceMobile,
  isTestModeMobile,
  getCurrentUserMobile,
} from '../services/api';

type Section = 'MENU' | 'PARTS' | 'EQUIPMENTS' | 'SERVICES';

interface OptionsScreenProps {
  onRefreshAll: () => void;
  section?: Section;
  onSectionChange?: (s: Section) => void;
}

export const OptionsScreen: React.FC<OptionsScreenProps> = ({ onRefreshAll, section: externalSection, onSectionChange }) => {
  const [section, setSection] = useState<Section>(externalSection || 'MENU');
  const [searchTerm, setSearchTerm] = useState('');
  const [parts, setParts] = useState<any[]>([]);
  const [equipments, setEquipments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  // Form States - Peca (igual ao PC)
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState(''); // gerado automaticamente, somente leitura
  const [partManufacturerCode, setPartManufacturerCode] = useState('');
  const [partBrand, setPartBrand] = useState('');
  const [partStock, setPartStock] = useState('0');
  const [partMinStock, setPartMinStock] = useState('0');
  const [partUnit, setPartUnit] = useState('un');
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const [partCostPrice, setPartCostPrice] = useState('');
  const [partTechPrice, setPartTechPrice] = useState('');
  const [partFinalPrice, setPartFinalPrice] = useState('');
  const [partMargin, setPartMargin] = useState('');
  const [partApplication, setPartApplication] = useState('');
  const [partGroup, setPartGroup] = useState('');
  const [partLocation, setPartLocation] = useState('');
  // Form States - Equipamento (igual ao PC)
  const [eqType, setEqType] = useState('');
  const [eqBrand, setEqBrand] = useState('');
  const [eqModel, setEqModel] = useState('');
  const [eqSerial, setEqSerial] = useState('');
  const [eqCode, setEqCode] = useState('');
  const [eqObservations, setEqObservations] = useState('');
  // Form States - Servico (igual ao PC)
  const [srvName, setSrvName] = useState('');
  const [srvCode, setSrvCode] = useState('');
  const [srvPrice, setSrvPrice] = useState('');
  const [srvObservations, setSrvObservations] = useState('');

  const UNIT_OPTIONS = ['un', 'pc', 'par', 'kg', 'g', 'L', 'ml', 'm', 'cm', 'cx', 'rolo', 'jogo', 'kit'];

  // Mascara de moeda automatica: converte digitos em "1.234,56"
  const formatCurrency = (raw: string): string => {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Gera o proximo codigo sequencial de pecas baseado nos existentes
  const generateNextPartCode = (): string => {
    let maxNum = 0;
    parts.forEach((p) => {
      const n = parseInt(String(p.code || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });
    return String(maxNum + 1).padStart(4, '0');
  };

  // Gera o proximo codigo sequencial de servicos baseado nos existentes
  const generateNextServiceCode = (): string => {
    let maxNum = 0;
    services.forEach((s) => {
      const n = parseInt(String(s.code || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    });
    return 'SRV-' + String(maxNum + 1).padStart(4, '0');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, e, s] = await Promise.all([fetchPartsMobile(), fetchEquipmentsMobile(), fetchServicesMobile()]);
      setParts(p.filter((x) => !x.isDeleted));
      setEquipments(e.filter((x) => !x.isDeleted));
      setServices(s.filter((x) => !x.isDeleted));
    } catch (err) {
      console.warn('Erro ao carregar catalogos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    isTestModeMobile().then(setIsTestMode);
    getCurrentUserMobile().then(setCurrentUser);
  }, []);

  // Sincroniza com o controle externo (BackHandler do App.tsx pode mudar externalSection)
  useEffect(() => {
    if (externalSection !== undefined && externalSection !== section) {
      setSearchTerm('');
      setSection(externalSection);
    }
  }, [externalSection]);

  const goToSection = (s: Section) => {
    setSearchTerm('');
    setSection(s);
    onSectionChange?.(s); // Notifica o App.tsx para sincronizar o BackHandler
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    if (section === 'PARTS') {
      const nextCode = generateNextPartCode();
      setPartName(''); setPartCode(nextCode); setPartManufacturerCode('');
      setPartBrand(''); setPartStock('0'); setPartMinStock('0'); setPartUnit('un');
      setPartCostPrice(''); setPartTechPrice(''); setPartFinalPrice(''); setPartMargin('');
      setPartApplication(''); setPartGroup(''); setPartLocation('');
      setIsUnitDropdownOpen(false);
    } else if (section === 'EQUIPMENTS') {
      setEqType(''); setEqBrand(''); setEqModel(''); setEqSerial('');
      setEqCode('EQP-' + String(equipments.length + 1).padStart(4, '0')); setEqObservations('');
    } else if (section === 'SERVICES') {
      const nextSrvCode = generateNextServiceCode();
      setSrvName(''); setSrvCode(nextSrvCode);
      setSrvPrice(''); setSrvObservations('');
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    if (section === 'PARTS') {
      setPartName(item.name || ''); setPartCode(item.code || '');
      setPartManufacturerCode(item.manufacturerCode || '');
      setPartBrand(item.brand || ''); setPartStock(String(item.stockQuantity ?? 0));
      setPartMinStock(String(item.minStock ?? 0)); setPartUnit(item.unit || 'un');
      // Formata valores com virgula se houver
      const fmt = (v: any) => {
        if (v === undefined || v === null || v === '') return '';
        const numStr = String(v).replace(',', '.');
        const parsed = parseFloat(numStr);
        if (isNaN(parsed)) return '';
        return parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      setPartCostPrice(fmt(item.costPrice)); setPartTechPrice(fmt(item.techPrice));
      setPartFinalPrice(fmt(item.finalPrice || item.price));
      setPartMargin(String(item.profitMarginPercent || ''));
      setPartApplication(item.application || ''); setPartGroup(item.group || '');
      setPartLocation(item.location || ''); setIsUnitDropdownOpen(false);
    } else if (section === 'EQUIPMENTS') {
      setEqType(item.type || item.name || ''); setEqBrand(item.brand || '');
      setEqModel(item.model || ''); setEqSerial(item.serialNumber || '');
      setEqCode(item.code || ''); setEqObservations(item.observations || '');
    } else if (section === 'SERVICES') {
      setSrvName(item.name || item.description || '');
      setSrvCode(item.code || '');
      const fmt = (v: any) => {
        if (v === undefined || v === null || v === '') return '';
        const numStr = String(v).replace(',', '.');
        const parsed = parseFloat(numStr);
        if (isNaN(parsed)) return '';
        return parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };
      setSrvPrice(fmt(item.price));
      setSrvObservations(item.observations || '');
    }
    setIsModalOpen(true);
  };

  const handleDelete = (item: any) => {
    Alert.alert('Confirmar Exclusao', 'Deseja realmente excluir "' + (item.name || item.type || item.description) + '"?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        if (section === 'PARTS') await deletePartMobile(item.id);
        else if (section === 'EQUIPMENTS') await deleteEquipmentMobile(item.id);
        else if (section === 'SERVICES') await deleteServiceMobile(item.id);
        loadData(); onRefreshAll();
      }},
    ]);
  };

  const handleSave = async () => {
    if (section === 'PARTS') {
      if (!partName.trim()) return Alert.alert('Atencao', 'Informe o nome da peca.');
      await savePartMobile({
        id: editingItem?.id,
        name: partName.trim().toUpperCase(),
        code: partCode.trim() || generateNextPartCode(),
        manufacturerCode: partManufacturerCode.trim(),
        brand: partBrand.trim(),
        stockQuantity: Number(partStock) || 0,
        minStock: Number(partMinStock) || 0,
        unit: partUnit.trim() || 'un',
        costPrice: partCostPrice.trim(),
        techPrice: partTechPrice.trim(),
        finalPrice: partFinalPrice.trim(),
        price: partFinalPrice.trim(),
        profitMarginPercent: partMargin.trim(),
        application: partApplication.trim(),
        group: partGroup.trim(),
        location: partLocation.trim(),
      });
    } else if (section === 'EQUIPMENTS') {
      if (!eqType.trim()) return Alert.alert('Atencao', 'Informe o tipo do aparelho.');
      await saveEquipmentMobile({
        id: editingItem?.id,
        type: eqType.trim().toUpperCase(),
        name: eqType.trim().toUpperCase(),
        brand: eqBrand.trim(),
        model: eqModel.trim(),
        serialNumber: eqSerial.trim(),
        code: eqCode.trim(),
        observations: eqObservations.trim(),
      });
    } else if (section === 'SERVICES') {
      if (!srvName.trim()) return Alert.alert('Atencao', 'Informe a descricao do servico.');
      await saveServiceMobile({
        id: editingItem?.id,
        name: srvName.trim(),
        description: srvName.trim(),
        code: srvCode.trim() || generateNextServiceCode(),
        price: srvPrice.trim(),
        observations: srvObservations.trim(),
      });
    }
    setIsModalOpen(false); loadData(); onRefreshAll();
  };

  const currentList = section === 'PARTS' ? parts : section === 'EQUIPMENTS' ? equipments : services;
  const filteredList = currentList.filter((item) => {
    const term = searchTerm.toLowerCase();
    const str = (item.name || '') + ' ' + (item.type || '') + ' ' + (item.code || '') + ' ' + (item.brand || '') + ' ' + (item.model || '');
    return str.toLowerCase().includes(term);
  });

  // MENU PRINCIPAL
  if (section === 'MENU') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={styles.menuHeader}>
          <Settings size={20} color="#38bdf8" />
          <Text style={styles.menuHeaderTitle}>Configuracoes e Catalogos</Text>
        </View>

        {isTestMode && (
          <View style={styles.testBadge}>
            <Info size={14} color="#fbbf24" />
            <Text style={styles.testBadgeText}>Modo de Demonstracao ativo — dados nao sincronizam com a nuvem</Text>
          </View>
        )}

        {currentUser && (
          <View style={styles.userInfoCard}>
            <Database size={16} color="#64748b" />
            <Text style={styles.userInfoText}>
              {'Logado como '}
              <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>{currentUser.name || currentUser.username}</Text>
              {' · '}
              <Text style={{ color: '#94a3b8' }}>{currentUser.role}</Text>
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>CATALOGOS</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={[styles.menuCard, { borderColor: '#38bdf840' }]} onPress={() => goToSection('PARTS')} activeOpacity={0.7}>
            <View style={[styles.menuCardIcon, { backgroundColor: '#0369a140' }]}>
              <Package size={28} color="#38bdf8" />
            </View>
            <Text style={styles.menuCardTitle}>Pecas em Estoque</Text>
            <Text style={styles.menuCardSubtitle}>{parts.length} peca{parts.length !== 1 ? 's' : ''} cadastrada{parts.length !== 1 ? 's' : ''}</Text>
            <ChevronRight size={14} color="#38bdf8" style={{ marginTop: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { borderColor: '#a78bfa40' }]} onPress={() => goToSection('SERVICES')} activeOpacity={0.7}>
            <View style={[styles.menuCardIcon, { backgroundColor: '#6d28d940' }]}>
              <Wrench size={28} color="#a78bfa" />
            </View>
            <Text style={styles.menuCardTitle}>Servicos</Text>
            <Text style={styles.menuCardSubtitle}>{services.length} servico{services.length !== 1 ? 's' : ''} cadastrado{services.length !== 1 ? 's' : ''}</Text>
            <ChevronRight size={14} color="#a78bfa" style={{ marginTop: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuCard, { borderColor: '#34d39940' }]} onPress={() => goToSection('EQUIPMENTS')} activeOpacity={0.7}>
            <View style={[styles.menuCardIcon, { backgroundColor: '#065f4640' }]}>
              <Cpu size={28} color="#34d399" />
            </View>
            <Text style={styles.menuCardTitle}>Tipos de Aparelho</Text>
            <Text style={styles.menuCardSubtitle}>{equipments.length} aparelho{equipments.length !== 1 ? 's' : ''} cadastrado{equipments.length !== 1 ? 's' : ''}</Text>
            <ChevronRight size={14} color="#34d399" style={{ marginTop: 4 }} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>SISTEMA</Text>
        <TouchableOpacity style={[styles.wideCard, { borderColor: '#fb923c40' }]} onPress={async () => {
          setLoading(true); await loadData(); onRefreshAll();
          Alert.alert('Sincronizado', 'Catalogos e dados atualizados com sucesso!');
        }} activeOpacity={0.7}>
          <View style={[styles.wideCardIcon, { backgroundColor: '#9a341240' }]}>
            <RefreshCw size={22} color="#fb923c" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.wideCardTitle}>Sincronizar Dados</Text>
            <Text style={styles.wideCardSubtitle}>Atualizar catalogos e OS da nuvem</Text>
          </View>
          <ChevronRight size={16} color="#fb923c" />
        </TouchableOpacity>

        <View style={styles.divider} />
        <Text style={styles.versionText}>Vollen OS · Gestao de Ordens de Servico</Text>
      </ScrollView>
    );
  }

  // SUB-TELAS DE CATALOGO
  const sectionTitle = section === 'PARTS' ? 'Pecas em Estoque' : section === 'EQUIPMENTS' ? 'Tipos de Aparelho' : 'Servicos';
  const sectionAccent = section === 'PARTS' ? '#38bdf8' : section === 'EQUIPMENTS' ? '#34d399' : '#a78bfa';
  const sectionBg = section === 'PARTS' ? '#0284c7' : section === 'EQUIPMENTS' ? '#059669' : '#7c3aed';

  return (
    <View style={styles.container}>
      <View style={[styles.subHeader, { borderBottomColor: sectionAccent + '40' }]}>
        <TouchableOpacity onPress={() => goToSection('MENU')} style={styles.backBtn}>
          <ChevronLeft size={20} color="#94a3b8" />
        </TouchableOpacity>
        {section === 'PARTS' ? <Package size={18} color={sectionAccent} /> : section === 'EQUIPMENTS' ? <Cpu size={18} color={sectionAccent} /> : <Wrench size={18} color={sectionAccent} />}
        <Text style={[styles.subHeaderTitle, { color: sectionAccent }]}>{sectionTitle}</Text>
        <Text style={styles.subHeaderCount}>{filteredList.length} registro{filteredList.length !== 1 ? 's' : ''}</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={16} color="#64748b" />
        <TextInput style={styles.searchInput} placeholder={'Buscar...'} placeholderTextColor="#64748b" value={searchTerm} onChangeText={setSearchTerm} />
        {searchTerm.length > 0 && <TouchableOpacity onPress={() => setSearchTerm('')}><X size={16} color="#64748b" /></TouchableOpacity>}
      </View>

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id || ('cat-' + Math.random())}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Nenhum registro encontrado.</Text>
            <Text style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Toque em "+" para cadastrar.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { borderLeftColor: sectionAccent, borderLeftWidth: 3 }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.code ? <Text style={styles.codeTag}>#{item.code}</Text> : null}
                <Text style={styles.itemTitle} numberOfLines={1}>{item.name || item.type || item.description}</Text>
              </View>
              {section === 'PARTS' && (
                <View style={styles.itemMetaRow}>
                  <Text style={styles.metaText}>Preco: <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>R$ {item.finalPrice || item.price || '0,00'}</Text></Text>
                  <Text style={styles.metaText}>Estoque: <Text style={{ color: '#4ade80', fontWeight: 'bold' }}>{item.stockQuantity ?? 10} un</Text></Text>
                  {item.brand ? <Text style={styles.metaText}>Marca: {item.brand}</Text> : null}
                </View>
              )}
              {section === 'EQUIPMENTS' && (
                <View style={styles.itemMetaRow}>
                  {item.brand ? <Text style={styles.metaText}>Marca: <Text style={{ color: '#fff' }}>{item.brand}</Text></Text> : null}
                  {item.model ? <Text style={styles.metaText}>Modelo: <Text style={{ color: '#fff' }}>{item.model}</Text></Text> : null}
                </View>
              )}
              {section === 'SERVICES' && (
                <View style={styles.itemMetaRow}>
                  <Text style={styles.metaText}>Preco Padrao: <Text style={{ color: '#a78bfa', fontWeight: 'bold' }}>R$ {item.price || '0,00'}</Text></Text>
                </View>
              )}
            </View>
            <View style={styles.actionButtonsCol}>
              <TouchableOpacity style={styles.editButton} onPress={() => handleOpenEdit(item)}>
                <Edit3 size={15} color="#38bdf8" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                <Trash2 size={15} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={[styles.fabButton, { backgroundColor: sectionBg }]} onPress={handleOpenCreate}>
        <PlusCircle size={20} color="#ffffff" />
        <Text style={styles.fabText}>{section === 'PARTS' ? 'NOVA PECA' : section === 'EQUIPMENTS' ? 'NOVO APARELHO' : 'NOVO SERVICO'}</Text>
      </TouchableOpacity>

      <Modal visible={isModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? 'Editar' : 'Cadastrar'} {section === 'PARTS' ? 'Peca' : section === 'EQUIPMENTS' ? 'Aparelho' : 'Servico'}</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)} style={{ padding: 4 }}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {section === 'PARTS' && (
                <>
                  {/* CABECALHO DA PECA COM CODIGO AUTOMATICO / SOMENTE LEITURA */}
                  <View style={styles.codeHeaderBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Nome da Peca *</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Ex: BOMBA DE DRENAGEM"
                        placeholderTextColor="#64748b"
                        value={partName}
                        onChangeText={(t) => setPartName(t.toUpperCase())}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeLabel}>Codigo</Text>
                      <Text style={styles.codeBadgeValue}>#{partCode || generateNextPartCode()}</Text>
                    </View>
                  </View>

                  {/* LINHA 2: Cód. Fabricante + Marca */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Cod. Fabricante</Text>
                      <TextInput style={styles.formInput} placeholder="AB-12345" placeholderTextColor="#64748b" value={partManufacturerCode} onChangeText={setPartManufacturerCode} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Marca / Fabricante</Text>
                      <TextInput style={styles.formInput} placeholder="Brastemp" placeholderTextColor="#64748b" value={partBrand} onChangeText={setPartBrand} />
                    </View>
                  </View>

                  {/* LINHA 3: Grupo + Unidade (Dropdown) */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Grupo (Tipo Equip.)</Text>
                      <TextInput style={styles.formInput} placeholder="Refrigeracao" placeholderTextColor="#64748b" value={partGroup} onChangeText={setPartGroup} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Unidade (UN)</Text>
                      <TouchableOpacity
                        style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                        onPress={() => setIsUnitDropdownOpen(!isUnitDropdownOpen)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>{partUnit || 'un'}</Text>
                        <ChevronDown size={14} color="#94a3b8" />
                      </TouchableOpacity>
                      {isUnitDropdownOpen && (
                        <View style={styles.unitDropdown}>
                          {UNIT_OPTIONS.map((u) => (
                            <TouchableOpacity
                              key={u}
                              style={[styles.unitOption, partUnit === u && styles.unitOptionActive]}
                              onPress={() => { setPartUnit(u); setIsUnitDropdownOpen(false); }}
                            >
                              <Text style={[styles.unitOptionText, partUnit === u && { color: '#38bdf8', fontWeight: 'bold' }]}>{u}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* LINHA 4: Estoque Atual + Estoque Mínimo */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Em Estoque</Text>
                      <TextInput style={styles.formInput} placeholder="0" placeholderTextColor="#64748b" keyboardType="numeric" value={partStock} onChangeText={setPartStock} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Estoque Minimo</Text>
                      <TextInput style={styles.formInput} placeholder="2" placeholderTextColor="#64748b" keyboardType="numeric" value={partMinStock} onChangeText={setPartMinStock} />
                    </View>
                  </View>

                  {/* LINHA 5: Valor Custo + Margem % com mascara */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Valor Custo (R$)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="0,00"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={partCostPrice}
                        onChangeText={(t) => setPartCostPrice(formatCurrency(t))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Margem (%)</Text>
                      <TextInput style={styles.formInput} placeholder="50" placeholderTextColor="#64748b" keyboardType="numeric" value={partMargin} onChangeText={setPartMargin} />
                    </View>
                  </View>

                  {/* LINHA 6: Valor Técnico + Consumidor Final com mascara */}
                  <View style={styles.formRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Valor Tecnico (R$)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="0,00"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={partTechPrice}
                        onChangeText={(t) => setPartTechPrice(formatCurrency(t))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Consumidor Final (R$)</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="0,00"
                        placeholderTextColor="#64748b"
                        keyboardType="numeric"
                        value={partFinalPrice}
                        onChangeText={(t) => setPartFinalPrice(formatCurrency(t))}
                      />
                    </View>
                  </View>

                  {/* LINHA 7: Referência/Aplicação - CAMPO MAIOR / MULTILINE */}
                  <Text style={styles.formLabel}>Referencia / Aplicacao de Modelos</Text>
                  <TextInput
                    style={[styles.formInput, { height: 85, textAlignVertical: 'top' }]}
                    placeholder="Ex: BRM44NBANA, BRF44NBBNA, CRM45ABBNA... Digite os modelos compativeis."
                    placeholderTextColor="#64748b"
                    value={partApplication}
                    onChangeText={setPartApplication}
                    multiline
                    numberOfLines={4}
                  />

                  {/* LINHA 8: Localização */}
                  <Text style={styles.formLabel}>Localizacao no Estoque</Text>
                  <TextInput style={styles.formInput} placeholder="Prateleira A3 / Gaveta 2" placeholderTextColor="#64748b" value={partLocation} onChangeText={setPartLocation} />
                </>
              )}

              {section === 'EQUIPMENTS' && (
                <>
                  <Text style={styles.formLabel}>Tipo / Nome do Aparelho *</Text>
                  <TextInput style={styles.formInput} placeholder="Ex: GELADEIRA FROST FREE" placeholderTextColor="#64748b" value={eqType} onChangeText={setEqType} autoCapitalize="characters" />

                  <View style={styles.formRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Codigo</Text>
                      <TextInput style={styles.formInput} placeholder="EQP-0001" placeholderTextColor="#64748b" value={eqCode} onChangeText={setEqCode} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Marca</Text>
                      <TextInput style={styles.formInput} placeholder="Brastemp" placeholderTextColor="#64748b" value={eqBrand} onChangeText={setEqBrand} />
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.formLabel}>Modelo</Text>
                      <TextInput style={styles.formInput} placeholder="BRM54JK" placeholderTextColor="#64748b" value={eqModel} onChangeText={setEqModel} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Nr de Serie Padrao</Text>
                      <TextInput style={styles.formInput} placeholder="SN..." placeholderTextColor="#64748b" value={eqSerial} onChangeText={setEqSerial} />
                    </View>
                  </View>

                  <Text style={styles.formLabel}>Observacoes</Text>
                  <TextInput
                    style={[styles.formInput, { height: 72, textAlignVertical: 'top' }]}
                    placeholder="Informacoes adicionais sobre este tipo de aparelho..."
                    placeholderTextColor="#64748b"
                    value={eqObservations}
                    onChangeText={setEqObservations}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

              {section === 'SERVICES' && (
                <>
                  {/* CABECALHO DO SERVICO COM CODIGO AUTOMATICO / SOMENTE LEITURA */}
                  <View style={styles.codeHeaderBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.formLabel}>Descricao do Servico *</Text>
                      <TextInput style={styles.formInput} placeholder="Ex: Higienizacao e Carga de Gas" placeholderTextColor="#64748b" value={srvName} onChangeText={setSrvName} />
                    </View>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeLabel}>Codigo</Text>
                      <Text style={styles.codeBadgeValue}>#{srvCode || generateNextServiceCode()}</Text>
                    </View>
                  </View>

                  <Text style={styles.formLabel}>Valor Padrao (R$)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0,00"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={srvPrice}
                    onChangeText={(t) => setSrvPrice(formatCurrency(t))}
                  />

                  <Text style={styles.formLabel}>Observacoes / Descricao Detalhada</Text>
                  <TextInput
                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                    placeholder="Detalhe o que este servico inclui, tempo estimado, etc..."
                    placeholderTextColor="#64748b"
                    value={srvObservations}
                    onChangeText={setSrvObservations}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}

            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Save size={16} color="#ffffff" />
                <Text style={styles.saveButtonText}>Gravar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  menuHeaderTitle: { color: '#0f172a', fontSize: 17, fontWeight: 'bold' },
  testBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 10, padding: 10, marginBottom: 12 },
  testBadgeText: { color: '#b45309', fontSize: 12, flex: 1 },
  userInfoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 10, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  userInfoText: { color: '#64748b', fontSize: 12, flex: 1 },
  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  menuCard: { flex: 1, minWidth: '44%', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'flex-start', gap: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  menuCardIcon: { padding: 10, borderRadius: 12, marginBottom: 4 },
  menuCardTitle: { color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
  menuCardSubtitle: { color: '#64748b', fontSize: 11 },
  wideCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  wideCardIcon: { padding: 10, borderRadius: 12 },
  wideCardTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold' },
  wideCardSubtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 16 },
  versionText: { color: '#94a3b8', fontSize: 11, textAlign: 'center' },
  subHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4, marginRight: 2 },
  subHeaderTitle: { flex: 1, fontSize: 15, fontWeight: 'bold' },
  subHeaderCount: { color: '#64748b', fontSize: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', margin: 12, marginBottom: 4, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', gap: 8 },
  searchInput: { flex: 1, paddingVertical: 8, color: '#0f172a', fontSize: 13 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  codeTag: { backgroundColor: '#f0f9ff', color: '#0284c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 11, fontWeight: 'bold' },
  itemTitle: { flex: 1, color: '#0f172a', fontSize: 13, fontWeight: 'bold' },
  itemMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  metaText: { color: '#64748b', fontSize: 11.5 },
  actionButtonsCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editButton: { padding: 7, backgroundColor: '#e0f2fe', borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  deleteButton: { padding: 7, backgroundColor: '#fee2e2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' },
  fabButton: { position: 'absolute', bottom: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 24, elevation: 6 },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'center', padding: 16 },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { color: '#0f172a', fontSize: 15, fontWeight: 'bold' },
  modalBody: { padding: 16, gap: 10 },
  formLabel: { color: '#475569', fontSize: 11.5, fontWeight: 'bold', marginBottom: 2 },
  formInput: { backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: '#0f172a', borderWidth: 1, borderColor: '#cbd5e1', fontSize: 13 },
  formRow: { flexDirection: 'row' },
  codeHeaderBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  codeBadge: { backgroundColor: '#f0f9ff', borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd', paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', minWidth: 80, height: 42 },
  codeBadgeLabel: { color: '#0369a1', fontSize: 9, textTransform: 'uppercase', fontWeight: 'bold' },
  codeBadgeValue: { color: '#0284c7', fontSize: 13, fontWeight: 'bold' },
  unitDropdown: { backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginTop: 4, maxHeight: 130, paddingVertical: 4 },
  unitOption: { paddingHorizontal: 12, paddingVertical: 6 },
  unitOptionActive: { backgroundColor: '#e0f2fe' },
  unitOptionText: { color: '#0f172a', fontSize: 12 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, backgroundColor: '#f8fafc', padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#e2e8f0', borderRadius: 8 },
  cancelButtonText: { color: '#475569', fontWeight: 'bold', fontSize: 12 },
  saveButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#0284c7', borderRadius: 8 },
  saveButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
});


