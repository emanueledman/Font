// Configurações e variáveis globais
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token');
let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
let socket;

// Função para inicializar WebSocket
function initWebSocket() {
    if (socket) socket.disconnect();
    socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
    });

    socket.on('connect', () => {
        console.log('[WebSocket] Conectado');
        socket.emit('join', userInfo.id); // Sala do usuário
        if (userInfo.department_id) {
            socket.emit('join', `department_${userInfo.department_id}`); // Sala do departamento
        }
    });

    socket.on('ticket_update', (data) => {
        console.log('[WebSocket] Ticket update:', data);
        showNotification(`Senha ${data.ticket_number || data.ticket_id} atualizada: ${data.status}`, 'success');
        updateDashboard();
        updateQueuesPage();
        updateTicketsPage();
    });

    socket.on('queue_update', (data) => {
        console.log('[WebSocket] Queue update:', data);
        showNotification(`Fila atualizada: ${data.message}`, 'success');
        updateDashboard();
        updateQueuesPage();
        updateTicketsPage();
    });

    socket.on('notification', (data) => {
        if (!data.user_id || data.user_id === userInfo.id || data.department_id === userInfo.department_id) {
            showNotification(data.message, 'success');
        }
    });

    socket.on('disconnect', () => {
        console.log('[WebSocket] Desconectado');
        startPolling();
    });
}

// Função para polling como fallback
let pollingInterval = null;
function startPolling() {
    if (pollingInterval) return;
    pollingInterval = setInterval(() => {
        updateDashboard();
        updateQueuesPage();
        updateTicketsPage();
    }, 30000); // Atualizar a cada 30 segundos
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Classe principal para gerenciamento de autenticação e requisições
class ApiService {
    static async request(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers,
            mode: 'cors',
            credentials: 'omit',
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                logout();
                throw new Error('Sessão expirada');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || response.statusText);
            }

            return await response.json();
        } catch (error) {
            console.error(`[ApiService] Erro em ${endpoint}:`, error);
            throw error;
        }
    }

    static async login(email, password) {
        const result = await this.request('/api/admin/login', 'POST', { email, password });
        token = result.token;
        userInfo = {
            id: result.user_id,
            email: result.email,
            role: result.user_role,
            institutionId: result.institution_id,
            department: result.department,
            department_id: result.department_id,
        };
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        return result;
    }

    static async getAdminQueues() {
        return await this.request('/api/admin/queues');
    }

    static async getAdminTickets() {
        return await this.request('/api/tickets/admin');
    }

    static async callNextTicket(queueId) {
        return await this.request(`/api/admin/queue/${queueId}/call`, 'POST');
    }
}

// Função para exibir notificações temporárias
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Função para formatar data
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// Função para formatar status do ticket
function formatTicketStatus(status) {
    const statusMap = {
        Pendente: '<span class="badge badge-warning">Pendente</span>',
        attended: '<span class="badge badge-success">Atendido</span>',
        Cancelado: '<span class="badge badge-danger">Cancelado</span>',
        Chamado: '<span class="badge badge-info">Chamado</span>',
    };
    return statusMap[status] || `<span class="badge badge-info">${status}</span>`;
}

// Função para formatar status da fila
function formatQueueStatus(activeTickets, dailyLimit) {
    return activeTickets < dailyLimit
        ? '<span class="badge badge-success">Aberto</span>'
        : '<span class="badge badge-danger">Lotado</span>';
}

// Função para atualizar dashboard
async function updateDashboard() {
    try {
        const queues = await ApiService.getAdminQueues();
        const tickets = await ApiService.getAdminTickets();

        // Atualizar estatísticas
        document.getElementById('total-queues').textContent = queues.length;
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
        document.getElementById('attended-tickets').textContent = tickets.filter(t => t.status === 'attended').length;
        document.getElementById('cancelled-tickets').textContent = tickets.filter(t => t.status === 'Cancelado').length;

        // Atualizar tabela de resumo de filas
        const queuesBody = document.getElementById('queues-summary-body');
        queuesBody.innerHTML = queues.map(queue => `
            <tr>
                <td>${queue.service}</td>
                <td>${queue.prefix}</td>
                <td>${queue.active_tickets}</td>
                <td>${queue.daily_limit}</td>
                <td>${formatQueueStatus(queue.active_tickets, queue.daily_limit)}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="openCallNextModal('${queue.id}', '${queue.service}')">
                        <i class="fas fa-bullhorn"></i> Chamar
                    </button>
                </td>
            </tr>
        `).join('');

        // Atualizar tabela de últimas senhas
        const recentTickets = tickets.slice(0, 5);
        const recentTicketsBody = document.getElementById('recent-tickets-body');
        recentTicketsBody.innerHTML = recentTickets.map(ticket => `
            <tr>
                <td>${ticket.number}</td>
                <td>${ticket.service}</td>
                <td>${formatTicketStatus(ticket.status)}</td>
                <td>${formatDate(ticket.issued_at)}</td>
                <td>${formatDate(ticket.attended_at)}</td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification('Erro ao atualizar dashboard: ' + error.message, 'error');
    }
}

// Função para atualizar página de filas
async function updateQueuesPage() {
    try {
        const queues = await ApiService.getAdminQueues();
        const queuesBody = document.getElementById('queues-table-body');
        queuesBody.innerHTML = queues.map(queue => `
            <tr>
                <td>${queue.id}</td>
                <td>${queue.service}</td>
                <td>${queue.prefix}</td>
                <td>${queue.active_tickets}</td>
                <td>${queue.daily_limit}</td>
                <td>${queue.current_ticket || '-'}</td>
                <td>${formatQueueStatus(queue.active_tickets, queue.daily_limit)}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="openCallNextModal('${queue.id}', '${queue.service}')">
                        <i class="fas fa-bullhorn"></i> Chamar
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification('Erro ao atualizar filas: ' + error.message, 'error');
    }
}

// Função para atualizar página de senhas
async function updateTicketsPage() {
    try {
        const tickets = await ApiService.getAdminTickets();
        const ticketsBody = document.getElementById('tickets-table-body');
        ticketsBody.innerHTML = tickets.map(ticket => `
            <tr>
                <td>${ticket.id}</td>
                <td>${ticket.number}</td>
                <td>${ticket.service}</td>
                <td>${formatTicketStatus(ticket.status)}</td>
                <td>${formatDate(ticket.issued_at)}</td>
                <td>${formatDate(ticket.attended_at)}</td>
                <td>${ticket.counter || '-'}</td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification('Erro ao atualizar senhas: ' + error.message, 'error');
    }
}

// Função para abrir modal de chamar próxima senha
function openCallNextModal(queueId, service) {
    const modal = document.getElementById('call-next-modal');
    const serviceText = document.getElementById('call-next-service');
    const callInfo = document.getElementById('call-next-info');
    const callResult = document.getElementById('call-next-result');
    const callSuccess = document.getElementById('call-success');
    const callError = document.getElementById('call-error');
    const confirmBtn = document.getElementById('confirm-call-next');
    const cancelBtn = document.getElementById('cancel-call-next');
    const finishBtn = document.getElementById('finish-call-next');
    const buttonText = document.getElementById('call-button-text');
    const spinner = document.getElementById('call-spinner');

    // Resetar modal
    modal.classList.remove('hidden');
    callInfo.classList.remove('hidden');
    callResult.classList.add('hidden');
    callSuccess.classList.add('hidden');
    callError.classList.add('hidden');
    confirmBtn.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
    finishBtn.classList.add('hidden');
    buttonText.classList.remove('hidden');
    spinner.classList.add('hidden');
    serviceText.textContent = service;

    // Configurar evento de confirmação
    confirmBtn.onclick = async () => {
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');
        confirmBtn.disabled = true;

        try {
            const result = await ApiService.callNextTicket(queueId);
            callInfo.classList.add('hidden');
            callResult.classList.remove('hidden');
            callSuccess.classList.remove('hidden');
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');

            document.getElementById('result-ticket-number').textContent = result.ticket_number;
            document.getElementById('result-counter').textContent = result.counter || '-';
            document.getElementById('result-remaining').textContent = result.remaining;
        } catch (error) {
            callInfo.classList.add('hidden');
            callResult.classList.remove('hidden');
            callError.classList.remove('hidden');
            document.getElementById('call-error-message').textContent = error.message;
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
        }
    };
}

// Função para fechar modal
function closeCallNextModal() {
    document.getElementById('call-next-modal').classList.add('hidden');
}

// Função para login
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const buttonText = document.getElementById('login-button-text');
    const spinner = document.getElementById('login-spinner');
    const loginBtn = document.querySelector('#login-form button');

    errorDiv.classList.add('hidden');
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');
    loginBtn.disabled = true;

    try {
        await ApiService.login(email, password);
        initApp();
    } catch (error) {
        errorDiv.textContent = 'Erro ao fazer login: ' + error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
        loginBtn.disabled = false;
    }
}

// Função para logout
function logout() {
    token = null;
    userInfo = {};
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    if (socket) socket.disconnect();
    stopPolling();
    initApp();
}

// Função para alternar sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('sidebar-collapse');
}

// Função para mostrar/esconder páginas
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`#page-${pageId}`).classList.remove('hidden');
    document.querySelector(`.menu-item[data-page="${pageId}"]`).classList.add('active');
    document.getElementById('page-title').textContent = {
        dashboard: 'Dashboard',
        queues: 'Filas',
        tickets: 'Senhas',
    }[pageId];
}

// Função para inicializar a aplicação
function initApp() {
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userDepartment = document.getElementById('user-department');

    if (token && userInfo.email) {
        loginScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        userAvatar.textContent = userInfo.email[0].toUpperCase();
        userName.textContent = userInfo.email.split('@')[0];
        userDepartment.textContent = userInfo.department || 'N/A';
        initWebSocket();
        stopPolling();
        updateDashboard();
        showPage('dashboard');
    } else {
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
    }
}

// Configurar eventos
document.getElementById('login-form').addEventListener('submit', handleLogin);
document.getElementById('logout-button').addEventListener('click', logout);
document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
document.getElementById('close-call-modal').addEventListener('click', closeCallNextModal);
document.getElementById('cancel-call-next').addEventListener('click', closeCallNextModal);
document.getElementById('finish-call-next').addEventListener('click', closeCallNextModal);
document.querySelectorAll('.menu-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        showPage(pageId);
        if (pageId === 'dashboard') updateDashboard();
        else if (pageId === 'queues') updateQueuesPage();
        else if (pageId === 'tickets') updateTicketsPage();
    });
});

// Inicializar aplicação
initApp();