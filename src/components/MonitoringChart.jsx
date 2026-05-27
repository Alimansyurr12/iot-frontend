import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function MonitoringChart({ title, labels, dataValues, label, borderColor }) {
  const data = {
    labels,
    datasets: [
      {
        label,
        data: dataValues,
        borderColor,
        backgroundColor: borderColor,
        tension: 0.3,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
      },
    },
  }

  return (
    <div style={chartCardStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ height: '300px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  )
}

const chartCardStyle = {
  background: '#fff',
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
}

export default MonitoringChart