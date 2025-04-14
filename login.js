const API_BASE = 'https://fila-facilita2-0.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await axios.post(`${API_BASE}/api/admin/login`, { email, password });
            localStorage.setItem('adminToken', response.data.token);
            window.location.href = '/admin.html';
        } catch (error) {
            document.getElementById('error-message').textContent = error.response?.data?.error || 'Erro ao fazer login.';
            document.getElementById('error-message').classList.remove('hidden');
        }
    });
});