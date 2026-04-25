import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as m}from"./index-B3TfwC44.js";import{z as x,r as d,s as t}from"./tokens-C6qfnSfg.js";import{c as n}from"./colors-CWt0Ylu9.js";import{B as f}from"./Button-D4SNBHNz.js";const i=({open:s,title:r,onClose:a,children:u,footer:l})=>s?e.jsx("div",{role:"dialog","aria-modal":"true",style:{position:"fixed",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(2,6,23,0.6)",zIndex:x.modal},onClick:a,children:e.jsxs("div",{onClick:g=>g.stopPropagation(),style:{width:"min(640px, 94%)",background:n.surface,color:n.text.primary,borderRadius:d.lg,border:"1px solid rgba(148,163,184,0.2)",boxShadow:"0 40px 40px rgba(173,198,255,0.12)"},children:[e.jsxs("div",{style:{padding:t.lg-8,borderBottom:"1px solid rgba(148,163,184,0.15)",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("h3",{style:{margin:0,fontSize:20,fontWeight:700,color:n.text.primary},children:r}),e.jsx("button",{"aria-label":"Close",onClick:a,style:{background:"transparent",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer"},children:"✕"})]}),e.jsx("div",{style:{padding:t.xl-8,display:"block",gap:t.md},children:e.jsx("div",{style:{marginBottom:t.md},children:u})}),e.jsx("div",{style:{padding:t.md,background:"rgba(11,18,32,0.5)",display:"flex",gap:12},children:l||e.jsxs(e.Fragment,{children:[e.jsx("button",{style:{flex:1,padding:"12px 16px",background:"transparent",border:"none",color:n.text.secondary,fontWeight:600,cursor:"pointer"},onClick:a,children:"Cancel"}),e.jsx("button",{style:{flex:1,padding:"12px 16px",background:n.brand[500],border:"none",color:"#fff",borderRadius:d.sm,fontWeight:700,cursor:"pointer"},children:"Confirm Transaction"})]})})]})}):null;i.__docgenInfo={description:"",methods:[],displayName:"Modal",props:{open:{required:!0,tsType:{name:"boolean"},description:""},title:{required:!1,tsType:{name:"string"},description:""},onClose:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},footer:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};const M={title:"XDS/Modal",component:i},o=()=>{const[s,r]=m.useState(!0);return e.jsxs(e.Fragment,{children:[e.jsx(f,{onClick:()=>r(!0),children:"Open"}),e.jsx(i,{open:s,onClose:()=>r(!1),title:"Review Capital Deployment",children:e.jsxs("div",{style:{display:"grid",gap:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"var(--text-secondary)"},children:"Asset Class"}),e.jsx("span",{style:{fontWeight:700},children:"Catastrophe Bond Series A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"var(--text-secondary)"},children:"Allocated Principal"}),e.jsx("span",{style:{fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",fontWeight:700},children:"$2,500,000.00"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"var(--text-secondary)"},children:"Gas Limit (Projected)"}),e.jsx("span",{style:{color:"var(--text-secondary)",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"},children:"0.0014 ETH"})]}),e.jsx("div",{style:{background:"rgba(11,18,32,0.6)",padding:12,borderRadius:8,borderLeft:`2px solid ${n.brand[500]}`,fontSize:12,color:"var(--text-secondary)"},children:"By confirming, you agree to the Sovereign Re Master Participation Agreement and acknowledge the risk coefficients defined in the smart contract."})]})})]})};o.__docgenInfo={description:"",methods:[],displayName:"Default"};var c,p,y;o.parameters={...o.parameters,docs:{...(c=o.parameters)==null?void 0:c.docs,source:{originalSource:`() => {
  const [open, setOpen] = useState(true);
  return <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Review Capital Deployment">
        <div style={{
        display: 'grid',
        gap: 12
      }}>
          <div style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}>
            <span style={{
            color: 'var(--text-secondary)'
          }}>Asset Class</span>
            <span style={{
            fontWeight: 700
          }}>Catastrophe Bond Series A</span>
          </div>
          <div style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}>
            <span style={{
            color: 'var(--text-secondary)'
          }}>Allocated Principal</span>
            <span style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
            fontWeight: 700
          }}>$2,500,000.00</span>
          </div>
          <div style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}>
            <span style={{
            color: 'var(--text-secondary)'
          }}>Gas Limit (Projected)</span>
            <span style={{
            color: 'var(--text-secondary)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'
          }}>0.0014 ETH</span>
          </div>
          <div style={{
          background: 'rgba(11,18,32,0.6)',
          padding: 12,
          borderRadius: 8,
          borderLeft: \`2px solid \${colors.brand[500]}\`,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}>
            By confirming, you agree to the Sovereign Re Master Participation Agreement and acknowledge the risk coefficients defined in the smart contract.
          </div>
        </div>
      </Modal>
    </>;
}`,...(y=(p=o.parameters)==null?void 0:p.docs)==null?void 0:y.source}}};const w=["Default"];export{o as Default,w as __namedExportsOrder,M as default};
