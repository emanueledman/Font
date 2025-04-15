const API_BASE = 'https://fila-facilita2-0.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    // Mostrar spinner
    toggleLoading(true, 'Carregando painel...');

    const token = localStorage.getItem('adminToken');
    console.log('Token usado:', token || 'Nenhum token');

    if (!token) {
        console.warn('Nenhum token encontrado. Algumas funções podem estar limitadas.');
        showToast('Faça login para acessar todas as funcionalidades.', 'warning');
        // Continuar sem redirecionar
    } else {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    axios.defaults.baseURL = API_BASE;

    // Interceptor para erros 401
    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                showToast('Sessão expirada. Algumas funções podem estar limitadas.', 'warning');
                localStorage.removeItem('adminToken');
                // Não redireciona automaticamente
            }
            return Promise.reject(error);
        }
    );

    try {
        await Promise.all([
            fetchUserInfo().catch(err => {
                console.error('Erro em fetchUserInfo:', err);
                return null;
            }),
            fetchDepartmentInfo().catch(err => {
                console.error('Erro em fetchDepartmentInfo:', err);
                return null;
            }),
            fetchDashboardData().catch(err => {
                console.error('Erro em fetchDashboardData:', err);
                return null;
            })
        ]);

        await fetchQueues();
        await fetchTickets();
        await fetchCurrentCall();
        setupSocketListeners();
        setupNavigation();

        // Configurar botão de atualizar
        const refreshButton = document.getElementById('refresh-data');
        if (refreshButton) {
            refreshButton.addEventListener('click', async () => {
                toggleLoading(true, 'Atualizando dados...');
                try {
                    await fetchDashboardData();
                    showToast('Dados atualizados com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao atualizar:', error);
                    showToast('Falha ao atualizar dados.', 'error');
                } finally {
                    toggleLoading(false);
                }
            });
        }

        // Configurar notificações
        const notificationsBtn = document.getElementById('notifications-btn');
        const notificationsDropdown = document.getElementById('notifications-dropdown');
        if (notificationsBtn && notificationsDropdown) {
            notificationsBtn.addEventListener('click', () => {
                notificationsDropdown.classList.toggle('hidden');
            });
        }
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao inicializar painel.', 'error');
    } finally {
        toggleLoading(false);
    }
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

// Busca informações do usuário
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/profile', { timeout: 5000 });
        console.log('Resposta do perfil:', response.data);
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        if (userName) userName.textContent = response.data.name || 'Usuário';
        if (userEmail) userEmail.textContent = response.data.email || 'email@empresa.com';
    } catch (error) {
        console.error('Erro ao buscar usuário:', error.response || error);
        showToast('Não foi possível carregar informações do usuário.', 'warning');
    }
}

// Busca informações do departamento
async function fetchDepartmentInfo() {
    try {
        const response = await axios.get('/api/admin/department', { timeout: 5000 });
        console.log('Resposta do departamento:', response.data);
        const departmentName = document.getElementById('department-name');
        if (departmentName) {
            departmentName.textContent = response.data.department_name || 'Departamento';
        }
    } catch (error) {
        console.error('Erro ao buscar departamento:', error.response || error);
        showToast('Não foi possível carregar nome do departamento.', 'warning');
        if (document.getElementById('department-name')) {
            document.getElementById('department-name').textContent = 'Departamento';
        }
    }
}

// Carrega dados do dashboard
async function fetchDashboardData() {
    try {
        toggleLoading(true, 'Carregando dados do dashboard...');
        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.display = 'block';
        });

        const today = new Date().toISOString().split('T')[0];
        const [queuesRes, ticketsRes, reportRes] = await Promise.all([
            axios.get('/api/admin/queues', { timeout: 10000 }),
            axios.get('/api/tickets/admin', { timeout: 10000 }),
            axios.get(`/api/admin/report?date=${today}`, { timeout: 10000 })
        ]);

        console.log('Resposta queues:', queuesRes.data);
        console.log('Resposta tickets:', ticketsRes.data);
        console.log('Resposta report:', reportRes.data);

        const queues = queuesRes.data || [];
        const tickets = ticketsRes.data || [];
        const report = reportRes.data || [];

        // Atualizar cards
        document.getElementById('active-queues').textContent = queues.length || '0';
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length || '0';
        document.getElementById('today-calls').textContent = report.reduce((sum, item) => sum + (item.attended || 0), 0) || '0';
        document.getElementById('active-users').textContent = '1'; // Simulado, ajustar se houver endpoint

        // Atualizar tendências (mockadas, ajustar conforme API)
        document.getElementById('active-queues-trend').textContent = '+2 hoje';
        document.getElementById('pending-tickets-trend').textContent = '+12 hoje';

        // Atualizar gráfico
        const ctx = document.getElementById('activity-chart')?.getContext('2d');
        if (ctx) {
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: report.map(item => item.service || 'Desconhecido'),
                    datasets: [{
                        label: 'Senhas Atendidas',
                        data: report.map(item => item.attended || 0),
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }

        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.display = 'none';
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error.response || error);
        showToast('Falha ao carregar dados do dashboard.', 'error');

        document.getElementById('active-queues').textContent = '0';
        document.getElementById('pending-tickets').textContent = '0';
        document.getElementById('today-calls').textContent = '0';
        document.getElementById('active-users').textContent = '0';
        document.getElementById('active-queues-trend').textContent = '';
        document.getElementById('pending-tickets-trend').textContent = '';

        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.display = 'none';
        });
    } finally {
        toggleLoading(false);
    }
}

// Carrega filas
async function fetchQueues() {
    try {
        toggleLoading(true, 'Carregando filas...');
        const queuesContainer = document.getElementById('queues-container');
        const queuesLoading = document.getElementById('queues-loading');
        if (queuesLoading) queuesLoading.classList.remove('hidden');
        if (queuesContainer) queuesContainer.innerHTML = '';

        const response = await axios.get('/api/admin/queues', { timeout: 10000 });
        console.log('Resposta queues:', response.data);

        const queues = response.data || [];
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
        if (document.getElementById('queues-loading')) {
            document.getElementById('queues-loading').classList.add('hidden');
        }
    }
}

// Carrega tickets
async function fetchTickets() {
    try {
        toggleLoading(true, 'Carregando tickets...');
        const ticketsContainer = document.getElementById('tickets-container');
        const ticketsLoading = document.getElementById('tickets-loading');
        if (ticketsLoading) ticketsLoading.classList.remove('hidden');
        if (ticketsContainer) ticketsContainer.innerHTML = '';

        const response = await axios.get('/api/tickets/admin', { timeout: 10000 });
        console.log('Resposta tickets:', response.data);

        const tickets = response.data || [];
        if (ticketsContainer) {
            if (tickets.length === 0) {
                ticketsContainer.innerHTML = '<p>Nenhum ticket disponível.</p>';
            } else {
                tickets.forEach(ticket => {
                    ticketsContainer.innerHTML += `
                        <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-lg font-semibold">${ticket.ticket_number || 'N/A'}</h3>
                                <span class="px-2 py-1 rounded-full text-xs ${ticket.status === 'Pendente' ? 'bg-yellow-100 text-yellow-800' : ticket.status === 'Chamado' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                                    ${ticket.status || 'Desconhecido'}
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
        if (document.getElementById('tickets-loading')) {
            document.getElementById('tickets-loading').classList.add('hidden');
        }
    }
}

// Busca chamada atual
async function fetchCurrentCall() {
    try {
        const response = await axios.get('/api/call/current', { timeout: 5000 });
        console.log('Resposta current call:', response.data);
        updateCurrentTicket(response.data);
    } catch (error) {
        console.error('Erro ao buscar chamada atual:', error.response || error);
        showToast('Falha ao carregar chamada atual.', 'error');
        updateCurrentTicket({});
    }
}

// Configura navegação
function setupNavigation() {
    const sections = {
        'nav-dashboard': 'dashboard-section',
        'nav-call': 'call-section',
        'nav-queues': 'queues-section',
        'nav-tickets': 'tickets-section',
        'nav-reports': 'reports-section',
        'nav-settings': 'settings-section'
    };

    Object.keys(sections).forEach(navId => {
        const btn = document.getElementById(navId);
        if (btn) {
            btn.addEventListener('click', () => {
                Object.keys(sections).forEach(id => {
                    const otherBtn = document.getElementById(id);
                    const section = document.getElementById(sections[id]);
                    if (id === navId) {
                        otherBtn.classList.add('bg-blue-700');
                        otherBtn.classList.remove('hover:bg-blue-600');
                        if (section) section.classList.remove('hidden');
                        // Recarregar dados
                        if (id === 'nav-dashboard') fetchDashboardData();
                        if (id === 'nav-queues') fetchQueues();
                        if (id === 'nav-tickets') fetchTickets();
                    } else {
                        otherBtn.classList.remove('bg-blue-700');
                        otherBtn.classList.add('hover:bg-blue-600');
                        if (section) section.classList.add('hidden');
                    }
                });
            });
        }
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        });
    }

    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                toggleLoading(true, 'Saindo...');
                await axios.post('/api/logout', {}, { timeout: 5000 });
                localStorage.removeItem('adminToken');
                window.location.href = '/index.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error.response || error);
                showToast('Falha ao sair. Sessão limpa localmente.', 'error');
                localStorage.removeItem('adminToken');
                window.location.href = '/index.html';
            } finally {
                toggleLoading(false);
            }
        });
    }
}

// Configura WebSocket
function setupSocketListeners() {
    const socket = io(API_BASE, {
        path: '/socket.io',
        transports: ['websocket'],
        reconnectionAttempts: 5,
        auth: {
            token: localStorage.getItem('adminToken') || ''
        }
    });

    socket.on('connect', () => {
        console.log('Conectado ao WebSocket');
        showToast('Conexão em tempo real estabelecida.', 'success');
    });

    socket.on('new_ticket', (data) => {
        showToast(`Novo ticket: ${data.ticket_number || 'N/A'}`, 'info');
        if (!document.getElementById('tickets-section')?.classList.contains('hidden')) {
            fetchTickets();
        }
        if (!document.getElementById('dashboard-section')?.classList.contains('hidden')) {
            fetchDashboardData();
        }
    });

    socket.on('called_ticket', (data) => {
        showToast(`Ticket chamado: ${data.ticket_number || 'N/A'}`, 'info');
        if (!document.getElementById('call-section')?.classList.contains('hidden')) {
            updateCurrentTicket(data);
        }
        if (!document.getElementById('dashboard-section')?.classList.contains('hidden')) {
            fetchDashboardData();
        }
    });

    socket.on('connect_error', (error) => {
        console.error('Erro na conexão WebSocket:', error);
        showToast('Falha na conexão em tempo real.', 'error');
    });

    socket.on('disconnect', () => {
        showToast('Conexão perdida. Tentando reconectar...', 'error');
    });
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
                    type === 'success' ? 'M5 13l4 4L19 7' :
                    type === 'warning' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' :
                    'M6 18L18 6M6 6l12 12'
                }"/>
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

// Atualiza ticket atual
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
const quickCallButton = document.getElementById('quick-call');
if (quickCallButton) {
    quickCallButton.addEventListener('click', async () => {
        try {
            toggleLoading(true, 'Chamando próximo ticket...');
            const response = await axios.post('/api/call/next', {}, { timeout: 5000 });
            console.log('Resposta call/next:', response.data);
            updateCurrentTicket(response.data);
            showToast('Próximo ticket chamado!', 'success');
            fetchDashboardData();
        } catch (error) {
            console.error('Erro ao chamar próximo:', error.response || error);
            showToast('Falha ao chamar próximo ticket.', 'error');
        } finally {
            toggleLoading(false);
        }
    });
}

const quickAddButton = document.getElementById('quick-add');
if (quickAddButton) {
    quickAddButton.addEventListener('click', () => {
        showToast('Função de adicionar ticket não implementada.', 'warning');
    });
}

const quickReportButton = document.getElementById('quick-report');
if (quickReportButton) {
    quickReportButton.addEventListener('click', () => {
        showToast('Função de gerar relatório não implementada.', 'warning');
    });
}

// Funções placeholder
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

// Exibe erros
function showError(message, detail = '') {
    showToast(`${message} ${detail}`, 'error');
}