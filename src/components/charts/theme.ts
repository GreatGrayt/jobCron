// Theme type for Nivo charts
interface NivoTheme {
  background?: string;
  text?: {
    fontSize?: number;
    fill?: string;
    fontFamily?: string;
  };
  axis?: {
    domain?: { line?: { stroke?: string; strokeWidth?: number } };
    ticks?: { line?: { stroke?: string; strokeWidth?: number }; text?: { fill?: string; fontSize?: number } };
    legend?: { text?: { fill?: string; fontSize?: number; fontWeight?: number } };
  };
  grid?: { line?: { stroke?: string; strokeWidth?: number } };
  legends?: { text?: { fill?: string; fontSize?: number } };
  tooltip?: { container?: Record<string, unknown> };
  labels?: { text?: { fill?: string; fontSize?: number } };
}

// Theme-aware color palette
export const DARK_THEME_COLORS = {
  bg: '#0a0e1a',
  bgSecondary: '#0f1419',
  border: '#1a2332',
  accent: '#00d4ff',
  accentSecondary: '#00ff88',
  text: '#e5e7eb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
};

export const LIGHT_THEME_COLORS = {
  bg: '#f8fafc',
  bgSecondary: '#f1f5f9',
  border: '#e2e8f0',
  accent: '#2563eb',
  accentSecondary: '#059669',
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#64748b',
};

// Helper to detect current theme
export const getThemeColors = (): typeof DARK_THEME_COLORS => {
  if (typeof window === 'undefined') return DARK_THEME_COLORS;
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS;
};

// Bloomberg terminal color palette (works in both themes)
export const CHART_COLORS = [
  '#00d4ff', // Primary cyan
  '#00ff88', // Success green
  '#ffcc00', // Warning yellow
  '#ff6b6b', // Error red
  '#9d4edd', // Purple
  '#06ffa5', // Bright green
  '#ff006e', // Magenta
  '#4cc9f0', // Light cyan
];

// Theme-aware chart colors for light mode
export const CHART_COLORS_LIGHT = [
  '#2563eb', // Primary blue
  '#059669', // Success green
  '#d97706', // Warning amber
  '#dc2626', // Error red
  '#7c3aed', // Purple
  '#10b981', // Emerald
  '#db2777', // Pink
  '#0891b2', // Cyan
];

// Get theme-aware chart colors
export const getChartColors = (): string[] => {
  if (typeof window === 'undefined') return CHART_COLORS;
  const theme = document.documentElement.getAttribute('data-theme');
  return theme === 'light' ? CHART_COLORS_LIGHT : CHART_COLORS;
};

// Shared Nivo theme matching Bloomberg terminal aesthetic
export const bloombergTheme: NivoTheme = {
  background: 'transparent',
  text: {
    fontSize: 11,
    fill: '#9ca3af',
    fontFamily: "'Courier New', monospace",
  },
  axis: {
    domain: {
      line: { stroke: '#1a2332', strokeWidth: 1 },
    },
    ticks: {
      line: { stroke: '#1a2332', strokeWidth: 1 },
      text: { fill: '#6b7280', fontSize: 10 },
    },
    legend: {
      text: { fill: '#00d4ff', fontSize: 11, fontWeight: 700 },
    },
  },
  grid: {
    line: { stroke: '#1a2332', strokeWidth: 1 },
  },
  legends: {
    text: { fill: '#9ca3af', fontSize: 10 },
  },
  tooltip: {
    container: {
      background: '#0a0e1a',
      border: '1px solid #00d4ff',
      fontSize: 11,
      fontFamily: "'Courier New', monospace",
      padding: '8px 12px',
      borderRadius: '4px',
    },
  },
  labels: {
    text: { fill: '#e5e7eb', fontSize: 10 },
  },
};

// Get theme-aware Nivo theme
export const getBloombergTheme = (): NivoTheme => {
  const colors = getThemeColors();
  return {
    background: 'transparent',
    text: {
      fontSize: 11,
      fill: colors.textSecondary,
      fontFamily: "'Courier New', monospace",
    },
    axis: {
      domain: {
        line: { stroke: colors.border, strokeWidth: 1 },
      },
      ticks: {
        line: { stroke: colors.border, strokeWidth: 1 },
        text: { fill: colors.textMuted, fontSize: 10 },
      },
      legend: {
        text: { fill: colors.accent, fontSize: 11, fontWeight: 700 },
      },
    },
    grid: {
      line: { stroke: colors.border, strokeWidth: 1 },
    },
    legends: {
      text: { fill: colors.textSecondary, fontSize: 10 },
    },
    tooltip: {
      container: {
        background: colors.bg,
        border: `1px solid ${colors.accent}`,
        fontSize: 11,
        fontFamily: "'Courier New', monospace",
        padding: '8px 12px',
        borderRadius: '4px',
      },
    },
    labels: {
      text: { fill: colors.text, fontSize: 10 },
    },
  };
};

// Tooltip component style for custom tooltips
export const tooltipStyle = {
  background: '#0a0e1a',
  border: '1px solid #00d4ff',
  padding: '8px 12px',
  fontSize: 11,
  fontFamily: "'Courier New', monospace",
  borderRadius: '4px',
  boxShadow: '0 4px 12px rgba(0, 212, 255, 0.3)',
};

// Get theme-aware tooltip style
export const getTooltipStyle = () => {
  const colors = getThemeColors();
  return {
    background: colors.bg,
    border: `1px solid ${colors.accent}`,
    padding: '8px 12px',
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
    borderRadius: '4px',
    boxShadow: `0 4px 12px ${colors.accent}40`,
  };
};

// Get color by index with wraparound
export const getChartColor = (index: number): string => {
  return CHART_COLORS[index % CHART_COLORS.length];
};

// Get theme-aware color by index
export const getThemeChartColor = (index: number): string => {
  const colors = getChartColors();
  return colors[index % colors.length];
};
