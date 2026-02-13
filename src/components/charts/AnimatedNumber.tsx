'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (value: number) => string;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1,
  format = (v) => Math.round(v).toLocaleString(),
  className,
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration,
  });

  const display = useTransform(spring, (current) => format(current));
  const [displayValue, setDisplayValue] = useState(format(0));

  useEffect(() => {
    spring.set(value);
    const unsubscribe = display.on('change', (v) => setDisplayValue(v));
    return () => unsubscribe();
  }, [value, spring, display]);

  return (
    <motion.span className={className}>
      {displayValue}
    </motion.span>
  );
}

// Animated percentage display
interface AnimatedPercentageProps {
  value: number;
  className?: string;
}

export function AnimatedPercentage({ value, className }: AnimatedPercentageProps) {
  return (
    <AnimatedNumber
      value={value}
      format={(v) => `${v.toFixed(1)}%`}
      className={className}
    />
  );
}

// Animated salary display
interface AnimatedSalaryProps {
  value: number | null;
  className?: string;
}

export function AnimatedSalary({ value, className }: AnimatedSalaryProps) {
  if (value === null) return <span className={className}>N/A</span>;

  return (
    <AnimatedNumber
      value={value}
      format={(v) => {
        if (v >= 1000) {
          return `$${(v / 1000).toFixed(0)}k`;
        }
        return `$${Math.round(v).toLocaleString()}`;
      }}
      className={className}
    />
  );
}
