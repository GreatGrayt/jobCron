'use client';

import { motion } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { getChartColors, getThemeColors } from './theme';

interface SkillsWordCloudProps {
  data: Array<[string, number]>;
  onWordClick: (word: string) => void;
  activeFilters: string[];
  maxWords?: number;
}

interface WordPosition {
  text: string;
  count: number;
  fontSize: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
}

export function SkillsWordCloud({
  data,
  onWordClick,
  activeFilters,
  maxWords = 25,
}: SkillsWordCloudProps) {
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

  const words = useMemo(() => {
    if (data.length === 0) return [];

    const slicedData = data.slice(0, maxWords);
    const maxCount = Math.max(...slicedData.map(d => d[1]));
    const minCount = Math.min(...slicedData.map(d => d[1]));
    const countRange = maxCount - minCount || 1;

    const minFontSize = 12;
    const maxFontSize = 32;

    // Create positioned words in a scattered pattern
    const containerWidth = 500;
    const containerHeight = 200;

    const positions: WordPosition[] = slicedData.map((item, i) => {
      const [text, count] = item;
      const normalizedSize = (count - minCount) / countRange;
      const fontSize = minFontSize + normalizedSize * (maxFontSize - minFontSize);

      // Create a scattered but somewhat organized layout
      const row = Math.floor(i / 5);
      const col = i % 5;
      const baseX = 50 + col * 90;
      const baseY = 30 + row * 40;

      // Add some randomization
      const xOffset = (Math.sin(i * 1.5) * 20);
      const yOffset = (Math.cos(i * 2) * 10);

      return {
        text,
        count,
        fontSize,
        x: baseX + xOffset,
        y: baseY + yOffset,
        color: activeFilters.includes(text)
          ? themeColors.accentSecondary
          : chartColors[i % chartColors.length],
        rotation: 0,
      };
    });

    return positions;
  }, [data, activeFilters, maxWords, themeColors.accentSecondary, chartColors]);

  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: themeColors.textMuted }}>
        No data available
      </div>
    );
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid meet">
      {words.map((word, i) => (
        <motion.g
          key={word.text}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02, duration: 0.3 }}
          style={{ cursor: 'pointer' }}
          onClick={() => onWordClick(word.text)}
        >
          <motion.text
            x={word.x}
            y={word.y}
            fill={word.color}
            fontSize={word.fontSize}
            fontFamily="'Courier New', monospace"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(${word.rotation}, ${word.x}, ${word.y})`}
            whileHover={{ scale: 1.2, fill: themeColors.text }}
            transition={{ duration: 0.15 }}
          >
            {word.text}
          </motion.text>
          {/* Count badge */}
          <motion.circle
            cx={word.x + word.text.length * (word.fontSize * 0.3) + 5}
            cy={word.y - word.fontSize * 0.3}
            r={8}
            fill={themeColors.accent}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.02 + 0.1 }}
          />
          <motion.text
            x={word.x + word.text.length * (word.fontSize * 0.3) + 5}
            y={word.y - word.fontSize * 0.3}
            fill={themeColors.bg}
            fontSize={7}
            fontFamily="'Courier New', monospace"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.02 + 0.15 }}
          >
            {word.count > 99 ? '99+' : word.count}
          </motion.text>
        </motion.g>
      ))}
    </svg>
  );
}

// Alternative compact tag cloud for smaller spaces
export function SkillsTagCloud({
  data,
  onWordClick,
  activeFilters,
  maxWords = 15,
}: SkillsWordCloudProps) {
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

  const slicedData = data.slice(0, maxWords);
  const maxCount = Math.max(...slicedData.map(d => d[1]));

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '8px',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {slicedData.map(([text, count], i) => {
        const isActive = activeFilters.includes(text);
        const intensity = count / maxCount;
        const fontSize = 11 + intensity * 6;

        return (
          <motion.button
            key={text}
            onClick={() => onWordClick(text)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: isActive
                ? `linear-gradient(135deg, ${themeColors.accentSecondary} 0%, ${themeColors.accentSecondary}cc 100%)`
                : `linear-gradient(135deg, ${chartColors[i % chartColors.length]}40 0%, ${chartColors[i % chartColors.length]}20 100%)`,
              border: `1px solid ${isActive ? themeColors.accentSecondary : chartColors[i % chartColors.length]}`,
              borderRadius: '20px',
              fontSize: `${fontSize}px`,
              fontFamily: "'Courier New', monospace",
              fontWeight: 600,
              color: isActive ? themeColors.bg : themeColors.text,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>{text}</span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '22px',
              height: '18px',
              padding: '0 6px',
              background: isActive ? themeColors.bg : themeColors.accent,
              color: isActive ? themeColors.accentSecondary : themeColors.bg,
              fontSize: '10px',
              fontWeight: 700,
              borderRadius: '10px',
            }}>
              {count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
