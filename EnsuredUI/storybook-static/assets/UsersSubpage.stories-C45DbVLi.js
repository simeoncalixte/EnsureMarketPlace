import{j as p}from"./jsx-runtime-BjG_zV1W.js";import{U as n}from"./UsersSubpage-HoyKQQ51.js";import{s as m}from"./auth-DmpauaO1.js";import"./index-B3TfwC44.js";import"./AdminPage.styles-CQimW9H-.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./api-2uxkEE_U.js";const I={title:"Pages/Admin/Users",component:n,parameters:{layout:"fullscreen"}},e=()=>(typeof window<"u"&&(window.__VITE_API_BASE="http://localhost:3001",m(null)),p.jsx(n,{})),o=()=>(typeof window<"u"&&(window.__VITE_API_BASE="http://localhost:3001",m("storybook-demo-token")),p.jsx(n,{}));e.__docgenInfo={description:"",methods:[],displayName:"Default"};o.__docgenInfo={description:"",methods:[],displayName:"SignedIn"};var t,s,r;e.parameters={...e.parameters,docs:{...(t=e.parameters)==null?void 0:t.docs,source:{originalSource:`() => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
    saveAuthToken(null);
  }
  return <UsersSubpage />;
}`,...(r=(s=e.parameters)==null?void 0:s.docs)==null?void 0:r.source}}};var a,d,i;o.parameters={...o.parameters,docs:{...(a=o.parameters)==null?void 0:a.docs,source:{originalSource:`() => {
  if (typeof window !== 'undefined') {
    (window as any).__VITE_API_BASE = 'http://localhost:3001';
    saveAuthToken('storybook-demo-token');
  }
  return <UsersSubpage />;
}`,...(i=(d=o.parameters)==null?void 0:d.docs)==null?void 0:i.source}}};const A=["Default","SignedIn"];export{e as Default,o as SignedIn,A as __namedExportsOrder,I as default};
