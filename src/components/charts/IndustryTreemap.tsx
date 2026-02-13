'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResponsiveTreeMap } from '@nivo/treemap';
import { getBloombergTheme, getChartColors, getThemeColors, getTooltipStyle } from './theme';

interface IndustryTreemapProps {
  data: Array<{ name: string; value: number }>;
  onIndustryClick: (industry: string) => void;
  activeFilters: string[];
}

export function IndustryTreemap({ data, onIndustryClick, activeFilters }: IndustryTreemapProps) {
  const [themeColors, setThemeColors] = useState(getThemeColors());
  const [chartColors, setChartColors] = useState(getChartColors());
  const [nivoTheme, setNivoTheme] = useState(getBloombergTheme());
  const [tooltipStyle, setTooltipStyle] = useState(getTooltipStyle());

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      setThemeColors(getThemeColors());
      setChartColors(getChartColors());
      setNivoTheme(getBloombergTheme());
      setTooltipStyle(getTooltipStyle());
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const treeData = useMemo(() => ({
    name: 'Industries',
    children: data.map((item, i) => ({
      name: item.name,
      value: item.value,
      color: activeFilters.includes(item.name)
        ? themeColors.accentSecondary
        : chartColors[i % chartColors.length],
    })),
  }), [data, activeFilters, themeColors.accentSecondary, chartColors]);

  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: themeColors.textMuted }}>
        No data available
      </div>
    );
  }

  return (
    <ResponsiveTreeMap
      data={treeData}
      identity="name"
      value="value"
      theme={nivoTheme}
      tile="squarify"
      leavesOnly={true}
      innerPadding={3}
      outerPadding={3}
      colors={{ datum: 'data.color' }}
      borderWidth={2}
      borderColor={themeColors.border}
      labelSkipSize={50}
      label={(node) => `${node.id}`}
      labelTextColor={themeColors.text}
      parentLabelTextColor={themeColors.accent}
      parentLabelSize={14}
      animate={true}
      motionConfig="gentle"
      onClick={(node) => {
        if (node.data.name && node.data.name !== 'Industries') {
          onIndustryClick(node.data.name);
        }
      }}
      tooltip={({ node }) => (
        <div style={tooltipStyle}>
          <strong style={{ color: themeColors.accent }}>{node.id}</strong>
          <br />
          <span style={{ color: themeColors.accentSecondary }}>{node.value} jobs</span>
          <br />
          <span style={{ color: themeColors.textMuted, fontSize: '9px' }}>Click to filter</span>
        </div>
      )}
    />
  );
}
