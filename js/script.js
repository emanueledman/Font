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
let statusChart = null;
let historyChart = null;
let timelineChart = null;
let socket = null;

// Dados mockados para logs e configurações (simulando backend)
let mockLogs = [];
let mockUsers = [];
let mockQueueSettings = { dailyLimit: 20, ticketExpiration: 30, callTimeout: 5 };
let mockNotificationSettings = { enableWebSocket: true, defaultMessage: 'Dirija-se ao guichê {counter}! Senha {number} chamada.' };

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

    static async getReport(startDate, endDate) {
        const query = endDate ? `?date=${startDate}&end_date=${endDate}` : `?date=${startDate}`;
        return await this.request(`/api/admin/report${query}`);
    }

    static async toggleQueueStatus(queueId, action) {
        return await this.request(`/api/queue/${queueId}`, 'PUT', { status: action });
    }

    static async createQueue(data) {
        return await this.request('/api/queue/create', 'POST', data);
    }
}

// Funções de manipulação da interface
function showLoader() {
    document.getElementById('loader').style.display = 'flex';
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
        const today = new Date().toISOString().split('T')[0];
        const [queues, tickets, report] = await Promise.all([
            ApiService.getQueues(),
            ApiService.getTickets(),
            ApiService.getReport(today)
        ]);

        const activeQueues = queues.filter(q => q.active_tickets < q.daily_limit).length;
        const pendingTickets = tickets.filter(t => t.status === 'Pendente' || t.status === 'Chamado').length;
        const attendedTickets = tickets.filter(t => t.status === 'attended').length;
        const cancelledTickets = tickets.filter(t => t.status === 'Cancelado').length;
        const pausedQueues = queues.filter(q => q.status === 'Pausado').length;
        const avgTimes = report.filter(r => r.avg_time).map(r => r.avg_time);
        const avgWaitTime = avgTimes.length ? Math.round(avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length) : 0;
        const attendanceRate = attendedTickets / (new Date().getHours() + 1) || 0;

        document.getElementById('active-queues').textContent = activeQueues;
        document.getElementById('pending-tickets').textContent = pendingTickets;
        document.getElementById('attended-tickets').textContent = attendedTickets;
        document.getElementById('cancelled-tickets').textContent = cancelledTickets;
        document.getElementById('paused-queues').textContent = pausedQueues;
        document.getElementById('avg-wait-time').textContent = `${avgWaitTime} min`;
        document.getElementById('attendance-rate').textContent = attendanceRate.toFixed(1);

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
                    backgroundColor: '#1890ff',
                    borderColor: '#40a9ff',
                    borderWidth: 1
                }, {
                    label: 'Tickets Atendidos',
                    data: report.map(r => r.attended),
                    backgroundColor: '#52c41a',
                    borderColor: '#73d13d',
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

        if (statusChart) {
            statusChart.destroy();
        }
        const statusCtx = document.getElementById('status-chart').getContext('2d');
        statusChart = new Chart(statusCtx, {
            type: 'pie',
            data: {
                labels: ['Pendentes', 'Chamados', 'Atendidos'],
                datasets: [{
                    data: [
                        tickets.filter(t => t.status === 'Pendente').length,
                        tickets.filter(t => t.status === 'Chamado').length,
                        tickets.filter(t => t.status === 'attended').length
                    ],
                    backgroundColor: ['#ff6f47', '#ff4d4f', '#52c41a'],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Distribuição de Tickets por Status' }
                }
            }
        });

        if (historyChart) {
            historyChart.destroy();
        }
        const historyCtx = document.getElementById('history-chart').getContext('2d');
        historyChart = new Chart(historyCtx, {
            type: 'line',
            data: {
                labels: ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5'],
                datasets: [{
                    label: 'Tickets Atendidos',
                    data: [50, 45, 60, 55, attendedTickets],
                    borderColor: '#52c41a',
                    backgroundColor: 'rgba(82, 196, 26, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Histórico de Atendimento (5 Dias)' }
                }
            }
        });

        const recentTicketsContent = document.getElementById('recent-tickets-content');
        recentTicketsContent.innerHTML = '';
        const recentTickets = tickets.filter(t => t.status === 'attended').slice(0, 5);
        recentTickets.forEach(ticket => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ticket.number}</td>
                <td>${ticket.service}</td>
                <td>${ticket.counter || 'N/A'}</td>
                <td>${new Date(ticket.attended_at).toLocaleString('pt-BR')}</td>
                <td><span class="badge attended">${ticket.status}</span></td>
            `;
            recentTicketsContent.appendChild(row);
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError('Erro ao carregar dashboard: ' + (error.message || 'Falha ao carregar dados'));
    }
}

function exportDashboard() {
    const today = new Date().toISOString().split('T')[0];
    ApiService.getReport(today).then(report => {
        const headers = ['Serviço', 'Tickets Emitidos', 'Tickets Atendidos'];
        const rows = report.map(r => [r.service, r.issued, r.attended]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `dashboard_${today}.csv`;
        link.click();
    }).catch(error => {
        showError('Erro ao exportar dashboard: ' + (error.message || 'Falha ao exportar dados'));
    });
}

async function loadQueues() {
    try {
        const queues = await ApiService.getQueues();
        const queueContent = document.getElementById('queue-content');
        queueContent.innerHTML = '';

        if (queues.length === 0) {
            queueContent.innerHTML = '<tr><td colspan="8">Nenhuma fila encontrada.</td></tr>';
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
                    <td>${queue.prefix}</td>
                    <td>${queue.active_tickets}/${queue.daily_limit}</td>
                    <td>${queue.current_ticket || 'N/A'}</td>
                    <td>${queue.avg_wait_time || 'N/A'}</td>
                    <td><span class="badge ${queue.status === 'Aberto' ? 'open' : queue.status === 'Pausado' ? 'paused' : 'full'}">${queue.status}</span></td>
                    <td>
                        <button onclick="callNextTicket('${queue.id}')"><i class="fas fa-phone"></i> Chamar</button>
                        <button onclick="toggleQueueStatus('${queue.id}', '${queue.status === 'Aberto' ? 'pause' : 'resume'}')">
                            <i class="fas ${queue.status === 'Aberto' ? 'fa-pause' : 'fa-play'}"></i> ${queue.status === 'Aberto' ? 'Pausar' : 'Retomar'}
                        </button>
                    </td>
                `;
                queueContent.appendChild(row);
            });

        const queueHistoryContent = document.getElementById('queue-history-content');
        queueHistoryContent.innerHTML = '';
        queues.forEach(queue => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${queue.service}</td>
                <td>${queue.active_tickets + (queue.current_ticket || 0)}</td>
                <td>${queue.current_ticket || 0}</td>
                <td>${queue.active_tickets}</td>
                <td>${new Date().toLocaleString('pt-BR')}</td>
            `;
            queueHistoryContent.appendChild(row);
        });

        if ($.fn.DataTable.isDataTable('#queues-table')) {
            $('#queues-table').DataTable().destroy();
        }
        $('#queues-table').DataTable({
            pageLength: 10,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });

        if ($.fn.DataTable.isDataTable('#queue-history-table')) {
            $('#queue-history-table').DataTable().destroy();
        }
        $('#queue-history-table').DataTable({
            pageLength: 5,
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
            ticketContent.innerHTML = '<div class="no-tickets">Nenhum ticket ativo encontrado.</div>';
            return;
        }

        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        const statusFilter = document.getElementById('ticket-status-filter').value;
        const dateFilter = document.getElementById('ticket-date-filter').value;

        const filteredTickets = tickets.filter(ticket => {
            const matchesFilter = ticket.number.toLowerCase().includes(filter);
            const matchesStatus = statusFilter ? ticket.status === statusFilter : true;
            const matchesDate = dateFilter ? new Date(ticket.issued_at).toISOString().split('T')[0] === dateFilter : true;
            return matchesFilter && matchesStatus && matchesDate;
        });

        filteredTickets.forEach(ticket => {
            const statusClass = ticket.status === 'Pendente' ? 'card-orange' :
                               ticket.status === 'Chamado' ? 'card-red' :
                               ticket.status === 'attended' ? 'card-green' : '';
            const waitTime = ticket.wait_time || 'N/A';
            const issuedAt = new Date(ticket.issued_at).toLocaleString('pt-BR');
            const card = document.createElement('div');
            card.className = `ticket-card ${statusClass}`;
            card.innerHTML = `
                <div class="ticket-number">${ticket.number}</div>
                <div class="ticket-info">
                    <span>Serviço:</span> ${ticket.service}
                </div>
                <div class="ticket-info">
                    <span>Status:</span> <span class="badge ${ticket.status === 'Pendente' ? 'pending' : ticket.status === 'Chamado' ? 'called' : 'attended'}">${ticket.status}</span>
                </div>
                <div class="ticket-info">
                    <span>Guichê:</span> ${ticket.counter || 'N/A'}
                </div>
                <div class="ticket-info">
                    <span>Emitido em:</span> ${issuedAt}
                </div>
                <div class="ticket-info">
                    <span>Tempo de Espera:</span> ${waitTime} min
                </div>
                <div class="ticket-actions">
                    ${ticket.status === 'Pendente' ? `<button onclick="callNextTicket('${ticket.queue_id}')"><i class="fas fa-phone"></i> Chamar</button>` : ''}
                    ${ticket.status === 'Pendente' ? `<button onclick="reassignTicket('${ticket.id}')"><i class="fas fa-sync-alt"></i> Reatribuir</button>` : ''}
                </div>
            `;
            ticketContent.appendChild(card);
        });

        const ticketHistoryContent = document.getElementById('ticket-history-content');
        ticketHistoryContent.innerHTML = '';
        tickets.slice(0, 5).forEach(ticket => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ticket.number}</td>
                <td>${ticket.status === 'attended' ? 'Atendido' : ticket.status === 'Chamado' ? 'Chamado' : 'Emitido'}</td>
                <td>${new Date(ticket.issued_at).toLocaleString('pt-BR')}</td>
                <td>${userInfo.email}</td>
            `;
            ticketHistoryContent.appendChild(row);
        });

        if ($.fn.DataTable.isDataTable('#ticket-history-table')) {
            $('#ticket-history-table').DataTable().destroy();
        }
        $('#ticket-history-table').DataTable({
            pageLength: 5,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });
    } catch (error) {
        showError('Erro ao carregar tickets: ' + (error.message || 'Falha ao carregar tickets'));
    }
}

async function loadStartService() {
    try {
        const queues = await ApiService.getQueues();
        const startServiceContent = document.getElementById('start-service-content');
        startServiceContent.innerHTML = '';

        if (queues.length === 0) {
            startServiceContent.innerHTML = '<div class="no-queues">Nenhuma fila disponível para iniciar atendimento.</div>';
            return;
        }

        queues.forEach(queue => {
            const statusClass = queue.status === 'Aberto' ? 'card-green' : queue.status === 'Pausado' ? 'card-orange' : 'card-red';
            const card = document.createElement('div');
            card.className = `start-service-card ${statusClass}`;
            card.innerHTML = `
                <h3>${queue.service}</h3>
                <div class="start-service-info">
                    <span>Departamento:</span> ${queue.department}
                </div>
                <div class="start-service-info">
                    <span>Tickets Ativos:</span> ${queue.active_tickets}/${queue.daily_limit}
                </div>
                <div class="start-service-info">
                    <span>Status:</span> <span class="badge ${queue.status === 'Aberto' ? 'open' : queue.status === 'Pausado' ? 'paused' : 'full'}">${queue.status}</span>
                </div>
                <button onclick="callNextTicket('${queue.id}')">${queue.status === 'Aberto' ? 'Chamar Próximo' : 'Iniciar Atendimento'}</button>
            `;
            startServiceContent.appendChild(card);
        });

        const serviceHistoryContent = document.getElementById('service-history-content');
        serviceHistoryContent.innerHTML = '';
        queues.forEach(queue => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${queue.service}</td>
                <td>${queue.current_ticket || 0}</td>
                <td>${queue.avg_wait_time || 'N/A'}</td>
                <td>${new Date().toLocaleString('pt-BR')}</td>
            `;
            serviceHistoryContent.appendChild(row);
        });

        const nextTicketsContent = document.getElementById('next-tickets-content');
        nextTicketsContent.innerHTML = '';
        const tickets = await ApiService.getTickets();
        const nextTickets = tickets.filter(t => t.status === 'Pendente').slice(0, 5);
        nextTickets.forEach(ticket => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${ticket.number}</td>
                <td>${ticket.service}</td>
                <td>${ticket.position}</td>
                <td>${ticket.wait_time || 'N/A'}</td>
            `;
            nextTicketsContent.appendChild(row);
        });

        if ($.fn.DataTable.isDataTable('#service-history-table')) {
            $('#service-history-table').DataTable().destroy();
        }
        $('#service-history-table').DataTable({
            pageLength: 5,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });

        if ($.fn.DataTable.isDataTable('#next-tickets-table')) {
            $('#next-tickets-table').DataTable().destroy();
        }
        $('#next-tickets-table').DataTable({
            pageLength: 5,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });
    } catch (error) {
        showError('Erro ao carregar filas para iniciar atendimento: ' + (error.message || 'Falha ao carregar dados'));
    }
}

async function callNextTicket(queueId) {
    clearError();
    try {
        const response = await ApiService.callNextTicket(queueId);
        toastr.success(response.message);
        mockLogs.push({ action: 'Chamar Ticket', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: `Fila: ${queueId}` });
        loadTickets();
        loadDashboard();
        loadStartService();
        loadQueues();
        loadSettings();
    } catch (error) {
        showError('Erro ao chamar próximo ticket: ' + (error.message || 'Falha ao chamar ticket'));
    }
}

async function toggleQueueStatus(queueId, action) {
    try {
        await ApiService.toggleQueueStatus(queueId, action);
        toastr.success(`Fila ${action === 'pause' ? 'pausada' : 'retomada'} com sucesso!`);
        mockLogs.push({ action: action === 'pause' ? 'Pausar Fila' : 'Retomar Fila', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: `Fila: ${queueId}` });
        loadQueues();
        loadStartService();
        loadDashboard();
        loadSettings();
    } catch (error) {
        showError(`Erro ao ${action === 'pause' ? 'pausar' : 'retomar'} fila: ` + (error.message || 'Falha ao executar ação'));
    }
}

async function reassignTicket(ticketId) {
    toastr.info(`Reatribuindo ticket ${ticketId}... (Funcionalidade simulada)`);
    mockLogs.push({ action: 'Reatribuir Ticket', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: `Ticket: ${ticketId}` });
    loadTickets();
    loadSettings();
}

async function loadReport() {
    try {
        const startDate = document.getElementById('report-start-date').value || new Date().toISOString().split('T')[0];
        const endDate = document.getElementById('report-end-date').value;
        const report = await ApiService.getReport(startDate, endDate);

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
                    backgroundColor: '#1890ff',
                    borderColor: '#40a9ff',
                    borderWidth: 1
                }, {
                    label: 'Tickets Atendidos',
                    data: report.map(r => r.attended),
                    backgroundColor: '#52c41a',
                    borderColor: '#73d13d',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `Relatório de Atendimento (${startDate}${endDate ? ` a ${endDate}` : ''})` }
                }
            }
        });

        if (timelineChart) {
            timelineChart.destroy();
        }
        const timelineCtx = document.getElementById('timeline-chart').getContext('2d');
        timelineChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5'],
                datasets: [{
                    label: 'Tickets Atendidos',
                    data: [50, 45, 60, 55, report.reduce((sum, r) => sum + r.attended, 0)],
                    borderColor: '#52c41a',
                    backgroundColor: 'rgba(82, 196, 26, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Linha do Tempo de Atendimento' }
                }
            }
        });

        const reportContent = document.getElementById('report-content');
        reportContent.innerHTML = '';
        report.forEach(r => {
            const cancelled = r.issued - r.attended;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${r.service}</td>
                <td>${r.issued}</td>
                <td>${r.attended}</td>
                <td>${cancelled}</td>
                <td>${r.avg_time ? Math.round(r.avg_time) : 'N/A'}</td>
            `;
            reportContent.appendChild(row);
        });
    } catch (error) {
        showError('Erro ao carregar relatório: ' + (error.message || 'Falha ao carregar relatório'));
    }
}

function exportReport() {
    const startDate = document.getElementById('report-start-date').value || new Date().toISOString().split('T')[0];
    const endDate = document.getElementById('report-end-date').value;

    ApiService.getReport(startDate, endDate).then(report => {
        const headers = ['Serviço', 'Tickets Emitidos', 'Tickets Atendidos', 'Tickets Cancelados', 'Tempo Médio (min)'];
        const rows = report.map(r => [
            r.service,
            r.issued,
            r.attended,
            r.issued - r.attended,
            r.avg_time ? Math.round(r.avg_time) : 'N/A'
        ]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${startDate}${endDate ? `_a_${endDate}` : ''}.csv`;
        link.click();
    }).catch(error => {
        showError('Erro ao exportar relatório: ' + (error.message || 'Falha ao exportar relatório'));
    });
}

function exportReportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const startDate = document.getElementById('report-start-date').value || new Date().toISOString().split('T')[0];
    const endDate = document.getElementById('report-end-date').value;

    doc.setFontSize(16);
    doc.text(`Relatório de Atendimento (${startDate}${endDate ? ` a ${endDate}` : ''})`, 14, 20);
    doc.setFontSize(12);
    doc.autoTable({
        head: [['Serviço', 'Tickets Emitidos', 'Tickets Atendidos', 'Tickets Cancelados', 'Tempo Médio (min)']],
        body: Array.from(document.querySelectorAll('#report-table tbody tr')).map(row => Array.from(row.cells).map(cell => cell.textContent)),
        startY: 30
    });
    doc.save(`relatorio_${startDate}${endDate ? `_a_${endDate}` : ''}.pdf`);
}

async function loadSettings() {
    try {
        // Usuários (mockados)
        const usersContent = document.getElementById('users-content');
        usersContent.innerHTML = '';
        mockUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.department || 'N/A'}</td>
                <td><span class="badge ${user.active ? 'open' : 'full'}">${user.active ? 'Ativo' : 'Inativo'}</span></td>
                <td>
                    <button onclick="editUser('${user.email}')"><i class="fas fa-edit"></i> Editar</button>
                    <button onclick="deleteUser('${user.email}')"><i class="fas fa-trash"></i> Excluir</button>
                </td>
            `;
            usersContent.appendChild(row);
        });

        // Configurações de Filas
        document.getElementById('default-daily-limit').value = mockQueueSettings.dailyLimit;
        document.getElementById('ticket-expiration').value = mockQueueSettings.ticketExpiration;
        document.getElementById('call-timeout').value = mockQueueSettings.callTimeout;

        // Configurações de Notificações
        document.getElementById('enable-websocket').checked = mockNotificationSettings.enableWebSocket;
        document.getElementById('default-message').value = mockNotificationSettings.defaultMessage;

        // Logs
        const logsContent = document.getElementById('logs-content');
        logsContent.innerHTML = '';
        mockLogs.slice(-10).forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.action}</td>
                <td>${log.user}</td>
                <td>${log.date}</td>
                <td>${log.details}</td>
            `;
            logsContent.appendChild(row);
        });

        if ($.fn.DataTable.isDataTable('#users-table')) {
            $('#users-table').DataTable().destroy();
        }
        $('#users-table').DataTable({
            pageLength: 5,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });

        if ($.fn.DataTable.isDataTable('#logs-table')) {
            $('#logs-table').DataTable().destroy();
        }
        $('#logs-table').DataTable({
            pageLength: 5,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/pt-BR.json' }
        });
    } catch (error) {
        showError('Erro ao carregar configurações: ' + (error.message || 'Falha ao carregar dados'));
    }
}

function saveQueueSettings(event) {
    event.preventDefault();
    mockQueueSettings.dailyLimit = parseInt(document.getElementById('default-daily-limit').value);
    mockQueueSettings.ticketExpiration = parseInt(document.getElementById('ticket-expiration').value);
    mockQueueSettings.callTimeout = parseInt(document.getElementById('call-timeout').value);
    toastr.success('Configurações de filas salvas com sucesso!');
    mockLogs.push({ action: 'Salvar Configurações de Filas', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: 'Configurações globais atualizadas' });
    loadSettings();
}

function saveNotificationSettings(event) {
    event.preventDefault();
    mockNotificationSettings.enableWebSocket = document.getElementById('enable-websocket').checked;
    mockNotificationSettings.defaultMessage = document.getElementById('default-message').value;
    toastr.success('Configurações de notificações salvas com sucesso!');
    mockLogs.push({ action: 'Salvar Configurações de Notificações', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: 'Configurações de notificações atualizadas' });
    loadSettings();
}

function openCreateQueueModal() {
    document.getElementById('create-queue-modal').style.display = 'flex';
}

function closeCreateQueueModal() {
    document.getElementById('create-queue-modal').style.display = 'none';
}

async function createQueue(event) {
    event.preventDefault();
    const data = {
        service: document.getElementById('queue-service').value,
        prefix: document.getElementById('queue-prefix').value,
        department_id: userInfo.department_id,
        open_time: document.getElementById('queue-open-time').value,
        end_time: document.getElementById('queue-end-time').value || null,
        daily_limit: parseInt(document.getElementById('queue-daily-limit').value),
        num_counters: parseInt(document.getElementById('queue-num-counters').value)
    };

    try {
        await ApiService.createQueue(data);
        toastr.success('Fila criada com sucesso!');
        mockLogs.push({ action: 'Criar Fila', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: `Serviço: ${data.service}` });
        closeCreateQueueModal();
        loadQueues();
        loadStartService();
        loadDashboard();
        loadSettings();
    } catch (error) {
        showError('Erro ao criar fila: ' + (error.message || 'Falha ao criar fila'));
    }
}

function openCreateUserModal() {
    document.getElementById('create-user-modal').style.display = 'flex';
}

function closeCreateUserModal() {
    document.getElementById('create-user-modal').style.display = 'none';
}

function createUser(event) {
    event.preventDefault();
    const user = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value,
        department: userInfo.department,
        active: true
    };
    mockUsers.push(user);
    toastr.success('Usuário adicionado com sucesso!');
    mockLogs.push({ action: 'Adicionar Usuário', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: `Email: ${user.email}` });
    closeCreateUserModal();
    loadSettings();
}

function editUser(email) {
    toastr.info(`Editando usuário ${email}... (Funcionalidade simulada)`);
    mockLogs.push({ action: 'Editar Usuário', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: `Email: ${email}` });
    loadSettings();
}

function deleteUser(email) {
    mockUsers = mockUsers.filter(user => user.email !== email);
    toastr.success('Usuário excluído com sucesso!');
    mockLogs.push({ action: 'Excluir Usuário', user: userInfo.email, date: new Date().toLocaleString('pt-BR'), details: `Email: ${email}` });
    loadSettings();
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

    socket.on('notification', data => {
        toastr.info(data.message);
        loadQueues();
        loadTickets();
        loadDashboard();
        loadStartService();
        loadSettings();
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

    // Navegação Sidebar
    document.querySelectorAll('.sidebar .menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            showSection(section);
        });
    });

    // Filtros
    document.getElementById('queue-filter').addEventListener('input', loadQueues);
    document.getElementById('ticket-filter').addEventListener('input', loadTickets);
    document.getElementById('ticket-status-filter').addEventListener('change', loadTickets);
    document.getElementById('ticket-date-filter').addEventListener('change', loadTickets);
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${sectionId}-section`).classList.add('active');

    // Atualizar links da sidebar
    document.querySelectorAll('.sidebar .menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === sectionId) {
            link.classList.add('active');
        }
    });

    const titles = {
        dashboard: 'Dashboard',
        queues: 'Filas',
        tickets: 'Tickets',
        'start-service': 'Iniciar Atendimento',
        reports: 'Relatórios',
        settings: 'Configurações'
    };
    document.getElementById('section-title').textContent = titles[sectionId];

    if (sectionId === 'queues') {
        loadQueues();
    } else if (sectionId === 'tickets') {
        loadTickets();
    } else if (sectionId === 'start-service') {
        loadStartService();
    } else if (sectionId === 'reports') {
        loadReport();
    } else if (sectionId === 'dashboard') {
        loadDashboard();
    } else if (sectionId === 'settings') {
        loadSettings();
    }
}

// Inicializa a aplicação
document.getElementById('logout-btn').addEventListener('click', handleLogout);
initApp();