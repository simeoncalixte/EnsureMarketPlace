import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as c,R as Le}from"./index-B3TfwC44.js";import{u as re,O as Be,b as Oe,L as Ee}from"./chunk-OE4NN4TA-D-lI_iOm.js";import{y as a}from"./styled-components.browser.esm-BtVlB3rV.js";import{P as Ie,H as le,a as de,b as ce,S as ue,c as pe,L as Fe,d as Ae,e as Me,f as Pe,g as Re,h as D,i as q}from"./InsurerDashboard.styles-BNsNl3gT.js";import{l as $e,a as Ne,s as V,b as We,r as He,L as _e}from"./SubjectTemplateFields-CH0jMXl_.js";import{u as Je}from"./useAuthMe-B_qCSjfZ.js";import{M as Ke}from"./Modal-BflAQ_kP.js";import{S as De}from"./SegmentedSwitch-B7FGOm21.js";const he=a.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
`,me=a.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`,E=a.div`
  background: #0f1724;
  border: 1px solid rgba(75, 142, 255, 0.08);
  border-radius: 12px;
  padding: 1rem 1.125rem;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
`,I=a.div`
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 0.45rem;
`,F=a.div`
  font-size: 1.35rem;
  font-weight: 800;
  color: #dae2fd;
`,A=a.div`
  margin-top: 0.45rem;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
`,qe=a.div`
  background: #171f33;
  border: 1px solid rgba(75, 142, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
`,Ve=a.div`
  overflow-x: auto;
`,Ge=a.table`
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;

  thead th {
    padding: 0.875rem 1.125rem;
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94a3b8;
    background: rgba(15, 23, 36, 0.75);
  }

  tbody td {
    padding: 1rem 1.125rem;
    border-top: 1px solid rgba(65, 71, 85, 0.12);
    vertical-align: top;
  }

  tbody tr[data-kind='primary'][data-active='true'] {
    background: rgba(75, 142, 255, 0.08);
  }

  tbody tr[data-kind='primary']:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  tbody tr[data-kind='subtype'] td {
    background: rgba(15, 23, 36, 0.88);
  }
`,ee=a.button`
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
`,Ye=a.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: rgba(75, 142, 255, 0.12);
  color: #4b8eff;
  transform: ${({$expanded:r})=>r?"rotate(90deg)":"rotate(0deg)"};
  transition: transform 160ms ease;
`,te=a.div`
  font-size: 14px;
  font-weight: 800;
  color: #dae2fd;
`,J=a.div`
  margin-top: 0.25rem;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.45;
`,ne=a.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  font-size: 11px;
  font-family: 'JetBrains Mono', 'SFMono-Regular', Menlo, monospace;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4edea3;
  background: rgba(0, 165, 114, 0.12);
`,ie=a.span`
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4b8eff;
  background: rgba(75, 142, 255, 0.12);
`,Ze=a.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding-left: 1.75rem;
`,Ue=a.span`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-top: 0.4rem;
  background: #4edea3;
  box-shadow: 0 0 0 4px rgba(78, 222, 163, 0.08);
  flex: 0 0 auto;
`,N=a.div`
  padding: 1.5rem 1.125rem;
  color: #94a3b8;
  font-size: 13px;
`,Qe=a.div`
  display: grid;
  gap: 0.75rem;
`;a.div`
  display: grid;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(65, 71, 85, 0.12);

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }
`;a.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
`;a.div`
  font-size: 12px;
  font-weight: 800;
  color: #4edea3;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;a.div`
  margin-top: 0.25rem;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
`;a.div`
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(65, 71, 85, 0.08);
`;a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
`;const se=a.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(75, 142, 255, 0.2);
  background: rgba(75, 142, 255, 0.12);
  color: #dae2fd;
  border-radius: 8px;
  padding: 0.35rem 0.6rem;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;a.div`
  font-size: 13px;
  font-weight: 700;
  color: #dae2fd;
`;a.div`
  margin-top: 0.25rem;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
`;const Xe=a.ol`
  margin: 0;
  padding-left: 1.15rem;
  color: #dae2fd;
  line-height: 1.7;
`,oe=a.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
`,$=a.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  border: 1px solid rgba(75, 142, 255, 0.16);
  background: rgba(75, 142, 255, 0.08);
  color: #cfe0ff;
  font-size: 11px;
  font-weight: 700;
`,fe=a(Ee)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(75, 142, 255, 0.24);
  background: rgba(75, 142, 255, 0.14);
  color: #dae2fd;
  font-weight: 700;
  text-decoration: none;
`,G={base:"/insurer/coverage/line-of-business",activeTemplate:"/insurer/coverage/line-of-business/active-template"};function ge(r){return`${r} subtype${r===1?"":"s"}`}function P(r){return[...r].sort((s,h)=>s.order-h.order).map(s=>({...s,layout:tt(s),fields:[...s.fields].sort((h,y)=>h.order-y.order)}))}function ae(r){return r.trim().replace(/([a-z\d])([A-Z])/g,"$1_$2").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").toLowerCase()}function et(r){const s=r>=6?3:r>=3?2:1,h=Math.max(2,Math.ceil(r/s));return{type:"grid",columns:s,gap:12,dense:!1,columnWidths:Array.from({length:s},()=>1),rowHeights:Array.from({length:h},()=>120)}}function tt(r){var T,B,x,C,z,O,S;const s=et(r.fields.length),h=r.fields.reduce((b,l)=>{if(!l.layout)return b;const m=l.layout.columnStart&&l.layout.columnStart>0?l.layout.columnStart:1,j=l.layout.columnSpan&&l.layout.columnSpan>0?l.layout.columnSpan:1,n=l.layout.rowStart&&l.layout.rowStart>0?l.layout.rowStart:1,k=l.layout.rowSpan&&l.layout.rowSpan>0?l.layout.rowSpan:1;return{columnEnd:Math.max(b.columnEnd,m+j-1),rowEnd:Math.max(b.rowEnd,n+k-1)}},{columnEnd:1,rowEnd:1}),y=(T=r.layout)!=null&&T.columns&&r.layout.columns>0?r.layout.columns:s.columns??1,g=Math.max(y,((x=(B=r.layout)==null?void 0:B.columnWidths)==null?void 0:x.length)??0,h.columnEnd),v=Array.from({length:g},(b,l)=>{var j,n;const m=(n=(j=r.layout)==null?void 0:j.columnWidths)==null?void 0:n[l];return typeof m=="number"&&Number.isFinite(m)&&m>0?m:1}),L=Math.max(((z=(C=r.layout)==null?void 0:C.rowHeights)==null?void 0:z.length)??0,h.rowEnd,Math.max(2,Math.ceil(r.fields.length/v.length))),M=Array.from({length:L},(b,l)=>{var j,n;const m=(n=(j=r.layout)==null?void 0:j.rowHeights)==null?void 0:n[l];return typeof m=="number"&&Number.isFinite(m)&&m>0?m:120});return{type:"grid",columns:v.length,gap:(O=r.layout)!=null&&O.gap&&r.layout.gap>0?r.layout.gap:s.gap,dense:!!((S=r.layout)!=null&&S.dense),columnWidths:v,rowHeights:M}}function nt(){const r=re(),[s,h]=c.useState([]),[y,g]=c.useState([]),[v,L]=c.useState(!0),[M,T]=c.useState(!1),[B,x]=c.useState(null),[C,z]=c.useState(null),[O,S]=c.useState(null),[b,l]=c.useState(null),[m,j]=c.useState(""),{user:n,loading:k}=Je(),[K,p]=c.useState(!1),[w,W]=c.useState(!1),[xe,H]=c.useState(!1);c.useEffect(()=>{if(k)return;let t=!0;return L(!0),$e({organizationId:(n==null?void 0:n.organizationId)??null}).then(({primaryTypes:i,pageTemplate:d})=>{t&&(h(i),S(d),g(P((d==null?void 0:d.sections)??[])),L(!1))}),()=>{t=!1}},[k,n==null?void 0:n.organizationId]),c.useEffect(()=>{if(s.length===0){z(null);return}z(t=>t&&s.some(i=>i.code===t)?t:s[0].code)},[s]);const o=c.useMemo(()=>s.find(t=>t.code===C)??null,[C,s]),u=c.useMemo(()=>!o||!b?null:o.subTypes.find(t=>t.code===b)??null,[o,b]);c.useEffect(()=>{if(!o){l(null);return}b&&o.subTypes.some(t=>t.code===b)||l(null)},[o==null?void 0:o.code]),c.useEffect(()=>{if(k)return;if(!o){S(null),g([]),x(null);return}let t=!0;return T(!0),x(null),Ne({organizationId:(n==null?void 0:n.organizationId)??null,lineOfBusinessCode:o.code,lineOfBusinessSubTypeCode:(u==null?void 0:u.code)??null}).then(({template:i,isOrgTemplate:d})=>{if(!t)return;S(i);const f=P(i.sections??[]);g(f),!d&&(n==null?void 0:n.organizationId)!=null&&o&&V({definition:{...i,sections:f},organizationId:n.organizationId,lineOfBusinessCode:o.code,lineOfBusinessSubTypeCode:(u==null?void 0:u.code)??null})}).catch(i=>{t&&(x(i instanceof Error?i.message:"Failed to load active template"),S(null),g([]))}).finally(()=>{t&&T(!1)}),()=>{t=!1}},[k,o==null?void 0:o.code,u==null?void 0:u.code,n==null?void 0:n.organizationId]),c.useEffect(()=>{j(JSON.stringify({...O??{schemaVersion:1,pageKey:"insured-subjects",title:"Insured Subjects",sections:y},sections:y},null,2))},[O,y]);const Y=c.useMemo(()=>s.reduce((t,i)=>t+i.subTypes.length,0),[s]),Z=c.useMemo(()=>y.reduce((t,i)=>t+i.fields.length,0),[y]);o==null||o.subTypes.length;const U=o?u?`${o.label} / ${u.label}`:`${o.label} / Parent`:"None",be=!o||M||xe||w;function Q(t,i){z(t.code),l((i==null?void 0:i.code)??null),r(G.activeTemplate)}const je={selectedPrimary:o,selectedSubtype:u,activeTemplateScopeLabel:U,primaryTypeCount:s.length,totalSubTypes:Y,templateFieldCount:Z,templateSections:y,templateLoading:M,templateError:B,sectionEditorDisabled:be,editingJson:m,saving:K,setEditingJson:j,setActiveSubtypeCode:l,replaceSection:ve,handleSave:Se,handleAddField:we,handleRemoveField:Te};async function ye(t){if(o)try{W(!0),x(null);const d=await V({definition:{...O??{schemaVersion:1,pageKey:"insured-subjects",title:"Insured Subjects",sections:t},sections:t},organizationId:(n==null?void 0:n.organizationId)??null,lineOfBusinessCode:o.code,lineOfBusinessSubTypeCode:(u==null?void 0:u.code)??""});S(d),g(P(d.sections??[])),j(JSON.stringify(d,null,2))}catch(i){x(i instanceof Error?i.message:"Failed to persist section layout")}finally{W(!1)}}function ve(t){let i=[];g(d=>{const f=d.map(_=>_.key===t.key?t:_);return i=f,f}),i.length>0&&ye(i)}async function Se(){try{p(!0);const t=JSON.parse(m),i=await V({definition:t,organizationId:(n==null?void 0:n.organizationId)??null,lineOfBusinessCode:(o==null?void 0:o.code)??"",lineOfBusinessSubTypeCode:b??""});S(i),g(P(i.sections??[])),j(JSON.stringify(i,null,2)),alert("Template saved")}catch(t){alert("Save failed: "+String((t==null?void 0:t.message)??t))}finally{p(!1)}}async function we(t){const i=window.prompt(`Add field to ${t.label}
Field label:`),d=String(i??"").trim();if(!d)return;const f=ae(d),_=window.prompt("Field key:",f),X=ae(String(_??f));if(!X){alert("Field key is required.");return}const Ce=window.prompt("Field type (text, number, select, textarea, date):","text"),ze=String(Ce??"text").trim()||"text",ke=window.confirm("Should this field be required?");try{H(!0),x(null);const R=await We({organizationId:(n==null?void 0:n.organizationId)??null,lineOfBusinessCode:(o==null?void 0:o.code)??"",lineOfBusinessSubTypeCode:(u==null?void 0:u.code)??"",sectionKey:t.key,field:{key:X,label:d,type:ze,required:ke}});S(R),g(P(R.sections??[]))}catch(R){x(R instanceof Error?R.message:"Failed to add field")}finally{H(!1)}}async function Te(t,i){if(window.confirm(`Remove field '${i.label}' from ${t.label}?`))try{H(!0),x(null);const f=await He({organizationId:(n==null?void 0:n.organizationId)??null,lineOfBusinessCode:(o==null?void 0:o.code)??"",lineOfBusinessSubTypeCode:(u==null?void 0:u.code)??"",sectionKey:t.key,fieldKey:i.key});S(f),g(P(f.sections??[]))}catch(f){x(f instanceof Error?f.message:"Failed to remove field")}finally{H(!1)}}return e.jsxs(Ie,{children:[e.jsxs(le,{children:[e.jsxs("div",{children:[e.jsx(de,{children:"Line of Business Templates"}),e.jsx(ce,{children:"Primary lines expand into subtype children so the insured subject builder can inherit a dynamic field template from a single source of truth."})]}),e.jsxs(he,{children:[e.jsx(ue,{style:{borderLeftColor:"#4edea3"},children:e.jsx(pe,{style:{color:"#4edea3"},children:v?"Loading backend values":`${s.length} primary lines`})}),e.jsx(fe,{to:"/insurer/coverage/create",children:"Open Coverage Builder"})]})]}),e.jsxs(me,{children:[e.jsxs(E,{children:[e.jsx(I,{children:"Primary Lines"}),e.jsx(F,{children:v?"…":s.length}),e.jsx(A,{children:"Top-level classes available for insured subject templates."})]}),e.jsxs(E,{children:[e.jsx(I,{children:"Subtype Nodes"}),e.jsx(F,{children:v?"…":Y}),e.jsx(A,{children:"Child templates that inherit the selected primary line."})]}),e.jsxs(E,{children:[e.jsx(I,{children:"Field Slots"}),e.jsx(F,{children:v?"…":Z}),e.jsx(A,{children:"Template fields loaded from the backend insured-subject definition."})]}),e.jsxs(E,{children:[e.jsx(I,{children:"Active Template"}),e.jsx(F,{children:U}),e.jsx(A,{children:o?u?"Subtype-specific template loaded. Open the popup to edit the fields.":"Parent template loaded. Open the popup to edit the baseline fields.":"Select a primary line to inspect its popup template branch."})]})]}),e.jsxs("div",{style:{display:"grid",gap:"1.5rem"},children:[e.jsx(Fe,{style:{maxWidth:"none"},children:e.jsxs(Ae,{children:[e.jsxs(Me,{children:[e.jsx(Pe,{children:"Taxonomy Table"}),e.jsx(Re,{})]}),e.jsx("div",{style:{marginBottom:"1rem",color:"#94a3b8",fontSize:13,lineHeight:1.6},children:"Click a primary line to reveal its subtype children. Those children are the branch nodes the insured subject builder can use when shaping template fields."}),e.jsx(qe,{children:e.jsx(Ve,{children:e.jsxs(Ge,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Line of Business"}),e.jsx("th",{children:"Code"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Template Role"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:v?e.jsx("tr",{children:e.jsx("td",{colSpan:5,children:e.jsx(N,{children:"Loading line of business taxonomy…"})})}):s.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:5,children:e.jsx(N,{children:"There is no line of business taxonomy available yet."})})}):s.map(t=>{const i=C===t.code;return e.jsxs(Le.Fragment,{children:[e.jsxs("tr",{"data-kind":"primary","data-active":i?"true":"false",children:[e.jsx("td",{children:e.jsxs(ee,{type:"button","aria-expanded":i,onClick:()=>{z(t.code),l(null)},children:[e.jsx(Ye,{$expanded:i,children:"▸"}),e.jsxs("div",{children:[e.jsx(te,{children:t.label}),e.jsxs(J,{children:[ge(t.subTypes.length)," available"]})]})]})}),e.jsx("td",{children:e.jsx(ne,{children:t.code})}),e.jsx("td",{children:e.jsx(ie,{children:i?"Active":"Available"})}),e.jsx("td",{children:e.jsx(J,{children:"Parent template for insured subject construction"})}),e.jsx("td",{children:e.jsx(se,{type:"button","aria-label":`Edit ${t.label} template`,onClick:()=>Q(t,null),children:"Edit"})})]}),i&&t.subTypes.map(d=>{const f=b===d.code;return e.jsxs("tr",{"data-kind":"subtype",children:[e.jsx("td",{children:e.jsx(Ze,{children:e.jsxs(ee,{type:"button",onClick:()=>l(d.code),children:[e.jsx(Ue,{"aria-hidden":"true"}),e.jsxs("div",{children:[e.jsxs(te,{children:[d.label,f?" — Selected":""]}),e.jsx(J,{children:"Subtype template inherits the parent field blueprint"})]})]})})}),e.jsx("td",{children:e.jsx(ne,{children:d.code})}),e.jsx("td",{children:e.jsx(ie,{children:"Child template"})}),e.jsx("td",{children:e.jsx(J,{children:"Use the base subject fields plus subtype overrides."})}),e.jsx("td",{children:e.jsx(se,{type:"button","aria-label":`Edit ${d.label} template`,onClick:()=>Q(t,d),children:"Edit"})})]},d.code)})]},t.code)})})]})})})]})}),e.jsx(Be,{context:je})]})]})}function it(){const r=re(),{selectedPrimary:s,selectedSubtype:h,setActiveSubtypeCode:y,activeTemplateScopeLabel:g,primaryTypeCount:v,totalSubTypes:L,templateFieldCount:M,templateLoading:T,templateError:B,templateSections:x,sectionEditorDisabled:C,editingJson:z,saving:O,setEditingJson:S,replaceSection:b,handleSave:l,handleAddField:m,handleRemoveField:j}=Oe(),n=c.useMemo(()=>s?[{label:"Parent",code:null},...s.subTypes.map(p=>({label:p.label,code:p.code}))]:[],[s]),k=c.useMemo(()=>{if(!s||!h)return 0;const p=n.findIndex(w=>w.code===h.code);return p>=0?p:0},[s,h,n]);function K(p){var w;s&&y(((w=n[p])==null?void 0:w.code)??null)}return e.jsxs(Ke,{open:!0,title:"Active Template",onClose:()=>r(G.base,{replace:!0}),width:"min(1160px, 96%)",footer:e.jsx(e.Fragment,{}),children:[e.jsxs(le,{children:[e.jsxs("div",{children:[e.jsx(de,{children:"Active Template"}),e.jsx(ce,{children:"Popup workspace for the currently selected line-of-business template scope."})]}),e.jsxs(he,{children:[e.jsx(ue,{style:{borderLeftColor:"#4edea3"},children:e.jsx(pe,{style:{color:"#4edea3"},children:T?"Loading template":g})}),e.jsx(fe,{to:G.base,children:"Back to Line of Business"})]})]}),e.jsxs(D,{children:[e.jsxs(q,{children:[e.jsx("div",{style:{fontSize:12,color:"#94a3b8",textTransform:"uppercase",fontWeight:700},children:"Template Scope"}),e.jsx("div",{style:{fontSize:20,fontWeight:800,marginTop:8},children:g==="None"?"No line selected":g}),n.length>1&&e.jsxs("div",{style:{marginTop:16},children:[e.jsx("div",{style:{fontSize:12,color:"#94a3b8",textTransform:"uppercase",fontWeight:700,marginBottom:8},children:"Template Segment"}),e.jsx(De,{options:n.map(p=>p.label),value:k,onChange:K})]}),e.jsx("div",{style:{marginTop:8,color:"#94a3b8",fontSize:13,lineHeight:1.5},children:s?h?"You are editing a subtype-specific override. Changes only affect this selected property subtype.":"You are editing the parent template. This acts as the baseline for all subtype branches.":"Select a primary line to inspect its template branch."}),s&&e.jsxs(oe,{children:[e.jsx($,{children:s.code}),h?e.jsx($,{children:h.code}):e.jsx($,{children:"parent-template"}),e.jsx($,{children:ge(s.subTypes.length)})]})]}),e.jsx("div",{style:{padding:16},children:e.jsxs(me,{style:{marginBottom:0,gridTemplateColumns:"repeat(3, minmax(0, 1fr))"},children:[e.jsxs(E,{children:[e.jsx(I,{children:"Primary Lines"}),e.jsx(F,{children:v}),e.jsx(A,{children:"Top-level classes available for the subject template."})]}),e.jsxs(E,{children:[e.jsx(I,{children:"Subtype Nodes"}),e.jsx(F,{children:L}),e.jsx(A,{children:"Child templates that inherit the selected primary line."})]}),e.jsxs(E,{children:[e.jsx(I,{children:"Field Slots"}),e.jsx(F,{children:M}),e.jsx(A,{children:"Template fields loaded from the backend insured-subject definition."})]})]})})]}),e.jsx(D,{children:e.jsxs(q,{children:[e.jsx("div",{style:{fontSize:12,color:"#94a3b8",textTransform:"uppercase",fontWeight:700,marginBottom:12},children:"Backend Insured Subject Template"}),T?e.jsx(N,{children:"Loading insured subject template definition from the backend…"}):B?e.jsx(N,{children:B}):x.length===0?e.jsx(N,{children:"No template fields are available for the selected scope."}):e.jsx(Qe,{children:x.map(p=>e.jsx(_e,{section:p,primaryTypeCount:v,totalSubTypes:L,disabled:C,onAddField:w=>void m(w),onRemoveField:(w,W)=>void j(w,W),onSectionChange:b},p.key))})]})}),e.jsxs(D,{children:[e.jsxs(q,{children:[e.jsx("div",{style:{fontSize:12,color:"#94a3b8",textTransform:"uppercase",fontWeight:700},children:"Template Assembly"}),e.jsx("div",{style:{fontSize:20,fontWeight:800,marginTop:8},children:"How the subject template is built"})]}),e.jsxs("div",{style:{padding:16},children:[e.jsxs(Xe,{children:[e.jsx("li",{children:"Select the parent line of business."}),e.jsx("li",{children:"Open the active child subtype branch."}),e.jsx("li",{children:"Map the base fields into the insured subject schema."}),e.jsx("li",{children:"Layer subtype-specific overrides before creating coverage."})]}),s&&s.subTypes.length>0&&e.jsx(oe,{children:s.subTypes.slice(0,4).map(p=>e.jsx($,{children:p.label},p.code))})]})]})]})}nt.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessPage"};it.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessActiveTemplatePage"};export{it as L,nt as a};
