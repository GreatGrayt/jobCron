'use client';

import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { CHART_COLORS, tooltipStyle } from './theme';

interface EmployerData {
  name: string;
  value: number;
}

interface EmployersBubbleProps {
  data: EmployerData[];
  onEmployerClick: (employer: string) => void;
  activeFilters: string[];
}

interface BubbleNode {
  name: string;
  value: number;
  r: number;
  x: number;
  y: number;
  color: string;
}

export function EmployersBubble({ data, onEmployerClick, activeFilters }: EmployersBubbleProps) {
  const bubbles = useMemo(() => {
    if (data.length === 0) return [];

    const maxValue = Math.max(...data.map(d => d.value));
    const minRadius = 25;
    const maxRadius = 60;

    // Simple circle packing layout
    const nodes: BubbleNode[] = data.slice(0, 10).map((d, i) => {
      const normalizedValue = d.value / maxValue;
      const r = minRadius + (maxRadius - minRadius) * Math.sqrt(normalizedValue);

      return {
        name: d.name,
        value: d.value,
        r,
        x: 0,
        y: 0,
        color: activeFilters.includes(d.name)
          ? '#00ff88'
          : CHART_COLORS[i % CHART_COLORS.length],
      };
    });

    // Position bubbles in a grid-like pattern
    const containerWidth = 400;
    const containerHeight = 200;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // Spiral layout
    nodes.forEach((node, i) => {
      const angle = i * 0.8;
      const radius = 30 + i * 25;
      node.x = centerX + Math.cos(angle) * radius * 0.8;
      node.y = centerY + Math.sin(angle) * radius * 0.5;
    });

    return nodes;
  }, [data, activeFilters]);

  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>
        No data available
      </div>
    );
  }

  return (
    <svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
      <defs>
        {bubbles.map((bubble, i) => (
          <filter key={`glow-${i}`} id={`glow-${i}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {bubbles.map((bubble, i) => (
        <motion.g
          key={bubble.name}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 0.4, type: 'spring' }}
          style={{ cursor: 'pointer' }}
          onClick={() => onEmployerClick(bubble.name)}
        >
          <motion.circle
            cx={bubble.x}
            cy={bubble.y}
            r={bubble.r}
            fill={bubble.color}
            fillOpacity={0.7}
            stroke={bubble.color}
            strokeWidth={2}
            filter={activeFilters.includes(bubble.name) ? `url(#glow-${i})` : undefined}
            whileHover={{ scale: 1.1, fillOpacity: 1 }}
            transition={{ duration: 0.2 }}
          />
          <text
            x={bubble.x}
            y={bubble.y - 5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={bubble.r > 40 ? 10 : 8}
            fontFamily="'Courier New', monospace"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {bubble.name.length > 12 ? bubble.name.slice(0, 10) + '...' : bubble.name}
          </text>
          <text
            x={bubble.x}
            y={bubble.y + 10}
            textAnchor="middle"
            fill="#00d4ff"
            fontSize={bubble.r > 40 ? 12 : 10}
            fontFamily="'Courier New', monospace"
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
          >
            {bubble.value}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}
