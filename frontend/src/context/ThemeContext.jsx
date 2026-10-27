import { useEffect, useState } from 'react';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import viVN from 'antd/es/locale/vi_VN';

import { ThemeContext } from './appContexts';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('miniErpTheme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    try { localStorage.setItem('miniErpTheme', mode); } catch { /* Vẫn dùng trong phiên hiện tại. */ }
  }, [mode]);

  return <ThemeContext.Provider value={{ mode, toggleTheme: () => setMode(value => value === 'dark' ? 'light' : 'dark') }}>
    <ConfigProvider locale={viVN} theme={{ algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  </ThemeContext.Provider>;
}

