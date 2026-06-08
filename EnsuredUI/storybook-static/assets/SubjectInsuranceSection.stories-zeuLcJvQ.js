import{S as g}from"./SubjectInsuranceSection-CtTyPOqa.js";import"./jsx-runtime-BjG_zV1W.js";import"./index-B3TfwC44.js";import"./InsurerDashboard.styles-BNsNl3gT.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./Button-BdN1JsLa.js";import"./colors-BpeaZ3Jo.js";import"./SubjectInsuranceCard-D5sJ76h_.js";import"./Input-BOqlzFhj.js";import"./Select-Vu80i_dn.js";import"./SubjectTemplateFields-CH0jMXl_.js";import"./api-2uxkEE_U.js";import"./auth-DmpauaO1.js";import"./ConnectedGrid-mgqUdqx5.js";import"./Badge-BMblvUa5.js";import"./SegmentedSwitch-B7FGOm21.js";import"./Checkbox-DszoQXQ5.js";import"./NumberInput-B6u1J8fd.js";const V={title:"Pages/Insurer Dashboard/Sections/Subject Insurance",component:g},j=[{code:"PROP",label:"Property",subTypes:[{code:"PROP_AR",label:"All Risk"},{code:"PROP_CAT",label:"Catastrophe"}]},{code:"LIAB",label:"Liability",subTypes:[{code:"LIAB_GL",label:"General Liability"}]}],S=new Map(j.map(a=>[a.label,a])),t=[{subjectId:"subject-1",subjectLabel:"Houston Portfolio",lineOfBusiness:"Property",lineOfBusinessSubType:"All Risk",fieldValues:{}},{subjectId:"subject-2",subjectLabel:"Miami Industrial",lineOfBusiness:"Property",lineOfBusinessSubType:"Catastrophe",fieldValues:{}}],y=[{key:"houston-tx",label:"Houston, TX",subjects:[{subject:t[0],index:0}]},{key:"miami-fl",label:"Miami, FL",subjects:[{subject:t[1],index:1}]}],L=[{key:"all",label:"All Subjects",subjects:[{subject:t[0],index:0},{subject:t[1],index:1}]}],r={isActive:!0,organizationId:null,taxonomyByPrimaryLabel:S,lineOfBusinessTaxonomy:j,onSetLocationGrouping:()=>{},onSetSeparateGrouping:()=>{},onAddSubject:()=>{},onRemoveSubject:()=>{},onUpdateSubject:()=>{},onUpdateSubjectPrimaryLineOfBusiness:()=>{},onUpdateSubjectLineOfBusinessSubType:()=>{},onFieldValueChange:()=>{},onTemplateResolved:()=>{}},e={args:{...r,subjectGroupingMode:"location",groupedSubjects:y}},o={args:{...r,subjectGroupingMode:"separate",groupedSubjects:L}},s={args:{...r,subjectGroupingMode:"location",groupedSubjects:[]}};var n,u,c;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    subjectGroupingMode: 'location',
    groupedSubjects: groupedSubjectsLocation
  }
}`,...(c=(u=e.parameters)==null?void 0:u.docs)==null?void 0:c.source}}};var i,p,b;o.parameters={...o.parameters,docs:{...(i=o.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    subjectGroupingMode: 'separate',
    groupedSubjects: groupedSubjectsSeparate
  }
}`,...(b=(p=o.parameters)==null?void 0:p.docs)==null?void 0:b.source}}};var l,d,m;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    ...baseArgs,
    subjectGroupingMode: 'location',
    groupedSubjects: []
  }
}`,...(m=(d=s.parameters)==null?void 0:d.docs)==null?void 0:m.source}}};const F=["GroupedByLocation","Separate","Empty"];export{s as Empty,e as GroupedByLocation,o as Separate,F as __namedExportsOrder,V as default};
