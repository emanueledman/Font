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

        console.log(`[ApiService] Enviando requisição para: ${API_BASE_URL}${endpoint}`, {
            method,
            headers: { ...headers, Authorization: token ? '[PROTECTED]' : undefined },
            body
        });

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                console.warn(`[ApiService] Erro 401 na requisição ${endpoint}. Token pode estar inválido.`);
                throw new Error(`Sessão expirada na requisição ${endpoint}`);
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[ApiService] Erro ${response.status} na requisição ${endpoint}: ${errorText}`);
                throw new Error(errorText || response.statusText);
            }
            
            const data = await response.json();
            console.log(`[ApiService] Resposta recebida de ${endpoint}:`, data);
            return data;
        } catch (error) {
            console.error(`[ApiService] Erro na requisição ${endpoint}:`, error);
            throw error;
        }
    }

    static async login(email, password) {
        console.log('[ApiService] Tentando login com:', { email });
        return await this.request('/api/admin/login', 'POST', { email, password });
    }

    static async getQueues() {
        console.log('[ApiService] Buscando filas');
        return await this.request('/api/queues');
    }

    static async getTickets() {
        console.log('[ApiService] Buscando tickets');
        return await this.request('/api/tickets/admin');
    }

    static async callNextTicket(service) {
        console.log(`[ApiService] Chamando próximo ticket para serviço: ${service}`);
        return await this.request(`/api/queue/${service}/call`, 'POST');
    }
}

// Classe para gerenciamento da autenticação
class AuthManager {
    static saveUserSession(data) {
        console.log('[AuthManager] Resposta recebida do login:', data);
        
        const userId = data.user_id || data.id;
        const departmentId = data.department_id || data.department;
        
        if (!data.token || !userId) {
            console.error('[AuthManager] Dados obrigatórios faltando:', { token: data.token, userId });
            return false;
        }
        
        token = data.token;
        if (token.startsWith('Bearer ')) {
            token = token.substring(7);
        }
        
        const sessionData = {
            user_id: userId,
            user_role: data.user_role || 'unknown',
            department_id: departmentId || null,
            email: data.email || 'unknown'
        };
        
        localStorage.setItem('token', token);
        localStorage.setItem('userInfo', JSON.stringify(sessionData));
        userInfo = sessionData;
        console.log('[AuthManager] Sessão salva com sucesso:', userInfo);
        
        return true;
    }

    static isAuthenticated() {
        const isValid = !!token && !!userInfo.user_id;
        console.log('[AuthManager] Verificando autenticação:', { isValid, token: !!token, userInfo });
        return isValid;
    }

    static logout(reason = '') {
        console.log('[AuthManager] Executando logout', { reason });
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        token = null;
        userInfo = {};
        const redirectUrl = reason ? `login.html?reason=${encodeURIComponent(reason)}` : 'login.html';
        window.location.href = redirectUrl;
    }

    static redirectIfNotAuthenticated() {
        if (!this.isAuthenticated()) {
            console.warn('[AuthManager] Usuário não autenticado, redirecionando para login');
            this.logout('not_authenticated');
            return false;
        }
        console.log('[AuthManager] Usuário autenticado, prosseguindo');
        return true;
    }
}

// Classe para o painel de administração
class AdminPanel {
    constructor() {
        console.log('[AdminPanel] Inicializando');
        if (!AuthManager.redirectIfNotAuthenticated()) return;
        
        this.isLoading = false;
        this.initComponents();
        this.attachEventListeners();
        this.loadInitialData();
        this.intervalId = this.updateDateTime();
    }

    initComponents() {
        console.log('[AdminPanel] Inicializando componentes');
        document.getElementById('user-name').textContent = userInfo.email || 'Usuário';
        document.getElementById('user-department').textContent = userInfo.department_id ? 'Carregando departamento...' : 'Sem Departamento';
        document.getElementById('page-title').textContent = 'Dashboard';
        document.getElementById('settings-email').value = userInfo.email || '';
        
        if (userInfo.department_id) {
            this.loadDepartmentName();
        }

        const mainContent = document.querySelector('.main-content');
        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.className = 'error-message';
        errorDiv.style.display = 'none';
        mainContent.insertBefore(errorDiv, mainContent.firstChild);
    }

    async loadDepartmentName() {
        try {
            console.log('[AdminPanel] Carregando nome do departamento para department_id:', userInfo.department_id);
            const queuesData = await ApiService.getQueues();
            const department = queuesData
                .flatMap(inst => inst.queues || [])
                .find(q => q.department_id === userInfo.department_id);
            const departmentName = department?.department || 'Sem Departamento';
            document.getElementById('user-department').textContent = departmentName;
            console.log('[AdminPanel] Nome do departamento carregado:', departmentName);
        } catch (error) {
            console.error('[AdminPanel] Erro ao carregar nome do departamento:', error);
            document.getElementById('user-department').textContent = 'Erro ao carregar';
            this.showError('Erro ao carregar nome do departamento', error);
        }
    }

    attachEventListeners() {
        console.log('[AdminPanel] Anexando event listeners');
        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                if (sectionId) {
                    console.log('[AdminPanel] Navegando para seção:', sectionId);
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

        document.getElementById('logout').addEventListener('click', () => {
            console.log('[AdminPanel] Botão de logout clicado');
            AuthManager.logout('user_initiated');
        });

        document.getElementById('ticket-status-filter')?.addEventListener('change', () => {
            console.log('[AdminPanel] Filtro de tickets alterado');
            this.loadTickets();
        });

        document.getElementById('report-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('[AdminPanel] Formulário de relatório enviado');
            this.generateReport();
        });

        document.getElementById('settings-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('[AdminPanel] Formulário de configurações enviado');
            this.updateSettings();
        });

        document.querySelectorAll('.sidebar nav a').forEach(link => {
            link.addEventListener('click', () => {
                console.log('[AdminPanel] Limpando mensagens de erro ao mudar de aba');
                this.hideError();
            });
        });
    }

    updateDateTime() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const update = () => {
            const now = new Date();
            document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
            console.log('[AdminPanel] Data e hora atualizadas:', now);
        };
        update();
        return setInterval(update, 60000);
    }

    destroy() {
        console.log('[AdminPanel] Destruindo');
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        if (chartInstance) {
            chartInstance.destroy();
        }
    }

    async loadInitialData() {
        if (this.isLoading) {
            console.log('[AdminPanel] Carregamento inicial já em andamento');
            return;
        }
        this.isLoading = true;
        this.showLoading();

        try {
            console.log('[AdminPanel] Carregando dados iniciais');
            let queues = [];
            let tickets = [];

            try {
                queues = await ApiService.getQueues();
                console.log('[AdminPanel] Filas recebidas:', queues);
            } catch (error) {
                console.error('[AdminPanel] Erro ao carregar filas:', error);
                this.showError('Erro ao carregar filas', error);
            }

            try {
                tickets = await ApiService.getTickets();
                console.log('[AdminPanel] Tickets recebidos:', tickets);
            } catch (error) {
                console.error('[AdminPanel] Erro ao carregar tickets:', error);
                this.showError('Erro ao carregar tickets', error);
            }

            const queuesData = Array.isArray(queues) ? queues.flatMap(inst => inst.queues || []) : [];
            console.log('[AdminPanel] Filas processadas:', queuesData);

            await Promise.all([
                this.loadDashboard(queuesData, tickets),
                this.loadQueues(queuesData),
                this.loadTickets(tickets)
            ]);

            console.log('[AdminPanel] Dados iniciais carregados com sucesso');
        } catch (error) {
            console.error('[AdminPanel] Erro geral ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados iniciais. Tente novamente.', error);
            if (error.message.includes('Sessão expirada')) {
                setTimeout(() => {
                    AuthManager.logout('session_expired');
                }, 3000);
            }
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadDashboard(queues = [], tickets = []) {
        if (this.isLoading) {
            console.log('[AdminPanel] Dashboard já está sendo carregado');
            return;
        }
        this.isLoading = true;
        this.showLoading();

        try {
            console.log('[AdminPanel] Carregando dashboard');
            let queuesData = queues;
            let ticketsData = tickets;

            if (!queuesData.length || !ticketsData.length) {
                try {
                    const [queuesResponse, ticketsResponse] = await Promise.all([
                        ApiService.getQueues().catch(() => []),
                        ApiService.getTickets().catch(() => [])
                    ]);
                    queuesData = Array.isArray(queuesResponse) ? queuesResponse.flatMap(inst => inst.queues || []) : [];
                    ticketsData = Array.isArray(ticketsResponse) ? ticketsResponse : [];
                    console.log('[AdminPanel] Filas recebidas no dashboard:', queuesData);
                    console.log('[AdminPanel] Tickets recebidos no dashboard:', ticketsData);
                } catch (error) {
                    console.error('[AdminPanel] Erro ao buscar dados para dashboard:', error);
                    queuesData = [];
                    ticketsData = [];
                }
            }
            
            const today = new Date().toISOString().split('T')[0];
    
            const activeQueues = queuesData.length;
            const pendingTickets = ticketsData.filter(t => t.status === 'Pendente').length;
            const attendedToday = ticketsData.filter(t => t.status === 'attended' && (t.issued_at || '').startsWith(today)).length;
            
            const waitTimes = ticketsData
                .filter(t => t.wait_time && t.wait_time !== 'N/A' && !isNaN(parseFloat(t.wait_time)))
                .map(t => parseFloat(t.wait_time));
            
            const avgWaitTime = waitTimes.length ? 
                (waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length).toFixed(1) : '0.0';
    
            document.getElementById('active-queues').textContent = activeQueues;
            document.getElementById('pending-tickets').textContent = pendingTickets;
            document.getElementById('avg-wait-time').textContent = `${avgWaitTime} min`;
            document.getElementById('attended-tickets').textContent = attendedToday;
            
            console.log('[AdminPanel] Dados do dashboard carregados:', {
                filas_ativas: activeQueues,
                tickets_pendentes: pendingTickets,
                tempo_medio: avgWaitTime,
                atendimentos_hoje: attendedToday
            });
        } catch (error) {
            console.error('[AdminPanel] Erro ao carregar dashboard:', error);
            this.showError('Erro ao carregar dashboard. Verifique sua conexão.', error);
            if (error.message.includes('Sessão expirada')) {
                setTimeout(() => {
                    AuthManager.logout('session_expired');
                }, 3000);
            }
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadQueues(queues = []) {
        const tableBody = document.getElementById('queues-table');
        const fullTableBody = document.getElementById('queues-table-full');
        
        if (!tableBody && !fullTableBody) {
            console.warn('[AdminPanel] Tabelas de filas não encontradas');
            return;
        }

        try {
            console.log('[AdminPanel] Carregando filas');
            let queuesData = queues;
            if (!queuesData.length) {
                const queuesResponse = await ApiService.getQueues().catch(() => []);
                queuesData = Array.isArray(queuesResponse) ? queuesResponse.flatMap(inst => inst.queues || []) : [];
                console.log('[AdminPanel] Filas recebidas:', queuesData);
            }
            
            tableBody.innerHTML = '';
            fullTableBody.innerHTML = '';

            console.log(`[AdminPanel] Carregadas ${queuesData.length} filas`, queuesData);

            if (queuesData.length === 0) {
                const emptyRow = `<tr><td colspan="5">Nenhuma fila encontrada</td></tr>`;
                tableBody.innerHTML = emptyRow;
                fullTableBody.innerHTML = emptyRow;
                console.warn('[AdminPanel] Nenhuma fila encontrada após processamento');
                this.showError('Nenhuma fila disponível no momento.');
                return;
            }

            queuesData.forEach(queue => {
                const row = `
                    <tr>
                        <td>${queue.service || 'N/A'}</td>
                        <td>${queue.active_tickets || 0}</td>
                        <td>${queue.current_ticket ? `${queue.prefix || ''}${queue.current_ticket.toString().padStart(3, '0')}` : 'N/A'}</td>
                        <td><span class="status-${queue.status ? queue.status.toLowerCase() : 'ativo'}">${queue.status || 'Ativo'}</span></td>
                        <td><button class="btn secondary-btn" onclick="adminPanel.callNextTicket('${queue.service || ''}')" aria-label="Chamar próximo ticket">Chamar Próximo</button></td>
                    </tr>
                `;
                
                tableBody.innerHTML += row;
                fullTableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('[AdminPanel] Erro ao carregar filas:', error);
            this.showError('Erro ao carregar filas', error);
            tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar filas</td></tr>';
            fullTableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar filas</td></tr>';
            if (error.message.includes('Sessão expirada')) {
                setTimeout(() => {
                    AuthManager.logout('session_expired');
                }, 3000);
            }
        }
    }

    async callNextTicket(service) {
        if (!service) {
            console.warn('[AdminPanel] Serviço não especificado para chamar próximo ticket');
            this.showError('Serviço inválido');
            return;
        }
        try {
            console.log('[AdminPanel] Chamando próximo ticket para', service);
            const data = await ApiService.callNextTicket(service);
            this.showSuccess(`Senha ${data.ticket_number || 'N/A'} chamada para o guichê ${data.counter || 'N/A'}`);
            await this.loadInitialData();
        } catch (error) {
            console.error('[AdminPanel] Erro ao chamar próximo ticket:', error);
            this.showError('Erro ao chamar próximo ticket', error);
            if (error.message.includes('Sessão expirada')) {
                setTimeout(() => {
                    AuthManager.logout('session_expired');
                }, 3000);
            }
        }
    }

    async loadTickets(tickets = []) {
        const tableBody = document.getElementById('tickets-table');
        if (!tableBody) {
            console.warn('[AdminPanel] Tabela de tickets não encontrada');
            return;
        }

        try {
            console.log('[AdminPanel] Carregando tickets');
            const ticketsData = tickets.length ? tickets : await ApiService.getTickets();
            const filter = document.getElementById('ticket-status-filter')?.value;
            const validStatuses = ['Pendente', 'Chamado', 'attended', 'Cancelado'];
            
            let filteredTickets = ticketsData;
            if (filter && validStatuses.includes(filter)) {
                filteredTickets = ticketsData.filter(t => t.status === filter);
            }
    
            tableBody.innerHTML = '';
    
            console.log(`[AdminPanel] Carregados ${filteredTickets.length} tickets (filtro: ${filter || 'todos'})`, filteredTickets);
    
            if (filteredTickets.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5">Nenhum ticket encontrado</td></tr>';
                return;
            }
    
            filteredTickets.forEach(ticket => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${ticket.number || 'N/A'}</td>
                    <td>${ticket.service || 'N/A'}</td>
                    <td><span class="status-${ticket.status ? ticket.status.toLowerCase() : 'desconhecido'}">${ticket.status || 'Desconhecido'}</span></td>
                    <td>${ticket.wait_time && ticket.wait_time !== 'N/A' ? `${ticket.wait_time} min` : 'N/A'}</td>
                    <td>${ticket.counter || 'N/A'}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('[AdminPanel] Erro ao carregar tickets:', error);
            this.showError('Erro ao carregar tickets', error);
            tableBody.innerHTML = '<tr><td colspan="5">Erro ao carregar tickets</td></tr>';
            if (error.message.includes('Sessão expirada')) {
                setTimeout(() => {
                    AuthManager.logout('session_expired');
                }, 3000);
            }
        }
    }

    async generateReport() {
        if (this.isLoading) {
            console.log('[AdminPanel] Relatório já está sendo gerado');
            return;
        }
        this.isLoading = true;
        this.showLoading();

        try {
            console.log('[AdminPanel] Gerando relatório');
            const date = document.getElementById('report-date').value;
            const reportType = document.getElementById('report-type').value;
            const tickets = await ApiService.getTickets();
            
            let filteredTickets = tickets;
            if (date) {
                filteredTickets = tickets.filter(t => (t.issued_at || '').startsWith(date));
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
                const services = [...new Set(filteredTickets.map(t => t.service || 'Desconhecido'))];
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
            console.log('[AdminPanel] Relatório gerado com sucesso');
        } catch (error) {
            console.error('[AdminPanel] Erro ao gerar relatório:', error);
            this.showError('Erro ao gerar relatório', error);
            if (error.message.includes('Sessão expirada')) {
                setTimeout(() => {
                    AuthManager.logout('session_expired');
                }, 3000);
            }
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async updateSettings() {
        console.log('[AdminPanel] Atualizando configurações');
        const password = document.getElementById('settings-password').value.trim();
        const confirmPassword = document.getElementById('settings-confirm-password').value.trim();
        
        if (!password) {
            console.warn('[AdminPanel] Senha vazia detectada');
            this.showError('As senhas não podem estar vazias');
            return;
        }
        
        if (password !== confirmPassword) {
            console.warn('[AdminPanel] Senhas não coincidem');
            this.showError('As senhas não coincidem');
            return;
        }
        
        try {
            await ApiService.request('/api/update_password', 'POST', { password });
            this.showSuccess('Senha atualizada com sucesso');
            document.getElementById('settings-password').value = '';
            document.getElementById('settings-confirm-password').value = '';
            console.log('[AdminPanel] Senha atualizada com sucesso');
        } catch (error) {
            console.error('[AdminPanel] Erro ao atualizar senha:', error);
            this.showError('Erro ao atualizar senha', error);
        }
    }

    showError(message, error = null) {
        if (error) console.error('[AdminPanel] Erro:', message, error);
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
            console.log('[LoginManager] Inicializando');
            form.addEventListener('submit', (e) => this.handleLogin(e));
            
            const urlParams = new URLSearchParams(window.location.search);
            const reason = urlParams.get('reason');
            if (reason === 'session_expired') {
                const errorMessage = document.getElementById('error-message');
                errorMessage.textContent = 'Sua sessão expirou. Faça login novamente.';
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 5000);
            } else if (reason === 'not_authenticated') {
                const errorMessage = document.getElementById('error-message');
                errorMessage.textContent = 'Você precisa estar autenticado para acessar o painel.';
                errorMessage.style.display = 'block';
                setTimeout(() => {
                    errorMessage.style.display = 'none';
                }, 5000);
            }
        } else {
            console.error('[LoginManager] Formulário de login não encontrado');
        }
    }

    static async handleLogin(event) {
        event.preventDefault();
        console.log('[LoginManager] Tentativa de login iniciada');
        const form = event.target;
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorMessage = document.getElementById('error-message');
        const submitBtn = form.querySelector('button[type="submit"]');

        errorMessage.textContent = '';
        errorMessage.style.display = 'none';
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
                console.log('[LoginManager] Login bem-sucedido, redirecionando para index.html');
                window.location.href = 'index.html';
            } else {
                console.error('[LoginManager] Falha ao salvar sessão:', data);
                throw new Error('Erro ao salvar a sessão. Verifique os dados retornados.');
            }
        } catch (error) {
            console.error('[LoginManager] Erro no login:', error);
            errorMessage.textContent = error.message.includes('Credenciais') 
                ? 'Credenciais inválidas' 
                : error.message;
            errorMessage.style.display = 'block';
            
            document.getElementById('email').value = email;
            document.getElementById('password').value = '';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Entrar';
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();
    console.log('[Main] Página carregada:', currentPage);
    
    if (currentPage === 'login.html') {
        LoginManager.init();
    } else {
        window.adminPanel = new AdminPanel();
    }
});

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    if (window.adminPanel) {
        console.log('[Main] Limpando AdminPanel antes de sair');
        window.adminPanel.destroy();
    }
});