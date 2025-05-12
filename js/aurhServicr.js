// API Base URL
const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Serviço de Autenticação Unificado
class AuthService {
    constructor() {
        this.user = null;
        this.setupAxiosInterceptors();
    }

    // Configurar interceptadores do Axios
    setupAxiosInterceptors() {
        axios.interceptors.request.use(
            (config) => {
                const token = this.getToken();
                if (token) {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Interceptor para erros de autenticação
        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    this.clearAuthData();
                    window.location.href = '/index.html?expired=true';
                }
                return Promise.reject(error);
            }
        );
    }

    // Sanitizar entradas para prevenir XSS
    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // Obter token de autenticação
    getToken() {
        return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    }

    // Verificar se o usuário está autenticado
    isAuthenticated() {
        const token = this.getToken();
        const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        return !!token && !!userRole;
    }

    // Armazenar dados de autenticação
    storeAuthData(data, rememberMe) {
        const storage = rememberMe ? localStorage : sessionStorage;
        
        // Limpar dados existentes para evitar conflitos
        this.clearAuthData();
        
        // Armazenar novos dados
        storage.setItem('adminToken', data.token);
        storage.setItem('userRole', data.user_role);
        
        if (data.email) storage.setItem('email', data.email);
        if (data.branch_id) storage.setItem('branchId', data.branch_id);
        if (data.branch_name) storage.setItem('branchName', data.branch_name);
        if (data.queues) storage.setItem('queues', JSON.stringify(data.queues));
    }

    // Obter informações do usuário
    getUserInfo() {
        return {
            email: localStorage.getItem('email') || sessionStorage.getItem('email'),
            role: localStorage.getItem('userRole') || sessionStorage.getItem('userRole'),
            branchId: localStorage.getItem('branchId') || sessionStorage.getItem('branchId'),
            branchName: localStorage.getItem('branchName') || sessionStorage.getItem('branchName')
        };
    }

    // Definir informações do usuário na interface
    setUserInfoUI() {
        const info = this.getUserInfo();
        const name = info.email ? info.email.split('@')[0] : 'Usuário';
        
        if (document.getElementById('user-name')) {
            document.getElementById('user-name').textContent = name;
        }
        
        if (document.getElementById('user-email') && info.email) {
            document.getElementById('user-email').textContent = info.email;
        }
    }

    // Limpar dados de autenticação
    clearAuthData() {
        const keys = ['adminToken', 'userRole', 'email', 'branchId', 'branchName', 'queues'];
        keys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    // Realizar login
    async login(email, password, rememberMe = false) {
        try {
            const sanitizedEmail = this.sanitizeInput(email.trim());
            
            const response = await axios.post(
                `${API_BASE}/api/admin/login`,
                { email: sanitizedEmail, password },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );
            
            const data = response.data;
            this.storeAuthData(data, rememberMe);
            
            return {
                success: true,
                userRole: data.user_role
            };
        } catch (error) {
            console.error('Erro de login:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.'
            };
        }
    }

    // Realizar logout
    async logout() {
        try {
            await axios.post(`${API_BASE}/api/auth/logout`);
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            this.clearAuthData();
            window.location.href = '/index.html';
        }
    }

    // Redirecionar com base na função
    redirectBasedOnRole() {
        const role = (localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || '').toLowerCase();
        
        switch (role) {
            case 'attendant':
                window.location.href = '/attendant.html';
                break;
            case 'branch_admin':
                window.location.href = '/branch-admin.html';
                break;
            case 'inst_admin':
                window.location.href = '/institution-admin.html';
                break;
            case 'sys_admin':
                window.location.href = '/system-admin.html';
                break;
            default:
                window.location.href = '/index.html';
        }
    }

    // Verificar autenticação e redirecionar se necessário
    checkAuthAndRedirect() {
        if (!this.isAuthenticated()) {
            window.location.href = '/index.html';
            return false;
        }
        return true;
    }
}

// Exportar instância única do serviço de autenticação
const authService = new AuthService();