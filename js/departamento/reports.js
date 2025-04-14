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
            results.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum dado disponível para esta data.</p>';
            return;
        }

        response.data.forEach(item => {
            const card = document.createElement('div');
            card.className = 'card bg-white rounded-xl shadow-lg p-6';
            card.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-800">${item.service}</h3>
                <p class="text-gray-600">Senhas Emitidas: ${item.issued}</p>
                <p class="text-gray-600">Senhas Atendidas: ${item.attended}</p>
                <p class="text-gray-600">Tempo Médio: ${item.avg_time ? item.avg_time.toFixed(2) + ' min' : 'N/A'}</p>
            `;
            results.appendChild(card);
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
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: '#3B82F6',
                        borderWidth: 1
                    },
                    {
                        label: 'Senhas Atendidas',
                        data: response.data.map(item => item.attended),
                        backgroundColor: 'rgba(16, 185, 129, 0.6)',
                        borderColor: '#10B981',
                        borderWidth: 1
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
                        title: { display: true, text: 'Serviço' }
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