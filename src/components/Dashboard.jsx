import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale);

function Dashboard() {
    const [queues, setQueues] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchWithAuth('/admin/queues');
                setQueues(data);
            } catch (error) {
                toast.warning('Usando dados de teste');
                setQueues([
                    { id: '1', service: 'Atendimento Geral', current_ticket: 'A001', active_tickets: 5, status: 'Aberto' },
                    { id: '2', service: 'Caixa', current_ticket: 'B002', active_tickets: 3, status: 'Aberto' }
                ]);
            }
        };
        fetchData();
    }, []);

    const callNext = async (queueId) => {
        try {
            const data = await fetchWithAuth(`/admin/queue/${queueId}/call`, { method: 'POST' });
            toast.success(data.message);
            const updatedQueues = await fetchWithAuth('/admin/queues');
            setQueues(updatedQueues);
        } catch (error) {
            toast.success('Senha chamada (teste)');
        }
    };

    const totalTickets = queues.reduce((sum, q) => sum + (q.active_tickets || 0), 0);
    const waitingTickets = totalTickets;
    const avgWait = totalTickets ? Math.round(totalTickets * 1.5) : 0;

    return (
        <div>
            <h2>Dashboard</h2>
            <div className="row mb-4">
                <div className="col-md-3"><div className="card p-3"><h5>Senhas Hoje</h5><p>{totalTickets}</p></div></div>
                <div className="col-md-3"><div className="card p-3"><h5>Em Espera</h5><p>{waitingTickets}</p></div></div>
                <div className="col-md-3"><div className="card p-3"><h5>Tempo Médio</h5><p>{avgWait} min</p></div></div>
                <div className="col-md-3"><div className="card p-3"><h5>Filas Ativas</h5><p>{queues.length}</p></div></div>
            </div>
            <h4>Filas Ativas</h4>
            <table className="table table-hover">
                <thead><tr><th>Serviço</th><th>Senha Atual</th><th>Em Espera</th><th>Status</th><th>Ações</th></tr></thead>
                <tbody>
                    {queues.map(q => (
                        <tr key={q.id}>
                            <td>{q.service}</td>
                            <td>{q.current_ticket || 'N/A'}</td>
                            <td>{q.active_tickets || 0}</td>
                            <td>{q.status}</td>
                            <td><button className="btn btn-primary btn-sm" onClick={() => callNext(q.id)}>Chamar</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <Line
                data={{
                    labels: ['08:00', '10:00', '12:00', '14:00', '16:00'],
                    datasets: [{
                        label: 'Senhas Emitidas',
                        data: [10, 20, 15, 25, 30],
                        borderColor: '#007bff',
                        fill: false
                    }]
                }}
            />
        </div>
    );
}

export default Dashboard;