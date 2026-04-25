import{y as e}from"./styled-components.browser.esm-DDkbN7W9.js";const l=e.div`
  /* Design tokens inspired by Tailwind prototype */
  --surface: #0b1326;
  --on-surface: #dae2fd;
  --on-surface-variant: #98a6bf;
  --primary: #adc6ff;
  --primary-strong: #4b8eff;
  --secondary: #4edea3;
  --surface-container: #171f33;
  --surface-container-highest: #2d3449;
  --outline: #8b90a0;
  --surface-container-low: #131b2e;
  --primary-container: #4b8eff;
  --secondary-container: #00a572;
  --tertiary-container: #ff5451;
  --surface-dim: #0b1326;
  display: flex;
  min-height: 100vh;
  overflow: hidden;
  background: var(--surface);
  color: var(--on-surface);
  font-family: var(--font-body, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial);
`;e.aside`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 18rem;
  position: fixed;
  left: 0;
  top: 0;
  padding: 1.5rem;
  background: #131b2e;
  border-right: 1px solid rgba(65,71,85,0.15);
  z-index: 40;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;e.div`
  padding: 0 0.5rem;
  margin-bottom: 2.5rem;
`;e.h2`
  color: var(--on-surface, #dae2fd);
  font-family: var(--font-headline, Manrope, sans-serif);
  font-weight: 800;
  font-size: 0.75rem;
  letter-spacing: 0.2em;
  margin-bottom: 0.25rem;
`;e.p`
  font-size: 0.625rem;
  color: var(--primary, #adc6ff);
  font-family: monospace;
`;e.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0 0.5rem;
`;const s=e.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: #c1c6d7;
  border-radius: 0.125rem;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
  &:hover { background: #171f33; color: #e6eef8; }
`;e(s)`
  background: #222a3d;
  color: #4b8eff;
  border-left: 4px solid #4b8eff;
  font-weight: 700;
`;e.div`
  padding: 0 0.5rem;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;e.button`
  width: 100%;
  background: #4b8eff;
  color: #001a41;
  padding: 0.75rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  text-transform: uppercase;
  cursor: pointer;
  border: none;
`;const m=e.main`
  margin-left: 18rem;
  min-height: 100vh;
  background: var(--surface, #0b1326);
  position: relative;
  flex: 1;
  overflow-y: auto;
`;e.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 50;
  background: #0b1326;
  border-bottom: 1px solid rgba(65,71,85,0.15);
  box-shadow: 0 40px 40px -15px rgba(173,198,255,0.08);
  font-family: var(--font-headline, Manrope, sans-serif);
`;e.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;e.span`
  font-size: 1.125rem;
  font-weight: 800;
  color: #adc6ff;
`;e.nav`
  display: none;
  gap: 1.5rem;
  align-items: center;
  @media (min-width: 768px) { display: flex; }
`;e.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;e.input`
  background: #171f33;
  border: none;
  font-size: 0.75rem;
  border-radius: 9999px;
  padding: 0.5rem 1rem;
  width: 16rem;
  color: var(--on-surface-variant, #94a3b8);
`;const f=e.div`
  padding: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
`,p=e.div`
  flex: 1;
  max-width: 64rem;
`,g=e.form`
  display: block;
  gap: 2rem;
`,b=e.section`
  margin-bottom: 2rem;
`,u=e.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1rem;
`,h=e.h3`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--on-surface);
`,x=e.div`
  flex: 1;
  height: 1px;
  background: rgba(65,71,85,0.12);
`,v=e.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem 2rem;
`,y=e.input`
  width: 100%;
  background: transparent;
  border-bottom: 1px solid rgba(65,71,85,0.18);
  padding: 0.5rem 0;
  color: var(--on-surface, #dae2fd);
  font-family: monospace;
  font-size: 1rem;
  &:focus{ outline:none; border-bottom-color:#4b8eff; }
`,k=e.select`
  width: 100%;
  background: transparent;
  border-bottom: 1px solid rgba(65,71,85,0.18);
  padding: 0.5rem 0;
  color: var(--on-surface, #dae2fd);
  font-family: Inter, sans-serif;
  &:focus { outline:none; border-bottom-color:#4b8eff; }
`,w=e.button`
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  &[data-active="true"] {
    background: #171f33;
    color: #4b8eff;
    border: 1px solid rgba(75,142,255,0.15);
  }
`,z=e.div`
  background: #171f33;
  border-left: 4px solid rgba(75,142,255,0.25);
  padding: 1.25rem;
  border-radius: 0 0.5rem 0.5rem 0;
  &[data-primary="true"] {
    border-left-color: #4b8eff;
  }
`,T=e.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  align-items: end;
`,S=e.aside`
  width: 24rem;
  position: sticky;
  top: 6rem;
`,$=e.div`
  background: #171f33;
  border-radius: 0.5rem;
  border: 1px solid rgba(75,142,255,0.08);
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
`,M=e.div`
  padding: 1.5rem;
  border-bottom: 1px solid rgba(65,71,85,0.08);
`;e.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;e.div`
  font-size: 2rem;
  font-weight: 800;
  color: var(--on-surface, #dae2fd);
`;e.button`
  background: #4b8eff;
  color: #001a41;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-weight: 800;
  cursor: pointer;
  border: none;
`;const C=e.div`
  display: none;
  @media (max-width: 767px) {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #171f33;
    border-top: 1px solid rgba(65,71,85,0.15);
    justify-content: space-around;
    padding: 0.75rem;
    z-index: 50;
  }
`,B=e.span`
  &.material-symbols-outlined { font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24; }
`,P=e.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
`,F=e.h2`
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
`,W=e.p`
  margin-top: 0.375rem;
  color: var(--on-surface-variant, #98a6bf);
`,A=e.div`
  display: flex;
  gap: 0.75rem;
`,R=e.div`
  background: #0f1724;
  padding: 0.625rem 0.875rem;
  display: flex;
  gap: 0.75rem;
  align-items: center;
  border-left: 4px solid transparent;
  border-radius: 6px;
`,j=e.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
`,J=e.div`
  font-size: 0.6875rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  font-weight: 700;
`,O=e.div`
  background: #0f1724;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 1.25rem;
`,D=e.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`,L=e.div`
  font-size: 0.75rem;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-weight: 800;
  text-transform: uppercase;
  color: var(--on-surface-variant, #98a6bf);
`,I=e.div`
  font-size: 0.625rem;
  background: rgba(75,142,255,0.08);
  color: #4b8eff;
  padding: 4px 8px;
  border-radius: 6px;
`,Q=e.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
`,E=e.div`
  padding: 2.5rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
`;e.div`
  width: 18rem;
  flex: 0 0 18rem;
`;const G=e.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,H=e.div``,N=e.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 0.5rem;
`,K=e.div`
  font-size: 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: var(--on-surface, #dae2fd);
`,U=e.div`
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #4edea3;
`,q=e.div`
  height: 8px;
  background: #171f33;
  border-radius: 6px;
  overflow: hidden;
`,V=e.div`
  height: 100%;
  width: ${o=>o.w||"0%"};
  background: #4edea3;
`,X=e.div`
  margin-top: 0.5rem;
  font-size: 0.625rem;
  background: #00a57214;
  color: #4edea3;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 700;
  display: inline-block;
`;e.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
`;const a=e.div`
  background: #0f1724;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid rgba(0,0,0,0);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 10rem;
`;e(a)`
  border-left-color: #00a572;
`;e(a)`
  border-left-color: #4b8eff;
`;e(a)`
  border-left-color: rgba(148,163,184,0.2);
`;e.div`
  border: 2px dashed rgba(65,71,85,0.3);
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
  background: #0b1326;
`;const Y=e.div`
  display: grid;
  gap: 0.75rem;
`,Z=e.div`
  background: #0f1724;
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  align-items: center;
`,_=e.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-width: 12.5rem;
`;e.div``;const ee=e.div`
  font-size: 0.75rem;
  font-weight: 800;
`,oe=e.div`
  font-size: 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: var(--on-surface-variant, #98a6bf);
`,re=e.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${o=>o.bg||"transparent"};
  color: ${o=>o.color||"var(--on-surface)"};
  font-size: 1rem;
`,ae=e.div`
  background: ${o=>o.tone==="primary"?"#4b8eff14":o.tone==="secondary"?"#00a57214":"#171f33"};
  color: ${o=>o.tone==="primary"?"#4b8eff":o.tone==="secondary"?"#4edea3":"#98a6bf"};
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
`,te=e.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--on-surface);
`,ne=e.p`
  margin-top: 6px;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.75rem;
  color: var(--on-surface-variant);
`,ie=e.button`
  flex: 1;
  padding: 8px 10px;
  background: var(--surface-container);
  color: var(--on-surface-variant, #94a3b8);
  border-radius: 6px;
  border: none;
  cursor: pointer;
`,se=e.button`
  padding: 8px;
  border-radius: 6px;
  border: none;
  background: ${o=>o.active?"#00a57222":"#171f33"};
  color: ${o=>o.active?"#00a572":"#98a6bf"};
  cursor: pointer;
`,de=e.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`,ce=e.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  @media (max-width: 1200px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 760px)  { grid-template-columns: 1fr; }
`,le=e.div`
  background: #0f1724;
  padding: 1rem;
  border-radius: 10px;
  border-left: 4px solid ${({$accent:o})=>o??"rgba(148,163,184,0.2)"};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 10rem;
  transition: box-shadow 0.15s;
  &:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
`,me=e.button`
  background: transparent;
  border: 2px dashed rgba(65,71,85,0.4);
  border-radius: 10px;
  padding: 1.25rem;
  text-align: center;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 10rem;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  &:hover {
    border-color: #4b8eff;
    color: #adc6ff;
    background: rgba(75,142,255,0.04);
  }
`,fe=e.span`
  font-family: 'Material Symbols Outlined';
  font-size: 2rem;
  line-height: 1;
`,pe=e.div`
  background: rgba(13,20,34,0.98);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.5rem;
  grid-column: 1 / -1;
`,ge=e.div`
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
  margin-bottom: 1rem;
`,be=e.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
  @media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
`,ue=e.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.5rem;
  border-radius: 0.75rem;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  background: ${({$selected:o,$accent:r})=>o?`${r}1a`:"rgba(255,255,255,0.03)"};
  border: 1.5px solid ${({$selected:o,$accent:r})=>o?r:"rgba(255,255,255,0.06)"};
  color: ${({$selected:o,$accent:r})=>o?r:"#64748b"};
  &:hover { border-color: ${({$accent:o})=>o}; color: ${({$accent:o})=>o}; background: ${({$accent:o})=>o}14; }
`,he=e.div`
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.625rem;
  background: ${({$bg:o})=>o};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`,xe=e.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.625rem;
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.06);
`,ve=e.nav`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #64748b;
  margin-bottom: 1.5rem;
  letter-spacing: -0.01em;
`,ye=e.span`
  cursor: pointer;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`,ke=e.span`
  font-size: 14px;
  user-select: none;
  font-family: 'Material Symbols Outlined';
`,we=e.span`
  color: #dae2fd;
`,ze=e.header`
  margin-bottom: 2.5rem;
`,Te=e.h1`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #dae2fd;
  margin: 0 0 0.5rem;
`,Se=e.p`
  color: var(--on-surface-variant, #98a6bf);
  max-width: 42rem;
  margin: 0;
  line-height: 1.6;
`,$e=e.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
`,Me=e.section`
  grid-column: span 7;
  background: #131b2e;
  padding: 2rem;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
  @media (max-width: 1024px) { grid-column: span 12; }
`,Ce=e.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 3.75rem;
  color: rgba(65, 71, 85, 0.3);
  user-select: none;
`,Be=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.5rem;
`,Pe=e.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,Fe=e.label`
  display: block;
  font-size: 0.6875rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #64748b;
  margin-bottom: 0.5rem;
`,We=e.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
`,Ae=e.div`
  display: flex;
  align-items: center;
  gap: 2rem;
  padding-top: 1rem;
`,Re=e.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
`,je=e.div`
  position: relative;
  width: 2.5rem;
  height: 1.25rem;
  border-radius: 9999px;
  background: ${o=>o.$checked?"#4edea3":"#222a3d"};
  transition: background 0.2s;
  flex-shrink: 0;
`,Je=e.div`
  position: absolute;
  top: 0.125rem;
  left: ${o=>o.$checked?"calc(100% - 1rem - 0.125rem)":"0.125rem"};
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.2s;
`,Oe=e.span`
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #94a3b8;
`,De=e.div`
  display: flex;
  gap: 1rem;
  padding-top: 1.5rem;
`,Le=e.button`
  padding: 0.75rem 1.5rem;
  background: #222a3d;
  color: #dae2fd;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: 1px solid rgba(65, 71, 85, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.15s;
  &:hover { background: #31394d; }
`,Ie=e.button`
  padding: 0.75rem 1.5rem;
  background: #4b8eff;
  color: #001a41;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 15px -3px rgba(75, 142, 255, 0.2);
  transition: filter 0.15s;
  &:hover { filter: brightness(1.1); }
`,Qe=e.div`
  grid-column: span 5;
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 2rem;
  @media (max-width: 1024px) { grid-column: span 12; }
`,Ee=e.div`
  background: #171f33;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(65, 71, 85, 0.1);
  position: relative;
  overflow: hidden;
`,Ge=e.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`,He=e.h3`
  font-size: 0.625rem;
  text-transform: uppercase;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  letter-spacing: 0.1em;
  color: #64748b;
  margin: 0 0 0.25rem;
`,Ne=e.div`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 2.5rem;
  font-weight: 800;
  color: #dae2fd;
  line-height: 1.1;
`,Ke=e.span`
  font-size: 1.125rem;
  font-weight: 400;
  color: #64748b;
  margin-left: 0.25rem;
`,Ue=e.div`
  display: flex;
  align-items: flex-end;
  gap: 0.25rem;
  height: 4rem;
  width: 100%;
  opacity: 0.5;
  margin-top: 0.5rem;
`,qe=e.div`
  flex: 1;
  background: #4edea3;
  height: ${o=>o.$h};
  opacity: ${o=>o.$op??1};
`,Ve=e.div`
  background: #171f33;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  flex-direction: column;
  justify-content: center;
`,Xe=e.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`,Ye=e.div`
  border-left: 2px solid ${o=>o.$accent||"#adc6ff"};
  padding-left: 1rem;
`,Ze=e.div`
  font-size: 0.625rem;
  text-transform: uppercase;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  letter-spacing: 0.1em;
  color: #64748b;
  margin-bottom: 0.25rem;
`,_e=e.div`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 1.5rem;
  color: #dae2fd;
`,eo=e.section`
  grid-column: span 12;
  background: #131b2e;
  border-radius: 0.5rem;
  overflow: hidden;
`,oo=e.div`
  padding: 1rem 2rem;
  background: #171f33;
  border-bottom: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`,ro=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #cbd5e1;
  margin: 0;
`,ao=e.span`
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #4edea3;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,to=e.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4edea3;
  animation: rmq-pulse 2s ease-in-out infinite;
  @keyframes rmq-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
`,no=e.table`
  width: 100%;
  text-align: left;
  border-collapse: collapse;
`,io=e.th`
  padding: 1rem 2rem;
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 500;
  background: rgba(6, 14, 32, 0.5);
`,so=e.tr`
  border-bottom: 1px solid rgba(65, 71, 85, 0.1);
  transition: background 0.15s;
  &:hover { background: rgba(34, 42, 61, 0.5); }
`,t=e.td`
  padding: 1rem 2rem;
  font-size: 0.875rem;
`,co=e(t)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #adc6ff;
`,lo=e(t)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
`,mo=e.span`
  padding: 2px 8px;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: ${o=>o.$status==="active"?"#00a572":o.$status==="slow"?"#ff5451":"#222a3d"};
  color: ${o=>o.$status==="active"?"#00311f":o.$status==="slow"?"#5c0008":"#94a3b8"};
`,fo=e.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`,po=e.div`
  position: relative;
  display: inline-block;
`,go=e.div`
  position: absolute;
  right: 0;
  top: 1.75rem;
  background: #0f1724;
  border: 1px solid rgba(65,71,85,0.12);
  border-radius: 6px;
  padding: 0.25rem;
  min-width: 12rem;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
  z-index: 100;
`,bo=e.button`
  display: block;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  color: #dae2fd;
  border: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.875rem;
  &:hover { background: rgba(75,142,255,0.06); color: #adc6ff; }
`,uo=e.header`
  margin-bottom: 2.5rem;
`,ho=e.h1`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #dae2fd;
  margin: 0 0 0.5rem;
`,xo=e.p`
  color: var(--on-surface-variant, #98a6bf);
  max-width: 42rem;
  margin: 0;
  line-height: 1.6;
`,vo=e.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
`,yo=e.div`
  grid-column: span 12;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`,ko=e.button`
  background: #131b2e;
  border: 2px solid ${o=>o.$selected?o.$accent:"rgba(65,71,85,0.2)"};
  border-radius: 0.75rem;
  padding: 1.5rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  transition: border-color 0.2s, box-shadow 0.2s;
  position: relative;
  box-shadow: ${o=>o.$selected?`0 0 0 1px ${o.$accent}33, 0 8px 24px rgba(0,0,0,0.4)`:"none"};
  &:hover { border-color: ${o=>o.$accent}; }
`,wo=e.div`
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  background: ${o=>o.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.5rem;
`,zo=e.div`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1rem;
  font-weight: 700;
  color: #dae2fd;
  margin-bottom: 0.25rem;
`,To=e.div`
  font-size: 0.75rem;
  color: var(--on-surface-variant, #98a6bf);
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
`,So=e.div`
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: ${o=>o.$accent};
  color: #ffffff;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${o=>o.$visible?1:0};
  transition: opacity 0.2s;
  font-family: 'Material Symbols Outlined';
`,$o=e.section`
  grid-column: span 7;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  @media (max-width: 1024px) { grid-column: span 12; }
`,Mo=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.75rem;
`,Co=e.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
`,Bo=e.div`
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: #0b1326;
  border-radius: 0.5rem;
  border: 1px solid rgba(65,71,85,0.15);
`,Po=e.div`
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: ${o=>o.$color}14;
  color: ${o=>o.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-family: 'Material Symbols Outlined';
  font-size: 1rem;
`,Fo=e.div`
  flex: 1;
`,Wo=e.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #dae2fd;
  margin-bottom: 0.125rem;
`,Ao=e.div`
  font-size: 0.6875rem;
  color: var(--on-surface-variant, #98a6bf);
  line-height: 1.5;
`,Ro=e.div`
  margin-left: auto;
  flex-shrink: 0;
`,jo=e.button`
  width: 100%;
  padding: 0.875rem 1.5rem;
  border-radius: 0.5rem;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: ${o=>o.$provider==="disabled"?"not-allowed":"pointer"};
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  transition: filter 0.15s, box-shadow 0.15s;
  background: ${o=>o.$provider==="google"?"linear-gradient(135deg,#4285f4,#34a853)":o.$provider==="microsoft"?"linear-gradient(135deg,#00a4ef,#7fba00)":"#222a3d"};
  color: ${o=>o.$provider==="disabled"?"#64748b":"#ffffff"};
  box-shadow: ${o=>o.$provider==="google"?"0 8px 24px rgba(66,133,244,0.3)":o.$provider==="microsoft"?"0 8px 24px rgba(0,164,239,0.3)":"none"};
  &:hover:not(:disabled) { filter: brightness(1.08); }
`,Jo=e.div`
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.6875rem;
  color: #64748b;
  line-height: 1.5;
`,Oo=e.section`
  grid-column: span 5;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  @media (max-width: 1024px) { grid-column: span 12; }
`,Do=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.75rem;
`,Lo=e.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`,Io=e.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,Qo=e.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.375rem;
  background: ${o=>o.$selected?"rgba(75,142,255,0.08)":"transparent"};
  border: 1px solid ${o=>o.$selected?"rgba(75,142,255,0.25)":"transparent"};
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.8125rem;
  color: ${o=>o.$selected?"#adc6ff":"#94a3b8"};
  &:hover { background: rgba(75,142,255,0.05); }
`,Eo=e.div`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  border: 2px solid ${o=>o.$selected?"#4b8eff":"#414755"};
  position: relative;
  flex-shrink: 0;
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: #4b8eff;
    opacity: ${o=>o.$selected?1:0};
    transition: opacity 0.15s;
  }
`,Go=e.section`
  grid-column: span 12;
  background: #131b2e;
  border-radius: 0.75rem;
  overflow: hidden;
`,Ho=e.div`
  padding: 1rem 2rem;
  background: #171f33;
  border-bottom: 1px solid rgba(65,71,85,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`,No=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #cbd5e1;
  margin: 0;
`,Ko=e.table`
  width: 100%;
  text-align: left;
  border-collapse: collapse;
`,Uo=e.th`
  padding: 1rem 2rem;
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 500;
  background: rgba(6,14,32,0.5);
`,qo=e.tr`
  border-bottom: 1px solid rgba(65,71,85,0.1);
  transition: background 0.15s;
  &:hover { background: rgba(34,42,61,0.5); }
`,n=e.td`
  padding: 1rem 2rem;
  font-size: 0.875rem;
  color: #dae2fd;
`,Vo=e(n)`
  width: 2.5rem;
  padding-right: 0;
`,Xo=e.div`
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: ${o=>o.$bg};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
`,Yo=e(n)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #adc6ff;
`,Zo=e.span`
  padding: 2px 8px;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: ${o=>o.$ok?"#00a572":"#ff5451"};
  color: ${o=>o.$ok?"#00311f":"#5c0008"};
`,_o=e.button`
  background: transparent;
  border: 1px solid rgba(255,84,81,0.25);
  color: #ff5451;
  border-radius: 0.25rem;
  padding: 4px 10px;
  font-size: 0.625rem;
  font-weight: 700;
  font-family: var(--font-headline, Manrope, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(255,84,81,0.1); }
`,er=e.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2rem;
`,or=e.div`
  grid-column: span 12;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`,rr=e.section`
  grid-column: span 7;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  position: relative;
  overflow: hidden;
  @media (max-width: 1024px) { grid-column: span 12; }
`,ar=e.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 3.75rem;
  color: rgba(65,71,85,0.25);
  user-select: none;
`,tr=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.75rem;
`,nr=e.div`
  position: relative;
`,ir=e.button`
  position: absolute;
  right: 0;
  bottom: 0.5rem;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`,sr=e.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
`,dr=e.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,cr=e.div`
  flex: 1;
  background: #0b1326;
  border: 1px solid rgba(65,71,85,0.2);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,lr=e.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #ff5451; }
`,mr=e.button`
  background: transparent;
  border: 1px dashed rgba(65,71,85,0.4);
  border-radius: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.6875rem;
  font-weight: 600;
  font-family: var(--font-headline, Manrope, sans-serif);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: border-color 0.15s, color 0.15s;
  &:hover { border-color: #adc6ff; color: #adc6ff; }
`,fr=e.section`
  grid-column: span 5;
  background: #131b2e;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  @media (max-width: 1024px) { grid-column: span 12; }
`,pr=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.25rem;
`,gr=e.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.875rem 1rem;
  background: #0b1326;
  border-radius: 0.5rem;
  border: 1px solid rgba(65,71,85,0.12);
  gap: 1rem;
`,br=e.div``,ur=e.div`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #dae2fd;
  margin-bottom: 0.125rem;
`,hr=e.div`
  font-size: 0.6875rem;
  color: var(--on-surface-variant, #98a6bf);
  line-height: 1.5;
`,xr=e.section`
  grid-column: span 12;
  background: #131b2e;
  border-radius: 0.75rem;
  overflow: hidden;
`,vr=e.div`
  padding: 1rem 2rem;
  background: #171f33;
  border-bottom: 1px solid rgba(65,71,85,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`,yr=e.h2`
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #cbd5e1;
  margin: 0;
`,kr=e.table`
  width: 100%;
  text-align: left;
  border-collapse: collapse;
`,wr=e.th`
  padding: 1rem 2rem;
  font-size: 0.625rem;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #64748b;
  font-weight: 500;
  background: rgba(6,14,32,0.5);
`,zr=e.tr`
  border-bottom: 1px solid rgba(65,71,85,0.1);
  transition: background 0.15s;
  &:hover { background: rgba(34,42,61,0.5); }
`,i=e.td`
  padding: 1rem 2rem;
  font-size: 0.875rem;
  color: #dae2fd;
`,Tr=e(i)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #adc6ff;
`,Sr=e(i)`
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  color: #98a6bf;
  font-size: 0.8125rem;
`,$r=e.span`
  padding: 2px 8px;
  border-radius: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  background: ${o=>o.$status==="syncing"?"#4b8eff22":o.$status==="error"?"#ff5451":"#222a3d"};
  color: ${o=>o.$status==="syncing"?"#4b8eff":o.$status==="error"?"#5c0008":"#94a3b8"};
`,Mr=e.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`,Cr=e.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.25rem;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`,Br=e.div`
  grid-column: 1;
  grid-row: 1 / 3;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
  position: relative;
  overflow: hidden;
`,Pr=e.span`
  position: absolute;
  top: -1rem; right: -1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 9rem;
  color: rgba(255,255,255,0.03);
  pointer-events: none;
  user-select: none;
  line-height: 1;
`,Fr=e.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1.25rem;
`,Wr=e.div`
  display: flex;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
`,Ar=e.button`
  flex: 1;
  padding: 0.5rem 0;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  background: ${({$active:o})=>o?"rgba(75,142,255,0.18)":"rgba(255,255,255,0.04)"};
  border: 1.5px solid ${({$active:o})=>o?"#4b8eff":"rgba(255,255,255,0.08)"};
  color: ${({$active:o})=>o?"#adc6ff":"#64748b"};
  &:hover { border-color: #4b8eff; color: #adc6ff; }
`,Rr=e.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 8rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.5rem;
  color: #c8d8f0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  padding: 0.625rem 0.75rem;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  &::placeholder { color: #475569; }
  &:focus { border-color: rgba(75,142,255,0.5); }
`,jr=e.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0;
  border-top: 1px solid rgba(255,255,255,0.06);
`,Jr=e.span`
  font-size: 0.8125rem;
  color: #94a3b8;
`,Or=e.code`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: #4edea3;
  background: rgba(78,222,163,0.08);
  border-radius: 0.25rem;
  padding: 0.125rem 0.375rem;
`,Dr=e.div`
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.5rem;
`,Lr=e.h3`
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 1rem;
`,Ir=e.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  &:last-child { border-bottom: none; }
`,Qr=e.span`
  font-size: 0.8125rem;
  color: #64748b;
`,Er=e.span`
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: #adc6ff;
  font-weight: 600;
`,Gr=e.div`
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  overflow: hidden;
`,Hr=e.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`,Nr=e.h3`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`,Kr=e.table`
  width: 100%;
  border-collapse: collapse;
`,Ur=e.th`
  padding: 0.625rem 1.25rem;
  text-align: left;
  font-size: 0.75rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  background: rgba(255,255,255,0.02);
`,qr=e.tr`
  border-top: 1px solid rgba(255,255,255,0.05);
  transition: background 0.12s;
  &:hover { background: rgba(255,255,255,0.025); }
`,d=e.td`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: #94a3b8;
  vertical-align: middle;
`,Vr=e(d)`
  font-family: 'JetBrains Mono', monospace;
  color: #c8d8f0;
`,Xr=e.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.1875rem 0.625rem;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({$status:o})=>o==="connected"?"rgba(78,222,163,0.12)":o==="idle"?"rgba(75,142,255,0.12)":"rgba(255,100,100,0.12)"};
  color: ${({$status:o})=>o==="connected"?"#4edea3":o==="idle"?"#adc6ff":"#ff6464"};
`,Yr=e.button`
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.125rem;
  display: flex;
  align-items: center;
  transition: color 0.15s;
  &:hover { color: #4edea3; }
`,Zr=e.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.25rem;
  @media (max-width: 1100px) { grid-template-columns: 1fr; }
`,_r=e.div`
  grid-column: 1;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
  position: relative;
  overflow: hidden;
`,ea=e.span`
  position: absolute;
  top: -1rem; right: -1rem;
  font-family: 'Material Symbols Outlined';
  font-size: 9rem;
  color: rgba(255,255,255,0.03);
  pointer-events: none;
  user-select: none;
  line-height: 1;
`,oa=e.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1.25rem;
`,ra=e.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  margin-bottom: 1.25rem;
`,aa=e.code`
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: #4edea3;
  word-break: break-all;
`,ta=e.button`
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Material Symbols Outlined';
  font-size: 1.125rem;
  color: #64748b;
  flex-shrink: 0;
  transition: color 0.15s;
  &:hover { color: #adc6ff; }
`,na=e.div`
  display: flex;
  align-items: flex-end;
  gap: 0.625rem;
  margin-bottom: 1.25rem;
`,ia=e.div`
  flex: 1;
`,sa=e.button`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5625rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.10);
  color: #94a3b8;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(75,142,255,0.14); border-color: #4b8eff; color: #adc6ff; }
`,da=e.div`
  grid-column: 2;
  grid-row: 1;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
`,ca=e.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1rem;
`,la=e.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  &:last-child { border-bottom: none; }
`,ma=e.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`,fa=e.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: #c8d8f0;
  font-family: 'JetBrains Mono', monospace;
`,pa=e.span`
  font-size: 0.75rem;
  color: #64748b;
`,ga=e.div`
  grid-column: 2;
  grid-row: 2;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  padding: 1.75rem;
`,ba=e.h2`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 1rem;
`,ua=e.div`
  grid-column: 1 / -1;
  background: rgba(17,25,40,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1rem;
  overflow: hidden;
`,ha=e.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
`,xa=e.h3`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
`,va=e.table`
  width: 100%;
  border-collapse: collapse;
`,ya=e.th`
  padding: 0.625rem 1.25rem;
  text-align: left;
  font-size: 0.75rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 500;
  background: rgba(255,255,255,0.02);
`,ka=e.tr`
  border-top: 1px solid rgba(255,255,255,0.05);
  transition: background 0.12s;
  &:hover { background: rgba(255,255,255,0.025); }
`,wa=e.td`
  padding: 0.75rem 1.25rem;
  font-size: 0.8125rem;
  color: #94a3b8;
  vertical-align: middle;
`,za=e.span`
  display: inline-flex;
  padding: 0.1875rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  background: rgba(75,142,255,0.10);
  color: #adc6ff;
`,Ta=e.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  padding: 0.1875rem 0.625rem;
  border-radius: 99px;
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${({$status:o})=>o==="delivered"?"rgba(78,222,163,0.12)":o==="pending"?"rgba(251,188,5,0.12)":"rgba(255,100,100,0.12)"};
  color: ${({$status:o})=>o==="delivered"?"#4edea3":o==="pending"?"#fbbc05":"#ff6464"};
`,Sa=e.button`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.625rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  color: #64748b;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(75,142,255,0.12); border-color: #4b8eff; color: #adc6ff; }
`;export{hr as $,ir as A,ve as B,f as C,dr as D,uo as E,g as F,v as G,cr as H,B as I,lr as J,mr as K,p as L,C as M,De as N,Le as O,w as P,Ie as Q,S as R,b as S,z as T,fr as U,pr as V,sr as W,gr as X,Po as Y,br as Z,ur as _,u as a,Ue as a$,xr as a0,vr as a1,yr as a2,ao as a3,to as a4,kr as a5,wr as a6,zr as a7,i as a8,Xo as a9,Go as aA,Ho as aB,No as aC,Ko as aD,Uo as aE,qo as aF,Vo as aG,Yo as aH,n as aI,Zo as aJ,ze as aK,Te as aL,Se as aM,Me as aN,k as aO,Oe as aP,$e as aQ,Ce as aR,Be as aS,We as aT,Ae as aU,Qe as aV,Ee as aW,Ge as aX,He as aY,Ne as aZ,Ke as a_,Tr as aa,Sr as ab,$r as ac,Mr as ad,_o as ae,Re as af,je as ag,Je as ah,vo as ai,yo as aj,$o as ak,Mo as al,Co as am,Bo as an,Fo as ao,Wo as ap,Ao as aq,Ro as ar,jo as as,Jo as at,Oo as au,Do as av,Lo as aw,Io as ax,Qo as ay,Eo as az,h as b,ua as b$,qe as b0,Ve as b1,Xe as b2,Ye as b3,Ze as b4,_e as b5,eo as b6,oo as b7,ro as b8,no as b9,Hr as bA,Nr as bB,Kr as bC,Ur as bD,qr as bE,Vr as bF,d as bG,Xr as bH,Yr as bI,Zr as bJ,_r as bK,ea as bL,oa as bM,ra as bN,aa as bO,ta as bP,na as bQ,ia as bR,sa as bS,da as bT,ca as bU,la as bV,ma as bW,fa as bX,pa as bY,ga as bZ,ba as b_,io as ba,so as bb,co as bc,lo as bd,t as be,mo as bf,po as bg,fo as bh,go as bi,bo as bj,Cr as bk,Br as bl,Pr as bm,Fr as bn,Wr as bo,Ar as bp,Rr as bq,jr as br,Jr as bs,Or as bt,Dr as bu,Lr as bv,Ir as bw,Qr as bx,Er as by,Gr as bz,x as c,ha as c0,xa as c1,va as c2,ya as c3,wa as c4,ka as c5,za as c6,Ta as c7,Sa as c8,l as c9,ne as cA,de as cB,ie as cC,se as cD,me as cE,fe as cF,pe as cG,ge as cH,be as cI,ue as cJ,he as cK,xe as cL,Y as cM,Z as cN,_ as cO,ee as cP,oe as cQ,m as ca,P as cb,F as cc,W as cd,A as ce,R as cf,j as cg,J as ch,G as ci,O as cj,D as ck,L as cl,I as cm,Q as cn,H as co,N as cp,K as cq,U as cr,q as cs,V as ct,X as cu,ce as cv,le as cw,re as cx,ae as cy,te as cz,T as d,$ as e,M as f,E as g,ye as h,ke as i,we as j,ho as k,xo as l,er as m,or as n,ko as o,wo as p,zo as q,To as r,So as s,rr as t,ar as u,tr as v,Pe as w,Fe as x,nr as y,y as z};
