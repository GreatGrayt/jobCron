'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ChartWrapperProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  span?: 'full' | '2' | '1';
  height?: number;
  subtitle?: string;
}

export function ChartWrapper({
  title,
  icon,
  children,
  span = '1',
  height = 280,
  subtitle,
}: ChartWrapperProps) {
  return (
    <motion.div
      className={`terminal-panel ${span === 'full' ? 'span-full' : span === '2' ? 'span-2' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="panel-header">
        {icon}
        <span>{title}</span>
        {subtitle && (
          <span style={{ marginLeft: '8px', color: '#00d4ff', fontSize: '10px' }}>
            {subtitle}
          </span>
        )}
      </div>
      <div className="chart-container compact" style={{ height, padding: '12px' }}>
        {children}
      </div>
    </motion.div>
  );
}
