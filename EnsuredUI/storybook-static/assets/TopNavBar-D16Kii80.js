import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{y as t}from"./styled-components.browser.esm-BtVlB3rV.js";import{j as c,L as m}from"./chunk-OE4NN4TA-D-lI_iOm.js";const u=t.header`
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
`,g=t.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
`,f=t.div`
  color: #adc6ff;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  cursor: text;
`,p=t.nav`
  display: none;
  align-items: center;
  gap: 2rem;

  @media (min-width: 768px) {
    display: flex;
  }
`,o=t.a`
  color: #c1c6d7;
  text-decoration: none;
  transition: color 180ms ease;
  cursor: text;

  &:hover {
    color: #adc6ff;
  }
`,h=t.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`,b=t.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  padding: 0.5rem 0.85rem;
  border-radius: 0.75rem;
  background: rgba(34, 42, 61, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  min-width: 0;
`,x=t.span`
  color: #98a6bf;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`,y=t.span`
  color: #dae2fd;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 14rem;
`,v=t.button`
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
`,k=t.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,d=`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 0.95rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.75rem;
  background: rgba(34, 42, 61, 0.92);
  color: #dae2fd;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-decoration: none;
  transition: background-color 200ms ease, transform 100ms ease, border-color 200ms ease;

  &:hover {
    background: #171f33;
    border-color: rgba(173, 198, 255, 0.3);
  }

  &:active {
    transform: scale(0.98);
  }
`,j=t.a`
  ${d}
`,w=t.a`
  ${d}
  border-color: rgba(75, 142, 255, 0.35);
  background: #4b8eff;
  color: #05204b;

  &:hover {
    background: #6aa0ff;
    border-color: rgba(75, 142, 255, 0.55);
  }
`;function l({to:n,primary:s=!1,children:r}){const a=c(),i=s?w:j;return a?e.jsx(i,{as:m,to:n,children:r}):e.jsx(i,{href:n,children:r})}const z=({isSidebarOpen:n,onToggleSidebar:s,user:r})=>{const a=r?[r.firstName,r.lastName].filter(Boolean).join(" ").trim()||r.email||"Authenticated session":"",i=(r==null?void 0:r.organizationId)!=null?`Organization ID ${r.organizationId}`:"Organization ID —";return e.jsxs(u,{children:[e.jsxs(g,{children:[s&&e.jsxs(v,{type:"button",onClick:s,"aria-label":n?"Close navigation menu":"Open navigation menu",children:[e.jsx("span",{"aria-hidden":!0,children:n?"×":"☰"}),e.jsx("span",{children:n?"Close menu":"Open menu"})]}),e.jsx(f,{contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"0","data-stitch-added-classes":"cursor-text",children:"Sovereign Re"})]}),e.jsxs(p,{children:[e.jsx(o,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"1","data-stitch-added-classes":"cursor-text",children:"Platform"}),e.jsx(o,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"2","data-stitch-added-classes":"cursor-text",children:"Liquidity"}),e.jsx(o,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"3","data-stitch-added-classes":"cursor-text",children:"Governance"}),e.jsx(o,{href:"#",contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"4","data-stitch-added-classes":"cursor-text",children:"Documentation"})]}),e.jsx(h,{children:r?e.jsxs(b,{"aria-label":`${i} ${a}`,children:[e.jsx(x,{children:i}),e.jsx(y,{title:a,children:a})]}):e.jsxs(k,{children:[e.jsx(l,{to:"/auth/login",children:"Sign in"}),e.jsx(l,{to:"/auth/register",primary:!0,children:"Register"})]})})]})};z.__docgenInfo={description:"",methods:[],displayName:"TopNavBar",props:{isSidebarOpen:{required:!1,tsType:{name:"boolean"},description:""},onToggleSidebar:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},user:{required:!1,tsType:{name:"union",raw:"AuthUser | null",elements:[{name:"signature",type:"object",raw:`{
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  organizationId?: number | null;
}`,signature:{properties:[{key:"id",value:{name:"number",required:!0}},{key:"email",value:{name:"string",required:!0}},{key:"firstName",value:{name:"string",required:!1}},{key:"lastName",value:{name:"string",required:!1}},{key:"role",value:{name:"string",required:!1}},{key:"organizationId",value:{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}],required:!1}}]}},{name:"null"}]},description:""}}};export{z as T};
