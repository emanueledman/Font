// Configurações globais
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token') || '';
let userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
let chartInstance = null;

// Classe ApiService com tratamento completo de erros
class ApiService {
    static async request(endpoint, method = 'GET', body = null, retry = true) {
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });

        if (token) {
            headers.append('Authorization', `Bearer ${token}`);
        }

        const config = {
            method,
            headers,
            mode: 'cors',
            credentials: 'include'
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            // Timeout de 15 segundos
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            config.signal = controller.signal;

            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            clearTimeout(timeoutId);

            // Tratamento de token expirado
            if (response.status === 401 && retry) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    return this.request(endpoint, method, body, false);
                }
                throw new Error('Sessão expirada');
            }

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Erro na requisição');
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw this.normalizeError(error);
        }
    }

    static normalizeError(error) {
        if (error.name === 'AbortError') {
            return new Error('Tempo de requisição excedido');
        }
        if (error.message.includes('Failed to fetch')) {
            return new Error('Não foi possível conectar ao servidor');
        }
        return error;
    }

    // Métodos específicos do seu sistema
    static async login(email, password) {
        const response = await this.request('/api/admin/login', 'POST', { email, password });
        
        if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
        }
        
        return response;
    }

    static async getQueues() {
        const queues = await this.request('/api/admin/queues');
        return queues.filter(q => 
            q.department === userInfo.department && 
            q.institution_id === userInfo.institution_id
        );
    }

    static async getTickets() {
        const tickets = await this.request('/api/tickets/admin');
        return tickets.filter(t => 
            t.department === userInfo.department && 
            t.institution_id === userInfo.institution_id
        );
    }

    static async callNextTicket(queueId) {
        return await this.request(`/api/admin/queue/${queueId}/call`, 'POST');
    }

    static async refreshToken() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return false;
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                token = data.token;
                localStorage.setItem('token', token);
                return true;
            }
        } catch (error) {
            console.error('Erro ao renovar token:', error);
        }
        return false;
    }
}

// Classe AuthManager
class AuthManager {
    static saveUserSession(data) {
        if (!data || !data.token) return;
        
        token = data.token;
        userInfo = {
            user_id: data.user_id,
            email: data.email,
            institution_id: data.institution_id,
            department: data.department
        };

        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        localStorage.setItem('login_time', Date.now());
    }

    static isAuthenticated() {
        const loginTime = localStorage.getItem('login_time');
        if (loginTime && (Date.now() - parseInt(loginTime) > 3600000)) {
            this.logout();
            return false;
        }
        return !!token && !!userInfo.user_id;
    }

    static logout() {
        token = '';
        userInfo = {};
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('login_time');
        window.location.href = 'login.html';
    }
}

// Classe AdminPanel (com todas suas funcionalidades)
class AdminPanel {
    constructor() {
        if (!AuthManager.isAuthenticated()) {
            AuthManager.logout();
            return;
        }

        this.initUI();
        this.setupEventListeners();
        this.loadInitialData();
        this.setupConnectionMonitor();
    }

    initUI() {
        document.getElementById('user-name').textContent = userInfo.email;
        document.getElementById('user-department').textContent = userInfo.department || 'Gestor';
        
        // Atualiza data/hora
        const updateTime = () => {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('current-date').textContent = new Date().toLocaleDateString('pt-BR', options);
        };
        updateTime();
        setInterval(updateTime, 60000);
    }

    setupEventListeners() {
        // Navegação
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                if (sectionId) {
                    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                    document.getElementById(sectionId).classList.add('active');
                    document.querySelectorAll('.sidebar nav a').forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    document.getElementById('page-title').textContent = link.textContent;
                    
                    if (sectionId === 'dashboard-section') this.loadDashboard();
                    else if (sectionId === 'queues-section') this.loadQueues();
                    else if (sectionId === 'tickets-section') this.loadTickets();
                }
            });
        });

        // Logout
        document.getElementById('logout').addEventListener('click', () => AuthManager.logout());

        // Filtro de tickets
        document.getElementById('ticket-status-filter')?.addEventListener('change', () => this.loadTickets());

        // Formulários
        document.getElementById('report-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.generateReport();
        });

        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateSettings();
        });
    }

    async loadInitialData() {
        try {
            this.showLoading(true);
            await Promise.all([
                this.loadDashboard(),
                this.loadQueues(),
                this.loadTickets()
            ]);
        } catch (error) {
            this.showError(`Erro ao carregar dados: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadDashboard() {
        try {
            const [queues, tickets] = await Promise.all([
                ApiService.getQueues(),
                ApiService.getTickets()
            ]);
            
            const today = new Date().toISOString().split('T')[0];
            const attendedToday = tickets.filter(t => 
                t.status === 'attended' && t.issued_at.startsWith(today)
            ).length;
            
            const waitTimes = tickets
                .filter(t => t.wait_time && t.wait_time !== 'N/A')
                .map(t => parseFloat(t.wait_time.split(' ')[0]) || 0);
            
            const avgWaitTime = waitTimes.length 
                ? (waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length).toFixed(1) 
                : 0;

            // Atualiza UI
            document.getElementById('active-queues').textContent = queues.length;
            document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
            document.getElementById('avg-wait-time').textContent = `${avgWaitTime} min`;
            document.getElementById('attended-tickets').textContent = attendedToday;
            
            // Renderiza filas no dashboard
            this.renderQueues(queues, 'queues-table');
        } catch (error) {
            throw new Error(`Dashboard: ${error.message}`);
        }
    }

    renderQueues(queues, elementId) {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        container.innerHTML = queues.map(queue => `
            <tr>
                <td>${queue.service}</td>
                <td>${queue.active_tickets}</td>
                <td>${queue.current_ticket ? `${queue.prefix}${queue.current_ticket.toString().padStart(3, '0')}` : 'N/A'}</td>
                <td><span class="status-${queue.status.toLowerCase()}">${queue.status}</span></td>
                <td><button class="btn secondary-btn" onclick="adminPanel.callNextTicket('${queue.id}')">Chamar Próximo</button></td>
            </tr>
        `).join('');
    }

    async callNextTicket(queueId) {
        try {
            this.showLoading(true);
            const result = await ApiService.callNextTicket(queueId);
            this.showSuccess(`Senha ${result.ticket_number} chamada!`);
            await Promise.all([this.loadDashboard(), this.loadQueues()]);
        } catch (error) {
            this.showError(`Erro ao chamar ticket: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    // [Mantidas todas as outras funções originais...]
}

// Classe LoginManager
class LoginManager {
    static init() {
        const form = document.getElementById('login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const errorElement = document.getElementById('error-message');
            const submitBtn = form.querySelector('button[type="submit"]');

            // Reset states
            errorElement.textContent = '';
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

            try {
                const authData = await ApiService.login(email, password);
                AuthManager.saveUserSession(authData);
                window.location.href = 'index.html';
            } catch (error) {
                errorElement.textContent = error.message.includes('Failed to fetch')
                    ? 'Erro de conexão com o servidor'
                    : error.message;
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Entrar';
            }
        });
    }
}

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', () => {
    // Atualiza variáveis globais
    token = localStorage.getItem('token');
    userInfo = JSON.parse(localStorage.getItem('userInfo') || {});
    
    // Roteamento
    if (window.location.pathname.includes('login.html')) {
        LoginManager.init();
    } else if (AuthManager.isAuthenticated()) {
        window.adminPanel = new AdminPanel();
    } else {
        AuthManager.logout();
    }
});