document.addEventListener('DOMContentLoaded', function() {
    // Mostrar spinner
    toggleLoading(true, 'Carregando página...');

    // Carregar dados iniciais
    Promise.all([
        loadDashboardData().catch(error => {
            console.error('Erro em loadDashboardData:', error);
            return null;
        }),
        checkAuthStatus().catch(error => {
            console.error('Erro em checkAuthStatus:', error);
            return null;
        })
    ]).then(() => {
        toggleLoading(false);
        setupNavigation();
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000);
        // WebSocket opcional
        try {
            initWebSocket();
        } catch (error) {
            console.error('Erro ao inicializar WebSocket:', error);
        }
    }).catch(error => {
        console.error('Erro ao carregar página:', error);
        showToast('Falha ao carregar a página. Algumas funções podem estar limitadas.', 'error');
        toggleLoading(false);
    });
});

// Função para controlar o spinner
function toggleLoading(show, message = 'Carregando...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingOverlay && loadingMessage) {
        if (show) {
            loadingMessage.textContent = message;
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Carrega dados do dashboard
async function loadDashboardData() {
    try {
        toggleLoading(true, 'Carregando dados do dashboard...');
        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.display = 'block';
        });

        const token = localStorage.getItem('token');
        console.log('Token usado:', token || 'Nenhum token');

        // Requisição à API
        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/dashboard', {
            timeout: 10000,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        console.log('Resposta da API dashboard:', response.data);

        // Atualizar cards
        document.getElementById('active-queues').textContent = response.data.active_queues || '0';
        document.getElementById('pending-tickets').textContent = response.data.pending_tickets || '0';
        document.getElementById('today-calls').textContent = response.data.today_calls || '0';
        document.getElementById('active-users').textContent = response.data.active_users || '0';

        // Atualizar tendências
        document.getElementById('active-queues-trend').textContent = response.data.active_queues_trend 
            ? (response.data.active_queues_trend > 0 ? `+${response.data.active_queues_trend}` : response.data.active_queues_trend)
            : '';
        document.getElementById('pending-tickets-trend').textContent = response.data.pending_tickets_trend 
            ? (response.data.pending_tickets_trend > 0 ? `+${response.data.pending_tickets_trend}` : response.data.pending_tickets_trend)
            : '';

        // Atualizar nome do departamento
        document.getElementById('department-name').textContent = response.data.department_name || 'Departamento';

        // Inicializar gráficos
        initCharts(response.data.chart_data || {});

        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.display = 'none';
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error.response || error);
        showToast('Falha ao carregar dados do dashboard. Usando valores padrão.', 'error');

        // Preencher com valores padrão
        document.getElementById('active-queues').textContent = '0';
        document.getElementById('pending-tickets').textContent = '0';
        document.getElementById('today-calls').textContent = '0';
        document.getElementById('active-users').textContent = '0';
        document.getElementById('department-name').textContent = 'Departamento';
        document.getElementById('active-queues-trend').textContent = '';
        document.getElementById('pending-tickets-trend').textContent = '';

        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.display = 'none';
        });
    } finally {
        toggleLoading(false);
    }
}

// Configura navegação
function setupNavigation() {
    const navButtons = ['dashboard', 'call', 'queues', 'tickets', 'reports', 'settings'];
    navButtons.forEach(button => {
        const navButton = document.getElementById(`nav-${button}`);
        if (navButton) {
            navButton.addEventListener('click', () => {
                document.querySelectorAll('main > div').forEach(section => {
                    section.classList.add('hidden');
                });
                const section = document.getElementById(`${button}-section`);
                if (section) {
                    section.classList.remove('hidden');
                }

                document.querySelectorAll('#sidebar nav button').forEach(btn => {
                    btn.classList.remove('active');
                });
                navButton.classList.add('active');

                if (button === 'queues') loadQueues();
                if (button === 'tickets') loadTickets();
                if (button === 'dashboard') loadDashboardData();
            });
        }
    });

    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}

// Inicializa WebSocket
function initWebSocket() {
    const token = localStorage.getItem('token');
    const socket = io('https://fila-facilita2-0.onrender.com', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnectionAttempts: 5,
        auth: token ? { token } : {}
    });

    socket.on('connect', () => {
        console.log('Conectado ao WebSocket');
        showToast('Conexão em tempo real estabelecida.', 'success');
    });

    socket.on('new_ticket', (data) => {
        showToast(`Novo ticket: ${data.ticket_number || 'N/A'}`, 'info');
        if (!document.getElementById('tickets-section').classList.contains('hidden')) {
            loadTickets();
        }
    });

    socket.on('called_ticket', (data) => {
        if (!document.getElementById('call-section').classList.contains('hidden')) {
            updateCurrentTicket(data);
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Erro na conexão WebSocket:', error);
        showToast('Falha na conexão em tempo real. Atualizações automáticas desativadas.', 'error');
    });

    socket.on('disconnect', () => {
        showToast('Conexão perdida. Tentando reconectar...', 'error');
    });
}

// Atualiza data e hora
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
    const currentDate = document.getElementById('current-date');
    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString('pt-BR', options);
    }
}

// Verifica autenticação
async function checkAuthStatus() {
    try {
        const token = localStorage.getItem('token');
        console.log('Verificando autenticação com token:', token || 'Nenhum token');

        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/auth/status', {
            timeout: 5000,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        console.log('Resposta da autenticação:', response.data);

        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        if (userName) userName.textContent = response.data.name || 'Usuário';
        if (userEmail) userEmail.textContent = response.data.email || 'email@empresa.com';
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error.response || error);
        showToast('Não foi possível verificar a sessão. Algumas funções podem estar limitadas.', 'warning');
        // Não redireciona automaticamente
    }
}

// Exibe notificações
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container não encontrado');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : type === 'warning' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' : 'M6 18L18 6M6 6l12 12'}"/>
            </svg>
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Carrega filas
async function loadQueues() {
    try {
        toggleLoading(true, 'Carregando filas...');
        const queuesLoading = document.getElementById('queues-loading');
        const queuesContainer = document.getElementById('queues-container');
        if (queuesLoading) queuesLoading.classList.remove('hidden');
        if (queuesContainer) queuesContainer.innerHTML = '';

        const token = localStorage.getItem('token');
        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/queues', {
            timeout: 10000,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        console.log('Resposta da API queues:', response.data);

        const queues = response.data.queues || [];
        if (queuesContainer) {
            if (queues.length === 0) {
                queuesContainer.innerHTML = '<p>Nenhuma fila disponível.</p>';
            } else {
                queues.forEach(queue => {
                    queuesContainer.innerHTML += `
                        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold">${queue.service || 'Sem nome'}</h3>
                                <span class="px-2 py-1 rounded-full text-xs ${queue.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                    ${queue.status === 'active' ? 'Ativa' : 'Inativa'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-500 mb-2">Prefixo: ${queue.prefix || 'N/A'}</p>
                            <p class="text-sm text-gray-500 mb-2">Tickets Pendentes: ${queue.pending_tickets || '0'}</p>
                            <p class="text-sm text-gray-500 mb-4">Horário: ${queue.open_time || 'N/A'} - ${queue.close_time || 'N/A'}</p>
                            <div class="flex space-x-2">
                                <button onclick="editQueue(${queue.id})" class="text-blue-600 hover:text-blue-800 text-sm">Editar</button>
                                <button onclick="deleteQueue(${queue.id})" class="text-red-600 hover:text-red-700 text-sm">Excluir</button>
                            </div>
                        </div>
                    `;
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar filas:', error.response || error);
        showToast('Falha ao carregar filas.', 'error');
        if (document.getElementById('queues-container')) {
            document.getElementById('queues-container').innerHTML = '<p>Nenhuma fila disponível.</p>';
        }
    } finally {
        toggleLoading(false);
        const queuesLoading = document.getElementById('queues-loading');
        if (queuesLoading) queuesLoading.classList.add('hidden');
    }
}

// Carrega tickets
async function loadTickets() {
    try {
        toggleLoading(true, 'Carregando tickets...');
        const ticketsLoading = document.getElementById('tickets-loading');
        const ticketsContainer = document.getElementById('tickets-container');
        if (ticketsLoading) ticketsLoading.classList.remove('hidden');
        if (ticketsContainer) ticketsContainer.innerHTML = '';

        const token = localStorage.getItem('token');
        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/tickets', {
            timeout: 10000,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        console.log('Resposta da API tickets:', response.data);

        const tickets = response.data.tickets || [];
        if (ticketsContainer) {
            if (tickets.length === 0) {
                ticketsContainer.innerHTML = '<p>Nenhum ticket disponível.</p>';
            } else {
                tickets.forEach(ticket => {
                    ticketsContainer.innerHTML += `
                        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold">${ticket.ticket_number || 'N/A'}</h3>
                                <span class="px-2 py-1 rounded-full text-xs ${ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ticket.status === 'called' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                                    ${ticket.status === 'pending' ? 'Pendente' : ticket.status === 'called' ? 'Chamado' : 'Concluído'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-500 mb-2">Fila: ${ticket.queue_name || 'N/A'}</p>
                            <p class="text-sm text-gray-500 mb-2">Criado em: ${ticket.created_at ? new Date(ticket.created_at).toLocaleString('pt-BR') : 'N/A'}</p>
                            <p class="text-sm text-gray-500 mb-4">Prioridade: ${ticket.priority || 'N/A'}</p>
                            <div class="flex space-x-2">
                                <button onclick="viewTicket(${ticket.id})" class="text-blue-600 hover:text-blue-800 text-sm">Ver Detalhes</button>
                                <button onclick="cancelTicket(${ticket.id})" class="text-red-600 hover:text-red-700 text-sm">Cancelar</button>
                            </div>
                        </div>
                    `;
                });
            }
        }
    } catch (error) {
        console.error('Erro ao carregar tickets:', error.response || error);
        showToast('Falha ao carregar tickets.', 'error');
        if (document.getElementById('tickets-container')) {
            document.getElementById('tickets-container').innerHTML = '<p>Nenhum ticket disponível.</p>';
        }
    } finally {
        toggleLoading(false);
        const ticketsLoading = document.getElementById('tickets-loading');
        if (ticketsLoading) ticketsLoading.classList.add('hidden');
    }
}

// Funções placeholder
function initCharts(chartData) {
    console.log('Inicializando gráficos com dados:', chartData);
    // Implementar com Chart.js se necessário
}

async function handleLogout() {
    try {
        toggleLoading(true, 'Saindo...');
        const token = localStorage.getItem('token');
        await axios.post('https://fila-facilita2-0.onrender.com/api/logout', {}, {
            timeout: 5000,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        localStorage.removeItem('token');
        window.location.href = '/login';
    } catch (error) {
        console.error('Erro ao fazer logout:', error.response || error);
        showToast('Falha ao sair. Tente novamente.', 'error');
        localStorage.removeItem('token');
        window.location.href = '/login';
    } finally {
        toggleLoading(false);
    }
}

function updateCurrentTicket(data) {
    const currentTicket = document.getElementById('current-ticket');
    const currentService = document.getElementById('current-service');
    const currentCounter = document.getElementById('current-counter');
    const avgWaitTime = document.getElementById('avg-wait-time');

    if (currentTicket) currentTicket.textContent = data.ticket_number || '---';
    if (currentService) currentService.textContent = data.service || '';
    if (currentCounter) currentCounter.textContent = data.counter || '';
    if (avgWaitTime) avgWaitTime.textContent = data.avg_wait_time || 'N/A';
}

// Ações rápidas
const callNextButton = document.getElementById('call-next-btn');
if (callNextButton) {
    callNextButton.addEventListener('click', async () => {
        try {
            toggleLoading(true, 'Chamando próximo ticket...');
            const token = localStorage.getItem('token');
            const response = await axios.post('https://fila-facilita2-0.onrender.com/api/call/next', {}, {
                timeout: 5000,
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            console.log('Resposta da API call/next:', response.data);
            updateCurrentTicket(response.data);
            showToast('Próximo ticket chamado!', 'success');
        } catch (error) {
            console.error('Erro ao chamar próximo:', error.response || error);
            showToast('Falha ao chamar próximo ticket.', 'error');
        } finally {
            toggleLoading(false);
        }
    });
}

// Funções placeholder para botões de filas e tickets
function editQueue(id) {
    console.log('Editar fila:', id);
    showToast('Função de edição de fila não implementada.', 'warning');
}

function deleteQueue(id) {
    console.log('Excluir fila:', id);
    showToast('Função de exclusão de fila não implementada.', 'warning');
}

function viewTicket(id) {
    console.log('Ver ticket:', id);
    showToast('Função de visualização de ticket não implementada.', 'warning');
}

function cancelTicket(id) {
    console.log('Cancelar ticket:', id);
    showToast('Função de cancelamento de ticket não implementada.', 'warning');
}