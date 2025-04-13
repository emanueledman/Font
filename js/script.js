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

    static async getReport(date) {
        return await this.request(`/api/admin/report?date=${date}`);
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
        const avgTimes = report.filter(r => r.avg_time).map(r => r.avg_time);
        const avgWaitTime = avgTimes.length ? Math.round(avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length) : 0;

        document.getElementById('active-queues').textContent = activeQueues;
        document.getElementById('pending-tickets').textContent = pendingTickets;
        document.getElementById('attended-tickets').textContent = attendedTickets;
        document.getElementById('avg-wait-time').textContent = `${avgWaitTime} min`;

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
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
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
                        <button onclick="callNextTicket('${queue.id}')">Chamar</button>
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
            ticketContent.innerHTML = '<div class="no-tickets">Nenhum ticket ativo encontrado.</div>';
            return;
        }

        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        tickets
            .filter(ticket => ticket.number.toLowerCase().includes(filter))
            .forEach(ticket => {
                const statusClass = ticket.status === 'Pendente' ? 'card-orange' :
                                   ticket.status === 'Chamado' ? 'card-red' :
                                   ticket.status === 'attended' ? 'card-green' : '';
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
                `;
                ticketContent.appendChild(card);
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

async function loadReport() {
    try {
        const date = document.getElementById('report-date').value || new Date().toISOString().split('T')[0];
        const report = await ApiService.getReport(date);

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
                    title: { display: true, text: `Relatório de Atendimento (${date})` }
                }
            }
        });
    } catch (error) {
        showError('Erro ao carregar relatório: ' + (error.message || 'Falha ao carregar relatório'));
    }
}

function exportReport() {
    const date = document.getElementById('report-date').value || new Date().toISOString().split('T')[0];

    ApiService.getReport(date).then(report => {
        const headers = ['Serviço', 'Tickets Emitidos', 'Tickets Atendidos', 'Tempo Médio (min)'];
        const rows = report.map(r => [r.service, r.issued, r.attended, r.avg_time ? Math.round(r.avg_time) : 'N/A']);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${date}.csv`;
        link.click();
    }).catch(error => {
        showError('Erro ao exportar relatório: ' + (error.message || 'Falha ao exportar relatório'));
    });
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
        reports: 'Relatórios'
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