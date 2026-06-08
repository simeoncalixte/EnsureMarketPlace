import{S as f}from"./SubjectInsuranceCard-D5sJ76h_.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-B3TfwC44.js";import"./InsurerDashboard.styles-BNsNl3gT.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./Input-BOqlzFhj.js";import"./colors-BpeaZ3Jo.js";import"./Select-Vu80i_dn.js";import"./Button-BdN1JsLa.js";import"./SubjectTemplateFields-CH0jMXl_.js";import"./api-2uxkEE_U.js";import"./auth-DmpauaO1.js";import"./ConnectedGrid-mgqUdqx5.js";import"./Badge-BMblvUa5.js";import"./SegmentedSwitch-B7FGOm21.js";import"./Checkbox-DszoQXQ5.js";import"./NumberInput-B6u1J8fd.js";const v={title:"Pages/Insurer Dashboard/Sections/Subject Insurance Card",component:f},d=[{code:"PROP",label:"Property",subTypes:[{code:"PROP_AR",label:"All Risk"},{code:"PROP_CAT",label:"Catastrophe"}]},{code:"LIAB",label:"Liability",subTypes:[{code:"LIAB_GL",label:"General Liability"}]}],y=new Map(d.map(n=>[n.label,n])),b={subjectId:"subject-1",subjectLabel:"Houston Portfolio",lineOfBusiness:"Property",lineOfBusinessSubType:"All Risk",fieldValues:{}},e={args:{subject:b,subjectIndex:0,organizationId:null,isCollapsed:!1,onToggleCollapsed:()=>{},taxonomyByPrimaryLabel:y,lineOfBusinessTaxonomy:d,onRemoveSubject:()=>{},onUpdateSubject:()=>{},onUpdateSubjectPrimaryLineOfBusiness:()=>{},onUpdateSubjectLineOfBusinessSubType:()=>{},onFieldValueChange:()=>{},onTemplateResolved:()=>{}}},s={args:{...e.args,isCollapsed:!0}},o={args:{...e.args,subject:{...b,lineOfBusiness:"",lineOfBusinessSubType:""}}};var a,r,t;e.parameters={...e.parameters,docs:{...(a=e.parameters)==null?void 0:a.docs,source:{originalSource:`{
  args: {
    subject,
    subjectIndex: 0,
    organizationId: null,
    isCollapsed: false,
    onToggleCollapsed: () => {},
    taxonomyByPrimaryLabel,
    lineOfBusinessTaxonomy: taxonomy,
    onRemoveSubject: () => {},
    onUpdateSubject: () => {},
    onUpdateSubjectPrimaryLineOfBusiness: () => {},
    onUpdateSubjectLineOfBusinessSubType: () => {},
    onFieldValueChange: () => {},
    onTemplateResolved: () => {}
  }
}`,...(t=(r=e.parameters)==null?void 0:r.docs)==null?void 0:t.source}}};var i,l,u;s.parameters={...s.parameters,docs:{...(i=s.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    isCollapsed: true
  }
}`,...(u=(l=s.parameters)==null?void 0:l.docs)==null?void 0:u.source}}};var p,c,m;o.parameters={...o.parameters,docs:{...(p=o.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    ...Default.args,
    subject: {
      ...subject,
      lineOfBusiness: '',
      lineOfBusinessSubType: ''
    }
  }
}`,...(m=(c=o.parameters)==null?void 0:c.docs)==null?void 0:m.source}}};const V=["Default","Collapsed","NoLineOfBusiness"];export{s as Collapsed,e as Default,o as NoLineOfBusiness,V as __namedExportsOrder,v as default};
