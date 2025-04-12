// src/components/Queues.jsx
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';
import io from 'socket.io-client';

function Queues() {
  const [queues, setQueues] = useState([]);
  const [form, setForm] = useState({
    id: '',
    service: '',
    prefix: '',
    sector: '',
    open_time: '',
    daily_limit: '',
    num_counters: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = io('https://fila-facilita2-0.onrender.com', {
      path: '/tickets',
      reconnection: true,
    });

    socket.on('queue_update', () => {
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
    } catch (error) {
      setError(error.message);
      toast.error(`Erro ao carregar filas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = form.id ? `/queue/${form.id}` : '/queue/create';
      const method = form.id ? 'PUT' : 'POST';
      const data = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          ...form,
          daily_limit: parseInt(form.daily_limit),
          num_counters: parseInt(form.num_counters),
          institution_id: localStorage.getItem('user_id'), // Ajustar conforme necessário
        }),
      });
      toast.success(data.message);
      setShowModal(false);
      setForm({ id: '', service: '', prefix: '', sector: '', open_time: '', daily_limit: '', num_counters: '' });
      fetchData();
    } catch (error) {
      toast.error(`Erro ao salvar fila: ${error.message}`);
    }
  };

  const handleEdit = (queue) => {
    setForm(queue);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta fila?')) return;
    try {
      const data = await fetchWithAuth(`/queue/${id}`, { method: 'DELETE' });
      toast.success(data.message);
      fetchData();
    } catch (error) {
      toast.error(`Erro ao excluir fila: ${error.message}`);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Gerenciamento de Filas</h2>
      {loading && <div className="alert alert-info">Carregando filas...</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {!loading && queues.length === 0 && !error && (
        <div className="alert alert-warning">Nenhuma fila disponível</div>
      )}
      <button className="btn btn-primary mb-3" onClick={() => setShowModal(true)} disabled={loading}>
        Nova Fila
      </button>
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Prefixo</th>
            <th>Setor</th>
            <th>Horário</th>
            <th>Limite</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {queues.map((q) => (
            <tr key={q.id}>
              <td>{q.service}</td>
              <td>{q.prefix}</td>
              <td>{q.sector}</td>
              <td>{q.open_time}</td>
              <td>{q.daily_limit}</td>
              <td>
                <button
                  className="btn btn-warning btn-sm me-2"
                  onClick={() => handleEdit(q)}
                  disabled={loading}
                >
                  Editar
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(q.id)}
                  disabled={loading}
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{form.id ? 'Editar Fila' : 'Nova Fila'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Serviço</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Prefixo</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.prefix}
                      onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Setor</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Horário de Abertura</label>
                    <input
                      type="time"
                      className="form-control"
                      value={form.open_time}
                      onChange={(e) => setForm({ ...form, open_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Limite Diário</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.daily_limit}
                      onChange={(e) => setForm({ ...form, daily_limit: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Número de Guichês</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.num_counters}
                      onChange={(e) => setForm({ ...form, num_counters: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary">Salvar</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Queues;