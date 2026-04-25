import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{y as t}from"./styled-components.browser.esm-DDkbN7W9.js";const n=t.header`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0 auto;
  padding: 1rem 2rem;
  background: #0b1326;
  font-family: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif;
  letter-spacing: -0.01em;
`,i=t.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
`,o=t.div`
  color: #adc6ff;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: text;
`,d=t.nav`
  display: none;
  align-items: center;
  gap: 2rem;

  @media (min-width: 768px) {
    display: flex;
  }
`,a=t.a`
  color: #c1c6d7;
  text-decoration: none;
  transition: color 180ms ease;
  cursor: text;

  &:hover {
    color: #adc6ff;
  }
`,c=t.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`,l=t.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.75rem;
  background: rgba(34, 42, 61, 0.92);
  color: #dae2fd;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  transition: background-color 200ms ease, transform 100ms ease, border-color 200ms ease;
  cursor: pointer;

  &:hover {
    background: #171f33;
    border-color: rgba(173, 198, 255, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`,m=t.button`
  background: #222a3d;
  color: #dae2fd;
  border: 0;
  border-radius: 0.375rem;
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 200ms ease, transform 100ms ease;
  cursor: text;

  &:hover {
    background: #171f33;
  }

  &:active {
    transform: scale(0.95);
  }
`,u=({isSidebarOpen:r,onToggleSidebar:s})=>e.jsxs(n,{children:[e.jsxs(i,{children:[s&&e.jsxs(l,{type:"button",onClick:s,"aria-label":r?"Close navigation menu":"Open navigation menu",children:[e.jsx("span",{"aria-hidden":!0,children:r?"×":"☰"}),e.jsx("span",{children:r?"Close menu":"Open menu"})]}),e.jsx(o,{contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"0","data-stitch-added-classes":"cursor-text",children:"Sovereign Re"})]}),e.jsxs(d,{children:[e.jsx(a,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"1","data-stitch-added-classes":"cursor-text",children:"Platform"}),e.jsx(a,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"2","data-stitch-added-classes":"cursor-text",children:"Liquidity"}),e.jsx(a,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"3","data-stitch-added-classes":"cursor-text",children:"Governance"}),e.jsx(a,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"4","data-stitch-added-classes":"cursor-text",children:"Documentation"})]}),e.jsx(c,{children:e.jsx(m,{contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"5","data-stitch-added-classes":"cursor-text",children:"Institutional Login"})})]});u.__docgenInfo={description:"",methods:[],displayName:"TopNavBar",props:{isSidebarOpen:{required:!1,tsType:{name:"boolean"},description:""},onToggleSidebar:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{u as T};
