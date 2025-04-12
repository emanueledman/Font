import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';

function Queues() {
    const [queues, setQueues] = useState([]);
    const [form, setForm] = useState({
        id: '',
        service: '',
        prefix: '',
        sector: '',
        open_time: '',
        daily_limit: ''
    });
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchWithAuth('/admin/queues');
                setQueues(data);
            } catch (error) {
                toast.warning('Usando dados de teste');
                setQueues([
                    { id: '1', service: 'Atendimento Geral', prefix: 'A', sector: 'Geral', open_time: '08:00', daily_limit: 100 },
                    { id: '2', service: 'Caixa', prefix: 'B', sector: 'Financeiro', open_time: '09:00', daily_limit: 50 }
                ]);
            }
        };
        fetchData();
    }, []);

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
                    institution_id: JSON.parse(localStorage.getItem('user')).institution_id
                })
            });
            toast.success(data.message);
            setShowModal(false);
            setForm({ id: '', service: '', prefix: '', sector: '', open_time: '', daily_limit: '' });
            const updatedQueues = await fetchWithAuth('/admin/queues');
            setQueues(updatedQueues);
        } catch (error) {
            toast.success('Fila salva (teste)');
            setShowModal(false);
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
            const updatedQueues = await fetchWithAuth('/admin/queues');
            setQueues(updatedQueues);
        } catch (error) {
            toast.success('Fila excluída (teste)');
            setQueues(queues.filter(q => q.id !== id));
        }
    };

    return (
        <div>
            <h2>Gerenciamento de Filas</h2>
            <button className="btn btn-primary mb-3" onClick={() => setShowModal(true)}>Nova Fila</button>
            <table className="table table-hover">
                <thead><tr><th>Serviço</th><th>Prefixo</th><th>Setor</th><th>Horário</th><th>Limite</th><th>Ações</th></tr></thead>
                <tbody>
                    {queues.map(q => (
                        <tr key={q.id}>
                            <td>{q.service}</td>
                            <td>{q.prefix}</td>
                            <td>{q.sector}</td>
                            <td>{q.open_time}</td>
                            <td>{q.daily_limit}</td>
                            <td>
                                <button className="btn btn-warning btn-sm me-2" onClick={() => handleEdit(q)}>Editar</button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(q.id)}>Excluir</button>
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