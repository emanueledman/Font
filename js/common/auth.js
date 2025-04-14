// Log to confirm script is loaded
console.log('auth.js carregado');

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

async function handleLogin(event) {
    event.preventDefault();
    console.log('handleLogin chamado'); // Debug

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');
    const loginBtn = document.querySelector('#login-form button');

    errorDiv.style.display = 'none';
    loginBtn.disabled = true;

    try {
        console.log('Enviando requisição para /api/admin/login'); // Debug
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        console.log('Resposta recebida:', response.status); // Debug
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Falha no login');
        }

        const userInfo = {
            id: result.user_id,
            email: result.email,
            role: result.user_role,
            department_id: result.department_id,
            institution_id: result.institution_id
        };
        localStorage.setItem('token', result.token);
        localStorage.setItem('userInfo', JSON.stringify(userInfo));

        console.log('Login bem-sucedido, redirecionando...'); // Debug
        window.location.href = '/admin.html';
    } catch (error) {
        console.error('Erro no login:', error.message); // Debug
        errorDiv.textContent = `Erro: ${error.message}`;
        errorDiv.style.display = 'block';
    } finally {
        loginBtn.disabled = false;
    }
}

// Bind event listener
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, inicializando formulário'); // Debug
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', handleLogin);
        console.log('Evento de submit adicionado ao formulário');
    } else {
        console.error('Formulário #login-form não encontrado');
    }
});