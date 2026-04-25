import React from 'react';
import {
  Page,
  Main,
} from './AdminPage.styles';

import SeedingPanel from './SeedingPanel';

export default function AdminSeedPage() {
  return (
    <Page>
      <Main>
        <SeedingPanel />
      </Main>
    </Page>
  );
}
