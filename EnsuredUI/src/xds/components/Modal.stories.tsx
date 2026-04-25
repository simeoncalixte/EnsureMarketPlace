import React, { useState } from 'react'
import type { Meta } from '@storybook/react'
import Modal from './Modal'
import { Button } from './Button'
import { colors } from '../colors'

const meta: Meta<typeof Modal> = {
  title: 'XDS/Modal',
  component: Modal
}

export default meta

export const Default = () => {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Review Capital Deployment">
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Asset Class</span>
            <span style={{ fontWeight: 700 }}>Catastrophe Bond Series A</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Allocated Principal</span>
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontWeight: 700 }}>$2,500,000.00</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Gas Limit (Projected)</span>
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}>0.0014 ETH</span>
          </div>
          <div style={{ background: 'rgba(11,18,32,0.6)', padding: 12, borderRadius: 8, borderLeft: `2px solid ${colors.brand[500]}`, fontSize: 12, color: 'var(--text-secondary)' }}>
            By confirming, you agree to the Sovereign Re Master Participation Agreement and acknowledge the risk coefficients defined in the smart contract.
          </div>
        </div>
      </Modal>
    </>
  )
}
