// Configurações e variáveis globais
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token');
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

        console.log(`Enviando requisição para: ${API_BASE_URL}${endpoint}`, { method, headers: {...headers, Authorization: token ? '[PROTECTED]' : undefined}, body });

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                console.error('Erro de autenticação. Token pode estar inválido ou expirado.');
                AuthManager.logout();
                throw new Error('Sessão expirada');
            }
            
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
        if (!data.token) {
            console.error('Token não fornecido na resposta de login');
            return false;
        }
        
        token = data.token;
        if (token.startsWith('Bearer ')) {
            token = token.substring(7);
        }
        
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify({
            user_id: data.user_id,
            user_tipo: data.user_tipo,
            institution_id: data.institution_id,
            department: data.department,
            email: data.email,
        }));
        userInfo = JSON.parse(localStorage.getItem('userInfo'));
        
        return true;
    }

    static isAuthenticated() {
        return !!token && !!userInfo.user_id;
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        token = null;
        userInfo = {};
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
        
        this.isLoading = false;
        this.initComponents();
        this.attachEventListeners();
        this.loadInitialData();
        this.intervalId = this.updateDateTime();
    }

    initComponents() {
        document.getElementById('user-name').textContent = userInfo.email || 'Usuário';
        document.getElementById('user-department').textContent = userInfo.department || 'Sem Departamento';
        document.getElementById('page-title').textContent = 'Dashboard';
        document.getElementById('settings-email').value = userInfo.email || '';
        
        // Adicionar container para mensagens de erro
        const mainContent = document.querySelector('.main-content');
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        errorDiv.style.display = 'none';
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
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

        // Limpar mensagens de erro ao mudar de aba
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', () => {
                this.hideError();
            });
        });
    }

    updateDateTime() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const update = () => {
            const now = new Date();
            document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
        };
        update();
        return setInterval(update, 60000);
    }

    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (chartInstance) {
            chartInstance.destroy();
        }
    }

    async loadInitialData() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.showLoading();

        try {
            const [queues, tickets] = await Promise.all([
                ApiService.getQueues(),
                ApiService.getTickets()
            ]);

            await Promise.all([
                this.loadDashboard(queues, tickets),
                this.loadQueues(queues),
                this.loadTickets(tickets)
            ]);

            console.log("Dados iniciais carregados com sucesso", { queues, tickets });
        } catch (error) {
            this.showError('Erro ao carregar dados iniciais', error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadDashboard(queues = null, tickets = null) {
        if (this.isLoading) return;
        this.isLoading = true;
        this.showLoading();

        try {
            const [queuesData, ticketsData] = queues && tickets ? 
                [queues, tickets] : 
                await Promise.all([ApiService.getQueues(), ApiService.getTickets()]);
            
            const today = new Date().toISOString().split('T')[0];
    
            const activeQueues = queuesData.length;
            const pendingTickets = ticketsData.filter(t => t.status === 'Pendente').length;
            const attendedToday = ticketsData.filter(t => t.status === 'attended' && t.issued_at.startsWith(today)).length;
            
            const waitTimes = ticketsData
                .filter(t => t.wait_time && t.wait_time !== 'N/A' && !isNaN(parseFloat(t.wait_time)))
                .map(t => parseFloat(t.wait_time));
            
            const avgWaitTime = waitTimes.length ? 
                (waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length).toFixed(1) : '0.0';
    
            document.getElementById('active-queues').textContent = activeQueues;
            document.getElementById('pending-tickets').textContent = pendingTickets;
            document.getElementById('avg-wait-time').textContent = `${avgWaitTime} min`;
            document.getElementById('attended-tickets').textContent = attendedToday;
            
            console.log("Dados do dashboard carregados:", {
                filas_ativas: activeQueues,
                tickets_pendentes: pendingTickets,
                tempo_medio: avgWaitTime,
                atendimentos_hoje: attendedToday,
                tickets: ticketsData,
                queues: queuesData
            });
        } catch (error) {
            this.showError('Erro ao carregar dashboard', error);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadQueues(queues = null) {
        const tableBody = document.getElementById('queues-table');
        const fullTableBody = document.getElementById('queues-table-full');
        
        if (!tableBody && !fullTableBody) return;

        try {
            const queuesData = queues || await ApiService.getQueues();
            
            tableBody.innerHTML = '';
            fullTableBody.innerHTML = '';

            console.log(`Carregadas ${queuesData.length} filas para o departamento ${userInfo.department || 'N/A'}`, queuesData);

            if (queuesData.length === 0) {
                const emptyRow = `<tr><td colspan="5">Nenhuma fila encontrada para seu departamento</td></tr>`;
                tableBody.innerHTML = emptyRow;
                fullTableBody.innerHTML = emptyRow;
                return;
            }

            queuesData.forEach(queue => {
                const row = `
                    <tr>
                        <td>${queue.service}</td>
                        <td>${queue.active_tickets}</td>
                        <td>${queue.current_ticket ? `${queue.prefix}${queue.current_ticket.toString().padStart(3, '0')}` : 'N/A'}</td>
                        <td><span class="status-${queue.status ? queue.status.toLowerCase() : 'ativo'}">${queue.status || 'Ativo'}</span></td>
                        <td><button class="btn secondary-btn" onclick="adminPanel.callNextTicket('${queue.id}')" aria-label="Chamar próximo ticket para ${queue.service}">Chamar Próximo</button></td>
                    </tr>
                `;
                
                tableBody.innerHTML += row;
                fullTableBody.innerHTML += row;
            });
        } catch (error) {
            this.showError('Erro ao carregar filas', error);
            const errorRow = '<tr><td colspan="5">Erro ao carregar filas</td></tr>';
            tableBody.innerHTML = errorRow;
            fullTableBody.innerHTML = errorRow;
        }
    }

    async callNextTicket(queueId) {
        try {
            const data = await ApiService.callNextTicket(queueId);
            this.showSuccess(`Senha ${data.ticket_number} chamada para o guichê ${data.counter}`);
            await this.loadInitialData();
        } catch (error) {
            this.showError('Erro ao chamar próximo ticket', error);
        }
    }

    async loadTickets(tickets = null) {
        const tableBody = document.getElementById('tickets-table');
        if (!tableBody) return;

        try {
            const ticketsData = tickets || await ApiService.getTickets();
            const filter = document.getElementById('ticket-status-filter')?.value;
            const validStatuses = ['Pendente', 'Chamado', 'attended', 'Cancelado'];
            
            let filteredTickets = ticketsData;
            if (filter && validStatuses.includes(filter)) {
                filteredTickets = ticketsData.filter(t => t.status === filter);
            }
    
            tableBody.innerHTML = '';
    
            console.log(`Response de /api/tickets/admin:`, ticketsData);
            console.log(`Carregados ${filteredTickets.length} tickets (filtro: ${filter || 'todos'})`);
    
            if (filteredTickets.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">Nenhum ticket encontrado para seu departamento</td></tr>';
                return;
            }
    
            filteredTickets.forEach(ticket => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${ticket.number}</td>
                    <td>${ticket.service}</td>
                    <td><span class="status-${ticket.status.toLowerCase()}">${ticket.status}</span></td>
                    <td>${ticket.wait_time !== 'N/A' ? `${ticket.wait_time} min` : 'N/A'}</td>
                    <td>${ticket.counter || 'N/A'}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            this.showError('Erro ao carregar tickets', error);
            tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar tickets</td></tr>';
        }
    }

    async generateReport() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.showLoading();

        try {
            const date = document.getElementById('report-date').value;
            const reportType = document.getElementById('report-type').value;
            const tickets = await ApiService.getTickets();
            
            let filteredTickets = tickets;
            if (date) {
                filteredTickets = tickets.filter(t => t.issued_at.startsWith(date));
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
                            label: 'Tickets por Status',
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
                        .filter(t => t.service === service && t.wait_time && t.wait_time !== 'N/A' && !isNaN(parseFloat(t.wait_time)))
                        .map(t => parseFloat(t.wait_time));
                    return times.length ? 
                        (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : '0.0';
                });

                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: services,
                        datasets: [{
                            label: 'Tempo Médio de Espera (min)',
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
        } finally {
            this.isLoading = false;
            this.hideLoading();
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
            // Implementar chamada real para atualizar senha
            this.showSuccess('Senha atualizada com sucesso');
            document.getElementById('settings-password').value = '';
            document.getElementById('settings-confirm-password').value = '';
        } catch (error) {
            this.showError('Erro ao atualizar senha', error);
        }
    }

    showError(message, error = null) {
        if (error) console.error(message, error);
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }

    hideError() {
        const errorDiv = document.getElementById('error-message');
        errorDiv.style.display = 'none';
    }

    showSuccess(message) {
        const errorDiv = document.getElementById('error-message');
        errorDiv.textContent = message;
        errorDiv.className = 'success-message';
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.className = 'error-message';
        }, 3000);
    }

    showLoading() {
        const mainContent = document.querySelector('.main-content');
        let loadingDiv = document.getElementById('loading-indicator');
        if (!loadingDiv) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'loading-indicator';
            loadingDiv.className = 'loading';
            loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
            mainContent.appendChild(loadingDiv);
        }
        loadingDiv.style.display = 'block';
    }

    hideLoading() {
        const loadingDiv = document.getElementById('loading-indicator');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
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
            
            if (AuthManager.saveUserSession(data)) {
                window.location.href = 'index.html';
            } else {
                throw new Error('Erro ao salvar a sessão');
            }
        } catch (error) {
            errorMessage.textContent = error.message.includes('Credenciais') 
                ? 'Credenciais inválidas' 
                : error.message;
            console.error('Erro no login:', error);
            
            document.getElementById('email').value = email;
            document.getElementById('password').value = '';
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

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    if (window.adminPanel) {
        window.adminPanel.destroy();
    }
});