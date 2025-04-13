// Configurações e variáveis globais
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImV4cCI6MTc0NDUwOTQwNCwiaWF0IjoxNzQ0NTA1ODA0fQ.0LWJ3lZ7DfN9CYYHEJCh4kg4wi7G4XVsgp9vzcaV8ww';
let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
let chartInstance = null;

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

        console.log(`Enviando requisição para: ${API_BASE_URL}${endpoint}`, { method, headers, body });

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Erro ${response.status}: ${errorText}`);
                throw new Error(errorText || response.statusText);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Erro na requisição ${endpoint}:`, error);
            throw error;
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
}

// Classe para gerenciamento da autenticação
class AuthManager {
    static saveUserSession(data) {
        token = data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({
            user_id: data.user_id,
            user_tipo: data.user_tipo,
            institution_id: data.institution_id,
            department: data.department,
            email: data.email,
        }));
    }

    static isAuthenticated() {
        return !!token && !!userInfo.user_id;
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = 'login.html';
    }

    static redirectIfNotAuthenticated() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
}

// Classe para o painel de administração
class AdminPanel {
    constructor() {
        if (!AuthManager.redirectIfNotAuthenticated()) return;
        
        this.initComponents();
        this.attachEventListeners();
        this.loadInitialData();
        this.updateDateTime();
    }

    initComponents() {
        document.getElementById('user-name').textContent = userInfo.email;
        document.getElementById('user-department').textContent = userInfo.department || 'Gestor';
        document.getElementById('page-title').textContent = 'Dashboard';
        document.getElementById('settings-email').value = userInfo.email || '';
        // Adiciona notificação de departamento ativo
        const departmentNotice = document.createElement('div');
        departmentNotice.className = 'department-notice';
        departmentNotice.textContent = `Mostrando dados do departamento: ${userInfo.department}`;
        document.querySelector('.main-content header').appendChild(departmentNotice);
    }

    attachEventListeners() {
        // Navegação da sidebar
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                if (sectionId) {
                    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
                    document.getElementById(sectionId).classList.add('active');
                    document.querySelectorAll('.sidebar nav a').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    document.getElementById('page-title').textContent = link.textContent;
                    
                    // Carrega dados específicos da seção
                    if (sectionId === 'dashboard-section') {
                        this.loadDashboard();
                    } else if (sectionId === 'queues-section') {
                        this.loadQueues();
                    } else if (sectionId === 'tickets-section') {
                        this.loadTickets();
                    }
                }
            });
        });

        // Botão de logout
        document.getElementById('logout').addEventListener('click', () => {
            AuthManager.logout();
        });

        // Filtro de tickets
        document.getElementById('ticket-status-filter')?.addEventListener('change', () => {
            this.loadTickets();
        });

        // Formulário de relatório
        document.getElementById('report-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateReport();
        });

        // Formulário de configurações
        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSettings();
        });
    }

    updateDateTime() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const now = new Date();
        document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
        
        // Atualiza a cada minuto
        setInterval(() => {
            const now = new Date();
            document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
        }, 60000);
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadDashboard(),
                this.loadQueues(),
                this.loadTickets()
            ]);
        } catch (error) {
            this.showError('Erro ao carregar dados iniciais', error);
        }
    }

    async loadDashboard() {
        try {
            const [queues, tickets] = await Promise.all([
                ApiService.getQueues(),
                ApiService.getTickets()
            ]);
            const today = new Date().toISOString().split('T')[0];

            // Filtra dados pelo departamento e instituição do usuário
            const userQueues = queues.filter(q => 
                q.department === userInfo.department && 
                q.institution_id === userInfo.institution_id
            );
            const userTickets = tickets.filter(t => 
                t.department === userInfo.department && 
                t.institution_id === userInfo.institution_id
            );

            const activeQueues = userQueues.length;
            const pendingTickets = userTickets.filter(t => t.status === 'Pendente').length;
            const attendedToday = userTickets.filter(t => 
                t.status === 'attended' && 
                t.issued_at.startsWith(today)
            ).length;
            
            const waitTimes = userTickets
                .filter(t => t.wait_time && t.wait_time !== 'N/A')
                .map(t => parseFloat(t.wait_time.split(' ')[0]) || 0);
            
            const avgWaitTime = waitTimes.length 
                ? (waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length).toFixed(1) 
                : 0;

            document.getElementById('active-queues').textContent = activeQueues;
            document.getElementById('pending-tickets').textContent = pendingTickets;
            document.getElementById('avg-wait-time').textContent = `${avgWaitTime} min`;
            document.getElementById('attended-tickets').textContent = attendedToday;
        } catch (error) {
            this.showError('Erro ao carregar dashboard', error);
        }
    }

    async loadQueues() {
        try {
            const queues = await ApiService.getQueues();
            const tableBody = document.getElementById('queues-table');
            const fullTableBody = document.getElementById('queues-table-full');
            
            if (tableBody) tableBody.innerHTML = '';
            if (fullTableBody) fullTableBody.innerHTML = '';

            // Filtra filas pelo departamento e instituição do usuário
            const userQueues = queues.filter(q => 
                q.department === userInfo.department && 
                q.institution_id === userInfo.institution_id
            );

            if (userQueues.length === 0) {
                const emptyRow = `<tr><td colspan="5">Nenhuma fila encontrada para ${userInfo.department}</td></tr>`;
                if (tableBody) tableBody.innerHTML = emptyRow;
                if (fullTableBody) fullTableBody.innerHTML = emptyRow;
                return;
            }

            userQueues.forEach(queue => {
                const row = `
                    <tr>
                        <td>${queue.service}</td>
                        <td>${queue.active_tickets}</td>
                        <td>${queue.current_ticket ? `${queue.prefix}${queue.current_ticket.toString().padStart(3, '0')}` : 'N/A'}</td>
                        <td><span class="status-${queue.status.toLowerCase()}">${queue.status}</span></td>
                        <td><button class="btn secondary-btn" onclick="adminPanel.callNextTicket('${queue.id}')">Chamar Próximo</button></td>
                    </tr>
                `;
                
                if (tableBody) tableBody.innerHTML += row;
                if (fullTableBody) fullTableBody.innerHTML += row;
            });
        } catch (error) {
            this.showError('Erro ao carregar filas', error);
            const errorRow = '<tr><td colspan="5">Erro ao carregar filas</td></tr>';
            if (document.getElementById('queues-table')) document.getElementById('queues-table').innerHTML = errorRow;
            if (document.getElementById('queues-table-full')) document.getElementById('queues-table-full').innerHTML = errorRow;
        }
    }

    async callNextTicket(queueId) {
        try {
            const data = await ApiService.callNextTicket(queueId);
            this.showSuccess(`Senha ${data.ticket_number} chamada para o guichê ${data.counter}`);
            this.loadQueues();
            this.loadTickets();
            this.loadDashboard();
        } catch (error) {
            this.showError('Erro ao chamar próximo ticket', error);
        }
    }

    async loadTickets() {
        try {
            const tickets = await ApiService.getTickets();
            const filter = document.getElementById('ticket-status-filter')?.value;
            
            // Filtra tickets pelo departamento e instituição do usuário
            let filteredTickets = tickets.filter(t => 
                t.department === userInfo.department && 
                t.institution_id === userInfo.institution_id
            );
            
            if (filter) {
                filteredTickets = filteredTickets.filter(t => t.status === filter);
            }

            const tableBody = document.getElementById('tickets-table');
            tableBody.innerHTML = '';

            if (filteredTickets.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5">Nenhum ticket encontrado para ${userInfo.department}</td></tr>`;
                return;
            }

            filteredTickets.forEach(ticket => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${ticket.number}</td>
                    <td>${ticket.service}</td>
                    <td><span class="status-${ticket.status.toLowerCase()}">${ticket.status}</span></td>
                    <td>${ticket.wait_time || 'N/A'}</td>
                    <td>${ticket.counter || 'N/A'}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            this.showError('Erro ao carregar tickets', error);
            document.getElementById('tickets-table').innerHTML = '<tr><td colspan="5">Erro ao carregar tickets</td></tr>';
        }
    }

    async generateReport() {
        try {
            const date = document.getElementById('report-date').value;
            const reportType = document.getElementById('report-type').value;
            const tickets = await ApiService.getTickets();
            
            // Filtra tickets pelo departamento e instituição do usuário
            let filteredTickets = tickets.filter(t => 
                t.department === userInfo.department && 
                t.institution_id === userInfo.institution_id
            );
            
            if (date) {
                filteredTickets = filteredTickets.filter(t => t.issued_at.startsWith(date));
            }

            const ctx = document.getElementById('report-chart').getContext('2d');
            if (chartInstance) chartInstance.destroy();

            if (reportType === 'status') {
                const statuses = ['Pendente', 'Chamado', 'attended', 'Cancelado'];
                const counts = statuses.map(status => 
                    filteredTickets.filter(t => t.status === status).length
                );

                chartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: statuses,
                        datasets: [{
                            label: `Tickets por Status (${userInfo.department})`,
                            data: counts,
                            backgroundColor: [
                                '#007bff', '#ffc107', '#28a745', '#dc3545'
                            ],
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: true } },
                        plugins: { legend: { display: false } }
                    }
                });
            } else if (reportType === 'wait-time') {
                const services = [...new Set(filteredTickets.map(t => t.service))];
                const avgWaitTimes = services.map(service => {
                    const times = filteredTickets
                        .filter(t => t.service === service && t.wait_time && t.wait_time !== 'N/A')
                        .map(t => parseFloat(t.wait_time.split(' ')[0]) || 0);
                    return times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 0;
                });

                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: services,
                        datasets: [{
                            label: `Tempo Médio de Espera (min) - ${userInfo.department}`,
                            data: avgWaitTimes,
                            borderColor: '#007bff',
                            fill: false,
                        }]
                    },
                    options: {
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
        } catch (error) {
            this.showError('Erro ao gerar relatório', error);
        }
    }

    async updateSettings() {
        const password = document.getElementById('settings-password').value.trim();
        const confirmPassword = document.getElementById('settings-confirm-password').value.trim();
        
        if (!password) {
            this.showError('As senhas não podem estar vazias');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('As senhas não coincidem');
            return;
        }
        
        try {
            // Aqui você implementaria a chamada para atualização de senha
            this.showSuccess('Senha atualizada com sucesso');
            document.getElementById('settings-password').value = '';
            document.getElementById('settings-confirm-password').value = '';
        } catch (error) {
            this.showError('Erro ao atualizar senha', error);
        }
    }

    showError(message, error = null) {
        if (error) console.error(message, error);
        alert(`Erro: ${message}`);
    }

    showSuccess(message) {
        alert(`Sucesso: ${message}`);
    }
}

// Classe de Login
class LoginManager {
    static init() {
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    static async handleLogin(event) {
        event.preventDefault();
        const form = event.target;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorMessage = document.getElementById('error-message');
        const submitBtn = form.querySelector('button[type="submit"]');

        errorMessage.textContent = '';
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

        try {
            if (!email || !password) {
                throw new Error('Email e senha são obrigatórios');
            }

            const data = await ApiService.login(email, password);
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            AuthManager.saveUserSession(data);
            window.location.href = 'index.html';
        } catch (error) {
            errorMessage.textContent = error.message.includes('Credenciais') 
                ? 'Credenciais inválidas' 
                : error.message;
            console.error('Erro no login:', error);
            
            // Mantém os valores dos campos
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'login.html') {
        LoginManager.init();
    } else {
        window.adminPanel = new AdminPanel();
    }
});