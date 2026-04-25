import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as h}from"./index-B3TfwC44.js";import{y as r}from"./styled-components.browser.esm-DDkbN7W9.js";import{M as de}from"./MapPanel-BgXlA3na.js";const le=r.div`
  background: var(--surface, #071026);
  color: var(--on-surface, #e6eef8);
  font-family: var(--font-body, Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial);
  ::selection {
    background: var(--primary-container, rgba(75,142,255,0.12));
    color: var(--on-primary-container, #fff);
  }
`;r.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 4rem;
  background: rgba(11,19,38,0.6);
  backdrop-filter: blur(8px);
  z-index: 50;
  box-shadow: 0 40px 64px rgba(173,198,255,0.08);
`;r.aside`
  position: fixed;
  left: 0;
  top: 0;
  height: 100%;
  width: 16rem;
  background: #0b1326;
  border-right: 1px solid rgba(65,71,85,0.15);
  display: flex;
  flex-direction: column;
  padding-top: 5rem;
  padding-bottom: 1rem;
  z-index: 40;
`;const ce=r.main`
  width: 100%;
  padding: 0;
  min-height: auto;
  background: var(--surface, #071026);
`,me=r.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 2rem;
  background: #131b2e;
  border-top: 1px solid rgba(65,71,85,0.15);
  font-family: monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;r.nav`
  flex: 1;
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;r.span`
  font-size: 1.125rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #e6eef8;
`;r.div`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background: var(--surface-variant, #1f2a3a);
  overflow: hidden;
`;const pe=r.section`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  margin-bottom: 3rem;
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`,fe=r.aside`
  width: 100%;
  max-width: 18rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2rem;
`,ge=r.div`
  flex: 1;
`,D=r.div`
  background: var(--surface-container-low, #0f1724);
  padding: 1.5rem;
  border-left: 4px solid transparent;
`;r.a`
  font-family: var(--font-headline, inherit);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #4b8eff;
  border-bottom: 2px solid #4b8eff;
  padding-bottom: 0.25rem;
`;r.a`
  font-family: var(--font-headline, inherit);
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #94a3b8;
  transition: color 160ms;
  &:hover { color: #e6eef8; }
`;const he=r.a`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #94a3b8;
  font-weight: 500;
  font-size: 0.875rem;
  border-radius: 0.25rem;
  transition: background-color 160ms, color 160ms, transform 200ms;
  &:hover { background: #0f1728; color: #e6eef8; }
`;r(he)`
  background: #171f33;
  color: #4b8eff;
  border-left: 2px solid #4b8eff;
`;const J=r.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-container, #4b8eff);
  color: var(--on-primary, #fff);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: filter 120ms, transform 80ms;
  &:hover { filter: brightness(1.1); }
  &:active { transform: scale(0.95); }
`,xe=r.button`
  background: var(--surface-container-high, #0b1220);
  border: 1px solid rgba(148,163,184,0.15);
  color: var(--on-surface, #e6eef8);
  padding: 0.5rem;
  border-radius: 0.375rem;
  cursor: pointer;
  &:hover { background: #0f1728; }
`,x=r.div`
  background: var(--surface-container-low, #0f1724);
  transition: background 300ms;
  position: relative;
  overflow: hidden;
  border-radius: 0.375rem;
  &:hover { background: var(--surface-container, #0f1b2a); }
`,T=r.a`
  color: #94a3b8;
  transition: color 160ms;
  &:hover { color: #e6eef8; }
`;r.div`
  display: flex;
  align-items: center;
  gap: 2rem;
`;r.span`
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: #e6eef8;
`;r.nav`
  display: none;
  gap: 1.5rem;
  align-items: center;
  @media (min-width: 768px) { display: flex; }
`;r.div`
  display: flex;
  gap: 1rem;
`;r.button`
  font-family: 'Material Symbols Outlined', sans-serif;
  color: var(--on-surface-variant, #94a3b8);
  background: transparent;
  padding: 0.5rem;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: background 160ms;
  &:hover { background: #222a3d; }
`;r.div`
  padding: 0 1.5rem;
  margin-bottom: 2rem;
`;r.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: #adc6ff;
`;r.p`
  font-size: 0.75rem;
  color: var(--on-surface-variant, #94a3b8);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-family: monospace;
`;r.div`
  padding: 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: auto;
`;const $=r.p`
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--on-surface-variant, #94a3b8);
  margin-bottom: 0.5rem;
`,I=r.h3`
  font-size: 1.875rem;
  font-weight: 800;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  color: var(--on-surface, #e6eef8);
`,ue=r.span`
  font-family: monospace;
  color: var(--primary, #4b8eff);
`,be=r.span`
  font-family: monospace;
  color: var(--secondary, #7dd3fc);
`,ye=r.span`
  font-size: 1.25rem;
  color: rgba(75,142,255,0.6);
`,je=r.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--secondary, #7dd3fc);
  font-size: 0.75rem;
  font-family: monospace;
`,ve=r.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--on-surface-variant, #94a3b8);
  font-size: 0.75rem;
  font-family: monospace;
`,we=r.div`
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--tertiary, #f1a9a9);
  font-size: 0.75rem;
  font-family: monospace;
`,ke=r.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  @media (min-width: 1024px) { flex-direction: row; }
`,Ae=r.h4`
  color: var(--on-surface, #e6eef8);
  font-family: var(--font-headline, inherit);
  font-weight: 700;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,Se=r.div`
  display: block;
  gap: 1rem;
`,B=r.label`
  display: block;
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--on-surface-variant, #94a3b8);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
`,Ce=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`,L=r.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
`,P=r.input.attrs({type:"checkbox"})`
  width: 1rem;
  height: 1rem;
  background: var(--surface-container, #0b1220);
  border: 1px solid rgba(148,163,184,0.12);
  border-radius: 0.25rem;
`,F=r.span`
  font-size: 0.875rem;
  color: var(--on-surface, #e6eef8);
`,Ne=r.input.attrs({type:"range"})`
  width: 100%;
  height: 0.25rem;
  background: var(--surface-container-high, #12202b);
  border-radius: 0.5rem;
  appearance: none;
`,ze=r.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;
  font-family: monospace;
  margin-top: 0.5rem;
  color: var(--on-surface-variant, #94a3b8);
`,K=r.input`
  background: var(--surface-container-lowest, #071023);
  border: none;
  color: var(--on-surface, #e6eef8);
  font-size: 0.875rem;
  font-family: monospace;
  padding: 0.5rem;
  border-radius: 0.25rem;
  &:focus { outline: 2px solid rgba(75,142,255,0.12); }
`,Me=r.div`
  padding: 1rem;
  background: rgba(75,142,255,0.06);
  border: 1px solid rgba(75,142,255,0.12);
  border-radius: 0.5rem;
`,Le=r.p`
  font-size: 0.75rem;
  color: var(--primary, #4b8eff);
  font-weight: 700;
  margin-bottom: 0.5rem;
`,Pe=r.p`
  font-size: 0.75rem;
  color: var(--on-surface-variant, #94a3b8);
  line-height: 1.25rem;
`,Fe=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`,Re=r.h2`
  font-size: 1.5rem;
  font-family: var(--font-headline, inherit);
  font-weight: 800;
`,De=r.div`
  display: flex;
  gap: 0.5rem;
`,k=r.button`
  background: var(--surface-container-high, #0b1724);
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  color: var(--on-surface, #e6eef8);
  border: none;
  border-radius: 0.25rem;
  transition: background 160ms, color 160ms, box-shadow 160ms;
  &:hover { background: #0f2435; }
  &.active {
    background: #171f33;
    color: #adc6ff;
    box-shadow: inset 0 0 0 1px rgba(75,142,255,0.2);
  }
`,Te=r.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  @media (min-width: 1280px) { grid-template-columns: repeat(2, 1fr); }
`,v=r.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--primary, #4b8eff);
  transition: width 200ms;
`,E=r(v)`
  background: var(--tertiary, #f1a9a9);
`,b=r.div`
  padding: 1.5rem;
`,$e=r.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`,Ie=r.span`
  background: var(--secondary-container, #0b2a38);
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
  font-family: monospace;
  color: var(--on-secondary-container, #e6eef8);
  border-radius: 0.25rem;
  text-transform: uppercase;
`,Be=r.span`
  font-size: 0.75rem;
  font-family: monospace;
  color: var(--on-surface-variant, #94a3b8);
`,y=r.h3`
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--on-surface, #e6eef8);
`,j=r.p`
  font-size: 0.875rem;
  color: var(--on-surface-variant, #94a3b8);
`,Ee=r.div`
  text-align: right;
`,He=r.div`
  font-size: 1.5rem;
  font-family: monospace;
  font-weight: 700;
`,Oe=r.div`
  font-size: 0.625rem;
  font-family: monospace;
  text-transform: uppercase;
  color: var(--on-surface-variant, #94a3b8);
`,_e=r.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
`,H=r.p`
  font-size: 0.625rem;
  font-family: monospace;
  text-transform: uppercase;
  color: var(--on-surface-variant, #94a3b8);
`,O=r.p`
  font-size: 1.125rem;
  font-weight: 800;
`,Ve=r.div`
  display: block;
  gap: 0.5rem;
`,Ye=r.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-family: monospace;
`,qe=r.div`
  width: 100%;
  height: 4px;
  background: var(--surface-container-highest, #081018);
  overflow: hidden;
  border-radius: 9999px;
`,We=r.div`
  height: 100%;
  background: var(--primary, #4b8eff);
`,Ge=r.div`
  height: 100%;
  background: var(--tertiary, #f1a9a9);
`,Ue=r.div`
  margin-top: 1.5rem;
  display: flex;
  gap: 0.75rem;
`,Je=r.div`
  display: flex;
  gap: 1.5rem;
  align-items: center;
`,Ke=r.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #34d399;
  animation: pulse 2s infinite;
`,Xe=r.span`
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: #34d399;
`,X=r.div`
  color: #94a3b8;
`,Qe=r.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`,Ze=r(x)`
  border: 1px solid rgba(65,71,85,0.18);
  border-radius: 0.125rem;
  background: #171f33;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
  &:hover {
    background: #19233a;
  }
`,er=r.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 2px;
  height: 100%;
  background: ${({$tone:t})=>t==="secondary"?"#4edea3":t==="tertiary"?"#ff5451":"#4b8eff"};
`,rr=r.div`
  padding: 2rem;
  @media (max-width: 767px) {
    padding: 1.25rem;
  }
`,tr=r.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  @media (max-width: 767px) {
    flex-direction: column;
    margin-bottom: 1.25rem;
  }
`,nr=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`,ir=r.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`,ar=r.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.375rem 0.75rem;
  border-radius: 0.1875rem;
  border: 1px solid ${({$tone:t})=>t==="secondary"?"rgba(78,222,163,0.2)":t==="tertiary"?"rgba(255,84,81,0.2)":"rgba(75,142,255,0.2)"};
  background: ${({$tone:t})=>t==="secondary"?"rgba(78,222,163,0.08)":t==="tertiary"?"rgba(255,84,81,0.08)":"rgba(75,142,255,0.08)"};
  color: ${({$tone:t})=>t==="secondary"?"#6ffbbe":t==="tertiary"?"#ffb3ad":"#adc6ff"};
  font-size: 0.75rem;
  font-family: monospace;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`,sr=r.span`
  color: #c1c6d7;
  font-size: 0.9rem;
  font-family: monospace;
  letter-spacing: 0.03em;
`,or=r.h3`
  margin: 0;
  color: #dae2fd;
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: clamp(1.9rem, 3vw, 2.45rem);
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.04em;
`,dr=r.p`
  margin: 0;
  max-width: 40rem;
  color: #c1c6d7;
  font-size: 1rem;
  line-height: 1.45;
`,lr=r.div`
  display: flex;
  align-items: flex-start;
  gap: 2.25rem;
  text-align: right;
  @media (max-width: 767px) {
    width: 100%;
    justify-content: space-between;
    gap: 1rem;
  }
`,Q=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 6.25rem;
`,Z=r.p`
  margin: 0;
  color: #c1c6d7;
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.16em;
`,ee=r.p`
  margin: 0;
  color: #dae2fd;
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: clamp(1.9rem, 2.5vw, 2.6rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 0.95;
`,cr=r.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,mr=r.div`
  display: grid;
  grid-template-columns: minmax(0, 3.3fr) 1fr 1fr 1fr 1.1fr;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(6,14,32,0.55);
  color: #c1c6d7;
  border-bottom: 1px solid rgba(65,71,85,0.14);
  font-size: 0.75rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  @media (max-width: 900px) {
    display: none;
  }
`,pr=r.div`
  display: grid;
  grid-template-columns: minmax(0, 3.3fr) 1fr 1fr 1fr 1.1fr;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  border-left: ${({$selected:t})=>t?"2px solid #4b8eff":"2px solid transparent"};
  background: ${({$selected:t})=>t?"rgba(75,142,255,0.1)":"transparent"};
  transition: background 160ms ease;
  &:hover {
    background: ${({$selected:t})=>t?"rgba(75,142,255,0.12)":"rgba(75,142,255,0.05)"};
  }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 0.875rem;
    padding: 1rem;
  }
`,fr=r.div`
  min-width: 0;
`,gr=r.p`
  margin: 0;
  color: #dae2fd;
  font-size: 1rem;
  font-weight: 800;
`,hr=r.p`
  margin: 0.35rem 0 0;
  color: #c1c6d7;
  font-size: 0.8rem;
  font-family: monospace;
  letter-spacing: 0.08em;
`,re=r.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  @media (max-width: 900px) {
    align-items: flex-start;
  }
`,_=r.span`
  display: none;
  color: #8b90a0;
  font-size: 0.68rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  @media (max-width: 900px) {
    display: inline;
  }
`,xr=r.span`
  color: ${({$tone:t})=>t==="secondary"?"#4edea3":t==="tertiary"?"#ffb3ad":"#adc6ff"};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 1rem;
  font-weight: 800;
`,ur=r.span`
  color: ${({$tone:t})=>t==="secondary"?"#6ffbbe":t==="tertiary"?"#ffb3ad":"#adc6ff"};
  font-family: Manrope, var(--font-headline, sans-serif);
  font-size: 1rem;
  font-weight: 800;
`,br=r.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  @media (max-width: 900px) {
    align-items: flex-start;
  }
`,yr=r.div`
  width: 100%;
  max-width: 5.875rem;
  height: 0.375rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(65,71,85,0.45);
`,jr=r.div`
  height: 100%;
  width: ${({$width:t})=>`${t}%`};
  background: ${({$tone:t})=>t==="secondary"?"#4edea3":t==="tertiary"?"#ffb3ad":"#adc6ff"};
`,vr=r.span`
  color: #c1c6d7;
  font-size: 0.9rem;
  font-family: monospace;
  font-weight: 600;
`,wr=r.div`
  display: flex;
  justify-content: flex-end;
  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`,kr=r.button`
  min-width: 7.5rem;
  padding: 0.95rem 1.15rem;
  border: none;
  border-radius: 0.1875rem;
  background: ${({$primary:t})=>t?"#adc6ff":"#283044"};
  color: ${({$primary:t})=>t?"#002e69":"#dae2fd"};
  font-size: 0.92rem;
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  transition: filter 160ms ease, transform 120ms ease;
  &:hover {
    filter: brightness(1.06);
  }
  &:active {
    transform: translateY(1px);
  }
`,Ar=r.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(65,71,85,0.14);
  display: flex;
  justify-content: flex-end;
  gap: 1.25rem;
  flex-wrap: wrap;
`,te=r.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0;
  border: none;
  background: transparent;
  color: #c1c6d7;
  font-size: 0.92rem;
  font-family: monospace;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 160ms ease;
  &:hover {
    color: #adc6ff;
  }
`;function Sr(){const t=typeof window<"u"&&(window.__VITE_API_BASE||window.VITE_API_BASE)||"http://localhost:3001",i=t.indexOf("http"),l=t.lastIndexOf("http");let f=t;return l>i&&(f=t.slice(l)),f=f.replace(/\/+$/g,""),f}function V(t){if(!Number.isFinite(t))return{value:"0",suffix:""};const i=t,l=Math.abs(i);return l>=1e9?{value:(i/1e9).toFixed(2),suffix:"B"}:l>=1e6?{value:(i/1e6).toFixed(1),suffix:"M"}:l>=1e3?{value:(i/1e3).toFixed(1),suffix:"K"}:{value:i.toFixed(0),suffix:""}}function A(t){const i=V(t);return`$${i.value}${i.suffix}`}function R(t){return`${Number.isFinite(t)?t.toFixed(1):"0.0"}%`}function S(t){const i=String(t||"").toLowerCase();return i==="high"?{label:"High Risk",score:"D+",highRisk:!0}:i==="medium"?{label:"Balanced",score:"B",highRisk:!1}:{label:"Cat Layer",score:"A-",highRisk:!1}}function Cr(t){return t==="new"?"New Opportunity - 0% Funded":"Partially Funded"}function Nr(t,i){const l=t.toLowerCase();return l.includes("earthquake")||l.includes("seismic")?"secondary":i.some(u=>S(u.riskLevel).highRisk)?"tertiary":"primary"}function zr(t){const i=t.toLowerCase();return i.includes("hurricane")||i.includes("cat")?"Hurricane Cat":i.includes("earthquake")||i.includes("seismic")?"Seismic Event":i.includes("wildfire")?"Wildfire Layer":i.includes("flood")?"Flood Risk":"Structured Risk"}function Mr(t){const i=(t.startDate||t.endDate||"").slice(0,4)||"2026";return`#${t.dealName.split(/\s+/).filter(Boolean).slice(0,3).map(f=>{var u;return((u=f[0])==null?void 0:u.toUpperCase())??""}).join("")||"DL"}-${i}-${String(t.dealId).padStart(2,"0")}`}function Lr(t,i){const l=t.toLowerCase();return l.includes("senior")?"1st Loss Protection Layer":l.includes("mezz")?"Excess of Loss Layer":l.includes("equity")||l.includes("residual")?"High Yield Junior Layer":l.includes("parametric")?"Immediate Liquidity Trigger":`Structured Tranche ${i+1}`}function Pr(t){const i=S(t);return i.highRisk?"tertiary":i.score.startsWith("A")?"secondary":"primary"}function Fr(){const[t,i]=h.useState([]),[l,f]=h.useState("aggregated"),[u,Y]=h.useState(!0),[C,q]=h.useState(null);h.useEffect(()=>{let n=!0;Y(!0),q(null);const a=Sr(),s="/api/marketplace/opportunities/active-pending-funding",c=a?`${a}${s}`:s;return fetch(c).then(d=>{if(!d.ok)throw new Error(`Status ${d.status}`);return d.json()}).then(d=>{if(!n)return;let p=Array.isArray(d)?d:[];if(p.length>0&&Array.isArray(p[0].tranches)){const g=[];for(const m of p){const w=m.dealId??m.id??null,z=m.dealName??m.name??"",M=m.dealStatus??m.status??"",ie=m.startDate??m.start_date??"",ae=m.endDate??m.end_date??"";for(const o of m.tranches??[]){const se=o.latitude??m.latitude??o.lat??m.lat??void 0,oe=o.longitude??m.longitude??o.lng??m.lng??void 0;g.push({id:o.id??`${w}-${o.trancheId??o.trancheId}`,dealId:w,dealName:z,dealStatus:M,trancheId:o.trancheId??o.trancheId??o.id,fundingState:o.fundingState,trancheName:o.trancheName??o.trancheName??o.name,riskLevel:o.riskLevel,expectedReturnPct:o.expectedReturnPct,maxLoss:o.maxLoss,durationMonths:o.durationMonths,capitalRequired:o.capitalRequired,committedCapital:o.committedCapital??o.fundedAmount,fundedAmount:o.fundedAmount,pendingAmount:o.pendingAmount,fundingProgressPct:o.fundingProgressPct,startDate:o.startDate??ie,endDate:o.endDate??ae,latitude:se,longitude:oe})}}p=g}i(p)}).catch(d=>{n&&(i([]),q(`${String(d.message||d)} (endpoint: ${c})`))}).finally(()=>{n&&Y(!1)}),()=>{n=!1}},[]);const N=h.useMemo(()=>{const n=t.reduce((c,d)=>c+d.pendingAmount,0),a=t.reduce((c,d)=>c+d.fundedAmount,0),s=new Set(t.map(c=>c.dealId)).size;return{totalOpenCapacity:n,totalFunded:a,activeDeals:s}},[t]),W=V(N.totalOpenCapacity),G=V(N.totalFunded),U=h.useMemo(()=>{const n=new Map;for(const a of t){const s=a.dealId??0;n.has(s)||n.set(s,{dealId:s,dealName:a.dealName??"",dealStatus:a.dealStatus??"",startDate:a.startDate??"",endDate:a.endDate??"",tranches:[]});const c=n.get(s);c&&c.tranches.push(a)}return Array.from(n.values()).map(a=>{const s=a.tranches.reduce((d,p)=>d+(p.capitalRequired??0),0),c=a.tranches.reduce((d,p)=>Math.max(d,p.durationMonths??0),0);return{...a,totalDealSize:s,durationMonths:c}})},[t]),ne=h.useMemo(()=>{const n=new Map,a=[];for(const s of t){const c=Number(s.latitude),d=Number(s.longitude);if(!Number.isFinite(c)||!Number.isFinite(d))continue;const p=`${c.toFixed(6)}:${d.toFixed(6)}`,g=n.get(p)??0;n.set(p,g+1);let m=c,w=d;if(g>0){const z=g*2.399963229728653,M=.0015*Math.sqrt(g);m=c+Math.sin(z)*M,w=d+Math.cos(z)*M}a.push({latitude:m,longitude:w,label:`${s.dealName} • ${s.trancheName}`})}return a},[t]);return e.jsxs(le,{children:[e.jsxs(ce,{children:[e.jsxs(pe,{children:[e.jsxs(D,{className:"border-primary",children:[e.jsx($,{children:"Total Open Capacity"}),e.jsxs(I,{children:[e.jsx(ue,{children:"$"}),W.value,e.jsx(ye,{children:W.suffix})]}),e.jsxs(je,{children:[e.jsx("span",{className:"material-symbols-outlined text-sm",children:"trending_up"}),"Live Pending Funding Capacity"]})]}),e.jsxs(D,{className:"border-secondary",children:[e.jsx($,{children:"Total Funded"}),e.jsxs(I,{children:[e.jsx(be,{children:"$"}),G.value,e.jsx("span",{className:"text-xl text-secondary-fixed-dim",children:G.suffix})]}),e.jsxs(ve,{children:[e.jsx("span",{className:"material-symbols-outlined text-sm",children:"history"}),"Funding Already Committed"]})]}),e.jsxs(D,{className:"border-tertiary",children:[e.jsx($,{children:"Active Deals"}),e.jsxs(I,{children:[N.activeDeals,e.jsx("span",{className:"text-xl text-tertiary-fixed-dim",children:"Deals"})]}),e.jsxs(we,{children:[e.jsx("span",{className:"material-symbols-outlined text-sm",children:"emergency_home"}),"Active Opportunities Pending Funding"]})]})]}),e.jsx("div",{style:{margin:"20px 0"},children:e.jsx(de,{title:"Deal Locations",points:ne,stats:[{label:"Deals",value:String(U.length)},{label:"Open Capacity",value:A(N.totalOpenCapacity)}]})}),e.jsxs(ke,{children:[e.jsxs(fe,{children:[e.jsxs("div",{children:[e.jsxs(Ae,{children:[e.jsx("span",{className:"material-symbols-outlined text-primary",children:"filter_list"}),"Risk Filters"]}),e.jsxs(Se,{children:[e.jsxs("div",{children:[e.jsx(B,{children:"Risk Type"}),e.jsxs(Ce,{children:[e.jsxs(L,{children:[e.jsx(P,{defaultChecked:!0}),e.jsx(F,{children:"Hurricane (CAT)"})]}),e.jsxs(L,{children:[e.jsx(P,{defaultChecked:!0}),e.jsx(F,{children:"Tornado / Wind"})]}),e.jsxs(L,{children:[e.jsx(P,{}),e.jsx(F,{children:"Wildfire"})]}),e.jsxs(L,{children:[e.jsx(P,{}),e.jsx(F,{children:"Flood / Inundation"})]})]})]}),e.jsxs("div",{children:[e.jsx(B,{children:"Duration (Months)"}),e.jsx(Ne,{}),e.jsxs(ze,{children:[e.jsx("span",{children:"3M"}),e.jsx("span",{children:"12M"}),e.jsx("span",{children:"24M"}),e.jsx("span",{children:"36M"})]})]}),e.jsxs("div",{children:[e.jsx(B,{children:"Expected Yield (%)"}),e.jsxs("div",{className:"grid grid-cols-2 gap-2",children:[e.jsx(K,{placeholder:"Min"}),e.jsx(K,{placeholder:"Max"})]})]})]})]}),e.jsxs(Me,{children:[e.jsx(Le,{children:"Live Market Signal"}),e.jsx(Pe,{children:"High demand for Florida Cat 4-5 layers detected. Premiums increased by 140bps in last 72h."})]})]}),e.jsxs(ge,{children:[e.jsxs(Fe,{children:[e.jsx(Re,{children:l==="aggregated"?"Master Deal Inventory":"Active Opportunities"}),e.jsxs(De,{children:[e.jsx(k,{children:"Recent"}),e.jsx(k,{children:"Yield High-Low"})]}),e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",marginLeft:"auto"},children:[e.jsx(k,{onClick:()=>f("aggregated"),className:l==="aggregated"?"active":"",children:"Aggregated"}),e.jsx(k,{onClick:()=>f("individual"),className:l==="individual"?"active":"",children:"Individual"}),e.jsx(k,{onClick:()=>f("table"),className:l==="table"?"active":"",children:"Table"})]})]}),l==="aggregated"?e.jsx(Qe,{children:u?e.jsxs(x,{children:[e.jsx(v,{}),e.jsxs(b,{children:[e.jsx(y,{children:"Loading opportunities..."}),e.jsx(j,{children:"Pulling live active opportunities pending funding from the API."})]})]}):C?e.jsxs(x,{children:[e.jsx(E,{}),e.jsxs(b,{children:[e.jsx(y,{children:"Unable to load opportunities"}),e.jsx(j,{children:C})]})]}):t.length===0?e.jsxs(x,{children:[e.jsx(v,{}),e.jsxs(b,{children:[e.jsx(y,{children:"No pending opportunities"}),e.jsx(j,{children:"All active opportunities are currently fully funded."})]})]}):U.map(n=>{const a=Nr(n.dealName,n.tranches);return e.jsxs(Ze,{children:[e.jsx(er,{$tone:a}),e.jsxs(rr,{children:[e.jsxs(tr,{children:[e.jsxs(nr,{children:[e.jsxs(ir,{children:[e.jsx(ar,{$tone:a,children:zr(n.dealName)}),e.jsx(sr,{children:Mr(n)})]}),e.jsx(or,{children:n.dealName}),e.jsxs(dr,{children:[n.dealStatus?`${n.dealStatus}. `:"",n.tranches.length," tranche",n.tranches.length===1?"":"s"," currently open for allocation."]})]}),e.jsxs(lr,{children:[e.jsxs(Q,{children:[e.jsx(Z,{children:"Total Deal Size"}),e.jsx(ee,{children:A(n.totalDealSize)})]}),e.jsxs(Q,{children:[e.jsx(Z,{children:"Duration"}),e.jsxs(ee,{children:[n.durationMonths||0," Mo"]})]})]})]}),e.jsxs(cr,{children:[e.jsxs(mr,{children:[e.jsx("div",{children:"Tranche Class"}),e.jsx("div",{style:{textAlign:"center"},children:"Risk Score"}),e.jsx("div",{style:{textAlign:"center"},children:"Exp. Yield"}),e.jsx("div",{style:{textAlign:"center"},children:"Funded"}),e.jsx("div",{style:{textAlign:"right"},children:"Action"})]}),n.tranches.map((s,c)=>{const d=S(s.riskLevel),p=Pr(s.riskLevel),g=Math.max(0,Math.min(100,s.fundingProgressPct));return e.jsxs(pr,{$selected:c===0,children:[e.jsxs(fr,{children:[e.jsx(gr,{children:s.trancheName}),e.jsx(hr,{children:Lr(s.trancheName,c)})]}),e.jsxs(re,{children:[e.jsx(_,{children:"Risk Score"}),e.jsx(xr,{$tone:p,children:d.score})]}),e.jsxs(re,{children:[e.jsx(_,{children:"Exp. Yield"}),e.jsx(ur,{$tone:p,children:R(s.expectedReturnPct)})]}),e.jsxs(br,{children:[e.jsx(_,{children:"Funded"}),e.jsx(yr,{children:e.jsx(jr,{$tone:p,$width:g})}),e.jsxs(vr,{children:[Math.round(g),"%"]})]}),e.jsx(wr,{children:e.jsx(kr,{$primary:c===0,children:"Allocate"})})]},s.id)})]}),e.jsxs(Ar,{children:[e.jsxs(te,{children:[e.jsx("span",{className:"material-symbols-outlined text-sm",children:"description"}),"View Prospectus"]}),e.jsxs(te,{children:[e.jsx("span",{className:"material-symbols-outlined text-sm",children:"visibility"}),"Risk Model"]})]})]})]},n.dealId)})}):e.jsx(Te,{children:u?e.jsxs(x,{children:[e.jsx(v,{}),e.jsxs(b,{children:[e.jsx(y,{children:"Loading opportunities..."}),e.jsx(j,{children:"Pulling live active opportunities pending funding from the API."})]})]}):C?e.jsxs(x,{children:[e.jsx(E,{}),e.jsxs(b,{children:[e.jsx(y,{children:"Unable to load opportunities"}),e.jsx(j,{children:C})]})]}):t.length===0?e.jsxs(x,{children:[e.jsx(v,{}),e.jsxs(b,{children:[e.jsx(y,{children:"No pending opportunities"}),e.jsx(j,{children:"All active opportunities are currently fully funded."})]})]}):l!=="table"?t.map(n=>{const a=S(n.riskLevel),s=Math.max(0,Math.min(100,n.fundingProgressPct));return e.jsxs(x,{children:[a.highRisk?e.jsx(E,{}):e.jsx(v,{}),e.jsxs(b,{children:[e.jsxs($e,{children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx(Ie,{children:a.label}),e.jsxs(Be,{children:["#",n.dealId,"-",n.trancheId]})]}),e.jsx(y,{children:n.dealName}),e.jsxs(j,{children:[n.trancheName," - ",Cr(n.fundingState)]})]}),e.jsxs(Ee,{children:[e.jsx(He,{className:a.highRisk?"text-tertiary":"text-primary",children:R(n.expectedReturnPct)}),e.jsx(Oe,{children:"Exp. Return"})]})]}),e.jsxs(_e,{children:[e.jsxs("div",{children:[e.jsx(H,{children:"Risk Score"}),e.jsx(O,{className:a.highRisk?"text-error":"text-secondary",children:a.score})]}),e.jsxs("div",{children:[e.jsx(H,{children:"Committed Capital"}),e.jsx(O,{className:"font-mono",children:A(n.committedCapital)})]}),e.jsxs("div",{children:[e.jsx(H,{children:"Duration"}),e.jsxs(O,{children:[n.durationMonths," Mo"]})]})]}),e.jsxs(Ve,{children:[e.jsxs(Ye,{children:[e.jsx("span",{className:"text-on-surface-variant",children:"Funding Progress"}),e.jsx("span",{className:a.highRisk?"text-tertiary":"text-primary",children:R(s)})]}),e.jsx(qe,{children:a.highRisk?e.jsx(Ge,{style:{width:`${s}%`}}):e.jsx(We,{style:{width:`${s}%`}})})]}),e.jsxs(Ue,{children:[e.jsx(J,{children:"ALLOCATE CAPITAL"}),e.jsx(xe,{children:e.jsx("span",{className:"material-symbols-outlined text-sm",children:"visibility"})})]})]})]},n.id)}):e.jsx("div",{style:{width:"100%",overflowX:"auto"},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",color:"var(--text, #e6eef8)"},children:[e.jsx("thead",{children:e.jsxs("tr",{style:{textAlign:"left",borderBottom:"1px solid rgba(255,255,255,0.04)"},children:[e.jsx("th",{style:{padding:"12px 8px"},children:"Deal"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Tranche"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Risk"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Yield"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Funded"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Pending"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Duration"}),e.jsx("th",{style:{padding:"12px 8px"},children:"Action"})]})}),e.jsx("tbody",{children:t.map(n=>e.jsxs("tr",{style:{borderBottom:"1px solid rgba(255,255,255,0.02)"},children:[e.jsx("td",{style:{padding:"12px 8px"},children:n.dealName}),e.jsx("td",{style:{padding:"12px 8px"},children:n.trancheName}),e.jsx("td",{style:{padding:"12px 8px"},children:S(n.riskLevel).score}),e.jsx("td",{style:{padding:"12px 8px"},children:R(n.expectedReturnPct)}),e.jsx("td",{style:{padding:"12px 8px"},children:A(n.fundedAmount)}),e.jsx("td",{style:{padding:"12px 8px"},children:A(n.pendingAmount)}),e.jsxs("td",{style:{padding:"12px 8px"},children:[n.durationMonths," Mo"]}),e.jsx("td",{style:{padding:"12px 8px"},children:e.jsx(J,{children:"Allocate"})})]},n.id))})]})})})]})]})]}),e.jsxs(me,{children:[e.jsxs(Je,{children:[e.jsxs(Ke,{children:[e.jsx(Xe,{}),"Hurricane Milton: Cat 4 approaching Florida..."]}),e.jsxs(X,{children:["Global TVL: ",e.jsx("span",{className:"text-slate-300 font-bold",children:"$4.2B"})]}),e.jsxs(X,{children:["Active Tranches: ",e.jsx("span",{className:"text-slate-300 font-bold",children:"142"})]})]}),e.jsxs("div",{className:"flex items-center gap-4",children:[e.jsx(T,{href:"#",children:"Network Status"}),e.jsx(T,{href:"#",children:"Risk Feed"}),e.jsx(T,{href:"#",children:"Documentation"})]})]})]})}Fr.__docgenInfo={description:"",methods:[],displayName:"MarketplacePage"};export{Fr as M};
