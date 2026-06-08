import{j as t}from"./jsx-runtime-BjG_zV1W.js";import{r as l}from"./index-B3TfwC44.js";import{C as c}from"./ConnectedGrid-mgqUdqx5.js";import{B as j}from"./Badge-BMblvUa5.js";import{B as h}from"./Button-BdN1JsLa.js";import{I as P}from"./InfoCard-DAfGRKKS.js";import{M as O}from"./MetricCard-B0DT9GYr.js";import"./colors-BpeaZ3Jo.js";import"./tokens-C6qfnSfg.js";const J={title:"XDS/ConnectedGrid",component:c},s=()=>{const[i,a]=l.useState({columns:3,rows:3});return t.jsx("div",{style:{maxWidth:760},children:t.jsx(c,{settings:i,onSettingsChange:a})})},C="connected-grid-story-layout-v1",y=[{id:"risk-badge",title:"Risk Badge",render:()=>t.jsx(j,{variant:"primary",children:"Risk Watch"})},{id:"orders-card",title:"Metric Card",render:()=>t.jsx(O,{label:"Pending Orders",value:"17",delta:"+3 this hour"})},{id:"capital-card",title:"Info Card",render:()=>t.jsx(P,{title:"Capital Buffer",value:"$2.4M",tone:"secondary"})},{id:"action-button",title:"Action Button",render:()=>t.jsx(h,{variant:"primary",children:"Run Rebalance"})}],R=()=>{if(typeof window>"u")return{};try{const i=window.localStorage.getItem(C);if(!i)return{};const a=JSON.parse(i);return!a||typeof a!="object"?{}:a}catch{return{}}},o=()=>{const[i,a]=l.useState({columns:4,rows:3}),[d,x]=l.useState(()=>R()),g=e=>{x(e),typeof window<"u"&&window.localStorage.setItem(C,JSON.stringify(e))},p=(e,n)=>{e.dataTransfer.setData("application/json",JSON.stringify(n)),e.dataTransfer.effectAllowed="move"},b=(e,n)=>{e.preventDefault();const r=e.dataTransfer.getData("application/json");if(r)try{const u=JSON.parse(r);if(!u.widgetId)return;g({...d,[u.widgetId]:n})}catch{return}},I=()=>{g({})};return t.jsxs("div",{style:{maxWidth:960,display:"grid",gap:16},children:[t.jsxs("div",{style:{display:"flex",flexWrap:"wrap",gap:12},children:[y.map(e=>{const n=d[e.id];return t.jsxs("div",{draggable:!0,onDragStart:r=>p(r,{widgetId:e.id}),style:{cursor:"grab",border:"1px dashed rgba(148,163,184,0.45)",borderRadius:10,padding:10,minWidth:180,background:"rgba(15, 23, 38, 0.45)"},children:[t.jsxs("div",{style:{fontSize:11,marginBottom:8,opacity:.78},children:[e.title,n?` (placed at ${n})`:" (drag into a cell)"]}),e.render()]},e.id)}),t.jsx(h,{variant:"ghost",onClick:I,children:"Clear Saved Layout"})]}),t.jsx(c,{title:"ConnectedGrid - Drag and Drop Playground",settings:i,onSettingsChange:a,renderCell:({cellKey:e})=>{const n=y.find(r=>d[r.id]===e);return t.jsx("div",{onDragOver:r=>r.preventDefault(),onDrop:r=>b(r,e),style:{width:"100%",minHeight:84,display:"flex",alignItems:"center",justifyContent:"center",padding:8,borderRadius:8,background:n?"rgba(11, 18, 32, 0.65)":"rgba(148,163,184,0.08)"},children:n?t.jsx("div",{draggable:!0,onDragStart:r=>p(r,{widgetId:n.id}),style:{width:"100%",cursor:"grab",display:"flex",justifyContent:"center"},children:n.render()}):t.jsxs("span",{style:{fontSize:10,opacity:.75},children:["Drop Here (",e,")"]})})}})]})};s.__docgenInfo={description:"",methods:[],displayName:"Default"};o.__docgenInfo={description:"",methods:[],displayName:"DragDropWithLocalPersistence"};var f,m,v;s.parameters={...s.parameters,docs:{...(f=s.parameters)==null?void 0:f.docs,source:{originalSource:`() => {
  const [settings, setSettings] = useState<ConnectedGridSettings>({
    columns: 3,
    rows: 3
  });
  return <div style={{
    maxWidth: 760
  }}>
      <ConnectedGrid settings={settings} onSettingsChange={setSettings} />
    </div>;
}`,...(v=(m=s.parameters)==null?void 0:m.docs)==null?void 0:v.source}}};var S,D,w;o.parameters={...o.parameters,docs:{...(S=o.parameters)==null?void 0:S.docs,source:{originalSource:`() => {
  const [settings, setSettings] = useState<ConnectedGridSettings>({
    columns: 4,
    rows: 3
  });
  const [positions, setPositions] = useState<Record<string, string>>(() => getSavedPositions());
  const persistPositions = (nextPositions: Record<string, string>) => {
    setPositions(nextPositions);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DND_STORAGE_KEY, JSON.stringify(nextPositions));
    }
  };
  const onDragStart = (event: React.DragEvent<HTMLElement>, payload: DragPayload) => {
    event.dataTransfer.setData('application/json', JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };
  const onDropOnCell = (event: React.DragEvent<HTMLDivElement>, cellKey: string) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData('application/json');
    if (!raw) {
      return;
    }
    try {
      const payload = JSON.parse(raw) as DragPayload;
      if (!payload.widgetId) {
        return;
      }
      persistPositions({
        ...positions,
        [payload.widgetId]: cellKey
      });
    } catch {
      return;
    }
  };
  const clearLayout = () => {
    persistPositions({});
  };
  return <div style={{
    maxWidth: 960,
    display: 'grid',
    gap: 16
  }}>
      <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12
    }}>
        {WIDGETS.map(widget => {
        const assignedCell = positions[widget.id];
        return <div key={widget.id} draggable onDragStart={event => onDragStart(event, {
          widgetId: widget.id
        })} style={{
          cursor: 'grab',
          border: '1px dashed rgba(148,163,184,0.45)',
          borderRadius: 10,
          padding: 10,
          minWidth: 180,
          background: 'rgba(15, 23, 38, 0.45)'
        }}>
              <div style={{
            fontSize: 11,
            marginBottom: 8,
            opacity: 0.78
          }}>
                {widget.title}
                {assignedCell ? \` (placed at \${assignedCell})\` : ' (drag into a cell)'}
              </div>
              {widget.render()}
            </div>;
      })}

        <Button variant="ghost" onClick={clearLayout}>
          Clear Saved Layout
        </Button>
      </div>

      <ConnectedGrid title="ConnectedGrid - Drag and Drop Playground" settings={settings} onSettingsChange={setSettings} renderCell={({
      cellKey
    }) => {
      const widgetInCell = WIDGETS.find(widget => positions[widget.id] === cellKey);
      return <div onDragOver={event => event.preventDefault()} onDrop={event => onDropOnCell(event, cellKey)} style={{
        width: '100%',
        minHeight: 84,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        borderRadius: 8,
        background: widgetInCell ? 'rgba(11, 18, 32, 0.65)' : 'rgba(148,163,184,0.08)'
      }}>
              {widgetInCell ? <div draggable onDragStart={event => onDragStart(event, {
          widgetId: widgetInCell.id
        })} style={{
          width: '100%',
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'center'
        }}>
                  {widgetInCell.render()}
                </div> : <span style={{
          fontSize: 10,
          opacity: 0.75
        }}>Drop Here ({cellKey})</span>}
            </div>;
    }} />
    </div>;
}`,...(w=(D=o.parameters)==null?void 0:D.docs)==null?void 0:w.source}}};const H=["Default","DragDropWithLocalPersistence"];export{s as Default,o as DragDropWithLocalPersistence,H as __namedExportsOrder,J as default};
