import{j}from"./jsx-runtime-BjG_zV1W.js";import{within as V,userEvent as a,expect as s}from"./index-DgAF9SIF.js";import{B as N}from"./index-BM5Um5_D.js";import{A as M}from"./AppRoutes-BSqTywuG.js";import"./index-B3TfwC44.js";import"./chunk-OE4NN4TA-D-lI_iOm.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./Marketplace-CjzNaxt6.js";import"./MapPanel-abNWxh0b.js";import"./colors-BpeaZ3Jo.js";import"./tokens-C6qfnSfg.js";import"./SideBarNav-Dn6Nn7nx.js";import"./InsurerDashboard.styles-BNsNl3gT.js";import"./SideNavBar-D057Nu_b.js";import"./Navigation-B7csy45d.js";import"./Investors-C1T2y9iv.js";import"./StatCard-CXDKjfmy.js";import"./DataTable-BDOIBFaJ.js";import"./AdminPage-B8d6E5C1.js";import"./AdminPage.styles-CQimW9H-.js";import"./OrganizationsSubpage-DEDtiJAl.js";import"./UsersSubpage-HoyKQQ51.js";import"./auth-DmpauaO1.js";import"./api-2uxkEE_U.js";import"./OrgUsersSubpage-CntdjQYO.js";import"./SeedingPanel-B0dJpyxC.js";import"./Input-BOqlzFhj.js";import"./NumberInput-B6u1J8fd.js";import"./InsurerDashboard-DaLAwgfL.js";import"./useAuthMe-B_qCSjfZ.js";import"./SubNavigation-8Fv3DXYl.js";import"./SubjectInsuranceSection-CtTyPOqa.js";import"./Button-BdN1JsLa.js";import"./SubjectInsuranceCard-D5sJ76h_.js";import"./Select-Vu80i_dn.js";import"./SubjectTemplateFields-CH0jMXl_.js";import"./ConnectedGrid-mgqUdqx5.js";import"./Badge-BMblvUa5.js";import"./SegmentedSwitch-B7FGOm21.js";import"./Checkbox-DszoQXQ5.js";import"./DealParametersSection-BH7AvN_3.js";import"./FinancialsSection-9u2gXHiK.js";import"./TrancheStructureSection-wKLEwB6h.js";import"./ValidationSection-C42tG3xU.js";import"./SubmissionSection-XfqW1n5m.js";import"./SigningSection-CFtiCcvN.js";import"./LiveSummaryAside-dJ_b758p.js";import"./LineOfBusinessPage-36ddQHQK.js";import"./Modal-BflAQ_kP.js";import"./AnalyticsDashboard-CWBhD3MT.js";import"./index-CLF8vIaC.js";import"./tiny-invariant-CopsF_GD.js";import"./ActiveCoverage-DicWbo53.js";import"./Reports-Bp7iQYSk.js";import"./Settings-_JEB45oC.js";import"./PipelineIngestion-DzHuIedg.js";import"./QueueConfig-Bie3UQ9g.js";import"./EmailIngestConfig-DxZ1AO7h.js";import"./CloudStorageConfig-Ea9cl1Au.js";import"./SFTPConfig-BJlxLLnz.js";import"./WebhookConfig-CopWib8j.js";import"./LandingPage-Cqabagj2.js";import"./HeroHeader-Cd8KXd_O.js";import"./MetricCard-B0DT9GYr.js";import"./KYCVerification-D9jVHJg7.js";import"./RoleSelection-Cd58URG_.js";import"./SelectionCard-BjXXdTns.js";import"./InfoCard-DAfGRKKS.js";import"./TopBarNav-Cqd53mzT.js";import"./TopNavBar-D16Kii80.js";const L={path:"/",useStoryElement:!0,children:[{path:"*"}]},ot={title:"App/Authentication/Register",component:M,parameters:{layout:"fullscreen"}};async function y(e,r){const t={"government-id.txt":new URL("data:text/plain;base64,TW9jayBHb3Zlcm5tZW50LWlzc3VlZCBJRCBkb2N1bWVudCBmb3IgU3Rvcnlib29rIHVwbG9hZCB0ZXN0cy4KRG9jdW1lbnQgSUQ6IEdPVi1JRC0xMjM0NTYKSXNzdWVkIEJ5OiBUZXN0IEF1dGhvcml0eQo=",import.meta.url),"proof-of-address.txt":new URL("data:text/plain;base64,TW9jayBQcm9vZiBvZiBBZGRyZXNzIGRvY3VtZW50IGZvciBTdG9yeWJvb2sgdXBsb2FkIHRlc3RzLgpBZGRyZXNzOiAxMjMgTWFya2V0IExhbmUsIFRlc3QgQ2l0eSwgVFMgOTk5OTkKSXNzdWVkIERhdGU6IDIwMjYtMDUtMTAK",import.meta.url),"compliance-packet.txt":new URL("data:text/plain;base64,TW9jayBDb21wbGlhbmNlIFBhY2tldCBmb3IgU3Rvcnlib29rIHVwbG9hZCB0ZXN0cy4KSW5jbHVkZXM6IFVCTyBkaXNjbG9zdXJlLCBhY2NyZWRpdGF0aW9uIG5vdGUsIHJlZ3VsYXRvcnkgcmVmZXJlbmNlcy4K",import.meta.url)},n=t[e]??t["compliance-packet.txt"],w=await fetch(n).then(X=>X.text());return new File([w],e,{type:r})}async function H(e){await a.type(await e.findByLabelText(/legal full name/i),"Morgan Riskwell"),await a.type(await e.findByLabelText(/date of birth/i),"1986-04-19"),await a.type(await e.findByLabelText(/tax id \/ ssn/i),"123-45-6789");const r=await e.findAllByLabelText(/^upload /i),t=await Promise.all([y("government-id.txt","text/plain"),y("proof-of-address.txt","text/plain"),y("compliance-packet.txt","text/plain")]);for(let n=0;n<r.length;n+=1){const w=t[n%t.length];await a.upload(r[n],w)}await a.click(await e.findByRole("button",{name:/start camera|camera verified/i})),await a.click(await e.findByRole("button",{name:/proceed to capital profiling/i}))}async function o(e,r){const t=V(e);await a.click(await t.findByRole("link",{name:/register/i})),await s(await t.findByRole("heading",{name:/define your role in the capital stack/i})).toBeInTheDocument(),await a.click(await t.findByRole("heading",{name:r})),await a.click(await t.findByRole("button",{name:/continue/i})),await s(await t.findByRole("heading",{name:/identity verification/i})).toBeInTheDocument(),await s(await t.findByText(/to ensure the integrity of the sovereign re ecosystem/i)).toBeInTheDocument(),await H(t),await s(await t.findByRole("heading",{name:/capital profile/i})).toBeInTheDocument()}const i={render:()=>j.jsx(M,{}),parameters:{reactRouter:N({location:{path:"/"},routing:L})},play:async({canvasElement:e})=>{const r=V(e);await a.click(await r.findByRole("link",{name:/register/i})),await s(await r.findByRole("heading",{name:/define your role in the capital stack/i})).toBeInTheDocument()}},m={...i,name:'Register as "Underwriter"',play:async({canvasElement:e})=>{await o(e,/underwriter/i)}},c={...i,name:'Register as "Institutional Investor"',play:async({canvasElement:e})=>{await o(e,/institutional investor/i)}},l={...i,name:'Register as "Insurer / MGA"',play:async({canvasElement:e})=>{await o(e,/insurer \/ mga/i)}},p={...i,name:'Register as "Claims Handler"',play:async({canvasElement:e})=>{await o(e,/claims handler/i)}},u={...i,name:'Register as "Broker / Distribution"',play:async({canvasElement:e})=>{await o(e,/broker \/ distribution/i)}},d={...i,name:'Register as "Platform Admin"',play:async({canvasElement:e})=>{await o(e,/platform admin/i)}};var g,R,f;i.parameters={...i.parameters,docs:{...(g=i.parameters)==null?void 0:g.docs,source:{originalSource:`{
  render: () => <AppRoutes />,
  parameters: {
    reactRouter: reactRouterParameters({
      location: {
        path: '/'
      },
      routing: appRouting
    })
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole('link', {
      name: /register/i
    }));
    await expect(await canvas.findByRole('heading', {
      name: /define your role in the capital stack/i
    })).toBeInTheDocument();
  }
}`,...(f=(R=i.parameters)==null?void 0:R.docs)==null?void 0:f.source}}};var B,h,v;m.parameters={...m.parameters,docs:{...(B=m.parameters)==null?void 0:B.docs,source:{originalSource:`{
  ...Default,
  name: 'Register as "Underwriter"',
  play: async ({
    canvasElement
  }) => {
    await runRegisterSelectionFlow(canvasElement, /underwriter/i);
  }
}`,...(v=(h=m.parameters)==null?void 0:h.docs)==null?void 0:v.source}}};var I,b,x;c.parameters={...c.parameters,docs:{...(I=c.parameters)==null?void 0:I.docs,source:{originalSource:`{
  ...Default,
  name: 'Register as "Institutional Investor"',
  play: async ({
    canvasElement
  }) => {
    await runRegisterSelectionFlow(canvasElement, /institutional investor/i);
  }
}`,...(x=(b=c.parameters)==null?void 0:b.docs)==null?void 0:x.source}}};var k,S,A;l.parameters={...l.parameters,docs:{...(k=l.parameters)==null?void 0:k.docs,source:{originalSource:`{
  ...Default,
  name: 'Register as "Insurer / MGA"',
  play: async ({
    canvasElement
  }) => {
    await runRegisterSelectionFlow(canvasElement, /insurer \\/ mga/i);
  }
}`,...(A=(S=l.parameters)==null?void 0:S.docs)==null?void 0:A.source}}};var C,E,T;p.parameters={...p.parameters,docs:{...(C=p.parameters)==null?void 0:C.docs,source:{originalSource:`{
  ...Default,
  name: 'Register as "Claims Handler"',
  play: async ({
    canvasElement
  }) => {
    await runRegisterSelectionFlow(canvasElement, /claims handler/i);
  }
}`,...(T=(E=p.parameters)==null?void 0:E.docs)==null?void 0:T.source}}};var F,Z,D;u.parameters={...u.parameters,docs:{...(F=u.parameters)==null?void 0:F.docs,source:{originalSource:`{
  ...Default,
  name: 'Register as "Broker / Distribution"',
  play: async ({
    canvasElement
  }) => {
    await runRegisterSelectionFlow(canvasElement, /broker \\/ distribution/i);
  }
}`,...(D=(Z=u.parameters)==null?void 0:Z.docs)==null?void 0:D.source}}};var G,U,W;d.parameters={...d.parameters,docs:{...(G=d.parameters)==null?void 0:G.docs,source:{originalSource:`{
  ...Default,
  name: 'Register as "Platform Admin"',
  play: async ({
    canvasElement
  }) => {
    await runRegisterSelectionFlow(canvasElement, /platform admin/i);
  }
}`,...(W=(U=d.parameters)==null?void 0:U.docs)==null?void 0:W.source}}};const st=["Default","SelectUnderwriterAndContinue","SelectInstitutionalInvestorAndContinue","SelectInsurerAndContinue","SelectClaimsAndContinue","SelectBrokerAndContinue","SelectAdminAndContinue"];export{i as Default,d as SelectAdminAndContinue,u as SelectBrokerAndContinue,p as SelectClaimsAndContinue,c as SelectInstitutionalInvestorAndContinue,l as SelectInsurerAndContinue,m as SelectUnderwriterAndContinue,st as __namedExportsOrder,ot as default};
