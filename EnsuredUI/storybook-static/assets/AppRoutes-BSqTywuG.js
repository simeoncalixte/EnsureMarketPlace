import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as m}from"./index-B3TfwC44.js";import{L as qe,R as Ar,a as u,O as ee,N as re,d as br,u as Mr}from"./chunk-OE4NN4TA-D-lI_iOm.js";import{y as t}from"./styled-components.browser.esm-BtVlB3rV.js";import{M as Dr}from"./Marketplace-CjzNaxt6.js";import{C as Ge,S as Kr}from"./SideBarNav-Dn6Nn7nx.js";import{I as Or}from"./Investors-C1T2y9iv.js";import{A as _r}from"./AdminPage-B8d6E5C1.js";import{B as G}from"./Button-BdN1JsLa.js";import{S as Vr}from"./SegmentedSwitch-B7FGOm21.js";import{a as Pe,s as Hr}from"./auth-DmpauaO1.js";import{I as R}from"./InsurerDashboard-DaLAwgfL.js";import{A as Re}from"./AnalyticsDashboard-CWBhD3MT.js";import{A as Wr}from"./ActiveCoverage-DicWbo53.js";import{L as qr,a as Ur}from"./LineOfBusinessPage-36ddQHQK.js";import{R as Gr}from"./Reports-Bp7iQYSk.js";import{S as Jr}from"./Settings-_JEB45oC.js";import{P as Yr}from"./PipelineIngestion-DzHuIedg.js";import{R as Je,Q as Qr}from"./QueueConfig-Bie3UQ9g.js";import{E as Ye}from"./EmailIngestConfig-DxZ1AO7h.js";import{C as Qe}from"./CloudStorageConfig-Ea9cl1Au.js";import{S as Ze}from"./SFTPConfig-BJlxLLnz.js";import{W as Xe}from"./WebhookConfig-CopWib8j.js";import{u as fe}from"./useAuthMe-B_qCSjfZ.js";import{a as Zr,s as Xr}from"./SubjectTemplateFields-CH0jMXl_.js";import{L as et}from"./LandingPage-Cqabagj2.js";import{K as rt}from"./KYCVerification-D9jVHJg7.js";import{R as tt}from"./RoleSelection-Cd58URG_.js";import{T as xr}from"./TopBarNav-Cqd53mzT.js";function jr(r){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(r)}function nt(r){return/[",\n]/.test(r)?`"${r.replace(/"/g,'""')}"`:r}const ot=t.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`,it=t.section`
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background:
    radial-gradient(circle at top right, rgba(75, 142, 255, 0.26), transparent 30%),
    linear-gradient(135deg, rgba(11, 19, 38, 0.98), rgba(11, 19, 38, 0.76));
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.35);
`,at=t.div`
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: flex-start;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
`,st=t.div`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #9ec0ff;
  margin-bottom: 0.7rem;
`,lt=t.h1`
  margin: 0;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  line-height: 1.05;
  color: #f3f7ff;
`,dt=t.p`
  margin: 0.8rem 0 0;
  max-width: 62ch;
  color: rgba(218, 226, 253, 0.78);
  line-height: 1.6;
`,ct=t.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  align-items: center;
`,ut=t.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`,pt=t.div`
  border-radius: 20px;
  padding: 1rem 1.05rem;
  background: rgba(11, 18, 32, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 0 10px 28px rgba(2, 8, 23, 0.18);
`,mt=t.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #98a6bf;
  margin-bottom: 0.45rem;
`,gt=t.div`
  font-size: 1.35rem;
  font-weight: 800;
  color: #f3f7ff;
`,ft=t.div`
  margin-top: 0.35rem;
  color: #98a6bf;
  font-size: 0.85rem;
`,ht=t.section`
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(7, 17, 41, 0.72);
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.28);
  padding: 1.2rem;
`,bt=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`,xt=t.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`,jt=t.div`
  overflow-x: auto;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.1);
`,yt=t.table`
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  background: rgba(11, 18, 32, 0.72);
`,er=t.th`
  padding: 0.9rem 0.95rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #98a6bf;
  text-align: left;
  background: rgba(255, 255, 255, 0.02);
`,vt=t.tr`
  border-top: 1px solid rgba(148, 163, 184, 0.08);
  transition: background 160ms ease, transform 160ms ease;

  &:hover {
    background: rgba(75, 142, 255, 0.05);
  }
`,rr=t.td`
  padding: 0.95rem;
  vertical-align: top;
  color: #dae2fd;
`;t.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;t.div`
  font-weight: 800;
  color: #f3f7ff;
`;const kt=t.div`
  color: #98a6bf;
  font-size: 0.82rem;
`,wt=t.div`
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
  overflow-x: auto;
  padding-bottom: 2rem;
`,St=t.div`
  flex: 0 0 20rem;
  display: flex;
  flex-direction: column;
  transition: transform 160ms ease, box-shadow 160ms ease;
  box-shadow: ${({$isDropTarget:r})=>r?"0 0 0 1px rgba(75, 142, 255, 0.22), 0 18px 36px rgba(2, 8, 23, 0.18)":"none"};
  transform: ${({$isDropTarget:r})=>r?"translateY(-2px)":"translateY(0)"};
`,Ct=t.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0 0.25rem;
`,Tt=t.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`,$t=t.div`
  color: #dbe2fd;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`,It=t.div`
  display: none;
`,zt=t.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`,Ft=t.article`
  position: relative;
  overflow: hidden;
  padding: 1rem;
  background: #131b2e;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease, opacity 180ms ease;
  cursor: grab;
  user-select: none;
  opacity: ${({$isDragging:r})=>r?.55:1};
  transform: ${({$isDragging:r})=>r?"scale(0.985)":"translateY(0)"};

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: ${({$accent:r})=>r};
  }

  &:hover {
    border-color: rgba(75, 142, 255, 0.5);
    box-shadow: 0 16px 28px rgba(2, 8, 23, 0.24);
    transform: translateY(-1px);
  }
`,Lt=t.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;t.div`
  margin-bottom: 0.2rem;
  color: #f3f7ff;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
`;const Bt=t(qe)`
  display: inline-block;
  margin-bottom: 0.2rem;
  color: #f3f7ff;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
  text-decoration: none;

  &:hover,
  &:focus-visible {
    color: #9ec0ff;
    text-decoration: underline;
  }
`,Pt=t.div`
  color: #98a6bf;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`,Rt=t.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem 0.6rem;
  padding: 0.85rem 0;
  margin: 0.7rem 0 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`,Et=t.div`
  min-width: 0;
`,Nt=t.div`
  margin-bottom: 0.25rem;
  color: #98a6bf;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`,At=t.div`
  color: #dbe2fd;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0.02em;
`,Mt=t.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,Ee=t.div`
  display: flex;
  min-height: 16rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  border: 2px dashed rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  color: #5c667f;
  text-align: center;
`,Dt=t.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`,Kt=t.div`
  color: #98a6bf;
  font-size: 0.84rem;
  line-height: 1.45;
`,Ot=t.span`
  color: #dae2fd;
  font-weight: 700;
`,yr={urgent:{label:"Urgent",background:"rgba(255, 107, 107, 0.12)",border:"rgba(255, 107, 107, 0.25)",color:"#ff8b8b"},high:{label:"High",background:"rgba(245, 158, 11, 0.12)",border:"rgba(245, 158, 11, 0.25)",color:"#f7b955"},normal:{label:"Normal",background:"rgba(75, 142, 255, 0.10)",border:"rgba(75, 142, 255, 0.22)",color:"#9ec0ff"}},$={background:"rgba(148, 163, 184, 0.08)",border:"rgba(148, 163, 184, 0.2)",color:"#dae2fd"},E=t.span`
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({$border:r})=>r};
  background: ${({$background:r})=>r};
  color: ${({$color:r})=>r};
`;t.span`
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({$border:r})=>r};
  background: ${({$background:r})=>r};
  color: ${({$color:r})=>r};
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;t.button`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 0;
  background: #adc6ff;
  color: #002e69;
  font-family: 'Manrope', sans-serif;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  transition: opacity 150ms ease, transform 150ms ease, filter 150ms ease, background 150ms ease;

  &:hover:not(:disabled) {
    filter: brightness(1.04);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    cursor: not-allowed;
    background: rgba(148, 163, 184, 0.08);
    color: #98a6bf;
  }
`;function _t(r,n,i){return n.badgeSource==="priority"?yr[r.priority].label:n.badgeSource==="stage"?r.stageLabel:i==null||i===""?n.label:String(i)}function Vt(r,n){return n.badgeSource==="priority"?yr[r.priority]:n.badgeSource==="stage"?{background:r.stageBackground,border:r.stageBorder,color:r.stageAccent}:$}function ye(r,n){if(r==null||r==="")return"—";if(n==="currency"&&typeof r=="number")return jr(r);if(n==="number"&&typeof r=="number")return new Intl.NumberFormat("en-US").format(r);if(n==="date"){const i=new Date(String(r));if(!Number.isNaN(i.getTime()))return new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short"}).format(i)}return String(r)}function ve(r,n){return[...r.tableColumns,...r.cardFields].find(i=>i.key===n||i.valueKey===n)}function Ht(r){return{facts:r.filter(n=>n.section!=="body"),body:r.filter(n=>n.section==="body")}}function Wt(r){return r.format==="currency"?jr(r.value):new Intl.NumberFormat("en-US").format(r.value)}function qt(r){return{submissionId:Number(r.values.submissionId??r.id),submissionNumber:String(r.values.submissionNumber??`SUB-${String(r.id).padStart(4,"0")}`),cedent:String(r.values.cedent??""),lineOfBusiness:String(r.values.lineOfBusiness??""),locationText:String(r.values.locationText??r.values.location??r.values.address??r.values.region??""),region:String(r.values.region??""),premium:Number(r.values.premium??0),exposure:Number(r.values.exposure??0),receivedLabel:String(r.values.receivedLabel??""),owner:String(r.values.owner??""),source:String(r.values.source??""),notes:String(r.values.notes??"")}}const tr=[{accent:"#4b8eff",background:"rgba(75, 142, 255, 0.12)",border:"rgba(75, 142, 255, 0.28)"},{accent:"#f59e0b",background:"rgba(245, 158, 11, 0.12)",border:"rgba(245, 158, 11, 0.28)"},{accent:"#22c55e",background:"rgba(34, 197, 94, 0.12)",border:"rgba(34, 197, 94, 0.28)"},{accent:"#a78bfa",background:"rgba(167, 139, 250, 0.12)",border:"rgba(167, 139, 250, 0.28)"},{accent:"#f97316",background:"rgba(249, 115, 22, 0.12)",border:"rgba(249, 115, 22, 0.28)"},{accent:"#14b8a6",background:"rgba(20, 184, 166, 0.12)",border:"rgba(20, 184, 166, 0.28)"}];function Ut(r){return r.trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"custom_state"}function Gt(r,n){const i=new Set(n.flatMap(h=>[h.key,...h.statuses]));let a=r,d=2;for(;i.has(a);)a=`${r}_${d}`,d+=1;return a}function Jt(r){return tr[r%tr.length]}function Yt(r,n,i){const a=Jt(i),d=r.trim();return{key:n,label:d,statuses:[n],accent:a.accent,background:a.background,border:a.border,description:`${d} submissions move through this backend-managed stage.`,emptyState:`No ${d.toLowerCase()} submissions yet.`}}function Qt(r){return Array.from(new Set(r.stages.flatMap(n=>n.statuses))).filter(Boolean)}function vr(r){return(r==null?void 0:r.statuses[0])??null}function Zt(r,n,i){var k;const a=n.length,d=((k=i.stages[i.stages.length-1])==null?void 0:k.key)??null,h=d?n.filter(x=>x.stageKey!==d).length:a,g=n.filter(x=>x.priority==="urgent").length,v=n.reduce((x,y)=>x+Number(y.values.premium??0),0),I=a>0?v/a:0;return r.map(x=>x.label==="Queue volume"?{...x,value:a}:x.label==="Pending review"?{...x,value:h}:x.label==="Urgent flags"?{...x,value:g}:x.label==="Average premium"?{...x,value:I}:x)}function Xt(r,n,i,a){const d=a.stages.find(x=>x.statuses.includes(i));if(!d)return null;const h=a.stages.findIndex(x=>x.key===d.key),g=a.stages[h+1]??null,v=vr(g);if(!r.items.find(x=>x.id===n))return null;const k=r.items.map(x=>x.id!==n?x:{...x,status:i,stageKey:d.key,stageLabel:d.label,stageAccent:d.accent,stageBackground:d.background,stageBorder:d.border,nextStatus:v,nextStageKey:(g==null?void 0:g.key)??null,nextStageLabel:(g==null?void 0:g.label)??null,nextStageAccent:(g==null?void 0:g.accent)??null});return{...r,items:k,summary:Zt(r.summary,k,a),refreshedAt:new Date().toISOString()}}function en(r){const n=r.dataTransfer.getData("application/x-ensured-submission");if(n)try{const a=JSON.parse(n);if(typeof a.submissionId=="number"&&Number.isFinite(a.submissionId)&&typeof a.sourceStageKey=="string")return{submissionId:a.submissionId,sourceStageKey:a.sourceStageKey}}catch{return null}const i=Number(r.dataTransfer.getData("text/plain"));return Number.isFinite(i)?{submissionId:i,sourceStageKey:""}:null}function kr(){const[r,n]=m.useState(0),[i,a]=m.useState(null),[d,h]=m.useState(null),[g,v]=m.useState(!0),[I,k]=m.useState(null),[x,y]=m.useState(0),[N,w]=m.useState(null),[z,C]=m.useState(null),[V,te]=m.useState(""),[H,ne]=m.useState(""),[W,J]=m.useState(""),[oe,q]=m.useState(""),[ie,Y]=m.useState(null),[L,A]=m.useState(null),[he,Q]=m.useState(!1);m.useEffect(()=>{let o=!1;async function p(){v(!0),k(null);try{const l=await Pe("/api/underwriting/submissions");if(!l.ok)throw new Error(`Status ${l.status}`);const b=await l.json();o||a(b)}catch(l){o||(a(null),k(l instanceof Error?l.message:String(l)))}finally{o||v(!1)}}return p(),()=>{o=!0}},[x]),m.useEffect(()=>{h((i==null?void 0:i.config)??null),Y(null),A(null)},[i==null?void 0:i.config]);const c=d??(i==null?void 0:i.config),be=(i==null?void 0:i.summary)??[],M=(i==null?void 0:i.items)??[],Z=c?Ht(c.cardFields):{facts:[],body:[]},D=c?Qt(c):[];function ae(){y(o=>o+1)}function U(){w(null),C(null)}function Fe(o,p){o.dataTransfer.effectAllowed="move",o.dataTransfer.setData("application/x-ensured-submission",JSON.stringify({submissionId:p.id,sourceStageKey:p.stageKey})),o.dataTransfer.setData("text/plain",String(p.id)),w(p.id),C(p.stageKey)}function Le(){U()}async function xe(o,p){if(!c||o.status===p)return;k(null);const l=await Pe(`/api/underwriting/submissions/${o.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:p})});if(!l.ok){k(`Unable to update submission ${o.id}: ${l.status}`);return}a(b=>b&&(Xt(b,o.id,p,c)??b))}async function Be(o,p){if(!c||p===o.stageKey)return;const l=c.stages.find(T=>T.key===p),b=vr(l);b&&await xe(o,b)}function je(o,p){o.preventDefault(),o.dataTransfer.dropEffect="move",C(p)}function s(o,p){o.preventDefault();const l=en(o);if(!l){U();return}const b=M.find(T=>T.id===l.submissionId);if(!b){U();return}if(l.sourceStageKey&&b.stageKey!==l.sourceStageKey){U();return}U(),Be(b,p)}function f(){if(!c)return;const o=V.trim();if(!o){A("Add a column label before creating a new stage.");return}const p=Ut(H.trim()||o),l=Gt(p,c.stages),b=W.trim()||`${o} submissions move through this backend-managed stage.`,T=oe.trim()||`No ${o.toLowerCase()} submissions yet.`,B=Yt(o,l,c.stages.length);B.description=b,B.emptyState=T,h({...c,stages:[...c.stages,B]}),Y(`Added ${o}. Save changes to publish the new state.`),A(null),te(""),ne(""),J(""),q("")}async function j(){if(c){Q(!0),A(null),Y(null);try{const o=await Pe("/api/underwriting/submissions/config",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(c)});if(!o.ok)throw new Error(`Status ${o.status}`);const p=await o.json();h(p),Y(`Saved ${p.stages.length} board columns and backend states.`),ae()}catch(o){A(o instanceof Error?o.message:String(o))}finally{Q(!1)}}}async function S(o){o.nextStatus&&await xe(o,o.nextStatus)}function K(){if(!i||!c)return;const p=[c.tableColumns.map(B=>B.label).join(","),...M.map(B=>c.tableColumns.map(F=>nt(String(B.values[F.valueKey]??""))).join(","))],l=new Blob([p.join(`
`)],{type:"text/csv;charset=utf-8;"}),b=URL.createObjectURL(l),T=document.createElement("a");T.href=b,T.download="incoming-submissions.csv",T.click(),URL.revokeObjectURL(b)}function P(o,p){const l=Vt(o,p);return e.jsx(E,{$background:l.background,$border:l.border,$color:l.color,children:_t(o,p,o.values[p.valueKey])})}function X(o,p){const l=o.values[p.valueKey];return p.format==="badge"?P(o,p):ye(l,p.format)}return e.jsxs(ot,{children:[e.jsx(it,{children:e.jsxs(at,{children:[e.jsxs("div",{children:[e.jsx(st,{children:(c==null?void 0:c.eyebrow)??"Underwriting queue"}),e.jsx(lt,{children:(c==null?void 0:c.title)??"Incoming Submissions"}),e.jsx(dt,{children:(c==null?void 0:c.description)??"Loading the live underwriting queue from the backend."})]}),e.jsxs(ct,{children:[e.jsx(E,{$background:$.background,$border:$.border,$color:$.color,children:g?"Loading live data":`${M.length} live submissions`}),e.jsx(E,{$background:$.background,$border:$.border,$color:$.color,children:"Backend-configured"}),e.jsx(G,{variant:"ghost",type:"button",onClick:K,disabled:!i,style:{border:"1px solid rgba(75,142,255,0.22)",background:"rgba(75,142,255,0.10)",color:"#dae2fd"},children:"Export CSV"}),e.jsx(G,{variant:"secondary",type:"button",onClick:ae,children:"Refresh board"})]})]})}),e.jsx(ut,{children:be.map(o=>e.jsxs(pt,{children:[e.jsx(mt,{children:o.label}),e.jsx(gt,{children:Wt(o)}),e.jsx(ft,{children:o.meta})]},o.label))}),e.jsxs(ht,{children:[e.jsxs(bt,{children:[e.jsx(Vr,{options:["Table","Kanban"],value:r,onChange:n}),e.jsxs(xt,{children:[e.jsx(E,{$background:$.background,$border:$.border,$color:$.color,children:c?`${c.stages.length} stages`:"Backend stages"}),e.jsx(E,{$background:$.background,$border:$.border,$color:$.color,children:i?`Synced ${new Date(i.refreshedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`:"Waiting for backend sync"})]})]}),I?e.jsxs(Ee,{children:[e.jsxs("div",{style:{marginBottom:"0.75rem"},children:["Unable to load live submissions: ",I]}),e.jsx(G,{variant:"secondary",type:"button",onClick:ae,children:"Retry"})]}):g||!c?e.jsx(Ee,{children:"Loading the backend-configured submission board."}):r===0?e.jsx(jt,{children:e.jsxs(yt,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[c.tableColumns.map(o=>e.jsx(er,{children:o.label},o.key)),e.jsx(er,{children:"Action"})]})}),e.jsx("tbody",{children:M.map(o=>{const p=o.nextStatus===null;return e.jsxs(vt,{children:[c.tableColumns.map(l=>{const b=ve(c,l.key)??l;return e.jsx(rr,{children:b.format==="badge"?P(o,b):X(o,b)},l.key)}),e.jsx(rr,{children:e.jsx(G,{variant:"ghost",type:"button",onClick:()=>S(o),disabled:p,style:{border:"1px solid rgba(75,142,255,0.18)",background:p?"rgba(148,163,184,0.06)":"rgba(75,142,255,0.10)",color:p?"#98a6bf":"#dbe9ff",cursor:p?"not-allowed":"pointer"},children:p?"Closed":`Move to ${o.nextStageLabel??"next stage"}`})})]},o.id)})})]})}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{marginBottom:"1rem",borderRadius:24,border:"1px solid rgba(148, 163, 184, 0.12)",background:"linear-gradient(135deg, rgba(11, 18, 32, 0.94), rgba(11, 18, 32, 0.74))",padding:"1rem",boxShadow:"0 16px 36px rgba(2, 8, 23, 0.2)"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",gap:"1rem",alignItems:"flex-start",flexWrap:"wrap"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontSize:11,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:"#9ec0ff",marginBottom:6},children:"Board columns"}),e.jsx("div",{style:{color:"#dae2fd",fontSize:14,lineHeight:1.5,maxWidth:"72ch"},children:"Add a new Kanban column here. The state key becomes an available backend submission status when you save changes."})]}),e.jsxs("div",{style:{display:"flex",gap:"0.75rem",flexWrap:"wrap"},children:[e.jsx(G,{variant:"ghost",type:"button",onClick:f,style:{border:"1px solid rgba(75,142,255,0.18)",background:"rgba(75,142,255,0.10)",color:"#dae2fd"},children:"Add column"}),e.jsx(G,{variant:"secondary",type:"button",onClick:j,disabled:he,children:he?"Saving…":"Save board"})]})]}),(ie||L)&&e.jsx("div",{style:{marginTop:"0.9rem",borderRadius:16,border:`1px solid ${L?"rgba(255, 107, 107, 0.25)":"rgba(75, 142, 255, 0.22)"}`,background:L?"rgba(255, 107, 107, 0.08)":"rgba(75, 142, 255, 0.08)",color:L?"#ffb3ad":"#dae2fd",padding:"0.85rem 1rem",fontSize:13},children:L??ie}),e.jsxs("div",{style:{marginTop:"1rem",display:"grid",gridTemplateColumns:"repeat(4, minmax(0, 1fr))",gap:"0.75rem"},children:[e.jsxs("label",{style:{display:"flex",flexDirection:"column",gap:6},children:[e.jsx("span",{style:{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#98a6bf",fontWeight:700},children:"Column label"}),e.jsx("input",{value:V,onChange:o=>te(o.target.value),placeholder:"Client review",style:{borderRadius:12,border:"1px solid rgba(148, 163, 184, 0.16)",background:"#0f1724",color:"#f3f7ff",padding:"0.8rem 0.9rem",outline:"none"}})]}),e.jsxs("label",{style:{display:"flex",flexDirection:"column",gap:6},children:[e.jsx("span",{style:{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#98a6bf",fontWeight:700},children:"Backend state key"}),e.jsx("input",{value:H,onChange:o=>ne(o.target.value),placeholder:"client_review",style:{borderRadius:12,border:"1px solid rgba(148, 163, 184, 0.16)",background:"#0f1724",color:"#f3f7ff",padding:"0.8rem 0.9rem",outline:"none"}})]}),e.jsxs("label",{style:{display:"flex",flexDirection:"column",gap:6},children:[e.jsx("span",{style:{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#98a6bf",fontWeight:700},children:"Description"}),e.jsx("input",{value:W,onChange:o=>J(o.target.value),placeholder:"Awaiting customer-side review.",style:{borderRadius:12,border:"1px solid rgba(148, 163, 184, 0.16)",background:"#0f1724",color:"#f3f7ff",padding:"0.8rem 0.9rem",outline:"none"}})]}),e.jsxs("label",{style:{display:"flex",flexDirection:"column",gap:6},children:[e.jsx("span",{style:{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#98a6bf",fontWeight:700},children:"Empty column text"}),e.jsx("input",{value:oe,onChange:o=>q(o.target.value),placeholder:"No client review submissions yet.",style:{borderRadius:12,border:"1px solid rgba(148, 163, 184, 0.16)",background:"#0f1724",color:"#f3f7ff",padding:"0.8rem 0.9rem",outline:"none"}})]})]}),e.jsxs("div",{style:{marginTop:"1rem",display:"flex",flexWrap:"wrap",gap:"0.5rem",alignItems:"center"},children:[e.jsx("span",{style:{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#98a6bf",fontWeight:700},children:"Backend states"}),D.map(o=>e.jsx(E,{$background:$.background,$border:$.border,$color:$.color,children:o},o))]}),e.jsx("div",{style:{marginTop:"1rem",display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:"0.75rem"},children:c.stages.map(o=>e.jsxs("div",{style:{borderRadius:20,border:`1px solid ${o.border}`,background:"rgba(15, 23, 36, 0.9)",padding:"0.9rem 1rem"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"0.75rem",marginBottom:"0.5rem"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:800,color:"#f3f7ff"},children:o.label}),e.jsx("div",{style:{marginTop:4,fontSize:12,color:"#98a6bf"},children:o.description})]}),e.jsx(E,{$background:o.background,$border:o.border,$color:o.accent,children:o.key})]}),e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:"0.4rem"},children:o.statuses.map(p=>e.jsx(E,{$background:o.background,$border:o.border,$color:o.accent,children:p},p))})]},o.key))})]}),e.jsx(wt,{children:c.stages.map(o=>{const p=M.filter(l=>l.stageKey===o.key);return e.jsxs(St,{$accent:o.accent,$isDropTarget:N!==null&&z===o.key,onDragOver:l=>je(l,o.key),onDrop:l=>s(l,o.key),children:[e.jsxs(Ct,{children:[e.jsxs(Tt,{children:[e.jsx($t,{children:o.label}),e.jsx(It,{children:o.description})]}),e.jsxs(E,{$background:o.background,$border:o.border,$color:o.accent,children:[p.length," items"]})]}),e.jsx(zt,{children:p.length===0?e.jsx(Ee,{children:o.emptyState}):p.map(l=>{const b=ve(c,c.header.titleFieldKey),T=c.header.subtitleFieldKey?ve(c,c.header.subtitleFieldKey):void 0,B=c.header.badgeFieldKey?ve(c,c.header.badgeFieldKey):void 0;return e.jsxs(Ft,{$accent:l.stageAccent,$isDragging:N===l.id,draggable:!0,onDragStart:F=>Fe(F,l),onDragEnd:Le,children:[e.jsxs(Lt,{children:[e.jsxs("div",{children:[e.jsx(Bt,{to:"/admin/deals/create",state:{sourceSubmission:qt(l)},title:`Create deal from ${String(ye(l.values[(b==null?void 0:b.valueKey)??c.header.titleFieldKey],b==null?void 0:b.format))}`,children:ye(l.values[(b==null?void 0:b.valueKey)??c.header.titleFieldKey],b==null?void 0:b.format)}),e.jsx(Pt,{children:ye(l.values[(T==null?void 0:T.valueKey)??c.header.subtitleFieldKey??"cedent"],T==null?void 0:T.format)})]}),B?P(l,B):null]}),e.jsx(Rt,{children:Z.facts.map(F=>e.jsxs(Et,{children:[e.jsx(Nt,{children:F.label}),e.jsx(At,{children:F.format==="badge"?P(l,F):X(l,F)})]},F.key))}),e.jsx(Dt,{children:Z.body.map(F=>e.jsxs(Kt,{children:[e.jsxs(Ot,{children:[F.label,":"]})," ",X(l,F)]},F.key))}),e.jsxs(Mt,{children:[e.jsxs(kt,{children:[l.values.owner," • ",l.values.receivedLabel]}),e.jsx(G,{variant:"ghost",type:"button",onClick:()=>S(l),disabled:l.nextStatus===null,style:{border:"1px solid rgba(75,142,255,0.18)",background:l.nextStatus===null?"rgba(148,163,184,0.06)":"rgba(75,142,255,0.10)",color:l.nextStatus===null?"#98a6bf":"#dbe9ff",cursor:l.nextStatus===null?"not-allowed":"pointer"},children:l.nextStatus===null?"Closed":`Move to ${l.nextStageLabel??"next stage"}`})]})]},l.id)})})]},o.key)})})]})]})]})}kr.__docgenInfo={description:"",methods:[],displayName:"IncomingSubmissionsPage"};const _e="choice-controls-studio",Ie="Choice Controls",ke="Persisted select menus, checkboxes, and radio buttons created from the control studio.",Ve=[{kind:"select",label:"Select menu",description:"Persist a single-choice dropdown with named options.",accent:"#5ea0ff"},{kind:"checkbox",label:"Checkbox",description:"Persist a boolean toggle that renders as a checkbox.",accent:"#2dd4bf"},{kind:"radio",label:"Radio buttons",description:"Persist a single-choice group that renders as radio buttons.",accent:"#f59e0b"}],Ne=[{key:"preferred_contact_method",label:"Preferred Contact Method",type:"radio",order:10,required:!0,helperText:"Rendered as a radio group so the user can choose exactly one contact path.",defaultValue:"email",options:[{label:"Email",value:"email"},{label:"SMS",value:"sms"},{label:"Phone",value:"phone"}]},{key:"marketing_opt_in",label:"Marketing Opt-In",type:"boolean",order:20,helperText:"Rendered as a checkbox and persisted as a boolean field.",defaultValue:!1},{key:"coverage_tier",label:"Coverage Tier",type:"select",order:30,required:!0,placeholder:"Select a tier",helperText:"Rendered as a select menu with a persisted option list.",defaultValue:"standard",options:[{label:"Standard",value:"standard"},{label:"Enhanced",value:"enhanced"},{label:"Enterprise",value:"enterprise"}]}];function rn(r){return JSON.parse(JSON.stringify(r))}function ze(r){return r.map(n=>{var i;return{...n,options:(i=n.options)==null?void 0:i.map(a=>({...a}))}})}function ge(r){return r.trim().replace(/([a-z\d])([A-Z])/g,"$1_$2").replace(/[^a-zA-Z0-9]+/g,"_").replace(/^_+|_+$/g,"").toLowerCase()}function wr(r,n){return ge(r)||n}function Ae(r="select"){return{label:"",key:"",kind:r,required:!1,helperText:"",placeholder:"Choose an option",defaultValue:"",defaultChecked:!1,optionsText:""}}function Sr(r){return r==="boolean"?"checkbox":r==="radio"?"radio":"select"}function tn(r){return r==="checkbox"?"boolean":r}function nn(r){return!r||r.length===0?"":r.map((n,i)=>{const a=wr(n.label,`option_${i+1}`);return n.value&&n.value!==a?`${n.label} | ${n.value}`:n.label}).join(`
`)}function Cr(r){return r.split(/\r?\n/).map(n=>n.trim()).filter(Boolean).map((n,i)=>{const a=n.split(/\||:/,2).map(v=>v.trim()),d=a[0]||`Option ${i+1}`,h=a[1]||"",g=h?ge(h):wr(d,`option_${i+1}`);return{label:d,value:g}})}function on(r){return r.length===0?10:Math.max(...r.map(n=>Number(n.order)||0))+10}function an(r){return[...r].sort((n,i)=>(Number(n.order)||0)-(Number(i.order)||0))}function nr(r){return an(ze(r))}function sn(r,n,i){return r.map((a,d)=>d===n?i:a)}function ln(r,n,i){const a=ge(r)||"choice_field",d=new Set(n.map(v=>v.key).filter(v=>v!==i));if(!d.has(a))return a;let h=2,g=`${a}_${h}`;for(;d.has(g);)h+=1,g=`${a}_${h}`;return g}function dn(r){return{label:r.label,key:r.key,kind:Sr(r.type),required:!!r.required,helperText:r.helperText??"",placeholder:r.placeholder??"Choose an option",defaultValue:typeof r.defaultValue=="string"?r.defaultValue:"",defaultChecked:typeof r.defaultValue=="boolean"?r.defaultValue:!!r.defaultValue,optionsText:nn(r.options)}}function cn(r,n,i,a){var k;const d=r.kind==="checkbox"?void 0:Cr(r.optionsText),h=r.key.trim()||r.label,g=ln(h,n,i),v=((k=d==null?void 0:d[0])==null?void 0:k.value)??"",I=r.kind==="checkbox"?r.defaultChecked:r.defaultValue.trim()||v||void 0;return{key:g,label:r.label.trim(),type:tn(r.kind),order:a??on(n),required:r.required,helperText:r.helperText.trim()||void 0,placeholder:r.kind==="select"&&r.placeholder.trim()||void 0,defaultValue:I,options:d}}function un(r){return r.label.trim()?r.kind!=="checkbox"&&Cr(r.optionsText).length<2?"Select menus and radio groups need at least two options.":null:"Field label is required."}function pn(r){var n;return{key:_e,label:r.sectionLabel.trim()||Ie,order:((n=r.existingSection)==null?void 0:n.order)??980,description:r.sectionDescription.trim()||void 0,fields:r.fields.map((i,a)=>({...i,order:(a+1)*10}))}}function mn(r,n){const i=rn(r),a=i.sections.findIndex(d=>d.key===n.key);return a>=0?(i.sections=i.sections.map((d,h)=>h===a?n:d),i):(i.sections=[...i.sections,n],i)}function gn(r){return r==="boolean"?"Checkbox":r==="radio"?"Radio":r==="select"?"Select":r}function fn(r){const n=[];return r.required&&n.push("required"),r.options&&r.options.length>0&&n.push(`${r.options.length} options`),typeof r.defaultValue=="boolean"?n.push(r.defaultValue?"default on":"default off"):typeof r.defaultValue=="string"&&r.defaultValue.trim()&&n.push(`default ${r.defaultValue}`),n.length>0?n.join(" • "):"No extra settings"}function hn(r){var d,h;const n=typeof r.defaultValue=="string"||typeof r.defaultValue=="boolean"?r.defaultValue:((h=(d=r.options)==null?void 0:d[0])==null?void 0:h.value)??"",i=e.jsxs(Xn,{children:[e.jsx("span",{children:r.label}),r.required?e.jsx(eo,{children:"*"}):null]}),a=r.helperText?e.jsx(ro,{children:r.helperText}):null;return r.type==="boolean"?e.jsxs(Ke,{children:[i,e.jsxs(no,{children:[e.jsx($r,{type:"checkbox",defaultChecked:!!n,disabled:!0}),e.jsx(oo,{children:n?"Enabled by default":"Disabled by default"})]}),a]},r.key):r.type==="radio"?e.jsxs(Ke,{children:[i,e.jsx(io,{role:"radiogroup","aria-label":r.label,children:(r.options??[]).map(g=>e.jsxs(ao,{children:[e.jsx(so,{type:"radio",name:r.key,value:g.value,defaultChecked:g.value===n,disabled:!0}),e.jsx("span",{children:g.label})]},`${r.key}-${g.value}`))}),a]},r.key):e.jsxs(Ke,{children:[i,e.jsxs(to,{value:String(n??""),disabled:!0,children:[e.jsx("option",{value:"",children:r.placeholder??"Choose an option"}),(r.options??[]).map(g=>e.jsx("option",{value:g.value,children:g.label},`${r.key}-${g.value}`))]}),a]},r.key)}function Tr(){const{user:r,loading:n}=fe(),i=(r==null?void 0:r.organizationId)??null,[a,d]=m.useState(null),[h,g]=m.useState(null),[v,I]=m.useState(Ie),[k,x]=m.useState(ke),[y,N]=m.useState(()=>ze(Ne)),[w,z]=m.useState(()=>Ae()),[C,V]=m.useState(null),[te,H]=m.useState(null),[ne,W]=m.useState(null),[J,oe]=m.useState(!0),[q,ie]=m.useState(!1),[Y,L]=m.useState("Staged locally"),[A,he]=m.useState(null);m.useEffect(()=>{if(n)return;let s=!1;return(async()=>{oe(!0),W(null);try{const j=await Zr({organizationId:i});if(s)return;const S=j.template.sections.find(P=>P.key===_e)??null,K=S!=null&&S.fields?nr(S.fields):ze(Ne);d(j.template),g(S),I((S==null?void 0:S.label)??Ie),x((S==null?void 0:S.description)??ke),N(K),z(Ae()),V(null),H(null),L(S?"Persisted section loaded":"Starter section staged")}catch(j){s||(W(j instanceof Error?j.message:"Failed to load the template."),L("Unable to load template"))}finally{s||oe(!1)}})(),()=>{s=!0}},[n,i]);const Q=m.useMemo(()=>pn({sectionLabel:v,sectionDescription:k,fields:y,existingSection:h}),[y,h,k,v]),c=m.useMemo(()=>JSON.stringify(Q,null,2),[Q]),be=(a==null?void 0:a.title)??"Insured Subjects",M=i==null?"Global template":`Organization ${i}`,Z=m.useMemo(()=>({select:y.filter(s=>s.type==="select").length,checkbox:y.filter(s=>s.type==="boolean").length,radio:y.filter(s=>s.type==="radio").length}),[y]);function D(s="select"){z(Ae(s)),V(null),H(null)}function ae(s){z(f=>({...f,kind:s,placeholder:s==="checkbox"?"":f.placeholder||"Choose an option",defaultChecked:f.defaultChecked}))}function U(s){z(f=>{const j=!f.key.trim()||f.key.trim()===ge(f.label);return{...f,label:s,key:j?ge(s):f.key}})}function Fe(s){const f=y[s];f&&(z(dn(f)),V(s),H(null))}function Le(s){const f=y[s];f&&(typeof window<"u"&&!window.confirm(`Remove ${f.label}?`)||(N(j=>j.filter((S,K)=>K!==s)),C===s?D():C!=null&&s<C&&V(j=>j==null?null:j-1)))}function xe(){var K,P;const s=un(w);if(s){H(s);return}const f=C!=null?(K=y[C])==null?void 0:K.key:void 0,j=C!=null?(P=y[C])==null?void 0:P.order:void 0,S=cn(w,y,f,j);N(X=>C==null?[...X,S]:sn(X,C,S)),L(C==null?"Field staged locally":"Field updated locally"),D(w.kind)}function Be(){I(Ie),x(ke),N(ze(Ne)),L("Starter section restored locally"),D()}async function je(){if(!(!a||J||q)){ie(!0),W(null);try{const s=mn(a,Q),f=await Xr({definition:s,organizationId:i}),j=f.sections.find(S=>S.key===_e)??null;d(f),g(j),I((j==null?void 0:j.label)??v),x((j==null?void 0:j.description)??k),N(nr((j==null?void 0:j.fields)??y)),L("Saved to backend"),he(new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})),D()}catch(s){W(s instanceof Error?s.message:"Failed to save the template.")}finally{ie(!1)}}}return n?e.jsx(or,{children:e.jsxs(xn,{children:[e.jsx(jn,{children:"Choice controls"}),e.jsx(yn,{children:"Loading your account context"}),e.jsx(vn,{children:"Preparing the persisted control studio."})]})}):e.jsxs(or,{children:[e.jsx(Me,{$top:-140,$left:-120,$color:"rgba(94, 160, 255, 0.18)"}),e.jsx(Me,{$top:120,$left:"72%",$color:"rgba(45, 212, 191, 0.14)"}),e.jsx(Me,{$top:"55%",$left:"46%",$color:"rgba(245, 158, 11, 0.12)"}),e.jsxs(kn,{children:[e.jsxs(wn,{children:[e.jsx(Sn,{children:"Persisted controls"}),e.jsx(Cn,{children:"Choice Controls Studio"}),e.jsx(Tn,{children:"Stage select menus, checkboxes, and radio groups, then persist the whole choice-controls section into the backend template JSON. The rest of the insured-subjects template is preserved."}),e.jsxs($n,{children:[e.jsx(se,{children:M}),e.jsx(se,{children:be}),e.jsxs(se,{children:[y.length," controls"]}),e.jsx(se,{children:Y}),A?e.jsxs(se,{children:["Saved ",A]}):null]}),e.jsx(In,{children:h?"Editing the persisted choice-controls section that already exists in the backend.":"The starter section is staged locally. Save it once to persist the new backend section."})]}),e.jsxs(zn,{children:[e.jsx(ir,{type:"button",onClick:()=>void je(),disabled:!a||J||q,children:q?"Saving...":"Save to backend"}),e.jsx(ar,{type:"button",onClick:()=>void je(),disabled:!a||J||q,children:"Commit staged controls"}),e.jsx(sr,{type:"button",onClick:Be,children:"Reset section"})]})]}),ne?e.jsx(Fn,{children:ne}):null,e.jsxs(Ln,{children:[e.jsxs(we,{children:[e.jsx(Se,{children:"Section"}),e.jsx(Ce,{children:v}),e.jsx(Te,{children:k||ke})]}),e.jsxs(we,{children:[e.jsx(Se,{children:"Controls"}),e.jsx(Ce,{children:y.length}),e.jsxs(Te,{children:[Z.select," select, ",Z.checkbox," checkbox, ",Z.radio," radio"]})]}),e.jsxs(we,{children:[e.jsx(Se,{children:"Scope"}),e.jsx(Ce,{children:M}),e.jsx(Te,{children:h?"Persisted section detected":"Working from the local starter set"})]}),e.jsxs(we,{children:[e.jsx(Se,{children:"Template title"}),e.jsx(Ce,{children:be}),e.jsx(Te,{children:a!=null&&a.description?a.description:"The template title stays intact while the choice-controls section is updated."})]})]}),e.jsxs(Bn,{children:[e.jsxs(lr,{children:[e.jsxs(le,{children:[e.jsxs(de,{children:[e.jsxs("div",{children:[e.jsx(ce,{children:"Section settings"}),e.jsx(ue,{children:"Persisted section metadata"})]}),e.jsxs(pe,{children:[y.length," fields"]})]}),e.jsxs($e,{children:[e.jsxs(O,{children:[e.jsx(_,{htmlFor:"section-label",children:"Section label"}),e.jsx(me,{id:"section-label",value:v,onChange:s=>I(s.target.value),placeholder:"Choice Controls"})]}),e.jsxs(O,{children:[e.jsx(_,{htmlFor:"section-description",children:"Section description"}),e.jsx(De,{id:"section-description",value:k,onChange:s=>x(s.target.value),placeholder:"Persisted select menus, checkboxes, and radio buttons..."})]})]})]}),e.jsxs(le,{children:[e.jsxs(de,{children:[e.jsxs("div",{children:[e.jsx(ce,{children:"Control builder"}),e.jsx(ue,{children:C==null?"Add a new control":`Editing control #${C+1}`})]}),e.jsx(pe,{children:w.kind==="checkbox"?"checkbox":w.kind})]}),e.jsx(Rn,{children:Ve.map(s=>e.jsxs(En,{type:"button",$accent:s.accent,$active:w.kind===s.kind,onClick:()=>ae(s.kind),children:[e.jsx(Nn,{children:s.label}),e.jsx(An,{children:s.description})]},s.kind))}),e.jsxs($e,{children:[e.jsxs(O,{children:[e.jsx(_,{htmlFor:"field-label",children:"Field label"}),e.jsx(me,{id:"field-label",value:w.label,onChange:s=>U(s.target.value),placeholder:"Preferred Contact Method"})]}),e.jsxs(O,{children:[e.jsx(_,{htmlFor:"field-key",children:"Field key"}),e.jsx(me,{id:"field-key",value:w.key,onChange:s=>z(f=>({...f,key:s.target.value})),placeholder:"preferred_contact_method"})]})]}),e.jsxs($e,{children:[e.jsxs(O,{children:[e.jsx(_,{htmlFor:"field-default",children:"Default value"}),w.kind==="checkbox"?e.jsxs(Dn,{children:[e.jsx($r,{id:"field-default",type:"checkbox",checked:w.defaultChecked,onChange:s=>z(f=>({...f,defaultChecked:s.target.checked}))}),e.jsx(Kn,{htmlFor:"field-default",children:"Enabled by default"})]}):e.jsx(me,{id:"field-default",value:w.defaultValue,onChange:s=>z(f=>({...f,defaultValue:s.target.value})),placeholder:"email"})]}),e.jsxs(O,{children:[e.jsx(_,{htmlFor:"field-placeholder",children:"Placeholder"}),e.jsx(me,{id:"field-placeholder",value:w.placeholder,onChange:s=>z(f=>({...f,placeholder:s.target.value})),placeholder:"Choose an option",disabled:w.kind==="checkbox"})]})]}),e.jsxs($e,{children:[e.jsxs(O,{children:[e.jsx(_,{htmlFor:"field-helper",children:"Helper text"}),e.jsx(De,{id:"field-helper",value:w.helperText,onChange:s=>z(f=>({...f,helperText:s.target.value})),placeholder:"Optional helper text shown beneath the control."})]}),e.jsxs(O,{children:[e.jsx(_,{htmlFor:"field-options",children:"Options"}),e.jsx(De,{id:"field-options",value:w.optionsText,onChange:s=>z(f=>({...f,optionsText:s.target.value})),placeholder:w.kind==="checkbox"?"Not used for checkboxes":`Email | email
SMS | sms
Phone | phone`,disabled:w.kind==="checkbox"}),e.jsxs(Pn,{children:["One option per line. Use ",e.jsx("code",{children:"Label | value"})," when the persisted value should differ from the label."]})]})]}),te?e.jsx(On,{children:te}):null,e.jsxs(Mn,{children:[e.jsx(ir,{type:"button",onClick:xe,children:C==null?"Add control":"Update control"}),e.jsx(ar,{type:"button",onClick:()=>D(w.kind),children:"Clear form"}),C!=null?e.jsx(sr,{type:"button",onClick:()=>D(),children:"Cancel edit"}):null]})]}),e.jsxs(le,{children:[e.jsxs(de,{children:[e.jsxs("div",{children:[e.jsx(ce,{children:"Current controls"}),e.jsx(ue,{children:"Fields staged for persistence"})]}),e.jsx(pe,{children:y.length})]}),e.jsx(_n,{children:y.map((s,f)=>e.jsxs(Vn,{children:[e.jsxs(Hn,{children:[e.jsxs("div",{children:[e.jsx(Wn,{children:s.label}),e.jsx(qn,{children:s.key})]}),e.jsx(Un,{$accent:bn(s.type).accent,children:gn(s.type)})]}),e.jsx(Gn,{children:fn(s)}),s.options&&s.options.length>0?e.jsx(Jn,{children:s.options.map(j=>`${j.label} (${j.value})`).join(" • ")}):null,e.jsxs(Yn,{children:[e.jsx(Ir,{type:"button",onClick:()=>Fe(f),children:"Edit"}),e.jsx(Qn,{type:"button",onClick:()=>Le(f),children:"Remove"})]})]},`${s.key}-${f}`))})]})]}),e.jsxs(lr,{children:[e.jsxs(le,{children:[e.jsxs(de,{children:[e.jsxs("div",{children:[e.jsx(ce,{children:"Live preview"}),e.jsx(ue,{children:"What the persisted controls will look like"})]}),e.jsx(pe,{children:"Preview"})]}),e.jsxs(Zn,{children:[y.map(s=>hn(s)),y.length===0?e.jsx(lo,{children:"No controls staged yet. Add a select, checkbox, or radio control to begin."}):null]})]}),e.jsxs(le,{children:[e.jsxs(de,{children:[e.jsxs("div",{children:[e.jsx(ce,{children:"Persisted payload"}),e.jsx(ue,{children:"JSON that will be written to the backend"})]}),e.jsx(pe,{children:"Section only"})]}),e.jsx(co,{readOnly:!0,value:c})]})]})]})]})}function bn(r){return Ve.find(n=>n.kind===Sr(r))??Ve[0]}const or=t.section`
  position: relative;
  display: grid;
  gap: 1rem;
  max-width: 86rem;
  margin: 0 auto;
`,Me=t.div`
  position: absolute;
  top: ${({$top:r})=>typeof r=="number"?`${r}px`:r};
  left: ${({$left:r})=>typeof r=="number"?`${r}px`:r};
  width: 20rem;
  height: 20rem;
  border-radius: 999px;
  background: ${({$color:r})=>r};
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
`,xn=t.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.75rem;
  padding: 2rem;
  max-width: 32rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 1.5rem;
  background: rgba(11, 19, 38, 0.72);
  backdrop-filter: blur(16px);
`,jn=t.div`
  color: #5ea0ff;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`,yn=t.h1`
  margin: 0;
  font-size: clamp(2rem, 3vw, 3rem);
  line-height: 1;
`,vn=t.p`
  margin: 0;
  color: #9cb0d1;
  line-height: 1.6;
`,kn=t.section`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 1.75rem;
  background:
    linear-gradient(135deg, rgba(11, 19, 38, 0.94), rgba(8, 14, 30, 0.9)),
    rgba(11, 19, 38, 0.7);
  box-shadow: 0 20px 80px rgba(2, 8, 23, 0.34);
  backdrop-filter: blur(18px);
`,wn=t.div`
  display: grid;
  gap: 0.75rem;
`,Sn=t.div`
  color: #5ea0ff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
`,Cn=t.h1`
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 4rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
`,Tn=t.p`
  margin: 0;
  max-width: 52rem;
  color: #98a6bf;
  font-size: 1rem;
  line-height: 1.7;
`,$n=t.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`,se=t.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(173, 198, 255, 0.16);
  background: rgba(12, 22, 43, 0.88);
  color: #d9e3ff;
  font-size: 0.8rem;
  font-weight: 700;
`,In=t.p`
  margin: 0;
  color: #b3bed2;
  font-size: 0.92rem;
  line-height: 1.65;
`,zn=t.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
`,Ue=t.button`
  appearance: none;
  border: 0;
  border-radius: 0.95rem;
  padding: 0.95rem 1.15rem;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background-color 140ms ease, opacity 140ms ease;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
  }
`,ir=t(Ue)`
  color: #06142e;
  background: linear-gradient(135deg, #7cb3ff, #57e3d0);
  box-shadow: 0 12px 28px rgba(94, 160, 255, 0.18);
`,ar=t(Ue)`
  color: #d9e3ff;
  border: 1px solid rgba(173, 198, 255, 0.18);
  background: rgba(16, 25, 48, 0.92);
`,sr=t(Ue)`
  color: #c0cee8;
  border: 1px solid rgba(173, 198, 255, 0.12);
  background: transparent;
`,Fn=t.div`
  position: relative;
  z-index: 1;
  padding: 1rem 1.15rem;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 1rem;
  background: rgba(47, 17, 25, 0.9);
  color: #ffccd0;
  line-height: 1.6;
`,Ln=t.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`,we=t.div`
  display: grid;
  gap: 0.35rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 1.2rem;
  background: rgba(10, 18, 36, 0.76);
  backdrop-filter: blur(16px);
`,Se=t.div`
  color: #7fa8ff;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`,Ce=t.div`
  color: #e6eeff;
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.02em;
`,Te=t.div`
  color: #9cb0d1;
  font-size: 0.82rem;
  line-height: 1.55;
`,Bn=t.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1fr) minmax(330px, 0.92fr);
  align-items: start;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr;
  }
`,lr=t.div`
  display: grid;
  gap: 1rem;
`,le=t.section`
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 1.4rem;
  background: rgba(9, 16, 32, 0.82);
  box-shadow: 0 18px 64px rgba(2, 8, 23, 0.24);
  backdrop-filter: blur(18px);
`,de=t.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`,ce=t.div`
  color: #5ea0ff;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`,ue=t.h2`
  margin: 0.35rem 0 0;
  font-size: 1.1rem;
  line-height: 1.25;
`,pe=t.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(173, 198, 255, 0.16);
  background: rgba(15, 24, 45, 0.9);
  color: #d9e3ff;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
`,$e=t.div`
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`,O=t.div`
  display: grid;
  gap: 0.5rem;
`,_=t.label`
  color: #bfd0ef;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`,me=t.input`
  width: 100%;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 0.95rem;
  background: rgba(15, 24, 45, 0.9);
  color: #e8efff;
  outline: none;

  &::placeholder {
    color: #7f8fb0;
  }

  &:focus {
    border-color: rgba(94, 160, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(94, 160, 255, 0.16);
  }

  &:disabled {
    opacity: 0.62;
  }
`,De=t.textarea`
  width: 100%;
  min-height: 6.2rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 0.95rem;
  background: rgba(15, 24, 45, 0.9);
  color: #e8efff;
  outline: none;
  resize: vertical;
  line-height: 1.6;

  &::placeholder {
    color: #7f8fb0;
  }

  &:focus {
    border-color: rgba(94, 160, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(94, 160, 255, 0.16);
  }

  &:disabled {
    opacity: 0.62;
  }
`,Pn=t.div`
  color: #9cb0d1;
  font-size: 0.8rem;
  line-height: 1.55;
`,Rn=t.div`
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`,En=t.button`
  display: grid;
  gap: 0.45rem;
  padding: 1rem;
  border: 1px solid ${({$accent:r,$active:n})=>n?r:"rgba(173, 198, 255, 0.16)"};
  border-radius: 1.1rem;
  background: ${({$accent:r,$active:n})=>n?`${r}1f`:"rgba(14, 22, 40, 0.84)"};
  color: ${({$accent:r,$active:n})=>n?r:"#d9e3ff"};
  text-align: left;
  transition: transform 140ms ease, box-shadow 140ms ease, background-color 140ms ease, border-color 140ms ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(2, 8, 23, 0.18);
  }
`,Nn=t.div`
  font-size: 0.95rem;
  font-weight: 800;
`,An=t.div`
  color: #a9b9d6;
  font-size: 0.84rem;
  line-height: 1.55;
`,Mn=t.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
`,Dn=t.label`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #d9e3ff;
  font-size: 0.9rem;
  font-weight: 700;
`,$r=t.input`
  width: 18px;
  height: 18px;
  accent-color: #5ea0ff;
`,Kn=t.span`
  color: #d9e3ff;
`,On=t.div`
  padding: 0.85rem 1rem;
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 0.95rem;
  background: rgba(47, 17, 25, 0.9);
  color: #ffd2d6;
  line-height: 1.55;
`,_n=t.div`
  display: grid;
  gap: 0.75rem;
`,Vn=t.article`
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 1rem;
  background: rgba(12, 20, 38, 0.9);
`,Hn=t.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
`,Wn=t.div`
  color: #eef4ff;
  font-size: 0.98rem;
  font-weight: 800;
`,qn=t.div`
  margin-top: 0.2rem;
  color: #90a3c8;
  font-size: 0.8rem;
`,Un=t.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  border: 1px solid ${({$accent:r})=>`${r}70`};
  background: ${({$accent:r})=>`${r}1a`};
  color: ${({$accent:r})=>r};
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
`,Gn=t.div`
  color: #b3bed2;
  font-size: 0.86rem;
  line-height: 1.6;
`,Jn=t.div`
  color: #98a6bf;
  font-size: 0.82rem;
  line-height: 1.6;
`,Yn=t.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
`,Ir=t.button`
  appearance: none;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 0.8rem;
  padding: 0.55rem 0.8rem;
  background: rgba(18, 28, 51, 0.9);
  color: #d9e3ff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    border-color: rgba(173, 198, 255, 0.28);
  }
`,Qn=t(Ir)`
  border-color: rgba(248, 113, 113, 0.24);
  color: #ffc7cd;
`,Zn=t.div`
  display: grid;
  gap: 0.95rem;
  padding: 0.25rem;
`,Ke=t.div`
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
  border: 1px solid rgba(173, 198, 255, 0.12);
  border-radius: 1rem;
  background: rgba(13, 21, 38, 0.84);
`,Xn=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: #e8efff;
  font-size: 0.92rem;
  font-weight: 800;
`,eo=t.span`
  color: #7cb3ff;
  font-size: 0.92rem;
`,ro=t.div`
  color: #97a7c7;
  font-size: 0.82rem;
  line-height: 1.55;
`,to=t.select`
  width: 100%;
  padding: 0.88rem 0.95rem;
  border: 1px solid rgba(173, 198, 255, 0.14);
  border-radius: 0.9rem;
  background: rgba(7, 14, 27, 0.94);
  color: #e8efff;
  outline: none;
`,no=t.label`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #d9e3ff;
  font-size: 0.9rem;
  font-weight: 700;
`,oo=t.span`
  color: #d9e3ff;
`,io=t.div`
  display: grid;
  gap: 0.55rem;
`,ao=t.label`
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: #d9e3ff;
  font-size: 0.9rem;
  font-weight: 600;
`,so=t.input`
  width: 16px;
  height: 16px;
  accent-color: #f59e0b;
`,lo=t.div`
  padding: 1rem;
  border: 1px dashed rgba(173, 198, 255, 0.18);
  border-radius: 1rem;
  color: #9cb0d1;
  line-height: 1.6;
`,co=t.textarea`
  width: 100%;
  min-height: 34rem;
  padding: 1rem;
  border: 1px solid rgba(173, 198, 255, 0.16);
  border-radius: 1rem;
  background: rgba(6, 12, 26, 0.95);
  color: #d9e3ff;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.82rem;
  line-height: 1.6;
  resize: vertical;
  white-space: pre;
  overflow: auto;
`;Tr.__docgenInfo={description:"",methods:[],displayName:"ChoiceControlsPage"};const uo=t.main`
  min-height: calc(100vh - 64px);
  padding: 40px 32px;
  background: #0b1326;
  color: #dae2fd;
`,po=t.section`
  max-width: 960px;
  margin: 0 auto;
  background: rgba(22, 34, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 28px;
`,mo=t.span`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(75, 142, 255, 0.18);
  color: #adc6ff;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 14px;
`,go=t.h1`
  margin: 0;
  font-family: Manrope, sans-serif;
  font-size: 34px;
  font-weight: 800;
`,fo=t.p`
  margin: 12px 0 0;
  color: #c1c6d7;
`,dr={institutional:"Institutional Investor",insurer:"Insurer / MGA",underwriter:"Reinsurer / Underwriting Entity",claims:"Claims Handler / Adjuster",broker:"Insurance Agent / Broker",admin:"Platform Admin / UBO Review"};function zr(){const[r,n]=m.useState(null);return m.useEffect(()=>{const i=window.localStorage.getItem("registrationSession");if(i)try{const a=JSON.parse(i);a.selectedRole&&a.selectedRole in dr&&n(a.selectedRole)}catch{n(null)}},[]),e.jsx(uo,{children:e.jsxs(po,{children:[e.jsx(mo,{children:r?dr[r]:"Registration"}),e.jsx(go,{children:"Capital Profile"}),e.jsx(fo,{children:"KYC verification is complete. Continue by defining capital preferences, risk bands, and allocation constraints."})]})})}zr.__docgenInfo={description:"",methods:[],displayName:"CapitalProfile"};const Fr=t.div`
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, rgba(75, 142, 255, 0.14), transparent 32%),
    linear-gradient(180deg, #071129 0%, #0b1326 46%, #091022 100%);
  color: #dae2fd;
`,ho=t.div`
  min-height: 100vh;
  min-width: 0;
  transition: margin-left 220ms ease;

  @media (min-width: 1024px) {
    margin-left: ${({$sidebarOpen:r})=>r?"18rem":"0"};
  }
`,Lr=t.main`
  min-height: calc(100vh - 4rem);
  padding: 1.25rem 1rem 2rem;

  @media (min-width: 640px) {
    padding: 1.5rem 1.5rem 2.5rem;
  }

  @media (min-width: 1024px) {
    padding: 1.5rem 2rem 2.5rem;
  }
`,bo=t.button`
  position: fixed;
  inset: 4rem 0 0;
  z-index: 30;
  border: 0;
  padding: 0;
  background: rgba(2, 8, 23, 0.56);
  opacity: ${({$isVisible:r})=>r?1:0};
  visibility: ${({$isVisible:r})=>r?"visible":"hidden"};
  pointer-events: ${({$isVisible:r})=>r?"auto":"none"};
  transition: opacity 200ms ease;

  @media (min-width: 1024px) {
    display: none;
  }
`,xo=t.div`
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 1.5rem;
  background:
    radial-gradient(circle at 0 0, rgba(75, 142, 255, 0.16), transparent 30%),
    radial-gradient(circle at 100% 70%, rgba(78, 222, 163, 0.08), transparent 34%),
    linear-gradient(180deg, #0b1326 0%, #091022 100%);
  color: #dae2fd;
`,jo=t.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.24;
  background-size: 40px 40px;
  background-image: radial-gradient(circle, #414755 1px, transparent 1px);
`,Br=t.div`
  position: absolute;
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
`,yo=t(Br)`
  top: -10%;
  left: -10%;
  width: 40%;
  height: 40%;
  background: rgba(75, 142, 255, 0.12);
`,vo=t(Br)`
  top: 60%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: rgba(78, 222, 163, 0.08);
`,ko=t.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 440px;
`,wo=t.div`
  margin-bottom: 3rem;
  text-align: center;
`,So=t.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(173, 198, 255, 0.15);
  border-radius: 0.5rem;
  background: #171f33;
  color: #4b8eff;
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`,Co=t.h1`
  margin: 0 0 0.5rem;
  color: #dae2fd;
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 1.02;
`,To=t.p`
  margin: 0;
  color: #c1c6d7;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`,$o=t.section`
  overflow: hidden;
  border: 1px solid rgba(173, 198, 255, 0.15);
  border-radius: 0.75rem;
  background: rgba(23, 31, 51, 0.9);
  box-shadow: 0 40px 80px -15px rgba(6, 14, 32, 0.8);
  backdrop-filter: blur(16px);
`,Io=t.div`
  padding: 2rem;
`,zo=t.div`
  margin-bottom: 2rem;
`,Fo=t.h2`
  margin: 0;
  color: #dae2fd;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
`,Lo=t.p`
  margin: 0.5rem 0 0;
  color: #98a6bf;
  font-size: 0.875rem;
  line-height: 1.6;
`,Bo=t.form`
  display: grid;
  gap: 1.5rem;
`,cr=t.div`
  display: grid;
  gap: 0.5rem;
`,ur=t.label`
  color: #8b90a0;
  font-family: monospace;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
`,Po=t.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
`,Ro=t(qe)`
  color: #4b8eff;
  font-family: monospace;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: #adc6ff;
    text-decoration: underline;
  }
`,He=t.div`
  position: relative;
  display: flex;
  align-items: center;
`,pr=t.input`
  width: 100%;
  border: 0;
  border-bottom: 2px solid rgba(129, 137, 160, 0.32);
  background: transparent;
  padding: 0.75rem 2.25rem 0.75rem 0;
  color: #dae2fd;
  font-family: monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  outline: none;
  transition: border-color 180ms ease;

  &::placeholder {
    color: #8b90a0;
  }

  &:focus {
    border-bottom-color: #4b8eff;
  }
`,mr=t.span`
  position: absolute;
  right: 0.5rem;
  top: 0.9rem;
  color: #8b90a0;
  font-size: 0.875rem;
  line-height: 1;
  transition: color 180ms ease;

  ${He}:focus-within & {
    color: #4b8eff;
  }
`,Eo=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0;
`,No=t.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`,Ao=t.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.25rem;
  background: #222a3d;
  color: #4edea3;
  font-size: 0.85rem;
  font-weight: 900;
  line-height: 1;
`,Mo=t.div`
  display: grid;
  gap: 0.1rem;
`,Do=t.p`
  margin: 0;
  color: #dae2fd;
  font-size: 0.875rem;
  font-weight: 600;
`,Ko=t.p`
  margin: 0;
  color: #c1c6d7;
  font-family: monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`,Oo=t.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
`,We=t.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`,_o=t.div`
  position: relative;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 999px;
  background: #2d3449;
  transition: background-color 180ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 999px;
    background: #c1c6d7;
    transition: transform 180ms ease, background-color 180ms ease;
  }

  ${We}:checked + & {
    background: #00a572;
  }

  ${We}:checked + &::after {
    transform: translateX(1.25rem);
    background: #dae2fd;
  }
`,Pr=t.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  border: 0;
  background: #4b8eff;
  color: #001a41;
  padding: 1rem 1.25rem;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  transition: transform 140ms ease, filter 140ms ease;

  &:hover {
    filter: brightness(1.08);
  }

  &:active {
    transform: scale(0.98);
  }
`,Vo=t.span`
  font-size: 0.9rem;
  line-height: 1;
  transition: transform 140ms ease;

  ${Pr}:hover & {
    transform: translateX(0.15rem);
  }
`,Ho=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgba(173, 198, 255, 0.15);
  background: #2d3449;
  padding: 0.75rem 2rem;
`,Wo=t.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,qo=t.span`
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 999px;
  background: #4edea3;
  box-shadow: 0 0 0 0 rgba(78, 222, 163, 0.55);
  animation: pulse 1.8s infinite;

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(78, 222, 163, 0.45);
    }

    70% {
      box-shadow: 0 0 0 10px rgba(78, 222, 163, 0);
    }

    100% {
      box-shadow: 0 0 0 0 rgba(78, 222, 163, 0);
    }
  }
`,Uo=t.span`
  color: #8b90a0;
  font-family: monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`,Go=t.span`
  color: #8b90a0;
  font-family: monospace;
  font-size: 0.5625rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`,Jo=t.p`
  margin: 1.5rem 0 0;
  text-align: center;
  color: #c1c6d7;
  font-size: 0.875rem;
`,Yo=t(qe)`
  color: #4b8eff;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,Qo=t.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgba(65, 71, 85, 0.15);
  background: #131b2e;
  padding: 0.4rem 1rem;
  color: #6b7280;
  font-family: monospace;
  font-size: 0.6875rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`,gr=t.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`,fr=t.a`
  color: inherit;
  text-decoration: none;

  &:hover {
    color: #d1d5db;
  }
`,Zo=t.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.1;
`,Xo=t.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: grayscale(100%);
`,ei=t.div`
  display: none;
`,Rr=m.createContext({isAuthenticated:!1,user:null}),ri=[{id:"/",label:"Home",icon:"H"},{id:"/investors",label:"Investors",icon:"INV"},{id:"/claims",label:"Claims",icon:"CLM"},{id:"/underwriting/submissions",label:"Incoming Submissions",icon:"SUB"},{id:"/marketplace",label:"Marketplace",icon:"MKT"},{id:"/admin",label:"Admin",icon:"ADM"},{id:"/insurer",label:"Insurer",icon:"INS",subItems:[{id:"/insurer",label:"Dashboard",icon:"DB"},{id:"/insurer/coverage/create",label:"Create Coverage",icon:"CR"},{id:"/insurer/coverage/line-of-business",label:"Line of Business",icon:"LB"},{id:"/insurer/coverage/choice-controls",label:"Choice Controls",icon:"CC"},{id:"/insurer/coverage-active",label:"Active Coverage",icon:"AC"},{id:"/insurer/pipeline-ingestion",label:"Pipeline Ingestion",icon:"PL"},{id:"/insurer/reports",label:"Reports",icon:"RP"},{id:"/insurer/settings",label:"Settings",icon:"ST"},{id:"/insurer/claims",label:"Claims",icon:"CL"}]}];function hr(r){return r==="/"?"/":r.replace(/\/+$/g,"")}function ti(r,n){const i=hr(r),a=hr(n);return a==="/"?i==="/":i===a||i.startsWith(`${a}/`)}function Er(r,n){return r.map(i=>{const a=i.subItems?Er(i.subItems,n):void 0,d=!!(a!=null&&a.some(g=>g.active)),h=ti(n,i.id)||d;return{...i,active:h,subItems:a}})}function ni(){return m.useContext(Rr)}function oi(){const{user:r,loading:n}=fe();return n?null:r?e.jsx(re,{to:"/marketplace",replace:!0}):e.jsx(Nr,{children:e.jsx(et,{})})}function Nr({children:r}={}){return e.jsxs(Fr,{children:[e.jsx(xr,{user:null}),e.jsx(Lr,{children:r??e.jsx(ee,{})})]})}function Oe({children:r}={}){const{user:n,loading:i}=fe();return i?null:n?e.jsx(re,{to:"/marketplace",replace:!0}):e.jsx(Nr,{children:r})}function ii(){const{user:r,loading:n}=fe();return n?null:r?e.jsx(re,{to:"/marketplace",replace:!0}):e.jsx(ai,{})}function ai(){const r=n=>{n.preventDefault()};return e.jsxs(xo,{children:[e.jsx(jo,{}),e.jsx(yo,{}),e.jsx(vo,{}),e.jsxs(ko,{children:[e.jsxs(wo,{children:[e.jsx(So,{children:"token"}),e.jsx(Co,{children:"Synthetix Ledger"}),e.jsx(To,{children:"Programmable Reinsurance Terminal"})]}),e.jsxs($o,{children:[e.jsxs(Io,{children:[e.jsxs(zo,{children:[e.jsx(Fo,{children:"Secure Access"}),e.jsx(Lo,{children:"Enter institutional credentials to manage tranches."})]}),e.jsxs(Bo,{onSubmit:r,children:[e.jsxs(cr,{children:[e.jsx(ur,{htmlFor:"account-identity",children:"Account Identity"}),e.jsxs(He,{children:[e.jsx(pr,{id:"account-identity",name:"accountIdentity",type:"email",placeholder:"institutional@email.com"}),e.jsx(mr,{"aria-hidden":"true",children:"@"})]})]}),e.jsxs(cr,{children:[e.jsxs(Po,{children:[e.jsx(ur,{htmlFor:"access-key",children:"Access Key"}),e.jsx(Ro,{to:"/auth/register",children:"FORGOT KEY?"})]}),e.jsxs(He,{children:[e.jsx(pr,{id:"access-key",name:"accessKey",type:"password",placeholder:"••••••••••••"}),e.jsx(mr,{"aria-hidden":"true",children:"*"})]})]}),e.jsxs(Eo,{children:[e.jsxs(No,{children:[e.jsx(Ao,{"aria-hidden":"true",children:"✓"}),e.jsxs(Mo,{children:[e.jsx(Do,{children:"2FA Verification"}),e.jsx(Ko,{children:"Biometric or Hardware Key"})]})]}),e.jsxs(Oo,{"aria-label":"Enable two factor verification",children:[e.jsx(We,{defaultChecked:!0,type:"checkbox"}),e.jsx(_o,{})]})]}),e.jsxs(Pr,{type:"submit",children:["Initialize Session",e.jsx(Vo,{"aria-hidden":"true",children:"→"})]})]})]}),e.jsxs(Ho,{children:[e.jsxs(Wo,{children:[e.jsx(qo,{}),e.jsx(Uo,{children:"Network Protocol: V4.2L"})]}),e.jsx(Go,{children:"Uptime: 99.998%"})]})]}),e.jsxs(Jo,{children:["New Organization? ",e.jsx(Yo,{to:"/auth/register",children:"Request Onboarding"})]})]}),e.jsx(Zo,{"aria-hidden":"true",children:e.jsx(Xo,{alt:"",src:"https://lh3.googleusercontent.com/aida-public/AB6AXuDuktzwJphLvW8OAEbhGHnPBR0QqIbUnuz_QYwKcMVXH46zZ369w3px1jgW6bMyO0KrnTchzn4MmFWbocGUHP6VNEjgGvoTZQqgIud0T4QdhujkLQiba-TxH8zxdBVDGWeB85i-Z3E5B2nUHBU5YNy4595Sr282yn65zEeo5T6RC6w8oNZNDEH1yZtoz9xdqjxV4on8vWy1lQTsA-IOAMT1f6T_WBF7hq81x-0nZPjJkWEeboFCfM_PMimudUO_GZ7xIIrfRgFRoDpx"})}),e.jsx(ei,{"aria-hidden":"true",children:e.jsx("h2",{children:"Securely Disconnected"})}),e.jsxs(Qo,{children:[e.jsxs(gr,{children:[e.jsx("span",{children:"Hurricane Milton: Cat 4 approaching Florida..."}),e.jsx("span",{children:"Global TVL: $4.2B"}),e.jsx("span",{children:"Active Tranches: 142"})]}),e.jsxs(gr,{children:[e.jsx(fr,{href:"#",children:"Network Status"}),e.jsx(fr,{href:"#",children:"Risk Feed"})]})]})]})}function si(){const r=br(),{user:n,loading:i}=fe();return i?null:n?e.jsx(Rr.Provider,{value:{isAuthenticated:!0,user:n},children:e.jsx(ee,{})}):e.jsx(re,{to:"/",replace:!0,state:{from:r.pathname}})}function li({children:r}={}){const{user:n}=ni(),i=br(),a=Mr(),[d,h]=m.useState(()=>typeof window<"u"?window.matchMedia("(min-width: 1024px)").matches:!0),g=i.pathname,v=m.useMemo(()=>Er(ri,g),[g]),I=n&&([n.firstName,n.lastName].filter(Boolean).join(" ").trim()||n.email)||"Authenticated session",k=n!=null&&n.role?`${n.role} | ${I}`:I;m.useEffect(()=>{if(typeof window>"u")return;const y=()=>{h(window.innerWidth>=1024)};return y(),window.addEventListener("resize",y),()=>window.removeEventListener("resize",y)},[]);const x=()=>{Hr(null),a("/",{replace:!0})};return e.jsxs(Fr,{children:[e.jsx(bo,{type:"button","aria-label":"Close navigation menu",onClick:()=>h(!1),$isVisible:d}),e.jsx(xr,{isSidebarOpen:d,onToggleSidebar:()=>h(y=>!y),user:n}),e.jsx(Kr,{items:v,title:"Ensured Marketplace",subtitle:k,isOpen:d,onRequestClose:()=>h(!1),onLogout:x}),e.jsx(ho,{$sidebarOpen:d,children:e.jsx(Lr,{children:r??e.jsx(ee,{})})})]})}function di(){return e.jsxs(Ar,{children:[e.jsx(u,{path:"/",element:e.jsx(oi,{})}),e.jsx(u,{path:"/auth/login",element:e.jsx(ii,{})}),e.jsx(u,{path:"/auth/register",element:e.jsx(Oe,{children:e.jsx(tt,{})})}),e.jsx(u,{path:"/auth/register/kyc",element:e.jsx(Oe,{children:e.jsx(rt,{})})}),e.jsx(u,{path:"/auth/register/capital-profile",element:e.jsx(Oe,{children:e.jsx(zr,{})})}),e.jsx(u,{element:e.jsx(si,{}),children:e.jsxs(u,{element:e.jsx(li,{}),children:[e.jsx(u,{path:"/claims/*",element:e.jsx(Ge,{})}),e.jsx(u,{path:"/investors/*",element:e.jsx(Or,{})}),e.jsx(u,{path:"/underwriting/submissions",element:e.jsx(kr,{})}),e.jsx(u,{path:"/marketplace",element:e.jsx(Dr,{})}),e.jsx(u,{path:"/admin/deals/create",element:e.jsx(R,{})}),e.jsx(u,{path:"/admin",element:e.jsx(_r,{})}),e.jsxs(u,{path:"/insurer",element:e.jsx(ee,{}),children:[e.jsx(u,{index:!0,element:e.jsx(Re,{})}),e.jsx(u,{path:"dashboard",element:e.jsx(Re,{})}),e.jsxs(u,{path:"risk",element:e.jsx(ee,{}),children:[e.jsx(u,{index:!0,element:e.jsx(R,{})}),e.jsx(u,{path:"upload",element:e.jsx(R,{})}),e.jsx(u,{path:"history",element:e.jsx(R,{})}),e.jsx(u,{path:"validation",element:e.jsx(R,{})})]}),e.jsx(u,{path:"portfolio",element:e.jsx(Re,{})}),e.jsxs(u,{path:"coverage",element:e.jsx(ee,{}),children:[e.jsx(u,{index:!0,element:e.jsx(R,{})}),e.jsx(u,{path:"create",element:e.jsx(R,{})}),e.jsx(u,{path:"line-of-business",element:e.jsx(Ur,{}),children:e.jsx(u,{path:"active-template",element:e.jsx(qr,{})})}),e.jsx(u,{path:"choice-controls",element:e.jsx(Tr,{})}),e.jsx(u,{path:"simulate",element:e.jsx(R,{})}),e.jsx(u,{path:"pricing",element:e.jsx(R,{})})]}),e.jsx(u,{path:"coverage-active",element:e.jsx(Wr,{})}),e.jsx(u,{path:"reports",element:e.jsx(Gr,{})}),e.jsx(u,{path:"pipeline-ingestion",element:e.jsx(Yr,{})}),e.jsx(u,{path:"pipeline-ingestion/rabbitmq",element:e.jsx(Je,{})}),e.jsx(u,{path:"pipeline-ingestion/rabbitmq/:channelId",element:e.jsx(Je,{})}),e.jsx(u,{path:"pipeline-ingestion/rabbitmq/:channelId/queue/:queueName",element:e.jsx(Qr,{})}),e.jsx(u,{path:"pipeline-ingestion/email-sso",element:e.jsx(Ye,{})}),e.jsx(u,{path:"pipeline-ingestion/email-sso/:channelId",element:e.jsx(Ye,{})}),e.jsx(u,{path:"pipeline-ingestion/cloud-storage",element:e.jsx(Qe,{})}),e.jsx(u,{path:"pipeline-ingestion/cloud-storage/:channelId",element:e.jsx(Qe,{})}),e.jsx(u,{path:"pipeline-ingestion/sftp",element:e.jsx(Ze,{})}),e.jsx(u,{path:"pipeline-ingestion/sftp/:channelId",element:e.jsx(Ze,{})}),e.jsx(u,{path:"pipeline-ingestion/webhooks",element:e.jsx(Xe,{})}),e.jsx(u,{path:"pipeline-ingestion/webhooks/:channelId",element:e.jsx(Xe,{})}),e.jsx(u,{path:"settings",element:e.jsx(Jr,{})}),e.jsx(u,{path:"claims",element:e.jsx(Ge,{})}),e.jsx(u,{path:"*",element:e.jsx(re,{to:"/insurer",replace:!0})})]}),e.jsx(u,{path:"*",element:e.jsx(re,{to:"/marketplace",replace:!0})})]})})]})}di.__docgenInfo={description:"",methods:[],displayName:"AppRoutes"};export{di as A};
