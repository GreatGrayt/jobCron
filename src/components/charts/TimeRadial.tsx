'use client';

import { ResponsiveRadialBar } from '@nivo/radial-bar';
import { bloombergTheme, tooltipStyle } from './theme';

interface TimeSlot {
  time: string;
  count: number;
}

interface TimeRadialProps {
  data: TimeSlot[];
}

export function TimeRadial({ data }: TimeRadialProps) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>
        No data available
      </div>
    );
  }

  // Group by hour for radial display (24 segments representing hours)
  const hourlyData: Record<number, number> = {};

  data.forEach(slot => {
    const hour = parseInt(slot.time.split(':')[0], 10);
    hourlyData[hour] = (hourlyData[hour] || 0) + slot.count;
  });

  const maxValue = Math.max(...Object.values(hourlyData), 1);

  // Create radial data for each hour
  const radialData = Array.from({ length: 24 }, (_, hour) => {
    const count = hourlyData[hour] || 0;
    return {
      id: `${String(hour).padStart(2, '0')}:00`,
      data: [
        {
          x: 'Jobs',
          y: count,
        },
      ],
    };
  });

  return (
    <ResponsiveRadialBar
      data={radialData}
      theme={bloombergTheme}
      colors={['#ffcc00']}
      padding={0.3}
      cornerRadius={3}
      maxValue={maxValue}
      margin={{ top: 30, right: 30, bottom: 30, left: 30 }}
      radialAxisStart={{
        tickSize: 0,
        tickPadding: 5,
        tickRotation: 0,
      }}
      circularAxisOuter={{
        tickSize: 5,
        tickPadding: 8,
        tickRotation: 0,
      }}
      enableRadialGrid={true}
      enableCircularGrid={true}
      animate={true}
      motionConfig="gentle"
      tooltip={({ bar }) => (
        <div style={{ ...tooltipStyle, border: '1px solid #ffcc00' }}>
          <strong style={{ color: '#ffcc00' }}>{bar.groupId}</strong>
          <br />
          <span style={{ color: '#e5e7eb' }}>{bar.value} postings</span>
        </div>
      )}
    />
  );
}
