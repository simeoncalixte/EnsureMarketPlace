import { BrowserRouter } from 'react-router';
import { AppRoutes } from './AppRoutes';
import { XdsThemeProvider } from './xds/theme';

export default function App() {
  return (
    <XdsThemeProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </XdsThemeProvider>
  );
}

export { AppRoutes } from './AppRoutes';
