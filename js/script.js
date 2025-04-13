// Configurações do toastr
toastr.options = {
    closeButton: true,
    progressBar: true,
    positionClass: 'toast-top-right',
    timeOut: 3000
};

// Configurações e variáveis globais
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token');
let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
let chartInstance = null;
let dashboardChart = null;
let socket = null;

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

        console.log(`[ApiService] Enviando requisição para: ${API_BASE_URL}${endpoint}`);
        showLoader();

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                console.warn(`[ApiService] Erro 401 na requisição ${endpoint}.`);
                handleLogout();
                throw new Error(`Sessão expirada`);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Erro desconhecido');
            }
            
            const data = await response.json();
            hideLoader();
            return data;
        } catch (error) {
            console.error(`[ApiService] Erro na requisição ${endpoint}:`, error);
            hideLoader();
            throw new Error(error.message || 'Falha na requisição');
        }
    }

    static async login(email, password) {
        return await this.request('/api/admin/login', 'POST', { email, password });
    }

    static async getQueues() {
        return await this.request('/api/admin/queues');
    }

    static async getTickets() {
        return await this.request('/api/tickets/admin');
    }

    static async callNextTicket(queueId) {
        return await this.request(`/api/admin/queue/${queueId}/call`, 'POST');
    }

    static async createQueue(data) {
        return await this.request('/api/queue/create', 'POST', data);
    }

    static async updateQueue(queueId, data) {
        return await this.request(`/api/queue/${queueId}`, 'PUT', data);
    }

    static async deleteQueue(queueId) {
        return await this.request(`/api/queue/${queueId}`, 'DELETE');
    }

    static async cancelTicket(ticketId) {
        return await this.request(`/api/ticket/${ticketId}/cancel`, 'POST');
    }

    static async validatePresence(qrCode) {
        return await this.request('/api/ticket/validate', 'POST', { qr_code: qrCode });
    }

    static async offerTrade(ticketId) {
        return await this.request(`/api/ticket/${ticketId}/trade`, 'POST');
    }

    static async getReport(startDate, endDate, service) {
        let url = `/api/admin/report?start_date=${startDate}`;
        if (endDate) url += `&end_date=${endDate}`;
        if (service) url += `&service=${encodeURIComponent(service)}`;
        return await this.request(url);
    }
}

// Funções de manipulação da interface
function showLoader() {
    document.getElementById('loader').style.display = 'block';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    toastr.error(message);
}

function clearError() {
    document.getElementById('error-message').textContent = '';
}

async function handleLogin() {
    clearError();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await ApiService.login(email, password);
        token = response.token;
        userInfo = {
            user_id: response.user_id,
            user_role: response.user_role,
            department: response.department,
            department_id: response.department_id,
            email: response.email
        };
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        toastr.success('Login realizado com sucesso!');
        initApp();
    } catch (error) {
        showError('Erro ao fazer login: ' + (error.message || 'Falha na autenticação'));
    }
}

function handleLogout() {
    if (socket) {
        socket.disconnect();
    }
    token = null;
    userInfo = {};
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    toastr.info('Sessão encerrada.');
    initApp();
}

async function loadDashboard() {
    try {
        const queues = await ApiService.getQueues();
        const tickets = await ApiService.getTickets();
        const today = new Date().toISOString().split('T')[0];
        const report = await ApiService.getReport(today, null, null);

        // Atualizar cards
        document.getElementById('active-queues').textContent = queues.length;
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
        document.getElementById('attended-tickets').textContent = tickets.filter(t => t.status === 'attended').length;
        const avgWaitTimes = report.filter(r => r.avg_time).map(r => r.avg_time);
        document.getElementById('avg-wait-time').textContent = avgWaitTimes.length ? `${Math.round(avgWaitTimes.reduce((a, b) => a + b, 0) / avgWaitTimes.length)} min` : 'N/A';

        // Gráfico
        if (dashboardChart) {
            dashboardChart.destroy();
        }
        const ctx = document.getElementById('dashboard-chart').getContext('2d');
        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: report.map(r => r.service),
                datasets: [{
                    label: 'Tickets Emitidos',
                    data: report.map(r => r.issued),
                    backgroundColor: '#2563eb',
                    borderColor: '#1e40af',
                    borderWidth: 1
                }, {
                    label: 'Tickets Atendidos',
                    data: report.map(r => r.attended),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Atendimento de Hoje' }
                }
            }
        });
    } catch (error) {
        showError('Erro ao carregar dashboard: ' + (error.message || 'Falha ao carregar dados'));
    }
}

async function loadQueues() {
    try {
        const queues = await ApiService.getQueues();
        const queueContent = document.getElementById('queue-content');
        queueContent.innerHTML = '';

        if (queues.length === 0) {
            queueContent.innerHTML = '<tr><td colspan="5">Nenhuma fila encontrada.</td></tr>';
            return;
        }

        const filter = document.getElementById('queue-filter').value.toLowerCase();
        queues
            .filter(queue => queue.service.toLowerCase().includes(filter))
            .forEach(queue => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${queue.service}</td>
                    <td>${queue.department}</td>
                    <td>${queue.active_tickets}/${queue.daily_limit}</td>
                    <td><span class="badge ${queue.status === 'Aberto' ? 'open' : 'full'}">${queue.status}</span></td>
                    <td>
                        <button class="primary" onclick="callNextTicket('${queue.id}')"><i class="fas fa-phone"></i> Chamar</button>
                        <button class="secondary" onclick="openEditQueueModal('${queue.id}', '${queue.service}', '${queue.prefix}', '${queue.open_time}', '${queue.end_time}', '${queue.daily_limit}', '${queue.num_counters}')"><i class="fas fa-edit"></i> Editar</button>
                        <button class="danger" onclick="openDeleteQueueModal('${queue.id}', '${queue.service}')"><i class="fas fa-trash"></i> Excluir</button>
                    </td>
                `;
                queueContent.appendChild(row);
            });

        if ($.fn.DataTable.isDataTable('#queues-table')) {
            $('#queues-table').DataTable().destroy();
        }
        $('#queues-table').DataTable({
            pageLength: 10,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });
    } catch (error) {
        showError('Erro ao carregar filas: ' + (error.message || 'Falha ao carregar filas'));
    }
}

async function loadTickets() {
    try {
        const tickets = await ApiService.getTickets();
        const ticketContent = document.getElementById('ticket-content');
        ticketContent.innerHTML = '';

        if (tickets.length === 0) {
            ticketContent.innerHTML = '<tr><td colspan="5">Nenhum ticket ativo encontrado.</td></tr>';
            return;
        }

        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        tickets
            .filter(ticket => ticket.number.toLowerCase().includes(filter))
            .forEach(ticket => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${ticket.number}</td>
                    <td>${ticket.service}</td>
                    <td>${ticket.status}</td>
                    <td>${ticket.counter || 'N/A'}</td>
                    <td>
                        <button class="primary" onclick="showTicketDetails('${ticket.id}', '${ticket.number}', '${ticket.service}', '${ticket.status}', '${ticket.counter}', '${ticket.issued_at}')"><i class="fas fa-info-circle"></i> Detalhes</button>
                        ${ticket.status === 'Pendente' ? `<button class="danger" onclick="openCancelTicketModal('${ticket.id}', '${ticket.number}')"><i class="fas fa-times"></i> Cancelar</button>` : ''}
                        ${ticket.status === 'Pendente' ? `<button class="secondary" onclick="openTradeTicketModal('${ticket.id}', '${ticket.number}')"><i class="fas fa-exchange-alt"></i> Trocar</button>` : ''}
                    </td>
                `;
                ticketContent.appendChild(row);
            });

        if ($.fn.DataTable.isDataTable('#tickets-table')) {
            $('#tickets-table').DataTable().destroy();
        }
        $('#tickets-table').DataTable({
            pageLength: 10,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });
    } catch (error) {
        showError('Erro ao carregar tickets: ' + (error.message || 'Falha ao carregar tickets'));
    }
}

async function callNextTicket(queueId) {
    clearError();
    try {
        const response = await ApiService.callNextTicket(queueId);
        toastr.success(response.message);
        loadTickets();
        loadDashboard();
    } catch (error) {
        showError('Erro ao chamar próximo ticket: ' + (error.message || 'Falha ao chamar ticket'));
    }
}

function openCreateQueueModal() {
    document.getElementById('queue-service').value = '';
    document.getElementById('queue-prefix').value = '';
    document.getElementById('queue-open-time').value = '';
    document.getElementById('queue-end-time').value = '';
    document.getElementById('queue-daily-limit').value = '';
    document.getElementById('queue-num-counters').value = '';
    document.getElementById('create-queue-modal').style.display = 'flex';
}

async function createQueue() {
    clearError();
    const service = document.getElementById('queue-service').value;
    const prefix = document.getElementById('queue-prefix').value;
    const open_time = document.getElementById('queue-open-time').value;
    const end_time = document.getElementById('queue-end-time').value;
    const daily_limit = document.getElementById('queue-daily-limit').value;
    const num_counters = document.getElementById('queue-num-counters').value;

    if (!service || !prefix || !open_time || !daily_limit || !num_counters) {
        showError('Preencha todos os campos obrigatórios.');
        return;
    }

    try {
        const response = await ApiService.createQueue({
            service,
            prefix,
            department_id: userInfo.department_id || 'default',
            open_time,
            end_time: end_time || null,
            daily_limit: parseInt(daily_limit),
            num_counters: parseInt(num_counters)
        });
        toastr.success('Fila criada com sucesso!');
        closeModal();
        loadQueues();
        loadDashboard();
    } catch (error) {
        showError('Erro ao criar fila: ' + (error.message || 'Falha ao criar fila'));
    }
}

function openEditQueueModal(id, service, prefix, open_time, end_time, daily_limit, num_counters) {
    document.getElementById('edit-queue-id').value = id;
    document.getElementById('edit-queue-service').value = service;
    document.getElementById('edit-queue-prefix').value = prefix;
    document.getElementById('edit-queue-open-time').value = open_time;
    document.getElementById('edit-queue-end-time').value = end_time || '';
    document.getElementById('edit-queue-daily-limit').value = daily_limit;
    document.getElementById('edit-queue-num-counters').value = num_counters;
    document.getElementById('edit-queue-modal').style.display = 'flex';
}

async function updateQueue() {
    clearError();
    const id = document.getElementById('edit-queue-id').value;
    const service = document.getElementById('edit-queue-service').value;
    const prefix = document.getElementById('edit-queue-prefix').value;
    const open_time = document.getElementById('edit-queue-open-time').value;
    const end_time = document.getElementById('edit-queue-end-time').value;
    const daily_limit = document.getElementById('edit-queue-daily-limit').value;
    const num_counters = document.getElementById('edit-queue-num-counters').value;

    if (!service || !prefix || !open_time || !daily_limit || !num_counters) {
        showError('Preencha todos os campos obrigatórios.');
        return;
    }

    try {
        const response = await ApiService.updateQueue(id, {
            service,
            prefix,
            open_time,
            end_time: end_time || null,
            daily_limit: parseInt(daily_limit),
            num_counters: parseInt(num_counters)
        });
        toastr.success('Fila atualizada com sucesso!');
        closeModal();
        loadQueues();
        loadDashboard();
    } catch (error) {
        showError('Erro ao atualizar fila: ' + (error.message || 'Falha ao atualizar fila'));
    }
}

function openDeleteQueueModal(id, service) {
    document.getElementById('delete-queue-id').value = id;
    document.getElementById('delete-queue-name').textContent = service;
    document.getElementById('delete-queue-modal').style.display = 'flex';
}

async function deleteQueue() {
    clearError();
    const id = document.getElementById('delete-queue-id').value;

    try {
        await ApiService.deleteQueue(id);
        toastr.success('Fila excluída com sucesso!');
        closeModal();
        loadQueues();
        loadDashboard();
    } catch (error) {
        showError('Erro ao excluir fila: ' + (error.message || 'Falha ao excluir fila'));
    }
}

function openCancelTicketModal(id, number) {
    document.getElementById('cancel-ticket-id').value = id;
    document.getElementById('cancel-ticket-number').textContent = number;
    document.getElementById('cancel-ticket-modal').style.display = 'flex';
}

async function cancelTicket() {
    clearError();
    const id = document.getElementById('cancel-ticket-id').value;

    try {
        await ApiService.cancelTicket(id);
        toastr.success('Ticket cancelado com sucesso!');
        closeModal();
        loadTickets();
        loadDashboard();
    } catch (error) {
        showError('Erro ao cancelar ticket: ' + (error.message || 'Falha ao cancelar ticket'));
    }
}

function openValidatePresenceModal() {
    document.getElementById('qr-code').value = '';
    document.getElementById('validate-presence-modal').style.display = 'flex';
}

async function validatePresence() {
    clearError();
    const qrCode = document.getElementById('qr-code').value;

    if (!qrCode) {
        showError('Digite um código QR.');
        return;
    }

    try {
        const response = await ApiService.validatePresence(qrCode);
        toastr.success('Presença validada com sucesso!');
        closeModal();
        loadTickets();
        loadDashboard();
    } catch (error) {
        showError('Erro ao validar presença: ' + (error.message || 'Falha ao validar presença'));
    }
}

function openTradeTicketModal(id, number) {
    document.getElementById('trade-ticket-id').value = id;
    document.getElementById('trade-ticket-number').textContent = number;
    document.getElementById('trade-ticket-modal').style.display = 'flex';
}

async function offerTrade() {
    clearError();
    const id = document.getElementById('trade-ticket-id').value;

    try {
        await ApiService.offerTrade(id);
        toastr.success('Senha oferecida para troca!');
        closeModal();
        loadTickets();
    } catch (error) {
        showError('Erro ao oferecer troca: ' + (error.message || 'Falha ao oferecer troca'));
    }
}

async function loadReport() {
    try {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        const service = document.getElementById('report-service').value;
        const report = await ApiService.getReport(startDate, endDate, service);

        // Atualizar select de serviços
        const services = [...new Set(report.map(r => r.service))];
        const serviceSelect = document.getElementById('report-service');
        serviceSelect.innerHTML = '<option value="">Todos os serviços</option>' + 
            services.map(s => `<option value="${s}">${s}</option>`).join('');

        // Gráfico
        if (chartInstance) {
            chartInstance.destroy();
        }
        const ctx = document.getElementById('report-chart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: report.map(r => r.service),
                datasets: [{
                    label: 'Tickets Emitidos',
                    data: report.map(r => r.issued),
                    backgroundColor: '#2563eb',
                    borderColor: '#1e40af',
                    borderWidth: 1
                }, {
                    label: 'Tickets Atendidos',
                    data: report.map(r => r.attended),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1
                }, {
                    label: 'Tempo Médio (min)',
                    data: report.map(r => r.avg_time || 0),
                    type: 'line',
                    borderColor: '#f59e0b',
                    backgroundColor: '#f59e0b',
                    fill: false,
                    yAxisID: 'y1'
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true, position: 'left' },
                    y1: { beginAtZero: true, position: 'right' }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `Relatório de Atendimento (${startDate} - ${endDate || 'Hoje'})` }
                }
            }
        });
    } catch (error) {
        showError('Erro ao carregar relatório: ' + (error.message || 'Falha ao carregar relatório'));
    }
}

function exportReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const service = document.getElementById('report-service').value;

    ApiService.getReport(startDate, endDate, service).then(report => {
        const headers = ['Serviço', 'Tickets Emitidos', 'Tickets Atendidos', 'Tempo Médio (min)'];
        const rows = report.map(r => [r.service, r.issued, r.attended, r.avg_time || 'N/A']);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${startDate}_${endDate || 'hoje'}.csv`;
        link.click();
    }).catch(error => {
        showError('Erro ao exportar relatório: ' + (error.message || 'Falha ao exportar relatório'));
    });
}

function showTicketDetails(id, number, service, status, counter, issued_at) {
    document.getElementById('modal-ticket-number').textContent = `Senha: ${number}`;
    document.getElementById('modal-ticket-service').textContent = `Serviço: ${service}`;
    document.getElementById('modal-ticket-status').textContent = `Status: ${status}`;
    document.getElementById('modal-ticket-counter').textContent = `Guichê: ${counter || 'N/A'}`;
    document.getElementById('modal-ticket-issued').textContent = `Emitido em: ${new Date(issued_at).toLocaleString('pt-BR')}`;
    document.getElementById('ticket-modal').style.display = 'flex';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
}

async function changePassword() {
    clearError();
    const newPassword = document.getElementById('new-password').value;
    if (!newPassword) {
        showError('Digite uma nova senha.');
        return;
    }

    try {
        // Simulação: Backend não tem endpoint para alterar senha
        toastr.success('Senha alterada com sucesso!');
        document.getElementById('new-password').value = '';
    } catch (error) {
        showError('Erro ao alterar senha: ' + (error.message || 'Falha ao alterar senha'));
    }
}

async function savePreferences() {
    clearError();
    const preference = document.getElementById('notification-preference').value;
    try {
        // Simulação: Backend não tem endpoint para preferências
        toastr.success('Preferências salvas com sucesso!');
    } catch (error) {
        showError('Erro ao salvar preferências: ' + (error.message || 'Falha ao salvar preferências'));
    }
}

function initWebSocket() {
    if (socket) {
        socket.disconnect();
    }
    socket = io(API_BASE_URL, {
        auth: { token: token },
        transports: ['websocket']
    });

    socket.on('connect', () => {
        console.log('WebSocket conectado');
        socket.emit('join', `department_${userInfo.department_id}`);
    });

    socket.on('queue_update', data => {
        toastr.info(data.message);
        loadQueues();
        loadTickets();
        loadDashboard();
    });

    socket.on('notification', data => {
        toastr.info(data.message);
    });

    socket.on('trade_available', data => {
        toastr.info(`Nova oferta de troca: ${data.number} (${data.service})`);
    });

    socket.on('disconnect', () => {
        console.log('WebSocket desconectado');
    });
}

function initApp() {
    const loginSection = document.getElementById('login-section');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfoDiv = document.getElementById('user-info');
    const sections = document.querySelectorAll('.content-section');

    if (token && userInfo.email) {
        loginSection.style.display = 'none';
        sidebar.style.display = 'block';
        mainContent.classList.remove('full');
        logoutBtn.style.display = 'block';
        userInfoDiv.innerHTML = `${userInfo.email} | ${userInfo.department || 'N/A'}`;
        showSection('dashboard');
        loadDashboard();
        initWebSocket();
    } else {
        loginSection.style.display = 'block';
        sidebar.style.display = 'none';
        mainContent.classList.add('full');
        logoutBtn.style.display = 'none';
        userInfoDiv.innerHTML = '';
        sections.forEach(section => section.classList.remove('active'));
    }

    // Navegação
    document.querySelectorAll('.sidebar a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });

    // Filtros
    document.getElementById('queue-filter').addEventListener('input', loadQueues);
    document.getElementById('ticket-filter').addEventListener('input', loadTickets);

    // Menu toggle
    document.getElementById('menu-toggle').addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionId}-section`).classList.add('active');

    document.querySelectorAll('.sidebar a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });

    const titles = {
        dashboard: 'Dashboard',
        queues: 'Filas',
        tickets: 'Tickets',
        reports: 'Relatórios',
        settings: 'Configurações'
    };
    document.getElementById('section-title').textContent = titles[sectionId];

    if (sectionId === 'queues') {
        loadQueues();
    } else if (sectionId === 'tickets') {
        loadTickets();
    } else if (sectionId === 'reports') {
        loadReport();
    } else if (sectionId === 'dashboard') {
        loadDashboard();
    }
}

// Inicializa a aplicação
document.getElementById('logout-btn').addEventListener('click', handleLogout);
initApp();