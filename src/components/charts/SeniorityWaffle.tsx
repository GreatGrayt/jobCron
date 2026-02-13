'use client';

import { ResponsiveWaffle } from '@nivo/waffle';
import { bloombergTheme, CHART_COLORS, tooltipStyle } from './theme';

interface SeniorityWaffleProps {
  data: Array<{ name: string; value: number }>;
  onSeniorityClick: (seniority: string) => void;
  activeFilters: string[];
}

export function SeniorityWaffle({ data, onSeniorityClick, activeFilters }: SeniorityWaffleProps) {
  if (data.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5568' }}>
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  const waffleData = data.map((item, i) => ({
    id: item.name,
    label: item.name,
    value: item.value,
    color: activeFilters.includes(item.name)
      ? '#00ff88'
      : CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <ResponsiveWaffle
      data={waffleData}
      total={total}
      rows={10}
      columns={10}
      theme={bloombergTheme}
      colors={{ datum: 'color' }}
      borderRadius={2}
      borderWidth={1}
      borderColor="#0a0e1a"
      animate={true}
      motionConfig="gentle"
      padding={2}
      emptyColor="#1a2332"
      emptyOpacity={0.5}
      onClick={(datum) => {
        if (datum.id) {
          onSeniorityClick(String(datum.id));
        }
      }}
      tooltip={(props) => {
        const p = props as unknown as { id: string; value: number; color: string };
        return (
          <div style={tooltipStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 12, height: 12, backgroundColor: p.color, borderRadius: 2 }} />
              <strong style={{ color: '#00d4ff' }}>{p.id}</strong>
            </div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ color: '#00ff88' }}>{p.value} jobs</span>
              <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                ({((p.value / total) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        );
      }}
      legends={[
        {
          anchor: 'bottom',
          direction: 'row',
          justify: false,
          translateX: 0,
          translateY: 30,
          itemsSpacing: 4,
          itemWidth: 80,
          itemHeight: 14,
          itemDirection: 'left-to-right',
          itemOpacity: 1,
          itemTextColor: '#9ca3af',
          symbolSize: 12,
          symbolShape: 'square',
          effects: [
            {
              on: 'hover',
              style: {
                itemTextColor: '#00d4ff',
              },
            },
          ],
        },
      ]}
    />
  );
}
