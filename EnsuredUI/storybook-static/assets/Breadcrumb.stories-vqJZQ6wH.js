import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{R as d}from"./index-B3TfwC44.js";import{c as p}from"./colors-CWt0Ylu9.js";import{s as u}from"./tokens-C6qfnSfg.js";const c=({label:m="Breadcrumbs",items:s})=>e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:u.lg},children:e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,fontFamily:"ui-monospace, Menlo, monospace",textTransform:"uppercase",color:"var(--text-secondary)",display:"block",marginBottom:8},children:m}),e.jsx("nav",{"aria-label":"breadcrumb",style:{display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600},children:s.map((a,t)=>{const l=t===s.length-1;return e.jsxs(d.Fragment,{children:[l?e.jsx("span",{style:{color:p.text.primary},children:a.label}):e.jsx("a",{href:a.href??"#",style:{color:"var(--text-secondary)",textDecoration:"none"},children:a.label}),!l&&e.jsx("span",{style:{color:"var(--text-secondary)",fontSize:14},children:"›"})]},t)})})]})});c.__docgenInfo={description:"",methods:[],displayName:"Breadcrumb",props:{label:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Breadcrumbs'",computed:!1}},items:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  label: string
  href?: string
}`,signature:{properties:[{key:"label",value:{name:"string",required:!0}},{key:"href",value:{name:"string",required:!1}}]}}],raw:"BreadcrumbItem[]"},description:""}}};const x={title:"XDS/Breadcrumb"},r=()=>e.jsx(c,{items:[{label:"Terminal"},{label:"Risk Modeling"},{label:"Probability Curves"}]});r.__docgenInfo={description:"",methods:[],displayName:"Default"};var n,o,i;r.parameters={...r.parameters,docs:{...(n=r.parameters)==null?void 0:n.docs,source:{originalSource:`() => <Breadcrumb items={[{
  label: 'Terminal'
}, {
  label: 'Risk Modeling'
}, {
  label: 'Probability Curves'
}]} />`,...(i=(o=r.parameters)==null?void 0:o.docs)==null?void 0:i.source}}};const h=["Default"];export{r as Default,h as __namedExportsOrder,x as default};
