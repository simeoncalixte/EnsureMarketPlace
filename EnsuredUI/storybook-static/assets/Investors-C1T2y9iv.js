import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{R as d,r as i}from"./index-B3TfwC44.js";import{y as n}from"./styled-components.browser.esm-BtVlB3rV.js";import{S as v}from"./StatCard-CXDKjfmy.js";import{M as B}from"./MapPanel-abNWxh0b.js";import{D as M}from"./DataTable-BDOIBFaJ.js";const C=n.div`
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  color: #dae2fd;
  background: #0b1326;
`;n.nav`
  position: fixed; top: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 1.5rem; height: 4rem; z-index:50;
  background: rgba(11,19,38,0.6); backdrop-filter: blur(12px);
`;n.div`
  display:flex; align-items:center; gap:1rem;
  .title { font-weight:800; color:#dae2fd; font-size:1.125rem; }
  a { color:#4b8eff; font-weight:700; text-decoration:none; margin-right:1rem }
`;n.div`
  display:flex; align-items:center; gap:0.75rem;
  .search { background: rgba(33,39,61,0.9); padding:0.375rem 0.75rem; border-radius:6px; display:flex; align-items:center; gap:0.5rem; border:1px solid rgba(65,71,85,0.15); }
  input { background:transparent; border:0; outline:0; color:inherit; width:12rem }
  button { background:transparent; border:0; color:#9aa3bb; padding:0.375rem; border-radius:6px }
  img { width:2rem; height:2rem; border-radius:999px; object-fit:cover }
`;n.aside`
  position: fixed; left:0; top:0; bottom:0; width:16rem; padding-top:5rem; background:#0b1326; border-right:1px solid rgba(65,71,85,0.15);
  display:flex; flex-direction:column; gap:1rem; padding-left:1.5rem; padding-right:1rem;
  .brand { margin-bottom:1rem }
  nav a { display:flex; align-items:center; gap:0.75rem; padding:0.75rem; color:#9aa3bb; border-left:0; text-decoration:none }
  nav a.active { background:#171f33; color:#4b8eff; border-left:4px solid #4b8eff }
`;const L=n.main`
  width: 100%;
  padding: 0;
  min-height: auto;
`;n.div`
  max-width:1100px; margin:0 auto; display:block; gap:1.5rem;
`;const O=n.header`
  display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:1rem;
  h1 { font-size:2rem; margin:0 }
`,I=n.section`
  background: #0f1724; border-radius:8px; border:1px solid rgba(65,71,85,0.08); overflow:hidden;
`,z=n.div`
  overflow-x:auto;
  table { width:100%; border-collapse:collapse; color:inherit }
  thead { background:#0b1220; color:#9aa3bb; font-size:0.625rem; text-transform:uppercase; letter-spacing:0.12em }
  th, td { padding:0.75rem 1rem; text-align:left; border-bottom:1px solid rgba(65,71,85,0.05) }
  tbody tr:hover { background:#111428 }
  .mono { font-family: 'JetBrains Mono', monospace }
`,H=n.footer`
  position: fixed; left:0; right:0; bottom:0; height:2rem; display:flex; align-items:center; justify-content:space-between; padding:0 1rem; background:#131b2e; border-top:1px solid rgba(65,71,85,0.15); color:#9aa3bb; font-size:0.75rem;
`;function b(r){return`$${new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.max(0,r))}`}const W=d.memo(function(){return e.jsx(e.Fragment,{})}),E=d.memo(function({investorName:t}){return e.jsxs(O,{children:[e.jsxs("div",{children:[e.jsx("h1",{children:"Investor Dashboard"}),e.jsxs("p",{style:{color:"#9aa3bb",margin:0},children:["Portfolio overview for ",t,". Monitoring live exposure across investor-applicable tranches."]})]}),e.jsxs("div",{style:{display:"flex",gap:"0.5rem"},children:[e.jsx("button",{style:{background:"#4b8eff",color:"#fff",padding:"0.5rem 1rem",borderRadius:6,fontWeight:700},children:"Allocate Capital"}),e.jsx("button",{style:{background:"transparent",color:"#9aa3bb",padding:"0.5rem 1rem",borderRadius:6,border:"1px solid rgba(65,71,85,0.12)"},children:"Generate Report"})]})]})}),D=d.memo(function({summary:t}){return e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:20,marginBottom:20},children:[e.jsx(v,{label:"Total Portfolio Value",value:b(t.totalInvested),delta:`${t.activePositions} active positions`}),e.jsx(v,{label:"Total Capital Available",value:b(t.totalAvailable),delta:`${t.availableDeals} available deals`}),e.jsx(v,{label:"Projected Annual Return",value:b(t.projectedAnnualReturn),delta:`${t.blendedIrr.toFixed(2)}% blended`}),e.jsx(v,{label:"Blended IRR",value:`${t.blendedIrr.toFixed(2)}%`,delta:`${t.liveTranches} live tranches`})]})}),q=d.memo(function({summary:t}){return e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"2fr 1fr",gap:20,marginBottom:20},children:[e.jsx(B,{title:"Active Exposure Map",stats:[{label:"INVESTOR TVL",value:b(t.totalInvested)},{label:"ACTIVE TRANCHES",value:String(t.liveTranches)}]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsxs(I,{style:{padding:16},children:[e.jsx("div",{style:{fontSize:12,fontWeight:800,color:"#ffb3ad"},children:"Capital At Risk"}),e.jsx("div",{style:{fontSize:28,fontWeight:800,marginTop:8},children:b(t.capitalAtRisk)}),e.jsx("div",{style:{color:"#9aa3bb",marginTop:8},children:"Backend-calculated committed capital across active investor positions."})]}),e.jsxs(I,{style:{padding:0},children:[e.jsxs("div",{style:{padding:12,borderBottom:"1px solid rgba(65,71,85,0.06)",display:"flex",justifyContent:"space-between"},children:[e.jsx("div",{style:{fontWeight:700},children:"Live Risk Feed"}),e.jsx("div",{style:{width:8,height:8,borderRadius:999,background:"#ffb3ad"}})]}),e.jsxs("div",{style:{padding:12},children:[e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:11,color:"#9aa3bb"},children:"12:42 UTC | NOAA-EVENT-422"}),e.jsx("div",{style:{color:"#dae2fd"},children:"Hurricane Milton upgraded to Category 4. Landfall projected T-18hrs Tampa Bay."})]}),e.jsxs("div",{style:{marginBottom:12},children:[e.jsx("div",{style:{fontSize:11,color:"#9aa3bb"},children:"11:15 UTC | RECON-DELTA"}),e.jsx("div",{style:{color:"#dae2fd"},children:"Secondary tranches in SE Region fully subscribed. Total TVL increase +$240k."})]})]})]})]})]})}),_=d.memo(function({rows:t}){return e.jsxs(I,{children:[e.jsxs("div",{style:{padding:16,borderBottom:"1px solid rgba(65,71,85,0.08)",display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("h3",{style:{margin:0},children:"Active Allocations"}),e.jsx("button",{style:{color:"#4b8eff",fontSize:"0.75rem",fontWeight:700},children:"View All Deals"})]}),e.jsx(z,{children:e.jsx(M,{rows:t})})]})}),$=d.memo(function(){return e.jsxs(H,{children:[e.jsx("div",{children:"Hurricane Milton: Cat 4 approaching Florida... | Global TVL: $4.2B | Active Tranches: 142"}),e.jsxs("div",{children:[e.jsx("a",{style:{color:"#9aa3bb",marginRight:"1rem"},href:"#",children:"Network Status"}),e.jsx("a",{style:{color:"#9aa3bb",marginRight:"1rem"},href:"#",children:"Risk Feed"}),e.jsx("a",{style:{color:"#9aa3bb"},href:"#",children:"Documentation"})]})]})});W.__docgenInfo={description:"",methods:[],displayName:"InvestorNavigationSection"};E.__docgenInfo={description:"",methods:[],displayName:"InvestorHeaderSection",props:{investorName:{required:!0,tsType:{name:"string"},description:""}}};D.__docgenInfo={description:"",methods:[],displayName:"InvestorSummaryStatsSection",props:{summary:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  totalInvested: number;
  totalAvailable: number;
  activePositions: number;
  availableDeals: number;
  blendedIrr: number;
  projectedAnnualReturn: number;
  capitalAtRisk: number;
  liveTranches: number;
}`,signature:{properties:[{key:"totalInvested",value:{name:"number",required:!0}},{key:"totalAvailable",value:{name:"number",required:!0}},{key:"activePositions",value:{name:"number",required:!0}},{key:"availableDeals",value:{name:"number",required:!0}},{key:"blendedIrr",value:{name:"number",required:!0}},{key:"projectedAnnualReturn",value:{name:"number",required:!0}},{key:"capitalAtRisk",value:{name:"number",required:!0}},{key:"liveTranches",value:{name:"number",required:!0}}]}},description:""}}};q.__docgenInfo={description:"",methods:[],displayName:"InvestorExposureSection",props:{summary:{required:!0,tsType:{name:"signature",type:"object",raw:`{
  totalInvested: number;
  totalAvailable: number;
  activePositions: number;
  availableDeals: number;
  blendedIrr: number;
  projectedAnnualReturn: number;
  capitalAtRisk: number;
  liveTranches: number;
}`,signature:{properties:[{key:"totalInvested",value:{name:"number",required:!0}},{key:"totalAvailable",value:{name:"number",required:!0}},{key:"activePositions",value:{name:"number",required:!0}},{key:"availableDeals",value:{name:"number",required:!0}},{key:"blendedIrr",value:{name:"number",required:!0}},{key:"projectedAnnualReturn",value:{name:"number",required:!0}},{key:"capitalAtRisk",value:{name:"number",required:!0}},{key:"liveTranches",value:{name:"number",required:!0}}]}},description:""}}};_.__docgenInfo={description:"",methods:[],displayName:"InvestorAllocationsSection",props:{rows:{required:!0,tsType:{name:"Array",elements:[{name:"signature",type:"object",raw:"{ id: string; tranche: string; value: string; status: string; statusVariant?: 'secondary' | 'primary' | 'error' }",signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"tranche",value:{name:"string",required:!0}},{key:"value",value:{name:"string",required:!0}},{key:"status",value:{name:"string",required:!0}},{key:"statusVariant",value:{name:"union",raw:"'secondary' | 'primary' | 'error'",elements:[{name:"literal",value:"'secondary'"},{name:"literal",value:"'primary'"},{name:"literal",value:"'error'"}],required:!1}}]}}],raw:"DataRow[]"},description:""}}};$.__docgenInfo={description:"",methods:[],displayName:"InvestorFooterSection"};const y={};function G(){const r=typeof window<"u"&&(window.__VITE_API_BASE||window.VITE_API_BASE)||"http://localhost:3001",t=r.indexOf("http"),o=r.lastIndexOf("http");let u=r;return o>t&&(u=r.slice(o)),u.replace(/\/+$/g,"")}function Y(){if(typeof window<"u"){const t=new URLSearchParams(window.location.search).get("investorUserId");if(t&&Number.isFinite(Number(t))&&Number(t)>0)return Number(t);const o=window.__INVESTOR_USER_ID??window.VITE_INVESTOR_USER_ID;if(o&&Number.isFinite(Number(o))&&Number(o)>0)return Number(o)}const r=y==null?void 0:y.VITE_INVESTOR_USER_ID;return r&&Number.isFinite(Number(r))&&Number(r)>0?Number(r):null}function J(r){return`$${new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.max(0,r))}`}const x={totalInvested:0,totalAvailable:0,activePositions:0,availableDeals:0,blendedIrr:0,projectedAnnualReturn:0,capitalAtRisk:0,liveTranches:0};function Q(){const[r,t]=i.useState(null),[o,u]=i.useState([]),[j,S]=i.useState(x),[f,A]=i.useState([]),[w,R]=i.useState(!0),[g,k]=i.useState(null);i.useEffect(()=>{let c=!0;async function F(){R(!0),k(null);try{const m=G(),N=a=>m?`${m}${a}`:a;let l=Y();if(!l){const a=await fetch(N("/api/investors/default"));if(!a.ok)throw new Error(`Unable to resolve an investor (status ${a.status})`);const p=await a.json();if(l=Number((p==null?void 0:p.investorUserId)??0),!c)return;t(p)}if(!l||!Number.isFinite(l))throw new Error("No valid investor user id available");r||t({investorUserId:l,investorProfileId:0});const h=await fetch(N(`/api/investors/${l}/dashboard`));if(!h.ok)throw new Error(`Unable to load investor dashboard (status ${h.status})`);const s=await h.json(),T=Array.isArray(s==null?void 0:s.deals)?s.deals:[],U=T.map(a=>({id:`#D${a.dealId}-T${a.trancheId}`,tranche:`${a.dealName} / ${a.trancheName}`,value:J(a.investorCommittedAmount>0?a.investorCommittedAmount:a.pendingAmount),status:a.status==="active"?"ACTIVE":"AVAILABLE",statusVariant:a.status==="active"?"secondary":"primary"}));if(!c)return;u(T),S((s==null?void 0:s.summary)??x),A(U)}catch(m){if(!c)return;u([]),S(x),A([]),k(String(m.message??m))}finally{c&&R(!1)}}return F(),()=>{c=!1}},[]);const V=i.useMemo(()=>w?[{id:"#LOADING",tranche:"Loading investor deals...",value:"---",status:"PENDING",statusVariant:"primary"}]:g?[{id:"#ERROR",tranche:g,value:"---",status:"ERROR",statusVariant:"error"}]:f.length===0?[{id:"#EMPTY",tranche:"No active investor deals found",value:"---",status:"PENDING",statusVariant:"primary"}]:f,[f,g,w]),P=i.useMemo(()=>r!=null&&r.firstName||r!=null&&r.lastName?`${(r==null?void 0:r.firstName)??""} ${(r==null?void 0:r.lastName)??""}`.trim():r!=null&&r.investorUserId?`Investor #${r.investorUserId}`:"Investor",[r]);return e.jsxs(C,{children:[e.jsxs(L,{children:[e.jsx(E,{investorName:P}),e.jsx(D,{summary:j}),e.jsx(q,{summary:j}),e.jsx(_,{rows:V})]}),e.jsx($,{})]})}Q.__docgenInfo={description:"",methods:[],displayName:"InvestorsPage"};export{Q as I};
