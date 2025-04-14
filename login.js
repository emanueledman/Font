const API_BASE = 'https://fila-facilita2-0.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await axios.post(`${API_BASE}/api/admin/login`, { email, password });
            const { token, user_role, queues, departments, managers } = response.data;

            if (!token || !user_role) {
                throw new Error('Resposta inválida do servidor');
            }

            localStorage.setItem('adminToken', token);
            console.log('Token armazenado:', token);
            console.log('User role:', user_role);

            // Redirecionar com base no papel
            switch (user_role) {
                case 'inst_admin':
                    localStorage.setItem('departments', JSON.stringify(departments || []));
                    localStorage.setItem('managers', JSON.stringify(managers || []));
                    window.location.href = '/institution-admin.html';
                    break;
                case 'dept_admin':
                    localStorage.setItem('queues', JSON.stringify(queues || []));
                    window.location.href = '/department-admin.html';
                    break;
                default:
                    throw new Error('Papel de usuário não suportado');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            document.getElementById('error-message').textContent =
                error.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.';
            document.getElementById('error-message').classList.remove('hidden');
        }
    });
});