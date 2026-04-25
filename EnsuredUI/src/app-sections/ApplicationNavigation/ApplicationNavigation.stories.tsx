import React from 'react'
import type { Meta } from '@storybook/react'
import { InvestorNavigation, InsurerNavigation, AdminNavigation, AuthNavigation, UnderwritingNavigation,
  MarketplaceNavigation, OrdersNavigation, SecondaryMarketNavigation, NotificationsNavigation, DocumentsNavigation,
  IntegrationsNavigation, ReportsNavigation, TreasuryNavigation, SystemNavigation, OrganizationNavigation } from './index'

const meta: Meta = {
  title: 'AppSections/ApplicationNavigation'
}

export default meta

export const Investor = () => <InvestorNavigation />
export const Insurer = () => <InsurerNavigation />
export const Admin = () => <AdminNavigation />
export const Auth = () => <AuthNavigation />
export const Underwriting = () => <UnderwritingNavigation />
export const Marketplace = () => <MarketplaceNavigation />
export const Orders = () => <OrdersNavigation />
export const SecondaryMarket = () => <SecondaryMarketNavigation />
export const Notifications = () => <NotificationsNavigation />
export const Documents = () => <DocumentsNavigation />
export const Integrations = () => <IntegrationsNavigation />
export const Reports = () => <ReportsNavigation />
export const Treasury = () => <TreasuryNavigation />
export const System = () => <SystemNavigation />
export const Organization = () => <OrganizationNavigation />
