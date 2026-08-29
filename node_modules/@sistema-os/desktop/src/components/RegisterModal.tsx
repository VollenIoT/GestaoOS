import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Edit3, User, Phone, Package, Wrench, Cpu, FileCheck, MessageSquare, FileText, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { fetchAddressByCep } from '../services/api';
import { ClientOrdersHistoryModal } from './ClientOrdersHistoryModal';

interface RegisterModalProps {
  isOpen: boolean;
  initialType?: 'CLIENT' | 'PART' | 'TECHNICIAN' | 'EQUIPMENT' | 'SERVICE';
  clientDataToView?: any;
  partDataToView?: any;
  equipmentDataToView?: any;
  serviceDataToView?: any;
  availableEquipments?: any[];
  startInEditMode?: boolean;
  isExclusiveClientMode?: boolean;
  clientOrders?: any[];
  nextClientCode?: string;
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
  startInEditMode = false,
  isExclusiveClientMode = false,
  clientOrders = [],
  nextClientCode = '0001',
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

  const [equipmentForm, setEquipmentForm] = useState({
    id: '',
    code: '',
    type: '',
    brand: '',
    model: '',
    serialNumber: '',
  });

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

  const [partData, setPartData] = useState({
    id: '',
    name: '',
    code: '',
    manufacturerCode: '',
    brand: '',
    group: '',
    location: '',
    costPrice: '',
    techPrice: '',
    finalPrice: '',
    profitMarginPercent: '',
    application: '',
    unit: 'UN',
    stockQuantity: '10',
    minStock: '2',
  });

  const [clientData, setClientData] = useState<{
    id: string;
    name: string;
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
  }>({
    id: '',
    name: '',
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
  });

  const nameRef = useRef<HTMLInputElement>(null);
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

  // Manipulador para fechar cadastro com confirmação de alterações
  const handleRequestClose = () => {
    if (isDirty) {
      if (confirm('Você alterou informações deste formulário que ainda não foram salvas. Deseja realmente sair sem salvar?')) {
        setIsDirty(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Suporte à tecla ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  useEffect(() => {
    setIsDirty(false);
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
      setServiceForm({
        id: serviceDataToView.id || '',
        code: serviceDataToView.code || '',
        name: serviceDataToView.name || serviceDataToView.description || '',
        price: serviceDataToView.price || '',
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
      const costVal = parseFloat((partDataToView.costPrice || '0').replace(',', '.')) || 0;
      const finalVal = parseFloat((partDataToView.finalPrice || '0').replace(',', '.')) || 0;
      let marginStr = partDataToView.profitMarginPercent || '';
      if (!marginStr && costVal > 0 && finalVal > 0) {
        const pct = ((finalVal - costVal) / costVal) * 100;
        marginStr = pct.toFixed(1).replace('.0', '');
      }

      setPartData({
        id: partDataToView.id || '',
        name: partDataToView.name || '',
        code: partDataToView.code || '',
        manufacturerCode: partDataToView.manufacturerCode || '',
        brand: partDataToView.brand || '',
        group: partDataToView.group || '',
        location: partDataToView.location || '',
        costPrice: partDataToView.costPrice || '',
        techPrice: partDataToView.techPrice || '',
        finalPrice: partDataToView.finalPrice || '',
        profitMarginPercent: marginStr,
        application: partDataToView.application || '',
        unit: partDataToView.unit || 'UN',
        stockQuantity: partDataToView.stockQuantity !== undefined ? String(partDataToView.stockQuantity) : '10',
        minStock: partDataToView.minStock !== undefined ? String(partDataToView.minStock) : '2',
      });
    } else {
      setPartData({
        id: '',
        name: '',
        code: '',
        manufacturerCode: '',
        brand: '',
        group: '',
        location: '',
        costPrice: '',
        techPrice: '',
        finalPrice: '',
        profitMarginPercent: '',
        application: '',
        unit: 'UN',
        stockQuantity: '10',
        minStock: '2',
      });
    }

    if (clientDataToView) {
      setClientData({
        id: clientDataToView.id || '',
        name: clientDataToView.name || '',
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
      });
      setIsEditing(!clientDataToView || startInEditMode);
    } else {
      setClientData({
        id: '',
        name: '',
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
    if (numsOnly.length === 8 && isEditing) {
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

  const handleSubmitClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientData.name.trim()) {
      alert('Por favor, informe o Nome do Cliente.');
      return;
    }

    const savedClient = {
      id: clientData.id || String(Date.now()),
      name: clientData.name.trim(),
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
      neighborhood: clientData.neighborhood.trim(),
      city: clientData.city.trim(),
      state: clientData.state.trim(),
      reference: clientData.reference.trim(),
      email: clientData.email.trim(),
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
    <div className="fixed inset-0 z-[70] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header do Modal Exclusivo */}
        <div className="p-4 bg-slate-200 border-b border-slate-300 flex items-center justify-between">
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
          <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-700">
            <button
              onClick={() => setActiveTab('CLIENT')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'CLIENT'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <User className="w-4 h-4" /> Cliente
            </button>
            <button
              onClick={() => setActiveTab('PART')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'PART'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <Package className="w-4 h-4" /> Peças
            </button>
            <button
              onClick={() => setActiveTab('TECHNICIAN')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'TECHNICIAN'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <Wrench className="w-4 h-4" /> Técnico
            </button>
            <button
              onClick={() => setActiveTab('EQUIPMENT')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'EQUIPMENT'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <Cpu className="w-4 h-4" /> Equipamento
            </button>
            <button
              onClick={() => setActiveTab('SERVICE')}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 border-b-2 ${activeTab === 'SERVICE'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent hover:bg-slate-200'
                }`}
            >
              <FileCheck className="w-4 h-4" /> Serviço
            </button>
          </div>
        )}

        {/* Formulário do Cliente */}
        <div className="p-4 overflow-hidden flex-1 bg-slate-50 text-xs flex flex-col justify-between">
          {successMessage && (
            <div className="mb-2 p-2 bg-emerald-100 border border-emerald-300 text-emerald-950 font-bold rounded-xl flex items-center gap-2 shadow-sm text-xs">
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
              className="flex-1 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 gap-2 shrink-0">
                <span className="font-bold text-slate-700 flex items-center gap-2">
                  {clientDataToView ? (
                    <>
                      <span>Dados do Cliente:</span>
                      <span className="font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-xs font-bold">
                        {clientDataToView.code ? String(clientDataToView.code).replace('CLI-', '').padStart(4, '0') : '0001'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Cadastrando Novo Cliente:</span>
                      <span className="font-mono text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-xs font-bold">
                        {nextClientCode}
                      </span>
                    </>
                  )}
                </span>

                <div className="flex items-center gap-2">
                  {(clientDataToView || clientData.name) && (
                    <button
                      type="button"
                      onClick={() => setIsLocalHistoryOpen(true)}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Buscar todas as OS deste Cliente ({filteredClientOrders.length})
                    </button>
                  )}

                  {clientDataToView && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Editar Cadastro
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 my-2">
                <div className="col-span-3">
                  <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">
                    Nome Completo do Cliente <span className="text-red-500 font-extrabold">*</span>
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    required
                    disabled={!isEditing}
                    value={clientData.name}
                    onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, phoneRef)}
                    placeholder="Digite o nome completo do cliente..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Telefone Fixo / Recado</label>
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
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] flex items-center gap-1 text-emerald-700">
                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                    Número do WhatsApp
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
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                {/* CONTATO PRINCIPAL */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block font-semibold text-slate-700 text-[11px] text-sky-800">
                      Contato (Nome da Pessoa / Responsável na Empresa)
                    </label>
                  </div>
                  <input
                    ref={contactNameRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.contactName}
                    onChange={(e) =>
                      setClientData({ ...clientData, contactName: e.target.value })
                    }
                    onKeyDown={(e) => handleKeyDownNext(e, contactPhoneRef)}
                    placeholder="Ex: Fulano (Gerente), Ciclano (Financeiro)..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px] text-sky-800">
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
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                {/* BOTÃO PARA ADICIONAR MAIS CONTATOS */}
                <div className="col-span-3 flex justify-end -mt-1">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => {
                        const newContact = { id: String(Date.now()), name: '', phone: '' };
                        setClientData((prev) => ({
                          ...prev,
                          additionalContacts: [...(prev.additionalContacts || []), newContact],
                        }));
                      }}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Mais Contatos
                    </button>
                  )}
                </div>

                {/* CONTATOS ADICIONAIS DINÂMICOS */}
                {(clientData.additionalContacts || []).map((cont, idx) => (
                  <React.Fragment key={cont.id || idx}>
                    <div className="col-span-2 bg-sky-50/40 p-2 rounded-lg border border-sky-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block font-semibold text-sky-900 text-[10.5px]">
                          Contato Adicional {idx + 2} (Nome / Cargo)
                        </label>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setClientData((prev) => ({
                                ...prev,
                                additionalContacts: prev.additionalContacts.filter((_, i) => i !== idx),
                              }));
                            }}
                            className="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-0.5"
                          >
                            <Trash2 className="w-3 h-3" /> Remover
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={cont.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setClientData((prev) => ({
                            ...prev,
                            additionalContacts: prev.additionalContacts.map((c, i) =>
                              i === idx ? { ...c, name: val } : c
                            ),
                          }));
                        }}
                        placeholder="Ex: Beltrano (Técnico), Suporte..."
                        className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                      />
                    </div>
                    <div className="bg-sky-50/40 p-2 rounded-lg border border-sky-200/80 flex flex-col justify-end">
                      <label className="block font-semibold text-sky-900 mb-1 text-[10.5px]">
                        Telefone do Contato Adicional {idx + 2}
                      </label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={cont.phone}
                        onChange={(e) => {
                          const formatted = formatPhone(e.target.value);
                          setClientData((prev) => ({
                            ...prev,
                            additionalContacts: prev.additionalContacts.map((c, i) =>
                              i === idx ? { ...c, phone: formatted } : c
                            ),
                          }));
                        }}
                        placeholder="(00) 00000-0000"
                        className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                      />
                    </div>
                  </React.Fragment>
                ))}

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">CEP (Busca Automática)</label>
                  <input
                    ref={cepRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.cep}
                    onChange={handleCepChange}
                    onKeyDown={handleCepKeyDown}
                    placeholder="00000-000"
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Endereço</label>
                  <input
                    ref={addressRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.address}
                    onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, numberRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Número</label>
                  <input
                    ref={numberRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.number}
                    onChange={(e) => setClientData({ ...clientData, number: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, complementRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Complemento</label>
                  <input
                    ref={complementRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.complement}
                    onChange={(e) => setClientData({ ...clientData, complement: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, neighborhoodRef)}
                    placeholder="Ex: Apto 42, Bloco B..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Bairro</label>
                  <input
                    ref={neighborhoodRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.neighborhood}
                    onChange={(e) => setClientData({ ...clientData, neighborhood: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, cityRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Cidade</label>
                  <input
                    ref={cityRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.city}
                    onChange={(e) => setClientData({ ...clientData, city: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, stateRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Estado (UF)</label>
                  <input
                    ref={stateRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.state}
                    onChange={(e) => setClientData({ ...clientData, state: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, referenceRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600 uppercase"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Ponto de Referência</label>
                  <input
                    ref={referenceRef}
                    type="text"
                    disabled={!isEditing}
                    value={clientData.reference}
                    onChange={(e) => setClientData({ ...clientData, reference: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, emailRef)}
                    placeholder="Ex: Próximo à padaria central..."
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="col-span-1">
                  <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">E-mail de Contato</label>
                  <input
                    ref={emailRef}
                    type="email"
                    disabled={!isEditing}
                    value={clientData.email}
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    onKeyDown={(e) => handleKeyDownNext(e, submitBtnRef)}
                    className="w-full bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:border-sky-600"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={handleCancelRegistration}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    ref={submitBtnRef}
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer text-xs"
                  >
                    <Save className="w-4 h-4" />
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
                if (onSavePart) {
                  onSavePart(partData);
                }
                onClose();
              }}
              onChange={() => setIsDirty(true)}
              className="flex-1 flex flex-col justify-between bg-white p-4 rounded-xl border border-slate-200"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 shrink-0">
                  <h3 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-600" />
                    {partDataToView ? 'Editar Peça' : 'Cadastrar Nova Peça'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                  {/* NOME DA PEÇA (OBRIGATÓRIO *) */}
                  <div className="col-span-1 md:col-span-3">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">
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

                  {/* MARCA / FABRICANTE */}
                  <div className="col-span-1">
                    <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
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

                  {/* CÓDIGO DO FABRICANTE */}
                  <div className="col-span-1">
                    <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
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

                  {/* GRUPO (TIPO DE EQUIPAMENTO CADASTRADO) */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block font-bold text-sky-800 mb-0.5 text-[11px]">
                      Grupo (Tipo de Equipamento)
                    </label>
                    <select
                      value={partData.group}
                      onChange={(e) => setPartData({ ...partData, group: e.target.value })}
                      className="w-full bg-sky-50 border border-sky-300 rounded-lg px-2.5 py-1 text-sky-950 font-bold focus:outline-none focus:border-sky-600 cursor-pointer uppercase text-xs"
                    >
                      <option value="">Selecione o grupo (tipo)...</option>
                      {Array.from(
                        new Set(
                          availableEquipments
                            .map((eq) => (eq.type || eq.name || '').trim().toUpperCase())
                            .filter(Boolean)
                        )
                      ).map((typeName, idx) => (
                        <option key={idx} value={typeName}>
                          {typeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* LOCALIZAÇÃO (PRATELEIRA / GAVETA / ALMOXARIFADO) */}
                  <div className="col-span-1">
                    <label className="block font-bold text-purple-900 mb-0.5 text-[11px]">
                      Local no Estoque
                    </label>
                    <input
                      type="text"
                      value={partData.location}
                      onChange={(e) => setPartData({ ...partData, location: e.target.value })}
                      placeholder="Ex: Prateleira A2"
                      className="w-full bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1 text-purple-950 font-bold focus:outline-none focus:border-purple-600 uppercase text-xs"
                    />
                  </div>

                  {/* VALOR DE CUSTO (OPCIONAL) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Valor de Custo (R$)</label>
                    <input
                      type="text"
                      value={partData.costPrice}
                      onChange={(e) => {
                        const newCost = e.target.value;
                        const costVal = parseFloat(newCost.replace(',', '.')) || 0;
                        const pctVal = parseFloat(partData.profitMarginPercent.replace(',', '.')) || 0;

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
                      placeholder="0,00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  {/* MARGEM DE LUCRO ESTIMADA (%) */}
                  <div>
                    <label className="block font-bold text-indigo-900 mb-0.5 text-[11px]">Margem (%)</label>
                    <input
                      type="text"
                      value={partData.profitMarginPercent}
                      onChange={(e) => {
                        const newPct = e.target.value;
                        const pctVal = parseFloat(newPct.replace(',', '.')) || 0;
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
                      placeholder="50%"
                      className="w-full bg-indigo-50 border border-indigo-300 rounded-lg px-2.5 py-1 text-indigo-950 font-bold focus:outline-none focus:border-indigo-600 font-mono text-xs"
                    />
                  </div>

                  {/* VALOR PARA TÉCNICO (OPCIONAL) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">Valor Técnico (R$)</label>
                    <input
                      type="text"
                      value={partData.techPrice}
                      onChange={(e) => setPartData({ ...partData, techPrice: e.target.value })}
                      placeholder="0,00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  {/* VALOR PARA CONSUMIDOR FINAL (OBRIGATÓRIO *) */}
                  <div>
                    <label className="block font-bold text-emerald-800 mb-0.5 text-[11px]">
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
                      placeholder="0,00"
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 font-bold focus:outline-none focus:border-sky-600 text-xs"
                    />
                  </div>

                  {/* UNIDADE DE MEDIDA (PC, UN, KIT, CX...) */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">
                      Unidade
                    </label>
                    <select
                      value={partData.unit}
                      onChange={(e) => setPartData({ ...partData, unit: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 font-bold focus:outline-none focus:border-sky-600 cursor-pointer text-xs"
                    >
                      <option value="UN">UN - Unidade</option>
                      <option value="PC">PC - Peça</option>
                      <option value="KIT">KIT - Conjunto / Kit</option>
                      <option value="CX">CX - Caixa</option>
                      <option value="CJ">CJ - Conjunto</option>
                      <option value="PAR">PAR - Par</option>
                      <option value="MT">MT - Metro</option>
                      <option value="LT">LT - Litro</option>
                      <option value="KG">KG - Quilo</option>
                      <option value="RL">RL - Rolo</option>
                      <option value="PCT">PCT - Pacote</option>
                    </select>
                  </div>

                  {/* QUANTIDADE EM ESTOQUE */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">
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

                  {/* ESTOQUE MÍNIMO */}
                  <div className="col-span-1 md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-0.5 text-[11px]">
                      Estoque Mínimo (Alerta de Reposição)
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

                  {/* REFERÊNCIA / APLICAÇÃO (AMPLO - 4 COLUNAS) */}
                  <div className="col-span-1 md:col-span-4">
                    <label className="block font-bold text-slate-800 mb-0.5 text-[11px]">
                      Referência / Aplicação / Compatibilidade de Modelos
                    </label>
                    <textarea
                      rows={2}
                      value={partData.application}
                      onChange={(e) => setPartData({ ...partData, application: e.target.value })}
                      placeholder="Descreva aqui todos os modelos, versões e aplicações compatíveis com esta peça (Ex: Compatível com lavadoras Brastemp / Consul 10kg, 12kg e 15kg modelos BWW, CWL, BWS...)..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-800 font-medium focus:outline-none focus:border-sky-600 text-xs resize-none"
                    />
                  </div>
                </div>
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
