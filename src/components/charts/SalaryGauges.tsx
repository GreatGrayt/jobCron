'use client';

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { motion } from 'framer-motion';

interface SalaryStats {
  totalWithSalary: number;
  averageSalary: number | null;
  medianSalary: number | null;
}

interface SalaryGaugesProps {
  stats: SalaryStats;
  totalJobs: number;
}

function formatSalary(amount: number | null): string {
  if (!amount) return 'N/A';
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

export function SalaryGauges({ stats, totalJobs }: SalaryGaugesProps) {
  const transparencyPercentage = totalJobs > 0
    ? (stats.totalWithSalary / totalJobs) * 100
    : 0;

  // Normalize salary to a percentage for gauge (assuming max of $200k)
  const maxSalary = 200000;
  const avgPercentage = stats.averageSalary
    ? Math.min((stats.averageSalary / maxSalary) * 100, 100)
    : 0;
  const medianPercentage = stats.medianSalary
    ? Math.min((stats.medianSalary / maxSalary) * 100, 100)
    : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '20px',
      height: '100%',
      alignItems: 'center',
      padding: '10px',
    }}>
      {/* Transparency Gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0, duration: 0.4 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ width: '100px', height: '100px', margin: '0 auto' }}>
          <CircularProgressbar
            value={transparencyPercentage}
            text={`${transparencyPercentage.toFixed(0)}%`}
            styles={buildStyles({
              textColor: '#00d4ff',
              pathColor: '#00d4ff',
              trailColor: '#1a2332',
              textSize: '20px',
              pathTransitionDuration: 1,
            })}
          />
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#6b7280',
          letterSpacing: '0.05em',
        }}>
          TRANSPARENCY
        </div>
        <div style={{
          fontSize: '11px',
          color: '#9ca3af',
        }}>
          {stats.totalWithSalary} / {totalJobs} jobs
        </div>
      </motion.div>

      {/* Average Salary Gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ width: '100px', height: '100px', margin: '0 auto' }}>
          <CircularProgressbar
            value={avgPercentage}
            text={formatSalary(stats.averageSalary)}
            styles={buildStyles({
              textColor: '#00ff88',
              pathColor: '#00ff88',
              trailColor: '#1a2332',
              textSize: '16px',
              pathTransitionDuration: 1,
            })}
          />
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#6b7280',
          letterSpacing: '0.05em',
        }}>
          AVERAGE
        </div>
        <div style={{
          fontSize: '11px',
          color: '#9ca3af',
        }}>
          Annual Salary
        </div>
      </motion.div>

      {/* Median Salary Gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{ width: '100px', height: '100px', margin: '0 auto' }}>
          <CircularProgressbar
            value={medianPercentage}
            text={formatSalary(stats.medianSalary)}
            styles={buildStyles({
              textColor: '#ffcc00',
              pathColor: '#ffcc00',
              trailColor: '#1a2332',
              textSize: '16px',
              pathTransitionDuration: 1,
            })}
          />
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '10px',
          color: '#6b7280',
          letterSpacing: '0.05em',
        }}>
          MEDIAN
        </div>
        <div style={{
          fontSize: '11px',
          color: '#9ca3af',
        }}>
          Annual Salary
        </div>
      </motion.div>
    </div>
  );
}

// Mini gauge for inline display
interface MiniGaugeProps {
  value: number;
  maxValue: number;
  label: string;
  color: string;
  size?: number;
}

export function MiniGauge({ value, maxValue, label, color, size = 60 }: MiniGaugeProps) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ textAlign: 'center' }}
    >
      <div style={{ width: size, height: size, margin: '0 auto' }}>
        <CircularProgressbar
          value={percentage}
          text={`${value}`}
          styles={buildStyles({
            textColor: color,
            pathColor: color,
            trailColor: '#1a2332',
            textSize: '24px',
            pathTransitionDuration: 0.8,
          })}
        />
      </div>
      <div style={{
        marginTop: '4px',
        fontSize: '9px',
        color: '#6b7280',
        letterSpacing: '0.05em',
      }}>
        {label}
      </div>
    </motion.div>
  );
}
