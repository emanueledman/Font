async function generateReport() {
    const date = document.getElementById('report-date').value;
    if (!date) {
        showError('Selecione uma data para o relatório.');
        return;
    }
    try {
        const response = await axios.get(`/api/admin/report?date=${date}`);
        const results = document.getElementById('report-results');
        results.innerHTML = '';
        if (response.data.length === 0) {
            results.innerHTML = '<p class="text-gray-500">Nenhum dado disponível para esta data.</p>';
            return;
        }

        response.data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'p-4 bg-gray-50 rounded-lg';
            div.innerHTML = `
                <p><strong>Serviço:</strong> ${item.service}</p>
                <p><strong>Senhas Emitidas:</strong> ${item.issued}</p>
                <p><strong>Senhas Atendidas:</strong> ${item.attended}</p>
                <p><strong>Tempo Médio:</strong> ${item.avg_time ? item.avg_time.toFixed(2) + ' min' : 'N/A'}</p>
            `;
            results.appendChild(div);
        });

        const ctx = document.getElementById('report-chart').getContext('2d');
        if (window.reportChart) {
            window.reportChart.destroy();
        }
        window.reportChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: response.data.map(item => item.service),
                datasets: [
                    {
                        label: 'Senhas Emitidas',
                        data: response.data.map(item => item.issued),
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Senhas Atendidas',
                        data: response.data.map(item => item.attended),
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Quantidade'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Serviço'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showError('Erro ao gerar relatório.', error.response?.data?.error || error.message);
    }
}

document.getElementById('generate-report-btn')?.addEventListener('click', generateReport);