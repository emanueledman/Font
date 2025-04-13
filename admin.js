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

