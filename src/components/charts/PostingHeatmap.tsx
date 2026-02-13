'use client';

import { motion } from 'framer-motion';
import { useMemo, useState, useEffect } from 'react';
import { getThemeColors } from './theme';

interface Job {
  postedDate: string;
}

interface PostingHeatmapProps {
  jobs: Job[];
  // Optional aggregated data (day-hour combinations, e.g., "0-14" for Sunday 2PM UTC)
  byDayHour?: Record<string, number>;
}

// Day names for the Y axis
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Hour labels for the X axis (every 3 hours)
const HOURS = ['00', '03', '06', '09', '12', '15', '18', '21'];

// Theme-aware color gradients
const DARK_GRADIENT = {
  empty: '#1a2332',
  stroke: '#0a0e1a',
  hoverStroke: '#00d4ff',
  gradient: ['#024530', '#026745', '#038d5d', '#04b375', '#05d98d', '#00ff88'],
};

const LIGHT_GRADIENT = {
  empty: '#e2e8f0',
  stroke: '#f8fafc',
  hoverStroke: '#2563eb',
  gradient: ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669'],
};

export function PostingHeatmap({ jobs, byDayHour }: PostingHeatmapProps) {
  const [themeColors, setThemeColors] = useState(getThemeColors());
  const [gradientColors, setGradientColors] = useState(DARK_GRADIENT);

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      setThemeColors(getThemeColors());
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      setGradientColors(isLight ? LIGHT_GRADIENT : DARK_GRADIENT);
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const heatmapData = useMemo(() => {
    // Create a 7x24 grid (days x hours)
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    // Use aggregated byDayHour data if available
    if (byDayHour && Object.keys(byDayHour).length > 0) {
      for (const [key, count] of Object.entries(byDayHour)) {
        const [dayStr, hourStr] = key.split('-');
        const day = parseInt(dayStr, 10);
        const hour = parseInt(hourStr, 10);
        if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
          grid[day][hour] += count;
        }
      }
      return grid;
    }

    // Fall back to computing from individual jobs
    jobs.forEach(job => {
      const date = new Date(job.postedDate);
      const day = date.getUTCDay();
      const hour = date.getUTCHours();
      grid[day][hour]++;
    });

    return grid;
  }, [jobs, byDayHour]);

  const maxValue = useMemo(() => {
    return Math.max(...heatmapData.flat(), 1);
  }, [heatmapData]);

  const getColor = (value: number): string => {
    if (value === 0) return gradientColors.empty;
    const intensity = value / maxValue;
    if (intensity > 0.8) return gradientColors.gradient[5];
    if (intensity > 0.6) return gradientColors.gradient[4];
    if (intensity > 0.4) return gradientColors.gradient[3];
    if (intensity > 0.2) return gradientColors.gradient[2];
    if (intensity > 0.05) return gradientColors.gradient[1];
    return gradientColors.gradient[0];
  };

  const cellSize = 18;
  const gap = 2;
  const paddingLeft = 35;
  const paddingTop = 25;

  const hasData = jobs.length > 0 || (byDayHour && Object.keys(byDayHour).length > 0);

  if (!hasData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: themeColors.textMuted }}>
        No data available
      </div>
    );
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${paddingLeft + 24 * (cellSize + gap) + 20} ${paddingTop + 7 * (cellSize + gap) + 30}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Hour labels (X axis) */}
      {HOURS.map((hour, i) => (
        <text
          key={`hour-${hour}`}
          x={paddingLeft + i * 3 * (cellSize + gap) + cellSize / 2}
          y={15}
          fill={themeColors.textMuted}
          fontSize="9"
          fontFamily="'Courier New', monospace"
          textAnchor="middle"
        >
          {hour}
        </text>
      ))}

      {/* Day labels (Y axis) */}
      {DAYS.map((day, dayIndex) => (
        <text
          key={`day-${day}`}
          x={5}
          y={paddingTop + dayIndex * (cellSize + gap) + cellSize / 2 + 4}
          fill={themeColors.textMuted}
          fontSize="9"
          fontFamily="'Courier New', monospace"
        >
          {day}
        </text>
      ))}

      {/* Heatmap cells */}
      {heatmapData.map((dayData, dayIndex) =>
        dayData.map((value, hourIndex) => (
          <motion.g
            key={`cell-${dayIndex}-${hourIndex}`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: (dayIndex * 24 + hourIndex) * 0.002,
              duration: 0.2,
            }}
          >
            <motion.rect
              x={paddingLeft + hourIndex * (cellSize + gap)}
              y={paddingTop + dayIndex * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={getColor(value)}
              stroke={gradientColors.stroke}
              strokeWidth={1}
              whileHover={{ scale: 1.2, strokeWidth: 2, stroke: gradientColors.hoverStroke }}
              style={{ cursor: value > 0 ? 'pointer' : 'default' }}
            />
            {value > 0 && (
              <title>{`${DAYS[dayIndex]} ${String(hourIndex).padStart(2, '0')}:00 - ${value} jobs`}</title>
            )}
          </motion.g>
        ))
      )}

      {/* Legend */}
      <g transform={`translate(${paddingLeft}, ${paddingTop + 7 * (cellSize + gap) + 10})`}>
        <text fill={themeColors.textMuted} fontSize="9" fontFamily="'Courier New', monospace" y="5">
          Less
        </text>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
          <rect
            key={`legend-${i}`}
            x={30 + i * 15}
            y={0}
            width={12}
            height={12}
            rx={2}
            fill={intensity === 0 ? gradientColors.empty : getColor(intensity * maxValue)}
          />
        ))}
        <text fill={themeColors.textMuted} fontSize="9" fontFamily="'Courier New', monospace" x={125} y="10">
          More
        </text>
      </g>
    </svg>
  );
}
