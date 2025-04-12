// src/components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';
import { Line } from 'react-chartjs-2';
import io from 'socket.io-client';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale);

function Dashboard() {
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  // Configurar WebSocket
  useEffect(() => {
    const socket = io('https://fila-facilita2-0.onrender.com', {
      path: '/tickets',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('WebSocket conectado');
    });

    socket.on('queue_update', (data) => {
      toast.info(data.message);
      fetchData();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Carregar dados
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth('/queues');
      const allQueues = data.flatMap((inst) => inst.queues);
      setQueues(allQueues);

      // Simular dados do gráfico (backend não fornece esses dados ainda)
      setChartData({
        labels: ['08:00', '10:00', '12:00', '14:00', '16:00'],
        datasets: [
          {
            label: 'Senhas Emitidas',
            data: allQueues.map((q) => q.active_tickets || 0),
            borderColor: '#007bff',
            fill: false,
          },
        ],
      });
    } catch (error) {
      setError(error.message);
      toast.error(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const callNext = async (queueId) => {
    try {
      const data = await fetchWithAuth(`/queue/${queueId}/call`, { method: 'POST' });
      toast.success(data.message);
      fetchData();
    } catch (error) {
      toast.error(`Erro ao chamar senha: ${error.message}`);
    }
  };

  const totalTickets = queues.reduce((sum, q) => sum + (q.active_tickets || 0), 0);
  const waitingTickets = totalTickets;
  const avgWait = queues.reduce((sum, q) => sum + (q.avg_wait_time || 0), 0) / (queues.length || 1);

  return (
    <div className="container mt-4">
      <h2>Dashboard</h2>
      {loading && <div className="alert alert-info">Carregando dados...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && queues.length === 0 && !error && (
        <div className="alert alert-warning">Nenhuma fila disponível</div>
      )}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card p-3">
            <h5>Senhas Hoje</h5>
            <p>{totalTickets}</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5>Em Espera</h5>
            <p>{waitingTickets}</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5>Tempo Médio</h5>
            <p>{avgWait.toFixed(1)} min</p>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card p-3">
            <h5>Filas Ativas</h5>
            <p>{queues.length}</p>
          </div>
        </div>
      </div>
      <h4>Filas Ativas</h4>
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Senha Atual</th>
            <th>Em Espera</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {queues.map((q) => (
            <tr key={q.id}>
              <td>{q.service}</td>
              <td>{q.current_ticket ? `${q.prefix}${q.current_ticket}` : 'N/A'}</td>
              <td>{q.active_tickets || 0}</td>
              <td>{q.status}</td>
              <td>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => callNext(q.id)}
                  disabled={q.active_tickets === 0}
                >
                  Chamar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Line data={chartData} />
    </div>
  );
}

export default Dashboard;