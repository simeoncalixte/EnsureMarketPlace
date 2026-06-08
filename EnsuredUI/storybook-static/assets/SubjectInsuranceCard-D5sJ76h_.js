import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{R as f}from"./index-B3TfwC44.js";import{bP as j,bR as q,bS as T,bK as x,bT as S,bU as k}from"./InsurerDashboard.styles-BNsNl3gT.js";import{I as h}from"./Input-BOqlzFhj.js";import{S as u}from"./Select-Vu80i_dn.js";import{B}from"./Button-BdN1JsLa.js";import{S as O}from"./SubjectTemplateFields-CH0jMXl_.js";const w=f.memo(function({subject:r,subjectIndex:a,organizationId:l,isCollapsed:i,onToggleCollapsed:m,taxonomyByPrimaryLabel:o,lineOfBusinessTaxonomy:s,onRemoveSubject:d,onUpdateSubject:p,onUpdateSubjectPrimaryLineOfBusiness:y,onUpdateSubjectLineOfBusinessSubType:g,onFieldValueChange:b,onTemplateResolved:c}){var t;const v=((t=o.get(r.lineOfBusiness))==null?void 0:t.subTypes)??[];return e.jsxs(j,{"data-kind":"subject","data-primary":a===0,children:[e.jsxs(q,{style:{marginBottom:12},children:[e.jsxs("div",{children:[e.jsxs(T,{children:["Subject ",a+1]}),e.jsx("div",{style:{fontWeight:800},children:r.subjectLabel||`Subject ${a+1}`})]}),e.jsxs(x,{children:[e.jsx(S,{type:"button",onClick:()=>m(r.subjectId),children:i?"Expand":"Collapse"}),e.jsx(B,{type:"button",onClick:()=>d(a),children:"Remove"})]})]}),i?null:e.jsxs(e.Fragment,{children:[e.jsxs(k,{children:[e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,textTransform:"uppercase",color:"#94a3b8",fontWeight:700},children:"Subject Label"}),e.jsx(h,{value:r.subjectLabel,onChange:n=>p(a,"subjectLabel",n.target.value)})]}),e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,textTransform:"uppercase",color:"#94a3b8",fontWeight:700},children:"Line of Business"}),e.jsxs(u,{value:r.lineOfBusiness,onChange:n=>y(a,n.target.value),children:[e.jsx("option",{value:"",children:"Select primary line of business"}),s.map(n=>e.jsx("option",{value:n.label,children:n.label},n.code))]})]}),e.jsxs("div",{children:[e.jsx("label",{style:{fontSize:10,textTransform:"uppercase",color:"#94a3b8",fontWeight:700},children:"Line of Business Subtype"}),e.jsxs(u,{value:r.lineOfBusinessSubType,onChange:n=>g(a,n.target.value),disabled:!r.lineOfBusiness,children:[e.jsx("option",{value:"",children:"Select subtype"}),v.map(n=>e.jsx("option",{value:n.label,children:n.label},n.code))]})]})]}),e.jsx(O,{subject:r,subjectIndex:a,organizationId:l,taxonomy:s,onFieldValueChange:b,onTemplateResolved:c})]})]})});w.__docgenInfo={description:"",methods:[],displayName:"SubjectInsuranceCard",props:{subject:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  subjectId: string;
  subjectLabel: string;
  lineOfBusiness: string;
  lineOfBusinessSubType: string;
  fieldValues: Record<string, string>;
}`,signature:{properties:[{key:"subjectId",value:{name:"string",required:!0}},{key:"subjectLabel",value:{name:"string",required:!0}},{key:"lineOfBusiness",value:{name:"string",required:!0}},{key:"lineOfBusinessSubType",value:{name:"string",required:!0}},{key:"fieldValues",value:{name:"Record",elements:[{name:"string"},{name:"string"}],raw:"Record<string, string>",required:!0}}]}},description:""},subjectIndex:{required:!0,tsType:{name:"number"},description:""},organizationId:{required:!1,tsType:{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},description:""},isCollapsed:{required:!0,tsType:{name:"boolean"},description:""},onToggleCollapsed:{required:!0,tsType:{name:"signature",type:"function",raw:"(subjectId: string) => void",signature:{arguments:[{type:{name:"string"},name:"subjectId"}],return:{name:"void"}}},description:""},taxonomyByPrimaryLabel:{required:!0,tsType:{name:"Map",elements:[{name:"string"},{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"code",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"LineOfBusinessTaxonomySubType[]",required:!0}}]}}],raw:"LineOfBusinessTaxonomyPrimary[]"},description:""},onRemoveSubject:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number) => void",signature:{arguments:[{type:{name:"number"},name:"index"}],return:{name:"void"}}},description:""},onUpdateSubject:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, key: SubjectTextFieldKey, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"union",raw:"'subjectLabel' | 'lineOfBusiness' | 'lineOfBusinessSubType'",elements:[{name:"literal",value:"'subjectLabel'"},{name:"literal",value:"'lineOfBusiness'"},{name:"literal",value:"'lineOfBusinessSubType'"}]},name:"key"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onUpdateSubjectPrimaryLineOfBusiness:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onUpdateSubjectLineOfBusinessSubType:{required:!0,tsType:{name:"signature",type:"function",raw:"(index: number, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"index"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onFieldValueChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(subjectIndex: number, fieldKey: string, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"subjectIndex"},{type:{name:"string"},name:"fieldKey"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onTemplateResolved:{required:!0,tsType:{name:"signature",type:"function",raw:"(subjectIndex: number, fields: LineOfBusinessPageTemplateField[]) => void",signature:{arguments:[{type:{name:"number"},name:"subjectIndex"},{type:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]"},name:"fields"}],return:{name:"void"}}},description:""}}};export{w as S};
