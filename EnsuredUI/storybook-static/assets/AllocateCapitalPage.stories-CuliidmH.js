import{j as a}from"./jsx-runtime-BjG_zV1W.js";import{r as c}from"./index-B3TfwC44.js";import{A as g}from"./AllocateCapitalPage-JhBHyoz1.js";import"./api-2uxkEE_U.js";import"./styled-components.browser.esm-DDkbN7W9.js";const m=(async()=>{var t,l;try{const r=((l=(t=import.meta)==null?void 0:t.env)==null?void 0:l.VITE_API_BASE)??"",o=(r?String(r).replace(/\/$/,""):"")+"/api/marketplace/opportunities/active-pending-funding",s=await fetch(o);if(!s.ok)return[];const e=await s.json();return Array.isArray(e)?Array.from(new Set(e.map(n=>n.dealId))).slice(0,20):[]}catch{return[]}})(),D={title:"Pages/Marketplace/AllocateCapitalPage",component:g,parameters:{layout:"fullscreen"},argTypes:{initialTrancheId:{control:{type:"select"},options:["senior-a1","mezzanine-b2","equity"],description:"Select the tranche id currently in view"},apiBase:{control:{type:"text"},description:"API base URL (overrides same-origin). Use e.g. http://localhost:3001",table:{defaultValue:{summary:"http://localhost:3001"}}}}},f=t=>{const[l,r]=c.useState([]),[o,s]=c.useState(t.initialPoolId);return c.useEffect(()=>{try{window.__API_BASE__=t.apiBase??""}catch{}},[t.apiBase]),c.useEffect(()=>{let e=!1;return m.then(n=>{e||(r(n),n.length>0&&o===void 0&&s(n[0]))}),()=>{e=!0}},[t.apiBase]),a.jsxs("div",{style:{padding:12},children:[a.jsxs("div",{style:{marginBottom:12},children:[a.jsx("label",{style:{marginRight:8,fontWeight:700},children:"Select Deal ID:"}),a.jsxs("select",{value:String(o??""),onChange:e=>s(e.target.value),children:[a.jsx("option",{value:"",children:"(none)"}),l.map(e=>a.jsx("option",{value:String(e),children:String(e)},String(e)))]})]}),a.jsx(g,{...t,initialPoolId:1})]})},i=f.bind({});i.args={initialTrancheId:"mezzanine-b2",initialPoolId:1};var d,p,u;i.parameters={...i.parameters,docs:{...(d=i.parameters)==null?void 0:d.docs,source:{originalSource:`args => {
  const [dealIds, setDealIds] = useState<Array<number | string>>([]);
  const [selectedDeal, setSelectedDeal] = useState<number | string | undefined>(args.initialPoolId);
  useEffect(() => {
    // set runtime API base from story arg so page uses that host
    try {
      (window as any).__API_BASE__ = args.apiBase ?? '';
    } catch (e) {
      // ignore in non-browser environments
    }
  }, [args.apiBase]);
  useEffect(() => {
    let cancelled = false;
    preloadedDealIdsPromise.then(ids => {
      if (cancelled) return;
      setDealIds(ids);
      if (ids.length > 0 && selectedDeal === undefined) setSelectedDeal(ids[0]);
    });
    return () => {
      cancelled = true;
    };
  }, [args.apiBase]);
  return <div style={{
    padding: 12
  }}>
      <div style={{
      marginBottom: 12
    }}>
        <label style={{
        marginRight: 8,
        fontWeight: 700
      }}>Select Deal ID:</label>
        <select value={String(selectedDeal ?? '')} onChange={e => setSelectedDeal(e.target.value)}>
          <option value="">(none)</option>
          {dealIds.map(d => <option key={String(d)} value={String(d)}>{String(d)}</option>)}
        </select>
      </div>
      <AllocateCapitalPage {...args} initialPoolId={1} />
    </div>;
}`,...(u=(p=i.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};const A=["Default"];export{i as Default,A as __namedExportsOrder,D as default};
