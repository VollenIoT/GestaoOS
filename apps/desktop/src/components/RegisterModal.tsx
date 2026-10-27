import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit3, Edit2, User, Phone, Package, Wrench, Cpu, FileCheck, MessageSquare, FileText, ChevronRight, Plus, Trash2, Building2, UserCheck, Barcode, Sparkles, Tag, AlertTriangle, Camera, Image as ImageIcon, FolderOpen, Ruler, Zap, Layers } from 'lucide-react';
import { fetchAddressByCep } from '../services/api';
import { ClientOrdersHistoryModal } from './ClientOrdersHistoryModal';
import { useDialog } from './DialogContext';
import { modalStack } from '../utils/modalStack';
import { getCurrentFeatures } from '../config/appFeatures';
import { generateAutoBarcode } from '../utils/barcodeUtils';
import { useImageSource } from '../utils/imageUtils';

const PartPhotoRegisterPreview: React.FC<{ imageUrl?: string }> = ({ imageUrl }) => {
  const { displaySrc, hasError, setHasError, isLoading } = useImageSource(imageUrl);

  if (!imageUrl || !imageUrl.trim()) {
    return (
      <div className="text-slate-400 text-center flex flex-col items-center justify-center p-4">
        <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
        <span className="text-xs font-bold text-slate-600">Nenhuma foto adicionada</span>
        <span className="text-[11px] text-slate-400 mt-0.5">Cole o caminho do arquivo acima ou clique em Buscar</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="text-rose-500 text-center flex flex-col items-center justify-center p-4">
        <AlertTriangle className="w-8 h-8 text-rose-400 mb-1.5 mx-auto" />
        <span className="text-xs font-bold">Imagem não encontrada</span>
        <span className="text-[10.5px] text-slate-500 mt-0.5">Verifique se o arquivo existe e o caminho informado</span>
      </div>
    );
  }

  if (isLoading && !displaySrc) {
    return (
      <div className="text-slate-400 text-center flex flex-col items-center justify-center p-4">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2" />
        <span className="text-xs font-medium text-slate-500">Carregando imagem...</span>
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt="Foto da Peça"
      onError={() => setHasError(true)}
      className="w-full h-full object-cover"
    />
  );
};

interface RegisterModalProps {
  isOpen: boolean;
  initialType?: 'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE';
  clientDataToView?: any;
  partDataToView?: any;
  equipmentDataToView?: any;
  serviceDataToView?: any;
  availableEquipments?: any[];
  availableSuppliers?: any[];
  existingParts?: any[];
  startInEditMode?: boolean;
  isExclusiveClientMode?: boolean;
  clientOrders?: any[];
  nextClientCode?: string;
  nextPartCode?: string;
  onClose: () => void;
  onSaveClient?: (updatedClient: any) => void;
  onSavePart?: (partData: any) => void;
  onSaveEquipment?: (equipmentData: any) => void;
  onSaveService?: (serviceData: any) => void;
  onOpenSelectedOSFromClient?: (order: any) => void;
  onOpenClientOrdersHistoryModal?: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  initialType = 'CLIENT',
  clientDataToView,
  partDataToView,
  equipmentDataToView,
  serviceDataToView,
  availableEquipments = [],
  availableSuppliers = [],
  existingParts = [],
  startInEditMode = false,
  isExclusiveClientMode = false,
  clientOrders = [],
  nextClientCode = '0001',
  nextPartCode = '0001',
  onClose,
  onSaveClient,
  onSavePart,
  onSaveEquipment,
  onSaveService,
  onOpenSelectedOSFromClient,
  onOpenClientOrdersHistoryModal,
}) => {
  const [isLocalHistoryOpen, setIsLocalHistoryOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE'
  >(initialType);
  const [partSubTab, setPartSubTab] = useState<'DATA' | 'DIMENSIONS' | 'SPECS' | 'ATTRIBUTES' | 'PHOTOS'>('DATA');
  const [isEditingPartCode, setIsEditingPartCode] = useState(false);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const partFileInputRef = useRef<HTMLInputElement>(null);
  const partCodeInputRef = useRef<HTMLInputElement>(null);

  const [equipmentForm, setEquipmentForm] = useState({
    id: '',
    code: '',
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
  });

  // Formata números decimais monetários automaticamente (ex: 50 -> 50,00 | 50.5 -> 50,50)
  const formatCurrencyInput = (val: string): string => {
    if (!val || !val.trim()) return '';
    const clean = val.trim().replace('R$', '').trim();
    if (!clean) return '';
    // Substitui vírgula por ponto para parse
    const num = parseFloat(clean.replace(',', '.'));
    if (isNaN(num)) return val;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Formata percentuais automaticamente (ex: 30 -> 30,00 ou 30)
  const formatPercentInput = (val: string): string => {
    if (!val || !val.trim()) return '';
    const clean = val.trim().replace('%', '').trim();
    if (!clean) return '';
    const num = parseFloat(clean.replace(',', '.'));
    if (isNaN(num)) return val;
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [serviceForm, setServiceForm] = useState({
    id: '',
    code: '',
    name: '',
    price: '',
  });

  const [isEditing, setIsEditing] = useState<boolean>(
    !clientDataToView || startInEditMode
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [partData, setPartData] = useState<{
    id: string;
    name: string;
    code: string;
    manufacturerCode: string;
    barcode: string;
    brand: string;
    group: string;
    location: string;
    costPrice: string;
    techPrice: string;
    finalPrice: string;
    profitMarginPercent: string;
    application: string;
    unit: string;
    stockQuantity: string;
    minStock: string;
    supplierId: string;
    supplierName: string;
    imageUrl: string;
    updatedAt: string;

    // 1. Medidas & Dimensões
    length: string;
    width: string;
    height: string;
    innerDiameter: string;
    outerDiameter: string;
    threadFitting: string;
    weight: string;

    // 2. Elétrica & Técnica
    voltage: string;
    power: string;
    current: string;
    capacitance: string;
    frequency: string;
    resistance: string;
    material: string;

    // 3. Compatibilidade & OEM
    compatibleModels: string;
    oemCrossReference: string;
    colorFinish: string;

    // 5. Atributos Extras
    customAttributes: Array<{ name: string; value: string }>;
  }>({
    id: '',
    name: '',
    code: '',
    manufacturerCode: '',
    barcode: '',
    brand: '',
    group: '',
    location: '',
    costPrice: '',
    techPrice: '',
    finalPrice: '',
    profitMarginPercent: '',
    application: '',
    unit: 'UN',
    stockQuantity: '0',
    minStock: '0',
    supplierId: '',
    supplierName: '',
    imageUrl: '',
    updatedAt: '',

    length: '',
    width: '',
    height: '',
    innerDiameter: '',
    outerDiameter: '',
    threadFitting: '',
    weight: '',

    voltage: '',
    power: '',
    current: '',
    capacitance: '',
    frequency: '',
    resistance: '',
    material: '',

    compatibleModels: '',
    oemCrossReference: '',
    colorFinish: '',

    customAttributes: [],
  });

  const [clientData, setClientData] = useState<{
    id: string;
    code: string;
    personType?: 'PF' | 'PJ';
    name: string; // Nome Completo (PF) ou Razão Social (PJ)
    tradeName?: string; // Nome Fantasia
    cpf?: string;
    cnpj?: string;
    ie?: string; // Inscrição Estadual
    im?: string; // Inscrição Municipal
    phone: string;
    whatsapp: string;
    contactName: string;
    contactPhone: string;
    additionalContacts: Array<{ id: string; name: string; phone: string }>;
    cep: string;
    address: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    reference: string;
    email: string;
    additionalNotes: string;
    isTechnician: boolean;
    hasRestriction: boolean;
    restrictionReason: string;
  }>({
    id: '',
    code: '',
    personType: 'PF',
    name: '',
    tradeName: '',
    cpf: '',
    cnpj: '',
    ie: '',
    im: '',
    phone: '',
    whatsapp: '',
    contactName: '',
    contactPhone: '',
    additionalContacts: [],
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    reference: '',
    email: '',
    additionalNotes: '',
    isTechnician: false,
    hasRestriction: false,
    restrictionReason: '',
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const tradeNameRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const cnpjRef = useRef<HTMLInputElement>(null);
  const ieRef = useRef<HTMLInputElement>(null);
  const imRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const whatsappRef = useRef<HTMLInputElement>(null);
  const contactNameRef = useRef<HTMLInputElement>(null);
  const contactPhoneRef = useRef<HTMLInputElement>(null);
  const cepRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const complementRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { alert: dlgAlert, confirm: dlgConfirm } = useDialog();

  // Manipulador para fechar cadastro com confirmação de alterações
  const handleRequestClose = async () => {
    if (isDirty) {
      const ok = await dlgConfirm({
        title: 'Sair sem Salvar?',
        message: 'Você alterou informações deste formulário que ainda não foram salvas. Deseja realmente sair sem salvar?',
        variant: 'warning',
        confirmText: 'Sair sem salvar',
      });
      if (ok) {
        setIsDirty(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Registro na pilha de modais para ESC fechar apenas o último modal aberto
  useEffect(() => {
    if (isOpen) {
      modalStack.register('RegisterModal', handleRequestClose);
      return () => modalStack.unregister('RegisterModal');
    }
  }, [isOpen, isDirty, onClose]);

  useEffect(() => {
    setIsDirty(false);
    setIsEditingPartCode(false);
    setActiveTab(initialType);
    setSuccessMessage(null);

    if (equipmentDataToView) {
      setEquipmentForm({
        id: equipmentDataToView.id || '',
        code: equipmentDataToView.code || '',
        type: equipmentDataToView.type || '',
        brand: equipmentDataToView.brand || '',
        model: equipmentDataToView.model || '',
        serialNumber: equipmentDataToView.serialNumber || '',
      });
    } else {
      setEquipmentForm({
        id: '',
        code: '',
        type: '',
        brand: '',
        model: '',
        serialNumber: '',
      });
    }

    if (serviceDataToView) {
      const sPrice = serviceDataToView.price !== undefined && serviceDataToView.price !== null ? String(serviceDataToView.price).replace('.', ',') : '';
      setServiceForm({
        id: serviceDataToView.id || '',
        code: serviceDataToView.code || '',
        name: serviceDataToView.name || serviceDataToView.description || '',
        price: sPrice,
      });
    } else {
      setServiceForm({
        id: '',
        code: '',
        name: '',
        price: '',
      });
    }

    if (partDataToView) {
      const rawCost = partDataToView.costPrice !== undefined && partDataToView.costPrice !== null ? String(partDataToView.costPrice) : '0';
      const rawFinal = (partDataToView.finalPrice !== undefined && partDataToView.finalPrice !== null ? String(partDataToView.finalPrice) : (partDataToView.price !== undefined && partDataToView.price !== null ? String(partDataToView.price) : '0'));
      const rawTech = partDataToView.techPrice !== undefined && partDataToView.techPrice !== null ? String(partDataToView.techPrice) : '';

      const costVal = parseFloat(rawCost.replace(',', '.')) || 0;
      const finalVal = parseFloat(rawFinal.replace(',', '.')) || 0;
      let marginStr = partDataToView.profitMarginPercent !== undefined && partDataToView.profitMarginPercent !== null ? String(partDataToView.profitMarginPercent) : '';
      if (!marginStr && costVal > 0 && finalVal > 0) {
        const pct = ((finalVal - costVal) / costVal) * 100;
        marginStr = pct.toFixed(1).replace('.0', '');
      }

      setPartData({
        id: partDataToView.id || '',
        name: partDataToView.name || '',
        code: partDataToView.code || '',
        manufacturerCode: partDataToView.manufacturerCode || '',
        barcode: partDataToView.barcode || '',
        brand: partDataToView.brand || '',
        group: partDataToView.group || '',
        location: partDataToView.location || '',
        costPrice: rawCost === '0' ? '' : rawCost.replace('.', ','),
        techPrice: rawTech ? rawTech.replace('.', ',') : '',
        finalPrice: rawFinal === '0' ? '' : rawFinal.replace('.', ','),
        profitMarginPercent: marginStr,
        application: partDataToView.application || '',
        unit: partDataToView.unit || 'UN',
        stockQuantity: partDataToView.stockQuantity !== undefined ? String(partDataToView.stockQuantity) : '0',
        minStock: partDataToView.minStock !== undefined ? String(partDataToView.minStock) : '0',
        supplierId: partDataToView.supplierId || '',
        supplierName: partDataToView.supplierName || '',
        imageUrl: partDataToView.imageUrl || '',
        updatedAt: partDataToView.updatedAt || '',

        length: (partDataToView as any).length || '',
        width: (partDataToView as any).width || '',
        height: (partDataToView as any).height || '',
        innerDiameter: (partDataToView as any).innerDiameter || '',
        outerDiameter: (partDataToView as any).outerDiameter || '',
        threadFitting: (partDataToView as any).threadFitting || '',
        weight: (partDataToView as any).weight || '',

        voltage: (partDataToView as any).voltage || '',
        power: (partDataToView as any).power || '',
        current: (partDataToView as any).current || '',
        capacitance: (partDataToView as any).capacitance || '',
        frequency: (partDataToView as any).frequency || '',
        resistance: (partDataToView as any).resistance || '',
        material: (partDataToView as any).material || '',

        compatibleModels: (partDataToView as any).compatibleModels || '',
        oemCrossReference: (partDataToView as any).oemCrossReference || '',
        colorFinish: (partDataToView as any).colorFinish || '',

        customAttributes: Array.isArray((partDataToView as any).customAttributes) ? [...(partDataToView as any).customAttributes] : [],
      });
      setPartSubTab('DATA');
    } else {
      setPartData({
        id: '',
        name: '',
        code: nextPartCode || '0001',
        manufacturerCode: '',
        barcode: '',
        brand: '',
        group: '',
        location: '',
        costPrice: '',
        techPrice: '',
        finalPrice: '',
        profitMarginPercent: '',
        application: '',
        unit: 'UN',
        stockQuantity: '0',
        minStock: '0',
        supplierId: '',
        supplierName: '',
        imageUrl: '',
        updatedAt: '',

        length: '',
        width: '',
        height: '',
        innerDiameter: '',
        outerDiameter: '',
        threadFitting: '',
        weight: '',

        voltage: '',
        power: '',
        current: '',
        capacitance: '',
        frequency: '',
        resistance: '',
        material: '',

        compatibleModels: '',
        oemCrossReference: '',
        colorFinish: '',

        customAttributes: [],
      });
      setPartSubTab('DATA');
    }

    if (clientDataToView) {
      const isPj = clientDataToView.personType === 'PJ' || Boolean(clientDataToView.cnpj);
      setClientData({
        id: clientDataToView.id || '',
        code: clientDataToView.code || '',
        personType: isPj ? 'PJ' : 'PF',
        name: clientDataToView.name || '',
        tradeName: clientDataToView.tradeName || '',
        cpf: clientDataToView.cpf || '',
        cnpj: clientDataToView.cnpj || '',
        ie: clientDataToView.ie || '',
        im: clientDataToView.im || '',
        phone: clientDataToView.phone || '',
        whatsapp: clientDataToView.whatsapp || '',
        contactName: clientDataToView.contactName || clientDataToView.contact1 || '',
        contactPhone: clientDataToView.contactPhone || clientDataToView.contact1Phone || '',
        additionalContacts: Array.isArray(clientDataToView.additionalContacts)
          ? clientDataToView.additionalContacts
          : [],
        cep: clientDataToView.cep || '',
        address: clientDataToView.address || '',
        number: clientDataToView.number || '',
        complement: clientDataToView.complement || '',
        neighborhood: clientDataToView.neighborhood || '',
        city: clientDataToView.city || '',
        state: clientDataToView.state || '',
        reference: clientDataToView.reference || '',
        email: clientDataToView.email || '',
        additionalNotes: clientDataToView.additionalNotes || clientDataToView.notes || '',
        isTechnician: Boolean(clientDataToView.isTechnician),
        hasRestriction: Boolean(clientDataToView.hasRestriction),
        restrictionReason: clientDataToView.restrictionReason || '',
      });
      setIsEditing(!clientDataToView || startInEditMode);
    } else {
      setClientData({
        id: '',
        code: '',
        personType: 'PF',
        name: '',
        tradeName: '',
        cpf: '',
        cnpj: '',
        ie: '',
        im: '',
        phone: '',
        whatsapp: '',
        contactName: '',
        contactPhone: '',
        additionalContacts: [],
        cep: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        reference: '',
        email: '',
        additionalNotes: '',
        isTechnician: false,
        hasRestriction: false,
        restrictionReason: '',
      });
      setIsEditing(true);
    }
  }, [clientDataToView, partDataToView, equipmentDataToView, serviceDataToView, isOpen, initialType, startInEditMode]);

  if (!isOpen) return null;

  const filteredClientOrders = (clientOrders || []).filter((os) => {
    if (!os) return false;
    const targetId = String(clientDataToView?.id || clientData.id || '').trim();
    const targetName = (clientDataToView?.name || clientData.name || '').trim().toLowerCase();
    const targetPhone = (clientDataToView?.phone || clientData.phone || '').replace(/\D/g, '');
    const targetWhatsapp = (clientDataToView?.whatsapp || clientData.whatsapp || '').replace(/\D/g, '');

    const osClientId = String(os.clientId || os.client?.id || '').trim();
    const osClientName = (os.client?.name || os.clientName || '').trim().toLowerCase();
    const osClientPhone = (os.client?.phone || '').replace(/\D/g, '');
    const osClientWhatsapp = (os.client?.whatsapp || '').replace(/\D/g, '');

    if (targetId && osClientId && targetId === osClientId) return true;
    if (targetName && osClientName && targetName === osClientName) return true;
    if (targetPhone && osClientPhone && targetPhone === osClientPhone) return true;
    if (targetWhatsapp && osClientWhatsapp && targetWhatsapp === osClientWhatsapp) return true;

    return false;
  });

  const formatCep = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 8);
    if (nums.length > 5) {
      return `${nums.slice(0, 5)}-${nums.slice(5)}`;
    }
    return nums;
  };

  const formatCpf = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length > 9) {
      return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
    } else if (nums.length > 6) {
      return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    } else if (nums.length > 3) {
      return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    }
    return nums;
  };

  const formatCnpj = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 14);
    if (nums.length > 12) {
      return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12)}`;
    } else if (nums.length > 8) {
      return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8)}`;
    } else if (nums.length > 5) {
      return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
    } else if (nums.length > 2) {
      return `${nums.slice(0, 2)}.${nums.slice(2)}`;
    }
    return nums;
  };

  const formatPhone = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
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

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setClientData((prev) => ({ ...prev, cep: formatted }));

    const numsOnly = formatted.replace(/\D/g, '');
    if (getCurrentFeatures().hasAutoCepSearch && numsOnly.length === 8 && isEditing) {
      const res = await fetchAddressByCep(numsOnly);
      if (res && res.address) {
        setClientData((prev) => ({
          ...prev,
          address: res.address || prev.address,
          neighborhood: res.neighborhood || prev.neighborhood,
          city: res.city || prev.city,
          state: res.state || prev.state,
        }));

        setTimeout(() => {
          numberRef.current?.focus();
        }, 100);
      }
    }
  };

  const handleCepKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (clientData.address.trim() !== '') {
        numberRef.current?.focus();
      } else {
        addressRef.current?.focus();
      }
    }
  };

  const handleKeyDownNext = (
    e: React.KeyboardEvent,
    nextRef: React.RefObject<HTMLInputElement | HTMLButtonElement>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const handleBrowsePartImage = async () => {
    try {
      if ((window as any).__TAURI_INTERNALS__) {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const selected = await open({
          multiple: false,
          directory: false,
          title: 'Selecione a Foto da Peça',
          filters: [
            {
              name: 'Imagens (*.jpg, *.jpeg, *.png, *.webp, *.bmp)',
              extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'],
            },
          ],
        });

        if (selected && typeof selected === 'string') {
          setPartData((prev) => ({ ...prev, imageUrl: selected }));
          setIsDirty(true);
          return;
        }
      }
    } catch (err) {
      console.warn('Fallback para input de arquivo web:', err);
    }
    partFileInputRef.current?.click();
  };

  const handlePartFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setPartData((prev) => ({ ...prev, imageUrl: base64 }));
          setIsDirty(true);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData.name.trim()) {
      alert(clientData.personType === 'PJ' ? 'Por favor, informe a Razão Social do Cliente PJ.' : 'Por favor, informe o Nome Completo do Cliente.');
      return;
    }

    const isPj = clientData.personType === 'PJ';

    const savedClient = {
      id: clientData.id || clientDataToView?.id || String(Date.now()),
      code: clientData.code || clientDataToView?.code || nextClientCode,
      personType: clientData.personType || 'PF',
      name: clientData.name.trim().slice(0, 60),
      tradeName: isPj ? (clientData.tradeName || '').trim().slice(0, 60) : '',
      cpf: !isPj ? (clientData.cpf || '').trim() : '',
      cnpj: isPj ? (clientData.cnpj || '').trim() : '',
      ie: isPj ? (clientData.ie || '').trim() : '',
      im: isPj ? (clientData.im || '').trim() : '',
      phone: clientData.phone.trim(),
      whatsapp: clientData.whatsapp.trim(),
      contactName: clientData.contactName.trim(),
      contactPhone: clientData.contactPhone.trim(),
      additionalContacts: (clientData.additionalContacts || []).filter(
        (c) => c.name.trim() !== '' || c.phone.trim() !== ''
      ),
      cep: clientData.cep.trim(),
      address: clientData.address.trim(),
      number: clientData.number.trim(),
      complement: clientData.complement.trim(),
      neighborhood: clientData.neighborhood.trim().slice(0, 30),
      city: clientData.city.trim(),
      state: clientData.state.trim().slice(0, 3).toUpperCase(),
      reference: clientData.reference.trim(),
      email: clientData.email.trim(),
      additionalNotes: clientData.additionalNotes ? clientData.additionalNotes.trim() : '',
      isTechnician: Boolean(clientData.isTechnician),
      hasRestriction: Boolean(clientData.hasRestriction),
      restrictionReason: clientData.hasRestriction ? (clientData.restrictionReason || '').trim() : '',
    };

    if (onSaveClient) {
      onSaveClient(savedClient);
    }

    setSuccessMessage(`Cadastro do Cliente "${savedClient.name}" salvo com sucesso!`);
    setIsEditing(false);
    onClose();
  };

  const handleCancelRegistration = () => {
    handleRequestClose();
  };

  // Cada opção aberta no menu de cadastros abre exclusivamente o seu modal limpo sem abas
  const hideTabs = true;

  const renderIcon = () => {
    switch (activeTab) {
      case 'PART':
        return <Package className="w-5 h-5 text-amber-600" />;
      case 'TECHNICIAN':
        return <Wrench className="w-5 h-5 text-cyan-600" />;
      case 'EQUIPMENT':
        return <Cpu className="w-5 h-5 text-purple-600" />;
      case 'SERVICE':
        return <FileCheck className="w-5 h-5 text-sky-600" />;
      default:
        return <User className="w-5 h-5 text-sky-700" />;
    }
  };

  const renderTitle = () => {
    switch (activeTab) {
      case 'PART':
        return 'Cadastro de Peça';
      case 'TECHNICIAN':
        return 'Cadastro de Técnico';
      case 'EQUIPMENT':
        return 'Cadastro de Equipamento';
      case 'SERVICE':
        return 'Cadastro de Serviço';
      default:
        return clientDataToView
          ? isEditing
            ? 'Edição do Cadastro do Cliente'
            : 'Ficha de Cadastro do Cliente'
          : 'Cadastro de Cliente';
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`bg-white border border-slate-300 rounded-2xl w-full ${activeTab === 'CLIENT' ? 'max-w-5xl' : 'max-w-4xl'} max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans`}>
        {/* Header do Modal Exclusivo */}
        <div className="px-4 py-2.5 bg-slate-200 border-b border-slate-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {renderIcon()}
            <h2 className="text-base font-bold text-slate-800">{renderTitle()}</h2>
          </div>
          <button onClick={handleCancelRegistration} className="text-slate-600 hover:text-slate-900 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de Navegação */}
        {!hideTabs && (
          <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-700 shrink-0">
            <button
              onClick={() => setActiveTab('CLIENT')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'CLIENT'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <User className="w-4 h-4" /> Cliente
            </button>
            <button
              onClick={() => setActiveTab('PART')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'PART'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <Package className="w-4 h-4" /> Peças
            </button>
            <button
              onClick={() => setActiveTab('TECHNICIAN')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'TECHNICIAN'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <Wrench className="w-4 h-4" /> Técnico
            </button>
            <button
              onClick={() => setActiveTab('EQUIPMENT')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'EQUIPMENT'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <Cpu className="w-4 h-4" /> Equipamento
            </button>
            <button
              onClick={() => setActiveTab('SERVICE')}
              className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'SERVICE'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <FileCheck className="w-4 h-4" /> Serviço
            </button>
          </div>
        )}

        {/* Formulário do Cliente */}
        <div className="p-3 overflow-hidden flex-1 bg-slate-50 text-xs flex flex-col justify-between min-h-0">
          {successMessage && (
            <div className="mb-1.5 p-1.5 bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold rounded-lg flex items-center gap-2 shadow-sm text-xs shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              {successMessage}
            </div>
          )}

          {activeTab === 'CLIENT' && (
            <form
              onSubmit={(e) => {
                setIsDirty(false);
                handleSubmitClient(e);
              }}
              onChange={() => setIsDirty(true)}
              className="flex-1 flex flex-col justify-between overflow-hidden"
            >
              {/* BARRA SUPERIOR DE INFORMAÇÕES E TAGS */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                    {clientDataToView ? (
                      <>
                        <span>Cliente:</span>
                        <span className="font-mono text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded text-[11px] font-bold">
                          {clientDataToView.code ? String(clientDataToView.code).replace('CLI-', '').padStart(4, '0') : '0001'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Novo Cliente:</span>
                        <span className="font-mono text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded text-[11px] font-bold">
                          {nextClientCode}
                        </span>
                      </>
                    )}
                  </span>

                  {/* CHECKBOX TÉCNICO / REVENDEDOR */}
                  {getCurrentFeatures().hasClientTechnicianType && (
                    <label
                      htmlFor="isTechnicianCheck"
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all cursor-pointer select-none ${
                        clientData.isTechnician
                          ? 'bg-amber-100 border-amber-300 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id="isTechnicianCheck"
                        disabled={!isEditing}
                        checked={clientData.isTechnician}
                        onChange={(e) => {
                          setClientData({ ...clientData, isTechnician: e.target.checked });
                          setIsDirty(true);
                        }}
                        className="w-3 h-3 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <Wrench className={`w-3 h-3 ${clientData.isTechnician ? 'text-amber-700' : 'text-slate-400'}`} />
                      <span>Técnico/Revendedor</span>
                    </label>
                  )}

                  {/* CHECKBOX CLIENTE COM RESTRIÇÃO */}
                  <label
                    htmlFor="hasRestrictionCheck"
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold transition-all cursor-pointer select-none ${
                      clientData.hasRestriction
                        ? 'bg-rose-100 border-rose-400 text-rose-950 ring-1 ring-rose-400'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      id="hasRestrictionCheck"
                      disabled={!isEditing}
                      checked={clientData.hasRestriction}
                      onChange={(e) => {
                        setClientData({ ...clientData, hasRestriction: e.target.checked });
                        setIsDirty(true);
                      }}
                      className="w-3 h-3 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <AlertTriangle className={`w-3 h-3 ${clientData.hasRestriction ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className={clientData.hasRestriction ? 'text-rose-900 font-extrabold' : ''}>Cliente com Restrição</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  {(clientDataToView || clientData.name) && (
                    <button
                      type="button"
                      onClick={() => setIsLocalHistoryOpen(true)}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer text-[11px]"
                    >
                      <FileText className="w-3 h-3" />
                      OS do Cliente ({filteredClientOrders.length})
                    </button>
                  )}

                  {clientDataToView && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer text-[11px]"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar Cadastro
                    </button>
                  )}
                </div>
              </div>

              {/* GRID UNIFICADO DE CAMPOS (12 COLUNAS - COMPACTO SEM ROLAGEM) */}
              <div className="grid grid-cols-12 gap-x-2 gap-y-1.5 my-1.5 flex-1 content-start">
                {/* MOTIVO DA RESTRIÇÃO (EXIBIDO INLINE QUANDO MARCADO) */}
                {clientData.hasRestriction && (
                  <div className="col-span-12 bg-rose-50 border border-rose-300 px-2 py-1 rounded-lg flex items-center gap-2 text-rose-950">
                    <div className="flex items-center gap-1 shrink-0 font-extrabold text-[11px] text-rose-700">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Motivo:</span>
                    </div>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={clientData.restrictionReason || ''}
                      onChange={(e) => {
                        setClientData({ ...clientData, restrictionReason: e.target.value });
                        setIsDirty(true);
                      }}
                      placeholder="Informe o motivo da restrição (ex: Devedor / Inadimplente, Cheque sem fundo, etc.)..."
                      className="flex-1 bg-white disabled:bg-rose-100/60 border border-rose-300 rounded px-2 py-0.5 text-rose-900 font-bold focus:outline-none focus:border-rose-600 placeholder:text-rose-300 text-xs h-7"
                    />
                  </div>
                )}

                {/* LINHA 1: TIPO DE PESSOA (DROPDOWN) + NOME/RAZÃO SOCIAL (MAX 60) + NOME FANTASIA (MAX 60) */}
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-0.5 text-[10.5px]">
                    Pessoa <span className="text-red-500 font-extrabold">*</span>
                  </label>
                  <select
                    disabled={!isEditing}
                    value={clientData.personType || 'PF'}
                    onChange={(e) => {
                      const pType = e.target.value as 'PF' | 'PJ';
                      setClientData((prev) => ({ ...prev, personType: pType }));
                      setIsDirty(true);
                    }}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs h-7 cursor-pointer"
                  >
                    <option value="PF">Física (PF)</option>
                    <option value="PJ">Jurídica (PJ)</option>
                  </select>
                </div>

                <div className="col-span-5">
                  <label className="block font-bold text-slate-800 mb-0.5 text-[10.5px] truncate">
                    {clientData.personType === 'PJ' ? 'Razão Social' : 'Nome Completo do Cliente'}{' '}
                    <span className="text-red-500 font-extrabold">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    maxLength={60}
                    required
                    disabled={!isEditing}
                    value={clientData.name}
                    onChange={(e) => {
                      setClientData({ ...clientData, name: e.target.value.slice(0, 60) });
                      setIsDirty(true);
                    }}
                    onKeyDown={(e) => handleKeyDownNext(e, clientData.personType === 'PJ' ? tradeNameRef : docRef)}
                    placeholder={clientData.personType === 'PJ' ? 'Razão Social completa...' : 'Nome completo do cliente...'}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-5">
                  <label className={`block font-semibold mb-0.5 text-[10.5px] truncate transition-colors ${
                    clientData.personType !== 'PJ' ? 'text-slate-500' : 'text-slate-700'
                  }`}>
                    Nome Fantasia
                  </label>
                  <input
                    ref={tradeNameRef}
                    type="text"
                    maxLength={60}
                    disabled={!isEditing || clientData.personType !== 'PJ'}
                    value={clientData.personType === 'PJ' ? (clientData.tradeName || '') : ''}
                    onChange={(e) => {
                      setClientData({ ...clientData, tradeName: e.target.value.slice(0, 60) });
                      setIsDirty(true);
                    }}
                    onKeyDown={(e) => handleKeyDownNext(e, cnpjRef)}
                    placeholder={clientData.personType !== 'PJ' ? 'Disponível apenas para Pessoa Jurídica' : 'Nome Fantasia / Comercial...'}
                    className={`w-full border rounded-md px-2 py-1 font-bold focus:outline-none focus:border-sky-600 text-xs h-7 transition-all ${
                      clientData.personType !== 'PJ'
                        ? 'bg-slate-100 border-slate-300 text-slate-500 placeholder:text-slate-400 select-none'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* LINHA 2: CPF (PF) + CNPJ (PJ) + IE (PJ) + IM (PJ) */}
                <div className="col-span-3">
                  <label className={`block font-semibold mb-0.5 text-[10.5px] truncate transition-colors ${
                    clientData.personType === 'PJ' ? 'text-slate-500' : 'text-slate-700'
                  }`}>
                    CPF (Pessoa Física)
                  </label>
                  <input
                    ref={docRef}
                    type="text"
                    disabled={!isEditing || clientData.personType === 'PJ'}
                    value={clientData.personType !== 'PJ' ? (clientData.cpf || '') : ''}
                    onChange={(e) => {
                      setClientData({ ...clientData, cpf: formatCpf(e.target.value) });
                      setIsDirty(true);
                    }}
                    onKeyDown={(e) => handleKeyDownNext(e, phoneRef)}
                    placeholder={clientData.personType === 'PJ' ? 'Disponível para PF' : '000.000.000-00'}
                    className={`w-full border rounded-md px-2 py-1 font-bold focus:outline-none focus:border-sky-600 text-xs h-7 transition-all ${
                      clientData.personType === 'PJ'
                        ? 'bg-slate-100 border-slate-300 text-slate-500 placeholder:text-slate-400 select-none'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div className="col-span-3">
                  <label className={`block font-semibold mb-0.5 text-[10.5px] truncate transition-colors ${
                    clientData.personType !== 'PJ' ? 'text-slate-500' : 'text-slate-700'
                  }`}>
                    CNPJ (Pessoa Jurídica)
                  </label>
                  <input
                    ref={cnpjRef}
                    type="text"
                    disabled={!isEditing || clientData.personType !== 'PJ'}
                    value={clientData.personType === 'PJ' ? (clientData.cnpj || '') : ''}
                    onChange={(e) => {
                      setClientData({ ...clientData, cnpj: formatCnpj(e.target.value) });
                      setIsDirty(true);
                    }}
                    onKeyDown={(e) => handleKeyDownNext(e, ieRef)}
                    placeholder={clientData.personType !== 'PJ' ? 'Disponível para PJ' : '00.000.000/0000-00'}
                    className={`w-full border rounded-md px-2 py-1 font-bold focus:outline-none focus:border-sky-600 text-xs h-7 transition-all ${
                      clientData.personType !== 'PJ'
                        ? 'bg-slate-100 border-slate-300 text-slate-500 placeholder:text-slate-400 select-none'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div className="col-span-3">
                  <label className={`block font-semibold mb-0.5 text-[10.5px] truncate transition-colors ${
                    clientData.personType !== 'PJ' ? 'text-slate-500' : 'text-slate-700'
                  }`}>
                    Inscrição Estadual (IE)
                  </label>
                  <input
                    ref={ieRef}
                    type="text"
                    disabled={!isEditing || clientData.personType !== 'PJ'}
                    value={clientData.personType === 'PJ' ? (clientData.ie || '') : ''}
                    onChange={(e) => {
                      setClientData({ ...clientData, ie: e.target.value });
                      setIsDirty(true);
                    }}
                    onKeyDown={(e) => handleKeyDownNext(e, imRef)}
                    placeholder={clientData.personType !== 'PJ' ? 'Disponível para PJ' : 'IE ou Isento'}
                    className={`w-full border rounded-md px-2 py-1 font-bold focus:outline-none focus:border-sky-600 text-xs h-7 transition-all ${
                      clientData.personType !== 'PJ'
                        ? 'bg-slate-100 border-slate-300 text-slate-500 placeholder:text-slate-400 select-none'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div className="col-span-3">
                  <label className={`block font-semibold mb-0.5 text-[10.5px] truncate transition-colors ${
                    clientData.personType !== 'PJ' ? 'text-slate-500' : 'text-slate-700'
                  }`}>
                    Inscrição Municipal (IM)
                  </label>
                  <input
                    ref={imRef}
                    type="text"
                    disabled={!isEditing || clientData.personType !== 'PJ'}
                    value={clientData.personType === 'PJ' ? (clientData.im || '') : ''}
                    onChange={(e) => {
                      setClientData({ ...clientData, im: e.target.value });
                      setIsDirty(true);
                    }}
                    onKeyDown={(e) => handleKeyDownNext(e, phoneRef)}
                    placeholder={clientData.personType !== 'PJ' ? 'Disponível para PJ' : 'Opcional'}
                    className={`w-full border rounded-md px-2 py-1 font-bold focus:outline-none focus:border-sky-600 text-xs h-7 transition-all ${
                      clientData.personType !== 'PJ'
                        ? 'bg-slate-100 border-slate-300 text-slate-500 placeholder:text-slate-400 select-none'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                {/* LINHA 3: TELEFONE FIXO + WHATSAPP + CONTATO RESPONSÁVEL + TELEFONE CONTATO */}
                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">
                    Telefone Fixo / Recado
                  </label>
                  <input
                    ref={phoneRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.phone}
                    onChange={(e) =>
                      setClientData({ ...clientData, phone: formatPhone(e.target.value) })
                    }
                    onKeyDown={(e) => handleKeyDownNext(e, whatsappRef)}
                    placeholder="(00) 0000-0000"
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] flex items-center gap-1 text-emerald-700 truncate">
                    <MessageSquare className="w-3 h-3 text-emerald-600 shrink-0" />
                    WhatsApp
                  </label>
                  <input
                    ref={whatsappRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.whatsapp}
                    onChange={(e) =>
                      setClientData({ ...clientData, whatsapp: formatPhone(e.target.value) })
                    }
                    onKeyDown={(e) => handleKeyDownNext(e, contactNameRef)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] text-sky-800 truncate">
                    Contato (Responsável)
                  </label>
                  <input
                    ref={contactNameRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.contactName}
                    onChange={(e) =>
                      setClientData({ ...clientData, contactName: e.target.value })
                    }
                    onKeyDown={(e) => handleKeyDownNext(e, contactPhoneRef)}
                    placeholder="Ex: Fulano (Gerente)..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] text-sky-800 truncate">
                    Telefone do Contato
                  </label>
                  <input
                    ref={contactPhoneRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.contactPhone}
                    onChange={(e) =>
                      setClientData({ ...clientData, contactPhone: formatPhone(e.target.value) })
                    }
                    onKeyDown={(e) => handleKeyDownNext(e, cepRef)}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                {/* LINHA 4: CEP + ENDEREÇO + NÚMERO + COMPLEMENTO */}
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">
                    {getCurrentFeatures().hasAutoCepSearch ? 'CEP (Auto)' : 'CEP'}
                  </label>
                  <input
                    ref={cepRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.cep}
                    onChange={handleCepChange}
                    onKeyDown={handleCepKeyDown}
                    placeholder="00000-000"
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-5">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">Endereço / Rua</label>
                  <input
                    ref={addressRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.address}
                    onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, numberRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">Número</label>
                  <input
                    ref={numberRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.number}
                    onChange={(e) => setClientData({ ...clientData, number: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, complementRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">Complemento</label>
                  <input
                    ref={complementRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.complement}
                    onChange={(e) => setClientData({ ...clientData, complement: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, neighborhoodRef)}
                    placeholder="Ex: Apto 42, Bloco B..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                {/* LINHA 5: BAIRRO + CIDADE + ESTADO (UF) + PONTO DE REFERÊNCIA */}
                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">
                    Bairro
                  </label>
                  <input
                    ref={neighborhoodRef}
                    type="text"
                    maxLength={30}
                    disabled={!isEditing}
                    value={clientData.neighborhood}
                    onChange={(e) => setClientData({ ...clientData, neighborhood: e.target.value.slice(0, 30) })}
                    onKeyDown={(e) => handleKeyDownNext(e, cityRef)}
                    placeholder="Bairro..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">Cidade</label>
                  <input
                    ref={cityRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.city}
                    onChange={(e) => setClientData({ ...clientData, city: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, stateRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate text-center" title="Estado (UF)">UF</label>
                  <input
                    ref={stateRef}
                    type="text"
                    maxLength={3}
                    disabled={!isEditing}
                    value={clientData.state}
                    onChange={(e) => setClientData({ ...clientData, state: e.target.value.slice(0, 3).toUpperCase() })}
                    onKeyDown={(e) => handleKeyDownNext(e, referenceRef)}
                    placeholder="UF"
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-1 py-1 text-slate-800 focus:outline-none focus:border-sky-600 uppercase text-xs h-7 text-center font-bold"
                  />
                </div>

                <div className="col-span-5">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">Ponto de Referência</label>
                  <input
                    ref={referenceRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.reference}
                    onChange={(e) => setClientData({ ...clientData, reference: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, emailRef)}
                    placeholder="Ex: Próximo à padaria..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                {/* LINHA 6: E-MAIL + OBSERVAÇÕES */}
                <div className="col-span-4">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">E-mail de Contato</label>
                  <input
                    ref={emailRef}
                    type="email"
                    disabled={!isEditing}
                    value={clientData.email}
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, submitBtnRef)}
                    placeholder="email@cliente.com"
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>

                <div className="col-span-8">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[10.5px] truncate">Informações Adicionais / Observações</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={clientData.additionalNotes}
                    onChange={(e) => {
                      setClientData({ ...clientData, additionalNotes: e.target.value });
                      setIsDirty(true);
                    }}
                    placeholder="Observações sobre o cliente, particularidades, preferências..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-md px-2 py-1 text-slate-800 focus:outline-none focus:border-sky-600 text-xs h-7"
                  />
                </div>
              </div>

              {/* FOOTER / BOTÕES DE AÇÃO */}
              {isEditing && (
                <div className="flex justify-end items-center gap-2 pt-1.5 border-t border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelRegistration}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    ref={submitBtnRef}
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer text-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Salvar Cadastro do Cliente
                  </button>
                </div>
              )}
            </form>
          )}

          {/* FORMULÁRIO DE CADASTRO DE PEÇA */}
          {activeTab === 'PART' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsDirty(false);

                // Normaliza o código da peça digitado (ex: "80" -> "0080")
                const rawCode = String(partData.code || nextPartCode || '0001').trim();
                const numOnly = parseInt(rawCode.replace(/\D/g, ''), 10);
                const formattedCode = isNaN(numOnly) ? rawCode : String(numOnly).padStart(4, '0');

                // Validação de unicidade do código da peça
                const duplicate = existingParts.find((p: any) => {
                  if (partData.id && p.id === partData.id) return false;
                  const pNum = parseInt(String(p.code || '').replace(/\D/g, ''), 10);
                  const fNum = parseInt(formattedCode.replace(/\D/g, ''), 10);
                  if (!isNaN(pNum) && !isNaN(fNum)) {
                    return pNum === fNum;
                  }
                  return String(p.code || '').trim().toLowerCase() === formattedCode.toLowerCase();
                });

                if (duplicate) {
                  alert(`O código "${formattedCode}" já existe cadastrado na peça "${duplicate.name || 'Sem nome'}" (Cód: ${duplicate.code}). Por favor, informe um código diferente.`);
                  setIsEditingPartCode(true);
                  if (partCodeInputRef.current) {
                    partCodeInputRef.current.focus();
                    partCodeInputRef.current.select();
                  }
                  return;
                }

                const finalPartData = {
                  ...partData,
                  code: formattedCode,
                };

                if (onSavePart) {
                  onSavePart(finalPartData);
                }
                onClose();
              }}
              onChange={() => setIsDirty(true)}
              className="flex-1 flex flex-col justify-between bg-white p-4 rounded-xl border border-slate-200"
            >
              {/* Input oculto para fallback de seleção de arquivos */}
              <input
                type="file"
                ref={partFileInputRef}
                onChange={handlePartFileChange}
                accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,image/jpeg,image/png,image/webp,image/gif,image/bmp"
                className="hidden"
              />

              <div className="space-y-2.5 flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-600" />
                      {partDataToView ? 'Editar Peça' : 'Cadastrar Nova Peça'}
                    </h3>
                  </div>

                  {/* SUB-ABAS DE ESPECIFICAÇÕES DA PEÇA */}
                  <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setPartSubTab('DATA')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        partSubTab === 'DATA'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      Dados Gerais
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartSubTab('DIMENSIONS')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        partSubTab === 'DIMENSIONS'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Ruler className="w-3.5 h-3.5 text-indigo-500" />
                      Medidas & Dimensões
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartSubTab('SPECS')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        partSubTab === 'SPECS'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Elétrica & Técnica
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartSubTab('ATTRIBUTES')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        partSubTab === 'ATTRIBUTES'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-purple-600" />
                      Atributos Extras
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartSubTab('PHOTOS')}
                      className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        partSubTab === 'PHOTOS'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-600" />
                      <span>Fotos</span>
                    </button>
                  </div>
                </div>

                {/* CONTEÚDO DA ABA: DADOS DA PEÇA */}
                {partSubTab === 'DATA' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 flex-1">
                    {/* LINHA 1: CÓDIGO DA PEÇA (1.5 COLS) + NOME DA PEÇA (6.5 COLS) + MARCA (4 COLS) */}
                    <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block font-semibold text-slate-700 text-[11px] truncate">
                          Cód. Peça
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPartCode((prev) => {
                              const nextState = !prev;
                              if (nextState) {
                                setTimeout(() => {
                                  partCodeInputRef.current?.focus();
                                  partCodeInputRef.current?.select();
                                }, 50);
                              }
                              return nextState;
                            });
                          }}
                          className={`p-0.5 rounded transition-colors cursor-pointer ${
                            isEditingPartCode ? 'text-sky-600 bg-sky-100' : 'text-slate-400 hover:text-sky-600 hover:bg-slate-100'
                          }`}
                          title={isEditingPartCode ? 'Edição manual do código ativada' : 'Clique para editar o código da peça manualmente'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        ref={partCodeInputRef}
                        type="text"
                        readOnly={!isEditingPartCode}
                        disabled={false}
                        value={partData.code !== undefined && partData.code !== '' ? partData.code : (nextPartCode || '0001')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPartData((prev) => ({ ...prev, code: val }));
                          setIsDirty(true);
                        }}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val) {
                            const n = parseInt(val.replace(/\D/g, ''), 10);
                            if (!isNaN(n)) {
                              setPartData((prev) => ({ ...prev, code: String(n).padStart(4, '0') }));
                            }
                          } else {
                            setPartData((prev) => ({ ...prev, code: nextPartCode || '0001' }));
                          }
                          setIsEditingPartCode(false);
                        }}
                        className={`w-full border rounded-lg px-2 py-1 font-bold focus:outline-none font-mono text-xs text-center transition-all ${
                          isEditingPartCode
                            ? 'bg-amber-50/70 border-amber-400 text-amber-900 focus:border-amber-600 ring-1 ring-amber-300'
                            : 'bg-slate-100 border-slate-300 text-slate-700 cursor-not-allowed select-none'
                        }`}
                        title={isEditingPartCode ? 'Digite o código desejado (ex: 80 salvará como 0080)' : 'Código sequencial automático. Clique no lápis para alterar.'}
                      />
                    </div>

                    <div className="col-span-1 md:col-span-6">
                      <label className="block font-bold text-slate-800 mb-0.5 text-[11px] truncate">
                        Nome da Peça <span className="text-red-500 font-extrabold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={partData.name}
                        onChange={(e) => setPartData({ ...partData, name: e.target.value })}
                        placeholder="Digite o nome completo da peça..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-4">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">
                        Marca / Fabricante
                      </label>
                      <input
                        type="text"
                        value={partData.brand}
                        onChange={(e) => setPartData({ ...partData, brand: e.target.value })}
                        placeholder="Ex: Brastemp, Bosch..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                      />
                    </div>

                    {/* LINHA 2: CÓDIGO DE BARRAS (2 COLS) + CÓDIGO FABRICANTE (2.5 COLS) + GRUPO (3.5 COLS) + LOCAL ESTOQUE (4 COLS) */}
                    <div className="col-span-1 md:col-span-2">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block font-semibold text-slate-700 text-[11px] flex items-center gap-1 truncate">
                          <Barcode className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          Cód. Barras
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const codeToUse = partData.code || nextPartCode || '0001';
                            const autoCode = generateAutoBarcode(codeToUse);
                            setPartData((prev) => ({ ...prev, barcode: autoCode }));
                            setIsDirty(true);
                          }}
                          className="text-[10px] font-bold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                          title="Gerar código de barras baseado no código da peça no sistema"
                        >
                          Gerar
                        </button>
                      </div>
                      <input
                        type="text"
                        value={partData.barcode}
                        onChange={(e) => setPartData({ ...partData, barcode: e.target.value })}
                        placeholder="Ex: 000000000 ou cód. de fábrica"
                        maxLength={48}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs text-center"
                        title="Código de barras da peça (gerado com 9 dígitos ou código original de fábrica com mais dígitos)"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-3">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">
                        Código Fabricante
                      </label>
                      <input
                        type="text"
                        value={partData.manufacturerCode}
                        onChange={(e) => setPartData({ ...partData, manufacturerCode: e.target.value })}
                        placeholder="Ex: FAB-9982"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-3">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">
                        Grupo (Tipo de Equip.)
                      </label>
                      <input
                        type="text"
                        value={partData.group}
                        onChange={(e) => setPartData({ ...partData, group: e.target.value })}
                        placeholder="Ex: Lavadora, Refrigerador..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs uppercase"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-4">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">
                        Localização no Estoque (Prateleira / Gaveta)
                      </label>
                      <input
                        type="text"
                        value={partData.location}
                        onChange={(e) => setPartData({ ...partData, location: e.target.value })}
                        placeholder="Ex: Prateleira B3, Gaveta 12..."
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs uppercase"
                      />
                    </div>

                    {/* LINHA 3: PREÇO CUSTO (2 COLS) + MARGEM % (2 COLS) + VALOR TÉCNICO (2 COLS) + CONSUMIDOR FINAL (3 COLS) + UNIDADE (1.5 COLS) + ESTOQUE (1.5 COLS) */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">
                        Preço Custo (R$)
                      </label>
                      <input
                        type="text"
                        value={partData.costPrice}
                        onChange={(e) => {
                          const newCost = e.target.value;
                          const costVal = parseFloat(newCost.replace(',', '.')) || 0;
                          const pctVal = parseFloat(partData.profitMarginPercent.replace('%', '').replace(',', '.')) || 0;

                          let newFinal = partData.finalPrice;
                          if (costVal > 0 && pctVal > 0) {
                            const calcFinal = costVal * (1 + pctVal / 100);
                            newFinal = calcFinal.toFixed(2).replace('.', ',');
                          }

                          setPartData({
                            ...partData,
                            costPrice: newCost,
                            finalPrice: newFinal,
                          });
                        }}
                        onBlur={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setPartData((prev) => ({ ...prev, costPrice: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const formatted = formatCurrencyInput(partData.costPrice);
                            setPartData((prev) => ({ ...prev, costPrice: formatted }));
                          }
                        }}
                        placeholder="0,00"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">
                        Margem (%)
                      </label>
                      <input
                        type="text"
                        value={partData.profitMarginPercent}
                        onChange={(e) => {
                          const newPct = e.target.value;
                          const pctVal = parseFloat(newPct.replace('%', '').replace(',', '.')) || 0;
                          const costVal = parseFloat(partData.costPrice.replace(',', '.')) || 0;

                          let newFinal = partData.finalPrice;
                          if (costVal > 0 && pctVal > 0) {
                            const calcFinal = costVal * (1 + pctVal / 100);
                            newFinal = calcFinal.toFixed(2).replace('.', ',');
                          }

                          setPartData({
                            ...partData,
                            profitMarginPercent: newPct,
                            finalPrice: newFinal,
                          });
                        }}
                        onBlur={(e) => {
                          const formatted = formatPercentInput(e.target.value);
                          setPartData((prev) => ({ ...prev, profitMarginPercent: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const formatted = formatPercentInput(partData.profitMarginPercent);
                            setPartData((prev) => ({ ...prev, profitMarginPercent: formatted }));
                          }
                        }}
                        placeholder="50%"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                      />
                    </div>

                    {getCurrentFeatures().hasPartsTechPrice ? (
                      <div className="col-span-1 md:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">Valor Técnico</label>
                        <input
                          type="text"
                          value={partData.techPrice}
                          onChange={(e) => setPartData({ ...partData, techPrice: e.target.value })}
                          onBlur={(e) => {
                            const formatted = formatCurrencyInput(e.target.value);
                            setPartData((prev) => ({ ...prev, techPrice: formatted }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const formatted = formatCurrencyInput(partData.techPrice);
                              setPartData((prev) => ({ ...prev, techPrice: formatted }));
                            }
                          }}
                          placeholder="0,00"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                    ) : null}

                    <div className={getCurrentFeatures().hasPartsTechPrice ? "col-span-1 md:col-span-2" : "col-span-1 md:col-span-4"}>
                      <label className="block font-bold text-slate-800 mb-0.5 text-[11px] truncate">
                        Consumidor Final <span className="text-red-500 font-extrabold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={partData.finalPrice}
                        onChange={(e) => {
                          const newFinal = e.target.value;
                          const finalVal = parseFloat(newFinal.replace(',', '.')) || 0;
                          const costVal = parseFloat(partData.costPrice.replace(',', '.')) || 0;

                          let newPct = partData.profitMarginPercent;
                          if (costVal > 0 && finalVal > 0) {
                            const pct = ((finalVal - costVal) / costVal) * 100;
                            newPct = pct.toFixed(1).replace('.0', '');
                          }

                          setPartData({
                            ...partData,
                            finalPrice: newFinal,
                            profitMarginPercent: newPct,
                          });
                        }}
                        onBlur={(e) => {
                          const formatted = formatCurrencyInput(e.target.value);
                          setPartData((prev) => ({ ...prev, finalPrice: formatted }));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const formatted = formatCurrencyInput(partData.finalPrice);
                            setPartData((prev) => ({ ...prev, finalPrice: formatted }));
                          }
                        }}
                        placeholder="0,00"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-bold text-slate-800 mb-0.5 text-[11px] truncate">
                        Unidade
                      </label>
                      <select
                        value={partData.unit}
                        onChange={(e) => setPartData({ ...partData, unit: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                      >
                        <option value="UN">UN</option>
                        <option value="PC">PC</option>
                        <option value="KIT">KIT</option>
                        <option value="CX">CX</option>
                        <option value="CJ">CJ</option>
                        <option value="PAR">PAR</option>
                        <option value="MT">MT</option>
                        <option value="LT">LT</option>
                        <option value="KG">KG</option>
                        <option value="RL">RL</option>
                        <option value="PCT">PCT</option>
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-bold text-slate-800 mb-0.5 text-[11px] truncate">
                        Estoque <span className="text-red-500 font-extrabold">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={partData.stockQuantity}
                        onChange={(e) => setPartData({ ...partData, stockQuantity: e.target.value })}
                        placeholder="0"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                      />
                    </div>

                    {/* LINHA 4: ESTOQUE MÍNIMO (2 COLS) + FORNECEDOR (6 COLS) + DATA DA ALTERAÇÃO (4 COLS) */}
                    <div className="col-span-1 md:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] truncate">
                        Estoque Mín.
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={partData.minStock}
                        onChange={(e) => setPartData({ ...partData, minStock: e.target.value })}
                        placeholder="0"
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 font-mono text-xs"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-6">
                      <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        Fornecedor
                      </label>
                      <select
                        value={partData.supplierId || ''}
                        onChange={(e) => {
                          const supId = e.target.value;
                          const supObj = availableSuppliers.find((s: any) => s.id === supId);
                          setPartData({
                            ...partData,
                            supplierId: supId,
                            supplierName: supObj ? (supObj.tradeName || supObj.name) : '',
                          });
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                      >
                        <option value="">Nenhum fornecedor selecionado</option>
                        {availableSuppliers.map((sup: any) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.code ? `[${sup.code}] ` : ''}{sup.tradeName ? `${sup.tradeName} (${sup.name})` : sup.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-4">
                      <label className="block font-bold text-slate-600 mb-0.5 text-[11px] truncate">
                        Data da Alteração <span className="text-[10px] text-slate-400 font-normal">(Automático)</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={
                          partData.updatedAt
                            ? (() => {
                                try {
                                  const d = new Date(partData.updatedAt);
                                  return isNaN(d.getTime())
                                    ? partData.updatedAt
                                    : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                                } catch {
                                  return partData.updatedAt;
                                }
                              })()
                            : 'Será gerada ao salvar'
                        }
                        className="w-full bg-slate-100 border border-slate-300 text-slate-600 font-semibold rounded-lg px-2.5 py-1 text-xs cursor-not-allowed select-none font-mono"
                      />
                    </div>

                    {/* LINHA 5: REFERÊNCIA / APLICAÇÃO (6 COLS TOTAL) */}
                    <div className="col-span-1 md:col-span-6">
                      <label className="block font-bold text-slate-800 mb-0.5 text-[11px] truncate">
                        Referência / Aplicação / Compatibilidade Básica
                      </label>
                      <textarea
                        rows={2}
                        value={partData.application}
                        onChange={(e) => setPartData({ ...partData, application: e.target.value })}
                        placeholder="Descreva aqui os principais aparelhos ou anotações gerais..."
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* CONTEÚDO DA ABA: MEDIDAS & DIMENSÕES FÍSICAS */}
                {partSubTab === 'DIMENSIONS' && (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 flex-1">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Ruler className="w-4 h-4 text-indigo-600" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Medidas & Dimensões Físicas</h4>
                        <p className="text-[11px] text-slate-500">Dimensões externas, diâmetros, bitolas e peso para conferência de encaixe</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Comprimento (mm / cm)</label>
                        <input
                          type="text"
                          value={partData.length || ''}
                          onChange={(e) => setPartData({ ...partData, length: e.target.value })}
                          placeholder="Ex: 120 mm"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Largura (mm / cm)</label>
                        <input
                          type="text"
                          value={partData.width || ''}
                          onChange={(e) => setPartData({ ...partData, width: e.target.value })}
                          placeholder="Ex: 45 mm"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Altura / Espessura (mm / cm)</label>
                        <input
                          type="text"
                          value={partData.height || ''}
                          onChange={(e) => setPartData({ ...partData, height: e.target.value })}
                          placeholder="Ex: 25 mm"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Diâmetro Interno (mm)</label>
                        <input
                          type="text"
                          value={partData.innerDiameter || ''}
                          onChange={(e) => setPartData({ ...partData, innerDiameter: e.target.value })}
                          placeholder="Ex: 8 mm / 1/4 pol"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Diâmetro Externo (mm)</label>
                        <input
                          type="text"
                          value={partData.outerDiameter || ''}
                          onChange={(e) => setPartData({ ...partData, outerDiameter: e.target.value })}
                          placeholder="Ex: 22 mm"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Rosca / Encaixe / Bitola</label>
                        <input
                          type="text"
                          value={partData.threadFitting || ''}
                          onChange={(e) => setPartData({ ...partData, threadFitting: e.target.value })}
                          placeholder="Ex: M8, 1/2 BSP, 3/4 pol, Eixo estriado"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Peso Líquido (g / kg)</label>
                        <input
                          type="text"
                          value={partData.weight || ''}
                          onChange={(e) => setPartData({ ...partData, weight: e.target.value })}
                          placeholder="Ex: 350 g ou 1.2 kg"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTEÚDO DA ABA: ESPECIFICAÇÕES ELÉTRICAS & TÉCNICAS */}
                {partSubTab === 'SPECS' && (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 flex-1">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Especificações Elétricas & Técnicas</h4>
                        <p className="text-[11px] text-slate-500">Tensão, potência, corrente, capacitância e composição de materiais</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Tensão / Voltagem (V)</label>
                        <input
                          type="text"
                          value={partData.voltage || ''}
                          onChange={(e) => setPartData({ ...partData, voltage: e.target.value })}
                          placeholder="Ex: 110V, 220V, Bivolt, 12V DC"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Potência (W / HP / BTU)</label>
                        <input
                          type="text"
                          value={partData.power || ''}
                          onChange={(e) => setPartData({ ...partData, power: e.target.value })}
                          placeholder="Ex: 1/4 HP, 45W, 9000 BTU"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Corrente Elétrica (A / mA)</label>
                        <input
                          type="text"
                          value={partData.current || ''}
                          onChange={(e) => setPartData({ ...partData, current: e.target.value })}
                          placeholder="Ex: 1.5A, 300mA"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Capacitância (µF / nF)</label>
                        <input
                          type="text"
                          value={partData.capacitance || ''}
                          onChange={(e) => setPartData({ ...partData, capacitance: e.target.value })}
                          placeholder="Ex: 15 µF, 35 µF + 5 µF"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Frequência (Hz)</label>
                        <input
                          type="text"
                          value={partData.frequency || ''}
                          onChange={(e) => setPartData({ ...partData, frequency: e.target.value })}
                          placeholder="Ex: 60Hz, 50/60Hz"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Resistência Ôhmica (Ω / kΩ)</label>
                        <input
                          type="text"
                          value={partData.resistance || ''}
                          onChange={(e) => setPartData({ ...partData, resistance: e.target.value })}
                          placeholder="Ex: 28 Ω, 10 kΩ"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Material / Composição</label>
                        <input
                          type="text"
                          value={partData.material || ''}
                          onChange={(e) => setPartData({ ...partData, material: e.target.value })}
                          placeholder="Ex: Alumínio, Cobre, Inox, Plástico ABS"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Cor / Acabamento</label>
                        <input
                          type="text"
                          value={partData.colorFinish || ''}
                          onChange={(e) => setPartData({ ...partData, colorFinish: e.target.value })}
                          placeholder="Ex: Branco, Preto fosco, Cromado"
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}



                {/* CONTEÚDO DA ABA: ATRIBUTOS PERSONALIZADOS EXTRAS */}
                {partSubTab === 'ATTRIBUTES' && (
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-600" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Atributos Personalizados Extras</h4>
                          <p className="text-[11px] text-slate-500">Adicione especificações adicionais em pares Nome / Valor livres</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const currentAttrs = partData.customAttributes || [];
                          setPartData({
                            ...partData,
                            customAttributes: [...currentAttrs, { name: '', value: '' }],
                          });
                          setIsDirty(true);
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Atributo
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-64 space-y-2 pr-1">
                      {(!partData.customAttributes || partData.customAttributes.length === 0) ? (
                        <div className="flex flex-col items-center justify-center p-6 text-slate-400 border border-dashed border-slate-300 rounded-xl bg-white">
                          <Layers className="w-8 h-8 text-slate-300 mb-1" />
                          <p className="text-xs font-medium">Nenhum atributo personalizado cadastrado nesta peça.</p>
                          <p className="text-[11px] text-slate-400">Clique em "+ Adicionar Atributo" para criar campos como Gás Refrigerante, Rotação (RPM), etc.</p>
                        </div>
                      ) : (
                        partData.customAttributes.map((attr, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2 shadow-xs">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Nome do Campo / Propriedade</label>
                              <input
                                type="text"
                                value={attr.name}
                                onChange={(e) => {
                                  const updated = [...(partData.customAttributes || [])];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setPartData({ ...partData, customAttributes: updated });
                                  setIsDirty(true);
                                }}
                                placeholder="Ex: Gás Refrigerante, RPM, Sensor NTC..."
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-600"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Valor / Especificação</label>
                              <input
                                type="text"
                                value={attr.value}
                                onChange={(e) => {
                                  const updated = [...(partData.customAttributes || [])];
                                  updated[idx] = { ...updated[idx], value: e.target.value };
                                  setPartData({ ...partData, customAttributes: updated });
                                  setIsDirty(true);
                                }}
                                placeholder="Ex: R-134a (140g), 1400 RPM, 10k @ 25°C..."
                                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs font-semibold focus:outline-none focus:border-purple-600"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (partData.customAttributes || []).filter((_, i) => i !== idx);
                                setPartData({ ...partData, customAttributes: updated });
                                setIsDirty(true);
                              }}
                              className="mt-3.5 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Remover este atributo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* CONTEÚDO DA ABA: FOTOS */}
                {partSubTab === 'PHOTOS' && (
                  <div className="py-2 space-y-3 flex-1 flex flex-col justify-start">
                    {/* BARRA DE CAMINHO, BUSCAR E LIMPAR */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                      <label className="block font-bold text-slate-700 text-xs">
                        Caminho do arquivo de imagem ou link da foto:
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={partData.imageUrl || ''}
                          onChange={(e) => {
                            setPartData({ ...partData, imageUrl: e.target.value });
                            setIsDirty(true);
                          }}
                          placeholder="Cole aqui o caminho do arquivo no Windows (ex: C:\Imagens\peca.jpg) ou link..."
                          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleBrowsePartImage}
                          className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer text-xs shrink-0"
                          title="Abrir gerenciador de arquivos do Windows para selecionar imagem"
                        >
                          <FolderOpen className="w-4 h-4" />
                          Buscar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPartData((prev) => ({ ...prev, imageUrl: '' }));
                            setIsDirty(true);
                          }}
                          disabled={!partData.imageUrl}
                          className="bg-slate-200 hover:bg-slate-300 disabled:opacity-40 disabled:hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-xs shrink-0"
                          title="Limpar foto selecionada"
                        >
                          <Trash2 className="w-4 h-4 text-slate-500" />
                          Limpar
                        </button>
                        <input
                          type="file"
                          ref={partFileInputRef}
                          onChange={handlePartFileChange}
                          accept=".jpg,.jpeg,.png,.webp,.bmp"
                          className="hidden"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-medium">
                        <span><strong className="text-slate-700">Formatos aceitos:</strong> JPG, JPEG, PNG, WEBP, BMP</span>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span><strong className="text-slate-700">Proporção recomendada:</strong> 1:1 Quadrada (ex: 500x500 px)</span>
                      </div>
                    </div>

                    {/* ÁREA DE EXIBIÇÃO DA FOTO (SEMPRE EM FORMATO QUADRADO) */}
                    <div className="flex flex-col items-center justify-center pt-2">
                      <div className="w-56 h-56 md:w-64 md:h-64 aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden relative shadow-inner">
                        <PartPhotoRegisterPreview imageUrl={partData.imageUrl} />
                      </div>
                      {partData.imageUrl && (
                        <span className="text-[11px] text-slate-400 mt-1.5 font-medium">
                          Visualização da Peça em Formato Quadrado (1:1)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 mt-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="h-8 px-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                >
                  <Save className="w-4 h-4" />
                  Salvar Cadastro da Peça
                </button>
              </div>
            </form>
          )}

          {/* FORMULÁRIO DE CADASTRO DE EQUIPAMENTO (Apenas Nome do Equipamento) */}
          {activeTab === 'EQUIPMENT' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const typeFormatted = (equipmentForm.type || '').trim();
                if (!typeFormatted) return;

                const normalizedNew = typeFormatted.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
                const duplicate = availableEquipments.find((eq: any) => {
                  if (equipmentForm.id && eq.id === equipmentForm.id) return false;
                  const existingName = (eq.type || eq.name || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
                  return existingName === normalizedNew;
                });

                if (duplicate) {
                  alert(`Já existe um equipamento cadastrado com o nome "${duplicate.type || duplicate.name}" (Código: ${duplicate.code || 'N/D'}). Não é permitido duplicados.`);
                  return;
                }

                setIsDirty(false);
                if (onSaveEquipment) {
                  onSaveEquipment(equipmentForm);
                }
                onClose();
              }}
              onChange={() => setIsDirty(true)}
              className="space-y-4 bg-white p-5 rounded-xl border border-slate-200 font-sans text-xs"
            >
              <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                Cadastrar Novo Equipamento
              </h3>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5 text-xs">
                  Nome / Tipo do Equipamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={equipmentForm.type}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, type: e.target.value })}
                  placeholder="Ex: Geladeira Frost Free, Lava e Seca, Ar Condicionado..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-sky-600 text-xs shadow-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Salvar Cadastro do Equipamento
                </button>
              </div>
            </form>
          )}

          {/* FORMULÁRIO DAS OUTRAS ABAS (Técnico, Serviço) */}
          {activeTab !== 'CLIENT' && activeTab !== 'PART' && activeTab !== 'EQUIPMENT' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsDirty(false);
                if (activeTab === 'SERVICE' && onSaveService) {
                  onSaveService(serviceForm);
                } else {
                  alert(`Cadastro gravado com sucesso!`);
                }
                onClose();
              }}
              onChange={() => setIsDirty(true)}
              className="space-y-4 bg-white p-5 rounded-xl border border-slate-200"
            >
              <h3 className="font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
                {serviceDataToView ? 'Editar Serviço' : `Cadastrar ${activeTab === 'TECHNICIAN' ? 'Novo Técnico' : 'Novo Serviço'}`}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Descrição / Nome do Serviço <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Ex: Troca de Placa, Higienização, Troca de Rolamento..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-sky-600 text-xs shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5 text-xs">
                    Valor / Preço Padronizado (R$)
                  </label>
                  <input
                    type="text"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    onBlur={(e) => {
                      const formatted = formatCurrencyInput(e.target.value);
                      setServiceForm((prev) => ({ ...prev, price: formatted }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const formatted = formatCurrencyInput(serviceForm.price);
                        setServiceForm((prev) => ({ ...prev, price: formatted }));
                      }
                    }}
                    placeholder="R$ 0,00"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:border-sky-600 text-xs shadow-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Salvar Cadastro
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Histórico de OS Exclusivo do Cliente */}
      <ClientOrdersHistoryModal
        isOpen={isLocalHistoryOpen}
        clientName={clientDataToView?.name || clientData.name || 'Cliente'}
        orders={filteredClientOrders}
        onClose={() => setIsLocalHistoryOpen(false)}
        onSelectOrder={(order) => {
          setIsLocalHistoryOpen(false);
          if (onOpenSelectedOSFromClient) {
            onOpenSelectedOSFromClient(order);
          }
        }}
      />
    </div>
  );
};
