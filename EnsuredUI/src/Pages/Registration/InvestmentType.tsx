import React, { useState } from 'react'
import SideNavBar from '../../xds/components/SideNavBar'
import { Button } from '../../xds/components/Button'
import SelectionCard from '../../xds/components/SelectionCard'
import InfoCard from '../../xds/components/InfoCard'
import { colors } from '../../xds/colors'

type ProfileType = 'institutional' | 'retail' | null

const cardStyle: React.CSSProperties = {
	borderRadius: 16,
	padding: 28,
	background: colors.surfaceContainer,
	boxShadow: '0 8px 30px rgba(2,6,23,0.6)',
	display: 'flex',
	flexDirection: 'column',
	minHeight: 360,
}

// using shared InfoCard component from xds/components

const InvestmentType: React.FC = () => {
	const [selected, setSelected] = useState<ProfileType>(null)

	return (
			<main >
				<section style={{ marginBottom: 40 }}>
					<h1 style={{ fontSize: 40, margin: 0, fontWeight: 900 }}>Define Your <span style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`, WebkitBackgroundClip: 'text' as any, color: 'transparent' }}>Investment Architecture.</span></h1>
					<p style={{ color: colors.onSurfaceVariant, marginTop: 10, maxWidth: 680 }}>Select your operational profile to access specialized tranches, custom liquidity pools, and programmable risk parameters.</p>
				</section>

				<section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
					<SelectionCard
						title="Institutional"
						subtitle="High Density Access"
						icon={'🏛️'}
						accentColor={colors.primary}
						active={selected === 'institutional'}
						onClick={() => setSelected('institutional')}
						footerLabel="Requires LEI Verification"
						ctaText="Configure Entity"
					>
						<p style={{ color: colors.onSurfaceVariant, marginBottom: 18 }}>For entities, sovereign wealth funds, and corporate treasuries requiring programmatic capital allocation and direct ledger interaction.</p>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Bespoke Risk Tranches</div></div>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Tax-Optimized Structures</div></div>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Full API Node Access</div></div>
						</div>
					</SelectionCard>

					<SelectionCard
						title="Retail Accredited"
						subtitle="Verified Individual"
						icon={'👤'}
						accentColor={colors.secondary}
						active={selected === 'retail'}
						onClick={() => setSelected('retail')}
						footerLabel="Accreditation Auto-Check"
						ctaText="Proceed as Individual"
					>
						<p style={{ color: colors.onSurfaceVariant, marginBottom: 18 }}>For professional individual investors seeking institutional-grade reinsurance yield through a streamlined, low-latency interface.</p>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Curated Opportunity Funds</div></div>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Simplified Dashboard UI</div></div>
							<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ color: colors.secondary }}>✔</span><div style={{ fontSize: 12, color: colors.onSurface }}>Lower Minimum Thresholds</div></div>
						</div>
					</SelectionCard>
				</section>

				<section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
					<InfoCard title="Global TVL Index" value="$1.24B" tone="primary" />
					<InfoCard title="Active Claims Pool" value="312" tone="secondary" />
					<InfoCard title="Epoch Status" value="Settling" tone="secondary" />
				</section>

				<footer style={{ marginTop: 28, borderTop: `1px solid ${colors.outlineVariant}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
						<div style={{ width: 44, height: 44, borderRadius: 8, background: colors.surfaceContainerHighest, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
							🔒
						</div>
						<p style={{ maxWidth: 520, color: colors.onSurfaceVariant, fontSize: 13 }}>Programmable Capital utilizes end-to-end encryption for all identity verification. Your data is stored on-ledger with zero-knowledge proof protocols.</p>
					</div>

					<div style={{ display: 'flex', gap: 12 }}>
						<Button variant="ghost" style={{ background: 'transparent', border: `1px solid ${colors.outlineVariant}`, color: colors.onSurfaceVariant }}>Back</Button>
						<Button variant="primary" onClick={() => selected ? alert(`Proceeding as ${selected}`) : alert('Please select a profile')} style={{ padding: '10px 20px', fontWeight: 800 }}>{selected ? 'Continue' : 'Skip for now'}</Button>
					</div>
				</footer>
			</main>
	)
}

export default InvestmentType
