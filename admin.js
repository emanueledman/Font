// Configurações e variáveis globais
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token');
let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
let socket;
let ticketStatusChart, reportChart;

// Função para inicializar WebSocket
function initWebSocket() {
    if (!window.io) {
        console.error('[WebSocket] Socket.IO não carregado');
        showNotification('Erro: Socket.IO não carregado', 'error');
        return;
    }
    if (socket) socket.disconnect();
    socket = io(API_BASE_URL, {
        auth: { token },
        transports: ['websocket'],
    });

    socket.on('connect', () => {
        console.log('[WebSocket] Conectado');
        socket.emit('join', userInfo.id);
        if (userInfo.department_id) {
            socket.emit('join', `department_${userInfo.department_id}`);
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

    socket.on('connect_error', (error) => {
        console.error('[WebSocket] Erro de conexão:', error);
        showNotification('Erro na conexão WebSocket', 'error');
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
    }, 30000);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Classe para requisições à API
class ApiService {
    static async request(endpoint, method = 'GET', body = null) {
        if (!token) {
            logout('Acesso não autorizado. Por favor, faça login.');
            throw new Error('Nenhum token de autenticação encontrado');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

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
            console.log(`[ApiService] Requisição para ${endpoint}`, { method, body });
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                console.warn('[ApiService] Sessão expirada');
                logout('Sessão expirada. Por favor, faça login novamente.');
                throw new Error('Sessão expirada');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error || response.statusText;
                console.error(`[ApiService] Erro ${response.status}: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log(`[ApiService] Resposta de ${endpoint}:`, data);
            return data;
        } catch (error) {
            console.error(`[ApiService] Erro em ${endpoint}:`, error);
            throw error;
        }
    }

    static async login(email, password) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ email, password }),
            mode: 'cors',
            credentials: 'omit',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Erro ao fazer login');
        }

        return await response.json();
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

    static async getReport(date) {
        return await this.request(`/api/admin/report?date=${date}`);
    }

    static async validateToken() {
        try {
            await this.request('/api/admin/queues');
            return true;
        } catch (error) {
            console.error('[ApiService] Token inválido:', error);
            return false;
        }
    }
}

// Função para notificações
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
    notification.textContent = message;
    document.getElementById('toast-container').appendChild(notification);
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

// Função para inicializar gráficos
function initCharts(tickets) {
    if (ticketStatusChart) ticketStatusChart.destroy();
    const ctx = document.getElementById('ticketStatusChart')?.getContext('2d');
    if (!ctx) return;

    const statusCounts = {
        Pendente: tickets.filter(t => t.status === 'Pendente').length,
        Atendido: tickets.filter(t => t.status === 'attended').length,
        Cancelado: tickets.filter(t => t.status === 'Cancelado').length,
        Chamado: tickets.filter(t => t.status === 'Chamado').length,
    };

    ticketStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendente', 'Atendido', 'Cancelado', 'Chamado'],
            datasets: [{
                data: [statusCounts.Pendente, statusCounts.Atendido, statusCounts.Cancelado, statusCounts.Chamado],
                backgroundColor: ['#ffc107', '#28a745', '#dc3545', '#17a2b8'],
                borderColor: ['#fff', '#fff', '#fff', '#fff'],
                borderWidth: 1,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: 'Distribuição de Status das Senhas' },
            },
        },
    });
}

// Função para atualizar dashboard
async function updateDashboard() {
    if (!token || !userInfo.email) {
        logout('Acesso não autorizado. Por favor, faça login.');
        return;
    }
    try {
        const queues = await ApiService.getAdminQueues();
        const tickets = await ApiService.getAdminTickets();

        document.getElementById('total-queues').textContent = queues.length;
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
        document.getElementById('attended-tickets').textContent = tickets.filter(t => t.status === 'attended').length;
        document.getElementById('cancelled-tickets').textContent = tickets.filter(t => t.status === 'Cancelado').length;

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

        initCharts(tickets);
    } catch (error) {
        showNotification('Erro ao atualizar dashboard: ' + error.message, 'error');
    }
}

// Função para atualizar página de filas
async function updateQueuesPage() {
    if (!token || !userInfo.email) {
        logout('Acesso não autorizado. Por favor, faça login.');
        return;
    }
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
    if (!token || !userInfo.email) {
        logout('Acesso não autorizado. Por favor, faça login.');
        return;
    }
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

// Função para gerar relatório
async function generateReport() {
    if (!token || !userInfo.email) {
        logout('Acesso não autorizado. Por favor, faça login.');
        return;
    }
    const dateInput = document.getElementById('report-date').value;
    if (!dateInput) {
        showNotification('Selecione uma data para o relatório', 'error');
        return;
    }

    try {
        const report = await ApiService.getReport(dateInput);
        const reportBody = document.getElementById('report-table-body');
        reportBody.innerHTML = report.map(item => `
            <tr>
                <td>${item.service}</td>
                <td>${item.issued}</td>
                <td>${item.attended}</td>
                <td>${item.avg_time ? item.avg_time.toFixed(1) : '-'}</td>
            </tr>
        `).join('');

        if (reportChart) reportChart.destroy();
        const ctx = document.getElementById('reportChart')?.getContext('2d');
        if (ctx) {
            reportChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: report.map(item => item.service),
                    datasets: [
                        {
                            label: 'Senhas Emitidas',
                            data: report.map(item => item.issued),
                            backgroundColor: '#007bff',
                        },
                        {
                            label: 'Senhas Atendidas',
                            data: report.map(item => item.attended),
                            backgroundColor: '#28a745',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: `Relatório de ${new Date(dateInput).toLocaleDateString('pt-BR')}` },
                    },
                    scales: {
                        y: { beginAtZero: true },
                    },
                },
            });
        }
    } catch (error) {
        showNotification('Erro ao gerar relatório: ' + error.message, 'error');
    }
}

// Função para abrir modal de chamar próxima senha
function openCallNextModal(queueId, service) {
    if (!token || !userInfo.email) {
        logout('Acesso não autorizado. Por favor, faça login.');
        return;
    }
    console.log('[Modal] Abrindo modal para:', { queueId, service });
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

    if (!modal || !serviceText || !confirmBtn) {
        console.error('[Modal] Elementos do modal não encontrados');
        showNotification('Erro: Interface não carregada corretamente', 'error');
        return;
    }

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
    serviceText.textContent = service || 'Serviço não especificado';

    confirmBtn.onclick = async () => {
        console.log('[Modal] Confirmando chamada para queueId:', queueId);
        buttonText.classList.add('hidden');
        spinner.classList.remove('hidden');
        confirmBtn.disabled = true;

        try {
            const result = await ApiService.callNextTicket(queueId);
            console.log('[Modal] Chamada bem-sucedida:', result);
            callInfo.classList.add('hidden');
            callResult.classList.remove('hidden');
            callSuccess.classList.remove('hidden');
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');

            document.getElementById('result-ticket-number').textContent = result.ticket_number || 'N/A';
            document.getElementById('result-counter').textContent = result.counter || '-';
            document.getElementById('result-remaining').textContent = result.remaining || '0';
        } catch (error) {
            console.error('[Modal] Erro ao chamar senha:', error);
            callInfo.classList.add('hidden');
            callResult.classList.remove('hidden');
            callError.classList.remove('hidden');
            document.getElementById('call-error-message').textContent = error.message || 'Erro desconhecido';
            confirmBtn.classList.add('hidden');
            cancelBtn.classList.add('hidden');
            finishBtn.classList.remove('hidden');
        } finally {
            buttonText.classList.remove('hidden');
            spinner.classList.add('hidden');
            confirmBtn.disabled = false;
        }
    };
}

// Função para fechar modal
function closeCallNextModal() {
    console.log('[Modal] Fechando modal');
    const modal = document.getElementById('call-next-modal');
    if (modal) modal.classList.add('hidden');
}

// Função para login
async function handleLogin(event) {
    event.preventDefault();
    console.log('[Login] Iniciando login');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const messageDiv = document.getElementById('login-message');
    const buttonText = document.getElementById('login-button-text');
    const spinner = document.getElementById('login-spinner');
    const loginBtn = document.querySelector('#login-form button');

    errorDiv.classList.add('hidden');
    messageDiv.classList.add('hidden');
    buttonText.classList.add('hidden');
    spinner.classList.remove('hidden');
    loginBtn.disabled = true;

    try {
        const result = await ApiService.login(email, password);
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
        console.log('[Login] Login bem-sucedido:', userInfo);
        initApp();
    } catch (error) {
        console.error('[Login] Erro:', error);
        errorDiv.textContent = 'Erro ao fazer login: ' + error.message;
        errorDiv.classList.remove('hidden');
    } finally {
        buttonText.classList.remove('hidden');
        spinner.classList.add('hidden');
        loginBtn.disabled = false;
    }
}

// Função para logout
function logout(message = null) {
    console.log('[Logout] Realizando logout');
    token = null;
    userInfo = {};
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    if (socket) socket.disconnect();
    stopPolling();
    initApp(message);
}

// Função para alternar sidebar
function toggleSidebar() {
    if (!token || !userInfo.email) {
        logout('Acesso não autorizado. Por favor, faça login.');
        return;
    }
    console.log('[Sidebar] Alternando sidebar');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    sidebar.classList.toggle('sidebar-collapse');
    mainContent.classList.toggle('expanded');
}

// Função para mostrar/esconder páginas
function showPage(pageId) {
    if (!token || !userInfo.email) {
        logout('Acesso não autorizado. Por favor, faça login.');
        return;
    }
    console.log('[Navegação] Mostrando página:', pageId);
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`#page-${pageId}`).classList.remove('hidden');
    document.querySelector(`.menu-item[data-page="${pageId}"]`).classList.add('active');
    document.getElementById('page-title').textContent = {
        dashboard: 'Dashboard',
        queues: 'Filas',
        tickets: 'Senhas',
        reports: 'Relatórios',
    }[pageId];
}

// Função para inicializar a aplicação
async function initApp(message = null) {
    console.log('[App] Inicializando aplicação', { token, userInfo });
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const userDepartment = document.getElementById('user-department');
    const messageDiv = document.getElementById('login-message');

    if (message && messageDiv) {
        messageDiv.textContent = message;
        messageDiv.classList.remove('hidden');
    }

    if (!token || !userInfo.email) {
        console.log('[App] Sem autenticação, mostrando tela de login');
        loginScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
        return;
    }

    // Validar token no servidor
    const isValidToken = await ApiService.validateToken();
    if (!isValidToken) {
        console.log('[App] Token inválido, redirecionando para login');
        logout('Sessão inválida. Por favor, faça login novamente.');
        return;
    }

    console.log('[App] Usuário autenticado, mostrando aplicação');
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    userAvatar.textContent = userInfo.email[0].toUpperCase();
    userName.textContent = userInfo.email.split('@')[0];
    userDepartment.textContent = userInfo.department || 'N/A';
    initWebSocket();
    stopPolling();
    updateDashboard();
    showPage('dashboard');
}

// Configurar eventos
document.addEventListener('DOMContentLoaded', () => {
    console.log('[App] DOM carregado, configurando eventos');
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) logoutButton.addEventListener('click', () => logout());

    const toggleSidebarButton = document.getElementById('toggle-sidebar');
    if (toggleSidebarButton) toggleSidebarButton.addEventListener('click', toggleSidebar);

    const closeModalButton = document.getElementById('close-call-modal');
    if (closeModalButton) closeModalButton.addEventListener('click', closeCallNextModal);

    const cancelModalButton = document.getElementById('cancel-call-next');
    if (cancelModalButton) cancelModalButton.addEventListener('click', closeCallNextModal);

    const finishModalButton = document.getElementById('finish-call-next');
    if (finishModalButton) finishModalButton.addEventListener('click', closeCallNextModal);

    const refreshButton = document.getElementById('refresh-btn');
    if (refreshButton) refreshButton.addEventListener('click', () => {
        const currentPage = document.querySelector('.page:not(.hidden)')?.id.replace('page-', '');
        if (currentPage === 'dashboard') updateDashboard();
        else if (currentPage === 'queues') updateQueuesPage();
        else if (currentPage === 'tickets') updateTicketsPage();
        else if (currentPage === 'reports') generateReport();
    });

    const generateReportButton = document.getElementById('generate-report');
    if (generateReportButton) generateReportButton.addEventListener('click', generateReport);

    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            showPage(pageId);
            if (pageId === 'dashboard') updateDashboard();
            else if (pageId === 'queues') updateQueuesPage();
            else if (pageId === 'tickets') updateTicketsPage();
            else if (pageId === 'reports') generateReport();
        });
    });

    initApp();
});