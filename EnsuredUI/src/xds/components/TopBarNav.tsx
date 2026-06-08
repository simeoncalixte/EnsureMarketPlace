import React from 'react';
import type { AuthUser } from '../../lib/useAuthMe';
import TopNavBar from './TopNavBar';

// Shared app-level top navigation abstraction that delegates to XDS TopNavBar.
export const TopBarNav: React.FC<{ isSidebarOpen?: boolean; onToggleSidebar?: () => void; user?: AuthUser | null }> = ({ isSidebarOpen, onToggleSidebar, user }) => <TopNavBar isSidebarOpen={isSidebarOpen} onToggleSidebar={onToggleSidebar} user={user} />;

export default TopBarNav;
