import React, { useState } from 'react';
import { Meta, Story } from '@storybook/react';
import { useAuthMe } from '../lib/useAuthMe';
import { saveAuthToken } from '../lib/auth';

const meta: Meta = {
  title: 'Pages/Auth/Me',
  parameters: { layout: 'centered' },
};

export default meta;

const Demo: React.FC<{ apiBase?: string }> = ({ apiBase }) => {
  const { user, loading, error, refresh } = useAuthMe();
  const [impersonateId, setImpersonateId] = useState('1');

  const doImpersonate = async () => {
    try {
      try { (window as any).__API_BASE__ = apiBase ?? ''; } catch (e) {}
      const base = (window as any).__API_BASE__ ?? (import.meta as any).env?.VITE_API_BASE ?? '';
      const url = (base ? String(base).replace(/\/$/, '') : '') + `/api/admin/impersonate/${impersonateId}`;
      const res = await fetch(url, { method: 'POST' });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        alert('Impersonation failed: ' + (b?.error || res.statusText));
        return;
      }
      const json = await res.json();
      const token = json?.token;
      if (token) {
        saveAuthToken(token);
        alert('Token saved');
        await refresh();
      } else {
        alert('No token returned');
      }
    } catch (err: any) {
      alert(String(err?.message || err));
    }
  };

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>API Base:</label>
        <input defaultValue={apiBase} onChange={(e) => { try { (window as any).__API_BASE__ = e.target.value; } catch (e) {} }} style={{ width: 300 }} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Impersonate user id:</label>
        <input value={impersonateId} onChange={(e) => setImpersonateId(e.target.value)} style={{ width: 80 }} />
        <button style={{ marginLeft: 8 }} onClick={doImpersonate}>Impersonate & Refresh</button>
        <button style={{ marginLeft: 8 }} onClick={() => { saveAuthToken(null); alert('token removed'); }}>Remove token</button>
      </div>

      <div style={{ border: '1px solid #ddd', padding: 12, minWidth: 320 }}>
        <h3>Auth /me</h3>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: 'red' }}>Error: {error}</div>}
        {user && (
          <div>
            <div><strong>ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Name:</strong> {user.firstName} {user.lastName}</div>
            <div><strong>Role:</strong> {user.role}</div>
            <div><strong>Organization:</strong> {String(user.organizationId ?? '—')}</div>
          </div>
        )}
        {!user && !loading && !error && <div>No authenticated user</div>}
      </div>
    </div>
  );
};

export const Default: Story = (args) => <Demo apiBase={args.apiBase} />;
Default.args = { apiBase: 'http://localhost:3001' };
