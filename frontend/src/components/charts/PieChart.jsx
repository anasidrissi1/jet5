import React from 'react';

// Simple donut/pie chart using SVG stroke-dasharray. Expects values array of numbers
export default function PieChart({ values = [], colors = ['#D4A900', '#D4A900', '#10b981'], size = 120, strokeWidth = 24 }) {
  const total = values.reduce((s, v) => s + (Number(v) || 0), 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        {/* background ring */}
        <circle r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />

        {values.map((v, i) => {
          const fraction = (Number(v) || 0) / total;
          const dash = fraction * circumference;
          const dashArray = `${dash} ${circumference - dash}`;
          const result = (
            <circle
              key={i}
              r={radius}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90)"
            />
          );
          offset += dash;
          return result;
        })}
        {/* center label */}
        <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontSize="12" fill="#0f1724">
          {total}
        </text>
      </g>
    </svg>
  );
}
