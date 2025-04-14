// Configuração da URL base da API
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';

// Função para fazer requisições à API com tratamento de erros
async function apiRequest(config, retries = 3) {
    console.log('Iniciando requisição:', config);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Adicionar token no header se estiver disponível
            const token = localStorage.getItem('token');
            if (token) {
                config.headers = { ...config.headers, Authorization: token };
            }
            
            // Fazer requisição usando Axios
            const response = await axios({
                ...config,
                baseURL: API_BASE_URL,
                timeout: 10000, // 10 segundos
            });
            
            console.log('Resposta recebida:', response.data);
            return response.data;
        } catch (error) {
            console.error(`Erro na tentativa ${attempt}:`, error);
            
            // Se for a última tentativa, lançar erro
            if (attempt === retries) {
                const errorMessage = error.code === 'ECONNABORTED'
                    ? 'Tempo limite excedido. O servidor não respondeu.'
                    : error.response
                    ? error.response.data?.error || `Erro ${error.response.status}`
                    : 'Erro de conexão com o servidor.';
                
                throw new Error(errorMessage);
            }
            
            // Esperar antes de tentar novamente (backoff exponencial)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

// Verificar se o usuário já está logado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se existe token e userInfo no localStorage
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('userInfo');
    
    if (token && userInfo) {
        const user = JSON.parse(userInfo);
        // Verificar se o usuário é administrador de departamento ou instituição
        if (user.user_role === 'dept_admin' || user.user_role === 'inst_admin') {
            // Redirecionar para página de boas-vindas
            window.location.href = 'welcome.html';
            return;
        }
    }
    
    // Configurar o formulário de login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Função para lidar com o login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('login-error');
    
    // Validação básica
    if (!email || !password) {
        showError(errorMessage, 'Por favor, preencha todos os campos.');
        return;
    }
    
    try {
        // Limpar mensagem de erro anterior
        hideError(errorMessage);
        
        // Fazer requisição de login
        const response = await apiRequest({
            method: 'POST',
            url: '/api/admin/login',
            data: {
                email,
                password
            }
        });
        
        // Verificar se o usuário é administrador de departamento ou instituição
        if (response.user_role !== 'dept_admin' && response.user_role !== 'inst_admin') {
            showError(errorMessage, 'Acesso permitido apenas para administradores.');
            return;
        }
        
        // Salvar informações do usuário e token
        localStorage.setItem('token', response.token);
        localStorage.setItem('userInfo', JSON.stringify({
            id: response.user_id,
            email: response.email,
            name: response.name || email.split('@')[0],
            user_role: response.user_role,
            institution_id: response.institution_id,
            department_id: response.department_id,
            department: response.department
        }));
        
        // Redirecionar para página de boas-vindas
        window.location.href = 'welcome.html';
        
    } catch (error) {
        showError(errorMessage, error.message || 'Erro ao fazer login. Tente novamente.');
    }
}

// Função para exibir mensagem de erro
function showError(element, message) {
    element.textContent = message;
    element.classList.add('active');
}

// Função para esconder mensagem de erro
function hideError(element) {
    element.textContent = '';
    element.classList.remove('active');
}