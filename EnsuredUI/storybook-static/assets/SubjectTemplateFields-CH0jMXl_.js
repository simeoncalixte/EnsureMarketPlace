import{j as s}from"./jsx-runtime-BjG_zV1W.js";import{r as g,R as he}from"./index-B3TfwC44.js";import{bS as qe,d2 as Se,aE as Te,aF as xe,aG as Oe,d3 as je,d4 as Be,d5 as Ce,d6 as Le,bR as Fe,d7 as Pe,d8 as Ve,d9 as Ee}from"./InsurerDashboard.styles-BNsNl3gT.js";import{g as D}from"./api-2uxkEE_U.js";import{a as U}from"./auth-DmpauaO1.js";import{y as b,p as $e}from"./styled-components.browser.esm-BtVlB3rV.js";import{C as Ae}from"./ConnectedGrid-mgqUdqx5.js";import{c as x}from"./colors-BpeaZ3Jo.js";import{B as C}from"./Badge-BMblvUa5.js";import{B as ue}from"./Button-BdN1JsLa.js";import{S as Me}from"./SegmentedSwitch-B7FGOm21.js";import{C as Re}from"./Checkbox-DszoQXQ5.js";import{I as De}from"./Input-BOqlzFhj.js";import{N as te}from"./NumberInput-B6u1J8fd.js";import{S as We}from"./Select-Vu80i_dn.js";async function Xn(){try{const e=D(),n=e?`${e}/api/marketplace/line-of-business-taxonomy`:"/api/marketplace/line-of-business-taxonomy",r=await fetch(n);if(!r.ok)return[];const a=await r.json();return Array.isArray(a==null?void 0:a.primaryTypes)?a.primaryTypes:[]}catch{return[]}}async function Yn(e={}){try{const n=D(),r=new URLSearchParams;e.organizationId!=null&&r.set("organizationId",String(e.organizationId));const a=r.toString(),t=n?`${n}/api/marketplace/line-of-business-taxonomy${a?`?${a}`:""}`:`/api/marketplace/line-of-business-taxonomy${a?`?${a}`:""}`,i=await fetch(t);if(!i.ok)return{primaryTypes:[],pageTemplate:null};const l=await i.json();return{primaryTypes:Array.isArray(l==null?void 0:l.primaryTypes)?l.primaryTypes:[],pageTemplate:(l==null?void 0:l.pageTemplate)??null}}catch{return{primaryTypes:[],pageTemplate:null}}}async function Ie(e){const n=D(),r=new URLSearchParams;e.organizationId!=null&&r.set("organizationId",String(e.organizationId)),e.lineOfBusinessCode&&r.set("lineOfBusinessCode",e.lineOfBusinessCode),e.lineOfBusinessSubTypeCode&&r.set("lineOfBusinessSubTypeCode",e.lineOfBusinessSubTypeCode);const a=r.toString(),t=n?`${n}/api/marketplace/line-of-business-taxonomy${a?`?${a}`:""}`:`/api/marketplace/line-of-business-taxonomy${a?`?${a}`:""}`,i=await U(t,{method:"GET"});if(!i.ok)throw new Error(`Failed to load insured subject template (${i.status})`);const l=await i.json();if(!l.pageTemplate)throw new Error("Failed to load insured subject template");return{template:l.pageTemplate,isOrgTemplate:l.isOrgTemplate===!0}}async function Zn(e){const n=D(),r=n?`${n}/api/marketplace/insured-subjects/page-template`:"/api/marketplace/insured-subjects/page-template",a={organizationId:e.organizationId??null,lineOfBusinessCode:e.lineOfBusinessCode??"",lineOfBusinessSubTypeCode:e.lineOfBusinessSubTypeCode??"",definitionJson:e.definition},t=await U(r,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)});if(!t.ok){const l=await t.json().catch(()=>null);throw new Error((l==null?void 0:l.error)??`Failed to save template (${t.status})`)}return(await t.json()).pageTemplate}async function er(e){const n=D(),r=n?`${n}/api/marketplace/insured-subjects/page-template/fields`:"/api/marketplace/insured-subjects/page-template/fields",a=await U(r,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:e.organizationId??null,lineOfBusinessCode:e.lineOfBusinessCode??"",lineOfBusinessSubTypeCode:e.lineOfBusinessSubTypeCode??"",sectionKey:e.sectionKey,field:e.field})});if(!a.ok){const i=await a.json().catch(()=>null);throw new Error((i==null?void 0:i.error)??`Failed to add template field (${a.status})`)}return(await a.json()).pageTemplate}async function nr(e){const n=D(),r=n?`${n}/api/marketplace/insured-subjects/page-template/fields`:"/api/marketplace/insured-subjects/page-template/fields",a=await U(r,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:e.organizationId??null,lineOfBusinessCode:e.lineOfBusinessCode??"",lineOfBusinessSubTypeCode:e.lineOfBusinessSubTypeCode??"",sectionKey:e.sectionKey,fieldKey:e.fieldKey})});if(!a.ok){const i=await a.json().catch(()=>null);throw new Error((i==null?void 0:i.error)??`Failed to remove template field (${a.status})`)}return(await a.json()).pageTemplate}const ee="Unknown / Undefined",Ke=["location","locationtext","address","street","city","state","province","region","country","postal","zip","site","premises"],rr=[{id:"deal",label:"Deal Parameters"},{id:"financials",label:"Financials"},{id:"subjects",label:"Subjects"},{id:"tranches",label:"Tranche Structure"},{id:"validation",label:"Validation"},{id:"submission",label:"Submission"},{id:"signing",label:"Signing"}],ie=new Set(["subjectLabel","lineOfBusiness","lineOfBusinessSubType"]),He=[{pattern:/property\s*cat/i,primary:"Property",subType:"Catastrophe"},{pattern:/marine\s*cargo/i,primary:"Ocean Marine",subType:"Cargo"},{pattern:/trade\s*credit/i,primary:"Trade Credit",subType:"Whole Turnover"},{pattern:/energy\s*liability/i,primary:"Energy Liability",subType:"Operators Liability"},{pattern:/construction\s*all\s*risk/i,primary:"Construction All Risk",subType:"Civil Works"},{pattern:/cyber/i,primary:"Cyber",subType:"Network Security"},{pattern:/public\s*entity/i,primary:"Public Entity",subType:"Municipal Property"},{pattern:/professional\s*liability/i,primary:"Professional Liability",subType:"Consultants"},{pattern:/property/i,primary:"Property",subType:"All Risk"},{pattern:/marine/i,primary:"Ocean Marine",subType:"Cargo"}];function R(e){return Number.isFinite(e)?String(Math.round(e)):""}function ne(e){var n;return typeof globalThis<"u"&&((n=globalThis.crypto)!=null&&n.randomUUID)?`${e}-${globalThis.crypto.randomUUID()}`:`${e}-${Date.now()}-${Math.random().toString(16).slice(2)}`}function se(e){const n=e.trim();return n||null}function B(e){return e.trim().toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}function ar(e){const n=e.toLowerCase();return n.includes("marine")?"FLOOD":n.includes("cyber")||n.includes("trade credit")||n.includes("liability")?"EQ":"US WIND"}function oe(e,n,r){const a=e.trim();if(!a||r.length===0)return{primary:"",primaryCode:"",subType:"",subTypeCode:""};const t=B(a),i=B(n),l=(u,o)=>({primary:u.label,primaryCode:u.code,subType:(o==null?void 0:o.label)??"",subTypeCode:(o==null?void 0:o.code)??""});for(const u of r){if(B(u.label)===t||B(u.code)===t){const y=n?u.subTypes.find(q=>B(q.label)===i||B(q.code)===i):u.subTypes[0];return l(u,y)}const o=u.subTypes.find(y=>B(y.label)===t||B(y.code)===t);if(o)return l(u,o);if(n){const y=u.subTypes.find(q=>B(q.label)===i||B(q.code)===i);if(y)return l(u,y)}}for(const u of He)if(u.pattern.test(a)){const o=r.find(O=>B(O.label)===B(u.primary)),y=(o==null?void 0:o.label)??u.primary,q=(o==null?void 0:o.code)??"",h=u.subType?(o==null?void 0:o.subTypes.find(O=>B(O.label)===B(u.subType??"")))??null:(o==null?void 0:o.subTypes[0])??null;return{primary:y,primaryCode:q,subType:(h==null?void 0:h.label)??u.subType??"",subTypeCode:(h==null?void 0:h.code)??""}}return{primary:"",primaryCode:"",subType:"",subTypeCode:""}}function ze(e,n,r=[]){const a=n!=null&&n.cedent?`${n.cedent} Subject`:"Subject",t=n?oe(n.lineOfBusiness,"",r):{primary:"",subType:""};return{subjectId:ne("subject"),subjectLabel:`${a} ${e+1}`,lineOfBusiness:t.primary,lineOfBusinessSubType:t.subType,fieldValues:{}}}function tr(e,n=[]){return[ze(0,e,n)]}function ir(e,n){const r=Object.entries(e.fieldValues).reduce((a,[t,i])=>{const l=i.trim();return l&&(a[t]=l),a},{});return{subjectId:e.subjectId,subjectLabel:e.subjectLabel.trim()||`Subject ${n+1}`,subjectIndex:n+1,lineOfBusiness:se(e.lineOfBusiness),lineOfBusinessSubType:se(e.lineOfBusinessSubType),fieldValues:r}}const Ne=new RegExp(Ke.join("|")),N=new WeakMap;function Ge(e){if(N.has(e))return N.get(e)??"";const n=Object.entries(e.fieldValues);for(const[r,a]of n){const t=r.toLowerCase().replace(/[^a-z0-9]/g,"");if(!Ne.test(t))continue;const l=a.trim();if(l)return N.set(e,l),l}return N.set(e,""),""}function sr(e){const n=new Map;for(let r=0;r<e.length;r+=1){const a=e[r],i=Ge(a)||ee,l=n.get(i);l?l.push({subject:a,index:r}):n.set(i,[{subject:a,index:r}])}return Array.from(n.entries()).sort(([r],[a])=>r===ee?1:a===ee?-1:r.localeCompare(a)).map(([r,a],t)=>({key:`${r}-${t}`,label:r,subjects:a}))}function _e(e){const n=e>=6?3:e>=3?2:1,r=Math.max(2,Math.ceil(e/n));return{type:"grid",columns:n,gap:12,dense:!1,columnWidths:Array.from({length:n},()=>1),rowHeights:Array.from({length:r},()=>120)}}function Ue(e){var o,y,q,h,O,F,P;const n=_e(e.fields.length),r=e.fields.reduce((L,f)=>{if(!f.layout)return L;const v=f.layout.columnStart&&f.layout.columnStart>0?f.layout.columnStart:1,S=f.layout.columnSpan&&f.layout.columnSpan>0?f.layout.columnSpan:1,k=f.layout.rowStart&&f.layout.rowStart>0?f.layout.rowStart:1,M=f.layout.rowSpan&&f.layout.rowSpan>0?f.layout.rowSpan:1;return{columnEnd:Math.max(L.columnEnd,v+S-1),rowEnd:Math.max(L.rowEnd,k+M-1)}},{columnEnd:1,rowEnd:1}),a=(o=e.layout)!=null&&o.columns&&e.layout.columns>0?e.layout.columns:n.columns??1,t=Math.max(a,((q=(y=e.layout)==null?void 0:y.columnWidths)==null?void 0:q.length)??0,r.columnEnd),i=Array.from({length:t},(L,f)=>{var S,k;const v=(k=(S=e.layout)==null?void 0:S.columnWidths)==null?void 0:k[f];return typeof v=="number"&&Number.isFinite(v)&&v>0?v:1}),l=Math.max(((O=(h=e.layout)==null?void 0:h.rowHeights)==null?void 0:O.length)??0,r.rowEnd,Math.max(2,Math.ceil(e.fields.length/i.length))),u=Array.from({length:l},(L,f)=>{var S,k;const v=(k=(S=e.layout)==null?void 0:S.rowHeights)==null?void 0:k[f];return typeof v=="number"&&Number.isFinite(v)&&v>0?v:120});return{type:"grid",columns:i.length,gap:(F=e.layout)!=null&&F.gap&&e.layout.gap>0?e.layout.gap:n.gap,dense:!!((P=e.layout)!=null&&P.dense),columnWidths:i,rowHeights:u}}function Je(e){return[...e??[]].sort((n,r)=>n.order-r.order).map(n=>({...n,layout:Ue(n),fields:[...n.fields??[]].sort((r,a)=>r.order-a.order)}))}function re(e){return e==null?"":typeof e=="boolean"?e?"true":"false":String(e)}function Qe(e,n){var i,l;const r=e.visibleWhen;if(!r)return!0;const a=!((i=r.lineOfBusinessCodes)!=null&&i.length)||!!(n.primaryCode&&r.lineOfBusinessCodes.includes(n.primaryCode)),t=!((l=r.lineOfBusinessSubTypeCodes)!=null&&l.length)||!!(n.subTypeCode&&r.lineOfBusinessSubTypeCodes.includes(n.subTypeCode));return a&&t}function de(e,n){return e?Je(e.sections??[]).map(r=>({...r,fields:r.fields.filter(a=>!ie.has(a.canonicalKey)&&!ie.has(a.key)&&Qe(a,n))})).filter(r=>r.fields.length>0):[]}function Xe(e,n){return de(e,n).flatMap(r=>r.fields)}function Ye(e){return e>=6?3:e>=3?2:1}function Ze(e){return e.reduce((n,r)=>{if(!r.layout)return n;const a=r.layout.columnStart&&r.layout.columnStart>0?r.layout.columnStart:1,t=r.layout.columnSpan&&r.layout.columnSpan>0?r.layout.columnSpan:1,i=r.layout.rowStart&&r.layout.rowStart>0?r.layout.rowStart:1,l=r.layout.rowSpan&&r.layout.rowSpan>0?r.layout.rowSpan:1;return{columnEnd:Math.max(n.columnEnd,a+t-1),rowEnd:Math.max(n.rowEnd,i+l-1)}},{columnEnd:1,rowEnd:1})}function le(e,n,r){return Array.from({length:Math.max(1,n)},(a,t)=>{const i=e==null?void 0:e[t];return typeof i=="number"&&Number.isFinite(i)&&i>0?i:r})}function en(e){var u,o;const n=e.layout,r=Ze(e.fields),a=Ye(e.fields.length),t=n!=null&&n.columns&&n.columns>0?n.columns:a,i=le(n==null?void 0:n.columnWidths,Math.max(t,((u=n==null?void 0:n.columnWidths)==null?void 0:u.length)??0,r.columnEnd),1),l=le(n==null?void 0:n.rowHeights,Math.max(((o=n==null?void 0:n.rowHeights)==null?void 0:o.length)??0,r.rowEnd,Math.max(2,Math.ceil(e.fields.length/i.length))),120);return{columns:i.length,gap:n!=null&&n.gap&&n.gap>0?n.gap:12,dense:!!(n!=null&&n.dense),columnWidths:i,rowHeights:l}}function lr(e,n){return n.reduce((r,a)=>{const t=e[a.key];if(typeof t=="string"&&t.trim().length>0)return r[a.key]=t,r;const i=re(a.defaultValue);return i&&(r[a.key]=i),r},{})}function ur(e){const n=e>0?e:95e7;return[{trancheId:ne("tranche"),name:"Senior Capital",layerMin:R(n*.5),layerMax:R(n*1.2),returnRate:"0",riskLevel:"low",capitalRequired:R(n*.7),subjectSelectionMode:"all",selectedSubjectIds:[]},{trancheId:ne("tranche"),name:"Mezzanine",layerMin:R(n*.25),layerMax:R(n*.5),returnRate:"0",riskLevel:"medium",capitalRequired:R(n*.25),subjectSelectionMode:"all",selectedSubjectIds:[]}]}const nn={textarea:(e,n,r,a,t)=>s.jsxs("div",{children:[a,s.jsx("textarea",{value:n,placeholder:e.placeholder,onChange:i=>r(i.target.value),rows:4,style:{width:"100%",marginTop:8,padding:"10px 14px",borderRadius:10,border:"1px solid rgba(65,71,85,0.3)",background:"#0f1724",color:"#dae2fd",resize:"vertical",outline:"none"}}),t]},e.key),number:(e,n,r,a,t)=>s.jsxs("div",{children:[a,s.jsx(te,{value:n,step:"any",placeholder:e.placeholder,onChange:i=>r(i.target.value),style:{width:"100%",marginTop:8}}),t]},e.key),integer:(e,n,r,a,t)=>s.jsxs("div",{children:[a,s.jsx(te,{value:n,step:1,placeholder:e.placeholder,onChange:i=>r(i.target.value),style:{width:"100%",marginTop:8}}),t]},e.key),select:(e,n,r,a,t)=>s.jsxs("div",{children:[a,s.jsxs(We,{value:n,onChange:i=>r(i.target.value),style:{width:"100%",marginTop:8},children:[s.jsx("option",{value:"",children:e.placeholder??`Select ${e.label.toLowerCase()}`}),(e.options??[]).map(i=>s.jsx("option",{value:i.value,children:i.label},`${e.key}-${i.value}`))]}),t]},e.key),radio:(e,n,r,a,t)=>s.jsxs("div",{children:[a,s.jsx(Te,{role:"radiogroup","aria-label":e.label,style:{marginTop:8},children:(e.options??[]).map(i=>{const l=i.value===n;return s.jsxs(xe,{$selected:l,onClick:()=>r(i.value),children:[s.jsx(Oe,{$selected:l}),i.label]},`${e.key}-${i.value}`)})}),t]},e.key),boolean:(e,n,r,a)=>s.jsxs("label",{style:{display:"flex",alignItems:"center",gap:10,marginTop:8},children:[s.jsx(Re,{checked:n==="true",onChange:t=>r(t.target.checked?"true":"false")}),s.jsx("span",{style:{color:"#dae2fd",fontSize:13,fontWeight:600},children:a})]},e.key)},me=(e,n,r,a,t)=>s.jsxs("div",{children:[a,s.jsx(De,{value:n,placeholder:e.placeholder,onChange:i=>r(i.target.value),style:{marginTop:8}}),t]},e.key);function rn(e,n,r){const a=s.jsxs(qe,{children:[e.label,e.required?" *":""]}),t=e.helperText?s.jsx(Se,{children:e.helperText}):null;return(nn[e.type]??me)(e,n,r,a,t)}me.__docgenInfo={description:"",methods:[],displayName:"defaultTemplateFieldRenderer"};const an=b.div`
  width: 100%;
  display: grid;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid ${x.outlineVariant};
  background: ${({$background:e})=>e??x.surfaceContainerLow};
  color: ${x.text.primary};
  text-align: left;
  min-width: ${({$cardWidth:e})=>e==="pool"?"180px":"0"};
  max-width: ${({$cardWidth:e})=>e==="pool"?"280px":"none"};
  opacity: ${({$disabled:e,$cardWidth:n})=>e?n==="pool"?.7:.75:1};
  cursor: ${({$draggable:e,$disabled:n})=>e?n?"not-allowed":"grab":"default"};
`,tn=b.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
`,sn=b.div`
  min-width: 0;
`,ln=b.div`
  font-size: 13px;
  font-weight: 800;
  color: ${x.text.primary};
`,un=b.div`
  font-size: 11px;
  color: ${x.onSurfaceVariant};
  margin-top: 2px;
  line-height: 1.4;
`,on=b.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`,dn=b.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`,mn=b.header`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
`,pn=b.div`
  min-width: 0;
`,cn=b.h3`
  margin: 6px 0 4px;
  font-size: 16px;
  color: ${x.text.primary};
`,gn=b.p`
  margin: 0;
  color: ${x.onSurfaceVariant};
  font-size: 12px;
  line-height: 1.5;
`,yn=b.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
`,fn=b.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`,bn=b.div`
  color: ${x.onSurfaceVariant};
  font-size: 12px;
  line-height: 1.5;
`,vn=b.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`,kn=b.div`
  width: 100%;
  min-height: 88px;
  padding: 8px;
  border-radius: 10px;
  display: grid;
  gap: 8px;
  align-content: center;
  justify-items: stretch;
  background: ${({$hasField:e})=>e?"rgba(11,18,32,0.72)":"rgba(148,163,184,0.08)"};
  border: 1px solid ${({$hasField:e})=>e?"rgba(75,142,255,0.2)":"transparent"};
`,wn=b.div`
  min-height: 68px;
  border-radius: 8px;
  border: 1px dashed ${x.outlineVariant};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${x.onSurfaceVariant};
  font-size: 11px;
  letter-spacing: 0.08px;
  text-transform: uppercase;
`,hn=b.div`
  display: grid;
  gap: 4px;
  min-width: 0;

  ${({$layout:e})=>{if(!e)return"";const n=[];return e.columnStart&&e.columnSpan?n.push(`grid-column: ${e.columnStart} / span ${e.columnSpan};`):e.columnStart?n.push(`grid-column: ${e.columnStart};`):e.columnSpan&&n.push(`grid-column: span ${e.columnSpan};`),e.rowStart&&e.rowSpan?n.push(`grid-row: ${e.rowStart} / span ${e.rowSpan};`):e.rowStart?n.push(`grid-row: ${e.rowStart};`):e.rowSpan&&n.push(`grid-row: span ${e.rowSpan};`),$e`
      ${n.join(`
`)}
    `}}
`,qn=b.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
`,Sn=b.div`
  color: ${x.onSurfaceVariant};
  font-size: 12px;
`,Tn=b.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;function xn(e){return s.jsxs(on,{children:[s.jsx(C,{variant:"surface",children:e.canonicalKey??e.key}),s.jsx(C,{variant:e.required?"primary":"tertiary",children:e.required?"Required":"Optional"})]})}function pe({field:e,summary:n,draggable:r=!1,disabled:a=!1,cardWidth:t="slot",background:i,onDragStart:l,footer:u}){return s.jsxs(an,{draggable:r,onDragStart:l,$cardWidth:t,$background:i,$disabled:a,$draggable:r,children:[s.jsxs(tn,{children:[s.jsxs(sn,{children:[s.jsx(ln,{children:e.label}),s.jsx(un,{children:n})]}),s.jsx(C,{variant:"surface",children:e.type})]}),xn(e),u?s.jsx(dn,{children:u}):null]})}function ce({sectionLabel:e,sectionDescription:n,showBuilderChrome:r,gridColumns:a,gridRows:t,placedCount:i,availableCount:l,disabled:u=!1,onAddField:o}){return s.jsxs(mn,{children:[s.jsxs(pn,{children:[r?s.jsx(C,{variant:"primary",children:"Section Builder"}):null,s.jsx(cn,{children:e}),n?s.jsx(gn,{children:n}):null]}),r?s.jsxs(yn,{children:[s.jsxs(C,{variant:"surface",children:[a," col"]}),s.jsxs(C,{variant:"surface",children:[t," row"]}),s.jsxs(C,{variant:"primary",children:[i," placed"]}),s.jsxs(C,{variant:"tertiary",children:[l," available"]}),o?s.jsx(ue,{variant:"ghost",onClick:o,disabled:u,children:"Add Field"}):null]}):null]})}function ge({activeViewMode:e,canToggleViews:n,showModeDescription:r,onViewModeChange:a}){return s.jsxs(fn,{children:[r?s.jsx(bn,{children:e==="builder"?"Drag fields into the grid slots. Each section keeps its own placement map so the form definition can be saved with the selected line of business.":"Rendered view shows the actual field components with no placement cards or grid guidelines."}):s.jsx("div",{"aria-hidden":"true"}),n?s.jsx(Me,{options:["Builder View","Rendered View"],value:e==="rendered"?1:0,onChange:t=>a(t===1?"rendered":"builder")}):null]})}function ye({fields:e,disabled:n=!1,getFieldSummary:r,onDragStart:a}){return e.length===0?s.jsx(C,{variant:"tertiary",children:"All fields are placed in the grid."}):s.jsx(vn,{children:e.map(t=>s.jsx(pe,{field:t,summary:r(t),draggable:!n,disabled:n,cardWidth:"pool",onDragStart:i=>a(i,t.key)},t.key))})}function fe({cellKey:e,field:n,disabled:r=!1,getFieldSummary:a,onDragStart:t,onDragOver:i,onDrop:l,onRemoveField:u}){return s.jsx(kn,{$hasField:!!n,onDragOver:i,onDrop:l,children:n?s.jsx(pe,{field:n,summary:a(n),draggable:!r,disabled:r,cardWidth:"slot",background:x.surfaceContainerHigh,onDragStart:o=>t(o,n.key),footer:s.jsxs(s.Fragment,{children:[s.jsxs(C,{variant:"tertiary",children:["Slot ",e]}),s.jsx(ue,{variant:"ghost",onClick:()=>u(n.key),disabled:r,children:"Remove"})]})}):s.jsxs(wn,{children:["Drop into slot ",e]})})}function be({field:e,value:n,placement:r,onChange:a}){return s.jsx(hn,{$layout:r,children:rn(e,n,a)})}function ve({primaryTypeCount:e,totalSubTypes:n,layoutType:r,gap:a,dense:t}){return s.jsxs(qn,{children:[s.jsxs(Sn,{children:[e," primary line",e===1?"":"s"," available, ",n," subtype node",n===1?"":"s"," loaded."]}),s.jsxs(Tn,{children:[s.jsx(C,{variant:"surface",children:r??"grid"}),s.jsxs(C,{variant:"surface",children:[a??12,"px gap"]}),s.jsx(C,{variant:t?"primary":"tertiary",children:t?"dense":"normal"})]})]})}ce.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessSectionHeader",props:{sectionLabel:{required:!0,tsType:{name:"string"},description:""},sectionDescription:{required:!1,tsType:{name:"string"},description:""},showBuilderChrome:{required:!0,tsType:{name:"boolean"},description:""},gridColumns:{required:!0,tsType:{name:"number"},description:""},gridRows:{required:!0,tsType:{name:"number"},description:""},placedCount:{required:!0,tsType:{name:"number"},description:""},availableCount:{required:!0,tsType:{name:"number"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},onAddField:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};ge.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessSectionViewControls",props:{activeViewMode:{required:!0,tsType:{name:"union",raw:"'builder' | 'rendered'",elements:[{name:"literal",value:"'builder'"},{name:"literal",value:"'rendered'"}]},description:""},canToggleViews:{required:!0,tsType:{name:"boolean"},description:""},showModeDescription:{required:!0,tsType:{name:"boolean"},description:""},onViewModeChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(nextMode: LineOfBusinessSectionGridViewMode) => void",signature:{arguments:[{type:{name:"union",raw:"'builder' | 'rendered'",elements:[{name:"literal",value:"'builder'"},{name:"literal",value:"'rendered'"}]},name:"nextMode"}],return:{name:"void"}}},description:""}}};ye.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessBuilderFieldPool",props:{fields:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},getFieldSummary:{required:!0,tsType:{name:"signature",type:"function",raw:"(field: LineOfBusinessPageTemplateField) => string",signature:{arguments:[{type:{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}},name:"field"}],return:{name:"string"}}},description:""},onDragStart:{required:!0,tsType:{name:"signature",type:"function",raw:"(event: React.DragEvent<HTMLDivElement>, fieldKey: string) => void",signature:{arguments:[{type:{name:"ReactDragEvent",raw:"React.DragEvent<HTMLDivElement>",elements:[{name:"HTMLDivElement"}]},name:"event"},{type:{name:"string"},name:"fieldKey"}],return:{name:"void"}}},description:""}}};fe.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessGridCell",props:{cellKey:{required:!0,tsType:{name:"string"},description:""},field:{required:!1,tsType:{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},getFieldSummary:{required:!0,tsType:{name:"signature",type:"function",raw:"(field: LineOfBusinessPageTemplateField) => string",signature:{arguments:[{type:{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}},name:"field"}],return:{name:"string"}}},description:""},onDragStart:{required:!0,tsType:{name:"signature",type:"function",raw:"(event: React.DragEvent<HTMLDivElement>, fieldKey: string) => void",signature:{arguments:[{type:{name:"ReactDragEvent",raw:"React.DragEvent<HTMLDivElement>",elements:[{name:"HTMLDivElement"}]},name:"event"},{type:{name:"string"},name:"fieldKey"}],return:{name:"void"}}},description:""},onDragOver:{required:!0,tsType:{name:"ReactDragEventHandler",raw:"React.DragEventHandler<HTMLDivElement>",elements:[{name:"HTMLDivElement"}]},description:""},onDrop:{required:!0,tsType:{name:"ReactDragEventHandler",raw:"React.DragEventHandler<HTMLDivElement>",elements:[{name:"HTMLDivElement"}]},description:""},onRemoveField:{required:!0,tsType:{name:"signature",type:"function",raw:"(fieldKey: string) => void",signature:{arguments:[{type:{name:"string"},name:"fieldKey"}],return:{name:"void"}}},description:""}}};be.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessRenderedField",props:{field:{required:!0,tsType:{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}},description:""},value:{required:!0,tsType:{name:"string"},description:""},placement:{required:!1,tsType:{name:"signature",type:"object",raw:`{
  columnStart?: number;
  columnSpan?: number;
  rowStart?: number;
  rowSpan?: number;
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]}},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(nextValue: string) => void",signature:{arguments:[{type:{name:"string"},name:"nextValue"}],return:{name:"void"}}},description:""}}};ve.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessSectionFooter",props:{primaryTypeCount:{required:!0,tsType:{name:"number"},description:""},totalSubTypes:{required:!0,tsType:{name:"number"},description:""},layoutType:{required:!1,tsType:{name:"string"},description:""},gap:{required:!1,tsType:{name:"number"},description:""},dense:{required:!1,tsType:{name:"boolean"},description:""}}};function ae(e){const[n,r]=e.split(":");return{row:Number.parseInt(n??"0",10),column:Number.parseInt(r??"0",10)}}function On(e,n){return`${e}:${n}`}function _(e){const n=e.layout,r=n!=null&&n.columnStart&&n.columnStart>0?n.columnStart:null,a=n!=null&&n.rowStart&&n.rowStart>0?n.rowStart:null;return!r||!a?null:On(a,r)}function jn(e){return e.reduce((n,r)=>{const a=r.layout;if(!a)return n;const t=a.columnStart&&a.columnStart>0?a.columnStart:1,i=a.columnSpan&&a.columnSpan>0?a.columnSpan:1,l=a.rowStart&&a.rowStart>0?a.rowStart:1,u=a.rowSpan&&a.rowSpan>0?a.rowSpan:1;return{columnEnd:Math.max(n.columnEnd,t+i-1),rowEnd:Math.max(n.rowEnd,l+u-1)}},{columnEnd:1,rowEnd:1})}function Bn(e){var o,y;const n=e.layout,r=e.fields.length,a=r>=6?3:r>=3?2:1,t=jn(e.fields),i=n!=null&&n.columns&&n.columns>0?n.columns:a,l=Math.max(i,((o=n==null?void 0:n.columnWidths)==null?void 0:o.length)??0,t.columnEnd),u=Math.max(((y=n==null?void 0:n.rowHeights)==null?void 0:y.length)??0,t.rowEnd,Math.max(2,Math.ceil(r/Math.max(1,l))));return{columns:l,rows:u}}function Cn(e,n){return{type:"grid",columns:n.columns,gap:e!=null&&e.gap&&e.gap>0?e.gap:12,dense:!!(e!=null&&e.dense),columnWidths:Array.from({length:n.columns},(r,a)=>{var i;const t=(i=e==null?void 0:e.columnWidths)==null?void 0:i[a];return typeof t=="number"&&Number.isFinite(t)&&t>0?t:1}),rowHeights:Array.from({length:n.rows},(r,a)=>{var i;const t=(i=e==null?void 0:e.rowHeights)==null?void 0:i[a];return typeof t=="number"&&Number.isFinite(t)&&t>0?t:120})}}function G(e,n){if(!n){const{layout:r,...a}=e;return a}return{...e,layout:n}}function Ln(e,n){const r=_(e);if(!r)return!1;const{row:a,column:t}=ae(r);return a>=1&&a<=n.rows&&t>=1&&t<=n.columns}function Fn({section:e,disabled:n=!1,displayMode:r="toggle",onAddField:a,onSectionChange:t,renderedFieldValues:i,onRenderedFieldValueChange:l}){const u=g.useMemo(()=>Bn(e),[e]),o=g.useMemo(()=>{const d=new Map;return e.fields.forEach(m=>{if(!Ln(m,u))return;const p=_(m);p&&d.set(p,m)}),d},[u,e.fields]),y=g.useMemo(()=>new Set(Array.from(o.values()).map(d=>d.key)),[o]),q=g.useMemo(()=>e.fields.filter(d=>!y.has(d.key)),[y,e.fields]),h=o.size,O=e.fields.length-h,F=`${e.label} Slots`,[P,L]=g.useState("builder"),[f,v]=g.useState({}),S=r==="toggle",k=S?P:r==="rendered"?"rendered":"builder",M=r!=="rendered";g.useEffect(()=>{v(d=>{const m={};return e.fields.forEach(p=>{const j=d[p.key];m[p.key]=typeof j=="string"?j:re(p.defaultValue)}),m})},[e.fields]);const W=g.useMemo(()=>[...k==="rendered"?e.fields.filter(m=>y.has(m.key)):e.fields].sort((m,p)=>m.order-p.order),[k,y,e.fields]),c=g.useMemo(()=>en(e),[e]),w=g.useMemo(()=>{var d;return((d=c.columnWidths)==null?void 0:d.map(m=>`minmax(0, ${m}fr)`).join(" "))||`repeat(${u.columns}, minmax(0, 1fr))`},[u.columns,c.columnWidths]),T=g.useMemo(()=>{var d;return((d=c.rowHeights)==null?void 0:d.map(m=>`minmax(${m}px, auto)`).join(" "))||`repeat(${u.rows}, minmax(120px, auto))`},[u.rows,c.rowHeights]),V=g.useMemo(()=>{const d={};return e.fields.forEach(m=>{d[m.key]=(i==null?void 0:i[m.key])??f[m.key]??re(m.defaultValue)}),d},[f,i,e.fields]),E=g.useCallback(d=>d.helperText?d.helperText:d.placeholder?d.placeholder:d.dataSource?d.dataSource:"Drag into a slot",[]),J=g.useMemo(()=>{if(a)return()=>a(e)},[a,e]),$=g.useCallback((d,m=u)=>{t&&t({...e,layout:Cn(e.layout,m),fields:[...d].sort((p,j)=>p.order-j.order)})},[u,t,e]),Q=g.useCallback(d=>{if(!t)return;const m=e.fields.map(p=>{const j=_(p);if(!j)return p;const{row:Z,column:A}=ae(j);return Z>d.rows||A>d.columns?G(p,void 0):p});$(m,d)},[$,t,e.fields]),I=g.useCallback((d,m)=>{if(!t)return;const{row:p,column:j}=ae(m),Z=e.fields.map(A=>{const we=_(A);return A.key===d?G(A,{...A.layout??{},columnStart:j,rowStart:p,columnSpan:1,rowSpan:1}):we===m?G(A,void 0):A});$(Z)},[$,t,e.fields]),X=g.useCallback(d=>{if(!t)return;const m=e.fields.map(p=>p.key===d?G(p,void 0):p);$(m)},[$,t,e.fields]),K=g.useCallback((d,m)=>{if(n||!t)return;const p={fieldKey:m};d.dataTransfer.setData("application/json",JSON.stringify(p)),d.dataTransfer.effectAllowed="move"},[n,t]),H=g.useCallback(d=>{d.preventDefault()},[]),Y=g.useCallback(d=>m=>{if(m.preventDefault(),!t)return;const p=m.dataTransfer.getData("application/json");if(p)try{const j=JSON.parse(p);if(!j.fieldKey)return;I(j.fieldKey,d)}catch{return}},[t,I]),z=g.useCallback(d=>m=>{l==null||l(d,m),v(p=>({...p,[d]:m}))},[l]);return{activeViewMode:k,availableCount:O,canToggleViews:S,clearFieldPlacement:X,getCellDropHandler:Y,getFieldSummary:E,gridLabel:F,gridSettings:u,handleAddField:J,handleGridCellDragOver:H,handleGridSettingsChange:Q,handleRenderedFieldValueChange:z,placedCount:h,placedFieldKeys:y,placedFieldsByCell:o,renderedFields:W,renderedGridTemplateColumns:w,renderedGridTemplateRows:T,resolvedRenderedFieldValues:V,resolvedSectionLayout:c,setViewMode:L,showBuilderChrome:M,startDrag:K,unplacedFields:q}}const Pn=b.article`
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid ${x.outlineVariant};
  background: ${x.surfaceContainer};
`,Vn=b.div`
  display: grid;
  gap: ${({$gap:e})=>`${e}px`};
  grid-template-columns: ${({$columns:e})=>e};
  grid-template-rows: ${({$rows:e})=>e};
  grid-auto-flow: ${({$dense:e})=>e?"row dense":"row"};
  align-items: stretch;
`,En=b.div`
  color: ${x.onSurfaceVariant};
  font-size: 12px;
`;function ke({section:e,primaryTypeCount:n,totalSubTypes:r,disabled:a=!1,displayMode:t="toggle",onAddField:i,onRemoveField:l,onSectionChange:u,renderedFieldValues:o,onRenderedFieldValueChange:y,showHeader:q=!0,showModeDescription:h=!0}){var z,d,m;const{activeViewMode:O,availableCount:F,canToggleViews:P,clearFieldPlacement:L,getCellDropHandler:f,getFieldSummary:v,gridLabel:S,gridSettings:k,handleAddField:M,handleGridCellDragOver:W,handleGridSettingsChange:c,handleRenderedFieldValueChange:w,placedCount:T,placedFieldsByCell:V,renderedFields:E,renderedGridTemplateColumns:J,renderedGridTemplateRows:$,resolvedRenderedFieldValues:Q,resolvedSectionLayout:I,setViewMode:X,showBuilderChrome:K,startDrag:H,unplacedFields:Y}=Fn({section:e,disabled:a,displayMode:t,onAddField:i,onSectionChange:u,renderedFieldValues:o,onRenderedFieldValueChange:y});return s.jsxs(Pn,{children:[q?s.jsx(ce,{sectionLabel:e.label,sectionDescription:e.description,showBuilderChrome:K,gridColumns:k.columns,gridRows:k.rows,placedCount:T,availableCount:F,disabled:a||!u,onAddField:M}):null,h||P?s.jsx(ge,{activeViewMode:O,canToggleViews:P,showModeDescription:h,onViewModeChange:X}):null,O==="builder"?s.jsxs(s.Fragment,{children:[s.jsx(ye,{fields:Y,disabled:a,getFieldSummary:v,onDragStart:H}),s.jsx(Ae,{title:S,settings:k,onSettingsChange:c,renderCell:({cellKey:p})=>{const j=V.get(p);return s.jsx(fe,{cellKey:p,field:j,disabled:a,getFieldSummary:v,onDragStart:H,onDragOver:W,onDrop:f(p),onRemoveField:L},p)}})]}):s.jsx(Vn,{$gap:I.gap??12,$columns:J,$rows:$,$dense:!!I.dense,children:E.length===0?s.jsx(En,{children:"No placed fields to preview. Switch to Builder View to place fields."}):E.map(p=>s.jsx(be,{field:p,value:Q[p.key],placement:p.layout,onChange:w(p.key)},p.key))}),K?s.jsx(ve,{primaryTypeCount:n,totalSubTypes:r,layoutType:(z=e.layout)==null?void 0:z.type,gap:(d=e.layout)==null?void 0:d.gap,dense:(m=e.layout)==null?void 0:m.dense}):null]})}ke.__docgenInfo={description:"",methods:[],displayName:"LineOfBusinessSectionGrid",props:{section:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  key: string;
  label: string;
  order: number;
  description?: string;
  fields: LineOfBusinessPageTemplateField[];
  layout?: LineOfBusinessPageTemplateSectionLayout;
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"order",value:{name:"number",required:!0}},{key:"description",value:{name:"string",required:!1}},{key:"fields",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]",required:!0}},{key:"layout",value:{name:"signature",type:"object",raw:`{
  type?: 'grid';
  columns?: number;
  gap?: number;
  dense?: boolean;
  columnWidths?: number[];
  rowHeights?: number[];
}`,signature:{properties:[{key:"type",value:{name:"literal",value:"'grid'",required:!1}},{key:"columns",value:{name:"number",required:!1}},{key:"gap",value:{name:"number",required:!1}},{key:"dense",value:{name:"boolean",required:!1}},{key:"columnWidths",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}},{key:"rowHeights",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}}]},required:!1}}]}},description:""},primaryTypeCount:{required:!0,tsType:{name:"number"},description:""},totalSubTypes:{required:!0,tsType:{name:"number"},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},displayMode:{required:!1,tsType:{name:"union",raw:"'toggle' | 'builder' | 'rendered'",elements:[{name:"literal",value:"'toggle'"},{name:"literal",value:"'builder'"},{name:"literal",value:"'rendered'"}]},description:"",defaultValue:{value:"'toggle'",computed:!1}},onAddField:{required:!1,tsType:{name:"signature",type:"function",raw:"(section: LineOfBusinessPageTemplateSection) => void",signature:{arguments:[{type:{name:"signature",type:"object",raw:`{
  key: string;
  label: string;
  order: number;
  description?: string;
  fields: LineOfBusinessPageTemplateField[];
  layout?: LineOfBusinessPageTemplateSectionLayout;
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"order",value:{name:"number",required:!0}},{key:"description",value:{name:"string",required:!1}},{key:"fields",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]",required:!0}},{key:"layout",value:{name:"signature",type:"object",raw:`{
  type?: 'grid';
  columns?: number;
  gap?: number;
  dense?: boolean;
  columnWidths?: number[];
  rowHeights?: number[];
}`,signature:{properties:[{key:"type",value:{name:"literal",value:"'grid'",required:!1}},{key:"columns",value:{name:"number",required:!1}},{key:"gap",value:{name:"number",required:!1}},{key:"dense",value:{name:"boolean",required:!1}},{key:"columnWidths",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}},{key:"rowHeights",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}}]},required:!1}}]}},name:"section"}],return:{name:"void"}}},description:""},onRemoveField:{required:!1,tsType:{name:"signature",type:"function",raw:"(section: LineOfBusinessPageTemplateSection, field: LineOfBusinessPageTemplateField) => void",signature:{arguments:[{type:{name:"signature",type:"object",raw:`{
  key: string;
  label: string;
  order: number;
  description?: string;
  fields: LineOfBusinessPageTemplateField[];
  layout?: LineOfBusinessPageTemplateSectionLayout;
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"order",value:{name:"number",required:!0}},{key:"description",value:{name:"string",required:!1}},{key:"fields",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]",required:!0}},{key:"layout",value:{name:"signature",type:"object",raw:`{
  type?: 'grid';
  columns?: number;
  gap?: number;
  dense?: boolean;
  columnWidths?: number[];
  rowHeights?: number[];
}`,signature:{properties:[{key:"type",value:{name:"literal",value:"'grid'",required:!1}},{key:"columns",value:{name:"number",required:!1}},{key:"gap",value:{name:"number",required:!1}},{key:"dense",value:{name:"boolean",required:!1}},{key:"columnWidths",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}},{key:"rowHeights",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}}]},required:!1}}]}},name:"section"},{type:{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}},name:"field"}],return:{name:"void"}}},description:""},onSectionChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(nextSection: LineOfBusinessPageTemplateSection) => void",signature:{arguments:[{type:{name:"signature",type:"object",raw:`{
  key: string;
  label: string;
  order: number;
  description?: string;
  fields: LineOfBusinessPageTemplateField[];
  layout?: LineOfBusinessPageTemplateSectionLayout;
}`,signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"order",value:{name:"number",required:!0}},{key:"description",value:{name:"string",required:!1}},{key:"fields",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]",required:!0}},{key:"layout",value:{name:"signature",type:"object",raw:`{
  type?: 'grid';
  columns?: number;
  gap?: number;
  dense?: boolean;
  columnWidths?: number[];
  rowHeights?: number[];
}`,signature:{properties:[{key:"type",value:{name:"literal",value:"'grid'",required:!1}},{key:"columns",value:{name:"number",required:!1}},{key:"gap",value:{name:"number",required:!1}},{key:"dense",value:{name:"boolean",required:!1}},{key:"columnWidths",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}},{key:"rowHeights",value:{name:"Array",elements:[{name:"number"}],raw:"number[]",required:!1}}]},required:!1}}]}},name:"nextSection"}],return:{name:"void"}}},description:""},renderedFieldValues:{required:!1,tsType:{name:"Record",elements:[{name:"string"},{name:"string"}],raw:"Record<string, string>"},description:""},onRenderedFieldValueChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(fieldKey: string, value: string) => void",signature:{arguments:[{type:{name:"string"},name:"fieldKey"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},showHeader:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}},showModeDescription:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}}}};const $n=he.memo(function({subject:n,subjectIndex:r,organizationId:a,taxonomy:t,onFieldValueChange:i,onTemplateResolved:l}){const u=g.useMemo(()=>oe(n.lineOfBusiness,n.lineOfBusinessSubType,t),[n.lineOfBusiness,n.lineOfBusinessSubType,t]),[o,y]=g.useState(null),[q,h]=g.useState(!1),[O,F]=g.useState(null),[P,L]=g.useState(()=>new Set),f=g.useRef(null),v=`${u.primaryCode??""}:${u.subTypeCode??""}`,S=!!u.primaryCode;g.useEffect(()=>{let c=!0;return u.primaryCode?(h(!0),F(null),y(null),Ie({organizationId:a??null,lineOfBusinessCode:u.primaryCode,lineOfBusinessSubTypeCode:u.subTypeCode}).then(({template:w})=>{if(!c)return;y(w);const T=Xe(w,u);l(r,T)}).catch(w=>{c&&(F(w instanceof Error?w.message:"Unable to load template fields."),l(r,[]))}).finally(()=>{c&&h(!1)}),()=>{c=!1}):(y(null),F(null),h(!1),l(r,[]),()=>{c=!1})},[l,u.primaryCode,u.subTypeCode,r]);const k=g.useMemo(()=>de(o,u),[u.primaryCode,u.subTypeCode,o]),M=g.useMemo(()=>t.reduce((c,w)=>c+w.subTypes.length,0),[t]);g.useEffect(()=>{L(c=>{const w=new Set(k.map(E=>E.key));if(!S)return f.current=null,c.size===0?c:new Set;if(f.current!==v)return w.size===0?c:(f.current=v,new Set(w));let T=!1;const V=new Set;return c.forEach(E=>{w.has(E)?V.add(E):T=!0}),!T&&V.size===c.size?c:V})},[S,k,v]);const W=g.useCallback(c=>{L(w=>{const T=new Set(w);return T.has(c)?T.delete(c):T.add(c),T})},[]);return u.primaryCode?q&&!o?s.jsxs(Be,{children:["Loading template fields for ",n.lineOfBusiness||"the selected line of business","..."]}):O&&!o?s.jsx(Ce,{children:O}):k.length===0?s.jsx("div",{style:{marginTop:16,padding:16,borderRadius:12,border:"1px dashed rgba(148,163,184,0.24)",color:"#94a3b8",fontSize:12,lineHeight:1.6},children:"No additional subject fields are configured for this selection."}):s.jsxs(Le,{children:[s.jsxs(Fe,{children:[s.jsxs("div",{children:[s.jsx(Pe,{children:"Template fields"}),s.jsx(Ve,{children:(o==null?void 0:o.title)??"Insured subject template"})]}),o!=null&&o.pageKey?s.jsx(Ee,{children:o.pageKey}):null]}),k.map(c=>{const w=P.has(c.key);return s.jsxs("div",{style:{display:"grid",gap:12},children:[s.jsxs("button",{type:"button",onClick:()=>W(c.key),style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,width:"100%",border:"1px solid rgba(75,142,255,0.18)",borderRadius:10,background:"#0f1724",padding:"10px 12px",cursor:"pointer"},children:[s.jsxs("div",{style:{textAlign:"left"},children:[s.jsx("div",{style:{fontSize:11,textTransform:"uppercase",letterSpacing:".12em",color:"#4b8eff",fontWeight:700},children:c.label}),c.description?s.jsx("div",{style:{marginTop:4,color:"#94a3b8",fontSize:12,lineHeight:1.5},children:c.description}):null]}),s.jsx("span",{style:{color:"#94a3b8",fontSize:11,fontWeight:700},children:w?"Expand":"Collapse"})]}),w?null:s.jsx(ke,{section:c,primaryTypeCount:t.length,totalSubTypes:M,displayMode:"rendered",showHeader:!1,showModeDescription:!1,renderedFieldValues:n.fieldValues,onRenderedFieldValueChange:(T,V)=>i(r,T,V)})]},c.key)})]}):s.jsx(je,{children:"Select a line of business and subtype to load the insured subject template fields."})});$n.__docgenInfo={description:"",methods:[],displayName:"SubjectTemplateFields",props:{subject:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  subjectId: string;
  subjectLabel: string;
  lineOfBusiness: string;
  lineOfBusinessSubType: string;
  fieldValues: Record<string, string>;
}`,signature:{properties:[{key:"subjectId",value:{name:"string",required:!0}},{key:"subjectLabel",value:{name:"string",required:!0}},{key:"lineOfBusiness",value:{name:"string",required:!0}},{key:"lineOfBusinessSubType",value:{name:"string",required:!0}},{key:"fieldValues",value:{name:"Record",elements:[{name:"string"},{name:"string"}],raw:"Record<string, string>",required:!0}}]}},description:""},subjectIndex:{required:!0,tsType:{name:"number"},description:""},organizationId:{required:!1,tsType:{name:"union",raw:"number | null",elements:[{name:"number"},{name:"null"}]},description:""},taxonomy:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  code: string;
  label: string;
  subTypes: LineOfBusinessTaxonomySubType[];
}`,signature:{properties:[{key:"code",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"subTypes",value:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
  code: string;
  label: string;
}`,signature:{properties:[{key:"code",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"LineOfBusinessTaxonomySubType[]",required:!0}}]}}],raw:"LineOfBusinessTaxonomyPrimary[]"},description:""},onFieldValueChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(subjectIndex: number, fieldKey: string, value: string) => void",signature:{arguments:[{type:{name:"number"},name:"subjectIndex"},{type:{name:"string"},name:"fieldKey"},{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},onTemplateResolved:{required:!0,tsType:{name:"signature",type:"function",raw:"(subjectIndex: number, fields: LineOfBusinessPageTemplateField[]) => void",signature:{arguments:[{type:{name:"number"},name:"subjectIndex"},{type:{name:"Array",elements:[{name:"signature",type:"object",raw:`{
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
}`,signature:{properties:[{key:"columnStart",value:{name:"number",required:!1}},{key:"columnSpan",value:{name:"number",required:!1}},{key:"rowStart",value:{name:"number",required:!1}},{key:"rowSpan",value:{name:"number",required:!1}}]},required:!1}}]}}],raw:"LineOfBusinessPageTemplateField[]"},name:"fields"}],return:{name:"void"}}},description:""}}};export{ke as L,$n as S,Ie as a,er as b,tr as c,ur as d,ne as e,R as f,ze as g,Xn as h,ar as i,oe as j,sr as k,Yn as l,lr as m,ir as n,rr as o,nr as r,Zn as s};
