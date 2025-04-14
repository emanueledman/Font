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
        await fetchDashboardData();
        await fetchQueues();
        await fetchTickets();
        await fetchCurrentCall();
        setupSocketListeners();
        setupNavigation();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.', error.response?.data?.error || error.message);
    }
});

async function fetchDashboardData() {
    try {
        const [queuesRes, ticketsRes, reportRes] = await Promise.all([
            axios.get('/api/admin/queues'),
            axios.get('/api/tickets/admin'),
            axios.get(`/api/admin/report?date=${new Date().toISOString().split('T')[0]}`)
        ]);

        const queues = queuesRes.data;
        const tickets = ticketsRes.data;
        const report = reportRes.data;

        document.getElementById('active-queues').textContent = queues.length;
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
        document.getElementById('today-calls').textContent = report.reduce((sum, item) => sum + item.attended, 0);
        document.getElementById('active-users').textContent = '1'; // Simulado

        const ctx = document.getElementById('activity-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: report.map(item => item.service),
                datasets: [{
                    label: 'Senhas Atendidas',
                    data: report.map(item => item.attended),
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError('Erro ao carregar dados do dashboard.');
    }
}

function setupNavigation() {
    const sections = {
        'nav-dashboard': 'dashboard-section',
        'nav-call': 'call-section',
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