import React, { useState } from 'react';
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
  IntegrityBox,
  IntegrityHeader,
  IntegrityIcon,
  IntegrityLabel,
  IntegrityText,
} from './AdminPage.styles';

import Input from '../../xds/components/Input';
import NumberInput from '../../xds/components/NumberInput';
import { apiFetch } from '../../lib/auth';

export default function SeedingPanel() {
  const [sources, setSources] = useState<any[]>([
    { id: 1, title: 'NOAA Meteo-Feed', route: '/api/seed/noaa', sub: 'Latency: 0.8s | Connected' },
    { id: 2, title: 'Orbital Imagery Link', route: '/api/seed/orbital', sub: 'Res: 15cm | Active Stream' },
    { id: 3, title: 'Cedent Ingestion Port', route: '/api/seed/cedent', sub: 'Batch #402-A | Syncing' },
    { id: 4, title: 'IoT Ground Sensors', route: '/api/seed/iot', sub: 'Offline | Scheduled Maint', dim: true },
  ]);

  const [form, setForm] = useState({ title: '', route: '', sub: '' });
  const [statuses, setStatuses] = useState<Record<number, string>>({});

  const [orgSeeds, setOrgSeeds] = useState<any[]>([
    { id: 101, title: 'Org Seeding', route: '/api/seed/organizations', sub: 'Creates sample organizations', count: 10 },
  ]);
  const [userSeeds, setUserSeeds] = useState<any[]>([
    { id: 201, title: 'User Seeding', route: '/api/seed/users', sub: 'Creates sample users', count: 25 },
  ]);

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
    const src = sources.find((s) => s.id === id) || orgSeeds.find((s) => s.id === id) || userSeeds.find((s) => s.id === id);
    if (!src || !src.route) return;
    setStatuses((st) => ({ ...st, [id]: 'pending' }));

    const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';
    let url = src.route && (src.route.startsWith('http') ? src.route : `${API_BASE}${src.route}`);

    try {
      let res: Response;

      if (src.route?.includes('/seed/organizations')) {
        const extras = Number(src.count ?? 2);
        url = `${url}${url.includes('?') ? '&' : '?'}extras=${extras}`;
        res = await apiFetch(url, { method: 'POST' });
      } else if (src.route?.includes('/seed/users')) {
        const extraInvestors = Number(src.count ?? 2);
        res = await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extraInvestors }) });
      } else {
        const opts: RequestInit = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: src.id, title: src.title, metadata: src.sub }),
        };

        res = await apiFetch(url, opts);
        if (res.status === 405) {
          res = await apiFetch(url, { method: 'GET' });
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

  async function triggerPortfolio(type: 'insurer' | 'investor') {
    setStatuses((st) => ({ ...st, [type]: 'pending' }));
    const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';

    try {
      let url = '';
      let opts: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

      if (type === 'insurer') {
        url = `${API_BASE}${portfolioForm.insurerRoute}`;
        opts.body = JSON.stringify({ investorCount: 3, policyCount: Number(portfolioForm.policyCount), exposuresPerPolicy: Number(portfolioForm.exposuresPerPolicy), tranchesPerDeal: Number(portfolioForm.tranchesPerDeal) });
      } else {
        url = `${API_BASE}${portfolioForm.investorRoute}`;
        opts.body = JSON.stringify({ extraInvestors: Number(portfolioForm.investorExtra), tranchesPerDeal: Number(portfolioForm.tranchesPerDeal), policyCount: Number(portfolioForm.policyCount), exposuresPerPolicy: Number(portfolioForm.exposuresPerPolicy) });
        if (portfolioForm.investorToken) {
          // include provided bearer token to target a specific investor session
          (opts.headers as Record<string, string>)['Authorization'] = `Bearer ${portfolioForm.investorToken}`;
        }
      }

      const res = await apiFetch(url, opts);
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
    const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';

    try {
      const url = `${API_BASE}/api/seed/exposure-time-series`;
      const body: any = { points: Number(exposureForm.points ?? 12) };
      if (exposureForm.dealId && String(exposureForm.dealId).trim() !== '') body.dealId = Number(exposureForm.dealId);
      if (exposureForm.includeAllActive) body.includeAllActive = true;

      const res = await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      let message = '';
      try { message = JSON.stringify(await res.clone().json()); } catch (_) { message = res.statusText; }
      setStatuses((st) => ({ ...st, exposure: res.ok ? `ok ${res.status}` : `error ${res.status}: ${message}` }));
    } catch (err: any) {
      setStatuses((st) => ({ ...st, exposure: `failed (${err.message || 'network'})` }));
    }
    setTimeout(() => setStatuses((st) => ({ ...st, exposure: '' })), 7000);
  }

  async function triggerRunPipeline() {
    setStatuses((st) => ({ ...st, pipeline: 'pending' }));
    const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';
    try {
      const url = `${API_BASE}/api/admin/pipeline/run`;
      const res = await apiFetch(url, { method: 'POST' });
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

  return (
    <SeedingSection>
      <SeedingSectionLabel>Live Data Seeding</SeedingSectionLabel>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Input
          placeholder="Source title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: (e.target as HTMLInputElement).value })}
          style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }}
        />
        <Input
          placeholder="Route (e.g. /api/seed/noaa)"
          value={form.route}
          onChange={(e) => setForm({ ...form, route: (e.target as HTMLInputElement).value })}
          style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace", minWidth: 260 }}
        />
        <Input
          placeholder="Metadata (latency / status)"
          value={form.sub}
          onChange={(e) => setForm({ ...form, sub: (e.target as HTMLInputElement).value })}
          style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }}
        />
        <button onClick={addSource} style={{ padding: '8px 12px', background: '#4b8eff', color: '#002e69', border: 'none', borderRadius: 6, fontWeight: 700 }}>Add Source</button>
        <button onClick={triggerRunPipeline} style={{ padding: '8px 12px', background: '#ffb547', color: '#2b1a00', border: 'none', borderRadius: 6, fontWeight: 700 }}>Run Pipeline Now</button>
      </div>

      <SeedList style={{ marginTop: 12 }}>
        {sources.map((s) => (
          <SeedItem key={s.id} dim={Boolean((s as any).dim)}>
            <SeedItemInner>
              <SeedItemLeft>
                <SeedItemIcon color="#4b8eff" className="material-symbols-outlined">cloud</SeedItemIcon>
                <div>
                  <SeedItemTitle>{s.title}</SeedItemTitle>
                  <SeedItemSub>{s.sub}</SeedItemSub>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>{s.route}</div>
                </div>
              </SeedItemLeft>
              <SeedItemActions>
                <SeedIconBtn title="Audit">
                  <span className="material-symbols-outlined">rule</span>
                </SeedIconBtn>
                <SeedIconBtn color="#adc6ff" title="Re-initialize" onClick={() => triggerSource(s.id)}>
                  <span className="material-symbols-outlined">refresh</span>
                </SeedIconBtn>
                <SeedIconBtn color="#22c55e" title="Trigger Route" onClick={() => triggerSource(s.id)}>
                  <span className="material-symbols-outlined">bolt</span>
                </SeedIconBtn>
                <SeedIconBtn color="#ff6b6b" onClick={() => removeSource(s.id)} title="Remove">
                  <span className="material-symbols-outlined">delete</span>
                </SeedIconBtn>
                <div style={{ fontSize: 12, color: '#c1c6d7', marginLeft: 8, minWidth: 120 }}>
                  {statuses[s.id] ? <span style={{ color: statuses[s.id].startsWith('ok') ? '#4edea3' : '#ffb4ab' }}>{statuses[s.id]}</span> : null}
                </div>
              </SeedItemActions>
            </SeedItemInner>
          </SeedItem>
        ))}
      </SeedList>

      {pipelineResult ? (
        <div style={{ marginTop: 12, background: '#071025', padding: 12, borderRadius: 6 }}>
          <div style={{ fontSize: 12, color: '#c1c6d7', fontFamily: "'JetBrains Mono', monospace" }}>
            Pipeline Run Summary: {pipelineResult.channelsProcessed ?? (pipelineResult.channels ? pipelineResult.channels.length : 0)} channels, {pipelineResult.submissionsProcessed ?? (pipelineResult.channels ? pipelineResult.channels.reduce((acc: number, c: any) => acc + (c.processedCount ?? (c.results ? c.results.length : 0)), 0) : 0)} submissions
          </div>
          <div style={{ marginTop: 8 }}>
            {pipelineResult.channels?.map((ch: any) => (
              <div key={ch.channelId} style={{ marginTop: 8, padding: 8, border: '1px solid rgba(65,71,85,0.12)', borderRadius: 6 }}>
                <div style={{ fontWeight: 700, color: '#e6eefc' }}>{ch.label || ch.channelId} — Processed: {ch.processedCount ?? (ch.results ? ch.results.length : 0)}</div>
                <div style={{ marginTop: 6 }}>
                  {ch.results?.map((r: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 4, background: r.ok ? '#4edea3' : '#ffb4ab' }} />
                      <div style={{ color: '#c1c6d7' }}>{r.submissionId ?? r.id ?? 'submission'}</div>
                      <div style={{ color: r.ok ? '#9ee6c5' : '#ffb4ab', marginLeft: 8 }}>{r.ok ? 'ok' : (r.error || 'failed')}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 28 }}>
        <h4 style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#c1c6d7', marginBottom: 8 }}>Organization Seeding</h4>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <Input placeholder="Org name" value={orgForm.title} onChange={(e) => setOrgForm({ ...orgForm, title: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }} />
          <Input placeholder="Route (e.g. /api/seed/organizations)" value={orgForm.route} onChange={(e) => setOrgForm({ ...orgForm, route: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace", minWidth: 260 }} />
          <NumberInput placeholder="Count" value={String(orgForm.count)} onChange={(e) => setOrgForm({ ...orgForm, count: Number((e.target as HTMLInputElement).value) })} style={{ width: 84, padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }} />
          <Input placeholder="Metadata" value={orgForm.sub} onChange={(e) => setOrgForm({ ...orgForm, sub: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }} />
          <button onClick={addOrg} style={{ padding: '8px 12px', background: '#4b8eff', color: '#002e69', border: 'none', borderRadius: 6, fontWeight: 700 }}>Add Org</button>
        </div>
        <SeedList>
          {orgSeeds.map((o) => (
            <SeedItem key={o.id} dim={Boolean((o as any).dim)}>
              <SeedItemInner>
                <SeedItemLeft>
                  <SeedItemIcon color="#00a572" className="material-symbols-outlined">store</SeedItemIcon>
                  <div>
                    <SeedItemTitle>{o.title}</SeedItemTitle>
                    <SeedItemSub>{o.sub}</SeedItemSub>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>{o.route}</div>
                  </div>
                </SeedItemLeft>
                <SeedItemActions>
                  <SeedIconBtn color="#adc6ff" title="Trigger" onClick={() => triggerSource(o.id)}>
                    <span className="material-symbols-outlined">bolt</span>
                  </SeedIconBtn>
                  <SeedIconBtn color="#ff6b6b" onClick={() => removeOrg(o.id)} title="Remove">
                    <span className="material-symbols-outlined">delete</span>
                  </SeedIconBtn>
                  <div style={{ fontSize: 12, color: '#c1c6d7', marginLeft: 8, minWidth: 120 }}>
                    {statuses[o.id] ? <span style={{ color: statuses[o.id].startsWith('ok') ? '#4edea3' : '#ffb4ab' }}>{statuses[o.id]}</span> : null}
                  </div>
                </SeedItemActions>
              </SeedItemInner>
            </SeedItem>
          ))}
        </SeedList>
      </div>

      <div style={{ marginTop: 28 }}>
        <h4 style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#c1c6d7', marginBottom: 8 }}>User Seeding</h4>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <Input placeholder="User id / name" value={userForm.title} onChange={(e) => setUserForm({ ...userForm, title: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }} />
          <Input placeholder="Route (e.g. /api/seed/users)" value={userForm.route} onChange={(e) => setUserForm({ ...userForm, route: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace", minWidth: 260 }} />
          <NumberInput placeholder="Count" value={String(userForm.count)} onChange={(e) => setUserForm({ ...userForm, count: Number((e.target as HTMLInputElement).value) })} style={{ width: 84, padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }} />
          <Input placeholder="Metadata" value={userForm.sub} onChange={(e) => setUserForm({ ...userForm, sub: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, border: '1px solid rgba(65,71,85,0.12)', background: '#0b1326', color: '#dae2fd', fontFamily: "'JetBrains Mono', monospace" }} />
          <button onClick={addUser} style={{ padding: '8px 12px', background: '#4b8eff', color: '#002e69', border: 'none', borderRadius: 6, fontWeight: 700 }}>Add User</button>
        </div>
        <SeedList>
          {userSeeds.map((u) => (
            <SeedItem key={u.id} dim={Boolean((u as any).dim)}>
              <SeedItemInner>
                <SeedItemLeft>
                  <SeedItemIcon color="#ffb3ad" className="material-symbols-outlined">person</SeedItemIcon>
                  <div>
                    <SeedItemTitle>{u.title}</SeedItemTitle>
                    <SeedItemSub>{u.sub}</SeedItemSub>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>{u.route}</div>
                  </div>
                </SeedItemLeft>
                <SeedItemActions>
                  <SeedIconBtn color="#adc6ff" title="Trigger" onClick={() => triggerSource(u.id)}>
                    <span className="material-symbols-outlined">bolt</span>
                  </SeedIconBtn>
                  <SeedIconBtn color="#ff6b6b" onClick={() => removeUser(u.id)} title="Remove">
                    <span className="material-symbols-outlined">delete</span>
                  </SeedIconBtn>
                  <div style={{ fontSize: 12, color: '#c1c6d7', marginLeft: 8, minWidth: 120 }}>
                    {statuses[u.id] ? <span style={{ color: statuses[u.id].startsWith('ok') ? '#4edea3' : '#ffb4ab' }}>{statuses[u.id]}</span> : null}
                  </div>
                </SeedItemActions>
              </SeedItemInner>
            </SeedItem>
          ))}
        </SeedList>
      </div>

      <div style={{ marginTop: 28 }}>
        <h4 style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#c1c6d7', marginBottom: 8 }}>Portfolio Seeding</h4>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Tranches</label>
            <NumberInput placeholder="Tranches" value={String(portfolioForm.tranchesPerDeal)} onChange={(e) => setPortfolioForm({ ...portfolioForm, tranchesPerDeal: Number((e.target as HTMLInputElement).value) })} style={{ width: 84 }} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Policies</label>
            <NumberInput placeholder="Policies" value={String(portfolioForm.policyCount)} onChange={(e) => setPortfolioForm({ ...portfolioForm, policyCount: Number((e.target as HTMLInputElement).value) })} style={{ width: 84 }} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Exposures</label>
            <NumberInput placeholder="Exposures" value={String(portfolioForm.exposuresPerPolicy)} onChange={(e) => setPortfolioForm({ ...portfolioForm, exposuresPerPolicy: Number((e.target as HTMLInputElement).value) })} style={{ width: 84 }} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: '#94a3b8' }}>Extra Investors</label>
            <NumberInput placeholder="Extra" value={String(portfolioForm.investorExtra)} onChange={(e) => setPortfolioForm({ ...portfolioForm, investorExtra: Number((e.target as HTMLInputElement).value) })} style={{ width: 84 }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          <Input placeholder="Insurer seed route" value={portfolioForm.insurerRoute} onChange={(e) => setPortfolioForm({ ...portfolioForm, insurerRoute: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, minWidth: 320 }} />
          <button onClick={() => triggerPortfolio('insurer')} style={{ padding: '8px 12px', background: '#4b8eff', color: '#002e69', border: 'none', borderRadius: 6, fontWeight: 700 }}>Seed Insurer Package</button>
          <div style={{ fontSize: 12, color: '#c1c6d7', minWidth: 180 }}>{statuses['insurer'] ? <span style={{ color: statuses['insurer'].startsWith('ok') ? '#4edea3' : '#ffb4ab' }}>{statuses['insurer']}</span> : null}</div>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <Input placeholder="Investor seed route" value={portfolioForm.investorRoute} onChange={(e) => setPortfolioForm({ ...portfolioForm, investorRoute: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, minWidth: 320 }} />
          <Input placeholder="Optional: Bearer token for target investor" value={portfolioForm.investorToken} onChange={(e) => setPortfolioForm({ ...portfolioForm, investorToken: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, minWidth: 420 }} />
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={() => triggerPortfolio('investor')} style={{ padding: '8px 12px', background: '#22c55e', color: '#022607', border: 'none', borderRadius: 6, fontWeight: 700 }}>Seed Investor Portfolio</button>
          <div style={{ fontSize: 12, color: '#c1c6d7', minWidth: 180 }}>{statuses['investor'] ? <span style={{ color: statuses['investor'].startsWith('ok') ? '#4edea3' : '#ffb4ab' }}>{statuses['investor']}</span> : null}</div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <NumberInput placeholder="Points" value={String(exposureForm.points)} onChange={(e) => setExposureForm({ ...exposureForm, points: Number((e.target as HTMLInputElement).value) })} style={{ width: 120 }} />
          <Input placeholder="Deal ID (optional)" value={String(exposureForm.dealId ?? '')} onChange={(e) => setExposureForm({ ...exposureForm, dealId: (e.target as HTMLInputElement).value })} style={{ padding: 8, borderRadius: 6, minWidth: 160 }} />
          <label style={{ color: '#c1c6d7', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={Boolean(exposureForm.includeAllActive)} onChange={(e) => setExposureForm({ ...exposureForm, includeAllActive: (e.target as HTMLInputElement).checked })} />
            <span>All active deals</span>
          </label>
          <button onClick={() => triggerExposureSeries()} style={{ padding: '8px 12px', background: '#4b8eff', color: '#002e69', border: 'none', borderRadius: 6, fontWeight: 700 }}>Seed Exposure Time Series</button>
          <div style={{ fontSize: 12, color: '#c1c6d7', minWidth: 220 }}>{statuses['exposure'] ? <span style={{ color: statuses['exposure'].startsWith('ok') ? '#4edea3' : '#ffb4ab' }}>{statuses['exposure']}</span> : null}</div>
        </div>
      </div>

      <IntegrityBox style={{ marginTop: 12 }}>
        <IntegrityHeader>
          <IntegrityIcon className="material-symbols-outlined">verified_user</IntegrityIcon>
          <IntegrityLabel>Integrity Protocol Active</IntegrityLabel>
        </IntegrityHeader>
        <IntegrityText>
          All ingestion streams are cross-validated by decentralized oracles. Actions here are non-destructive in the UI demo.
        </IntegrityText>
      </IntegrityBox>
    </SeedingSection>
  );
}
