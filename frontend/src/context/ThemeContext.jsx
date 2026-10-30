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
      token: { colorPrimary: mode === 'dark' ? '#8fa2ca' : '#315de8', borderRadius: 8, controlHeight: 40,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        colorText: mode === 'dark' ? '#e0e3e6' : '#242b38',
        colorTextSecondary: mode === 'dark' ? '#a6adb5' : '#626e80',
        colorBorder: mode === 'dark' ? '#383d43' : '#dce1ea' },
      components: {
        Menu: { itemSelectedBg: mode === 'dark' ? '#293142' : '#eef1ff',
          itemSelectedColor: mode === 'dark' ? '#b4c2df' : '#315de8', itemHeight: 40, itemMarginBlock: 8 },
        Table: { headerBg: mode === 'dark' ? '#25292e' : '#f5f6f8', headerColor: mode === 'dark' ? '#a6adb5' : '#58667c',
          borderColor: mode === 'dark' ? '#383d43' : '#e8ecf2', cellPaddingBlock: 12, cellPaddingInline: 24 },
        Card: { borderRadiusLG: 12 }, Button: { primaryShadow: 'none', defaultShadow: 'none' },
      },
    }}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  </ThemeContext.Provider>;
}

