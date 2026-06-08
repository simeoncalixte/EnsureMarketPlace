import{j as s}from"./jsx-runtime-BjG_zV1W.js";import{r as i}from"./index-B3TfwC44.js";import{S as l}from"./SubNavigation-8Fv3DXYl.js";import"./colors-BpeaZ3Jo.js";import"./tokens-C6qfnSfg.js";const g={title:"XDS/SubNavigation"},e=()=>{const[o,r]=i.useState("general");return s.jsx(l,{tabs:[{id:"general",label:"General Info"},{id:"allocation",label:"Allocation Map"},{id:"exposure",label:"Exposure Logs"},{id:"governance",label:"Governance History"}],activeId:o,onChange:r})};e.__docgenInfo={description:"",methods:[],displayName:"Default"};var a,t,n;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`() => {
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
}`,...(n=(t=e.parameters)==null?void 0:t.docs)==null?void 0:n.source}}};const v=["Default"];export{e as Default,v as __namedExportsOrder,g as default};
