import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{s as o,r as p,t,z as c}from"./tokens-C6qfnSfg.js";const h={title:"XDS/Design Tokens/Tokens"},i=({label:n,value:a})=>e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px dashed rgba(255,255,255,0.03)"},children:[e.jsx("div",{style:{color:"var(--text-secondary)"},children:n}),e.jsx("div",{style:{color:"var(--text-primary)"},children:a})]}),r=()=>e.jsxs("div",{style:{padding:20,background:"var(--bg)",minHeight:"100vh"},children:[e.jsx("h3",{style:{color:"var(--text-primary)"},children:"Spacing"}),e.jsx("div",{style:{width:320,background:"transparent",padding:8},children:Object.entries(o).map(([n,a])=>e.jsx(i,{label:`spacing.${n}`,value:`${a}px`},n))}),e.jsx("h3",{style:{color:"var(--text-primary)",marginTop:16},children:"Radii"}),e.jsx("div",{style:{width:320,padding:8},children:Object.entries(p).map(([n,a])=>e.jsx(i,{label:`radii.${n}`,value:`${a}px`},n))}),e.jsx("h3",{style:{color:"var(--text-primary)",marginTop:16},children:"Typography"}),e.jsxs("div",{style:{width:420,padding:8},children:[Object.entries(t.sizes).map(([n,a])=>e.jsx(i,{label:`type.size.${n}`,value:`${a}px`},n)),e.jsx(i,{label:"font.family",value:t.fontFamily})]}),e.jsx("h3",{style:{color:"var(--text-primary)",marginTop:16},children:"Z Indices"}),e.jsx("div",{style:{width:320,padding:8},children:Object.entries(c).map(([n,a])=>e.jsx(i,{label:`z.${n}`,value:`${a}`},n))})]});r.__docgenInfo={description:"",methods:[],displayName:"Tokens"};var s,d,l;r.parameters={...r.parameters,docs:{...(s=r.parameters)==null?void 0:s.docs,source:{originalSource:`() => <div style={{
  padding: 20,
  background: 'var(--bg)',
  minHeight: '100vh'
}}>
    <h3 style={{
    color: 'var(--text-primary)'
  }}>Spacing</h3>
    <div style={{
    width: 320,
    background: 'transparent',
    padding: 8
  }}>
      {Object.entries(spacing).map(([k, v]) => <Row key={k} label={\`spacing.\${k}\`} value={\`\${v}px\`} />)}
    </div>

    <h3 style={{
    color: 'var(--text-primary)',
    marginTop: 16
  }}>Radii</h3>
    <div style={{
    width: 320,
    padding: 8
  }}>
      {Object.entries(radii).map(([k, v]) => <Row key={k} label={\`radii.\${k}\`} value={\`\${v}px\`} />)}
    </div>

    <h3 style={{
    color: 'var(--text-primary)',
    marginTop: 16
  }}>Typography</h3>
    <div style={{
    width: 420,
    padding: 8
  }}>
      {Object.entries(typography.sizes).map(([k, v]) => <Row key={k} label={\`type.size.\${k}\`} value={\`\${v}px\`} />)}
      <Row label={\`font.family\`} value={typography.fontFamily} />
    </div>

    <h3 style={{
    color: 'var(--text-primary)',
    marginTop: 16
  }}>Z Indices</h3>
    <div style={{
    width: 320,
    padding: 8
  }}>
      {Object.entries(zIndices).map(([k, v]) => <Row key={k} label={\`z.\${k}\`} value={\`\${v}\`} />)}
    </div>
  </div>`,...(l=(d=r.parameters)==null?void 0:d.docs)==null?void 0:l.source}}};const m=["Tokens"];export{r as Tokens,m as __namedExportsOrder,h as default};
