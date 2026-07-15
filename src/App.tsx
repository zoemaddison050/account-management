import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import ClientLayout from './layouts/ClientLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthGuard from './components/AuthGuard';

// Public pages
const Landing = lazy(() => import('./pages/public/Landing'));
const HowItWorks = lazy(() => import('./pages/public/HowItWorks'));
const Apply = lazy(() => import('./pages/public/Apply'));
const ApplyOnline = lazy(() => import('./pages/public/ApplyOnline'));
const ApplyDownload = lazy(() => import('./pages/public/ApplyDownload'));
const ApplyReceived = lazy(() => import('./pages/public/ApplyReceived'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Privacy = lazy(() => import('./pages/public/Privacy'));
const Terms = lazy(() => import('./pages/public/Terms'));
const Disclosures = lazy(() => import('./pages/public/Disclosures'));
const Login = lazy(() => import('./pages/public/Login'));
const InviteAccept = lazy(() => import('./pages/public/InviteAccept'));

// Client portal pages
const Dashboard = lazy(() => import('./pages/client/Dashboard'));
const Portfolio = lazy(() => import('./pages/client/Portfolio'));
const Activity = lazy(() => import('./pages/client/Activity'));
const Documents = lazy(() => import('./pages/client/Documents'));
const ClientSupport = lazy(() => import('./pages/client/Support'));
const Settings = lazy(() => import('./pages/client/Settings'));

// Admin pages
const Applications = lazy(() => import('./pages/admin/Applications'));
const Clients = lazy(() => import('./pages/admin/Clients'));
const Managers = lazy(() => import('./pages/admin/Managers'));
const PortfolioSync = lazy(() => import('./pages/admin/PortfolioSync'));
const AdminDocuments = lazy(() => import('./pages/admin/AdminDocuments'));
const Audit = lazy(() => import('./pages/admin/Audit'));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<div className="text-center text-muted" style={{ padding: 'var(--space-8)' }}>Loading...</div>}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Landing />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/apply" element={<Apply />} />
              <Route path="/apply/online" element={<ApplyOnline />} />
              <Route path="/apply/download" element={<ApplyDownload />} />
              <Route path="/apply/received" element={<ApplyReceived />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/disclosures" element={<Disclosures />} />
            </Route>

            {/* Login (standalone, no public layout) */}
            <Route path="/login" element={<Login />} />
            <Route path="/invite/:token" element={<InviteAccept />} />

            {/* Client portal routes */}
            <Route element={<AuthGuard area="client" />}>
              <Route path="/client" element={<ClientLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="portfolio" element={<Portfolio />} />
                <Route path="activity" element={<Activity />} />
                <Route path="documents" element={<Documents />} />
                <Route path="support" element={<ClientSupport />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            {/* Admin routes */}
            <Route element={<AuthGuard area="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="applications" element={<Applications />} />
                <Route path="clients" element={<Clients />} />
                <Route path="managers" element={<Managers />} />
                <Route path="portfolio-sync" element={<PortfolioSync />} />
                <Route path="documents" element={<AdminDocuments />} />
                <Route path="audit" element={<Audit />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
