import styled from 'styled-components';

// ─── Admin table page-local composites ───────────────────────────────────────
// Built from xds primitives + tokens. NOT design-system primitives, so they
// live here in the area styles instead of src/xds.

/** Header row that pairs a SectionHeader/title with a right-aligned link/export. */
export const PanelHeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

/** Container for the cluster of actions on the right side of a panel header. */
export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/** Cell content emphasised as a primary/identifier value. */
export const PrimaryCell = styled.span`
  font-weight: 700;
`;

/** Right-aligned cluster for per-row action buttons. */
export const RowActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`;

/** Back-navigation cluster: back button + title sitting on the panel header. */
export const BackNav = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;
