import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as g}from"./index-B3TfwC44.js";import{R as ce,a as i,O as C,N as Z,f as ee}from"./chunk-OE4NN4TA-Bw6l4tmK.js";import{y as t}from"./styled-components.browser.esm-DDkbN7W9.js";import{A as re}from"./AllocateCapitalPage-JhBHyoz1.js";import{M as pe}from"./Marketplace-CPHeWgKS.js";import{C as D,T as me,S as ue}from"./TopBarNav-fIfrKe6o.js";import{I as ge}from"./Investors-g59NhPqp.js";import{A as be}from"./AdminPage-CXxNf2wz.js";import{B as S}from"./Button-D4SNBHNz.js";import{S as xe}from"./SegmentedSwitch-CW9Gb_Tg.js";import{a as U}from"./auth-DmpauaO1.js";import{I as f}from"./InsurerDashboard-X1HCQ0du.js";import{A as T,a as fe,R as he,S as je}from"./Settings-CmDJxnZ6.js";import{P as ve}from"./PipelineIngestion-CbkCRGMa.js";import{R as H}from"./RabbitMQConfig-KTpttUGX.js";import{Q as ye}from"./QueueConfig-DEkQMQ_J.js";import{E as O}from"./EmailIngestConfig-oBtkoA-j.js";import{C as q}from"./CloudStorageConfig-DR0ol3pe.js";import{S as V}from"./SFTPConfig-DktYG2oo.js";import{W as _}from"./WebhookConfig-BWIUm4GE.js";import{L as we}from"./LandingPage-ChAa3aBr.js";import{u as te}from"./useAuthMe-B_qCSjfZ.js";import{B as ke}from"./index-BX4yIXOB.js";import"./api-2uxkEE_U.js";import"./MapPanel-BgXlA3na.js";import"./colors-CWt0Ylu9.js";import"./tokens-C6qfnSfg.js";import"./InsurerDashboard.styles-CeOM6OtU.js";import"./SideNavBar-CL_K8fDk.js";import"./Navigation-IrReTMVv.js";import"./TopNavBar-DbKDKjEy.js";import"./StatCard-Cfi361so.js";import"./DataTable-Db9XTajc.js";import"./AdminPage.styles-BqcskUCV.js";import"./UsersSubpage-iLQ-eL4Q.js";import"./SeedingPanel-BexTwDPO.js";import"./Input-CtVi8lyF.js";import"./NumberInput-DvKdu6Yo.js";import"./Select-D8OFKnYf.js";import"./index-CLF8vIaC.js";import"./tiny-invariant-CopsF_GD.js";import"./HeroHeader-DWrZDgzG.js";function ne(r){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(r)}function Se(r){return/[",\n]/.test(r)?`"${r.replace(/"/g,'""')}"`:r}const Ce=t.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`,$e=t.section`
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background:
    radial-gradient(circle at top right, rgba(75, 142, 255, 0.26), transparent 30%),
    linear-gradient(135deg, rgba(11, 19, 38, 0.98), rgba(11, 19, 38, 0.76));
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.35);
`,Ae=t.div`
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: flex-start;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
`,Ie=t.div`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #9ec0ff;
  margin-bottom: 0.7rem;
`,Re=t.h1`
  margin: 0;
  font-family: var(--font-headline, Manrope, sans-serif);
  font-size: clamp(1.8rem, 3vw, 2.7rem);
  line-height: 1.05;
  color: #f3f7ff;
`,Le=t.p`
  margin: 0.8rem 0 0;
  max-width: 62ch;
  color: rgba(218, 226, 253, 0.78);
  line-height: 1.6;
`,Be=t.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  align-items: center;
`,Me=t.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;

  @media (max-width: 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`,Te=t.div`
  border-radius: 20px;
  padding: 1rem 1.05rem;
  background: rgba(11, 18, 32, 0.76);
  border: 1px solid rgba(148, 163, 184, 0.1);
  box-shadow: 0 10px 28px rgba(2, 8, 23, 0.18);
`,Ne=t.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #98a6bf;
  margin-bottom: 0.45rem;
`,Fe=t.div`
  font-size: 1.35rem;
  font-weight: 800;
  color: #f3f7ff;
`,Ee=t.div`
  margin-top: 0.35rem;
  color: #98a6bf;
  font-size: 0.85rem;
`,Pe=t.section`
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(7, 17, 41, 0.72);
  box-shadow: 0 24px 60px rgba(2, 8, 23, 0.28);
  padding: 1.2rem;
`,ze=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`,Ke=t.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`,De=t.div`
  overflow-x: auto;
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.1);
`,Ue=t.table`
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
  background: rgba(11, 18, 32, 0.72);
`,W=t.th`
  padding: 0.9rem 0.95rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #98a6bf;
  text-align: left;
  background: rgba(255, 255, 255, 0.02);
`,He=t.tr`
  border-top: 1px solid rgba(148, 163, 184, 0.08);
  transition: background 160ms ease, transform 160ms ease;

  &:hover {
    background: rgba(75, 142, 255, 0.05);
  }
`,G=t.td`
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
`;const Oe=t.div`
  color: #98a6bf;
  font-size: 0.82rem;
`,qe=t.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.95rem;
`,Ve=t.div`
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.11);
  background: rgba(11, 18, 32, 0.74);
  box-shadow: 0 16px 36px rgba(2, 8, 23, 0.2);
  padding: 0.95rem;
  min-height: 100%;

  border-top: 3px solid ${({$accent:r})=>r};
`,_e=t.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
`,We=t.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`,Ge=t.div`
  font-weight: 800;
  color: #f3f7ff;
`,Qe=t.div`
  color: #98a6bf;
  font-size: 0.82rem;
  line-height: 1.4;
`,Ye=t.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`,Je=t.article`
  border-radius: 18px;
  padding: 0.95rem;
  background: rgba(7, 17, 41, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-left: 3px solid ${({$accent:r})=>r};
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`,Xe=t.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
`,Ze=t.div`
  font-weight: 800;
  color: #f3f7ff;
`,er=t.div`
  color: #98a6bf;
  font-size: 0.84rem;
  line-height: 1.45;
`,rr=t.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.7rem;
`,tr=t.div`
  border-radius: 14px;
  padding: 0.7rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
`,nr=t.div`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #98a6bf;
  margin-bottom: 0.25rem;
`,or=t.div`
  font-size: 0.92rem;
  font-weight: 700;
  color: #dae2fd;
`,ir=t.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`,N=t.div`
  border-radius: 18px;
  border: 1px dashed rgba(148, 163, 184, 0.18);
  padding: 1rem;
  color: #98a6bf;
  font-size: 0.9rem;
`,ar=t.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`,sr=t.div`
  color: #98a6bf;
  font-size: 0.84rem;
  line-height: 1.45;
`,lr=t.span`
  color: #dae2fd;
  font-weight: 700;
`,oe={urgent:{label:"Urgent",background:"rgba(255, 107, 107, 0.12)",border:"rgba(255, 107, 107, 0.25)",color:"#ff8b8b"},high:{label:"High",background:"rgba(245, 158, 11, 0.12)",border:"rgba(245, 158, 11, 0.25)",color:"#f7b955"},normal:{label:"Normal",background:"rgba(75, 142, 255, 0.10)",border:"rgba(75, 142, 255, 0.22)",color:"#9ec0ff"}},m={background:"rgba(148, 163, 184, 0.08)",border:"rgba(148, 163, 184, 0.2)",color:"#dae2fd"},k=t.span`
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
`;function dr(r,o,s){return o.badgeSource==="priority"?oe[r.priority].label:o.badgeSource==="stage"?r.stageLabel:s==null||s===""?o.label:String(s)}function cr(r,o){return o.badgeSource==="priority"?oe[r.priority]:o.badgeSource==="stage"?{background:r.stageBackground,border:r.stageBorder,color:r.stageAccent}:m}function F(r,o){if(r==null||r==="")return"—";if(o==="currency"&&typeof r=="number")return ne(r);if(o==="number"&&typeof r=="number")return new Intl.NumberFormat("en-US").format(r);if(o==="date"){const s=new Date(String(r));if(!Number.isNaN(s.getTime()))return new Intl.DateTimeFormat("en-US",{dateStyle:"medium",timeStyle:"short"}).format(s)}return String(r)}function I(r,o){return[...r.tableColumns,...r.cardFields].find(s=>s.key===o||s.valueKey===o)}function pr(r){return{facts:r.filter(o=>o.section!=="body"),body:r.filter(o=>o.section==="body")}}function mr(r){return r.format==="currency"?ne(r.value):new Intl.NumberFormat("en-US").format(r.value)}function ie(){const[r,o]=g.useState(0),[s,c]=g.useState(null),[x,h]=g.useState(!0),[v,y]=g.useState(null),[L,j]=g.useState(0);g.useEffect(()=>{let n=!1;async function d(){h(!0),y(null);try{const a=await U("/api/underwriting/submissions");if(!a.ok)throw new Error(`Status ${a.status}`);const p=await a.json();n||c(p)}catch(a){n||(c(null),y(a instanceof Error?a.message:String(a)))}finally{n||h(!1)}}return d(),()=>{n=!0}},[L]);const l=s==null?void 0:s.config,le=(s==null?void 0:s.summary)??[],$=(s==null?void 0:s.items)??[],z=l?pr(l.cardFields):{facts:[],body:[]};function B(){j(n=>n+1)}async function K(n){if(!n.nextStatus)return;const d=await U(`/api/underwriting/submissions/${n.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:n.nextStatus})});if(!d.ok){y(`Unable to update submission ${n.id}: ${d.status}`);return}B()}function de(){if(!s||!l)return;const d=[l.tableColumns.map(w=>w.label).join(","),...$.map(w=>l.tableColumns.map(u=>Se(String(w.values[u.valueKey]??""))).join(","))],a=new Blob([d.join(`
`)],{type:"text/csv;charset=utf-8;"}),p=URL.createObjectURL(a),b=document.createElement("a");b.href=p,b.download="incoming-submissions.csv",b.click(),URL.revokeObjectURL(p)}function A(n,d){const a=cr(n,d);return e.jsx(k,{$background:a.background,$border:a.border,$color:a.color,children:dr(n,d,n.values[d.valueKey])})}function M(n,d){const a=n.values[d.valueKey];return d.format==="badge"?A(n,d):F(a,d.format)}return e.jsxs(Ce,{children:[e.jsx($e,{children:e.jsxs(Ae,{children:[e.jsxs("div",{children:[e.jsx(Ie,{children:(l==null?void 0:l.eyebrow)??"Underwriting queue"}),e.jsx(Re,{children:(l==null?void 0:l.title)??"Incoming Submissions"}),e.jsx(Le,{children:(l==null?void 0:l.description)??"Loading the live underwriting queue from the backend."})]}),e.jsxs(Be,{children:[e.jsx(k,{$background:m.background,$border:m.border,$color:m.color,children:x?"Loading live data":`${$.length} live submissions`}),e.jsx(k,{$background:m.background,$border:m.border,$color:m.color,children:"Backend-configured"}),e.jsx(S,{variant:"ghost",type:"button",onClick:de,disabled:!s,style:{border:"1px solid rgba(75,142,255,0.22)",background:"rgba(75,142,255,0.10)",color:"#dae2fd"},children:"Export CSV"}),e.jsx(S,{variant:"secondary",type:"button",onClick:B,children:"Refresh board"})]})]})}),e.jsx(Me,{children:le.map(n=>e.jsxs(Te,{children:[e.jsx(Ne,{children:n.label}),e.jsx(Fe,{children:mr(n)}),e.jsx(Ee,{children:n.meta})]},n.label))}),e.jsxs(Pe,{children:[e.jsxs(ze,{children:[e.jsx(xe,{options:["Table","Kanban"],value:r,onChange:o}),e.jsxs(Ke,{children:[e.jsx(k,{$background:m.background,$border:m.border,$color:m.color,children:l?`${l.stages.length} stages`:"Backend stages"}),e.jsx(k,{$background:m.background,$border:m.border,$color:m.color,children:s?`Synced ${new Date(s.refreshedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}`:"Waiting for backend sync"})]})]}),v?e.jsxs(N,{children:[e.jsxs("div",{style:{marginBottom:"0.75rem"},children:["Unable to load live submissions: ",v]}),e.jsx(S,{variant:"secondary",type:"button",onClick:B,children:"Retry"})]}):x||!l?e.jsx(N,{children:"Loading the backend-configured submission board."}):r===0?e.jsx(De,{children:e.jsxs(Ue,{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[l.tableColumns.map(n=>e.jsx(W,{children:n.label},n.key)),e.jsx(W,{children:"Action"})]})}),e.jsx("tbody",{children:$.map(n=>{const d=n.nextStatus===null;return e.jsxs(He,{children:[l.tableColumns.map(a=>{const p=I(l,a.key)??a;return e.jsx(G,{children:p.format==="badge"?A(n,p):M(n,p)},a.key)}),e.jsx(G,{children:e.jsx(S,{variant:"ghost",type:"button",onClick:()=>K(n),disabled:d,style:{border:"1px solid rgba(75,142,255,0.18)",background:d?"rgba(148,163,184,0.06)":"rgba(75,142,255,0.10)",color:d?"#98a6bf":"#dbe9ff",cursor:d?"not-allowed":"pointer"},children:d?"Closed":`Move to ${n.nextStageLabel??"next stage"}`})})]},n.id)})})]})}):e.jsx(qe,{children:l.stages.map(n=>{const d=$.filter(a=>a.stageKey===n.key);return e.jsxs(Ve,{$accent:n.accent,children:[e.jsxs(_e,{children:[e.jsxs(We,{children:[e.jsx(Ge,{children:n.label}),e.jsx(Qe,{children:n.description})]}),e.jsxs(k,{$background:n.background,$border:n.border,$color:n.accent,children:[d.length," items"]})]}),e.jsx(Ye,{children:d.length===0?e.jsx(N,{children:n.emptyState}):d.map(a=>{const p=I(l,l.header.titleFieldKey),b=l.header.subtitleFieldKey?I(l,l.header.subtitleFieldKey):void 0,w=l.header.badgeFieldKey?I(l,l.header.badgeFieldKey):void 0;return e.jsxs(Je,{$accent:a.stageAccent,children:[e.jsxs(Xe,{children:[e.jsxs("div",{children:[e.jsx(Ze,{children:F(a.values[(p==null?void 0:p.valueKey)??l.header.titleFieldKey],p==null?void 0:p.format)}),e.jsx(er,{children:F(a.values[(b==null?void 0:b.valueKey)??l.header.subtitleFieldKey??"cedent"],b==null?void 0:b.format)})]}),w?A(a,w):null]}),e.jsx(rr,{children:z.facts.map(u=>e.jsxs(tr,{children:[e.jsx(nr,{children:u.label}),e.jsx(or,{children:u.format==="badge"?A(a,u):M(a,u)})]},u.key))}),e.jsx(ar,{children:z.body.map(u=>e.jsxs(sr,{children:[e.jsxs(lr,{children:[u.label,":"]})," ",M(a,u)]},u.key))}),e.jsxs(ir,{children:[e.jsxs(Oe,{children:[a.values.owner," • ",a.values.receivedLabel]}),e.jsx(S,{variant:"ghost",type:"button",onClick:()=>K(a),disabled:a.nextStatus===null,style:{border:"1px solid rgba(75,142,255,0.18)",background:a.nextStatus===null?"rgba(148,163,184,0.06)":"rgba(75,142,255,0.10)",color:a.nextStatus===null?"#98a6bf":"#dbe9ff",cursor:a.nextStatus===null?"not-allowed":"pointer"},children:a.nextStatus===null?"Closed":`Move to ${a.nextStageLabel??"next stage"}`})]})]},a.id)})})]},n.key)})})]})]})}ie.__docgenInfo={description:"",methods:[],displayName:"IncomingSubmissionsPage"};const ur=t.div`
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, rgba(75, 142, 255, 0.14), transparent 32%),
    linear-gradient(180deg, #071129 0%, #0b1326 46%, #091022 100%);
  color: #dae2fd;
`,gr=t.div`
  min-height: 100vh;
  min-width: 0;
  transition: margin-left 220ms ease;

  @media (min-width: 1024px) {
    margin-left: ${({$sidebarOpen:r})=>r?"18rem":"0"};
  }
`,br=t.main`
  min-height: calc(100vh - 4rem);
  padding: 1.25rem 1rem 2rem;

  @media (min-width: 640px) {
    padding: 1.5rem 1.5rem 2.5rem;
  }

  @media (min-width: 1024px) {
    padding: 1.5rem 2rem 2.5rem;
  }
`,xr=t.button`
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
`,E=g.createContext({isAuthenticated:!1,user:null}),fr=[{id:"/",label:"Home",icon:"H"},{id:"/investors",label:"Investors",icon:"INV"},{id:"/claims",label:"Claims",icon:"CLM"},{id:"/underwriting/submissions",label:"Incoming Submissions",icon:"SUB"},{id:"/marketplace",label:"Marketplace",icon:"MKT"},{id:"/admin",label:"Admin",icon:"ADM"},{id:"/insurer",label:"Insurer",icon:"INS",subItems:[{id:"/insurer",label:"Dashboard",icon:"DB"},{id:"/insurer/coverage/create",label:"Create Coverage",icon:"CR"},{id:"/insurer/coverage-active",label:"Active Coverage",icon:"AC"},{id:"/insurer/pipeline-ingestion",label:"Pipeline Ingestion",icon:"PL"},{id:"/insurer/reports",label:"Reports",icon:"RP"},{id:"/insurer/settings",label:"Settings",icon:"ST"},{id:"/insurer/claims",label:"Claims",icon:"CL"}]}];function Q(r){return r==="/"?"/":r.replace(/\/+$/g,"")}function hr(r,o){const s=Q(r),c=Q(o);return c==="/"?s==="/":s===c||s.startsWith(`${c}/`)}function ae(r,o){return r.map(s=>{const c=s.subItems?ae(s.subItems,o):void 0,x=!!(c!=null&&c.some(v=>v.active)),h=hr(o,s.id)||x;return{...s,active:h,subItems:c}})}function jr(){return g.useContext(E)}function vr(){const{user:r,loading:o}=te();return console.log("HomeRoute render",{user:r,loading:o}),o?null:r?e.jsx(E.Provider,{value:{isAuthenticated:!0,user:r},children:e.jsx(se,{children:e.jsx(re,{})})}):e.jsx(we,{})}function yr(){const r=ee(),{user:o,loading:s}=te();return s?null:o?(console.log("RequireBackendAuth authenticated user",o),e.jsx(E.Provider,{value:{isAuthenticated:!0,user:o},children:e.jsx(C,{})})):(console.log("RequireBackendAuth redirecting to / from",r.pathname),e.jsx(Z,{to:"/",replace:!0,state:{from:r.pathname}}))}function se({children:r}={}){const{user:o}=jr(),s=ee(),[c,x]=g.useState(()=>typeof window<"u"?window.matchMedia("(min-width: 1024px)").matches:!0),h=s.pathname,v=g.useMemo(()=>ae(fr,h),[h]),y=o&&([o.firstName,o.lastName].filter(Boolean).join(" ").trim()||o.email)||"Authenticated session",L=o!=null&&o.role?`${o.role} | ${y}`:y;return g.useEffect(()=>{if(typeof window>"u")return;const j=()=>{x(window.innerWidth>=1024)};return j(),window.addEventListener("resize",j),()=>window.removeEventListener("resize",j)},[]),e.jsxs(ur,{children:[e.jsx(xr,{type:"button","aria-label":"Close navigation menu",onClick:()=>x(!1),$isVisible:c}),e.jsx(me,{isSidebarOpen:c,onToggleSidebar:()=>x(j=>!j)}),e.jsx(ue,{items:v,title:"Ensured Marketplace",subtitle:L,isOpen:c,onRequestClose:()=>x(!1)}),e.jsx(gr,{$sidebarOpen:c,children:e.jsx(br,{children:r??e.jsx(C,{})})})]})}function P(){return e.jsxs(ce,{children:[e.jsx(i,{path:"/",element:e.jsx(vr,{})}),e.jsx(i,{element:e.jsx(yr,{}),children:e.jsxs(i,{element:e.jsx(se,{}),children:[e.jsx(i,{path:"/claims/*",element:e.jsx(D,{})}),e.jsx(i,{path:"/investors/*",element:e.jsx(ge,{})}),e.jsx(i,{path:"/underwriting/submissions",element:e.jsx(ie,{})}),e.jsx(i,{path:"/marketplace",element:e.jsx(pe,{})}),e.jsx(i,{path:"/admin",element:e.jsx(be,{})}),e.jsxs(i,{path:"/insurer",element:e.jsx(C,{}),children:[e.jsx(i,{index:!0,element:e.jsx(T,{})}),e.jsx(i,{path:"dashboard",element:e.jsx(T,{})}),e.jsxs(i,{path:"risk",element:e.jsx(C,{}),children:[e.jsx(i,{index:!0,element:e.jsx(f,{})}),e.jsx(i,{path:"upload",element:e.jsx(f,{})}),e.jsx(i,{path:"history",element:e.jsx(f,{})}),e.jsx(i,{path:"validation",element:e.jsx(f,{})})]}),e.jsx(i,{path:"portfolio",element:e.jsx(T,{})}),e.jsxs(i,{path:"coverage",element:e.jsx(C,{}),children:[e.jsx(i,{index:!0,element:e.jsx(f,{})}),e.jsx(i,{path:"create",element:e.jsx(f,{})}),e.jsx(i,{path:"simulate",element:e.jsx(f,{})}),e.jsx(i,{path:"pricing",element:e.jsx(f,{})})]}),e.jsx(i,{path:"coverage-active",element:e.jsx(fe,{})}),e.jsx(i,{path:"reports",element:e.jsx(he,{})}),e.jsx(i,{path:"pipeline-ingestion",element:e.jsx(ve,{})}),e.jsx(i,{path:"pipeline-ingestion/rabbitmq",element:e.jsx(H,{})}),e.jsx(i,{path:"pipeline-ingestion/rabbitmq/:channelId",element:e.jsx(H,{})}),e.jsx(i,{path:"pipeline-ingestion/rabbitmq/:channelId/queue/:queueName",element:e.jsx(ye,{})}),e.jsx(i,{path:"pipeline-ingestion/email-sso",element:e.jsx(O,{})}),e.jsx(i,{path:"pipeline-ingestion/email-sso/:channelId",element:e.jsx(O,{})}),e.jsx(i,{path:"pipeline-ingestion/cloud-storage",element:e.jsx(q,{})}),e.jsx(i,{path:"pipeline-ingestion/cloud-storage/:channelId",element:e.jsx(q,{})}),e.jsx(i,{path:"pipeline-ingestion/sftp",element:e.jsx(V,{})}),e.jsx(i,{path:"pipeline-ingestion/sftp/:channelId",element:e.jsx(V,{})}),e.jsx(i,{path:"pipeline-ingestion/webhooks",element:e.jsx(_,{})}),e.jsx(i,{path:"pipeline-ingestion/webhooks/:channelId",element:e.jsx(_,{})}),e.jsx(i,{path:"settings",element:e.jsx(je,{})}),e.jsx(i,{path:"claims",element:e.jsx(D,{})}),e.jsx(i,{path:"*",element:e.jsx(Z,{to:"/insurer",replace:!0})})]}),e.jsx(i,{path:"*",element:e.jsx(re,{})})]})})]})}P.__docgenInfo={description:"",methods:[],displayName:"AppRoutes"};const wr={path:"/",useStoryElement:!0,children:[{path:"*"}]},mt={title:"App/Full Application",component:P,parameters:{layout:"fullscreen"}},R={render:()=>e.jsx(P,{}),parameters:{reactRouter:ke({location:{path:"/"},routing:wr})}};var Y,J,X;R.parameters={...R.parameters,docs:{...(Y=R.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  render: () => <AppRoutes />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/'
      },
      routing: fullApplicationRouting
    })
  }
}`,...(X=(J=R.parameters)==null?void 0:J.docs)==null?void 0:X.source}}};const ut=["FullApplication"];export{R as FullApplication,ut as __namedExportsOrder,mt as default};
