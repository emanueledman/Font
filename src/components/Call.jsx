import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaTicketAlt } from 'react-icons/fa';
import api from '../api';
import { toast } from 'react-toastify';

function Call() {
  const [queues, setQueues] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState('');
  const [tickets, setTickets] = useState({ current: {}, pending: [] });
  const [loading, setLoading] = useState({ queues: false, tickets: false });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchQueues();
    const socket = api.subscribeToTickets('', (data) => {
      if (data.queue_id === selectedQueue) {
        fetchTickets();
      }
    });
    return () => api.unsubscribeFromTickets();
  }, []);

  useEffect(() => {
    if (selectedQueue) {
      fetchTickets();
      api.subscribeToTickets(selectedQueue, () => fetchTickets());
    }
  }, [selectedQueue]);

  const fetchQueues = async () => {
    setLoading((prev) => ({ ...prev, queues: true }));
    try {
      const { data } = await api.get('/admin/queues');
      setQueues(data);
      if (data.length) setSelectedQueue(data[0].id);
    } catch (error) {
      setError('Erro ao carregar filas');
      toast.error('Erro ao carregar filas');
    } finally {
      setLoading((prev) => ({ ...prev, queues: false }));
    }
  };

  const fetchTickets = async () => {
    if (!selectedQueue) return;
    setLoading((prev) => ({ ...prev, tickets: true }));
    try {
      const { data } = await api.get(`/queue/${selectedQueue}/tickets`);
      setTickets({
        current: data.find((t) => t.status === 'Chamado') || {},
        pending: data.filter((t) => t.status === 'Pendente'),
      });
    } catch (error) {
      setError('Erro ao carregar senhas');
      toast.error('Erro ao carregar senhas');
    } finally {
      setLoading((prev) => ({ ...prev, tickets: false }));
    }
  };

  const callNext = async () => {
    try {
      const { data } = await api.post(`/admin/queue/${selectedQueue}/call`);
      toast.success(data.message);
      fetchTickets();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao chamar próxima senha');
    }
  };

  return (
    <motion.div className="container py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <FaTicketAlt className="mr-2 text-primary-500" /> Chamada de Senhas
      </h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <div className="mb-6">
        <label className="block text-sm font-medium">Selecionar Fila</label>
        <select
          value={selectedQueue}
          onChange={(e) => setSelectedQueue(e.target.value)}
          className="mt-1 p-2 border rounded w-full"
          disabled={loading.queues}
        >
          {queues.map((queue) => (
            <option key={queue.id} value={queue.id}>{queue.service}</option>
          ))}
        </select>
      </div>
      {loading.tickets ? (
        <div>Carregando senhas...</div>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Senha Atual</h2>
            {tickets.current.ticket_number ? (
              <div>
                <p>Senha: {tickets.current.ticket_number}</p>
                <p>Balcão: {tickets.current.counter?.toString().padLeft(2, '0')}</p>
              </div>
            ) : (
              <p>Nenhuma senha sendo atendida</p>
            )}
          </div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Senhas Pendentes</h2>
            {tickets.pending.length > 0 ? (
              <ul>
                {tickets.pending.map((ticket) => (
                  <li key={ticket.id}>{ticket.ticket_number}</li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma senha pendente</p>
            )}
          </div>
          <button
            onClick={callNext}
            className="bg-blue-500 text-white p-2 rounded"
            disabled={loading.tickets || tickets.pending.length === 0}
          >
            Chamar Próxima Senha
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default Call;