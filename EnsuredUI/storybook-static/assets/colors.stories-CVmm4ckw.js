import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{c as a}from"./colors-CWt0Ylu9.js";const v={title:"XDS/Design Tokens/Colors"},s=({label:r,value:n})=>e.jsxs("div",{style:{display:"flex",gap:12,alignItems:"center",marginBottom:8},children:[e.jsx("div",{style:{width:96,height:32,background:n,borderRadius:6,boxShadow:"inset 0 0 0 1px rgba(0,0,0,0.12)"}}),e.jsxs("div",{style:{fontFamily:"Inter, system-ui, sans-serif",color:"var(--text-primary)"},children:[e.jsx("div",{style:{fontSize:13},children:r}),e.jsx("div",{style:{fontSize:12,color:"var(--text-secondary)"},children:n})]})]}),l=()=>e.jsxs("div",{style:{padding:20,background:"var(--bg)",minHeight:"100vh"},children:[e.jsx("h2",{style:{color:"var(--text-primary)"},children:"Brand"}),e.jsx("div",{children:Object.entries(a.brand).map(([r,n])=>e.jsx(s,{label:`brand.${r}`,value:n},`brand-${r}`))}),e.jsx("h2",{style:{color:"var(--text-primary)",marginTop:20},children:"Neutral"}),e.jsx("div",{children:Object.entries(a.neutral).map(([r,n])=>e.jsx(s,{label:`neutral.${r}`,value:n},`neutral-${r}`))}),e.jsx("h2",{style:{color:"var(--text-primary)",marginTop:20},children:"Semantic"}),e.jsxs("div",{children:[e.jsx(s,{label:"success",value:a.success}),e.jsx(s,{label:"info",value:a.info}),e.jsx(s,{label:"warning",value:a.warning}),e.jsx(s,{label:"danger",value:a.danger})]})]});l.__docgenInfo={description:"",methods:[],displayName:"Colors"};var t,i,o;l.parameters={...l.parameters,docs:{...(t=l.parameters)==null?void 0:t.docs,source:{originalSource:`() => {
  return <div style={{
    padding: 20,
    background: 'var(--bg)',
    minHeight: '100vh'
  }}>
      <h2 style={{
      color: 'var(--text-primary)'
    }}>Brand</h2>
      <div>
        {Object.entries(colors.brand).map(([k, v]) => <Swatch key={\`brand-\${k}\`} label={\`brand.\${k}\`} value={v} />)}
      </div>

      <h2 style={{
      color: 'var(--text-primary)',
      marginTop: 20
    }}>Neutral</h2>
      <div>
        {Object.entries(colors.neutral).map(([k, v]) => <Swatch key={\`neutral-\${k}\`} label={\`neutral.\${k}\`} value={v} />)}
      </div>

      <h2 style={{
      color: 'var(--text-primary)',
      marginTop: 20
    }}>Semantic</h2>
      <div>
        <Swatch label="success" value={colors.success} />
        <Swatch label="info" value={colors.info} />
        <Swatch label="warning" value={colors.warning} />
        <Swatch label="danger" value={colors.danger} />
      </div>
    </div>;
}`,...(o=(i=l.parameters)==null?void 0:i.docs)==null?void 0:o.source}}};const m=["Colors"];export{l as Colors,m as __namedExportsOrder,v as default};
