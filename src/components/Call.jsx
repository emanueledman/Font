// src/components/Call.jsx
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

function Call() {
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [tickets, setTickets] = useState({ current: {}, pending: [] });
  const [loading, setLoading] = useState({ queues: false, tickets: false });
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = io('https://fila-facilita2-0.onrender.com', {
      path: '/tickets',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      toast.info('Conectado ao servidor de notificações');
    });

    socket.on('queue_update', (data) => {
      if (data.queue_id === selectedQueue) {
        toast.info(data.message);
        fetchTickets();
      }
    });

    socket.on('ticket_update', (data) => {
      if (data.ticket_id) {
        toast.info(`Ticket ${data.ticket_id} atualizado: ${data.status}`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedQueue]);

  useEffect(() => {
    const fetchQueues = async () => {
      setLoading((prev) => ({ ...prev, queues: true }));
      setError(null);
      try {
        const data = await fetchWithAuth('/queues');
        const allQueues = data.flatMap((inst) => inst.queues);
        setQueues(allQueues);
        if (allQueues.length) setSelectedQueue(allQueues[0].id);
      } catch (error) {
        setError(error.message);
        toast.error(`Erro ao carregar filas: ${error.message}`);
      } finally {
        setLoading((prev) => ({ ...prev, queues: false }));
      }
    };
    fetchQueues();
  }, []);

  useEffect(() => {
    if (selectedQueue) fetchTickets();
  }, [selectedQueue]);

  const fetchTickets = async () => {
    setLoading((prev) => ({ ...prev, tickets: true }));
    setError(null);
    try {
      const data = await fetchWithAuth(`/tickets?queue_id=${selectedQueue}`);
      setTickets({
        current: data.find((t) => t.status === 'Chamado') || {},
        pending: data.filter((t) => t.status === 'Pendente'),
      });
    } catch (error) {
      setError(error.message);
      toast.error(`Erro ao carregar senhas: ${error.message}`);
    } finally {
      setLoading((prev) => ({ ...prev, tickets: false }));
    }
  };

  const callNext = async () => {
    try {
      const data = await fetchWithAuth(`/queue/${selectedQueue}/call`, { method: 'POST' });
      toast.success(data.message);
      fetchTickets();
    } catch (error) {
      toast.error(`Erro ao chamar próxima senha: ${error.message}`);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Chamada de Senhas</h1>
      {loading.queues && (
        <div className="card p-4 mb-4 animate-pulse">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
        </div>
      )}
      {error && (
        <div className="card p-4 mb-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">
          {error}
        </div>
      )}
      {!loading.queues && queues.length === 0 && !error && (
        <div className="card p-4 mb-4 text-yellow-700 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900">
          Nenhuma fila disponível
        </div>
      )}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Selecionar Fila</label>
        <select
          className="w-full px-4 py-2 rounded-md bg-neutral-100 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          value={selectedQueue}
          onChange={(e) => setSelectedQueue(e.target.value)}
          disabled={loading.queues || !queues.length}
        >
          {queues.map((q) => (
            <option key={q.id} value={q.id}>
              {q.service} ({q.institution})
            </option>
          ))}
        </select>
      </div>
      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Senha Atual</h2>
        {loading.tickets && (
          <div className="animate-pulse">
            <div className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-4"></div>
            <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4"></div>
          </div>
        )}
        <p className="text-5xl font-bold text-primary-500">{tickets.current.number || 'N/A'}</p>
        <p className="text-lg mt-2">Guichê: {tickets.current.counter || 'N/A'}</p>
        <button
          className="btn btn-secondary mt-4"
          onClick={callNext}
          disabled={loading.tickets || !selectedQueue}
        >
          Chamar Próxima
        </button>
      </div>
      <h2 className="text-xl font-semibold mb-4">Senhas Pendentes</h2>
      {loading.tickets && (
        <div className="card animate-pulse">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4 mb-4"></div>
          <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded w-full mb-2"></div>
          <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded w-full"></div>
        </div>
      )}
      {tickets.pending.length === 0 && !loading.tickets && (
        <div className="card p-4 text-neutral-500 dark:text-neutral-400">
          Nenhuma senha pendente
        </div>
      )}
      {tickets.pending.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Prioridade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.pending.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
                  <td>{t.number}</td>
                  <td>{t.priority}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Call;