import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{y as t}from"./styled-components.browser.esm-BtVlB3rV.js";import{C as s}from"./Checkbox-DszoQXQ5.js";import"./index-B3TfwC44.js";import"./colors-BpeaZ3Jo.js";const b=t.main`
  padding-top: 6rem; /* pt-24 */
  padding-bottom: 3rem; /* pb-12 */
  min-height: 100vh;
  box-sizing: border-box;
  color: inherit;
`,f=t.div`
  margin: 0 auto;
`,j=t.header`
  margin-bottom: 3rem;
`,v=t.h1`
  font-family: Manrope, sans-serif;
  font-size: 3rem; /* text-5xl */
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.05;
`,k=t.p`
  color: rgba(193,198,215,0.9); /* text-on-surface-variant */
  font-size: 1.125rem; /* text-lg */
  max-width: 40rem;
  line-height: 1.4;
`,w=t.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 4rem;
`,i=t.div`
  height: 0.375rem; /* 1.5 */
  border-radius: 9999px;
  background: ${y=>{var m;return((m=y.theme)==null?void 0:m.primary)||"#adc6ff"}};
`,S=t(i)`
  background: rgba(23,31,51,1); /* surface-container-high */
`,I=t.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem; /* gap-6 */
`,B=t.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-column: span 7 / span 7;
  }
`,z=t.div`
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (min-width: 1024px) {
    grid-column: span 5 / span 5;
  }
`,n=t.section`
  background: #171f33; /* surface-container */
  padding: 2rem; /* p-8 */
  border-radius: 1rem; /* rounded-xl */
  position: relative;
  overflow: hidden;
`,p=t(n)`
  background: #131b2e; /* surface-container-low */
`,C=t(n)`
  background: #222a3d; /* surface-container-high */
`,g=t(n)`
  border: 1px solid rgba(65,71,85,0.15); /* border-outline-variant/15 */
`,a=t.h3`
  font-family: Manrope, sans-serif;
  font-size: 1.125rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`,_=t.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2rem;
`,o=t.label`
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(139,144,160,1); /* outline */
  margin-bottom: 0.5rem;
`,P=t.input`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #414755; /* border-outline-variant */
  padding: 0.5rem 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: inherit;
  outline: none;

  &::placeholder { opacity: 0.3; }
`,F=t.select`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #414755;
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: inherit;
  outline: none;
`,d=t.button`
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #414755;
  text-align: left;
  font-size: 0.875rem;
  background: transparent;
  cursor: pointer;
`,N=t(d)`
  border-color: #adc6ff; /* primary */
  background: rgba(75,142,255,0.06); /* primary-container/10 */
  color: #adc6ff;
  font-weight: 700;
`,l=t.div`
  padding: 1rem;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;t(n)`
  border: 1px solid rgba(65,71,85,0.1);
`;const T=t.footer`
  margin-top: 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(65,71,85,0.2);
  padding-top: 2rem;
`,W=t.button`
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #414755;
  background: transparent;
  color: inherit;
`,R=t.button`
  padding: 0.75rem 2.5rem;
  border-radius: 0.5rem;
  background: #adc6ff;
  color: #002e69; /* on-primary */
  font-weight: 700;
`,c=()=>e.jsx(b,{children:e.jsxs(f,{children:[e.jsxs(j,{children:[e.jsx(v,{children:"Institutional Allocation Strategy"}),e.jsx(k,{children:"Define your capital deployment parameters. This profile will calibrate the automated risk modeling and algorithmic tranche distribution."})]}),e.jsxs(w,{children:[e.jsx(i,{}),e.jsx(i,{}),e.jsx(i,{style:{boxShadow:"0 0 10px rgba(173,198,255,0.4)"}}),e.jsx(S,{})]}),e.jsxs(I,{children:[e.jsxs(B,{children:[e.jsxs(p,{children:[e.jsx("div",{style:{position:"absolute",top:0,left:0,width:4,height:"100%",background:"transparent"}}),e.jsxs(a,{children:[e.jsx("span",{className:"material-symbols-outlined text-primary",children:"gavel"}),"Entity Information"]}),e.jsxs(_,{children:[e.jsxs("div",{children:[e.jsx(o,{children:"Legal Entity Identifier (LEI)"}),e.jsx(P,{placeholder:"549300...",type:"text"})]}),e.jsxs("div",{children:[e.jsx(o,{children:"Tax Jurisdiction"}),e.jsxs(F,{children:[e.jsx("option",{value:"bermuda",children:"Bermuda (Class 4)"}),e.jsx("option",{value:"usa",children:"United States"}),e.jsx("option",{value:"uk",children:"United Kingdom (Lloyd's)"}),e.jsx("option",{value:"cayman",children:"Cayman Islands"})]})]})]}),e.jsxs("div",{style:{marginTop:"2rem"},children:[e.jsx(o,{children:"Primary Capital Source"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"0.75rem"},children:[e.jsx(d,{children:"Pension Fund"}),e.jsx(N,{children:"Sovereign Wealth"}),e.jsx(d,{children:"ILS Fund"})]})]})]}),e.jsxs(g,{children:[e.jsxs(a,{children:[e.jsx("span",{className:"material-symbols-outlined text-secondary",children:"assignment_turned_in"}),"Investment Mandate"]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[e.jsxs(l,{style:{background:"#131b2e",borderLeft:"4px solid #4edea3"},children:[e.jsxs("div",{children:[e.jsx("p",{style:{fontWeight:700,color:"#dae2fd"},children:"Yield Seeker"}),e.jsx("p",{style:{fontSize:"0.75rem",color:"rgba(218,226,253,0.8)"},children:"Targeting high-risk layers with 12-18% IRR expectations."})]}),e.jsx("span",{className:"material-symbols-outlined text-secondary",style:{fontVariationSettings:"'FILL' 1"},children:"radio_button_checked"})]}),e.jsxs(l,{style:{border:"1px solid rgba(65,71,85,0.3)",background:"transparent"},children:[e.jsxs("div",{children:[e.jsx("p",{style:{fontWeight:700,color:"rgba(218,226,253,0.7)"},children:"Diversified Exposure"}),e.jsx("p",{style:{fontSize:"0.75rem",color:"rgba(218,226,253,0.4)"},children:"Balanced risk profile across peak and non-peak zones."})]}),e.jsx("span",{className:"material-symbols-outlined text-outline",children:"radio_button_unchecked"})]}),e.jsxs(l,{style:{border:"1px solid rgba(65,71,85,0.3)",background:"transparent"},children:[e.jsxs("div",{children:[e.jsx("p",{style:{fontWeight:700,color:"rgba(218,226,253,0.7)"},children:"Conservative Protection"}),e.jsx("p",{style:{fontSize:"0.75rem",color:"rgba(218,226,253,0.4)"},children:"Senior layers with capital preservation priority."})]}),e.jsx("span",{className:"material-symbols-outlined text-outline",children:"radio_button_unchecked"})]})]})]})]}),e.jsxs(z,{children:[e.jsxs(p,{style:{border:"1px solid rgba(65,71,85,0.1)"},children:[e.jsxs(a,{children:[e.jsx("span",{className:"material-symbols-outlined text-tertiary",children:"category"}),"Asset Class Preference"]}),e.jsx("p",{style:{fontSize:"0.75rem",color:"rgba(193,198,215,0.9)",marginBottom:"1rem",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"'JetBrains Mono', monospace"},children:"Select multiple perils for the portfolio:"}),e.jsxs("div",{style:{display:"grid",gap:"0.5rem"},children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem",background:"#171f33",borderRadius:"0.5rem"},children:[e.jsxs("div",{style:{display:"flex",gap:"0.75rem",alignItems:"center"},children:[e.jsx("span",{className:"material-symbols-outlined text-primary",children:"cyclone"}),e.jsx("span",{style:{fontWeight:500},children:"Wind (Hurricanes/Typhoons)"})]}),e.jsx(s,{defaultChecked:!0})]}),e.jsxs("label",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem",background:"#171f33",borderRadius:"0.5rem"},children:[e.jsxs("div",{style:{display:"flex",gap:"0.75rem",alignItems:"center"},children:[e.jsx("span",{className:"material-symbols-outlined text-tertiary",children:"volcano"}),e.jsx("span",{style:{fontWeight:500},children:"Quake (Seismic Activity)"})]}),e.jsx(s,{defaultChecked:!0})]}),e.jsxs("label",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"1rem",background:"#171f33",borderRadius:"0.5rem"},children:[e.jsxs("div",{style:{display:"flex",gap:"0.75rem",alignItems:"center"},children:[e.jsx("span",{className:"material-symbols-outlined text-secondary",children:"water_drop"}),e.jsx("span",{style:{fontWeight:500},children:"Flood (Pluvial/Fluvial)"})]}),e.jsx(s,{})]})]})]}),e.jsxs(C,{children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem"},children:[e.jsxs("div",{children:[e.jsx("p",{style:{fontSize:"0.625rem",fontFamily:"'JetBrains Mono', monospace",color:"#adc6ff",textTransform:"uppercase",marginBottom:"0.25rem"},children:"Risk Exposure Estimate"}),e.jsxs("h4",{style:{fontFamily:"'JetBrains Mono', monospace",fontSize:"2rem",fontWeight:700},children:["7.42",e.jsx("span",{style:{fontSize:"1rem",opacity:.5,marginLeft:"0.25rem"},children:"%"})]})]}),e.jsx("span",{className:"material-symbols-outlined",style:{opacity:.4},children:"query_stats"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"flex-end",gap:"0.25rem",height:"6rem",marginBottom:"1rem"},children:[e.jsx("div",{style:{flex:1,background:"rgba(75,142,255,0.12)",height:"50%"}}),e.jsx("div",{style:{flex:1,background:"rgba(75,142,255,0.24)",height:"66%"}}),e.jsx("div",{style:{flex:1,background:"rgba(75,142,255,0.36)",height:"83%",boxShadow:"0 0 10px #adc6ff33"}}),e.jsx("div",{style:{flex:1,background:"rgba(75,142,255,0.48)",height:"100%",boxShadow:"0 0 15px #adc6ff66"}}),e.jsx("div",{style:{flex:1,background:"rgba(78,222,163,0.4)",height:"58%"}}),e.jsx("div",{style:{flex:1,background:"rgba(255,179,173,0.3)",height:"41%"}})]}),e.jsx("p",{style:{fontSize:"0.625rem",color:"rgba(193,198,215,0.9)"},children:"Projected return profile based on selected perils and Bermuda tax jurisdiction logic. Subject to dynamic pricing fluctuations."})]}),e.jsxs(g,{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"1rem"},children:[e.jsx("span",{className:"material-symbols-outlined",style:{fontSize:"0.75rem"},children:"public"}),e.jsx("span",{style:{fontSize:"0.625rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"rgba(139,144,160,1)"},children:"Primary Allocation Zone"})]}),e.jsxs("div",{style:{width:"100%",height:"8rem",borderRadius:"0.5rem",background:"#060e20",position:"relative",overflow:"hidden"},children:[e.jsx("img",{alt:"stylized geographic map showing island of bermuda with data overlay points in electric blue",style:{width:"100%",height:"100%",objectFit:"cover",opacity:.6,filter:"grayscale(1)",transition:"filter 200ms"},"data-location":"Bermuda",src:"https://lh3.googleusercontent.com/aida-public/AB6AXuDb5XNlayiudINaosntKG5OY0k8QgChFRTZ37i_dpz7pnFB2sH0cP1PFx7Xw6xh2KEx_B6h_LpaaE2umouxckuLSTZ4WQv6BpZhEAwyFumzQ2-1NSlGk_QxjozniT5ZIXFxmBPB8E0awTw0_Pold3rfy3gtj_1Wbww8gIaD77wNQ_Y03KSdcWloar4eVVmQTt5gG_tWu4fyQm7WOmeUFdP4uyrgL9zbRGcx0ph3EWPG4pClOolgfAlFy94Ze5pu0mXN0zPFlRVaQZkp"}),e.jsx("div",{style:{position:"absolute",inset:0,background:"linear-gradient(to top, rgba(23,27,46,1), transparent)"}}),e.jsxs("div",{style:{position:"absolute",bottom:"0.75rem",left:"1rem",display:"flex",alignItems:"center",gap:"0.5rem"},children:[e.jsx("span",{style:{width:8,height:8,borderRadius:9999,background:"#4edea3",animation:"pulse 2s infinite"}}),e.jsx("span",{style:{fontFamily:"'JetBrains Mono', monospace",fontWeight:700,fontSize:"0.75rem"},children:"ACTIVE REGION: BM"})]})]})]})]})]}),e.jsxs(T,{children:[e.jsxs("button",{style:{display:"flex",alignItems:"center",gap:"0.5rem",background:"transparent",border:"none",color:"rgba(218,226,253,0.7)"},children:[e.jsx("span",{className:"material-symbols-outlined",children:"arrow_back"}),"Previous: Institutional Role"]}),e.jsxs("div",{style:{display:"flex",gap:"1rem"},children:[e.jsx(W,{children:"Skip for now"}),e.jsx(R,{children:"Complete Strategy & Verification"})]})]})]})});c.__docgenInfo={description:"",methods:[],displayName:"InstitutionalAllocationStrategy"};const D={title:"Pages/Registration/Institutional Allocation Strategy",component:c},A=()=>e.jsx(c,{}),r=A.bind({});var x,h,u;r.parameters={...r.parameters,docs:{...(x=r.parameters)==null?void 0:x.docs,source:{originalSource:"() => <InstitutionalAllocationStrategy />",...(u=(h=r.parameters)==null?void 0:h.docs)==null?void 0:u.source}}};const Z=["Default"];export{r as Default,Z as __namedExportsOrder,D as default};
