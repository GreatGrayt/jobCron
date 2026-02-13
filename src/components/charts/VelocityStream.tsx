'use client';

import { ResponsiveStream } from '@nivo/stream';
import { bloombergTheme, tooltipStyle } from './theme';

interface VelocityData {
  date: string;
  jobs: number;
  rawDate: string;
}

interface VelocityStreamProps {
  data: VelocityData[];
  onDateClick?: (date: string) => void;
  selectedDate?: string | null;
}

export function VelocityStream({ data, selectedDate }: VelocityStreamProps) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>
        No data available
      </div>
    );
  }

  // Transform data for stream chart - each record needs keys for layers
  const streamData = data.map(d => ({
    jobs: d.jobs,
  }));

  // Create labels from dates
  const labels = data.map(d => d.date);

  return (
    <ResponsiveStream
      data={streamData}
      keys={['jobs']}
      theme={bloombergTheme}
      margin={{ top: 20, right: 20, bottom: 40, left: 40 }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: -45,
        format: (i) => labels[i as number] || '',
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
      }}
      curve="basis"
      offsetType="silhouette"
      colors={['#00d4ff']}
      fillOpacity={0.85}
      borderWidth={2}
      borderColor={{ from: 'color', modifiers: [['brighter', 0.5]] }}
      enableGridX={false}
      enableGridY={true}
      animate={true}
      motionConfig="gentle"
      dotSize={8}
      dotColor={{ from: 'color' }}
      dotBorderWidth={2}
      dotBorderColor={{ from: 'color', modifiers: [['darker', 0.7]] }}
      tooltip={(props) => {
        const layerProps = props as unknown as { layer: { index: number } };
        const index = layerProps.layer?.index ?? 0;
        const item = data[index];
        if (!item) return null;

        return (
          <div style={tooltipStyle}>
            <strong style={{ color: '#00d4ff' }}>{item.date}</strong>
            <br />
            <span style={{ color: '#00ff88' }}>{item.jobs} jobs posted</span>
            {selectedDate === item.rawDate && (
              <div style={{ color: '#ffcc00', marginTop: '4px', fontSize: '9px' }}>
                Currently filtered
              </div>
            )}
          </div>
        );
      }}
    />
  );
}
