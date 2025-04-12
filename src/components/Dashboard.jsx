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

      setChartData({
        labels: ['08:00', '10:00', '12:00', '14:00', '16:00'],
        datasets: [
          {
            label: 'Senhas Emitidas',
            data: allQueues.map((q) => q.active_tickets || 0),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            fill: true,
            tension: 0.4,
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
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-4"></div>
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div className="card p-4 mb-6 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
          {error}
        </div>
      )}
      {!loading && queues.length === 0 && !error && (
        <div className="card p-4 mb-6 text-yellow-700 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900">
          Nenhuma fila disponível
        </div>
      )}
      {!loading && queues.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="card p-6">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Senhas Hoje</h3>
              <p className="text-3xl font-bold mt-2">{totalTickets}</p>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Em Espera</h3>
              <p className="text-3xl font-bold mt-2">{waitingTickets}</p>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Tempo Médio</h3>
              <p className="text-3xl font-bold mt-2">{avgWait.toFixed(1)} min</p>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Filas Ativas</h3>
              <p className="text-3xl font-bold mt-2">{queues.length}</p>
            </div>
          </div>
          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Filas Ativas</h2>
            <table className="table">
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
                  <tr key={q.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                    <td>{q.service}</td>
                    <td>{q.current_ticket ? `${q.prefix}${q.current_ticket}` : 'N/A'}</td>
                    <td>{q.active_tickets || 0}</td>
                    <td>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          q.status === 'Aberto' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary text-sm"
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
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Atividade de Senhas</h2>
            <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;