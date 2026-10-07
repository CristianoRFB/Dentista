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

export function App() {
  return (
    <>
      <a className="skip-link" href="#app-content">Pular para o conteúdo principal</a>
      <div id="app-content" tabIndex={-1}>
        <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/precos" element={<PricingPage />} />
      <Route path="/recursos/:feature" element={<FeaturePage />} />
      <Route path="/platform" element={<PlatformDashboard />} />
      <Route path="/:tenantSlug" element={<TenantPublicSite />} />
      <Route path="/:tenantSlug/agendar" element={<PublicBookingPage />} />
      <Route path="/:tenantSlug/cadastro" element={<PublicIntakePage />} />
      <Route path="/:tenantSlug/app" element={<TenantShell />}>
        <Route index element={<TenantDashboard />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="recursos" element={<ResourcesPage />} />
        <Route path="retornos" element={<RecallCenterPage />} />
        <Route path="pacientes" element={<PatientsPage />} />
        <Route path="pacientes/:patientId/clinico" element={<PatientClinicalPage />} />
        <Route path="pacientes/:patientId/fotos" element={<ClinicalPhotosPage />} />
      </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}
