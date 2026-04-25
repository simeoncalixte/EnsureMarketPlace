import{j as n}from"./jsx-runtime-BjG_zV1W.js";const s={};console.log("pk.eyJ1Ijoic2ltZW9uY2FsaXh0ZSIsImEiOiJjbWozcXhvYzgwbDFjM2RxMW16bjJyc3V4In0.VvbdX3-laxrxsoqqFKQzSg");const e=({propertyA:y,propertyB:t})=>(console.log(),console.log("Env vars from args:",{propertyA:y,propertyB:t}),n.jsxs("div",{style:{padding:16,fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"},children:[n.jsx("h3",{children:"Env Vars (from args)"}),n.jsx("table",{style:{width:"100%",borderCollapse:"collapse"},children:n.jsxs("tbody",{children:[n.jsxs("tr",{children:[n.jsx("td",{style:{padding:8,fontWeight:600},children:"propertyA"}),n.jsx("td",{style:{padding:8},children:"pk.eyJ1Ijoic2ltZW9uY2FsaXh0ZSIsImEiOiJjbWozcXhvYzgwbDFjM2RxMW16bjJyc3V4In0.VvbdX3-laxrxsoqqFKQzSg"})]}),n.jsxs("tr",{children:[n.jsx("td",{style:{padding:8,fontWeight:600},children:"propertyB"}),n.jsx("td",{style:{padding:8},children:String(t??"")})]})]})})]})),g={title:"XDS/Env Vars",component:e},r={args:{propertyA:"pk.eyJ1Ijoic2ltZW9uY2FsaXh0ZSIsImEiOiJjbWozcXhvYzgwbDFjM2RxMW16bjJyc3V4In0.VvbdX3-laxrxsoqqFKQzSg",propertyB:(s==null?void 0:s.VITE_CUSTOM_VAR)??null}};e.__docgenInfo={description:"",methods:[],displayName:"EnvVarsDisplay",props:{propertyA:{required:!1,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""},propertyB:{required:!1,tsType:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}]},description:""}}};var o,a,l;e.parameters={...e.parameters,docs:{...(o=e.parameters)==null?void 0:o.docs,source:{originalSource:`({
  propertyA,
  propertyB
}) => {
  console.log();
  console.log('Env vars from args:', {
    propertyA,
    propertyB
  });
  return <div style={{
    padding: 16,
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
  }}>
      <h3>Env Vars (from args)</h3>
      <table style={{
      width: '100%',
      borderCollapse: 'collapse'
    }}>
        <tbody>
          <tr>
            <td style={{
            padding: 8,
            fontWeight: 600
          }}>propertyA</td>
            <td style={{
            padding: 8
          }}>{String(import.meta.env.STORYBOOK_MAPBOX_TOKEN ?? '')}</td>
          </tr>
          <tr>
            <td style={{
            padding: 8,
            fontWeight: 600
          }}>propertyB</td>
            <td style={{
            padding: 8
          }}>{String(propertyB ?? '')}</td>
          </tr>
        </tbody>
      </table>
    </div>;
}`,...(l=(a=e.parameters)==null?void 0:a.docs)==null?void 0:l.source}}};var p,i,d;r.parameters={...r.parameters,docs:{...(p=r.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    propertyA: import.meta.env.STORYBOOK_MAPBOX_TOKEN ?? null,
    propertyB: (import.meta as any).env?.VITE_CUSTOM_VAR ?? null
  }
}`,...(d=(i=r.parameters)==null?void 0:i.docs)==null?void 0:d.source}}};const m=["EnvVarsDisplay","ExampleStory"];export{e as EnvVarsDisplay,r as ExampleStory,m as __namedExportsOrder,g as default};
