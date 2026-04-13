// components/GastoChart.js
'use client';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GastoChart({ chartData }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          pointStyleWidth: 8,
          padding: 14,
          font: { size: 12, family: 'var(--font-body, "DM Sans", sans-serif)' },
          color: '#888',
        }
      },
      tooltip: {
        backgroundColor: '#1f1f1f',
        borderColor: '#2a2a2a',
        borderWidth: 1,
        padding: 12,
        titleColor: '#f0f0f0',
        bodyColor: '#c8f135',
        titleFont: { size: 13, family: 'var(--font-display, "Syne", sans-serif)', weight: '700' },
        bodyFont:  { size: 13, family: 'var(--font-body,    "DM Sans", sans-serif)' },
        callbacks: {
          label: (item) => {
            const total = item.dataset.data.reduce((a, b) => a + b, 0);
            const pct   = ((item.raw / total) * 100).toFixed(1);
            return `  $${item.raw.toLocaleString('es-AR')}  (${pct}%)`;
          }
        }
      }
    }
  };

  return <Doughnut data={chartData} options={options} />;
}