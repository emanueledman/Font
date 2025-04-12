import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../api';
import { toast } from 'react-toastify';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale);

function Reports() {
    const [queues, setQueues] = useState([]);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', queueId: '' });
    const [report, setReport] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await fetchWithAuth('/admin/queues');
                setQueues(data);
            } catch (error) {
                toast.warning('Usando dados de teste');
                setQueues([
                    { id: '1', service: 'Atendimento Geral' },
                    { id: '2', service: 'Caixa' }
                ]);
            }
        };
        fetchData();
    }, []);

    const generateReport = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.queueId) params.append('queue_id', filters.queueId);
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            const data = await fetchWithAuth(`/tickets/admin?${params}`);
            const total = data.length;
            const avgWait = data.reduce((sum, t) => sum + (t.wait_time || 0), 0) / total || 0;
            setReport({
                total,
                avgWait,
                chartData: {
                    labels: ['Senhas Emitidas', 'Senhas Atendidas'],
                    datasets: [{
                        label: 'Métricas',
                        data: [total, data.filter(t => t.status === 'attended').length],
                        backgroundColor: ['#007bff', '#28a745']
                    }]
                }
            });
        } catch (error) {
            toast.warning('Relatório de teste');
            setReport({
                total: 50,
                avgWait: 7.5,
                chartData: {
                    labels: ['Senhas Emitidas', 'Senhas Atendidas'],
                    datasets: [{
                        label: 'Métricas',
                        data: [50, 40],
                        backgroundColor: ['#007bff', '#28a745']
                    }]
                }
            });
        }
    };

    return (
        <div>
            <h2>Relatórios</h2>
            <div className="mb-3">
                <label className="form-label">Intervalo de Datas</label>
                <div className="row">
                    <div className="col">
                        <input
                            type="date"
                            className="form-control"
                            value={filters.startDate}
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div className="col">
                        <input
                            type="date"
                            className="form-control"
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                </div>
            </div>
            <div className="mb-3">
                <label className="form-label">Fila</label>
                <select
                    className="form-select"
                    value={filters.queueId}
                    onChange={(e) => setFilters({ ...filters, queueId: e.target.value })}
                >
                    <option value="">Todas</option>
                    {queues.map(q => (
                        <option key={q.id} value={q.id}>{q.service}</option>
                    ))}
                </select>
            </div>
            <button className="btn btn-primary mb-4" onClick={generateReport}>Gerar Relatório</button>
            {report && (
                <>
                    <Bar data={report.chartData} />
                    <table className="table table-hover">
                        <thead><tr><th>Métrica</th><th>Valor</th></tr></thead>
                        <tbody>
                            <tr><td>Total de Senhas</td><td>{report.total}</td></tr>
                            <tr><td>Tempo Médio de Espera</td><td>{report.avgWait.toFixed(1)} min</td></tr>
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}

export default Reports;