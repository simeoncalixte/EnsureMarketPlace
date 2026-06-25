import { BrowserRouter } from 'react-router';
import { AppRoutes } from './AppRoutes';
import { GlobalChatProvider } from './app-sections/GlobalChat';
import { ThemeProvider } from './xds/theme';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <GlobalChatProvider>
          <AppRoutes />
        </GlobalChatProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export { AppRoutes } from './AppRoutes';
