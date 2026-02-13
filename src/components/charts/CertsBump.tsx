'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { getChartColors, getThemeColors } from './theme';

interface CertData {
  name: string;
  value: number;
}

interface CertsBumpProps {
  data: CertData[];
  onCertClick: (cert: string) => void;
  activeFilters: string[];
}

export function CertsBump({ data, onCertClick, activeFilters }: CertsBumpProps) {
  const [themeColors, setThemeColors] = useState(getThemeColors());
  const [chartColors, setChartColors] = useState(getChartColors());

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      setThemeColors(getThemeColors());
      setChartColors(getChartColors());
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: themeColors.textMuted }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const topData = data.slice(0, 10);

  return (
    <div style={{
      height: '100%',
      padding: '8px',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>
      {topData.map((item, i) => {
        const isActive = activeFilters.includes(item.name);
        const percentage = (item.value / maxValue) * 100;

        return (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onCertClick(item.name)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '6px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              background: isActive ? `${themeColors.accentSecondary}20` : 'transparent',
              border: isActive ? `1px solid ${themeColors.accentSecondary}` : '1px solid transparent',
            }}
          >
            {/* Rank badge */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: i < 3
                  ? `linear-gradient(135deg, ${['#ffcc00', '#c0c0c0', '#cd7f32'][i]} 0%, ${['#ffd700', '#e0e0e0', '#d4a373'][i]} 100%)`
                  : themeColors.border,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: i < 3 ? '#000' : themeColors.textMuted,
                border: `1px solid ${themeColors.border}`,
              }}
            >
              {i + 1}
            </motion.div>

            {/* Name */}
            <div style={{
              flex: '0 0 100px',
              fontSize: '10px',
              color: isActive ? themeColors.accentSecondary : themeColors.text,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {item.name}
            </div>

            {/* Progress bar */}
            <div style={{
              flex: 1,
              height: '12px',
              background: themeColors.border,
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ delay: i * 0.05 + 0.2, duration: 0.5, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: isActive
                    ? themeColors.accentSecondary
                    : `linear-gradient(90deg, ${chartColors[i % chartColors.length]} 0%, ${chartColors[i % chartColors.length]}80 100%)`,
                  borderRadius: '6px',
                }}
              />
            </div>

            {/* Count */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 + 0.3 }}
              style={{
                minWidth: '40px',
                fontSize: '11px',
                fontWeight: 'bold',
                color: chartColors[i % chartColors.length],
                textAlign: 'right',
              }}
            >
              {item.value}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}
