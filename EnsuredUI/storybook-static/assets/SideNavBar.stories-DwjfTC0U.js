import{j as o}from"./jsx-runtime-BjG_zV1W.js";import{S as i}from"./SideNavBar-D057Nu_b.js";import{s as n}from"./auth-DmpauaO1.js";import"./styled-components.browser.esm-BtVlB3rV.js";import"./index-B3TfwC44.js";import"./Navigation-B7csy45d.js";import"./chunk-OE4NN4TA-D-lI_iOm.js";import"./colors-BpeaZ3Jo.js";import"./tokens-C6qfnSfg.js";import"./api-2uxkEE_U.js";const S={title:"XDS/SideNavBar",component:i},e=()=>(typeof window<"u"&&n(null),o.jsx("div",{style:{background:"#071129",minHeight:"100vh",padding:20},children:o.jsx(i,{})})),t=()=>(typeof window<"u"&&n("storybook-demo-token"),o.jsx("div",{style:{background:"#071129",minHeight:"100vh",padding:20},children:o.jsx(i,{title:"Ensured Marketplace",subtitle:"Institutional Session",isOpen:!0,onLogout:()=>{n(null),window.alert("Signed out")}})}));e.__docgenInfo={description:"",methods:[],displayName:"Default"};t.__docgenInfo={description:"",methods:[],displayName:"WithLogout"};var r,s,d;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`() => {
  if (typeof window !== 'undefined') {
    saveAuthToken(null);
  }
  return <div style={{
    background: '#071129',
    minHeight: '100vh',
    padding: 20
  }}>
      <SideNavBar />
    </div>;
}`,...(d=(s=e.parameters)==null?void 0:s.docs)==null?void 0:d.source}}};var a,u,p;t.parameters={...t.parameters,docs:{...(a=t.parameters)==null?void 0:a.docs,source:{originalSource:`() => {
  if (typeof window !== 'undefined') {
    saveAuthToken('storybook-demo-token');
  }
  return <div style={{
    background: '#071129',
    minHeight: '100vh',
    padding: 20
  }}>
      <SideNavBar title="Ensured Marketplace" subtitle="Institutional Session" isOpen onLogout={() => {
      saveAuthToken(null);
      window.alert('Signed out');
    }} />
    </div>;
}`,...(p=(u=t.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};const b=["Default","WithLogout"];export{e as Default,t as WithLogout,b as __namedExportsOrder,S as default};
