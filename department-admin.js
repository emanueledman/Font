const API_BASE = 'https://fila-facilita2-0.onrender.com';
const socket = io(API_BASE, { transports: ['websocket'], reconnectionAttempts: 5 });

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                localStorage.clear();
                window.location.href = '/index.html';
            }
            return Promise.reject(error);
        }
    );

    try {
        await fetchUserInfo();
        await fetchDepartmentInfo();
        await fetchQueues();
        await fetchTickets();
        setupSocketListeners();
        setupEventListeners();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.', error.response?.data?.error || error.message);
    }
});

// Funções de Busca
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        showError('Erro ao carregar informações do usuário.');
    }
}

async function fetchDepartmentInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        const deptInfo = document.getElementById('department-info');
        if (response.data.department_name) {
            deptInfo.textContent = `Departamento: ${response.data.department_name} (ID: ${response.data.department_id})`;
        } else {
            deptInfo.textContent = 'Nenhum departamento vinculado.';
        }
    } catch (error) {
        console.error('Erro ao buscar departamento:', error);
        showError('Erro ao carregar informações do departamento.');
    }
}

async function fetchQueues() {
    try {
        const response = await axios.get('/api/admin/queues');
        renderQueues(response.data);
        localStorage.setItem('queues', JSON.stringify(response.data));
    } catch (error) {
        console.error('Erro ao buscar filas:', error);
        showError('Erro ao carregar filas.', error.response?.data?.error || error.message);
    }
}

async function fetchTickets() {
    try {
        const response = await axios.get('/api/tickets/admin');
        renderTickets(response.data);
    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        showError('Erro ao carregar tickets.', error.response?.data?.error || error.message);
    }
}

// Funções de Renderização
function renderQueues(queues) {
    const tbody = document.getElementById('queues');
    tbody.innerHTML = '';
    if (!queues || queues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhuma fila disponível.</td></tr>';
        return;
    }
    queues.forEach(queue => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3">${queue.service}</td>
            <td class="p-3">${queue.prefix}</td>
            <td class="p-3">${queue.status}</td>
            <td class="p-3">${queue.active_tickets}/${queue.daily_limit}</td>
            <td class="p-3">${queue.open_time || 'N/A'} - ${queue.end_time || 'N/A'}</td>
            <td class="p-3">
                <button onclick="callNext('${queue.id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm mr-1">Chamar</button>
                <button onclick="editQueue('${queue.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm mr-1">Editar</button>
                <button onclick="deleteQueue('${queue.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderTickets(tickets) {
    const tbody = document.getElementById('tickets');
    tbody.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhum ticket disponível.</td></tr>';
        return;
    }
    tickets.forEach(ticket => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3">${ticket.number}</td>
            <td class="p-3">${ticket.service}</td>
            <td class="p-3">${ticket.status}</td>
            <td class="p-3">${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</td>
            <td class="p-3">${new Date(ticket.issued_at).toLocaleString('pt-BR')}</td>
            <td class="p-3">
                ${ticket.status === 'Pendente' ? `<button onclick="callNext('${ticket.queue_id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm">Chamar</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

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

        // Renderizar gráfico
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

// Ações de Fila
async function callNext(queueId) {
    try {
        const response = await axios.post(`/api/admin/queue/${queueId}/call`);
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        await fetchQueues();
        await fetchTickets();
    } catch (error) {
        console.error('Erro ao chamar próxima senha:', error);
        showError('Erro ao chamar próxima senha.', error.response?.data?.error || error.message);
    }
}

function openQueueModal(mode, queue = null) {
    const modal = document.getElementById('queue-modal');
    const title = document.getElementById('queue-modal-title');
    const form = document.getElementById('queue-form');
    const submitBtn = document.getElementById('submit-queue-btn');

    if (mode === 'create') {
        title.textContent = 'Criar Nova Fila';
        submitBtn.textContent = 'Criar';
        form.reset();
        document.getElementById('queue_id').value = '';
    } else {
        title.textContent = 'Editar Fila';
        submitBtn.textContent = 'Salvar';
        document.getElementById('queue_id').value = queue.id;
        document.getElementById('service').value = queue.service;
        document.getElementById('prefix').value = queue.prefix;
        document.getElementById('open_time').value = queue.open_time || '';
        document.getElementById('daily_limit').value = queue.daily_limit;
        document.getElementById('num_counters').value = queue.num_counters;
    }

    modal.classList.remove('hidden');
}

async function editQueue(queueId) {
    try {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        const queue = queues.find(q => q.id === queueId);
        if (!queue) {
            showError('Fila não encontrada localmente.');
            return;
        }
        openQueueModal('edit', queue);
    } catch (error) {
        console.error('Erro ao editar fila:', error);
        showError('Erro ao carregar dados da fila.');
    }
}

async function deleteQueue(queueId) {
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return;
    try {
        await axios.delete(`/api/queue/${queueId}`);
        showSuccess('Fila excluída com sucesso.');
        await fetchQueues();
    } catch (error) {
        console.error('Erro ao excluir fila:', error);
        showError('Erro ao excluir fila.', error.response?.data?.error || error.message);
    }
}

// Validação de QR Code
function openQrModal() {
    const modal = document.getElementById('qr-modal');
    document.getElementById('qr-form').reset();
    modal.classList.remove('hidden');
}

async function validateQrCode(qrCode) {
    try {
        const response = await axios.post('/api/ticket/validate', { qr_code: qrCode });
        showSuccess(`Presença validada para ticket ${response.data.ticket_id}!`);
        await fetchTickets();
    } catch (error) {
        console.error('Erro ao validar QR code:', error);
        showError('Erro ao validar QR code.', error.response?.data?.error || error.message);
    }
}

// Configuração de Eventos
function setupEventListeners() {
    // Logout
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    // Tabs
    const tabs = {
        'tab-queues': 'queues-section',
        'tab-tickets': 'tickets-section',
        'tab-reports': 'reports-section',
        'tab-settings': 'settings-section'
    };
    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).addEventListener('click', () => {
            Object.keys(tabs).forEach(id => {
                const btn = document.getElementById(id);
                const section = document.getElementById(tabs[id]);
                if (id === tabId) {
                    btn.classList.add('bg-blue-500', 'text-white');
                    btn.classList.remove('bg-gray-300', 'text-gray-700');
                    section.classList.remove('hidden');
                } else {
                    btn.classList.add('bg-gray-300', 'text-gray-700');
                    btn.classList.remove('bg-blue-500', 'text-white');
                    section.classList.add('hidden');
                }
            });
        });
    });

    // Filtro de Filas
    document.getElementById('queue-filter').addEventListener('input', () => {
        const filter = document.getElementById('queue-filter').value.toLowerCase();
        document.querySelectorAll('#queues tr').forEach(row => {
            const service = row.cells[0].textContent.toLowerCase();
            row.style.display = service.includes(filter) ? '' : 'none';
        });
    });

    // Filtro de Tickets
    document.getElementById('ticket-filter').addEventListener('input', () => {
        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        document.querySelectorAll('#tickets tr').forEach(row => {
            const number = row.cells[0].textContent.toLowerCase();
            const service = row.cells[1].textContent.toLowerCase();
            row.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
        });
    });

    // Modal de Fila
    document.getElementById('create-queue-btn').addEventListener('click', () => openQueueModal('create'));
    document.getElementById('cancel-queue-btn').addEventListener('click', () => {
        document.getElementById('queue-modal').classList.add('hidden');
    });
    document.getElementById('queue-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            service: formData.get('service'),
            prefix: formData.get('prefix'),
            open_time: formData.get('open_time'),
            daily_limit: parseInt(formData.get('daily_limit')),
            num_counters: parseInt(formData.get('num_counters')),
            department_id: JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id || ''
        };
        const queueId = formData.get('queue_id');

        try {
            if (queueId) {
                await axios.put(`/api/queue/${queueId}`, data);
                showSuccess('Fila atualizada com sucesso.');
            } else {
                await axios.post('/api/queue/create', data);
                showSuccess('Fila criada com sucesso.');
            }
            document.getElementById('queue-modal').classList.add('hidden');
            await fetchQueues();
        } catch (error) {
            console.error('Erro ao salvar fila:', error);
            showError('Erro ao salvar fila.', error.response?.data?.error || error.message);
        }
    });

    // Modal de QR Code
    document.getElementById('validate-qr-btn').addEventListener('click', openQrModal);
    document.getElementById('cancel-qr-btn').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.add('hidden');
    });
    document.getElementById('qr-form').addEventListener('submit', async e => {
        e.preventDefault();
        const qrCode = document.getElementById('qr_code').value;
        await validateQrCode(qrCode);
        document.getElementById('qr-modal').classList.add('hidden');
    });

    // Relatório
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);

    // Modal de Erro
    document.getElementById('close-error-btn').addEventListener('click', () => {
        document.getElementById('error-modal').classList.add('hidden');
    });
}

// WebSocket
function setupSocketListeners() {
    socket.on('queue_update', async data => {
        showToast(`Fila atualizada: ${data.message}`);
        await fetchQueues();
        await fetchTickets();
    });

    socket.on('notification', data => {
        if (data.department_id === JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id) {
            showToast(data.message);
        }
    });

    socket.on('connect_error', () => {
        showError('Erro de conexão com o servidor. Tentando reconectar...');
    });

    socket.on('reconnect', () => {
        showSuccess('Conexão restabelecida!');
    });
}

// Feedback Visual
function showError(title, message = '') {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    modal.classList.remove('hidden');
}

function showSuccess(message) {
    showToast(message, 'bg-green-500');
}

function showToast(message, bgColor = 'bg-blue-500') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `text-white px-4 py-2 rounded-lg shadow-lg ${bgColor} animate-slide-in`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}