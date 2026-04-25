import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{I as h}from"./InsurerDashboard-X1HCQ0du.js";import{C as g}from"./TopBarNav-fIfrKe6o.js";import{I as d}from"./InsurerLayout-Bdar6GyE.js";import{A as i,a as c,R as f,S as x}from"./Settings-CmDJxnZ6.js";import{R as j,a as t}from"./chunk-OE4NN4TA-Bw6l4tmK.js";import{P as b}from"./PipelineIngestion-CbkCRGMa.js";import{R as s}from"./RabbitMQConfig-KTpttUGX.js";import{E as o}from"./EmailIngestConfig-oBtkoA-j.js";import{C as r}from"./CloudStorageConfig-DR0ol3pe.js";import{S as a}from"./SFTPConfig-DktYG2oo.js";import{W as p}from"./WebhookConfig-BWIUm4GE.js";import"./index-B3TfwC44.js";import"./api-2uxkEE_U.js";import"./InsurerDashboard.styles-CeOM6OtU.js";import"./styled-components.browser.esm-DDkbN7W9.js";import"./Input-CtVi8lyF.js";import"./colors-CWt0Ylu9.js";import"./NumberInput-DvKdu6Yo.js";import"./Select-D8OFKnYf.js";import"./Button-D4SNBHNz.js";import"./SideNavBar-CL_K8fDk.js";import"./Navigation-IrReTMVv.js";import"./tokens-C6qfnSfg.js";import"./TopNavBar-DbKDKjEy.js";import"./index-CLF8vIaC.js";import"./tiny-invariant-CopsF_GD.js";const J={title:"Pages/Insurer Dashboard",component:h,parameters:{layout:"fullscreen"}},n=()=>(typeof window<"u"&&(window.__VITE_API_BASE="http://localhost:3001"),e.jsx(j,{children:e.jsxs(t,{path:"/",element:e.jsx(d,{}),children:[e.jsx(t,{index:!0,element:e.jsx(i,{})}),e.jsx(t,{path:"insurer/dashboard",element:e.jsx(i,{})}),e.jsx(t,{path:"insurer/claims",element:e.jsx(g,{})}),e.jsx(t,{path:"insurer/coverage/create",element:e.jsx(h,{})}),e.jsx(t,{path:"insurer/coverage-active",element:e.jsx(c,{})}),e.jsx(t,{path:"insurer/reports",element:e.jsx(f,{})}),e.jsx(t,{path:"insurer/settings",element:e.jsx(x,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion",element:e.jsx(b,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/rabbitmq",element:e.jsx(s,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/rabbitmq/:channelId",element:e.jsx(s,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/email-sso",element:e.jsx(o,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/email-sso/:channelId",element:e.jsx(o,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/cloud-storage",element:e.jsx(r,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/cloud-storage/:channelId",element:e.jsx(r,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/sftp",element:e.jsx(a,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/sftp/:channelId",element:e.jsx(a,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/webhooks",element:e.jsx(p,{})}),e.jsx(t,{path:"insurer/pipeline-ingestion/webhooks/:channelId",element:e.jsx(p,{})})]})}));n.__docgenInfo={description:"",methods:[],displayName:"Default"};var l,m,u;n.parameters={...n.parameters,docs:{...(l=n.parameters)==null?void 0:l.docs,source:{originalSource:`() => {
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
        <Route path="insurer/coverage-active" element={<ActiveCoverage />} />
        <Route path="insurer/reports" element={<Reports />} />
        <Route path="insurer/settings" element={<Settings />} />
        <Route path="insurer/pipeline-ingestion" element={<PipelineIngestion />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq" element={<RabbitMQConfig />} />
        <Route path="insurer/pipeline-ingestion/rabbitmq/:channelId" element={<RabbitMQConfig />} />
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
}`,...(u=(m=n.parameters)==null?void 0:m.docs)==null?void 0:u.source}}};const K=["Default"];export{n as Default,K as __namedExportsOrder,J as default};
