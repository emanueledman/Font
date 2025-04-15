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
        // Inicializar WebSocket apenas se necessário
        try {
            initWebSocket();
        } catch (error) {
            console.error('Erro ao inicializar WebSocket:', error);
        }
    }).catch(error => {
        console.error('Erro ao carregar página:', error);
        showToast('Falha ao carregar a página. Tente novamente.', 'error');
        toggleLoading(false);
    });
});

// Função para controlar o spinner
function toggleLoading(show, message = 'Carregando...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    if (show) {
        loadingMessage.textContent = message;
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// Carrega dados do dashboard
async function loadDashboardData() {
    try {
        toggleLoading(true, 'Carregando dados do dashboard...');
        document.querySelectorAll('.skeleton').forEach(el => {
            el.style.display = 'block';
        });

        // Requisição à API
        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/dashboard', {
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        console.log('Resposta da API dashboard:', response.data);

        // Atualizar cards
        document.getElementById('active-queues').textContent = response.data.active_queues || '0';
        document.getElementById('pending-tickets').textContent = response.data.pending_tickets || '0';
        document.getElementById('today-calls').textContent = response.data.today_calls || '0';
        document.getElementById('active-users').textContent = response.data.active_users || '0';

        // Atualizar tendências (se disponíveis)
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
        console.error('Erro ao carregar dashboard:', error);
        showToast('Falha ao carregar dados do dashboard. Verifique a conexão.', 'error');

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
    const socket = io('https://fila-facilita2-0.onrender.com', {
        path: '/socket.io',
        transports: ['websocket'],
        reconnectionAttempts: 5,
        auth: {
            token: localStorage.getItem('token') || ''
        }
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
        showToast('Falha na conexão em tempo real.', 'error');
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
        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/auth/status', {
            timeout: 5000,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        console.log('Resposta da autenticação:', response.data);
        document.getElementById('user-name').textContent = response.data.name || 'Usuário';
        document.getElementById('user-email').textContent = response.data.email || 'email@empresa.com';
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        showToast('Sessão expirada. Redirecionando...', 'error');
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
        throw error;
    }
}

// Exibe notificações
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}"/>
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
        document.getElementById('queues-loading').classList.remove('hidden');
        document.getElementById('queues-container').innerHTML = '';

        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/queues', {
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        console.log('Resposta da API queues:', response.data);

        const queues = response.data.queues || [];
        queues.forEach(queue => {
            document.getElementById('queues-container').innerHTML += `
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
    } catch (error) {
        console.error('Erro ao carregar filas:', error);
        showToast('Falha ao carregar filas.', 'error');
        document.getElementById('queues-container').innerHTML = '<p>Nenhuma fila disponível.</p>';
    } finally {
        toggleLoading(false);
        document.getElementById('queues-loading').classList.add('hidden');
    }
}

// Carrega tickets
async function loadTickets() {
    try {
        toggleLoading(true, 'Carregando tickets...');
        document.getElementById('tickets-loading').classList.remove('hidden');
        document.getElementById('tickets-container').innerHTML = '';

        const response = await axios.get('https://fila-facilita2-0.onrender.com/api/tickets', {
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });

        console.log('Resposta da API tickets:', response.data);

        const tickets = response.data.tickets || [];
        tickets.forEach(ticket => {
            document.getElementById('tickets-container').innerHTML += `
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
    } catch (error) {
        console.error('Erro ao carregar tickets:', error);
        showToast('Falha ao carregar tickets.', 'error');
        document.getElementById('tickets-container').innerHTML = '<p>Nenhum ticket disponível.</p>';
    } finally {
        toggleLoading(false);
        document.getElementById('tickets-loading').classList.add('hidden');
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
        await axios.post('https://fila-facilita2-0.onrender.com/api/logout', {}, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
            }
        });
        localStorage.removeItem('token');
        window.location.href = '/login';
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        showToast('Falha ao sair. Tente novamente.', 'error');
    } finally {
        toggleLoading(false);
    }
}

function updateCurrentTicket(data) {
    document.getElementById('current-ticket').textContent = data.ticket_number || '---';
    document.getElementById('current-service').textContent = data.service || '';
    document.getElementById('current-counter').textContent = data.counter || '';
    document.getElementById('avg-wait-time').textContent = data.avg_wait_time || 'N/A';
}

// Ações rápidas (exemplo: chamar próximo ticket)
const callNextButton = document.getElementById('call-next-btn');
if (callNextButton) {
    callNextButton.addEventListener('click', async () => {
        try {
            toggleLoading(true, 'Chamando próximo ticket...');
            const response = await axios.post('https://fila-facilita2-0.onrender.com/api/call/next', {}, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
                }
            });
            updateCurrentTicket(response.data);
            showToast('Próximo ticket chamado!', 'success');
        } catch (error) {
            console.error('Erro ao chamar próximo:', error);
            showToast('Falha ao chamar próximo ticket.', 'error');
        } finally {
            toggleLoading(false);
        }
    });
}