async function generateReport() {
    const period = document.getElementById('report-period').value;
    const startDate = document.getElementById('start-date')?.value;
    const endDate = document.getElementById('end-date')?.value;
    const reportType = document.getElementById('report-type').value;
    const queueId = document.getElementById('report-queue').value;
    const attendantId = document.getElementById('report-attendant').value;
    const groupBy = document.getElementById('report-group').value;

    if (period === 'custom' && (!startDate || !endDate)) {
        showError('Selecione as datas inicial e final para o relatório personalizado.');
        return;
    }

    try {
        document.getElementById('report-chart-loading').classList.remove('hidden');
        const params = new URLSearchParams({
            period,
            report_type: reportType,
            queue_id: queueId,
            attendant_id: attendantId,
            group_by: groupBy
        });
        if (period === 'custom') {
            params.append('start_date', startDate);
            params.append('end_date', endDate);
        }

        const response = await axios.get(`/api/admin/report?${params.toString()}`);
        const results = document.getElementById('report-results');
        results.innerHTML = '';

        if (!response.data || response.data.length === 0) {
            results.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum dado disponível para os filtros selecionados.</p>';
            document.getElementById('report-chart-loading').classList.add('hidden');
            return;
        }

        results.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-xl font-semibold">Métricas Principais</h3>
                    <div class="flex space-x-2">
                        <button class="chart-period-btn active px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium" data-period="today">Hoje</button>
                        <button class="chart-period-btn px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium" data-period="week">Semana</button>
                        <button class="chart-period-btn px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium" data-period="month">Mês</button>
                    </div>
                </div>
                <div class="relative h-96">
                    <canvas id="report-chart"></canvas>
                    <div id="report-chart-loading" class="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center hidden">
                        <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <h3 class="text-lg font-semibold mb-4">Filas com Maior Volume</h3>
                    <div class="space-y-4" id="top-queues-report"></div>
                </div>
                <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                    <h3 class="text-lg font-semibold mb-4">Tempo Médio de Atendimento</h3>
                    <div class="grid grid-cols-2 gap-4" id="avg-time-report"></div>
                </div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 class="text-lg font-semibold mb-4">Detalhamento por Período</h3>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo Médio</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Satisfação</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eficiência</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200" id="detailed-report"></tbody>
                    </table>
                </div>
            </div>
        `;

        const topQueues = document.getElementById('top-queues-report');
        const colors = ['blue', 'green', 'yellow', 'purple', 'red'];
        response.data.slice(0, 5).forEach((item, index) => {
            const percentage = item.issued ? (item.attended / item.issued) * 100 : 0;
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between';
            div.innerHTML = `
                <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full bg-${colors[index]}-500 mr-2"></div>
                    <span class="text-gray-700">${item.service}</span>
                </div>
                <div class="w-1/3 bg-gray-200 rounded-full h-2.5">
                    <div class="bg-${colors[index]}-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
                <span class="text-sm font-medium">${percentage.toFixed(0)}%</span>
            `;
            topQueues.appendChild(div);
        });

        const avgTimeReport = document.getElementById('avg-time-report');
        const avgTimeData = [
            { label: 'Geral', time: response.data.reduce((sum, item) => sum + (item.avg_time || 0), 0) / response.data.length, color: 'blue' },
            { label: 'Mais rápido', time: Math.min(...response.data.map(item => item.avg_time || Infinity)), color: 'green', counter: response.data.find(item => item.avg_time === Math.min(...response.data.map(i => i.avg_time || Infinity)))?.counter },
            { label: 'Médio', time: response.data.reduce((sum, item) => sum + (item.avg_time || 0), 0) / response.data.length, color: 'yellow', counter: response.data[Math.floor(response.data.length / 2)]?.counter },
            { label: 'Mais lento', time: Math.max(...response.data.map(item => item.avg_time || 0)), color: 'red', counter: response.data.find(item => item.avg_time === Math.max(...response.data.map(i => i.avg_time || 0)))?.counter }
        ];
        avgTimeData.forEach(item => {
            if (item.time !== Infinity && item.time !== -Infinity) {
                const div = document.createElement('div');
                div.className = `bg-${item.color}-50 p-4 rounded-lg border border-${item.color}-100`;
                div.innerHTML = `
                    <div class="text-sm text-${item.color}-700 mb-1">${item.label}</div>
                    <div class="text-2xl font-bold">${Math.floor(item.time / 60)} min ${Math.round(item.time % 60)} s</div>
                    ${item.counter ? `<div class="text-xs text-${item.color}-500 mt-1">Guichê ${item.counter}</div>` : ''}
                `;
                avgTimeReport.appendChild(div);
            }
        });

        const detailedReport = document.getElementById('detailed-report');
        response.data.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.period || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.issued || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.avg_time ? `${Math.floor(item.avg_time / 60)} min ${Math.round(item.avg_time % 60)} s` : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.satisfaction ? item.satisfaction.toFixed(0) + '%' : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.efficiency ? item.efficiency.toFixed(0) + '%' : 'N/A'}</td>
            `;
            detailedReport.appendChild(row);
        });

        const ctx = document.getElementById('report-chart').getContext('2d');
        if (window.reportChart) {
            window.reportChart.destroy();
        }
        window.reportChart = new Chart(ctx, {
            type: reportType === 'comparative' ? 'line' : 'bar',
            data: {
                labels: response.data.map(item => item.service || item.period),
                datasets: [
                    {
                        label: 'Senhas Emitidas',
                        data: response.data.map(item => item.issued || 0),
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: '#3B82F6',
                        borderWidth: 1,
                        fill: reportType === 'comparative'
                    },
                    {
                        label: 'Senhas Atendidas',
                        data: response.data.map(item => item.attended || 0),
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: '#10B981',
                        borderWidth: 1,
                        fill: reportType === 'comparative'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Quantidade' }
                    },
                    x: {
                        title: { display: true, text: groupBy === 'queue' ? 'Fila' : 'Período' }
                    }
                }
            }
        });

        document.querySelectorAll('.chart-period-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active', 'bg-blue-100', 'text-blue-700'));
                btn.classList.add('active', 'bg-blue-100', 'text-blue-700');
                document.getElementById('report-period').value = btn.dataset.period;
                await generateReport();
            });
        });
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showError('Erro ao gerar relatório.', error.response?.data?.error || error.message);
    } finally {
        document.getElementById('report-chart-loading').classList.add('hidden');
    }
}

async function populateReportFilters() {
    try {
        const [queuesRes, attendantsRes] = await Promise.all([
            axios.get('/api/admin/queues'),
            axios.get('/api/admin/users?role=dept_admin')
        ]);

        const queueSelect = document.getElementById('report-queue');
        queueSelect.innerHTML = '<option value="all">Todas as filas</option>';
        queuesRes.data.forEach(queue => {
            const option = document.createElement('option');
            option.value = queue.id;
            option.textContent = queue.service;
            queueSelect.appendChild(option);
        });

        const attendantSelect = document.getElementById('report-attendant');
        attendantSelect.innerHTML = '<option value="all">Todos</option>';
        attendantsRes.data.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name || user.email;
            attendantSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar filtros:', error);
        showError('Erro ao carregar filtros do relatório.');
    }
}

document.getElementById('generate-report-btn')?.addEventListener('click', generateReport);

document.getElementById('report-period')?.addEventListener('change', () => {
    const customStart = document.getElementById('custom-start-date');
    const customEnd = document.getElementById('custom-end-date');
    if (document.getElementById('report-period').value === 'custom') {
        customStart.classList.remove('hidden');
        customEnd.classList.remove('hidden');
    } else {
        customStart.classList.add('hidden');
        customEnd.classList.add('hidden');
    }
});

document.getElementById('export-report-btn')?.addEventListener('click', async () => {
    try {
        const params = new URLSearchParams({
            period: document.getElementById('report-period').value,
            report_type: document.getElementById('report-type').value,
            queue_id: document.getElementById('report-queue').value,
            attendant_id: document.getElementById('report-attendant').value,
            group_by: document.getElementById('report-group').value
        });
        if (document.getElementById('report-period').value === 'custom') {
            params.append('start_date', document.getElementById('start-date')?.value);
            params.append('end_date', document.getElementById('end-date')?.value);
        }

        const response = await axios.get(`/api/admin/report?${params.toString()}&export=true`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'report_export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        showSuccess('Relatório exportado com sucesso.');
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        showError('Erro ao exportar relatório.');
    }
});

document.getElementById('print-report')?.addEventListener('click', () => {
    window.print();
});

document.addEventListener('DOMContentLoaded', () => {
    populateReportFilters();
});