import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as u}from"./index-B3TfwC44.js";import{c as s}from"./colors-CWt0Ylu9.js";import{s as m}from"./tokens-C6qfnSfg.js";const p=({tabs:r,activeId:n,onChange:o})=>e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:m.md},children:[e.jsx("label",{style:{fontSize:10,fontFamily:"ui-monospace, Menlo, monospace",textTransform:"uppercase",color:"var(--text-secondary)",display:"block",marginBottom:8},children:"Sub-Navigation Tabs"}),e.jsx("div",{style:{display:"flex",gap:32,borderBottom:"1px solid rgba(148,163,184,0.15)"},children:r.map(a=>{const i=a.id===n;return e.jsx("button",{onClick:()=>o==null?void 0:o(a.id),style:{padding:"0 0 12px 0",fontSize:14,fontWeight:700,background:"transparent",border:"none",cursor:"pointer",color:i?s.text.accent:"var(--text-secondary)",borderBottom:i?`2px solid ${s.text.accent}`:"2px solid transparent"},children:a.label},a.id)})})]});p.__docgenInfo={description:"",methods:[],displayName:"SubNavigation",props:{tabs:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:"{ id: string; label: string }",signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"Tab[]"},description:""},activeId:{required:!1,tsType:{name:"string"},description:""},onChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(id: string) => void",signature:{arguments:[{type:{name:"string"},name:"id"}],return:{name:"void"}}},description:""}}};const f={title:"XDS/SubNavigation"},t=()=>{const[r,n]=u.useState("general");return e.jsx(p,{tabs:[{id:"general",label:"General Info"},{id:"allocation",label:"Allocation Map"},{id:"exposure",label:"Exposure Logs"},{id:"governance",label:"Governance History"}],activeId:r,onChange:n})};t.__docgenInfo={description:"",methods:[],displayName:"Default"};var l,c,d;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:`() => {
  const [active, setActive] = useState('general');
  return <SubNavigation tabs={[{
    id: 'general',
    label: 'General Info'
  }, {
    id: 'allocation',
    label: 'Allocation Map'
  }, {
    id: 'exposure',
    label: 'Exposure Logs'
  }, {
    id: 'governance',
    label: 'Governance History'
  }]} activeId={active} onChange={setActive} />;
}`,...(d=(c=t.parameters)==null?void 0:c.docs)==null?void 0:d.source}}};const y=["Default"];export{t as Default,y as __namedExportsOrder,f as default};
