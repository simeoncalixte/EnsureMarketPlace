import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as d}from"./index-B3TfwC44.js";import{u as M}from"./chunk-OE4NN4TA-D-lI_iOm.js";import{y as i}from"./styled-components.browser.esm-BtVlB3rV.js";const B=i.div`
  background: ${n=>n.$elevated?"#2d3449":"#171f33"};
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: border-color 0.2s;
`,x=({elevated:n=!1,children:r,...s})=>e.jsx(B,{$elevated:n,...s,children:r});x.__docgenInfo={description:"",methods:[],displayName:"Card",props:{elevated:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},style:{required:!1,tsType:{name:"ReactCSSProperties",raw:"React.CSSProperties"},description:""}}};const O=i.div`
  display: grid;
  gap: 6px;
`,U=i.label`
  display: block;
  font-size: 12px;
  color: #8b90a0;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: 'JetBrains Mono', monospace;
`,V=i.input`
  background: transparent;
  border: 0;
  border-bottom: 1px solid #414755;
  padding: 8px 6px;
  color: #dae2fd;
  outline: none;
  font-size: 14px;
  
  &:focus {
    border-bottom-color: #4b8eff;
  }
  
  &::placeholder {
    color: #8b90a0;
  }
`,y=({label:n,error:r,id:s,...p})=>{const o=s||`field-${Math.random().toString(36).slice(2,9)}`;return e.jsxs(O,{children:[n&&e.jsx(U,{htmlFor:o,children:n}),e.jsx(V,{id:o,...p}),r&&e.jsx("div",{style:{color:"#ff8b8b",fontSize:"12px",marginTop:"4px"},children:r})]})};y.__docgenInfo={description:"",methods:[],displayName:"FormField",props:{label:{required:!1,tsType:{name:"string"},description:""},error:{required:!1,tsType:{name:"string"},description:""}}};const G=i.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`,$=i.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`,W=i.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,H=i.h3`
  margin: 0;
  font-family: Manrope, sans-serif;
  font-weight: 800;
  font-size: 16px;
  color: #dae2fd;
`,_=i.p`
  margin: 0;
  font-size: 12px;
  color: #8b90a0;
`,C=({icon:n,title:r,subtitle:s})=>e.jsxs(G,{children:[n&&e.jsx($,{children:n}),e.jsxs(W,{children:[e.jsx(H,{children:r}),s&&e.jsx(_,{children:s})]})]});C.__docgenInfo={description:"",methods:[],displayName:"SectionHeader",props:{icon:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},title:{required:!0,tsType:{name:"string"},description:""},subtitle:{required:!1,tsType:{name:"string"},description:""}}};const Y=i.div`
  background: rgba(11, 19, 38, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  transition: border-color 0.2s;
  
  &:hover {
    border-color: rgba(75, 142, 255, 0.3);
  }
`,K=i.div`
  flex: 1;
`,J=i.div`
  font-weight: 700;
  font-size: 14px;
  color: #dae2fd;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
`,Q=i.div`
  font-size: 12px;
  color: #8b90a0;
`,X=i.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
`,I=i.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${n=>n.$variant==="verified"||n.$variant==="uploaded"?"rgba(16, 185, 129, 0.12)":"rgba(75, 142, 255, 0.12)"};
  color: ${n=>n.$variant==="verified"||n.$variant==="uploaded"?"#10b981":"#4b8eff"};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 3px 8px;
  border-radius: 4px;
`,Z=i.span`
  font-size: 10px;
  font-weight: 700;
  color: #8b90a0;
  letter-spacing: 0.04em;
`,w=i.span`
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: #8b90a0;
`,S=i.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(75, 142, 255, 0.1);
  color: #4b8eff;
  border: 1px solid rgba(75, 142, 255, 0.2);
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #4b8eff;
    color: #fff;
  }
`,A=i.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`,D=({title:n,description:r,docStatus:s="required",uploaded:p,uploadedFilename:o,onUpload:u,onView:v,ariaLabel:f})=>{const m=s==="verified",g=s==="optional";return e.jsxs(Y,{children:[e.jsxs(K,{children:[e.jsxs(J,{children:[n,m&&e.jsx(I,{$variant:"verified",children:"✓ Verified"}),p&&!m&&e.jsx(I,{$variant:"uploaded",children:"✓ Uploaded"})]}),e.jsx(Q,{children:r})]}),e.jsx(X,{children:m?e.jsxs(e.Fragment,{children:[e.jsx(w,{children:o}),e.jsx("button",{style:{background:"none",border:0,color:"#8b90a0",cursor:"pointer",padding:4},onClick:v,title:"View document",type:"button",children:"👁"})]}):g?e.jsxs(e.Fragment,{children:[e.jsx(Z,{children:"Optional"}),e.jsxs("label",{style:{display:"inline-flex"},children:[e.jsx(A,{"aria-label":f||`Upload ${n}`,type:"file",onChange:u}),e.jsx(S,{as:"span",children:"↑ Upload"})]}),o&&e.jsx(w,{children:o})]}):e.jsxs(e.Fragment,{children:[e.jsxs("label",{style:{display:"inline-flex"},children:[e.jsx(A,{"aria-label":f||`Upload ${n}`,type:"file",onChange:u}),e.jsx(S,{as:"span",children:"↑ Upload"})]}),o&&e.jsx(w,{children:o})]})})]})};D.__docgenInfo={description:"",methods:[],displayName:"DocumentRow",props:{title:{required:!0,tsType:{name:"string"},description:""},description:{required:!0,tsType:{name:"string"},description:""},docStatus:{required:!1,tsType:{name:"union",raw:"'required' | 'optional' | 'verified'",elements:[{name:"literal",value:"'required'"},{name:"literal",value:"'optional'"},{name:"literal",value:"'verified'"}]},description:"",defaultValue:{value:"'required'",computed:!1}},uploaded:{required:!0,tsType:{name:"boolean"},description:""},uploadedFilename:{required:!1,tsType:{name:"string"},description:""},onUpload:{required:!1,tsType:{name:"signature",type:"function",raw:"(e: React.ChangeEvent<HTMLInputElement>) => void",signature:{arguments:[{type:{name:"ReactChangeEvent",raw:"React.ChangeEvent<HTMLInputElement>",elements:[{name:"HTMLInputElement"}]},name:"e"}],return:{name:"void"}}},description:""},onView:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},ariaLabel:{required:!1,tsType:{name:"string"},description:""}}};const ee=i.h1`
  font-family: Manrope, sans-serif;
  font-weight: 800;
  font-size: 32px;
  color: #dae2fd;
  margin: 0 0 8px 0;
`,ie=i.p`
  color: #c1c6d7;
  max-width: 720px;
  margin: 0 0 24px 0;
  font-size: 14px;
`,l=i.p`
  color: #c1c6d7;
  font-size: 12px;
  margin: 0;
`,te=i.h4`
  margin: 14px 0 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8b90a0;
  font-family: 'JetBrains Mono', monospace;
`;i.ul`
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
`;i.li`
  color: #dae2fd;
  font-size: 14px;
`;const ne=i.div`
  margin-top: 12px;
  color: #ff8b8b;
  font-size: 12px;
`,re=i.main`
  display: flex;
  min-height: 100vh;
  background: #0b1326;
  color: #dae2fd;
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
`,se=i.section`
  width: 100%;
`,ae=i.header`
  background: #0b1326;
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`,oe=i.div`
  padding: 32px;
  max-width: 1120px;
  margin: 0 auto;
`,de=i.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1024px) {
    grid-template-columns: 7fr 5fr;
  }
`,le=i.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
`,ce=i.div`
  display: flex;
  align-items: center;
  gap: 24px;
`,pe=i.div`
  font-family: Manrope, sans-serif;
  font-weight: 800;
  color: #adc6ff;
`,ue=i.button`
  padding: 8px 12px;
  background: #4b8eff;
  color: #fff;
  border-radius: 8px;
  border: 0;
  cursor: pointer;
`,fe=i.div`
  display: grid;
  gap: 12px;
`,me=i.div`
  background: rgba(11, 19, 38, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`,k=i.span`
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
`,ge=i.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`,xe=i.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  border-radius: 12px;
  background: #2d3449;
`,he=i.footer`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(65, 71, 85, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`,be=i.button`
  background: linear-gradient(135deg, #4b8eff, #adc6ff);
  color: #00285c;
  padding: 12px 28px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
`,ye=i.div`
  background: rgba(75, 142, 255, 0.15);
  color: #4b8eff;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
`,T={institutional:{label:"Institutional Investor",subtitle:"Investor onboarding requires identity, accredited verification, and AML controls.",documents:[{name:"Government-issued ID",description:"Valid International Passport or Government Driver’s License.",status:"verified",filename:"passport_scan_v1.pdf"},{name:"Proof of Address",description:"Utility bill, bank statement, or official correspondence (last 3 months).",status:"required"},{name:"Articles of Incorporation",description:"Official legal document establishing your business entity.",status:"required"},{name:"EIN Confirmation Letter",description:"IRS CP 575 or 147C notification letter.",status:"required"},{name:"Operating Agreement",description:"Key governing document for the entity’s management.",status:"required"},{name:"Certificate of Good Standing",description:"Recent certificate from the Secretary of State or equivalent.",status:"required"},{name:"CPA or Attorney Accredited Investor Letter",description:"Verification of accredited investor status from a licensed professional.",status:"required"},{name:"Beneficial Ownership Information (UBO)",description:"Full breakdown of ownership structure and individual beneficiaries.",status:"required"}],checks:["OFAC screening","PEP list screening","Sanctions database screening"],livenessNote:"Required for natural persons and beneficial owners over threshold."},insurer:{label:"Insurer / MGA",subtitle:"Carrier onboarding focuses on regulatory authorization and operational standing.",documents:[{name:"Government-issued ID",description:"Valid ID for authorized signatory of the entity.",status:"required"},{name:"Proof of Address",description:"Address verification for the authorized signer.",status:"required"},{name:"Certificate of Incorporation",description:"Corporate charter or entity formation document.",status:"required"},{name:"NAIC Number Verification",description:"National Association of Insurance Commissioners registration number.",status:"required"},{name:"Certificate of Good Standing",description:"State-issued certificate confirming active entity status.",status:"required"},{name:"State Insurance Licenses & DOI Registration",description:"Active licenses and Department of Insurance registration records.",status:"required"},{name:"Regulatory Filings",description:"Recent statutory filings and financial exhibits.",status:"required"},{name:"Proof of Reinsurance",description:"Documentation of existing reinsurance arrangements.",status:"optional"},{name:"A.M. Best or Demotech Rating Report",description:"Financial strength rating from a recognized rating agency.",status:"optional"}],checks:["Regulatory status verification with state DOI","OFAC screening","Sanctions database screening"],livenessNote:"Required for authorized representatives and beneficial owners over threshold."},underwriter:{label:"Reinsurer / Underwriting Entity",subtitle:"Reinsurance entities require financial strength and corporate compliance validation.",documents:[{name:"Government-issued ID",description:"Valid ID for the compliance officer or authorized representative.",status:"required"},{name:"Incorporation Documents",description:"Legal formation documents for the underwriting entity.",status:"required"},{name:"Regulatory Registration",description:"Evidence of registration with applicable regulatory bodies.",status:"required"},{name:"Financial Statements",description:"Audited annual financial statements for the past 2 years.",status:"required"},{name:"Rating Agency Report",description:"S&P, Moody’s, or Fitch Ratings financial strength report.",status:"required"},{name:"UBO Disclosure & AML/KYC Review Package",description:"Beneficial ownership disclosure and AML compliance review documentation.",status:"required"},{name:"Corporate Governance Documents",description:"Board resolutions, articles, and entity control documents.",status:"optional"}],checks:["OFAC screening","PEP list screening","Sanctions database screening"],livenessNote:"Required for authorized representatives and beneficial owners over threshold."},claims:{label:"Claims Handler / Adjuster",subtitle:"Adjuster workflows require license validation and authority checks.",documents:[{name:"Government-issued ID",description:"Valid government-issued identification document.",status:"required"},{name:"Adjuster License & State Certification",description:"State-issued adjuster license and certification document.",status:"required"},{name:"License Number & Validity Proof",description:"Evidence of current license number and expiration date.",status:"required"},{name:"Employment Verification",description:"Employer letter or carrier appointment confirmation.",status:"required"},{name:"Independent Adjuster Agreement",description:"Signed agreement if operating as an independent adjuster.",status:"optional"},{name:"E&O Insurance Certificate",description:"Errors and omissions insurance certificate.",status:"optional"},{name:"W-9 & FEMA Certifications",description:"Required for catastrophe or federal disaster response work.",status:"optional"}],checks:["License status lookup in state DOI database","Sanctions screening"],livenessNote:"Required for licensed professionals and public adjuster scrutiny controls."},broker:{label:"Insurance Agent / Broker",subtitle:"Producer onboarding needs identity, license, authority, and carrier appointment proof.",documents:[{name:"Government-issued ID",description:"Valid government-issued identification document.",status:"required"},{name:"Producer License",description:"State-issued producer or broker license.",status:"required"},{name:"NPN (National Producer Number)",description:"NIPR-issued National Producer Number.",status:"required"},{name:"Appointment Letters",description:"Letters of appointment from authorized carriers.",status:"required"},{name:"Carrier Contracts",description:"Executed distribution and placement agreements.",status:"required"},{name:"Agency License",description:"Agency-level license if operating as a licensed agency.",status:"optional"},{name:"EIN Documentation",description:"Federal employer identification documentation for the agency.",status:"optional"}],checks:["License status verification","OFAC screening","Sanctions database screening"],livenessNote:"Required for producer identity assurance and fraud prevention."},admin:{label:"Platform Admin / UBO Review",subtitle:"Admin onboarding applies enhanced beneficial ownership and AML controls.",documents:[{name:"Government-issued ID",description:"Valid government-issued identification document.",status:"required"},{name:"Proof of Address",description:"Utility bill, bank statement, or official correspondence.",status:"required"},{name:"Ownership Structure Chart",description:"Organizational chart of all owners and beneficial parties.",status:"required"},{name:"IDs for Owners Above Threshold",description:"Government-issued IDs for all owners above the 25% beneficial ownership threshold.",status:"required"},{name:"Corporate Control Documents",description:"Articles, operating agreements, and board resolutions.",status:"required"},{name:"Signed Representation Agreements",description:"For public adjuster flows and authority representations (if applicable).",status:"optional"}],checks:["Enhanced AML/UBO review","OFAC screening","PEP list screening"],livenessNote:"Required for privileged access onboarding and beneficial owner validation."}},ve={label:"User",subtitle:"Provide baseline identity and compliance documentation.",documents:[{name:"Government-issued ID",description:"Valid government-issued identification document.",status:"required"},{name:"Proof of Address",description:"Utility bill, bank statement, or official correspondence.",status:"required"},{name:"AML/KYC Intake Form",description:"Completed AML and Know Your Customer intake form.",status:"required"}],checks:["OFAC screening","Sanctions database screening"],livenessNote:"Required for default onboarding policy."};function je(){const n=M(),[r,s]=d.useState(null),[p,o]=d.useState(""),[u,v]=d.useState(""),[f,m]=d.useState(""),[g,N]=d.useState({}),[j,P]=d.useState(!1),[q,h]=d.useState("");d.useEffect(()=>{const t=window.localStorage.getItem("registrationSession");if(t)try{const a=JSON.parse(t);a.selectedRole&&a.selectedRole in T&&s(a.selectedRole)}catch(a){console.error("Failed to parse registration session",a)}},[]);const c=d.useMemo(()=>r?T[r]:ve,[r]),F=d.useMemo(()=>c.documents.filter(t=>t.status==="required"),[c.documents]),z=(t,a)=>{var R;const b=(R=a.target.files)==null?void 0:R[0];b&&N(E=>({...E,[t]:b.name}))},L=()=>{const t=p.trim().length>0&&u.trim().length>0&&f.trim().length>0,a=F.filter(b=>!g[b.name]);if(!t){h("Complete all identity fields before continuing.");return}if(a.length>0){h("Upload all required verification documents before continuing.");return}if(!j){h("Complete liveness detection before continuing.");return}h(""),n("/auth/register/capital-profile")};return e.jsx(re,{children:e.jsxs(se,{children:[e.jsxs(ae,{children:[e.jsxs(ce,{children:[e.jsx(pe,{children:"Sovereign Re"}),e.jsx(ye,{children:c.label})]}),e.jsx("div",{children:e.jsx(ue,{children:"Institutional Login"})})]}),e.jsxs(oe,{children:[e.jsx(ee,{children:"Identity Verification"}),e.jsx(ie,{children:"To ensure the integrity of the Sovereign Re ecosystem and comply with global reinsurance regulations, please provide verified identification details."}),e.jsx(l,{style:{marginBottom:24},children:c.subtitle}),e.jsxs(de,{children:[e.jsxs("div",{children:[e.jsxs(x,{children:[e.jsx(C,{icon:"🔖",title:"Personal Identity",subtitle:"Core identity fields required for all applicants."}),e.jsxs("div",{style:{display:"grid",gap:12},children:[e.jsx("div",{style:{gridColumn:"1 / -1"},children:e.jsx(y,{label:"Legal Full Name",placeholder:"As it appears on your passport","aria-label":"Legal Full Name",value:p,onChange:t=>o(t.target.value)})}),e.jsxs(le,{children:[e.jsx("div",{children:e.jsx(y,{label:"Date of Birth",placeholder:"YYYY-MM-DD","aria-label":"Date of Birth",value:u,onChange:t=>v(t.target.value)})}),e.jsx("div",{children:e.jsx(y,{label:"Tax ID / SSN",placeholder:"••••-••-••••",type:"password","aria-label":"Tax ID / SSN",value:f,onChange:t=>m(t.target.value)})})]})]})]}),e.jsxs(x,{style:{marginTop:16},children:[e.jsx(C,{icon:"📋",title:"Verification & Document Submission",subtitle:"Provide required documentation for institutional verification."}),e.jsx(fe,{children:c.documents.map(t=>e.jsx(D,{title:t.name,description:t.description,docStatus:t.status,uploaded:!!g[t.name],uploadedFilename:g[t.name]||t.filename,onUpload:a=>z(t.name,a),ariaLabel:`Upload ${t.name}`},t.name))}),c.checks.length>0&&e.jsxs(e.Fragment,{children:[e.jsx(te,{children:"Compliance Checks"}),e.jsx("div",{style:{display:"grid",gap:8},children:c.checks.map(t=>e.jsxs(me,{children:[e.jsx("div",{style:{fontWeight:600,fontSize:13},children:t}),e.jsx(k,{style:{background:"rgba(75, 142, 255, 0.12)",color:"#adc6ff",borderRadius:4,padding:"3px 10px"},children:"Automated"})]},t))})]})]})]}),e.jsxs(ge,{children:[e.jsxs(x,{elevated:!0,children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},children:[e.jsx("h3",{style:{margin:0,fontFamily:"Manrope",fontWeight:800},children:"Liveness Detection"}),e.jsx(k,{style:{background:"#00a572",color:"#002113"},children:"Required"})]}),e.jsx(l,{style:{marginBottom:16},children:c.livenessNote}),e.jsxs(xe,{children:[e.jsxs("div",{style:{width:220,height:220,borderRadius:"50%",border:"4px dashed #414755",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"},children:[e.jsx("div",{style:{fontSize:48,opacity:.9},children:"🙂"}),e.jsx(l,{style:{textAlign:"center",padding:"0 16px"},children:"Center your face in the frame and ensure adequate lighting"})]}),e.jsx("button",{style:{padding:"8px 16px",background:"#4b8eff",color:"#001a41",borderRadius:999,border:0,fontWeight:800,cursor:"pointer"},onClick:()=>P(!0),type:"button",children:j?"Camera Verified":"Start Camera"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,width:"100%"},children:[e.jsxs("div",{style:{background:"#171f33",padding:12,borderRadius:8},children:[e.jsx(l,{children:"STATUS"}),e.jsx("div",{style:{fontWeight:700},children:j?"Completed":"Awaiting Input"})]}),e.jsxs("div",{style:{background:"#171f33",padding:12,borderRadius:8},children:[e.jsx(l,{children:"LATENCY"}),e.jsx("div",{style:{fontFamily:"JetBrains Mono",color:"#4edea3",fontWeight:700},children:"24ms"})]})]})]})]}),e.jsxs(x,{style:{padding:20},children:[e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"flex-start"},children:[e.jsx("div",{style:{color:"#4b8eff"},children:"🔐"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:700},children:"Military-Grade Security"}),e.jsx(l,{children:"All identity data is encrypted via AES-256 and stored in disconnected cold-vault environments."})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,marginTop:16,opacity:.6,justifyContent:"space-between"},children:[e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:40,height:40,borderRadius:40,border:"1px solid #8b90a0",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800},children:"GDPR"}),e.jsx(l,{style:{marginTop:6,display:"block"},children:"Compliant"})]}),e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:40,height:40,borderRadius:40,border:"1px solid #8b90a0",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800},children:"SOC2"}),e.jsx(l,{style:{marginTop:6,display:"block"},children:"Certified"})]}),e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:40,height:40,borderRadius:40,border:"1px solid #8b90a0",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800},children:"ISO"}),e.jsx(l,{style:{marginTop:6,display:"block"},children:"27001"})]})]})]})]})]}),e.jsxs(he,{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("div",{children:"←"}),e.jsx(l,{style:{color:"#c1c6d7"},children:"Previous Step"})]}),e.jsxs("div",{style:{display:"grid",justifyItems:"end"},children:[e.jsx(be,{onClick:L,type:"button",children:"Proceed to Capital Profiling →"}),q&&e.jsx(ne,{role:"alert",children:q})]})]})]})]})})}je.__docgenInfo={description:"",methods:[],displayName:"KYCVerification"};export{je as K};
