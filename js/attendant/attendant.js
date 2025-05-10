const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
let socket = null;

// Sanitiza entradas
const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

// Limpa dados sensíveis
const clearSensitiveData = () => {
    ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        ['adminToken', 'userRole', 'queues', 'redirectCount'].forEach(key => storage.removeItem(key));
    });
};

// Obtém token
const getToken = () => {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
};

// Controla spinner de carregamento
const toggleLoading = (show, message = 'Carregando...') => {
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
};

// Exibe notificações
const showToast = (message, type = 'success') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in`;
    toast.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
                    type === 'success' ? 'M5 13l4 4L19 7' :
                    type === 'warning' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' :
                    'M6 18L18 6M6 6l12 12'
                }"/>
            </svg>
            ${sanitizeInput(message)}
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
};

// Configura Axios
const setupAxios = () => {
    const token = getToken();
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        showToast('Faça login para acessar todas as funcionalidades.', 'warning');
    }
    axios.defaults.baseURL = API_BASE;
    axios.defaults.timeout = 10000;

    let authFailedCount = 0;
    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                authFailedCount++;
                if (authFailedCount > 3) {
                    showToast('Sessão inválida. Redirecionando para login...', 'error');
                    clearSensitiveData();
                    setTimeout(() => window.location.href = '/index.html', 3000);
                } else {
                    showToast('Problema de autenticação. Tente novamente.', 'warning');
                }
            } else if (error.response?.status === 403) {
                showToast(error.response.data?.error || 'Acesso não autorizado.', 'error');
            } else if (error.response?.status === 404) {
                showToast('Funcionalidade indisponível no momento.', 'warning');
            } else if (error.code === 'ECONNABORTED') {
                showToast('Tempo de conexão excedido.', 'error');
            } else if (error.message.includes('Network Error')) {
                showToast('Falha na conexão com o servidor.', 'error');
            }
            return Promise.reject(error);
        }
    );
};

// Inicializa WebSocket
const initializeWebSocket = () => {
    const token = getToken();
    if (!token) {
        showToast('Conexão em tempo real indisponível.', 'warning');
        return;
    }
    try {
        socket = io(API_BASE, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            query: { token }
        });
        socket.on('connect', () => {
            showToast('Conexão em tempo real estabelecida.', 'success');
        });
        socket.on('connect_error', () => {
            showToast('Falha na conexão em tempo real.', 'warning');
        });
        socket.on('disconnect', () => {
            showToast('Conexão em tempo real perdida.', 'warning');
        });
        socket.on('dashboard_update', (data) => {
            fetchTickets();
        });
    } catch (err) {
        showToast('Falha ao iniciar conexão em tempo real.', 'warning');
    }
};

// Busca informações do usuário
const fetchUserInfo = async () => {
    try {
        const response = await axios.get('/api/attendant/user');
        const user = response.data;
        document.getElementById('user-name').textContent = sanitizeInput(user.name || 'Atendente');
        document.getElementById('user-email').textContent = sanitizeInput(user.email || 'N/A');
        return user;
    } catch (error) {
        showToast('Não foi possível carregar informações do usuário.', 'warning');
        return null;
    }
};

// Busca filas
const fetchQueues = async () => {
    try {
        const response = await axios.get('/api/attendant/queues');
        const queues = response.data;
        localStorage.setItem('queues', JSON.stringify(queues));
        renderQueueSelect(queues);
        return queues;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar filas.', 'warning');
        return [];
    }
};

// Busca tickets
const fetchTickets = async () => {
    try {
        toggleLoading(true, 'Carregando tickets...');
        const response = await axios.get('/api/attendant/tickets');
        const tickets = response.data;
        renderTickets(tickets);
        renderTicketQueueFilter(tickets);
        return tickets;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar tickets.', 'error');
        document.getElementById('tickets').innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhum ticket disponível.</td></tr>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Busca chamadas recentes
const fetchRecentCalls = async () => {
    try {
        toggleLoading(true, 'Carregando chamadas recentes...');
        const response = await axios.get('/api/attendant/recent-calls');
        const calls = response.data;
        renderRecentCalls(calls);
        renderCallFilter(calls);
        return calls;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar chamadas recentes.', 'warning');
        document.getElementById('recent-calls-table').innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Chama um ticket
const callTicket = async (queueId, ticketId) => {
    try {
        toggleLoading(true, 'Chamando ticket...');
        await axios.post('/api/attendant/call-ticket', { queue_id: queueId, ticket_id: ticketId });
        showToast('Ticket chamado com sucesso.', 'success');
        fetchTickets();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao chamar ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Renderiza select de filas
const renderQueueSelect = (queues) => {
    const select = document.getElementById('queue-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma fila</option>';
    if (!queues || queues.length === 0) return;
    queues.forEach(queue => {
        const option = document.createElement('option');
        option.value = queue.id;
        option.textContent = `${queue.service} (${queue.department_name})`;
        select.appendChild(option);
    });
};

// Renderiza tickets
const renderTickets = (tickets) => {
    const tbody = document.getElementById('tickets');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhum ticket disponível.</td></tr>';
        return;
    }
    tickets.forEach(ticket => {
        const tr = document.createElement('tr');
        tr.dataset.queueId = ticket.queue_id;
        tr.innerHTML = `
            <td class="px-4 py-3">${ticket.number}</td>
            <td class="px-4 py-3">${ticket.service} (${ticket.department_name})</td>
            <td class="px-4 py-3">${ticket.status}</td>
            <td class="px-4 py-3">${ticket.counter}</td>
            <td class="px-4 py-3">${new Date(ticket.issued_at).toLocaleString('pt-BR')}</td>
            <td class="px-4 py-3">
                ${ticket.status === 'Pendente' ? `<button onclick="callTicket('${ticket.queue_id}', '${ticket.id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm">Chamar</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// Renderiza chamadas recentes
const renderRecentCalls = (calls) => {
    const tbody = document.getElementById('recent-calls-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!calls || calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return;
    }
    calls.forEach(call => {
        const statusColor = call.status === 'Atendido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3">${call.ticket_number}</td>
            <td class="px-4 py-3">${call.service} (${call.department_name})</td>
            <td class="px-4 py-3">${call.counter}</td>
            <td class="px-4 py-3">${new Date(call.called_at).toLocaleString('pt-BR')}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${call.status}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// Renderiza filtro de chamadas
const renderCallFilter = (calls) => {
    const select = document.getElementById('call-filter');
    if (!select) return;
    select.innerHTML = '<option value="">Todas as filas</option>';
    const services = [...new Set(calls.map(call => `${call.service} (${call.department_name})`))];
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = service;
        select.appendChild(option);
    });
};

// Renderiza filtro de filas para tickets
const renderTicketQueueFilter = (tickets) => {
    const select = document.getElementById('ticket-queue-filter');
    if (!select) return;
    select.innerHTML = '<option value="all">Todas as filas</option>';
    const queues = [...new Set(tickets.map(ticket => ticket.queue_id))];
    const queueData = JSON.parse(localStorage.getItem('queues')) || [];
    queues.forEach(queueId => {
        const queue = queueData.find(q => q.id === queueId);
        if (queue) {
            const option = document.createElement('option');
            option.value = queueId;
            option.textContent = `${queue.service} (${queue.department_name})`;
            select.appendChild(option);
        }
    });
};

// Configura eventos
const setupEventListeners = () => {
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            toggleLoading(true, 'Saindo...');
            if (socket) socket.disconnect();
            clearSensitiveData();
            showToast('Sessão encerrada.', 'success');
            setTimeout(() => window.location.href = '/index.html', 1500);
        });
    }

    const ticketFilter = document.getElementById('ticket-filter');
    if (ticketFilter) {
        ticketFilter.addEventListener('input', () => {
            const filter = ticketFilter.value.toLowerCase();
            document.querySelectorAll('#tickets tr').forEach(row => {
                const number = row.cells[0].textContent.toLowerCase();
                const service = row.cells[1].textContent.toLowerCase();
                row.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
            });
        });
    }

    const ticketStatusFilter = document.getElementById('ticket-status-filter');
    if (ticketStatusFilter) {
        ticketStatusFilter.addEventListener('change', () => {
            const status = ticketStatusFilter.value;
            document.querySelectorAll('#tickets tr').forEach(row => {
                const rowStatus = row.cells[2].textContent.toLowerCase();
                row.style.display = status === 'all' || rowStatus === status ? '' : 'none';
            });
        });
    }

    const ticketQueueFilter = document.getElementById('ticket-queue-filter');
    if (ticketQueueFilter) {
        ticketQueueFilter.addEventListener('change', () => {
            const queueId = ticketQueueFilter.value;
            document.querySelectorAll('#tickets tr').forEach(row => {
                const ticketQueueId = row.dataset.queueId;
                row.style.display = queueId === 'all' || ticketQueueId === queueId ? '' : 'none';
            });
        });
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    toggleLoading(true, 'Carregando painel...');

    // Verificar loop de redirecionamento
    const redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
    const lastRedirect = sessionStorage.getItem('lastRedirect');
    const now = Date.now();
    if (lastRedirect && (now - parseInt(lastRedirect)) < 3000 && redirectCount > 2) {
        clearSensitiveData();
        showToast('Problema de autenticação. Redirecionando para login...', 'error');
        setTimeout(() => window.location.href = '/index.html', 3000);
        return;
    }

    setupAxios();
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    if (userRole !== 'ATTENDANT') {
        showToast('Acesso restrito a atendentes. Algumas funções podem estar limitadas.', 'warning');
    }

    initializeWebSocket();
    try {
        await Promise.allSettled([
            fetchUserInfo(),
            fetchQueues(),
            fetchTickets(),
            fetchRecentCalls()
        ]);
        setupEventListeners();
    } catch (error) {
        showToast('Erro ao inicializar painel. Verifique sua conexão.', 'error');
    } finally {
        toggleLoading(false);
    }
});