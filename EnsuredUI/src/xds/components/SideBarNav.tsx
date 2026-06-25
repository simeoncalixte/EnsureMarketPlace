import React from 'react';
import SideNavBar from './SideNavBar';
import type { NavItem } from './Navigation';

// Shared app-level side navigation abstraction that delegates to XDS SideNavBar.
export const SideBarNav: React.FC<{ items?: NavItem[]; title?: string; subtitle?: string; isOpen?: boolean; layoutMode?: 'overlay' | 'grid'; onRequestClose?: () => void; onLogout?: () => void; loading?: boolean; footerSlot?: React.ReactNode }> = ({ items, title, subtitle, isOpen, layoutMode, onRequestClose, onLogout, loading, footerSlot }) => (
	<SideNavBar items={items} title={title} subtitle={subtitle} isOpen={isOpen} layoutMode={layoutMode} onRequestClose={onRequestClose} onLogout={onLogout} loading={loading} footerSlot={footerSlot} />
);

export default SideBarNav;
