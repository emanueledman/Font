// API Base URL
const API_BASE = 'https://fila-facilita2-0-juqg.onrender.com';

// Serviço de Autenticação Unificado
class AuthService {
    constructor() {
        this.user = null;
        this.setupAxiosInterceptors();
        
        // Verificar token válido na inicialização
        this.validateTokenOnStart();
    }
    
    // Validar token salvo ao iniciar
    validateTokenOnStart() {
        try {
            const token = this.getToken();
            if (!token) return;
            
            // Verificar se o token tem formato válido
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                console.warn("Token inválido encontrado. Removendo...");
                this.clearAuthData();
            }
        } catch (error) {
            console.error("Erro ao validar token inicial:", error);
            this.clearAuthData();
        }
    }

    // Configurar interceptadores do Axios
    setupAxiosInterceptors() {
        axios.interceptors.request.use(
            (config) => {
                const token = this.getToken();
                if (token) {
                    // Garantir que só haja um "Bearer"
                    if (token.startsWith('Bearer ')) {
                        config.headers['Authorization'] = token;
                    } else {
                        config.headers['Authorization'] = `Bearer ${token}`;
                    }
                    
                    // Log para debug
                    console.debug("Enviando requisição com token:", 
                                  config.headers['Authorization'].substring(0, 20) + "...");
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Interceptor para erros de autenticação
        axios.interceptors.response.use(
            (response) => response,
            (error) => {
                console.error("Erro na resposta:", error.response?.status, error.message);
                
                if (error.response && error.response.status === 401) {
                    console.warn("Erro 401 - Redirecionando para login");
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

    // Obter token de autenticação (prioriza localStorage)
    getToken() {
        return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
    }

    // Verificar se o usuário está autenticado
    isAuthenticated() {
        const token = this.getToken();
        const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        
        if (token && userRole) {
            console.debug("Usuário autenticado com papel:", userRole);
            return true;
        }
        
        console.debug("Usuário não autenticado");
        return false;
    }

    // Armazenar dados de autenticação
    storeAuthData(data, rememberMe) {
        // Verificar dados mínimos necessários
        if (!data || !data.token) {
            console.error("Dados de autenticação inválidos:", data);
            return false;
        }
        
        const storage = rememberMe ? localStorage : sessionStorage;
        
        // Limpar dados existentes para evitar conflitos
        this.clearAuthData();
        
        try {
            // Armazenar novos dados
            storage.setItem('adminToken', data.token);
            storage.setItem('userRole', data.user_role);
            
            if (data.email) storage.setItem('email', data.email);
            if (data.branch_id) storage.setItem('branchId', data.branch_id);
            if (data.branch_name) storage.setItem('branchName', data.branch_name);
            if (data.queues) storage.setItem('queues', JSON.stringify(data.queues));
            
            console.info("Dados de autenticação armazenados com sucesso");
            console.debug("Token:", data.token.substring(0, 15) + "...");
            console.debug("Papel:", data.user_role);
            
            return true;
        } catch (error) {
            console.error("Erro ao armazenar dados de autenticação:", error);
            return false;
        }
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
        
        console.debug("Interface de usuário atualizada com sucesso");
    }

    // Limpar dados de autenticação
    clearAuthData() {
        const keys = ['adminToken', 'userRole', 'email', 'branchId', 'branchName', 'queues'];
        keys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        console.info("Dados de autenticação limpos");
    }

    // Realizar login
    async login(email, password, rememberMe = false) {
        try {
            const sanitizedEmail = this.sanitizeInput(email.trim());
            
            console.info(`Tentando login para ${sanitizedEmail}`);
            
            const response = await axios.post(
                `${API_BASE}/api/admin/login`,
                { email: sanitizedEmail, password },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000 // Aumentado para 15s
                }
            );
            
            console.debug("Resposta de login recebida:", response.status);
            
            const data = response.data;
            if (!data || !data.token) {
                console.error("Token não encontrado na resposta:", data);
                return {
                    success: false,
                    message: 'Erro no servidor: token não recebido'
                };
            }
            
            // Armazenar dados
            const stored = this.storeAuthData(data, rememberMe);
            if (!stored) {
                return {
                    success: false,
                    message: 'Erro ao armazenar credenciais no navegador'
                };
            }
            
            return {
                success: true,
                userRole: data.user_role
            };
        } catch (error) {
            console.error('Erro de login:', error);
            
            // Mensagem específica baseada no erro
            let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.';
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = 'Email ou senha incorretos. Tente novamente.';
                } else if (error.response.status === 403) {
                    errorMessage = 'Seu usuário não tem permissão para acessar o sistema.';
                } else if (error.response.status >= 500) {
                    errorMessage = 'Erro no servidor. Tente novamente mais tarde.';
                }
                
                // Usar mensagem do servidor se disponível
                if (error.response.data && error.response.data.error) {
                    errorMessage = error.response.data.error;
                }
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Tempo limite de conexão excedido. Verifique sua internet.';
            }
            
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    // Realizar logout
    async logout() {
        try {
            console.info("Iniciando logout...");
            
            try {
                await axios.post(`${API_BASE}/api/auth/logout`);
                console.debug("Logout no servidor concluído");
            } catch (error) {
                // Continue mesmo se o logout na API falhar
                console.warn("Erro ao fazer logout no servidor:", error.message);
            }
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            this.clearAuthData();
            console.info("Redirecionando para página de login");
            window.location.href = '/index.html';
        }
    }

    // Redirecionar com base na função
    redirectBasedOnRole() {
        const role = (localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || '').toLowerCase();
        
        console.info(`Redirecionando baseado no papel: ${role}`);
        
        switch (role) {
            case 'attendant':
                window.location.href = '/attendant.html';
                break;
            case 'branch_admin':
                window.location.href = '/branch-admin.html';
                break;
            case 'institution_admin':
            case 'inst_admin':
                window.location.href = '/institution-admin.html';
                break;
            case 'system_admin':
            case 'sys_admin':
                window.location.href = '/system-admin.html';
                break;
            default:
                console.warn(`Papel desconhecido: ${role}, redirecionando para login`);
                window.location.href = '/index.html';
        }
    }

    // Verificar autenticação e redirecionar se necessário
    checkAuthAndRedirect() {
        if (!this.isAuthenticated()) {
            console.warn("Usuário não autenticado, redirecionando para login");
            window.location.href = '/index.html';
            return false;
        }
        console.info("Verificação de autenticação: OK");
        return true;
    }
}

// Exportar instância única do serviço de autenticação
const authService = new AuthService();