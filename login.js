const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Sanitize inputs to prevent XSS
const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
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
    if (data.branch_id) storage.setItem('branchId', data.branch_id);
    if (data.queues) storage.setItem('queues', JSON.stringify(data.queues));
};

// Redirect based on role
const redirectUser = (userRole) => {
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
            window.location.href = '/index.html';
    }
};

// Verificar autenticação inicial
const checkAuth = () => {
    const token = getToken();
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
    
    if (!token || !userRole || !branchId) {
        window.location.href = '/index.html';
        return false;
    }
    
    return true;
};

// Initial verification
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html')) {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = sanitizeInput(document.getElementById('email').value.trim());
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;

            const response = await axios.post(
                `${API_BASE}/api/admin/login`,
                { email, password },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            const data = response.data;
            storeAuthData(data, rememberMe);
            redirectUser(data.user_role);

            document.getElementById('password').value = '';
        });
    } else {
        if (!checkAuth()) return;
    }
});