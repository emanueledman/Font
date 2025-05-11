// Base URL da API
const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
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
        loadDashboardData();
        setupNavigation();
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000); // Atualiza a cada minuto
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.', error.response?.data?.error || error.message);
    }
});

// Funções de Busca
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/users/me');
        document.getElementById('user-name').textContent = response.data.name || 'Usuário';
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        showError('Erro ao carregar informações do usuário.');
    }
}

async function fetchDepartmentInfo() {
    try {
        const response = await axios.get('/api/users/me');
        const deptInfo = document.getElementById('department-name');
        if (response.data.department_name) {
            deptInfo.textContent = response.data.department_name;
        } else {
            deptInfo.textContent = 'Nenhum departamento';
        }
    } catch (error) {
        console.error('Erro ao buscar departamento:', error);
        showError('Erro ao carregar informações do departamento.');
    }
}

async function fetchQueues() {
    try {
        const response = await axios.get('/api/queues');
        renderQueues(response.data);
        localStorage.setItem('queues', JSON.stringify(response.data));
    } catch (error) {
        console.error('Erro ao buscar filas:', error);
        showError('Erro ao carregar filas.', error.response?.data?.error || error.message);
    }
}

async function fetchTickets() {
    try {
        const response = await axios.get('/api/tickets');
        renderTickets(response.data);
    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        showError('Erro ao carregar tickets.', error.response?.data?.error || error.message);
    }
}

// Funções de Renderização
function renderQueues(queues) {
    const container = document.getElementById('queues-container');
    container.innerHTML = '';
    if (!queues || queues.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center">Nenhuma fila disponível.</div>';
        return;
    }
    queues.forEach(queue => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
        div.innerHTML = `
            <h3 class="text-lg font-semibold">${queue.service}</h3>
            <p class="text-gray-500">Prefixo: ${queue.prefix}</p>
            <p class="text-gray-500">Status: ${queue.status}</p>
            <p class="text-gray-500">Tickets: ${queue.active_tickets}/${queue.daily_limit}</p>
            <p class="text-gray-500">Horário: ${queue.open_time || 'N/A'} - ${queue.close_time || 'N/A'}</p>
            <div class="mt-4 flex space-x-2">
                <button onclick="callNext('${queue.id}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">Chamar</button>
                <button onclick="editQueue('${queue.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Editar</button>
                <button onclick="deleteQueue('${queue.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderTickets(tickets) {
    const container = document.getElementById('tickets-container');
    container.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center">Nenhum ticket disponível.</div>';
        return;
    }
    tickets.forEach(ticket => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
        div.innerHTML = `
            <h3 class="text-lg font-semibold">${ticket.number}</h3>
            <p class="text-gray-500">Serviço: ${ticket.service}</p>
            <p class="text-gray-500">Status: ${ticket.status}</p>
            <p class="text-gray-500">Guichê: ${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</p>
            <p class="text-gray-500">Emitido: ${new Date(ticket.issued_at).toLocaleString('pt-BR')}</p>
            ${ticket.status === 'Pendente' ? `
                <div class="mt-4">
                    <button onclick="callNext('${ticket.queue_id}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">Chamar</button>
                </div>
            ` : ''}
        `;
        container.appendChild(div);
    });
}

async function generateReport() {
    const period = document.getElementById('report-period').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const queueId = document.getElementById('report-queue').value;
    const attendantId = document.getElementById('report-attendant').value;

    let query = '';
    if (period === 'custom' && startDate && endDate) {
        query = `start_date=${startDate}&end_date=${endDate}`;
    } else {
        query = `period=${period}`;
    }
    if (queueId !== 'all') query += `&queue_id=${queueId}`;
    if (attendantId !== 'all') query += `&attendant_id=${attendantId}`;

    try {
        const response = await axios.get(`/api/reports?${query}`);
        const results = document.getElementById('report-results');
        results.innerHTML = '';
        if (response.data.length === 0) {
            results.innerHTML = '<p class="text-gray-500">Nenhum dado disponível para este período.</p>';
            return;
        }

        response.data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'p-4 bg-gray-50 rounded-lg mb-4';
            div.innerHTML = `
                <p><strong>Serviço:</strong> ${item.service}</p>
                <p><strong>Senhas Emitidas:</strong> ${item.issued}</p>
                <p><strong>Senhas Atendidas:</strong> ${item.attended}</p>
                <p><strong>Tempo Médio:</strong> ${item.avg_time ? item.avg_time.toFixed(2) + ' min' : 'N/A'}</p>
            `;
            results.appendChild(div);
        });

        const ctx = document.getElementById('activity-chart').getContext('2d');
        if (window.activityChart) {
            window.activityChart.destroy();
        }
        window.activityChart = new Chart(ctx, {
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

// Ações de Fila
async function callNext(queueId) {
    try {
        const response = await axios.post(`/api/queues/${queueId}/call`);
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        document.getElementById('current-ticket').textContent = response.data.ticket_number;
        document.getElementById('current-service').textContent = response.data.service;
        document.getElementById('current-counter').textContent = `Guichê ${response.data.counter}`;
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
        document.getElementById('close_time').value = queue.close_time || '';
        document.getElementById('daily_limit').value = queue.daily_limit;
        document.getElementById('num_counters').value = queue.num_counters;
        const workingDays = queue.working_days ? queue.working_days.split(',').map(Number) : [];
        document.querySelectorAll('input[name="working_days"]').forEach(checkbox => {
            checkbox.checked = workingDays.includes(Number(checkbox.value));
        });
        document.getElementById('queue_description').value = queue.description || '';
    }

    modal.classList.remove('hidden');
}

async function editQueue(queueId) {
    try {
        const response = await axios.get(`/api/queues/${queueId}`);
        openQueueModal('edit', response.data);
    } catch (error) {
        console.error('Erro ao editar fila:', error);
        showError('Erro ao carregar dados da fila.');
    }
}

async function deleteQueue(queueId) {
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return;
    try {
        await axios.delete(`/api/queues/${queueId}`);
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
        const response = await axios.post('/api/tickets/validate', { qr_code: qrCode });
        showSuccess(`Presença validada para ticket ${response.data.ticket_number}!`);
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

    // Navegação
    const navButtons = ['dashboard', 'call', 'queues', 'tickets', 'reports', 'settings'];
    navButtons.forEach(button => {
        document.getElementById(`nav-${button}`).addEventListener('click', () => {
            document.querySelectorAll('main > div').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(`${button}-section`).classList.remove('hidden');
            document.querySelectorAll('#sidebar nav button').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-700/90');
            });
            document.getElementById(`nav-${button}`).classList.add('active', 'bg-blue-700/90');
            if (button === 'queues') fetchQueues();
            if (button === 'tickets') fetchTickets();
            if (button === 'reports') generateReport();
        });
    });

    // Filtro de Filas
    document.getElementById('queue-filter').addEventListener('input', () => {
        const filter = document.getElementById('queue-filter').value.toLowerCase();
        document.querySelectorAll('#queues-container > div').forEach(card => {
            const service = card.querySelector('h3').textContent.toLowerCase();
            card.style.display = service.includes(filter) ? '' : 'none';
        });
    });

    // Filtro de Tickets
    document.getElementById('ticket-filter').addEventListener('input', () => {
        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        document.querySelectorAll('#tickets-container > div').forEach(card => {
            const number = card.querySelector('h3').textContent.toLowerCase();
            const service = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
            card.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
        });
    });

    // Modal de Fila
    document.getElementById('create-queue-btn').addEventListener('click', () => openQueueModal('create'));
    document.getElementById('cancel-queue-btn').addEventListener('click', () => {
        document.getElementById('queue-modal').classList.add('hidden');
    });
    document.getElementById('close-queue-modal').addEventListener('click', () => {
        document.getElementById('queue-modal').classList.add('hidden');
    });
    document.getElementById('queue-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const workingDays = Array.from(document.querySelectorAll('input[name="working_days"]:checked'))
            .map(input => input.value)
            .join(',');
        const data = {
            service: formData.get('service'),
            prefix: formData.get('prefix'),
            open_time: formData.get('open_time'),
            close_time: formData.get('close_time'),
            daily_limit: parseInt(formData.get('daily_limit')),
            num_counters: parseInt(formData.get('num_counters')),
            working_days: workingDays,
            description: formData.get('queue_description'),
            department_id: JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id || ''
        };
        const queueId = formData.get('queue_id');

        try {
            if (queueId) {
                await axios.put(`/api/queues/${queueId}`, data);
                showSuccess('Fila atualizada com sucesso.');
            } else {
                await axios.post('/api/queues', data);
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
    document.getElementById('close-qr-modal').addEventListener('click', () => {
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
    document.getElementById('close-error-modal').addEventListener('click', () => {
        document.getElementById('error-modal').classList.add('hidden');
    });

    // Modal de Ticket
    document.getElementById('generate-ticket-btn').addEventListener('click', () => {
        const modal = document.getElementById('ticket-modal');
        modal.classList.remove('hidden');
    });
    document.getElementById('cancel-ticket-btn').addEventListener('click', () => {
        document.getElementById('ticket-modal').classList.add('hidden');
    });
    document.getElementById('close-ticket-modal').addEventListener('click', () => {
        document.getElementById('ticket-modal').classList.add('hidden');
    });
    document.getElementById('ticket-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            queue_id: formData.get('ticket-queue'),
            priority: formData.get('ticket-priority'),
            notes: formData.get('ticket-notes')
        };
        try {
            await axios.post('/api/tickets', data);
            showSuccess('Ticket gerado com sucesso.');
            document.getElementById('ticket-modal').classList.add('hidden');
            await fetchTickets();
        } catch (error) {
            console.error('Erro ao gerar ticket:', error);
            showError('Erro ao gerar ticket.', error.response?.data?.error || error.message);
        }
    });

    // Ações Rápidas
    document.getElementById('quick-call').addEventListener('click', async () => {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        if (queues.length > 0) {
            await callNext(queues[0].id);
        } else {
            showError('Nenhuma fila disponível.');
        }
    });
    document.getElementById('quick-add').addEventListener('click', () => {
        document.getElementById('generate-ticket-btn').click();
    });
    document.getElementById('quick-report').addEventListener('click', () => {
        document.getElementById('nav-reports').click();
    });

    // Atualizar Dados
    document.getElementById('refresh-data').addEventListener('click', async () => {
        await fetchQueues();
        await fetchTickets();
        showSuccess('Dados atualizados com sucesso.');
    });
}

// WebSocket
function setupSocketListeners() {
    socket.on('ticket_created', async data => {
        showToast(`Novo ticket: ${data.ticket_number}`, 'bg-blue-500');
        if (!document.getElementById('tickets-section').classList.contains('hidden')) {
            await fetchTickets();
        }
    });

    socket.on('ticket_called', async data => {
        if (!document.getElementById('call-section').classList.contains('hidden')) {
            document.getElementById('current-ticket').textContent = data.ticket_number;
            document.getElementById('current-service').textContent = data.service;
            document.getElementById('current-counter').textContent = `Guichê ${data.counter}`;
        }
        await fetchTickets();
    });

    socket.on('queue_updated', async data => {
        showToast(`Fila atualizada: ${data.message}`, 'bg-blue-500');
        await fetchQueues();
    });

    socket.on('notification', data => {
        const departmentId = JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id;
        if (data.department_id === departmentId) {
            showToast(data.message, 'bg-blue-500');
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
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

function showSuccess(message) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').textContent = 'Sucesso';
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
    `;
    modal.classList.remove('hidden');
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

// Funções de Inicialização do Dashboard
function loadDashboardData() {
    document.getElementById('loading-overlay').classList.remove('hidden');
    setTimeout(async () => {
        try {
            const [queuesResponse, ticketsResponse] = await Promise.all([
                axios.get('/api/queues'),
                axios.get('/api/tickets')
            ]);
            const queues = queuesResponse.data;
            const tickets = ticketsResponse.data;

            document.getElementById('active-queues').textContent = queues.filter(q => q.status === 'Ativa').length;
            document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
            document.getElementById('today-calls').textContent = tickets.filter(t => t.status === 'Chamado' && new Date(t.called_at).toDateString() === new Date().toDateString()).length;
            document.getElementById('active-users').textContent = 'N/A'; // Necessita endpoint para usuários ativos

            const topQueues = queues.slice(0, 5).map(q => ({
                name: q.service,
                tickets: q.active_tickets
            }));
            const topQueuesContainer = document.getElementById('top-queues');
            topQueuesContainer.innerHTML = topQueues.map(q => `
                <div class="flex justify-between items-center">
                    <span>${q.name}</span>
                    <span class="font-medium">${q.tickets} tickets</span>
                </div>
            `).join('');

            initCharts();
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            showError('Erro ao carregar dashboard.');
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }, 1000);
}

function initCharts() {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    if (window.activityChart) {
        window.activityChart.destroy();
    }
    window.activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [
                {
                    label: 'Tickets Emitidos',
                    data: [65, 59, 80, 81, 56, 55],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    fill: false
                },
                {
                    label: 'Tickets Atendidos',
                    data: [28, 48, 40, 19, 86, 27],
                    borderColor: 'rgba(34, 197, 94, 1)',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function setupNavigation() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('w-20');
        sidebar.classList.toggle('w-64');
        document.querySelectorAll('#sidebar span:not(.notification-badge)').forEach(span => {
            span.classList.toggle('hidden');
        });
    });
}

function updateCurrentDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
}