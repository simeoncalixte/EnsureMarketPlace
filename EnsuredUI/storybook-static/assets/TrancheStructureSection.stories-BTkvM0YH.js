import{T as a}from"./TrancheStructureSection-wKLEwB6h.js";import"./jsx-runtime-BjG_zV1W.js";import"./InsurerDashboard.styles-BNsNl3gT.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./index-B3TfwC44.js";import"./Button-BdN1JsLa.js";import"./colors-BpeaZ3Jo.js";import"./NumberInput-B6u1J8fd.js";const S={title:"Pages/Insurer Dashboard/Sections/Tranche Structure",component:a},t=[{subjectId:"subject-1",subjectLabel:"Houston Portfolio",lineOfBusiness:"Property",lineOfBusinessSubType:"All Risk",fieldValues:{}},{subjectId:"subject-2",subjectLabel:"Miami Industrial",lineOfBusiness:"Property",lineOfBusinessSubType:"Catastrophe",fieldValues:{}}],c=[{key:"houston-1",label:"Houston, TX",subjects:[{subject:t[0],index:0}]},{key:"miami-1",label:"Miami, FL",subjects:[{subject:t[1],index:1}]}],o=[{trancheId:"tranche-1",name:"Senior Capital",layerMin:"500000000",layerMax:"1200000000",returnRate:"0",riskLevel:"low",capitalRequired:"700000000",subjectSelectionMode:"all",selectedSubjectIds:[]},{trancheId:"tranche-2",name:"Mezzanine",layerMin:"250000000",layerMax:"500000000",returnRate:"0",riskLevel:"medium",capitalRequired:"250000000",subjectSelectionMode:"selective",selectedSubjectIds:["subject-1"]}],e={args:{isActive:!0,tranches:o,subjects:t,groupedSubjects:c,subjectGroupingMode:"location",onAddTranche:()=>{},onUpdateTrancheSubjectSelectionMode:()=>{},onUpdateTranche:()=>{},onUpdateTrancheSubjectSelection:()=>{}}};var n,s,r;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    isActive: true,
    tranches,
    subjects,
    groupedSubjects,
    subjectGroupingMode: 'location',
    onAddTranche: () => {},
    onUpdateTrancheSubjectSelectionMode: () => {},
    onUpdateTranche: () => {},
    onUpdateTrancheSubjectSelection: () => {}
  }
}`,...(r=(s=e.parameters)==null?void 0:s.docs)==null?void 0:r.source}}};const h=["Default"];export{e as Default,h as __namedExportsOrder,S as default};
