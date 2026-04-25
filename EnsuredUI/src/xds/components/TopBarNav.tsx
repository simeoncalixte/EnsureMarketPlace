import React from 'react';
import TopNavBar from './TopNavBar';

// Shared app-level top navigation abstraction that delegates to XDS TopNavBar.
export const TopBarNav: React.FC<{ isSidebarOpen?: boolean; onToggleSidebar?: () => void }> = ({ isSidebarOpen, onToggleSidebar }) => <TopNavBar isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} />;

export default TopBarNav;
