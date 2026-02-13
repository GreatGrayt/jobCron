'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { getThemeColors } from './charts/theme';

interface CountryData {
  name: string;
  value: number;
}

interface WorldMapProps {
  data: CountryData[];
  onCountryClick?: (countryName: string) => void;
  selectedCountry?: string | null;
}

// TopoJSON world map URL
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Map country names from data to names in the TopoJSON
const countryNameMapping: Record<string, string[]> = {
  'United States': ['United States of America', 'United States', 'USA'],
  'USA': ['United States of America', 'United States', 'USA'],
  'United Kingdom': ['United Kingdom', 'UK', 'Great Britain'],
  'UK': ['United Kingdom', 'UK', 'Great Britain'],
  'South Korea': ['South Korea', 'Korea, Republic of', 'Republic of Korea'],
  'North Korea': ['North Korea', 'Korea, Democratic People\'s Republic of'],
  'Czech Republic': ['Czech Republic', 'Czechia'],
  'Czechia': ['Czech Republic', 'Czechia'],
  'United Arab Emirates': ['United Arab Emirates', 'UAE'],
  'UAE': ['United Arab Emirates', 'UAE'],
  'Russia': ['Russia', 'Russian Federation'],
  'Vietnam': ['Vietnam', 'Viet Nam'],
  'Taiwan': ['Taiwan', 'Taiwan, Province of China'],
  'Hong Kong': ['Hong Kong', 'Hong Kong SAR China'],
  'Ivory Coast': ['Ivory Coast', 'Côte d\'Ivoire'],
  'Congo': ['Congo', 'Democratic Republic of the Congo', 'Congo, Democratic Republic of the'],
};

// Reverse mapping: from TopoJSON name to our data name
function normalizeCountryName(geoName: string, dataCountries: Set<string>): string | null {
  // Direct match
  if (dataCountries.has(geoName)) {
    return geoName;
  }

  // Check mappings
  for (const [dataName, aliases] of Object.entries(countryNameMapping)) {
    if (aliases.includes(geoName) && dataCountries.has(dataName)) {
      return dataName;
    }
  }

  // Try to find a partial match
  for (const dataName of dataCountries) {
    if (geoName.toLowerCase().includes(dataName.toLowerCase()) ||
        dataName.toLowerCase().includes(geoName.toLowerCase())) {
      return dataName;
    }
  }

  return null;
}

// Theme-aware color gradients
const DARK_GRADIENT = {
  empty: '#1a2332',
  stroke: '#2a3a4a',
  gradient: ['#024530', '#026745', '#038d5d', '#04b375', '#05d98d', '#06ffa5'],
  hover: '#08ffb8',
  accent: '#06ffa5',
};

const LIGHT_GRADIENT = {
  empty: '#e2e8f0',
  stroke: '#cbd5e1',
  gradient: ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669'],
  hover: '#047857',
  accent: '#059669',
};

function WorldMap({ data, onCountryClick, selectedCountry }: WorldMapProps) {
  const [tooltipContent, setTooltipContent] = useState<{ name: string; value: number } | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [themeColors, setThemeColors] = useState(getThemeColors());
  const [gradientColors, setGradientColors] = useState(DARK_GRADIENT);

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      const colors = getThemeColors();
      setThemeColors(colors);
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      setGradientColors(isLight ? LIGHT_GRADIENT : DARK_GRADIENT);
    };

    updateTheme();

    // Watch for theme attribute changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  // Create lookup maps
  const { countryValues, dataCountries, maxValue } = useMemo(() => {
    const values: Record<string, number> = {};
    const countries = new Set<string>();

    data.forEach(item => {
      values[item.name] = item.value;
      countries.add(item.name);

      // Also add aliases
      const aliases = countryNameMapping[item.name];
      if (aliases) {
        aliases.forEach(alias => {
          values[alias] = item.value;
        });
      }
    });

    const max = Math.max(...data.map(d => d.value), 1);

    return { countryValues: values, dataCountries: countries, maxValue: max };
  }, [data]);

  // Get color based on value with smooth gradient
  const getCountryColor = (value: number | undefined) => {
    if (value === undefined || value === 0) return gradientColors.empty;

    const intensity = value / maxValue;
    const gradient = gradientColors.gradient;
    // Color gradient from dark to bright
    if (intensity > 0.8) return gradient[5];
    if (intensity > 0.6) return gradient[4];
    if (intensity > 0.4) return gradient[3];
    if (intensity > 0.2) return gradient[2];
    if (intensity > 0.05) return gradient[1];
    return gradient[0];
  };

  const handleMouseMove = (
    e: React.MouseEvent,
    geoName: string,
    value: number | undefined
  ) => {
    if (value !== undefined && value > 0) {
      const dataName = normalizeCountryName(geoName, dataCountries) || geoName;
      setTooltipContent({ name: dataName, value });
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    setTooltipContent(null);
  };

  const handleClick = (geoName: string, value: number | undefined) => {
    if (value !== undefined && value > 0 && onCountryClick) {
      const dataName = normalizeCountryName(geoName, dataCountries);
      if (dataName) {
        onCountryClick(dataName);
      }
    }
  };

  return (
    <div className="world-map-container" style={{ position: 'relative', width: '100%', height: '100%', background: themeColors.bg, overflow: 'hidden' }}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 100,
          center: [10, 35],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName = geo.properties.name;
                const value = countryValues[geoName];
                const isSelected = selectedCountry && (
                  geoName === selectedCountry ||
                  normalizeCountryName(geoName, dataCountries) === selectedCountry
                );
                const hasData = value !== undefined && value > 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseMove={(e) => handleMouseMove(e, geoName, value)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick(geoName, value)}
                    style={{
                      default: {
                        fill: getCountryColor(value),
                        stroke: isSelected ? '#ffffff' : gradientColors.stroke,
                        strokeWidth: isSelected ? 1.5 : 0.3,
                        outline: 'none',
                        transition: 'fill 0.2s',
                        cursor: hasData ? 'pointer' : 'default',
                      },
                      hover: {
                        fill: hasData ? gradientColors.hover : getCountryColor(value),
                        stroke: hasData ? gradientColors.accent : gradientColors.stroke,
                        strokeWidth: hasData ? 1 : 0.3,
                        outline: 'none',
                        cursor: hasData ? 'pointer' : 'default',
                      },
                      pressed: {
                        fill: gradientColors.accent,
                        stroke: '#ffffff',
                        strokeWidth: 1,
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltipContent && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 45,
            backgroundColor: themeColors.bg,
            border: `1px solid ${gradientColors.accent}`,
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            color: themeColors.text,
            pointerEvents: 'none',
            zIndex: 1000,
            boxShadow: `0 4px 12px ${gradientColors.accent}40`,
          }}
        >
          <div style={{ color: gradientColors.accent, fontWeight: 'bold', marginBottom: '2px' }}>
            {tooltipContent.name}
          </div>
          <div>{tooltipContent.value.toLocaleString()} jobs</div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '6px',
          background: `${themeColors.bg}f2`,
          border: `1px solid ${gradientColors.stroke}`,
          padding: '5px 8px',
          borderRadius: '3px',
          fontSize: '9px',
        }}
      >
        <div style={{ color: gradientColors.accent, marginBottom: '3px', fontWeight: 'bold' }}>
          Jobs
        </div>
        <div
          style={{
            width: '80px',
            height: '6px',
            background: `linear-gradient(to right, ${gradientColors.gradient.join(', ')})`,
            borderRadius: '2px',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            color: themeColors.textMuted,
            marginTop: '2px',
            fontSize: '8px',
          }}
        >
          <span>0</span>
          <span>{maxValue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(WorldMap);
