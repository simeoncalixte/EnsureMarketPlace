import React from 'react'
import { Button } from '../../xds/components/Button'
import InfoCard from '../../xds/components/InfoCard'
import Input from '../../xds/components/Input'
import Select from '../../xds/components/Select'
import { colors } from '../../xds/colors'

const BusinessConstitution: React.FC = () => {
  return (
    <main>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, margin: 0, fontWeight: 900 }}>Business Constitution</h1>
        <p style={{ color: colors.onSurfaceVariant, marginTop: 8, maxWidth: 720 }}>Define the legal parameters of your reinsurance entity for capital allocation modeling.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
          <section style={{ background: colors.surfaceContainerLow, padding: 24, borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -24, right: -24, width: 160, height: 160, background: `${colors.primary}20`, borderRadius: '50%', filter: 'blur(36px)' }} />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.onSurface }}>Entity Identification</h3>
            <p style={{ color: colors.onSurfaceVariant, marginTop: 12 }}>Provide core legal identity details for the underwriting entity.</p>

            <div style={{ marginTop: 18, display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, color: colors.outlineVariant }}>LEGAL ENTITY NAME</label>
                <Input placeholder="e.g. Sovereign Asset Management Ltd" style={{ padding: '12px 6px', borderBottom: `1px solid ${colors.outlineVariant}`, color: colors.onSurface }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, color: colors.outlineVariant }}>JURISDICTION</label>
                  <Select defaultValue="">
                    <option value="" disabled>Select Jurisdiction</option>
                    <option value="bermuda">Bermuda (Class 4)</option>
                    <option value="usa">United States</option>
                    <option value="uk">United Kingdom (Lloyd's)</option>
                    <option value="cayman">Cayman Islands</option>
                    <option value="singapore">Singapore (MAS)</option>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          <section style={{ background: colors.surfaceContainerLow, padding: 24, borderRadius: 16 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: colors.onSurface }}>Underwriting Capacity</h3>
            <p style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>Set expected capacity metrics used by the capital allocator.</p>

            <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1.5, color: colors.outlineVariant }}>ANNUAL GWP (USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: colors.primary, fontFamily: 'JetBrains Mono, monospace' }}>$</span>
                <Input placeholder="50,000,000.00" style={{ width: '100%', padding: '12px 12px 12px 36px', borderBottom: `1px solid ${colors.outlineVariant}`, color: colors.onSurface, fontSize: 18, fontFamily: 'JetBrains Mono, monospace' }} />
              </div>
              <p style={{ marginTop: 8, color: colors.onSurfaceVariant, fontSize: 13 }}>Enter projected annual GWP for the current fiscal year in USD.</p>
            </div>

            <div style={{ marginTop: 18, border: `1px dashed ${colors.outlineVariant}`, padding: 20, textAlign: 'center', borderRadius: 12, background: colors.surfaceContainerLowest }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: colors.surfaceContainerHigh, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>⬆️</div>
              <div style={{ fontWeight: 700, color: colors.onSurface }}>Accreditation Documentation</div>
              <div style={{ color: colors.onSurfaceVariant, marginTop: 6 }}>Drag and drop regulatory certificates or upload PDF</div>
              <div style={{ marginTop: 12 }}>
                <Button variant="ghost">Browse Files</Button>
              </div>
            </div>
          </section>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <button style={{ background: 'transparent', border: 'none', color: colors.outlineVariant, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              ← Previous Step
            </button>
            <button style={{ background: colors.primaryContainer, color: colors.onPrimaryContainer, padding: '12px 24px', borderRadius: 12, fontWeight: 800, border: 'none', cursor: 'pointer' }}>Continue to Verification</button>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: colors.surfaceContainer, padding: 16, borderRadius: 12, borderLeft: `4px solid ${colors.primaryContainer}` }}>
            <h4 style={{ margin: 0, color: colors.primary, fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Regulatory Insight</h4>
            <p style={{ color: colors.onSurfaceVariant, marginTop: 10, fontSize: 13 }}>Jurisdiction selection determines available capital tranches and compliance requirements for contracts.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, color: colors.onSurfaceVariant, fontSize: 12 }}>
              <span style={{ color: colors.secondary }}>✔</span>
              <span>Solvency &amp; Capital Rules Applied</span>
            </div>
          </div>

          <div style={{ background: colors.surfaceContainerLow, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ height: 160, backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: "url('https://images.unsplash.com/photo-1507679799987-c73779587ccf')" }} />
            <div style={{ padding: 12 }}>
              <h4 style={{ margin: 0, color: colors.onSurface, fontWeight: 800 }}>Institutional Standards</h4>
              <p style={{ marginTop: 8, color: colors.onSurfaceVariant, fontSize: 13 }}>All data is encrypted with AES-256 and stored in sovereign data vaults.</p>
            </div>
          </div>

          <div style={{ background: colors.surfaceContainerLow, padding: 12, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, color: colors.outlineVariant, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              <span>ENCRYPTION STRENGTH</span>
              <span style={{ color: colors.secondary }}>ACTIVE</span>
            </div>
            <div style={{ width: '100%', height: 8, background: colors.surfaceContainerHighest, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: '100%', height: '100%', background: colors.secondary }} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}

export default BusinessConstitution
