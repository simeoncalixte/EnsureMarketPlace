import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  SeedingSection,
  SeedingSectionLabel,
  SeedList,
  SeedItem,
  SeedItemInner,
  SeedItemLeft,
  SeedItemIcon,
  SeedItemTitle,
  SeedItemSub,
  SeedItemActions,
  SeedIconBtn,
} from './AdminPage.styles';

import Input from '../../xds/components/Input';
import NumberInput from '../../xds/components/NumberInput';
import Button from '../../xds/components/Button';
import Badge from '../../xds/components/Badge';
import Select from '../../xds/components/Select';
import Checkbox from '../../xds/components/Checkbox';
import InfoCard from '../../xds/components/InfoCard';
import { colors, withAlpha } from '../../xds/colors';
import { getCrestaCatalog, startCrestaImport, stopCrestaImport } from '../../api/crestaZones';
import { seedRoute, seedPipelineSubmissions, purgeSubmissions } from '../../api/seed';
import { startWorldcitiesImport, getWorldcitiesStatus, stopWorldcitiesImport } from '../../api/seed';

/* ──────────────────────────────────────────────────────────────────────────
 * Page-local types — typing the seed records and status map removes the
 * TS7015 "index expression is not of type number" errors that came from the
 * previous `any[]` arrays being indexed into a Record<number, string>.
 * ────────────────────────────────────────────────────────────────────────── */

interface SeedSource {
  id: number;
  title: string;
  route: string;
  sub: string;
  count?: number;
  dim?: boolean;
}

type StatusKey = number | string;

/**
 * Primary transaction (submission) types the seeder can pin, mirroring the API's
 * `submissionTypeTaxonomy`. 'auto' leaves the type to the pipeline's
 * submissionType stage (the prior behaviour).
 */
const SUBMISSION_TYPE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'auto', label: 'Auto (pipeline decides)' },
  { value: 'new_business', label: 'New Business' },
  { value: 'renewal', label: 'Renewal' },
  { value: 'quote_request', label: 'Quote Request' },
  { value: 'endorsement', label: 'Endorsement' },
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'claim', label: 'Claim / Loss Notice' },
  { value: 'audit', label: 'Premium Audit' },
  { value: 'treaty_reinsurance', label: 'Treaty Reinsurance' },
  { value: 'facultative_reinsurance', label: 'Facultative Reinsurance' },
  { value: 'inquiry', label: 'Inquiry / Other' },
];

/* ──────────────────────────────────────────────────────────────────────────
 * Page-local styled composites (built over xds primitives / tokens).
 * These are NOT design-system primitives, so they live in the page.
 * ────────────────────────────────────────────────────────────────────────── */

const Row = styled.div<{ $mt?: number; $mb?: number }>`
  display: flex;
  gap: 12px;
  align-items: center;
  ${(p) => (p.$mt != null ? `margin-top: ${p.$mt}px;` : '')}
  ${(p) => (p.$mb != null ? `margin-bottom: ${p.$mb}px;` : '')}
`;

const RowWrap = styled(Row)`
  flex-wrap: wrap;
`;

const FieldGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  color: ${colors.neutral[400]};
`;

const StatusSlot = styled.div<{ $minWidth?: number; $ml?: number }>`
  font-size: 12px;
  color: ${colors.onSurfaceMuted};
  min-width: ${(p) => p.$minWidth ?? 140}px;
  ${(p) => (p.$ml != null ? `margin-left: ${p.$ml}px;` : '')}
`;

const MonoInput = styled(Input)<{ $minWidth?: number }>`
  padding: 8px;
  border-radius: 6px;
  border: 1px solid ${withAlpha(colors.border, 0.12)};
  background: ${colors.surfaceDeep};
  font-family: 'JetBrains Mono', monospace;
  ${(p) => (p.$minWidth != null ? `min-width: ${p.$minWidth}px;` : '')}
`;

const MonoNumberInput = styled(NumberInput)`
  width: 84px;
  padding: 8px;
  border-radius: 6px;
  border: 1px solid ${withAlpha(colors.border, 0.12)};
  background: ${colors.surfaceDeep};
  font-family: 'JetBrains Mono', monospace;
`;

const FixedNumberInput = styled(NumberInput)<{ $width?: number }>`
  ${(p) => (p.$width != null ? `width: ${p.$width}px;` : '')}
`;

const PlainInput = styled(Input)<{ $minWidth?: number }>`
  padding: 8px;
  border-radius: 6px;
  ${(p) => (p.$minWidth != null ? `min-width: ${p.$minWidth}px;` : '')}
`;

const CalloutTitle = styled.div`
  color: ${colors.onSurface};
  font-weight: 700;
  font-size: 13px;
`;

const CalloutMeta = styled.div`
  color: ${colors.neutral[400]};
  font-size: 12px;
  margin-top: 2px;
  font-family: 'JetBrains Mono', monospace;
`;

const Grow = styled.div`
  flex: 1;
`;

const SubHeading = styled.h4`
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  color: ${colors.onSurfaceMuted};
  margin: 0 0 8px 0;
`;

const SectionBlock = styled.div`
  margin-top: 28px;
`;

const SeedRoute = styled.div`
  font-size: 12px;
  color: ${colors.neutral[400]};
  margin-top: 6px;
  font-family: 'JetBrains Mono', monospace;
`;

const ResultBox = styled.div`
  margin-top: 12px;
  background: ${colors.background};
  padding: 12px;
  border-radius: 6px;
`;

const ResultLine = styled.div<{ $tone?: 'muted' | 'accent' | 'gain' | 'error' | 'note'; $mt?: number }>`
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  ${(p) => (p.$mt != null ? `margin-top: ${p.$mt}px;` : '')}
  color: ${({ $tone }) =>
    $tone === 'accent'
      ? colors.dataViz.amber
      : $tone === 'gain'
      ? colors.dataViz.mint
      : $tone === 'error'
      ? colors.errorSoft
      : $tone === 'note'
      ? colors.neutral[400]
      : colors.onSurfaceMuted};
`;

const ResultNote = styled.div`
  font-size: 12px;
  color: ${colors.neutral[400]};
  margin-top: 6px;
`;

const SubmissionList = styled.div`
  margin-top: 8px;
`;

const SubmissionRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
`;

const SubmissionDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: ${colors.accent};
`;

const SubmissionId = styled.span`
  color: ${colors.onSurface};
  font-family: 'JetBrains Mono', monospace;
`;

const SubmissionStatus = styled.span`
  color: ${colors.dataViz.mint};
  margin-left: 8px;
`;

const SubmissionType = styled.span`
  color: ${colors.dataViz.cyan};
  margin-left: 8px;
  font-family: 'JetBrains Mono', monospace;
`;

const SubmissionSource = styled.span`
  color: ${colors.neutral[500]};
  margin-left: 8px;
`;

const SubmissionLob = styled.span`
  color: ${colors.dataViz.violet};
  margin-left: 8px;
`;

const SubmissionCx = styled.span`
  color: ${colors.dataViz.amber};
  margin-left: 8px;
`;

const SubmissionFiles = styled.span`
  color: ${colors.neutral[500]};
  margin-left: 8px;
`;

const SubscribedStages = styled.div`
  font-size: 11px;
  color: ${colors.neutral[500]};
  margin-top: 8px;
  font-family: 'JetBrains Mono', monospace;
`;

const CrestaIdle = styled.span`
  color: ${colors.neutral[500]};
`;

const CrestaRunning = styled.span`
  color: ${colors.dataViz.amber};
`;

const CrestaStatRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
`;

const CrestaStat = styled.span`
  color: ${colors.onSurfaceMuted};
  strong {
    color: ${colors.onSurface};
  }
`;

const CrestaZonesStat = styled.span`
  color: ${colors.neutral[400]};
  strong {
    color: ${colors.dataViz.mint};
  }
`;

const CrestaError = styled.span`
  color: ${colors.errorSoft};
`;

const CrestaStateRight = styled.div`
  font-size: 12px;
  min-width: 170px;
  text-align: right;
`;

/**
 * Status pill — renders an ok/error Badge from the free-form status strings the
 * seeding handlers emit (e.g. "ok 200 : seeded", "error 500: ...", "pending").
 */
const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  if (!status) return null;
  const variant = status.startsWith('ok') ? 'success' : 'danger';
  return (
    <Badge variant={variant} dot>
      {status}
    </Badge>
  );
};

export default function SeedingPanel() {
  const [sources, setSources] = useState<SeedSource[]>([
    { id: 1, title: 'NOAA Meteo-Feed', route: '/api/seed/noaa', sub: 'Latency: 0.8s | Connected' },
    { id: 2, title: 'Orbital Imagery Link', route: '/api/seed/orbital', sub: 'Res: 15cm | Active Stream' },
    { id: 3, title: 'Cedent Ingestion Port', route: '/api/seed/cedent', sub: 'Batch #402-A | Syncing' },
    { id: 4, title: 'IoT Ground Sensors', route: '/api/seed/iot', sub: 'Offline | Scheduled Maint', dim: true },
  ]);

  const [form, setForm] = useState({ title: '', route: '', sub: '' });
  const [statuses, setStatuses] = useState<Record<StatusKey, string>>({});

  const [orgSeeds, setOrgSeeds] = useState<SeedSource[]>([
    { id: 101, title: 'Org Seeding', route: '/api/seed/organizations', sub: 'Creates sample organizations', count: 10 },
  ]);
  const [userSeeds, setUserSeeds] = useState<SeedSource[]>([
    { id: 201, title: 'User Seeding', route: '/api/seed/users', sub: 'Creates sample users', count: 25 },
  ]);
  const [orgStructureSeeds, setOrgStructureSeeds] = useState<SeedSource[]>([
    {
      id: 301,
      title: 'Org Structure Seeding',
      route: '/api/seed/org-structure',
      sub: 'Departments + teams, role-assigned members; backfills existing users with org/role/dept/team',
      count: 3,
    },
  ]);

  const [orgStructureForm, setOrgStructureForm] = useState({
    organizationId: '',
    route: '/api/seed/org-structure',
    sub: '',
    count: 3,
  });
  const [capacitySeeds, setCapacitySeeds] = useState<SeedSource[]>([
    {
      id: 401,
      title: 'Capacity Definition Seeding',
      route: '/api/seed/capacity-definitions',
      sub: 'Applies one active capacity definition per org (1:1 with the editor + enforcement appetite) to test pipeline adherence',
    },
  ]);
  const [capacityForm, setCapacityForm] = useState({ organizationId: '', archetype: '' });

  const [orgForm, setOrgForm] = useState({ title: '', route: '/api/seed/organizations', sub: '', count: 10 });
  const [userForm, setUserForm] = useState({ title: '', route: '/api/seed/users', sub: '', count: 25 });
  const [portfolioForm, setPortfolioForm] = useState({
    insurerRoute: '/api/seed/reinsurance',
    investorRoute: '/api/seed/my-portfolio',
    investorToken: '',
    investorExtra: 1,
    tranchesPerDeal: 3,
    policyCount: 2,
    exposuresPerPolicy: 1,
  });

  const [exposureForm, setExposureForm] = useState<{ points: number; dealId?: string; includeAllActive?: boolean }>({ points: 12, dealId: '', includeAllActive: false });
  const [pipelineResult, setPipelineResult] = useState<any | null>(null);
  const [incomingCount, setIncomingCount] = useState<number>(3);
  const [incomingType, setIncomingType] = useState<string>('auto');
  const [purgeResult, setPurgeResult] = useState<any | null>(null);

  // CRESTA zone import (cresta.org API) — long-running, throttled, resumable background job.
  const [crestaForm, setCrestaForm] = useState<{ only: string; level: string }>({ only: '', level: '' });
  const [crestaProgress, setCrestaProgress] = useState<any | null>(null);

  // Worldcities CSV import — streaming, two-pass background job (states + cities).
  const [worldcitiesFile, setWorldcitiesFile] = useState('');
  const [worldcitiesStatus, setWorldcitiesStatus] = useState<any | null>(null);

  async function refreshCrestaProgress() {
    try {
      const res = await getCrestaCatalog();
      if (res.ok) setCrestaProgress(await res.json());
    } catch (_) {
      /* ignore poll errors */
    }
  }

  // Poll progress so the panel reflects the background job (it runs server-side, ~1 page / 30s).
  useEffect(() => {
    refreshCrestaProgress();
    const t = setInterval(refreshCrestaProgress, 5000);
    return () => clearInterval(t);
  }, []);

  async function triggerCrestaImport() {
    setStatuses((st) => ({ ...st, cresta: 'pending' }));
    try {
      const body: { only?: string; level?: string } = {};
      if (crestaForm.only.trim()) body.only = crestaForm.only.trim();
      if (crestaForm.level) body.level = crestaForm.level;
      const res = await startCrestaImport(body);
      let json: any = null;
      try {
        json = await res.clone().json();
      } catch (_) {
        /* non-json */
      }
      setStatuses((st) => ({
        ...st,
        cresta: res.ok ? `ok: ${json?.message ?? res.status}` : `error ${res.status}: ${json?.message ?? ''}`,
      }));
      refreshCrestaProgress();
    } catch (err: any) {
      setStatuses((st) => ({ ...st, cresta: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, cresta: '' })), 9000);
  }

  async function stopCrestaImportRun() {
    try {
      const res = await stopCrestaImport();
      let json: any = null;
      try {
        json = await res.clone().json();
      } catch (_) {
        /* non-json */
      }
      setStatuses((st) => ({ ...st, cresta: json?.message ?? `stop ${res.status}` }));
      refreshCrestaProgress();
    } catch (err: any) {
      setStatuses((st) => ({ ...st, cresta: `failed (${err.message || 'network'})` }));
    }
  }

  async function refreshWorldcitiesStatus() {
    try {
      const res = await getWorldcitiesStatus();
      if (res.ok) setWorldcitiesStatus(await res.json());
    } catch (_) {
      /* ignore poll errors */
    }
  }

  // Poll status so the panel reflects the background import (it streams ~1.94M rows server-side).
  useEffect(() => {
    refreshWorldcitiesStatus();
    const t = setInterval(refreshWorldcitiesStatus, 5000);
    return () => clearInterval(t);
  }, []);

  async function triggerWorldcitiesImport() {
    setStatuses((st) => ({ ...st, worldcities: 'pending' }));
    try {
      const body: { file?: string } = {};
      if (worldcitiesFile.trim()) body.file = worldcitiesFile.trim();
      const res = await startWorldcitiesImport(body);
      let json: any = null;
      try {
        json = await res.clone().json();
      } catch (_) {
        /* non-json */
      }
      setStatuses((st) => ({
        ...st,
        worldcities: res.ok ? `ok: ${json?.message ?? res.status}` : `error ${res.status}: ${json?.message ?? ''}`,
      }));
      refreshWorldcitiesStatus();
    } catch (err: any) {
      setStatuses((st) => ({ ...st, worldcities: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, worldcities: '' })), 9000);
  }

  async function stopWorldcitiesImportRun() {
    try {
      const res = await stopWorldcitiesImport();
      let json: any = null;
      try {
        json = await res.clone().json();
      } catch (_) {
        /* non-json */
      }
      setStatuses((st) => ({ ...st, worldcities: json?.message ?? `stop ${res.status}` }));
      refreshWorldcitiesStatus();
    } catch (err: any) {
      setStatuses((st) => ({ ...st, worldcities: `failed (${err.message || 'network'})` }));
    }
  }

  function addSource() {
    if (!form.title || !form.route) return;
    const id = Date.now();
    setSources((s) => [
      ...s,
      { id, title: form.title, route: form.route, sub: form.sub || 'Not connected' },
    ]);
    setForm({ title: '', route: '', sub: '' });
  }

  function removeSource(id: number) {
    setSources((s) => s.filter((x) => x.id !== id));
  }

  async function triggerSource(id: number) {
    const src =
      sources.find((s) => s.id === id) ||
      orgSeeds.find((s) => s.id === id) ||
      userSeeds.find((s) => s.id === id) ||
      orgStructureSeeds.find((s) => s.id === id) ||
      capacitySeeds.find((s) => s.id === id);
    if (!src || !src.route) return;
    setStatuses((st) => ({ ...st, [id]: 'pending' }));

    // apiFetch resolves relative `/api/*` paths and passes absolute URLs through.
    let url = src.route;

    try {
      let res: Response;

      if (src.route?.includes('/seed/organizations')) {
        const extras = Number(src.count ?? 2);
        url = `${url}${url.includes('?') ? '&' : '?'}extras=${extras}`;
        res = await seedRoute(url);
      } else if (src.route?.includes('/seed/users')) {
        const extraInvestors = Number(src.count ?? 2);
        res = await seedRoute(url, { extraInvestors });
      } else if (src.route?.includes('/seed/org-structure')) {
        const body: { extraMembers: number; organizationId?: number } = {
          extraMembers: Number(src.count ?? 3),
        };
        const orgId = Number(orgStructureForm.organizationId);
        if (orgStructureForm.organizationId.trim() !== '' && Number.isFinite(orgId)) {
          body.organizationId = orgId;
        }
        res = await seedRoute(url, body);
      } else if (src.route?.includes('/seed/capacity-definitions')) {
        const body: { organizationId?: number; archetype?: string } = {};
        const orgId = Number(capacityForm.organizationId);
        if (capacityForm.organizationId.trim() !== '' && Number.isFinite(orgId)) {
          body.organizationId = orgId;
        }
        if (capacityForm.archetype.trim() !== '') body.archetype = capacityForm.archetype.trim();
        res = await seedRoute(url, body);
      } else {
        res = await seedRoute(url, { id: src.id, title: src.title, metadata: src.sub });
        if (res.status === 405) {
          res = await seedRoute(url, undefined, { method: 'GET' });
        }
      }

      let message = '';
      try {
        const json = await res.clone().json();
        message = json?.message || JSON.stringify(json);
      } catch (_) {
        message = res.statusText;
      }

      if (res.ok) {
        setStatuses((st) => ({ ...st, [id]: `ok ${res.status} ${message ? `: ${message}` : ''}` }));
      } else {
        setStatuses((st) => ({ ...st, [id]: `error ${res.status} ${message ? `: ${message}` : ''}` }));
      }
    } catch (err: any) {
      setStatuses((st) => ({ ...st, [id]: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, [id]: '' })), 7000);
  }

  function addOrg() {
    if (!orgForm.title || !orgForm.route) return;
    const id = Date.now();
    setOrgSeeds((s) => [...s, { id, title: orgForm.title, route: orgForm.route, sub: orgForm.sub || 'Not connected', count: orgForm.count ?? 2 }]);
    setOrgForm({ title: '', route: '/api/seed/organizations', sub: '', count: 10 });
  }

  function removeOrg(id: number) {
    setOrgSeeds((s) => s.filter((x) => x.id !== id));
  }

  function addUser() {
    if (!userForm.title || !userForm.route) return;
    const id = Date.now();
    setUserSeeds((s) => [...s, { id, title: userForm.title, route: userForm.route, sub: userForm.sub || 'Not connected', count: userForm.count ?? 2 }]);
    setUserForm({ title: '', route: '/api/seed/users', sub: '', count: 25 });
  }

  function removeUser(id: number) {
    setUserSeeds((s) => s.filter((x) => x.id !== id));
  }

  function addOrgStructure() {
    if (!orgStructureForm.route) return;
    const id = Date.now();
    setOrgStructureSeeds((s) => [
      ...s,
      {
        id,
        title: 'Org Structure',
        route: orgStructureForm.route,
        sub: orgStructureForm.sub || 'Departments, teams, role-assigned members + existing-user backfill',
        count: orgStructureForm.count ?? 3,
      },
    ]);
    setOrgStructureForm({ organizationId: '', route: '/api/seed/org-structure', sub: '', count: 3 });
  }

  function removeOrgStructure(id: number) {
    setOrgStructureSeeds((s) => s.filter((x) => x.id !== id));
  }

  async function triggerPortfolio(type: 'insurer' | 'investor') {
    setStatuses((st) => ({ ...st, [type]: 'pending' }));

    try {
      let route = '';
      let body: Record<string, unknown>;
      const headers: Record<string, string> = {};

      if (type === 'insurer') {
        route = portfolioForm.insurerRoute;
        body = { investorCount: 3, policyCount: Number(portfolioForm.policyCount), exposuresPerPolicy: Number(portfolioForm.exposuresPerPolicy), tranchesPerDeal: Number(portfolioForm.tranchesPerDeal) };
      } else {
        route = portfolioForm.investorRoute;
        body = { extraInvestors: Number(portfolioForm.investorExtra), tranchesPerDeal: Number(portfolioForm.tranchesPerDeal), policyCount: Number(portfolioForm.policyCount), exposuresPerPolicy: Number(portfolioForm.exposuresPerPolicy) };
        if (portfolioForm.investorToken) {
          // include provided bearer token to target a specific investor session
          headers['Authorization'] = `Bearer ${portfolioForm.investorToken}`;
        }
      }

      const res = await seedRoute(route, body, { headers });
      let message = '';
      try { message = JSON.stringify(await res.clone().json()); } catch (_) { message = res.statusText; }
      setStatuses((st) => ({ ...st, [type]: res.ok ? `ok ${res.status}` : `error ${res.status}: ${message}` }));
    } catch (err: any) {
      setStatuses((st) => ({ ...st, [type]: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, [type]: '' })), 7000);
  }

  async function triggerExposureSeries() {
    setStatuses((st) => ({ ...st, exposure: 'pending' }));

    try {
      const body: any = { points: Number(exposureForm.points ?? 12) };
      if (exposureForm.dealId && String(exposureForm.dealId).trim() !== '') body.dealId = Number(exposureForm.dealId);
      if (exposureForm.includeAllActive) body.includeAllActive = true;

      const res = await seedRoute('/api/seed/exposure-time-series', body);
      let message = '';
      try { message = JSON.stringify(await res.clone().json()); } catch (_) { message = res.statusText; }
      setStatuses((st) => ({ ...st, exposure: res.ok ? `ok ${res.status}` : `error ${res.status}: ${message}` }));
    } catch (err: any) {
      setStatuses((st) => ({ ...st, exposure: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, exposure: '' })), 7000);
  }

  // Seed "incoming" submissions into the signed-in user's organization pipeline so
  // the ingestion pipeline can be exercised manually on the Pipeline Processes
  // board. A relative apiFetch path lets auth.ts attach the current session's
  // bearer token, which the backend uses to resolve the target organization.
  async function triggerSeedIncoming() {
    setStatuses((st) => ({ ...st, pipeline: 'pending' }));
    try {
      const res = await seedPipelineSubmissions(Number(incomingCount) || 3, { submissionType: incomingType });
      let message = '';
      let jsonBody: any = null;
      try {
        jsonBody = await res.clone().json();
        message = jsonBody?.message || JSON.stringify(jsonBody);
      } catch (_) {
        message = res.statusText;
      }
      if (res.ok) {
        setStatuses((st) => ({ ...st, pipeline: `ok ${res.status}` }));
        setPipelineResult(jsonBody);
      } else {
        setStatuses((st) => ({ ...st, pipeline: `error ${res.status}: ${message}` }));
        setPipelineResult(jsonBody || { error: message });
      }
    } catch (err: any) {
      setStatuses((st) => ({ ...st, pipeline: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, pipeline: '' })), 7000);
  }

  // Destructive admin reset: remove every submission and the business data
  // derived from it (pipeline, underwriting, capital markets). Organizations and
  // users are preserved by the backend. Guarded by a browser confirm + the
  // backend's { confirm: true } requirement.
  async function triggerPurgeSubmissions() {
    const confirmed =
      typeof window === 'undefined' ||
      window.confirm(
        'Remove ALL submissions and associated data (pipeline runs, documents, policies, pricing, deals, tranches, tokens, claims, payouts)?\n\nOrganizations and users are kept. This cannot be undone.',
      );
    if (!confirmed) return;
    setStatuses((st) => ({ ...st, purge: 'pending' }));
    setPurgeResult(null);
    try {
      const res = await purgeSubmissions();
      let json: any = null;
      let message = '';
      try {
        json = await res.clone().json();
        message = json?.message || JSON.stringify(json);
      } catch (_) {
        message = res.statusText;
      }
      if (res.ok) {
        setStatuses((st) => ({ ...st, purge: `ok ${res.status}` }));
        setPurgeResult(json);
      } else {
        setStatuses((st) => ({ ...st, purge: `error ${res.status}: ${message}` }));
        setPurgeResult(json || { error: message });
      }
    } catch (err: any) {
      setStatuses((st) => ({ ...st, purge: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, purge: '' })), 9000);
  }

  return (
    <SeedingSection>
      <SeedingSectionLabel>Live Data Seeding</SeedingSectionLabel>

      <Row>
        <MonoInput
          placeholder="Source title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: (e.target as HTMLInputElement).value })}
        />
        <MonoInput
          placeholder="Route (e.g. /api/seed/noaa)"
          value={form.route}
          onChange={(e) => setForm({ ...form, route: (e.target as HTMLInputElement).value })}
          $minWidth={260}
        />
        <MonoInput
          placeholder="Metadata (latency / status)"
          value={form.sub}
          onChange={(e) => setForm({ ...form, sub: (e.target as HTMLInputElement).value })}
        />
        <Button onClick={addSource}>Add Source</Button>
      </Row>

      <InfoCard tone="info">
        <Row>
          <Grow>
            <CalloutTitle>Seed incoming submissions into my pipeline</CalloutTitle>
            <CalloutMeta>
              POST /api/seed/pipeline-submissions — creates submissions for your signed-in organization so you can advance them on Pipeline Processes. Pin a transaction type to force the batch to a specific kind (new business, renewal, endorsement, …), or leave it on Auto.
            </CalloutMeta>
          </Grow>
          <FieldLabel>Type</FieldLabel>
          <Select
            value={incomingType}
            onChange={(e) => setIncomingType((e.target as HTMLSelectElement).value)}
          >
            {SUBMISSION_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <FieldLabel>Count</FieldLabel>
          <MonoNumberInput
            placeholder="Count"
            value={String(incomingCount)}
            onChange={(e) => setIncomingCount(Number((e.target as HTMLInputElement).value))}
          />
          <Button tone="warning" onClick={triggerSeedIncoming}>Seed Incoming Submissions</Button>
          <StatusSlot>
            <StatusBadge status={statuses['pipeline']} />
          </StatusSlot>
        </Row>
      </InfoCard>

      <InfoCard tone="success">
        <Row>
          <SeedItemIcon color={colors.accent} className="material-symbols-outlined">public</SeedItemIcon>
          <Grow>
            <CalloutTitle>CRESTA Zones (cresta.org API)</CalloutTitle>
            <CalloutMeta>
              POST /api/cresta-zones/import — resumable. Up to 3 countries in parallel, throttled to 1 request / 10s per country. Loads state/province + city zones into crestaZones.
            </CalloutMeta>
          </Grow>
          <CrestaStateRight>
            {crestaProgress?.import?.running ? (
              <CrestaRunning>running… {crestaProgress.import.current ?? ''}</CrestaRunning>
            ) : (
              <CrestaIdle>idle</CrestaIdle>
            )}
          </CrestaStateRight>
        </Row>

        <RowWrap>
          <FieldLabel>Only (ISO3, comma)</FieldLabel>
          <MonoInput
            placeholder="e.g. ATG,RUS — blank = all"
            value={crestaForm.only}
            onChange={(e) => setCrestaForm({ ...crestaForm, only: (e.target as HTMLInputElement).value })}
            $minWidth={200}
          />
          <FieldLabel>Level</FieldLabel>
          <Select
            value={crestaForm.level}
            onChange={(e) => setCrestaForm({ ...crestaForm, level: (e.target as HTMLSelectElement).value })}
          >
            <option value="">both</option>
            <option value="state_province">state/province</option>
            <option value="city">city</option>
          </Select>
          <Button
            tone="success"
            onClick={triggerCrestaImport}
            disabled={Boolean(crestaProgress?.import?.running)}
          >
            Start Import
          </Button>
          <Button
            tone="danger"
            onClick={stopCrestaImportRun}
            disabled={!crestaProgress?.import?.running}
          >
            Stop
          </Button>
          <StatusSlot $minWidth={160}>
            <StatusBadge status={statuses['cresta']} />
          </StatusSlot>
        </RowWrap>

        {crestaProgress ? (
          <CrestaStatRow>
            {['complete', 'in_progress', 'pending', 'unavailable', 'failed'].map((k) => (
              <CrestaStat key={k}>
                {k}: <strong>{crestaProgress.byStatus?.[k] ?? 0}</strong>
              </CrestaStat>
            ))}
            <CrestaZonesStat>
              zones imported:{' '}
              <strong>
                {(crestaProgress.targets || []).reduce((a: number, t: any) => a + (t.imported || 0), 0).toLocaleString()}
              </strong>
            </CrestaZonesStat>
            {crestaProgress.import?.lastError ? (
              <CrestaError>err: {crestaProgress.import.lastError}</CrestaError>
            ) : null}
          </CrestaStatRow>
        ) : null}
      </InfoCard>

      <InfoCard tone="success">
        <Row>
          <SeedItemIcon color={colors.accent} className="material-symbols-outlined">location_city</SeedItemIcon>
          <Grow>
            <CalloutTitle>Worldcities CSV (states + cities)</CalloutTitle>
            <CalloutMeta>
              POST /api/seed/worldcities — streams SimpleMaps worldcities.csv (~1.94M rows) into stateProvinces + cities, linked to countries by iso3. Two-pass, idempotent, resumable.
            </CalloutMeta>
          </Grow>
          <CrestaStateRight>
            {worldcitiesStatus?.import?.running ? (
              <CrestaRunning>running… {worldcitiesStatus.import.phase ?? ''}</CrestaRunning>
            ) : (
              <CrestaIdle>idle</CrestaIdle>
            )}
          </CrestaStateRight>
        </Row>

        <RowWrap>
          <FieldLabel>CSV path (optional)</FieldLabel>
          <MonoInput
            placeholder="blank = WORLDCITIES_CSV / ./worldcities.csv"
            value={worldcitiesFile}
            onChange={(e) => setWorldcitiesFile((e.target as HTMLInputElement).value)}
            $minWidth={300}
          />
          <Button
            tone="success"
            onClick={triggerWorldcitiesImport}
            disabled={Boolean(worldcitiesStatus?.import?.running)}
          >
            Start Import
          </Button>
          <Button
            tone="danger"
            onClick={stopWorldcitiesImportRun}
            disabled={!worldcitiesStatus?.import?.running}
          >
            Stop
          </Button>
          <StatusSlot $minWidth={160}>
            <StatusBadge status={statuses['worldcities']} />
          </StatusSlot>
        </RowWrap>

        {worldcitiesStatus ? (
          <CrestaStatRow>
            <CrestaStat>
              phase: <strong>{worldcitiesStatus.import?.phase ?? 'idle'}</strong>
            </CrestaStat>
            <CrestaStat>
              scanned: <strong>{Number(worldcitiesStatus.import?.scanned ?? 0).toLocaleString()}</strong>
            </CrestaStat>
            <CrestaZonesStat>
              states: <strong>{Number(worldcitiesStatus.totals?.states ?? 0).toLocaleString()}</strong>
              {' · '}cities: <strong>{Number(worldcitiesStatus.totals?.cities ?? 0).toLocaleString()}</strong>
            </CrestaZonesStat>
            {worldcitiesStatus.import?.lastError ? (
              <CrestaError>err: {worldcitiesStatus.import.lastError}</CrestaError>
            ) : null}
          </CrestaStatRow>
        ) : null}
      </InfoCard>

      <SeedList>
        {sources.map((s) => (
          <SeedItem key={s.id} dim={Boolean(s.dim)}>
            <SeedItemInner>
              <SeedItemLeft>
                <SeedItemIcon color={colors.primary} className="material-symbols-outlined">cloud</SeedItemIcon>
                <div>
                  <SeedItemTitle>{s.title}</SeedItemTitle>
                  <SeedItemSub>{s.sub}</SeedItemSub>
                  <SeedRoute>{s.route}</SeedRoute>
                </div>
              </SeedItemLeft>
              <SeedItemActions>
                <SeedIconBtn title="Audit">
                  <span className="material-symbols-outlined">rule</span>
                </SeedIconBtn>
                <SeedIconBtn color={colors.primarySoft} title="Re-initialize" onClick={() => triggerSource(s.id)}>
                  <span className="material-symbols-outlined">refresh</span>
                </SeedIconBtn>
                <SeedIconBtn color={colors.dataViz.green} title="Trigger Route" onClick={() => triggerSource(s.id)}>
                  <span className="material-symbols-outlined">bolt</span>
                </SeedIconBtn>
                <SeedIconBtn color={colors.error} onClick={() => removeSource(s.id)} title="Remove">
                  <span className="material-symbols-outlined">delete</span>
                </SeedIconBtn>
                <StatusSlot $minWidth={120} $ml={8}>
                  <StatusBadge status={statuses[s.id]} />
                </StatusSlot>
              </SeedItemActions>
            </SeedItemInner>
          </SeedItem>
        ))}
      </SeedList>

      {pipelineResult ? (
        <ResultBox>
          {pipelineResult.error ? (
            <ResultLine $tone="error">
              Seed failed: {pipelineResult.message || pipelineResult.error}
            </ResultLine>
          ) : (
            <>
              <ResultLine>
                Seeded {pipelineResult.submissionsCreated ?? (pipelineResult.submissions ? pipelineResult.submissions.length : 0)} incoming submission(s){typeof pipelineResult.documentsCreated === 'number' ? ` with ${pipelineResult.documentsCreated} document(s)` : ''} into organization #{pipelineResult.organizationId ?? '—'} via channel {pipelineResult.channelLabel ?? pipelineResult.channelId ?? '—'}.
              </ResultLine>
              {typeof pipelineResult.averageComplexity === 'number' ? (
                <ResultLine $tone="accent" $mt={4}>
                  Avg complexity {pipelineResult.averageComplexity}/10
                  {pipelineResult.complexityRange ? ` (range ${pipelineResult.complexityRange.min}–${pipelineResult.complexityRange.max})` : ''}
                  {typeof pipelineResult.filesCreated === 'number' ? ` · ${pipelineResult.filesCreated} attachment(s) — PDFs, spreadsheets, images` : ''}.
                </ResultLine>
              ) : null}
              <ResultNote>
                Open <strong>Insurer → Pipeline Processes</strong> to advance them through the pipeline stages manually.
              </ResultNote>
              <SubmissionList>
                {(pipelineResult.submissions ?? []).map((s: any) => (
                  <SubmissionRow key={s.id}>
                    <SubmissionDot />
                    <SubmissionId>{s.submissionNumber ?? s.id}</SubmissionId>
                    <SubmissionStatus>{s.status}</SubmissionStatus>
                    {s.submissionTypeLabel ? <SubmissionType>{s.submissionTypeLabel}</SubmissionType> : null}
                    <SubmissionSource>{s.source}{s.transport ? ` · ${s.transport}` : ''}</SubmissionSource>
                    {s.lineOfBusiness ? <SubmissionLob>{s.lineOfBusiness}</SubmissionLob> : null}
                    {typeof s.complexity === 'number' ? <SubmissionCx>cx {s.complexity}/10</SubmissionCx> : null}
                    {typeof s.fileCount === 'number' ? <SubmissionFiles>{s.fileCount} file{s.fileCount === 1 ? '' : 's'}</SubmissionFiles> : null}
                  </SubmissionRow>
                ))}
              </SubmissionList>
              {pipelineResult.subscribedStages?.length ? (
                <SubscribedStages>
                  Subscribed stages: {pipelineResult.subscribedStages.join(', ')}
                </SubscribedStages>
              ) : null}
            </>
          )}
        </ResultBox>
      ) : null}

      <SectionBlock>
        <SubHeading>Organization Seeding</SubHeading>
        <Row $mb={12}>
          <MonoInput placeholder="Org name" value={orgForm.title} onChange={(e) => setOrgForm({ ...orgForm, title: (e.target as HTMLInputElement).value })} />
          <MonoInput placeholder="Route (e.g. /api/seed/organizations)" value={orgForm.route} onChange={(e) => setOrgForm({ ...orgForm, route: (e.target as HTMLInputElement).value })} $minWidth={260} />
          <MonoNumberInput placeholder="Count" value={String(orgForm.count)} onChange={(e) => setOrgForm({ ...orgForm, count: Number((e.target as HTMLInputElement).value) })} />
          <MonoInput placeholder="Metadata" value={orgForm.sub} onChange={(e) => setOrgForm({ ...orgForm, sub: (e.target as HTMLInputElement).value })} />
          <Button onClick={addOrg}>Add Org</Button>
        </Row>
        <SeedList>
          {orgSeeds.map((o) => (
            <SeedItem key={o.id} dim={Boolean(o.dim)}>
              <SeedItemInner>
                <SeedItemLeft>
                  <SeedItemIcon color={colors.accentStrong} className="material-symbols-outlined">store</SeedItemIcon>
                  <div>
                    <SeedItemTitle>{o.title}</SeedItemTitle>
                    <SeedItemSub>{o.sub}</SeedItemSub>
                    <SeedRoute>{o.route}</SeedRoute>
                  </div>
                </SeedItemLeft>
                <SeedItemActions>
                  <SeedIconBtn color={colors.primarySoft} title="Trigger" onClick={() => triggerSource(o.id)}>
                    <span className="material-symbols-outlined">bolt</span>
                  </SeedIconBtn>
                  <SeedIconBtn color={colors.error} onClick={() => removeOrg(o.id)} title="Remove">
                    <span className="material-symbols-outlined">delete</span>
                  </SeedIconBtn>
                  <StatusSlot $minWidth={120} $ml={8}>
                    <StatusBadge status={statuses[o.id]} />
                  </StatusSlot>
                </SeedItemActions>
              </SeedItemInner>
            </SeedItem>
          ))}
        </SeedList>
      </SectionBlock>

      <SectionBlock>
        <SubHeading>User Seeding</SubHeading>
        <Row $mb={12}>
          <MonoInput placeholder="User id / name" value={userForm.title} onChange={(e) => setUserForm({ ...userForm, title: (e.target as HTMLInputElement).value })} />
          <MonoInput placeholder="Route (e.g. /api/seed/users)" value={userForm.route} onChange={(e) => setUserForm({ ...userForm, route: (e.target as HTMLInputElement).value })} $minWidth={260} />
          <MonoNumberInput placeholder="Count" value={String(userForm.count)} onChange={(e) => setUserForm({ ...userForm, count: Number((e.target as HTMLInputElement).value) })} />
          <MonoInput placeholder="Metadata" value={userForm.sub} onChange={(e) => setUserForm({ ...userForm, sub: (e.target as HTMLInputElement).value })} />
          <Button onClick={addUser}>Add User</Button>
        </Row>
        <SeedList>
          {userSeeds.map((u) => (
            <SeedItem key={u.id} dim={Boolean(u.dim)}>
              <SeedItemInner>
                <SeedItemLeft>
                  <SeedItemIcon color={colors.errorSoft} className="material-symbols-outlined">person</SeedItemIcon>
                  <div>
                    <SeedItemTitle>{u.title}</SeedItemTitle>
                    <SeedItemSub>{u.sub}</SeedItemSub>
                    <SeedRoute>{u.route}</SeedRoute>
                  </div>
                </SeedItemLeft>
                <SeedItemActions>
                  <SeedIconBtn color={colors.primarySoft} title="Trigger" onClick={() => triggerSource(u.id)}>
                    <span className="material-symbols-outlined">bolt</span>
                  </SeedIconBtn>
                  <SeedIconBtn color={colors.error} onClick={() => removeUser(u.id)} title="Remove">
                    <span className="material-symbols-outlined">delete</span>
                  </SeedIconBtn>
                  <StatusSlot $minWidth={120} $ml={8}>
                    <StatusBadge status={statuses[u.id]} />
                  </StatusSlot>
                </SeedItemActions>
              </SeedItemInner>
            </SeedItem>
          ))}
        </SeedList>
      </SectionBlock>

      <SectionBlock>
        <SubHeading>Organization Structure Seeding</SubHeading>
        <CalloutMeta>
          POST /api/seed/org-structure — builds departments + teams for an organization, creates role-assigned
          members, and backfills every existing user with an organization, role, department, and team.
          Leave Org ID blank to target the first organization.
        </CalloutMeta>
        <Row $mt={12} $mb={12}>
          <MonoInput placeholder="Org ID (blank = first org)" value={orgStructureForm.organizationId} onChange={(e) => setOrgStructureForm({ ...orgStructureForm, organizationId: (e.target as HTMLInputElement).value })} />
          <MonoInput placeholder="Route (e.g. /api/seed/org-structure)" value={orgStructureForm.route} onChange={(e) => setOrgStructureForm({ ...orgStructureForm, route: (e.target as HTMLInputElement).value })} $minWidth={260} />
          <MonoNumberInput placeholder="Extra members" value={String(orgStructureForm.count)} onChange={(e) => setOrgStructureForm({ ...orgStructureForm, count: Number((e.target as HTMLInputElement).value) })} />
          <MonoInput placeholder="Metadata" value={orgStructureForm.sub} onChange={(e) => setOrgStructureForm({ ...orgStructureForm, sub: (e.target as HTMLInputElement).value })} />
          <Button onClick={addOrgStructure}>Add Structure</Button>
        </Row>
        <SeedList>
          {orgStructureSeeds.map((o) => (
            <SeedItem key={o.id} dim={Boolean(o.dim)}>
              <SeedItemInner>
                <SeedItemLeft>
                  <SeedItemIcon color={colors.accentStrong} className="material-symbols-outlined">account_tree</SeedItemIcon>
                  <div>
                    <SeedItemTitle>{o.title}</SeedItemTitle>
                    <SeedItemSub>{o.sub}</SeedItemSub>
                    <SeedRoute>{o.route}</SeedRoute>
                  </div>
                </SeedItemLeft>
                <SeedItemActions>
                  <SeedIconBtn color={colors.primarySoft} title="Trigger" onClick={() => triggerSource(o.id)}>
                    <span className="material-symbols-outlined">bolt</span>
                  </SeedIconBtn>
                  <SeedIconBtn color={colors.error} onClick={() => removeOrgStructure(o.id)} title="Remove">
                    <span className="material-symbols-outlined">delete</span>
                  </SeedIconBtn>
                  <StatusSlot $minWidth={120} $ml={8}>
                    <StatusBadge status={statuses[o.id]} />
                  </StatusSlot>
                </SeedItemActions>
              </SeedItemInner>
            </SeedItem>
          ))}
        </SeedList>
      </SectionBlock>

      <SectionBlock>
        <SubHeading>Capacity Definition Seeding</SubHeading>
        <CalloutMeta>
          POST /api/seed/capacity-definitions — applies one active capacity definition per organization,
          populated 1:1 with the capacity editor (perils, exposure, geography, pricing, scoring, workflow) plus
          the authoritative appetite block the validation pipeline enforces. Archetypes are assigned round-robin
          so the org set spans distinct rule sets. Leave fields blank to seed every org with round-robin archetypes.
        </CalloutMeta>
        <Row $mt={12} $mb={12}>
          <MonoInput placeholder="Org ID (blank = all orgs)" value={capacityForm.organizationId} onChange={(e) => setCapacityForm({ ...capacityForm, organizationId: (e.target as HTMLInputElement).value })} />
          <MonoInput placeholder="Archetype (blank = round-robin)" value={capacityForm.archetype} onChange={(e) => setCapacityForm({ ...capacityForm, archetype: (e.target as HTMLInputElement).value })} $minWidth={260} />
        </Row>
        <SeedList>
          {capacitySeeds.map((c) => (
            <SeedItem key={c.id} dim={Boolean(c.dim)}>
              <SeedItemInner>
                <SeedItemLeft>
                  <SeedItemIcon color={colors.accentStrong} className="material-symbols-outlined">shield</SeedItemIcon>
                  <div>
                    <SeedItemTitle>{c.title}</SeedItemTitle>
                    <SeedItemSub>{c.sub}</SeedItemSub>
                    <SeedRoute>{c.route}</SeedRoute>
                  </div>
                </SeedItemLeft>
                <SeedItemActions>
                  <SeedIconBtn color={colors.primarySoft} title="Trigger" onClick={() => triggerSource(c.id)}>
                    <span className="material-symbols-outlined">bolt</span>
                  </SeedIconBtn>
                  <StatusSlot $minWidth={120} $ml={8}>
                    <StatusBadge status={statuses[c.id]} />
                  </StatusSlot>
                </SeedItemActions>
              </SeedItemInner>
            </SeedItem>
          ))}
        </SeedList>
      </SectionBlock>

      <SectionBlock>
        <SubHeading>Portfolio Seeding</SubHeading>

        <Row $mb={12}>
          <FieldGroup>
            <FieldLabel>Tranches</FieldLabel>
            <FixedNumberInput placeholder="Tranches" value={String(portfolioForm.tranchesPerDeal)} onChange={(e) => setPortfolioForm({ ...portfolioForm, tranchesPerDeal: Number((e.target as HTMLInputElement).value) })} $width={84} />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Policies</FieldLabel>
            <FixedNumberInput placeholder="Policies" value={String(portfolioForm.policyCount)} onChange={(e) => setPortfolioForm({ ...portfolioForm, policyCount: Number((e.target as HTMLInputElement).value) })} $width={84} />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Exposures</FieldLabel>
            <FixedNumberInput placeholder="Exposures" value={String(portfolioForm.exposuresPerPolicy)} onChange={(e) => setPortfolioForm({ ...portfolioForm, exposuresPerPolicy: Number((e.target as HTMLInputElement).value) })} $width={84} />
          </FieldGroup>

          <FieldGroup>
            <FieldLabel>Extra Investors</FieldLabel>
            <FixedNumberInput placeholder="Extra" value={String(portfolioForm.investorExtra)} onChange={(e) => setPortfolioForm({ ...portfolioForm, investorExtra: Number((e.target as HTMLInputElement).value) })} $width={84} />
          </FieldGroup>
        </Row>

        <Row $mb={8}>
          <PlainInput placeholder="Insurer seed route" value={portfolioForm.insurerRoute} onChange={(e) => setPortfolioForm({ ...portfolioForm, insurerRoute: (e.target as HTMLInputElement).value })} $minWidth={320} />
          <Button onClick={() => triggerPortfolio('insurer')}>Seed Insurer Package</Button>
          <StatusSlot $minWidth={180}>
            <StatusBadge status={statuses['insurer']} />
          </StatusSlot>
        </Row>

        <Row $mb={12}>
          <PlainInput placeholder="Investor seed route" value={portfolioForm.investorRoute} onChange={(e) => setPortfolioForm({ ...portfolioForm, investorRoute: (e.target as HTMLInputElement).value })} $minWidth={320} />
          <PlainInput placeholder="Optional: Bearer token for target investor" value={portfolioForm.investorToken} onChange={(e) => setPortfolioForm({ ...portfolioForm, investorToken: (e.target as HTMLInputElement).value })} $minWidth={420} />
        </Row>

        <Row>
          <Button tone="success" onClick={() => triggerPortfolio('investor')}>Seed Investor Portfolio</Button>
          <StatusSlot $minWidth={180}>
            <StatusBadge status={statuses['investor']} />
          </StatusSlot>
        </Row>

        <Row $mt={12}>
          <FixedNumberInput placeholder="Points" value={String(exposureForm.points)} onChange={(e) => setExposureForm({ ...exposureForm, points: Number((e.target as HTMLInputElement).value) })} $width={120} />
          <PlainInput placeholder="Deal ID (optional)" value={String(exposureForm.dealId ?? '')} onChange={(e) => setExposureForm({ ...exposureForm, dealId: (e.target as HTMLInputElement).value })} $minWidth={160} />
          <Checkbox
            label="All active deals"
            checked={Boolean(exposureForm.includeAllActive)}
            onChange={(e) => setExposureForm({ ...exposureForm, includeAllActive: (e.target as HTMLInputElement).checked })}
          />
          <Button onClick={() => triggerExposureSeries()}>Seed Exposure Time Series</Button>
          <StatusSlot $minWidth={220}>
            <StatusBadge status={statuses['exposure']} />
          </StatusSlot>
        </Row>
      </SectionBlock>

      <InfoCard tone="danger" icon="warning" title="Danger Zone">
        Permanently remove <strong>all submissions and associated data</strong> — pipeline runs, documents, policies,
        pricing, deals, tranches, tokens, claims and payouts. <strong>Organizations and users are kept.</strong> This
        cannot be undone.
        <Row $mt={12}>
          <Button tone="danger" onClick={triggerPurgeSubmissions}>
            Remove All Submissions
          </Button>
          <StatusSlot $minWidth={160}>
            <StatusBadge status={statuses['purge']} />
          </StatusSlot>
        </Row>
        {purgeResult ? (
          purgeResult.error ? (
            <ResultLine $tone="error" $mt={10}>
              Purge failed: {purgeResult.message || purgeResult.error}
            </ResultLine>
          ) : (
            <ResultLine $tone="gain" $mt={10}>
              {purgeResult.message
                ? purgeResult.message
                : `Removed ${purgeResult.totalDeleted ?? 0} record(s); kept ${purgeResult.keptOrganizations ?? '—'} org(s) and ${purgeResult.keptUsers ?? '—'} user(s).`}
            </ResultLine>
          )
        ) : null}
      </InfoCard>

      <InfoCard tone="success" icon="verified_user" title="Integrity Protocol Active">
        All ingestion streams are cross-validated by decentralized oracles. Actions here are non-destructive in the UI demo.
      </InfoCard>
    </SeedingSection>
  );
}
