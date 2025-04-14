// Configuração da URL base da API
const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';

// Verificar autenticação e carregar dados do usuário
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se existe token e userInfo no localStorage
    const token = localStorage.getItem('token');
    const userInfoStr = localStorage.getItem('userInfo');
    
    if (!token || !userInfoStr) {
        // Redirecionar para página de login se não estiver autenticado
        window.location.href = 'index.html';
        return;
    }
    
    const userInfo = JSON.parse(userInfoStr);
    
    // Verificar se o usuário é administrador de departamento ou instituição
    if (userInfo.user_role !== 'dept_admin' && userInfo.user_role !== 'inst_admin') {
        // Redirecionar para página de login se não for um administrador
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = 'index.html';
        return;
    }
    
    // Preencher dados do usuário na interface
    displayUserInfo(userInfo);
    
    // Configurar botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Exibir data atual
    displayCurrentDate();
});

// Exibir informações do usuário na interface
function displayUserInfo(userInfo) {
    // Preencher nome e inicial do usuário
    const userName = userInfo.name || userInfo.email.split('@')[0];
    
    // Avatar com inicial
    const userInitial = document.getElementById('user-initial');
    if (userInitial) {
        userInitial.textContent = userName.charAt(0).toUpperCase();
    }
    
    // Nome do usuário
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) {
        userNameElement.textContent = userName;
    }
    
    // Tipo de administrador
    const userRole = document.getElementById('user-role');
    if (userRole) {
        userRole.textContent = userInfo.user_role === 'dept_admin' 
            ? 'Administrador de Departamento' 
            : 'Administrador de Instituição';
    }
    
    // Nome na mensagem de boas-vindas
    const welcomeName = document.getElementById('welcome-name');
    if (welcomeName) {
        welcomeName.textContent = userName;
    }
    
    // Tipo de administração
    const adminType = document.getElementById('admin-type');
    if (adminType) {
        if (userInfo.user_role === 'dept_admin') {
            adminType.textContent = userInfo.department || 'Departamento';
        } else {
            adminType.textContent = 'Instituição';
        }
    }
}

// Exibir data atual
function displayCurrentDate() {
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const today = new Date();
        currentDateElement.textContent = today.toLocaleDateString('pt-BR', options);
    }
}

// Função para fazer logout
function handleLogout() {
    // Remover dados do usuário do localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    
    // Redirecionar para página de login
    window.location.href = 'index.html';
}