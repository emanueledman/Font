const API_BASE = 'https://fila-facilita2-0.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                localStorage.clear();
                window.location.href = '/index.html';
            }
            return Promise.reject(error);
        }
    );

    try {
        await fetchUserInfo();
        await fetchDepartmentInfo();
        await fetchQueues();
        await fetchTickets();
        setupSocketListeners();
        setupNavigation();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.', error.response?.data?.error || error.message);
    }
});

function setupNavigation() {
    const sections = {
        'nav-queues': 'queues-section',
        'nav-tickets': 'tickets-section',
        'nav-reports': 'reports-section',
        'nav-settings': 'settings-section'
    };

    Object.keys(sections).forEach(navId => {
        document.getElementById(navId).addEventListener('click', () => {
            Object.keys(sections).forEach(id => {
                const btn = document.getElementById(id);
                const section = document.getElementById(sections[id]);
                if (id === navId) {
                    btn.classList.add('bg-blue-700');
                    btn.classList.remove('hover:bg-blue-600');
                    section.classList.remove('hidden');
                } else {
                    btn.classList.remove('bg-blue-700');
                    btn.classList.add('hover:bg-blue-600');
                    section.classList.add('hidden');
                }
            });
        });
    });

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });
}