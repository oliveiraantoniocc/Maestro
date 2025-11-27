/**
 * ThemeProvider component for Maestro web interface
 *
 * Provides theme context to web components. Accepts theme via props
 * (typically received from WebSocket connection to desktop app).
 * Automatically injects CSS custom properties for theme colors.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import type { Theme, ThemeColors } from '../../shared/theme-types';
import { injectCSSProperties, removeCSSProperties } from '../utils/cssCustomProperties';

/**
 * Context value containing the current theme and utility functions
 */
interface ThemeContextValue {
  /** Current theme object */
  theme: Theme;
  /** Whether the theme is a light theme */
  isLight: boolean;
  /** Whether the theme is a dark theme */
  isDark: boolean;
  /** Whether the theme is a vibe theme */
  isVibe: boolean;
}

/**
 * Default theme used when no theme is provided
 * Matches the Dracula theme from the desktop app
 */
const defaultTheme: Theme = {
  id: 'dracula',
  name: 'Dracula',
  mode: 'dark',
  colors: {
    bgMain: '#0b0b0d',
    bgSidebar: '#111113',
    bgActivity: '#1c1c1f',
    border: '#27272a',
    textMain: '#e4e4e7',
    textDim: '#a1a1aa',
    accent: '#6366f1',
    accentDim: 'rgba(99, 102, 241, 0.2)',
    accentText: '#a5b4fc',
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
  },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  /** Theme object to provide to children. If not provided, uses default theme. */
  theme?: Theme;
  /** Children components that will have access to the theme */
  children: React.ReactNode;
}

/**
 * ThemeProvider component that provides theme context to the component tree
 *
 * @example
 * ```tsx
 * // With theme from WebSocket
 * <ThemeProvider theme={themeFromServer}>
 *   <App />
 * </ThemeProvider>
 *
 * // Using the context in a child component
 * const { theme, isDark } = useTheme();
 * ```
 */
export function ThemeProvider({ theme = defaultTheme, children }: ThemeProviderProps) {
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isLight: theme.mode === 'light',
      isDark: theme.mode === 'dark',
      isVibe: theme.mode === 'vibe',
    }),
    [theme]
  );

  // Inject CSS custom properties whenever the theme changes
  useEffect(() => {
    injectCSSProperties(theme);

    // Cleanup on unmount
    return () => {
      removeCSSProperties();
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme context
 *
 * @throws Error if used outside of a ThemeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { theme, isDark } = useTheme();
 *   return (
 *     <div style={{ backgroundColor: theme.colors.bgMain }}>
 *       {isDark ? 'Dark mode' : 'Light mode'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Hook to access just the theme colors for convenience
 *
 * @throws Error if used outside of a ThemeProvider
 *
 * @example
 * ```tsx
 * function Button() {
 *   const colors = useThemeColors();
 *   return (
 *     <button style={{
 *       backgroundColor: colors.accent,
 *       color: colors.accentText
 *     }}>
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();
  return theme.colors;
}

export { ThemeContext };
export type { ThemeContextValue };
