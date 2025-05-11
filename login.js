// Primeiro trecho ajustado
const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Sanitize inputs to prevent XSS
const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

// Show error messages
const showError = (message) => {
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
        errorElement.textContent = sanitizeInput(message);
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 5000);
    } else {
        console.error('Error element not found:', message);
    }
};

// Clear sensitive data
const clearSensitiveData = () => {
    console.log('Clearing sensitive data');
    ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        ['adminToken', 'userRole', 'queues', 'email'].forEach(key => storage.removeItem(key));
    });
};

// Get token
const getToken = () => {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
};

// Store authentication data
const storeAuthData = (data, rememberMe) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('adminToken', data.token);
    storage.setItem('userRole', data.user_role);
    if (data.email) storage.setItem('email', data.email);
    if (data.queues) storage.setItem('queues', JSON.stringify(data.queues));
    console.log('Data stored:', { token: data.token.substring(0, 10) + '...', userRole: data.user_role, email: data.email });
};

// Redirect based on role
const redirectUser = (userRole) => {
    console.log('Redirecting for role:', userRole);
    switch (userRole) {
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
            showError('Invalid user role.');
            clearSensitiveData();
            window.location.href = '/index.html';
    }
};

// Verificar autenticação inicial
const checkAuth = () => {
    const token = getToken();
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    
    if (!token || !userRole) {
        console.log('No token or role found, redirecting to login');
        window.location.href = '/index.html';
        return false;
    }
    
    return true;
};

// Initial verification
document.addEventListener('DOMContentLoaded', () => {
    // Skip verification on login page
    if (window.location.pathname.includes('index.html')) {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) {
            console.error('Login form not found');
            showError('Internal error: login form not found.');
            return;
        }

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = sanitizeInput(document.getElementById('email').value.trim());
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;

            if (!email || !password) {
                showError('Email and password are required.');
                return;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showError('Invalid email.');
                return;
            }

            try {
                const response = await axios.post(
                    `${API_BASE}/api/admin/login`,
                    { email, password },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 10000
                    }
                );

                const data = response.data;
                if (!data.token || !data.user_role) {
                    throw new Error('Invalid response: token or user_role missing');
                }

                console.log('Login successful:', { user_role: data.user_role });
                storeAuthData(data, rememberMe);
                redirectUser(data.user_role);

            } catch (error) {
                console.error('Login error:', error);
                let message = 'Login failed. Please check your credentials.';
                if (error.response) {
                    message = error.response.data?.error || message;
                    if (error.response.status === 401) message = 'Invalid credentials.';
                    else if (error.response.status === 403) message = 'Unauthorized access.';
                    else if (error.response.status === 500) message = 'Server error.';
                } else if (error.code === 'ECONNABORTED') {
                    message = 'Connection timeout.';
                } else if (error.message.includes('Network Error')) {
                    message = 'Network error.';
                }
                showError(message);
            } finally {
                document.getElementById('password').value = '';
            }
        });
    } else {
        // Verificar autenticação para páginas protegidas
        if (!checkAuth()) return;
    }
});