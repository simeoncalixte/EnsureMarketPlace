import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{y as a}from"./styled-components.browser.esm-DDkbN7W9.js";import{N as c}from"./Navigation-IrReTMVv.js";const m=a.aside`
  position: fixed;
  left: 0;
  top: 4rem;
  z-index: 40;
  width: min(18rem, calc(100vw - 2rem));
  height: calc(100vh - 4rem);
  padding: 2rem 0;
  background: #131b2e;
  flex-direction: column;
  display: flex;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.28);
  transform: translateX(${({$isOpen:t})=>t?"0":"-100%"});
  opacity: ${({$isOpen:t})=>t?1:0};
  visibility: ${({$isOpen:t})=>t?"visible":"hidden"};
  pointer-events: ${({$isOpen:t})=>t?"auto":"none"};
  transition: transform 220ms ease, opacity 180ms ease;
`,u=a.div`
  padding: 0 2rem;
  margin-bottom: 2.5rem;
`,f=a.div`
  margin-bottom: 0.25rem;
  color: #adc6ff;
  font-size: 1.125rem;
  font-weight: 900;
  cursor: text;
`,h=a.div`
  color: #9aa3bb;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: text;
`,p=a.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`,s=a.div`
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: text;
  transition: background-color 180ms ease, color 180ms ease;
  background: ${({$active:t})=>t?"#222a3d":"transparent"};
  color: ${({$active:t})=>t?"#adc6ff":"#c1c6d7"};
  border-left: ${({$active:t})=>t?"4px solid #4b8eff":"4px solid transparent"};

  &:hover {
    background: ${({$active:t})=>t?"#222a3d":"#171f33"};
    color: #adc6ff;
  }
`,i=a.span`
  margin-right: 1rem;
`,x=a.div`
  margin-top: auto;
  padding: 0 1.5rem;
`,b=a.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 0;
  border-radius: 0.375rem;
  padding: 0.75rem;
  background: #222a3d;
  color: #adc6ff;
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color 200ms ease, transform 200ms ease;
  cursor: text;

  &:hover {
    background: #171f33;
  }

  &:active {
    transform: translateX(1px);
  }
`,g=a.span`
  font-size: 0.875rem;
`,v=({items:t,title:r,subtitle:n,isOpen:d=!1,onRequestClose:o})=>{const l=Array.isArray(t)&&t.length>0;return e.jsxs(m,{"data-stitch-vh":"h-[1024px]===h-screen",$isOpen:d,children:[e.jsxs(u,{children:[e.jsx(f,{contentEditable:!1,spellCheck:!1,"data-stitch-editable-idx":"6","data-stitch-added-classes":"cursor-text",children:r??"Registration"}),e.jsx(h,{contentEditable:!1,spellCheck:!1,"data-stitch-editable-idx":"7","data-stitch-added-classes":"cursor-text",children:n??"Step 1 of 5: Account Selection"})]}),l?e.jsx("div",{style:{padding:"0 1.5rem",flex:1,display:"flex",flexDirection:"column"},children:e.jsx(c,{items:t,onItemClick:o})}):e.jsxs(p,{children:[e.jsxs(s,{$active:!0,contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"8","data-stitch-added-classes":"cursor-text",children:[e.jsx(i,{className:"material-symbols-outlined","aria-hidden":!0,"data-icon":"account_balance",children:"account_balance"}),"Account Type"]}),e.jsxs(s,{contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"9","data-stitch-added-classes":"cursor-text",children:[e.jsx(i,{className:"material-symbols-outlined","aria-hidden":!0,"data-icon":"domain",children:"domain"}),"Business Details"]}),e.jsxs(s,{contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"10","data-stitch-added-classes":"cursor-text",children:[e.jsx(i,{className:"material-symbols-outlined","aria-hidden":!0,"data-icon":"verified_user",children:"verified_user"}),"KYC Verification"]}),e.jsxs(s,{contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"11","data-stitch-added-classes":"cursor-text",children:[e.jsx(i,{className:"material-symbols-outlined","aria-hidden":!0,"data-icon":"monitoring",children:"monitoring"}),"Capital Profile"]}),e.jsxs(s,{contentEditable:!0,spellCheck:!1,"data-stitch-editable-idx":"12","data-stitch-added-classes":"cursor-text",children:[e.jsx(i,{className:"material-symbols-outlined","aria-hidden":!0,"data-icon":"fact_check",children:"fact_check"}),"Final Review"]})]}),e.jsx(x,{children:e.jsxs(b,{contentEditable:!1,spellCheck:!1,"data-stitch-editable-idx":"13","data-stitch-added-classes":"cursor-text",children:[e.jsx(g,{className:"material-symbols-outlined","aria-hidden":!0,"data-icon":"save",children:"save"}),"Save Progress"]})})]})};v.__docgenInfo={description:"",methods:[],displayName:"SideNavBar",props:{items:{required:!1,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  id: string
  label: string
  active?: boolean
  icon?: string // name or glyph to render in the leading slot
  shortcut?: string // small right-aligned shortcut label
  subItems?: NavItem[]
}`,signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"active",value:{name:"boolean",required:!1}},{key:"icon",value:{name:"string",required:!1}},{key:"shortcut",value:{name:"string",required:!1}},{key:"subItems",value:{name:"Array",elements:[{name:"NavItem"}],raw:"NavItem[]",required:!1}}]}}],raw:"NavItem[]"},description:""},title:{required:!1,tsType:{name:"string"},description:""},subtitle:{required:!1,tsType:{name:"string"},description:""},isOpen:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onRequestClose:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};export{v as S};
