import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router';
import styled from 'styled-components';
import AllocateCapitalPage from './Pages/Marketplace/AllocateCapitalPage';
import MarketplacePage from './Pages/Marketplace/Marketplace';
import ClaimsDashboard from './Pages/Claims/ClaimsDashboard';
import InvestorsPage from './Pages/Investors/Investors';
import AdminPage from './Pages/Admin/AdminPage';
import IncomingSubmissionsPage from './Pages/Underwriting/IncomingSubmissionsPage';
import InsurerDashboard from './Pages/InsurerDashboard/InsurerDashboard';
import AnalyticsDashboard from './Pages/InsurerDashboard/AnalyticsDashboard';
import ActiveCoverage from './Pages/InsurerDashboard/ActiveCoverage';
import Reports from './Pages/InsurerDashboard/Reports';
import Settings from './Pages/InsurerDashboard/Settings';
import PipelineIngestion from './Pages/InsurerDashboard/PipelineIngestion';
import RabbitMQConfig from './Pages/InsurerDashboard/RabbitMQConfig';
import QueueConfig from './Pages/InsurerDashboard/QueueConfig';
import EmailIngestConfig from './Pages/InsurerDashboard/EmailIngestConfig';
import CloudStorageConfig from './Pages/InsurerDashboard/CloudStorageConfig';
import SFTPConfig from './Pages/InsurerDashboard/SFTPConfig';
import WebhookConfig from './Pages/InsurerDashboard/WebhookConfig';
import LandingPage from './Pages/LandingPage/LandingPage';
import SideBarNav from './xds/components/SideBarNav';
import TopBarNav from './xds/components/TopBarNav';
import type { NavItem } from './xds/components/Navigation';
import { useAuthMe, type AuthUser } from './lib/useAuthMe';

const ShellRoot = styled.div`
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, rgba(75, 142, 255, 0.14), transparent 32%),
    linear-gradient(180deg, #071129 0%, #0b1326 46%, #091022 100%);
  color: #dae2fd;
`;

const ShellChrome = styled.div<{ $sidebarOpen: boolean }>`
  min-height: 100vh;
  min-width: 0;
  transition: margin-left 220ms ease;

  @media (min-width: 1024px) {
    margin-left: ${({ $sidebarOpen }) => ($sidebarOpen ? '18rem' : '0')};
  }
`;

const ShellMain = styled.main`
  min-height: calc(100vh - 4rem);
  padding: 1.25rem 1rem 2rem;

  @media (min-width: 640px) {
    padding: 1.5rem 1.5rem 2.5rem;
  }

  @media (min-width: 1024px) {
    padding: 1.5rem 2rem 2.5rem;
  }
`;

const SidebarBackdrop = styled.button<{ $isVisible: boolean }>`
  position: fixed;
  inset: 4rem 0 0;
  z-index: 30;
  border: 0;
  padding: 0;
  background: rgba(2, 8, 23, 0.56);
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  visibility: ${({ $isVisible }) => ($isVisible ? 'visible' : 'hidden')};
  pointer-events: ${({ $isVisible }) => ($isVisible ? 'auto' : 'none')};
  transition: opacity 200ms ease;

  @media (min-width: 1024px) {
    display: none;
  }
`;

type AppChromeState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
};

type AuthenticatedAppShellProps = {
  children?: React.ReactNode;
};

const AppChromeContext = createContext<AppChromeState>({ isAuthenticated: false, user: null });

const baseNavigationItems: NavItem[] = [
  { id: '/', label: 'Home', icon: 'H' },
  { id: '/investors', label: 'Investors', icon: 'INV' },
  { id: '/claims', label: 'Claims', icon: 'CLM' },
  { id: '/underwriting/submissions', label: 'Incoming Submissions', icon: 'SUB' },
  { id: '/marketplace', label: 'Marketplace', icon: 'MKT' },
  { id: '/admin', label: 'Admin', icon: 'ADM' },
  {
    id: '/insurer',
    label: 'Insurer',
    icon: 'INS',
    subItems: [
      { id: '/insurer', label: 'Dashboard', icon: 'DB' },
      { id: '/insurer/coverage/create', label: 'Create Coverage', icon: 'CR' },
      { id: '/insurer/coverage-active', label: 'Active Coverage', icon: 'AC' },
      { id: '/insurer/pipeline-ingestion', label: 'Pipeline Ingestion', icon: 'PL' },
      { id: '/insurer/reports', label: 'Reports', icon: 'RP' },
      { id: '/insurer/settings', label: 'Settings', icon: 'ST' },
      { id: '/insurer/claims', label: 'Claims', icon: 'CL' }
    ]
  }
];

function normalizePath(pathname: string): string {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/g, '');
}

function pathMatches(pathname: string, target: string): boolean {
  const current = normalizePath(pathname);
  const normalizedTarget = normalizePath(target);

  if (normalizedTarget === '/') {
    return current === '/';
  }

  return current === normalizedTarget || current.startsWith(`${normalizedTarget}/`);
}

function markActiveNavItems(items: NavItem[], pathname: string): NavItem[] {
  return items.map((item) => {
    const subItems = item.subItems ? markActiveNavItems(item.subItems, pathname) : undefined;
    const childIsActive = Boolean(subItems?.some((subItem) => subItem.active));
    const active = pathMatches(pathname, item.id) || childIsActive;

    return {
      ...item,
      active,
      subItems,
    };
  });
}

function useAppChrome() {
  return useContext(AppChromeContext);
}

function HomeRoute() {
  const { user, loading } = useAuthMe();
  console.log('HomeRoute render', { user, loading });

  if (loading) {
    return null;
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <AppChromeContext.Provider value={{ isAuthenticated: true, user }}>
      <AuthenticatedAppShell>
        <AllocateCapitalPage />
      </AuthenticatedAppShell>
    </AppChromeContext.Provider>
  );
}

function RequireBackendAuth() {
  const location = useLocation();
  const { user, loading } = useAuthMe();

  if (loading) {
    return null;
  }

  if (!user) {
    console.log('RequireBackendAuth redirecting to / from', location.pathname);
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  console.log('RequireBackendAuth authenticated user', user);
  return (
    <AppChromeContext.Provider value={{ isAuthenticated: true, user }}>
      <Outlet />
    </AppChromeContext.Provider>
  );
}

function AuthenticatedAppShell({ children }: AuthenticatedAppShellProps = {}) {
  const { user } = useAppChrome();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true));

  const path = location.pathname;
  const navigationItems = useMemo(() => markActiveNavItems(baseNavigationItems, path), [path]);
  const userLabel = user ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Authenticated session' : 'Authenticated session';
  const subtitle = user?.role ? `${user.role} | ${userLabel}` : userLabel;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ShellRoot>
      <SidebarBackdrop
        type="button"
        aria-label="Close navigation menu"
        onClick={() => setIsSidebarOpen(false)}
        $isVisible={isSidebarOpen}
      />
    <TopBarNav isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((current) => !current)} />
      <SideBarNav
        items={navigationItems}
        title="Ensured Marketplace"
        subtitle={subtitle}
        isOpen={isSidebarOpen}
        onRequestClose={() => setIsSidebarOpen(false)}
      />
      <ShellChrome $sidebarOpen={isSidebarOpen}>
        <ShellMain>
          {children ?? <Outlet />}
        </ShellMain>
      </ShellChrome>
    </ShellRoot>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />}/>
      <Route element={<RequireBackendAuth />}>
        <Route element={<AuthenticatedAppShell />}>
          <Route path="/claims/*" element={<ClaimsDashboard />} />
          <Route path="/investors/*" element={<InvestorsPage />} />
          <Route path="/underwriting/submissions" element={<IncomingSubmissionsPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/admin/deals/create" element={<InsurerDashboard />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/insurer" element={<Outlet />}>
            <Route index element={<AnalyticsDashboard />} />
            <Route path="dashboard" element={<AnalyticsDashboard />} />
            <Route path="risk" element={<Outlet />}>
              <Route index element={<InsurerDashboard />} />
              <Route path="upload" element={<InsurerDashboard />} />
              <Route path="history" element={<InsurerDashboard />} />
              <Route path="validation" element={<InsurerDashboard />} />
            </Route>
            <Route path="portfolio" element={<AnalyticsDashboard />} />
            <Route path="coverage" element={<Outlet />}>
              <Route index element={<InsurerDashboard />} />
              <Route path="create" element={<InsurerDashboard />} />
              <Route path="simulate" element={<InsurerDashboard />} />
              <Route path="pricing" element={<InsurerDashboard />} />
            </Route>
            <Route path="coverage-active" element={<ActiveCoverage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="pipeline-ingestion" element={<PipelineIngestion />} />
            <Route path="pipeline-ingestion/rabbitmq" element={<RabbitMQConfig />} />
            <Route path="pipeline-ingestion/rabbitmq/:channelId" element={<RabbitMQConfig />} />
            <Route path="pipeline-ingestion/rabbitmq/:channelId/queue/:queueName" element={<QueueConfig />} />
            <Route path="pipeline-ingestion/email-sso" element={<EmailIngestConfig />} />
            <Route path="pipeline-ingestion/email-sso/:channelId" element={<EmailIngestConfig />} />
            <Route path="pipeline-ingestion/cloud-storage" element={<CloudStorageConfig />} />
            <Route path="pipeline-ingestion/cloud-storage/:channelId" element={<CloudStorageConfig />} />
            <Route path="pipeline-ingestion/sftp" element={<SFTPConfig />} />
            <Route path="pipeline-ingestion/sftp/:channelId" element={<SFTPConfig />} />
            <Route path="pipeline-ingestion/webhooks" element={<WebhookConfig />} />
            <Route path="pipeline-ingestion/webhooks/:channelId" element={<WebhookConfig />} />
            <Route path="settings" element={<Settings />} />
            <Route path="claims" element={<ClaimsDashboard />} />
            <Route path="*" element={<Navigate to="/insurer" replace />} />
          </Route>
          <Route path="*" element={<AllocateCapitalPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;