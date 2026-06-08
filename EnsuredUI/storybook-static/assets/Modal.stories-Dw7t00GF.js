import{j as e}from"./jsx-runtime-BjG_zV1W.js";import{r as l}from"./index-B3TfwC44.js";import{M as r}from"./Modal-BflAQ_kP.js";import{B as c}from"./Button-BdN1JsLa.js";import{c as d}from"./colors-BpeaZ3Jo.js";import"./tokens-C6qfnSfg.js";const g={title:"XDS/Modal",component:r},n=()=>{const[i,t]=l.useState(!0);return e.jsxs(e.Fragment,{children:[e.jsx(c,{onClick:()=>t(!0),children:"Open"}),e.jsx(r,{open:i,onClose:()=>t(!1),title:"Review Capital Deployment",children:e.jsxs("div",{style:{display:"grid",gap:12},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"var(--text-secondary)"},children:"Asset Class"}),e.jsx("span",{style:{fontWeight:700},children:"Catastrophe Bond Series A"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"var(--text-secondary)"},children:"Allocated Principal"}),e.jsx("span",{style:{fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",fontWeight:700},children:"$2,500,000.00"})]}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:"var(--text-secondary)"},children:"Gas Limit (Projected)"}),e.jsx("span",{style:{color:"var(--text-secondary)",fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"},children:"0.0014 ETH"})]}),e.jsx("div",{style:{background:"rgba(11,18,32,0.6)",padding:12,borderRadius:8,borderLeft:`2px solid ${d.brand[500]}`,fontSize:12,color:"var(--text-secondary)"},children:"By confirming, you agree to the Sovereign Re Master Participation Agreement and acknowledge the risk coefficients defined in the smart contract."})]})})]})};n.__docgenInfo={description:"",methods:[],displayName:"Default"};var o,s,a;n.parameters={...n.parameters,docs:{...(o=n.parameters)==null?void 0:o.docs,source:{originalSource:`() => {
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
}`,...(a=(s=n.parameters)==null?void 0:s.docs)==null?void 0:a.source}}};const v=["Default"];export{n as Default,v as __namedExportsOrder,g as default};
