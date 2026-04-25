import { apiFetch } from '../lib/auth';

export type SimEvent = {
  id: string;
  type: string;
  ts: number;
  tag: string;
  color: string;
  message: string;
  meta?: Record<string, any>;
};

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid(prefix = '') {
  return `${prefix}${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`;
}

function fmtCurrency(n: number) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

class SimulationEngine {
  private listeners = new Set<(e: SimEvent) => void>();
  private timer: number | null = null;
  private running = false;
  private applyToApi = false;
  private minDelay = 600;
  private maxDelay = 2200;

  onEvent(fn: (e: SimEvent) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  start(opts?: { applyToApi?: boolean; minDelay?: number; maxDelay?: number }) {
    if (this.running) return;
    this.running = true;
    this.applyToApi = !!opts?.applyToApi;
    if (opts?.minDelay) this.minDelay = opts.minDelay;
    if (opts?.maxDelay) this.maxDelay = opts.maxDelay;
    this.emitSystem('SIMULATION_STARTED', '[SYS]', '#adc6ff', 'Simulation started');
    this.scheduleNext();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer) window.clearTimeout(this.timer);
    this.timer = null;
    this.emitSystem('SIMULATION_STOPPED', '[SYS]', '#adc6ff', 'Simulation stopped');
  }

  dryRun(count = 6, applyToApi = false) {
    for (let i = 0; i < count; i++) {
      const ev = this.generateEvent();
      this.emit(ev);
      if (applyToApi) this.maybeApplyToApi(ev).catch(() => {});
    }
  }

  private scheduleNext() {
    if (!this.running) return;
    const delay = randInt(this.minDelay, this.maxDelay);
    this.timer = window.setTimeout(async () => {
      const ev = this.generateEvent();
      this.emit(ev);
      if (this.applyToApi) await this.maybeApplyToApi(ev).catch(() => {});
      this.scheduleNext();
    }, delay) as unknown as number;
  }

  private emit(ev: SimEvent) {
    for (const fn of Array.from(this.listeners)) fn(ev);
  }

  private emitSystem(type: string, tag: string, color: string, message: string) {
    const ev: SimEvent = { id: uid('sys-'), type, ts: Date.now(), tag, color, message };
    this.emit(ev);
  }

  private generateEvent(): SimEvent {
    const types = ['user_registration', 'capital_allocation', 'claim_created', 'claim_settled', 'deal_created'];
    const type = types[randInt(0, types.length - 1)];
    const ts = Date.now();

    if (type === 'user_registration') {
      const id = uid('u-');
      const roles = ['investor', 'insurer', 'underwriter'];
      const role = roles[randInt(0, roles.length - 1)];
      return {
        id,
        type,
        ts,
        tag: '[OK]',
        color: '#4edea3',
        message: `Registered new ${role} ${id}`,
        meta: { id, role },
      };
    }

    if (type === 'capital_allocation') {
      const tranche = `TR-${randInt(1000, 9999)}-${String.fromCharCode(65 + randInt(0, 8))}`;
      const amount = randInt(1000000, 50000000);
      return {
        id: uid('alloc-'),
        type,
        ts,
        tag: '[OK]',
        color: '#adc6ff',
        message: `Allocated ${fmtCurrency(amount)} to ${tranche}`,
        meta: { tranche, amount },
      };
    }

    if (type === 'claim_created') {
      const policy = `P-${randInt(100000, 999999)}`;
      const amount = randInt(50000, 2000000);
      const sev = randInt(0, 10) > 7 ? 'High' : randInt(0, 10) > 4 ? 'Medium' : 'Low';
      return {
        id: uid('claim-'),
        type,
        ts,
        tag: sev === 'High' ? '[WARN]' : '[OK]',
        color: sev === 'High' ? '#ffb3ad' : '#4edea3',
        message: `Claim filed ${fmtCurrency(amount)} on ${policy} (sev=${sev})`,
        meta: { policy, amount, severity: sev },
      };
    }

    if (type === 'claim_settled') {
      const claim = uid('claim-');
      const amount = randInt(10000, 1000000);
      return {
        id: claim,
        type,
        ts,
        tag: '[OK]',
        color: '#4edea3',
        message: `Claim settled ${fmtCurrency(amount)} (id=${claim})`,
        meta: { claim, amount },
      };
    }

    // fallback: deal_created
    const dealId = uid('deal-');
    return {
      id: dealId,
      type: 'deal_created',
      ts,
      tag: '[SYS]',
      color: '#adc6ff',
      message: `New deal created ${dealId}`,
      meta: { dealId },
    };
  }

  private async maybeApplyToApi(ev: SimEvent) {
    // Only apply a few event types to seeding endpoints that exist.
    try {
      const API_BASE = (typeof window !== 'undefined' && ((window as any).__VITE_API_BASE || (window as any).VITE_API_BASE)) || (import.meta as any).env?.VITE_API_BASE || '';
      if (ev.type === 'user_registration') {
        const url = `${API_BASE}/api/seed/users`;
        await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extraInvestors: 1 }), useAuth: false });
      } else if (ev.type === 'capital_allocation' || ev.type === 'deal_created') {
        const url = `${API_BASE}/api/seed/reinsurance`;
        await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ investorCount: 1, tranchesPerDeal: 1 }), useAuth: false });
      } else if (ev.type === 'claim_created') {
        // no dedicated seed endpoint for claims in the demo; send to /api/seed/my-portfolio as a placeholder
        const url = `${API_BASE}/api/seed/my-portfolio`;
        await apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extraInvestors: 0 }), useAuth: false });
      }
    } catch (err) {
      // ignore network failures; simulation still produces local events
    }
  }
}

const SIM = new SimulationEngine();
export default SIM;
