import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';

function Call() {
    const [queues, setQueues] = useState([]);
    const [selectedQueue, setSelectedQueue] = useState('');
    const [tickets, setTickets] = useState({ current: {}, pending: [] });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchWithAuth('/admin/queues');
                setQueues(data);
                if (data.length) setSelectedQueue(data[0].id);
            } catch (error) {
                toast.warning('Usando dados de teste');
                setQueues([
                    { id: '1', service: 'Atendimento Geral' },
                    { id: '2', service: 'Caixa' }
                ]);
                setSelectedQueue('1');
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedQueue) fetchTickets();
    }, [selectedQueue]);

    const fetchTickets = async () => {
        try {
            const data = await fetchWithAuth(`/tickets?queue_id=${selectedQueue}`);
            setTickets({
                current: data.find(t => t.status === 'Chamado') || {},
                pending: data.filter(t => t.status === 'Pendente')
            });
        } catch (error) {
            toast.warning('Dados de teste');
            setTickets({
                current: { number: 'A001', counter: '1' },
                pending: [
                    { number: 'A002', priority: 'Normal', status: 'Pendente' },
                    { number: 'A003', priority: 'Prioridade', status: 'Pendente' }
                ]
            });
        }
    };

    const callNext = async () => {
        try {
            const data = await fetchWithAuth(`/admin/queue/${selectedQueue}/call`, { method: 'POST' });
            toast.success(data.message);
            fetchTickets();
        } catch (error) {
            toast.success('Senha chamada (teste)');
            fetchTickets();
        }
    };

    return (
        <div>
            <h2>Chamada de Senhas</h2>
            <div className="mb-3">
                <label className="form-label">Selecionar Fila</label>
                <select
                    className="form-select"
                    value={selectedQueue}
                    onChange={(e) => setSelectedQueue(e.target.value)}
                >
                    {queues.map(q => (
                        <option key={q.id} value={q.id}>{q.service}</option>
                    ))}
                </select>
            </div>
            <div className="card p-4 mb-4">
                <h4>Senha Atual</h4>
                <p className="display-4">{tickets.current.number || 'N/A'}</p>
                <p>Guichê: {tickets.current.counter || 'N/A'}</p>
                <button className="btn btn-success btn-lg" onClick={callNext}>Chamar Próxima</button>
            </div>
            <h4>Senhas Pendentes</h4>
            <table className="table table-hover">
                <thead><tr><th>Número</th><th>Prioridade</th><th>Status</th></tr></thead>
                <tbody>
                    {tickets.pending.map(t => (
                        <tr key={t.number}>
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