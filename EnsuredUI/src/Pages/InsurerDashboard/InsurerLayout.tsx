import React from 'react'
import { Outlet } from 'react-router'
import SideBarNav from '../../xds/components/SideBarNav'
import TopBarNav from '../../xds/components/TopBarNav'
import { insurerSidebar } from './sidebarConfig'
import * as S from './InsurerDashboard.styles'

export default function InsurerLayout() {
  return (
    <S.PageWrapper>
      <SideBarNav items={insurerSidebar} title="Insurer" subtitle="Insurer Dashboard" />

      <S.Main>
        <TopBarNav />
        <Outlet />
      </S.Main>
    </S.PageWrapper>
  )
}
