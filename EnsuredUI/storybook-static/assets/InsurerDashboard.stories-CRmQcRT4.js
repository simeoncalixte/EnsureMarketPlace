import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{I as h}from"./InsurerDashboard-DaLAwgfL.js";import{C as g}from"./SideBarNav-Dn6Nn7nx.js";import{I as c}from"./InsurerLayout-DjnBzlUO.js";import{A as n}from"./AnalyticsDashboard-CWBhD3MT.js";import{A as d}from"./ActiveCoverage-DicWbo53.js";import{L as f,a as x}from"./LineOfBusinessPage-36ddQHQK.js";import{R as j}from"./Reports-Bp7iQYSk.js";import{S as b}from"./Settings-_JEB45oC.js";import{R,a as t}from"./chunk-OE4NN4TA-D-lI_iOm.js";import{P as I}from"./PipelineIngestion-DzHuIedg.js";import{R as s,Q as C}from"./QueueConfig-Bie3UQ9g.js";import{E as o}from"./EmailIngestConfig-DxZ1AO7h.js";import{C as r}from"./CloudStorageConfig-Ea9cl1Au.js";import{S as a}from"./SFTPConfig-BJlxLLnz.js";import{W as p}from"./WebhookConfig-CopWib8j.js";import"./index-B3TfwC44.js";import"./api-2uxkEE_U.js";import"./useAuthMe-B_qCSjfZ.js";import"./auth-DmpauaO1.js";import"./InsurerDashboard.styles-BNsNl3gT.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./SubNavigation-8Fv3DXYl.js";import"./colors-BpeaZ3Jo.js";import"./tokens-C6qfnSfg.js";import"./SubjectInsuranceSection-CtTyPOqa.js";import"./Button-BdN1JsLa.js";import"./SubjectInsuranceCard-D5sJ76h_.js";import"./Input-BOqlzFhj.js";import"./Select-Vu80i_dn.js";import"./SubjectTemplateFields-CH0jMXl_.js";import"./ConnectedGrid-mgqUdqx5.js";import"./Badge-BMblvUa5.js";import"./SegmentedSwitch-B7FGOm21.js";import"./Checkbox-DszoQXQ5.js";import"./NumberInput-B6u1J8fd.js";import"./DealParametersSection-BH7AvN_3.js";import"./FinancialsSection-9u2gXHiK.js";import"./TrancheStructureSection-wKLEwB6h.js";import"./ValidationSection-C42tG3xU.js";import"./SubmissionSection-XfqW1n5m.js";import"./SigningSection-CFtiCcvN.js";import"./LiveSummaryAside-dJ_b758p.js";import"./SideNavBar-D057Nu_b.js";import"./Navigation-B7csy45d.js";import"./TopBarNav-Cqd53mzT.js";import"./TopNavBar-D16Kii80.js";import"./index-CLF8vIaC.js";import"./tiny-invariant-CopsF_GD.js";import"./Modal-BflAQ_kP.js";const be={title:"Pages/Insurer Dashboard",component:h,parameters:{layout:"fullscreen"}},i=()=>(typeof window<"u"&&(window.__VITE_API_BASE="http://localhost:3001"),e.jsx(R,{children:e.jsxs(t,{path:"/",element:e.jsx(c,{}),children:[e.jsx(t,{index:!0,element:e.jsx(n,{})}),e.jsx(t,{path:"insurer/dashboard",element:e.jsx(n,{})}),e.jsx(t,{path:"insurer/claims",element:e.jsx(g,{})}),e.jsx(t,{path:"insurer/coverage/create",element:e.jsx(h,{})}),e.jsx(t,{path:"insurer/coverage/line-of-business",element:e.jsx(x,{}),children:e.jsx(t,{path:"active-template",element:e.jsx(f,{})})}),e.jsx(t,{path:"insurer/coverage-active",element:e.jsx(d,{})}),e.jsx(t,{path:"insurer/reports",element:e.jsx(j,{})}),e.jsx(t,{path:"insurer/settings",element:e.jsx(b,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion",element:e.jsx(I,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/rabbitmq",element:e.jsx(s,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/rabbitmq/:channelId",element:e.jsx(s,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/rabbitmq/:channelId/queue/:queueName",element:e.jsx(C,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/email-sso",element:e.jsx(o,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/email-sso/:channelId",element:e.jsx(o,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/cloud-storage",element:e.jsx(r,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/cloud-storage/:channelId",element:e.jsx(r,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/sftp",element:e.jsx(a,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/sftp/:channelId",element:e.jsx(a,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/webhooks",element:e.jsx(p,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/webhooks/:channelId",element:e.jsx(p,{})})]})}));i.__docgenInfo={description:"",methods:[],displayName:"Default"};var m,l,u;i.parameters={...i.parameters,docs:{...(m=i.parameters)==null?void 0:m.docs,source:{originalSource:`() => {
  // Point Storybook at the local API by default for the demo
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
  }

  // Render a small route set for the story so clicking sidebar links navigates to the claims and coverage pages
  return <Routes>
      <Route path="/" element={<InsurerLayout />}>
        <Route index element={<AnalyticsDashboard />} />
        <Route path="insurer/dashboard" element={<AnalyticsDashboard />} />
        <Route path="insurer/claims" element={<ClaimsDashboard />} />
        <Route path="insurer/coverage/create" element={<InsurerDashboard />} />
        <Route path="insurer/coverage/line-of-business" element={<LineOfBusinessPage />}>
          <Route path="active-template" element={<LineOfBusinessActiveTemplatePage />} />
        </Route>
        <Route path="insurer/coverage-active" element={<ActiveCoverage />} />
        <Route path="insurer/reports" element={<Reports />} />
        <Route path="insurer/settings" element={<Settings />} />
        <Route path="insurer/pipeline-ingestion" element={<PipelineIngestion />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq" element={<RabbitMQConfig />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq/:channelId" element={<RabbitMQConfig />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq/:channelId/queue/:queueName" element={<QueueConfig />} />
        <Route path="insurer/pipeline-ingestion/email-sso" element={<EmailIngestConfig />} />
        <Route path="insurer/pipeline-ingestion/email-sso/:channelId" element={<EmailIngestConfig />} />
        <Route path="insurer/pipeline-ingestion/cloud-storage" element={<CloudStorageConfig />} />
        <Route path="insurer/pipeline-ingestion/cloud-storage/:channelId" element={<CloudStorageConfig />} />
        <Route path="insurer/pipeline-ingestion/sftp" element={<SFTPConfig />} />
        <Route path="insurer/pipeline-ingestion/sftp/:channelId" element={<SFTPConfig />} />
        <Route path="insurer/pipeline-ingestion/webhooks" element={<WebhookConfig />} />
        <Route path="insurer/pipeline-ingestion/webhooks/:channelId" element={<WebhookConfig />} />
      </Route>
    </Routes>;
}`,...(u=(l=i.parameters)==null?void 0:l.docs)==null?void 0:u.source}}};const Re=["Default"];export{i as Default,Re as __namedExportsOrder,be as default};
