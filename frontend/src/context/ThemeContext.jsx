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
    <ConfigProvider locale={viVN} theme={{
      algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: { colorPrimary: '#315de8', borderRadius: 8, controlHeight: 40,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        colorText: mode === 'dark' ? '#f0f0f0' : '#242b38',
        colorTextSecondary: mode === 'dark' ? '#bfbfbf' : '#788397',
        colorBorder: mode === 'dark' ? '#424242' : '#dce1ea' },
      components: {
        Menu: { itemSelectedBg: mode === 'dark' ? '#17254c' : '#eef1ff',
          itemSelectedColor: mode === 'dark' ? '#91aaff' : '#315de8', itemHeight: 40, itemMarginBlock: 8 },
        Table: { headerBg: mode === 'dark' ? '#202020' : '#f5f6f8', headerColor: mode === 'dark' ? '#bfbfbf' : '#58667c',
          borderColor: mode === 'dark' ? '#424242' : '#e8ecf2', cellPaddingBlock: 12, cellPaddingInline: 24 },
        Card: { borderRadiusLG: 12 }, Button: { primaryShadow: 'none', defaultShadow: 'none' },
      },
    }}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  </ThemeContext.Provider>;
}

