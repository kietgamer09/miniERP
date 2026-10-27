import { useContext } from 'react';
import { ThemeContext } from '../context/appContexts';

export function useTheme() { return useContext(ThemeContext); }
