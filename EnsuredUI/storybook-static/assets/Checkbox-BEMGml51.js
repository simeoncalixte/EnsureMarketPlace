import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{y as o}from"./styled-components.browser.esm-DDkbN7W9.js";import{c as r}from"./colors-CWt0Ylu9.js";const i=o.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`,n=o.input`
  width: 18px;
  height: 18px;
  border-radius: 4px;
  accent-color: ${r.primary};
  appearance: none;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.06);
  display: inline-block;

  &:checked {
    background: ${r.primary};
    border-color: ${r.primary};
  }
`,p=o.span`
  color: ${r.onSurfaceVariant};
  font-size: 13px;
`,s=({label:a,className:t,...c})=>a?e.jsxs(i,{className:t,children:[e.jsx(n,{type:"checkbox",...c}),e.jsx(p,{children:a})]}):e.jsx(n,{type:"checkbox",...c});s.__docgenInfo={description:"",methods:[],displayName:"Checkbox",props:{label:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};export{s as C};
