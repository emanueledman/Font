// Configurações e variáveis globais
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token');
let userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};

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

        // Reset states
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
            errorMessage.textContent = this.getErrorMessage(error);
            console.error('Erro no login:', error);
            
            // Mantém os valores dos campos em caso de erro
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Entrar';
        }
    }

    static getErrorMessage(error) {
        if (error.message.includes('Credenciais')) {
            return 'Credenciais inválidas';
        } else if (error.message.includes('Acesso restrito')) {
            return 'Acesso restrito a gestores';
        } else if (error.message.includes('Corpo da requisição')) {
            return 'Dados de login inválidos';
        } else if (error.message.includes('Email e senha')) {
            return error.message;
        } else {
            return 'Erro ao fazer login. Tente novamente.';
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('login.html')) {
        LoginManager.init();
    } else if (AuthManager.isAuthenticated()) {
        // Carrega o painel administrativo
    } else {
        window.location.href = 'login.html';
    }
});