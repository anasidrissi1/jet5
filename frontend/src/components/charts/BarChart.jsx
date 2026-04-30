import React from 'react';

// Simple vertical bar chart. data = [{label, value}]
export default function BarChart({ data = [], width = 240, height = 120, barColor = '#D4A900' }) {
  const max = Math.max(...data.map(d => Number(d.value) || 0), 1);
  const padding = 8;
  const barWidth = (width - padding * 2) / Math.max(data.length, 1);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <g transform={`translate(${padding},0)`}>
        {data.map((d, i) => {
          const h = (Number(d.value) || 0) / max * (height - 24);
          const x = i * barWidth + 4;
          const y = height - h - 16;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth - 8} height={h} fill={barColor} rx={4} />
              <text x={x + (barWidth - 8) / 2} y={height - 4} fontSize={10} fill="#334155" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
