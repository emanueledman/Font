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
        // Carregar filas do localStorage ou buscar do backend
        let queues = JSON.parse(localStorage.getItem('queues')) || [];
        if (!queues.length) {
            const response = await axios.get('/api/admin/queues');
            queues = response.data;
            localStorage.setItem('queues', JSON.stringify(queues));
        }

        renderQueues(queues);
        setupEventListeners();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.');
    }
});

function renderQueues(queues) {
    const queueList = document.getElementById('queue-list');
    queueList.innerHTML = '';
    queues.forEach(queue => {
        const queueItem = document.createElement('div');
        queueItem.innerHTML = `
            <h3>${queue.service}</h3>
            <p>Prefixo: ${queue.prefix}</p>
            <p>Status: ${queue.status}</p>
            <p>Tickets Ativos: ${queue.active_tickets}/${queue.daily_limit}</p>
        `;
        queueList.appendChild(queueItem);
    });
}

function setupEventListeners() {
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });
}