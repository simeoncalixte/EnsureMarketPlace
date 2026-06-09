import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import styled from 'styled-components';
import MarketplacePage from './Pages/Marketplace/Marketplace';
import ClaimsDashboard from './Pages/Claims/ClaimsDashboard';
import InvestorsPage from './Pages/Investors/Investors';
import AdminPage from './Pages/Admin/AdminPage';
import IncomingSubmissionsPage from './Pages/Underwriting/IncomingSubmissionsPage';
import InsurerDashboard from './Pages/InsurerDashboard/InsurerDashboard';
import AnalyticsDashboard from './Pages/InsurerDashboard/AnalyticsDashboard';
import ActiveCoverage from './Pages/InsurerDashboard/ActiveCoverage';
import LineOfBusinessPage, { LineOfBusinessActiveTemplatePage } from './Pages/InsurerDashboard/LineOfBusinessPage';
import Reports from './Pages/InsurerDashboard/Reports';
import Settings from './Pages/InsurerDashboard/Settings';
import AppetiteSettings from './Pages/InsurerDashboard/AppetiteSettings';
import PipelineIngestion from './Pages/InsurerDashboard/PipelineIngestion';
import PipelineProcesses from './Pages/InsurerDashboard/PipelineProcesses';
import RabbitMQConfig from './Pages/InsurerDashboard/RabbitMQConfig';
import QueueConfig from './Pages/InsurerDashboard/QueueConfig';
import EmailIngestConfig from './Pages/InsurerDashboard/EmailIngestConfig';
import CloudStorageConfig from './Pages/InsurerDashboard/CloudStorageConfig';
import SFTPConfig from './Pages/InsurerDashboard/SFTPConfig';
import WebhookConfig from './Pages/InsurerDashboard/WebhookConfig';
import ChoiceControlsPage from './Pages/InsurerDashboard/ChoiceControlsPage';
import LandingPage from './Pages/LandingPage/LandingPage';
import KYCVerification from './Pages/Registration/KYCVerification';
import OrganizationStructure from './Pages/Registration/OrganizationStructure';
import AccountAccess from './Pages/Registration/AccountAccess';
import CapitalProfile from './Pages/Registration/CapitalProfile';
import SubscriptionPlan from './Pages/Registration/SubscriptionPlan';
import RoleSelection from './Pages/Registration/RoleSelection';
import SideBarNav from './xds/components/SideBarNav';
import TopBarNav from './xds/components/TopBarNav';
import type { NavItem } from './xds/components/Navigation';
import { saveAuthToken } from './lib/auth';
import { useAuthMe, type AuthUser } from './lib/useAuthMe';
import { useSessionNavigation } from './lib/useSessionNavigation';
import { colors, withAlpha } from './xds/colors';

const ShellRoot = styled.div`
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, ${withAlpha(colors.primary, 0.14)}, transparent 32%),
    linear-gradient(180deg, ${colors.background} 0%, ${colors.surfaceDeep} 46%, ${colors.background} 100%);
  color: ${colors.onSurfaceStrong};
`;

const ShellChrome = styled.div<{ $sidebarOpen: boolean }>`
  min-height: 100vh;
  min-width: 0;
  transition: margin-left 220ms ease;
`;

const ShellMain = styled.main`
  min-height: calc(100vh - 4rem);
  position: relative;
  padding: 1.25rem 1rem 2rem;

  @media (min-width: 640px) {
    padding: 1.5rem 1.5rem 2.5rem;
  }

  @media (min-width: 1024px) {
    padding: 1.5rem 2rem 2.5rem;
  }
`;

const AuthShellGrid = styled.main`
  min-height: calc(100vh - 4rem);
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 1024px) {
    grid-template-columns: 18rem minmax(0, 1fr);
  }
`;

const DesktopSidebarSlot = styled.div`
  display: none;

  @media (min-width: 1024px) {
    /* Panel background fills the full column height so the sidebar visually stretches all the way
       down to the bottom ticker, even when the page content is shorter than the viewport. */
    display: block;
    background: ${colors.surfacePanel};
    border-right: 1px solid ${withAlpha(colors.primarySoft, 0.1)};
  }
`;

const MobileSidebarSlot = styled.div`
  @media (min-width: 1024px) {
    display: none;
  }
`;

const AuthShellContent = styled.section`
  min-width: 0;
  min-height: calc(100vh - 4rem);
  position: relative;
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
  background: ${withAlpha(colors.scrim, 0.56)};
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  visibility: ${({ $isVisible }) => ($isVisible ? 'visible' : 'hidden')};
  pointer-events: ${({ $isVisible }) => ($isVisible ? 'auto' : 'none')};
  transition: opacity 200ms ease;

  @media (min-width: 1024px) {
    display: none;
  }
`;

const SignInPageRoot = styled.div`
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1.5rem;
  background:
    radial-gradient(circle at 0 0, ${withAlpha(colors.primary, 0.16)}, transparent 30%),
    radial-gradient(circle at 100% 70%, ${withAlpha(colors.accent, 0.08)}, transparent 34%),
    linear-gradient(180deg, ${colors.surfaceDeep} 0%, ${colors.background} 100%);
  color: ${colors.onSurfaceStrong};
`;

const SignInGrid = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.24;
  background-size: 40px 40px;
  background-image: radial-gradient(circle, ${colors.border} 1px, transparent 1px);
`;

const SignInGlow = styled.div`
  position: absolute;
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
`;

const SignInGlowPrimary = styled(SignInGlow)`
  top: -10%;
  left: -10%;
  width: 40%;
  height: 40%;
  background: ${withAlpha(colors.primary, 0.12)};
`;

const SignInGlowSecondary = styled(SignInGlow)`
  top: 60%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: ${withAlpha(colors.accent, 0.08)};
`;

const SignInLayout = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
`;

const SignInBrand = styled.div`
  margin-bottom: 3rem;
  text-align: center;
`;

const SignInBrandMark = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1.5rem;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.15)};
  border-radius: 0.5rem;
  background: ${colors.surfaceRaised};
  color: ${colors.primary};
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const SignInBrandTitle = styled.h1`
  margin: 0 0 0.5rem;
  color: ${colors.onSurfaceStrong};
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1.02;
`;

const SignInBrandTag = styled.p`
  margin: 0;
  color: ${colors.onSurfaceMuted};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const SignInCard = styled.section`
  overflow: hidden;
  border: 1px solid ${withAlpha(colors.primarySoft, 0.15)};
  border-radius: 0.75rem;
  background: ${withAlpha(colors.surfaceRaised, 0.9)};
  box-shadow: 0 40px 80px -15px ${withAlpha(colors.background, 0.8)};
  backdrop-filter: blur(16px);
`;

const SignInCardBody = styled.div`
  padding: 2rem;
`;

const SignInCardHeader = styled.div`
  margin-bottom: 2rem;
`;

const SignInCardTitle = styled.h2`
  margin: 0;
  color: ${colors.onSurfaceStrong};
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
`;

const SignInCardDescription = styled.p`
  margin: 0.5rem 0 0;
  color: ${colors.onSurfaceVariant};
  font-size: 0.875rem;
  line-height: 1.6;
`;

const SignInForm = styled.form`
  display: grid;
  gap: 1.5rem;
`;

const FieldGroup = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const FieldLabel = styled.label`
  color: ${colors.outline};
  font-family: monospace;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`;

const FieldHeader = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
`;

const ForgotKeyLink = styled(Link)`
  color: ${colors.primary};
  font-family: monospace;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: ${colors.primarySoft};
    text-decoration: underline;
  }
`;

const FieldShell = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const FieldInput = styled.input`
  width: 100%;
  border: 0;
  border-bottom: 2px solid ${withAlpha(colors.outline, 0.32)};
  background: transparent;
  padding: 0.75rem 2.25rem 0.75rem 0;
  color: ${colors.onSurfaceStrong};
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  outline: none;
  transition: border-color 180ms ease;

  &::placeholder {
    color: ${colors.outline};
  }

  &:focus {
    border-bottom-color: ${colors.primary};
  }
`;

const FieldIcon = styled.span`
  position: absolute;
  right: 0.5rem;
  top: 0.9rem;
  color: ${colors.outline};
  font-size: 0.875rem;
  line-height: 1;
  transition: color 180ms ease;

  ${FieldShell}:focus-within & {
    color: ${colors.primary};
  }
`;

const TwoFactorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
`;

const TwoFactorMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const TwoFactorIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.25rem;
  background: ${colors.surfaceHigh};
  color: ${colors.accent};
  font-size: 0.85rem;
  font-weight: 900;
  line-height: 1;
`;

const TwoFactorCopy = styled.div`
  display: grid;
  gap: 0.1rem;
`;

const TwoFactorTitle = styled.p`
  margin: 0;
  color: ${colors.onSurfaceStrong};
  font-size: 0.875rem;
  font-weight: 600;
`;

const TwoFactorSubtitle = styled.p`
  margin: 0;
  color: ${colors.onSurfaceMuted};
  font-family: monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const ToggleLabel = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
`;

const ToggleInput = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`;

const ToggleTrack = styled.div`
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 999px;
  background: ${colors.surfaceElevated};
  transition: background-color 180ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 999px;
    background: ${colors.onSurfaceMuted};
    transition: transform 180ms ease, background-color 180ms ease;
  }

  ${ToggleInput}:checked + & {
    background: ${colors.accentStrong};
  }

  ${ToggleInput}:checked + &::after {
    transform: translateX(1.25rem);
    background: ${colors.onSurfaceStrong};
  }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  border: 0;
  background: ${colors.primary};
  color: ${colors.onPrimary};
  padding: 1rem 1.25rem;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  transition: transform 140ms ease, filter 140ms ease;

  &:hover {
    filter: brightness(1.08);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const SubmitIcon = styled.span`
  font-size: 0.9rem;
  line-height: 1;
  transition: transform 140ms ease;

  ${SubmitButton}:hover & {
    transform: translateX(0.15rem);
  }
`;

const SignInCardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid ${withAlpha(colors.primarySoft, 0.15)};
  background: ${colors.surfaceElevated};
  padding: 0.75rem 2rem;
`;

const FooterStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FooterPulse = styled.span`
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 999px;
  background: ${colors.accent};
  box-shadow: 0 0 0 0 ${withAlpha(colors.accent, 0.55)};
  animation: pulse 1.8s infinite;

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 ${withAlpha(colors.accent, 0.45)};
    }

    70% {
      box-shadow: 0 0 0 10px ${withAlpha(colors.accent, 0)};
    }

    100% {
      box-shadow: 0 0 0 0 ${withAlpha(colors.accent, 0)};
    }
  }
`;

const FooterStatusText = styled.span`
  color: ${colors.outline};
  font-family: monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const FooterStat = styled.span`
  color: ${colors.outline};
  font-family: monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const SignInSecondary = styled.p`
  margin: 1.5rem 0 0;
  text-align: center;
  color: ${colors.onSurfaceMuted};
  font-size: 0.875rem;
`;

const SignInSecondaryLink = styled(Link)`
  color: ${colors.primary};
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const SignInBackgroundFooter = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid ${withAlpha(colors.border, 0.15)};
  background: ${colors.surfacePanel};
  padding: 0.4rem 1rem;
  color: ${colors.neutral[500]};
  font-family: monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

const SignInFooterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const SignInFooterLink = styled.a`
  color: inherit;
  text-decoration: none;

  &:hover {
    color: ${colors.neutral[300]};
  }
`;

const SignInBackground = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.1;
`;

const SignInBackgroundImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
`;

const HiddenLogoutState = styled.div`
  display: none;
`;

type AppChromeState = {
  isAuthenticated: boolean;
  user: AuthUser | null;
};

type AuthenticatedAppShellProps = {
  children?: React.ReactNode;
};

type PublicAppShellProps = {
  children?: React.ReactNode;
};

const AppChromeContext = createContext<AppChromeState>({ isAuthenticated: false, user: null });

// The sidebar is no longer defined here. The backend returns the role-scoped
// menu for the current session (`GET /api/navigation`, via useSessionNavigation),
// so the links a user sees — and can click — are governed server-side rather
// than by a hardcoded client list.

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

  if (loading) {
    return null;
  }

  if (!user) {
    return (
      <PublicAppShell>
        <LandingPage />
      </PublicAppShell>
    );
  }

  return <Navigate to="/marketplace" replace />;
}

function PublicAppShell({ children }: PublicAppShellProps = {}) {
  return (
    <ShellRoot>
      <TopBarNav user={null} />
      <ShellMain>
        {children ?? <Outlet />}
      </ShellMain>
    </ShellRoot>
  );
}

function PublicRoute({ children }: PublicAppShellProps = {}) {
  const { user, loading } = useAuthMe();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/marketplace" replace />;
  }

  return <PublicAppShell>{children}</PublicAppShell>;
}

function SignInRoute() {
  const { user, loading } = useAuthMe();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/marketplace" replace />;
  }

  return <AuthPromptPage />;
}

function AuthPromptPage() {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <SignInPageRoot>
      <SignInGrid />
      <SignInGlowPrimary />
      <SignInGlowSecondary />

      <SignInLayout>
        <SignInBrand>
          <SignInBrandMark>token</SignInBrandMark>
          <SignInBrandTitle>Synthetix Ledger</SignInBrandTitle>
          <SignInBrandTag>Programmable Reinsurance Terminal</SignInBrandTag>
        </SignInBrand>

        <SignInCard>
          <SignInCardBody>
            <SignInCardHeader>
              <SignInCardTitle>Secure Access</SignInCardTitle>
              <SignInCardDescription>Enter institutional credentials to manage tranches.</SignInCardDescription>
            </SignInCardHeader>

            <SignInForm onSubmit={handleSubmit}>
              <FieldGroup>
                <FieldLabel htmlFor="account-identity">Account Identity</FieldLabel>
                <FieldShell>
                  <FieldInput id="account-identity" name="accountIdentity" type="email" placeholder="institutional@email.com" />
                  <FieldIcon aria-hidden="true">@</FieldIcon>
                </FieldShell>
              </FieldGroup>

              <FieldGroup>
                <FieldHeader>
                  <FieldLabel htmlFor="access-key">Access Key</FieldLabel>
                  <ForgotKeyLink to="/auth/register">FORGOT KEY?</ForgotKeyLink>
                </FieldHeader>
                <FieldShell>
                  <FieldInput id="access-key" name="accessKey" type="password" placeholder="••••••••••••" />
                  <FieldIcon aria-hidden="true">*</FieldIcon>
                </FieldShell>
              </FieldGroup>

              <TwoFactorRow>
                <TwoFactorMeta>
                  <TwoFactorIcon aria-hidden="true">✓</TwoFactorIcon>
                  <TwoFactorCopy>
                    <TwoFactorTitle>2FA Verification</TwoFactorTitle>
                    <TwoFactorSubtitle>Biometric or Hardware Key</TwoFactorSubtitle>
                  </TwoFactorCopy>
                </TwoFactorMeta>

                <ToggleLabel aria-label="Enable two factor verification">
                  <ToggleInput defaultChecked type="checkbox" />
                  <ToggleTrack />
                </ToggleLabel>
              </TwoFactorRow>

              <SubmitButton type="submit">
                Initialize Session
                <SubmitIcon aria-hidden="true">→</SubmitIcon>
              </SubmitButton>
            </SignInForm>
          </SignInCardBody>

          <SignInCardFooter>
            <FooterStatus>
              <FooterPulse />
              <FooterStatusText>Network Protocol: V4.2L</FooterStatusText>
            </FooterStatus>
            <FooterStat>Uptime: 99.998%</FooterStat>
          </SignInCardFooter>
        </SignInCard>

        <SignInSecondary>
          New Organization? <SignInSecondaryLink to="/auth/register">Request Onboarding</SignInSecondaryLink>
        </SignInSecondary>
      </SignInLayout>

      <SignInBackground aria-hidden="true">
        <SignInBackgroundImage alt="" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuktzwJphLvW8OAEbhGHnPBR0QqIbUnuz_QYwKcMVXH46zZ369w3px1jgW6bMyO0KrnTchzn4MmFWbocGUHP6VNEjgGvoTZQqgIud0T4QdhujkLQiba-TxH8zxdBVDGWeB85i-Z3E5B2nUHBU5YNy4595Sr282yn65zEeo5T6RC6w8oNZNDEH1yZtoz9xdqjxV4on8vWy1lQTsA-IOAMT1f6T_WBF7hq81x-0nZPjJkWEeboFCfM_PMimudUO_GZ7xIIrfRgFRoDpx" />
      </SignInBackground>

      <HiddenLogoutState aria-hidden="true">
        <h2>Securely Disconnected</h2>
      </HiddenLogoutState>

      <SignInBackgroundFooter>
        <SignInFooterGroup>
          <span>Hurricane Milton: Cat 4 approaching Florida...</span>
          <span>Global TVL: $4.2B</span>
          <span>Active Tranches: 142</span>
        </SignInFooterGroup>
        <SignInFooterGroup>
          <SignInFooterLink href="#">Network Status</SignInFooterLink>
          <SignInFooterLink href="#">Risk Feed</SignInFooterLink>
        </SignInFooterGroup>
      </SignInBackgroundFooter>
    </SignInPageRoot>
  );
}

function RequireBackendAuth() {
  const location = useLocation();
  const { user, loading } = useAuthMe();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return (
    <AppChromeContext.Provider value={{ isAuthenticated: true, user }}>
      <Outlet />
    </AppChromeContext.Provider>
  );
}

function AuthenticatedAppShell({ children }: AuthenticatedAppShellProps = {}) {
  const { user } = useAppChrome();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true));

  const path = location.pathname;
  const { items: sessionNavItems } = useSessionNavigation(user?.role ?? null);
  const navigationItems = useMemo(() => markActiveNavItems(sessionNavItems, path), [sessionNavItems, path]);
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

  const handleLogout = () => {
    saveAuthToken(null);
    navigate('/', { replace: true });
  };

  return (
    <ShellRoot>
      <SidebarBackdrop
        type="button"
        aria-label="Close navigation menu"
        onClick={() => setIsSidebarOpen(false)}
        $isVisible={isSidebarOpen}
      />
      <TopBarNav isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((current) => !current)} user={user} />
      <ShellChrome $sidebarOpen={isSidebarOpen}>
        <MobileSidebarSlot>
          <SideBarNav
            items={navigationItems}
            title="Ensured Marketplace"
            subtitle={subtitle}
            isOpen={isSidebarOpen}
            layoutMode="overlay"
            onRequestClose={() => setIsSidebarOpen(false)}
            onLogout={handleLogout}
          />
        </MobileSidebarSlot>

        <AuthShellGrid>
          <DesktopSidebarSlot>
            <SideBarNav
              items={navigationItems}
              title="Ensured Marketplace"
              subtitle={subtitle}
              isOpen={true}
              layoutMode="grid"
              onLogout={handleLogout}
            />
          </DesktopSidebarSlot>

          <AuthShellContent>
            {children ?? <Outlet />}
          </AuthShellContent>
        </AuthShellGrid>
      </ShellChrome>
    </ShellRoot>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />}/>
      <Route path="/auth/login" element={<SignInRoute />} />
      <Route path="/auth/register" element={<PublicRoute><RoleSelection /></PublicRoute>} />
      <Route path="/auth/register/kyc" element={<PublicRoute><KYCVerification /></PublicRoute>} />
      <Route path="/auth/register/organization-structure" element={<PublicRoute><OrganizationStructure /></PublicRoute>} />
      <Route path="/auth/register/account-access" element={<PublicRoute><AccountAccess /></PublicRoute>} />
      <Route path="/auth/register/capital-profile" element={<PublicRoute><CapitalProfile /></PublicRoute>} />
      <Route path="/auth/register/subscription" element={<PublicRoute><SubscriptionPlan /></PublicRoute>} />
      <Route element={<RequireBackendAuth />}>
        <Route element={<AuthenticatedAppShell />}>
          <Route path="/claims/*" element={<ClaimsDashboard />} />
          <Route path="/investors/*" element={<InvestorsPage />} />
          <Route path="/underwriting/submissions" element={<IncomingSubmissionsPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/line-of-business" element={<LineOfBusinessPage />}>
            <Route path="active-template" element={<LineOfBusinessActiveTemplatePage />} />
          </Route>
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
              <Route path="line-of-business" element={<LineOfBusinessPage />}>
                <Route path="active-template" element={<LineOfBusinessActiveTemplatePage />} />
              </Route>
              <Route path="choice-controls" element={<ChoiceControlsPage />} />
              <Route path="simulate" element={<InsurerDashboard />} />
              <Route path="pricing" element={<InsurerDashboard />} />
            </Route>
            <Route path="coverage-active" element={<ActiveCoverage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="pipeline-ingestion" element={<PipelineIngestion />} />
            <Route path="pipeline-processes" element={<PipelineProcesses />} />
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
            <Route path="appetite" element={<AppetiteSettings />} />
            <Route path="claims" element={<ClaimsDashboard />} />
            <Route path="*" element={<Navigate to="/insurer" replace />} />
          </Route>
          <Route path="*" element={<Navigate to="/marketplace" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
