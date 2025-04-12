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

  // Carregar filas
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

  // Carregar tickets quando a fila selecionada mudar
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
    <div className="container mt-4">
      <h2>Chamada de Senhas</h2>
      {loading.queues && <div className="alert alert-info">Carregando filas...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading.queues && queues.length === 0 && !error && (
        <div className="alert alert-warning">Nenhuma fila disponível</div>
      )}
      <div className="mb-3">
        <label className="form-label">Selecionar Fila</label>
        <select
          className="form-select"
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
      <div className="card p-4 mb-4">
        <h4>Senha Atual</h4>
        {loading.tickets && <div className="alert alert-info">Carregando senhas...</div>}
        <p className="display-4">{tickets.current.number || 'N/A'}</p>
        <p>Guichê: {tickets.current.counter || 'N/A'}</p>
        <button
          className="btn btn-success btn-lg"
          onClick={callNext}
          disabled={loading.tickets || !selectedQueue}
        >
          Chamar Próxima
        </button>
      </div>
      <h4>Senhas Pendentes</h4>
      {loading.tickets && <div className="alert alert-info">Carregando senhas pendentes...</div>}
      {tickets.pending.length === 0 && !loading.tickets && (
        <div className="alert alert-info">Nenhuma senha pendente</div>
      )}
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Número</th>
            <th>Prioridade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tickets.pending.map((t) => (
            <tr key={t.id}>
              <td>{t.number}</td>
              <td>{t.priority}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Call;