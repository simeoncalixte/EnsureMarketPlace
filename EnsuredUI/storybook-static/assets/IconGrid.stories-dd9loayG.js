import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{c as r}from"./colors-CWt0Ylu9.js";const n=({items:l})=>e.jsx("div",{style:{display:"flex",gap:24,flexWrap:"wrap",background:r.surfaceContainerLow,padding:20,borderRadius:12},children:l.map(t=>e.jsxs("div",{style:{width:72,textAlign:"center"},children:[e.jsx("div",{style:{width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:8,margin:"0 auto 8px",background:r.surfaceContainerHigh,color:r.primary},children:t.icon??"◎"}),e.jsx("div",{style:{fontSize:10,fontFamily:"ui-monospace, Menlo, monospace",color:r.onSurfaceVariant},children:t.label})]},t.label))});n.__docgenInfo={description:"",methods:[],displayName:"IconGrid",props:{items:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:"{ label: string; icon?: React.ReactNode }",signature:{properties:[{key:"label",value:{name:"string",required:!0}},{key:"icon",value:{name:"ReactReactNode",raw:"React.ReactNode",required:!1}}]}}],raw:"{ label: string; icon?: React.ReactNode }[]"},description:""}}};const p={title:"XDS/IconGrid",component:n},a=()=>e.jsx(n,{items:[{label:"Shield"},{label:"Metrics"},{label:"Layers"},{label:"Trust"},{label:"Node"}]});a.__docgenInfo={description:"",methods:[],displayName:"Default"};var o,s,i;a.parameters={...a.parameters,docs:{...(o=a.parameters)==null?void 0:o.docs,source:{originalSource:`() => <IconGrid items={[{
  label: 'Shield'
}, {
  label: 'Metrics'
}, {
  label: 'Layers'
}, {
  label: 'Trust'
}, {
  label: 'Node'
}]} />`,...(i=(s=a.parameters)==null?void 0:s.docs)==null?void 0:i.source}}};const m=["Default"];export{a as Default,m as __namedExportsOrder,p as default};
