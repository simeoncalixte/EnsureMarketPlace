import React from 'react'
import { Outlet, useNavigate } from 'react-router'
import SideBarNav from '../../xds/components/SideBarNav'
import TopBarNav from '../../xds/components/TopBarNav'
import { insurerSidebar } from './sidebarConfig'
import { saveAuthToken } from '../../lib/auth'
import * as S from './InsurerDashboard.styles'

export default function InsurerLayout() {
  const navigate = useNavigate()

  const handleLogout = () => {
    saveAuthToken(null)
    navigate('/', { replace: true })
  }

  return (
    <S.PageWrapper>
      <SideBarNav items={insurerSidebar} title="Insurer" subtitle="Insurer Dashboard" onLogout={handleLogout} />

      <S.Main>
        <TopBarNav />
        <Outlet />
      </S.Main>
    </S.PageWrapper>
  )
}
