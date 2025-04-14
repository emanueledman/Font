// Configuração da URL base da API
const API_BASE = 'https://fila-facilita2-0.onrender.com';

// Listener para o formulário de login
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            // Envia requisição de login
            const response = await axios.post(`${API_BASE}/api/admin/login`, { email, password });
            
            // Armazena o token no localStorage
            localStorage.setItem('adminToken', response.data.token);
            const userRole = response.data.user_role;

            // Redireciona com base no user_role
            switch (userRole) {
                case 'inst_admin':
                    window.location.href = '/institution-admin.html';
                    break;
                case 'dept_admin':
                    window.location.href = '/department-admin.html';
                    break;
                default:
                    throw new Error('Papel de usuário não suportado');
            }
        } catch (error) {
            // Exibe mensagem de erro genérica
            document.getElementById('error-message').textContent = 'Erro ao fazer login. Verifique suas credenciais.';
            document.getElementById('error-message').classList.remove('hidden');
        }
    });
});