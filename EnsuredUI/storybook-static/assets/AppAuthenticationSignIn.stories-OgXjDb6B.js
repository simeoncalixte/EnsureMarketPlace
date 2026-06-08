import{j as n}from"./jsx-runtime-BjG_zV1W.js";import{within as a,userEvent as s,expect as c}from"./index-DgAF9SIF.js";import{B as u}from"./index-BM5Um5_D.js";import{A as m}from"./AppRoutes-BSqTywuG.js";import"./index-B3TfwC44.js";import"./chunk-OE4NN4TA-D-lI_iOm.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./Marketplace-CjzNaxt6.js";import"./MapPanel-abNWxh0b.js";import"./colors-BpeaZ3Jo.js";import"./tokens-C6qfnSfg.js";import"./SideBarNav-Dn6Nn7nx.js";import"./InsurerDashboard.styles-BNsNl3gT.js";import"./SideNavBar-D057Nu_b.js";import"./Navigation-B7csy45d.js";import"./Investors-C1T2y9iv.js";import"./StatCard-CXDKjfmy.js";import"./DataTable-BDOIBFaJ.js";import"./AdminPage-B8d6E5C1.js";import"./AdminPage.styles-CQimW9H-.js";import"./OrganizationsSubpage-DEDtiJAl.js";import"./UsersSubpage-HoyKQQ51.js";import"./auth-DmpauaO1.js";import"./api-2uxkEE_U.js";import"./OrgUsersSubpage-CntdjQYO.js";import"./SeedingPanel-B0dJpyxC.js";import"./Input-BOqlzFhj.js";import"./NumberInput-B6u1J8fd.js";import"./InsurerDashboard-DaLAwgfL.js";import"./useAuthMe-B_qCSjfZ.js";import"./SubNavigation-8Fv3DXYl.js";import"./SubjectInsuranceSection-CtTyPOqa.js";import"./Button-BdN1JsLa.js";import"./SubjectInsuranceCard-D5sJ76h_.js";import"./Select-Vu80i_dn.js";import"./SubjectTemplateFields-CH0jMXl_.js";import"./ConnectedGrid-mgqUdqx5.js";import"./Badge-BMblvUa5.js";import"./SegmentedSwitch-B7FGOm21.js";import"./Checkbox-DszoQXQ5.js";import"./DealParametersSection-BH7AvN_3.js";import"./FinancialsSection-9u2gXHiK.js";import"./TrancheStructureSection-wKLEwB6h.js";import"./ValidationSection-C42tG3xU.js";import"./SubmissionSection-XfqW1n5m.js";import"./SigningSection-CFtiCcvN.js";import"./LiveSummaryAside-dJ_b758p.js";import"./LineOfBusinessPage-36ddQHQK.js";import"./Modal-BflAQ_kP.js";import"./AnalyticsDashboard-CWBhD3MT.js";import"./index-CLF8vIaC.js";import"./tiny-invariant-CopsF_GD.js";import"./ActiveCoverage-DicWbo53.js";import"./Reports-Bp7iQYSk.js";import"./Settings-_JEB45oC.js";import"./PipelineIngestion-DzHuIedg.js";import"./QueueConfig-Bie3UQ9g.js";import"./EmailIngestConfig-DxZ1AO7h.js";import"./CloudStorageConfig-Ea9cl1Au.js";import"./SFTPConfig-BJlxLLnz.js";import"./WebhookConfig-CopWib8j.js";import"./LandingPage-Cqabagj2.js";import"./HeroHeader-Cd8KXd_O.js";import"./MetricCard-B0DT9GYr.js";import"./KYCVerification-D9jVHJg7.js";import"./RoleSelection-Cd58URG_.js";import"./SelectionCard-BjXXdTns.js";import"./InfoCard-DAfGRKKS.js";import"./TopBarNav-Cqd53mzT.js";import"./TopNavBar-D16Kii80.js";const l={path:"/",useStoryElement:!0,children:[{path:"*"}]},St={title:"App/Authentication/SignIn",component:m,parameters:{layout:"fullscreen"}},t={render:()=>n.jsx(m,{}),parameters:{reactRouter:u({location:{path:"/"},routing:l})},play:async({canvasElement:e})=>{const r=a(e);await s.click(await r.findByRole("link",{name:/sign in/i})),await c(await r.findByRole("heading",{name:/secure access/i})).toBeInTheDocument()}};var o,i,p;t.parameters={...t.parameters,docs:{...(o=t.parameters)==null?void 0:o.docs,source:{originalSource:`{
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
      name: /sign in/i
    }));
    await expect(await canvas.findByRole('heading', {
      name: /secure access/i
    })).toBeInTheDocument();
  }
}`,...(p=(i=t.parameters)==null?void 0:i.docs)==null?void 0:p.source}}};const Tt=["Default"];export{t as Default,Tt as __namedExportsOrder,St as default};
