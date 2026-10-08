import { Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from './modules/public/LandingPage';
import { FeaturePage } from './modules/public/FeaturePage';
import { PricingPage } from './modules/public/PricingPage';
import { PublicIntakePage } from './modules/public/PublicIntakePage';
import { TenantPublicSite } from './modules/public/TenantPublicSite';
import { PublicBookingPage } from './modules/public/PublicBookingPage';
import { PlatformDashboard } from './modules/platform/PlatformDashboard';
import { TenantShell } from './modules/tenant/TenantShell';
import { TenantDashboard } from './modules/tenant/TenantDashboard';
import { AgendaPage } from './modules/scheduling/AgendaPage';
import { ResourcesPage } from './modules/scheduling/ResourcesPage';
import { RecallCenterPage } from './modules/recalls/RecallCenterPage';
import { PatientsPage } from './modules/patients/PatientsPage';
import { PatientClinicalPage } from './modules/clinical/PatientClinicalPage';
import { ClinicalPhotosPage } from './modules/clinical-media/ClinicalPhotosPage';
import { LoginPage } from './modules/auth/LoginPage';
import { AuthRequired, PlatformOwnerRequired } from './modules/auth/AuthRoutes';
import { TenantAccessGate, TenantAccessProvider, TenantPermissionGate } from './modules/tenant/TenantContext';
import { CatalogsPage } from './modules/tenant/CatalogsPage';

export function App() {
  return (
    <>
      <a className="skip-link" href="#app-content">Pular para o conteúdo principal</a>
      <div id="app-content" tabIndex={-1}>
        <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/precos" element={<PricingPage />} />
      <Route path="/recursos/:feature" element={<FeaturePage />} />
      <Route path="/:tenantSlug" element={<TenantPublicSite />} />
      <Route path="/:tenantSlug/agendar" element={<PublicBookingPage />} />
      <Route path="/:tenantSlug/cadastro" element={<PublicIntakePage />} />
      <Route element={<AuthRequired />}>
        <Route element={<PlatformOwnerRequired />}>
          <Route path="/platform" element={<PlatformDashboard />} />
        </Route>
        <Route path="/:tenantSlug/app" element={<TenantAccessProvider><TenantAccessGate /></TenantAccessProvider>}>
          <Route element={<TenantShell />}>
            <Route index element={<TenantDashboard />} />
            <Route element={<TenantPermissionGate permission="appointments.read" />}><Route path="agenda" element={<AgendaPage />} /></Route>
            <Route element={<TenantPermissionGate permission="resources.read" />}><Route path="recursos" element={<ResourcesPage />} /></Route>
            <Route element={<TenantPermissionGate anyOf={['professionals.read','procedures.read']} />}><Route path="cadastros" element={<CatalogsPage />} /></Route>
            <Route element={<TenantPermissionGate permission="recalls.read" />}><Route path="retornos" element={<RecallCenterPage />} /></Route>
            <Route element={<TenantPermissionGate permission="patients.read" />}><Route path="pacientes" element={<PatientsPage />} /></Route>
            <Route element={<TenantPermissionGate permission="clinical.read" />}><Route path="pacientes/:patientId/clinico" element={<PatientClinicalPage />} /></Route>
            <Route element={<TenantPermissionGate permission="clinical.read" />}><Route path="pacientes/:patientId/fotos" element={<ClinicalPhotosPage />} /></Route>
          </Route>
        </Route>
      </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
