import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import ClientLayout from './layouts/ClientLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthGuard from './components/AuthGuard';

// Public pages
import Landing from './pages/public/Landing';
import HowItWorks from './pages/public/HowItWorks';
import Apply from './pages/public/Apply';
import ApplyOnline from './pages/public/ApplyOnline';
import ApplyDownload from './pages/public/ApplyDownload';
import ApplyReceived from './pages/public/ApplyReceived';
import Contact from './pages/public/Contact';
import Privacy from './pages/public/Privacy';
import Terms from './pages/public/Terms';
import Disclosures from './pages/public/Disclosures';
import Login from './pages/public/Login';

// Client portal pages
import Dashboard from './pages/client/Dashboard';
import Portfolio from './pages/client/Portfolio';
import Activity from './pages/client/Activity';
import Documents from './pages/client/Documents';
import ClientSupport from './pages/client/Support';
import Settings from './pages/client/Settings';

// Admin pages
import Applications from './pages/admin/Applications';
import Clients from './pages/admin/Clients';
import Managers from './pages/admin/Managers';
import PortfolioSync from './pages/admin/PortfolioSync';
import AdminDocuments from './pages/admin/AdminDocuments';
import Audit from './pages/admin/Audit';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
