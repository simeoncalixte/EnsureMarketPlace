import{j as r}from"./jsx-runtime-BjG_zV1W.js";import{R,r as i}from"./index-B3TfwC44.js";import{d as A,e as P,f as G,g as z,bK as E,bL as c,ak as K,bM as F}from"./InsurerDashboard.styles-BNsNl3gT.js";import{B as V}from"./Button-BdN1JsLa.js";import{S as U}from"./SubjectInsuranceCard-D5sJ76h_.js";const W=R.memo(function({isActive:y,subjectGroupingMode:u,groupedSubjects:l,organizationId:g,taxonomyByPrimaryLabel:b,lineOfBusinessTaxonomy:f,onSetLocationGrouping:v,onSetSeparateGrouping:S,onAddSubject:j,onRemoveSubject:k,onUpdateSubject:q,onUpdateSubjectPrimaryLineOfBusiness:x,onUpdateSubjectLineOfBusinessSubType:w,onFieldValueChange:T,onTemplateResolved:h}){const[B,d]=i.useState(()=>new Set),[O,m]=i.useState(()=>new Set),o=i.useRef(!1),p=i.useRef(!1);i.useEffect(()=>{d(e=>{if(u!=="location")return o.current=!1,e.size===0?e:new Set;const t=new Set(l.map(s=>s.key));if(!o.current&&t.size>0)return o.current=!0,new Set(t);let n=!1;const a=new Set;return e.forEach(s=>{t.has(s)?a.add(s):n=!0}),!n&&a.size===e.size?e:a})},[l,u]);const C=i.useCallback(e=>{d(t=>{const n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n})},[]);i.useEffect(()=>{m(e=>{const t=new Set(l.flatMap(s=>s.subjects.map(({subject:I})=>I.subjectId)));if(!p.current&&t.size>0)return p.current=!0,new Set(t);let n=!1;const a=new Set;return e.forEach(s=>{t.has(s)?a.add(s):n=!0}),!n&&a.size===e.size?e:a})},[l]);const L=i.useCallback(e=>{m(t=>{const n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n})},[]);return r.jsxs(A,{style:{display:y?"block":"none"},children:[r.jsxs(P,{children:[r.jsx(G,{children:"02 Subject of Insurance"}),r.jsx(z,{}),r.jsxs(E,{children:[r.jsx(c,{type:"button",onClick:v,"data-mode":u==="location"?"location":"",children:"Group by Location"}),r.jsx(c,{type:"button",onClick:S,"data-mode":u==="separate"?"separate":"",children:"Separate"}),r.jsx(V,{type:"button",onClick:j,children:"+ Add Subject"})]})]}),r.jsx(K,{children:"Track each insured object separately, or group them by location. Subjects without location data are grouped under Unknown / Undefined."}),r.jsx(F,{children:l.map(e=>{const t=B.has(e.key);return r.jsxs("div",{style:{display:"grid",gap:8},children:[u==="location"?r.jsxs("button",{type:"button",onClick:()=>C(e.key),style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,width:"100%",border:"1px solid rgba(65,71,85,0.18)",borderRadius:10,background:"#0f1724",color:"#94a3b8",fontSize:11,textTransform:"uppercase",letterSpacing:".12em",fontWeight:700,padding:"10px 12px",cursor:"pointer"},children:[r.jsx("span",{children:e.label}),r.jsx("span",{children:t?`Expand (${e.subjects.length})`:`Collapse (${e.subjects.length})`})]}):null,t?null:e.subjects.map(({subject:n,index:a})=>r.jsx(U,{subject:n,subjectIndex:a,organizationId:g,isCollapsed:O.has(n.subjectId),onToggleCollapsed:L,taxonomyByPrimaryLabel:b,lineOfBusinessTaxonomy:f,onRemoveSubject:k,onUpdateSubject:q,onUpdateSubjectPrimaryLineOfBusiness:x,onUpdateSubjectLineOfBusinessSubType:w,onFieldValueChange:T,onTemplateResolved:h},n.subjectId))]},e.key)})})]})});W.__docgenInfo={description:"",methods:[],displayName:"SubjectInsuranceSection",props:{isActive:{required:!0,tsType:{name:"boolean"},description:""},subjectGroupingMode:{required:!0,tsType:{name:"union",raw:"'location' | 'separate'",elements:[{name:"literal",value:"'location'"},{name:"literal",value:"'separate'"}]},description:""},groupedSubjects:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  key: string;
  label: string;
  subjects: GroupedSubject[];
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"subjects",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  subject: SubjectInput;
  index: number;
}`,signature:{properties:[{key:"subject",value:{name:"signature",type:"object",raw:`{
  subjectId: string;
  subjectLabel: string;
  lineOfBusiness: string;
  lineOfBusinessSubType: string;
  fieldValues: Record<string, string>;
}`,signature:{properties:[{key:"subjectId",value:{name:"string",required:!0}},{key:"subjectLabel",value:{name:"string",required:!0}},{key:"lineOfBusiness",value:{name:"string",required:!0}},{key:"lineOfBusinessSubType",value:{name:"string",required:!0}},{key:"fieldValues",value:{name:"Record",elements:[{name:"string"},{name:"string"}],raw:"Record<string, string>",required:!0}}]},required:!0}},{key:"index",value:{name:"number",required:!0}}]}}],raw:"GroupedSubject[]",required:!0}}]}}],raw:"SubjectGroup[]"},description:""},organizationId:{required:!1,tsType:{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},description:""},taxonomyByPrimaryLabel:{required:!0,tsType:{name:"Map",elements:[{name:"string"},{name:"signature",type:"object",raw:`{
  code: string;
  label: string;
  subTypes: LineOfBusinessTaxonomySubType[];
}`,signature:{properties:[{key:"code",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"subTypes",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  code: string;
  label: string;
}`,signature:{properties:[{key:"code",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"LineOfBusinessTaxonomySubType[]",required:!0}}]}}],raw:"Map<string, LineOfBusinessTaxonomyPrimary>"},description:""},lineOfBusinessTaxonomy:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  code: string;
  label: string;
  subTypes: LineOfBusinessTaxonomySubType[];
}`,signature:{properties:[{key:"code",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"subTypes",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  code: string;
  label: string;
}`,signature:{properties:[{key:"code",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"LineOfBusinessTaxonomySubType[]",required:!0}}]}}],raw:"LineOfBusinessTaxonomyPrimary[]"},description:""},onSetLocationGrouping:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onSetSeparateGrouping:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onAddSubject:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},onRemoveSubject:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number) => void",signature:{arguments:[{type:{name:"number"},name:"index"}],return:{name:"void"}}},description:""},onUpdateSubject:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, key: SubjectTextFieldKey, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"union",raw:"'subjectLabel' | 'lineOfBusiness' | 'lineOfBusinessSubType'",elements:[{name:"literal",value:"'subjectLabel'"},{name:"literal",value:"'lineOfBusiness'"},{name:"literal",value:"'lineOfBusinessSubType'"}]},name:"key"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onUpdateSubjectPrimaryLineOfBusiness:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onUpdateSubjectLineOfBusinessSubType:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onFieldValueChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(subjectIndex: number, fieldKey: string, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"subjectIndex"},{type:{name:"string"},name:"fieldKey"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onTemplateResolved:{required:!0,tsType:{name:"signature",type:"function",raw:"(subjectIndex: number, fields: LineOfBusinessPageTemplateField[]) => void",signature:{arguments:[{type:{name:"number"},name:"subjectIndex"},{type:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  key: string;
  label: string;
  type: string;
  order: number;
  required?: boolean;
  canonicalKey?: string;
  placeholder?: string;
  helperText?: string;
  dataSource?: string;
  dependsOn?: string;
  defaultValue?: string | number | boolean | null;
  options?: LineOfBusinessPageTemplateOption[];
  visibleWhen?: LineOfBusinessPageTemplateVisibility;
  layout?: LineOfBusinessPageTemplateFieldLayout;
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"type",value:{name:"string",required:!0}},{key:"order",value:{name:"number",required:!0}},{key:"required",value:{name:"boolean",required:!1}},{key:"canonicalKey",value:{name:"string",required:!1}},{key:"placeholder",value:{name:"string",required:!1}},{key:"helperText",value:{name:"string",required:!1}},{key:"dataSource",value:{name:"string",required:!1}},{key:"dependsOn",value:{name:"string",required:!1}},{key:"defaultValue",value:{name:"union",raw:"string | number | boolean | null",elements:[{name:"string"},{name:"number"},{name:"boolean"},{name:"null"}],required:!1}},{key:"options",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  label: string;
  value: string;
}`,signature:{properties:[{key:"label",value:{name:"string",required:!0}},{key:"value",value:{name:"string",required:!0}}]}}],raw:"LineOfBusinessPageTemplateOption[]",required:!1}},{key:"visibleWhen",value:{name:"signature",type:"object",raw:`{
  lineOfBusinessCodes?: string[];
  lineOfBusinessSubTypeCodes?: string[];
}`,signature:{properties:[{key:"lineOfBusinessCodes",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!1}},{key:"lineOfBusinessSubTypeCodes",value:{name:"Array",elements:[{name:"string"}],raw:"string[]",required:!1}}]},required:!1}},{key:"layout",value:{name:"signature",type:"object",raw:`{
  columnStart?: number;
  columnSpan?: number;
  rowStart?: number;
  rowSpan?: number;
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]"},name:"fields"}],return:{name:"void"}}},description:""}}};export{W as S};
