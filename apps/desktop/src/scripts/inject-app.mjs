import fs from 'fs';

const filePath = 'd:/GestaoOS-producao/apps/desktop/src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Adicionar Imports
const importTarget = "import { SerialLicenseModal } from './components/SerialLicenseModal';";
const newImports = `import { SerialLicenseModal } from './components/SerialLicenseModal';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { LicenseExpiredModal } from './components/LicenseExpiredModal';
import { getSavedTenantInfo, checkLicenseValidity, LicenseTenantData } from './services/licenseService';`;

if (!content.includes('OnboardingWizardModal')) {
  content = content.replace(importTarget, newImports);
}

// 2. Adicionar Estados de Onboarding e Validade da Licença
const stateTarget = "const [isSerialLicenseModalOpen, setIsSerialLicenseModalOpen] = useState<boolean>(false);";
const newStates = `const [isSerialLicenseModalOpen, setIsSerialLicenseModalOpen] = useState<boolean>(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem('system_onboarding_completed');
  });
  const [tenantLicenseInfo, setTenantLicenseInfo] = useState<LicenseTenantData | null>(() => {
    return getSavedTenantInfo();
  });
  const [licenseValidityState, setLicenseValidityState] = useState(() => {
    return checkLicenseValidity(getSavedTenantInfo());
  });`;

if (!content.includes('isOnboardingModalOpen')) {
  content = content.replace(stateTarget, newStates);
}

// 3. Adicionar Verificação de Licença no useEffect de sincronização
const syncTarget = "import('./services/licenseService').then(async ({ getMasterFirestore, getSavedTenantFirebaseConfig, MASTER_CATALOG_FIREBASE_CONFIG }) => {";
const newSyncCheck = `// Reavalia status da licença e validade temporal
      const currentTenant = getSavedTenantInfo();
      setTenantLicenseInfo(currentTenant);
      setLicenseValidityState(checkLicenseValidity(currentTenant));

      import('./services/licenseService').then(async ({ getMasterFirestore, getSavedTenantFirebaseConfig, MASTER_CATALOG_FIREBASE_CONFIG }) => {`;

if (!content.includes('setLicenseValidityState(checkLicenseValidity(currentTenant));')) {
  content = content.replace(syncTarget, newSyncCheck);
}

// 4. Inserir os Modais OnboardingWizardModal e LicenseExpiredModal antes de fechar o App
const jsxTarget = `{/* Modal de Gestão de Chave Serial & Conexão em Nuvem */}
      <SerialLicenseModal
        isOpen={isSerialLicenseModalOpen}
        onClose={() => setIsSerialLicenseModalOpen(false)}
        onLicenseChanged={() => {
          loadData();
        }}
        currentUser={currentUser}
      />`;

const newModals = `{/* Modal de Gestão de Chave Serial & Conexão em Nuvem */}
      <SerialLicenseModal
        isOpen={isSerialLicenseModalOpen}
        onClose={() => setIsSerialLicenseModalOpen(false)}
        onLicenseChanged={() => {
          const updatedTenant = getSavedTenantInfo();
          setTenantLicenseInfo(updatedTenant);
          setLicenseValidityState(checkLicenseValidity(updatedTenant));
          loadData();
        }}
        currentUser={currentUser}
      />

      {/* Assistente de Primeiro Acesso (Onboarding Wizard) */}
      <OnboardingWizardModal
        isOpen={isOnboardingModalOpen}
        onFinish={() => {
          setIsOnboardingModalOpen(false);
          const updatedTenant = getSavedTenantInfo();
          setTenantLicenseInfo(updatedTenant);
          setLicenseValidityState(checkLicenseValidity(updatedTenant));
          loadData();
        }}
      />

      {/* Modal de Bloqueio por Expiração / Suspensão de Licença */}
      <LicenseExpiredModal
        isOpen={!licenseValidityState.isValid && (licenseValidityState.isExpired || licenseValidityState.isBlocked)}
        licenseInfo={tenantLicenseInfo}
        message={licenseValidityState.message}
        isTrial={licenseValidityState.isTrial}
        onRenewSuccess={() => {
          const updatedTenant = getSavedTenantInfo();
          setTenantLicenseInfo(updatedTenant);
          setLicenseValidityState(checkLicenseValidity(updatedTenant));
          loadData();
        }}
      />`;

if (!content.includes('OnboardingWizardModal')) {
  content = content.replace(jsxTarget, newModals);
} else if (!content.includes('LicenseExpiredModal')) {
  content = content.replace(jsxTarget, newModals);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ App.tsx modificado com sucesso!');
