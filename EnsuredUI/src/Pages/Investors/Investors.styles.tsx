import styled from 'styled-components';

export const PageWrapper = styled.div`
  font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  color: #dae2fd;
  background: #0b1326;
`;

export const TopNav = styled.nav`
  position: fixed; top: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 1.5rem; height: 4rem; z-index:50;
  background: rgba(11,19,38,0.6); backdrop-filter: blur(12px);
`;

export const Brand = styled.div`
  display:flex; align-items:center; gap:1rem;
  .title { font-weight:800; color:#dae2fd; font-size:1.125rem; }
  a { color:#4b8eff; font-weight:700; text-decoration:none; margin-right:1rem }
`;

export const TopNavActions = styled.div`
  display:flex; align-items:center; gap:0.75rem;
  .search { background: rgba(33,39,61,0.9); padding:0.375rem 0.75rem; border-radius:6px; display:flex; align-items:center; gap:0.5rem; border:1px solid rgba(65,71,85,0.15); }
  input { background:transparent; border:0; outline:0; color:inherit; width:12rem }
  button { background:transparent; border:0; color:#9aa3bb; padding:0.375rem; border-radius:6px }
  img { width:2rem; height:2rem; border-radius:999px; object-fit:cover }
`;

export const SideNav = styled.aside`
  position: fixed; left:0; top:0; bottom:0; width:16rem; padding-top:5rem; background:#0b1326; border-right:1px solid rgba(65,71,85,0.15);
  display:flex; flex-direction:column; gap:1rem; padding-left:1.5rem; padding-right:1rem;
  .brand { margin-bottom:1rem }
  nav a { display:flex; align-items:center; gap:0.75rem; padding:0.75rem; color:#9aa3bb; border-left:0; text-decoration:none }
  nav a.active { background:#171f33; color:#4b8eff; border-left:4px solid #4b8eff }
`;

export const Main = styled.main`
  width: 100%;
  padding: 0;
  min-height: auto;
`;

export const Container = styled.div`
  max-width:1100px; margin:0 auto; display:block; gap:1.5rem;
`;

export const HeaderRow = styled.header`
  display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:1rem;
  h1 { font-size:2rem; margin:0 }
`;

export const Card = styled.section`
  background: #0f1724; border-radius:8px; border:1px solid rgba(65,71,85,0.08); overflow:hidden;
`;

export const TableWrap = styled.div`
  overflow-x:auto;
  table { width:100%; border-collapse:collapse; color:inherit }
  thead { background:#0b1220; color:#9aa3bb; font-size:0.625rem; text-transform:uppercase; letter-spacing:0.12em }
  th, td { padding:0.75rem 1rem; text-align:left; border-bottom:1px solid rgba(65,71,85,0.05) }
  tbody tr:hover { background:#111428 }
  .mono { font-family: 'JetBrains Mono', monospace }
`;

export const FooterBar = styled.footer`
  position: fixed; left:0; right:0; bottom:0; height:2rem; display:flex; align-items:center; justify-content:space-between; padding:0 1rem; background:#131b2e; border-top:1px solid rgba(65,71,85,0.15); color:#9aa3bb; font-size:0.75rem;
`;
