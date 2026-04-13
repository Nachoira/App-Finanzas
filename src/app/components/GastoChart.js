'use client'; // CRÍTICO: Indica que esto corre en el navegador

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Registramos los componentes de Chart.js que usaremos
ChartJS.register(ArcElement, Tooltip, Legend);

export default function GastoChart({ chartData }) {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          font: { size: 12, family: '"Inter", sans-serif' },
          color: '#1d1d1f'
        }
      },
      tooltip: {
        backgroundColor: '#000',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 14 },
        callbacks: {
          label: (item) => {
            const total = item.dataset.data.reduce((a, b) => a + b, 0);
            const value = item.raw;
            const percentage = ((value / total) * 100).toFixed(1);
            return `$ ${value.toLocaleString('es-AR')} (${percentage}%)`;
          }
        }
      }
    }
  };

  return <Doughnut data={chartData} options={options} />;
}