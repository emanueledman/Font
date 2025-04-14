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
        // Carregar informações do usuário
        await fetchUserInfo();

        // Carregar filas
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
        showError('Erro ao inicializar painel: ' + (error.response?.data?.error || error.message));
    }
});

async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        showError('Erro ao carregar informações do usuário.');
    }
}

function renderQueues(queues) {
    const queueList = document.getElementById('queues'); // Corrigido de 'queue-list' para 'queues'
    if (!queueList) {
        console.error('Elemento #queues não encontrado');
        showError('Erro: contêiner de filas não encontrado.');
        return;
    }
    queueList.innerHTML = '';
    if (queues.length === 0) {
        queueList.innerHTML = '<p class="text-gray-500">Nenhuma fila disponível.</p>';
        return;
    }
    queues.forEach(queue => {
        const queueItem = document.createElement('div');
        queueItem.className = 'p-4 bg-white rounded-lg shadow';
        queueItem.innerHTML = `
            <h3 class="font-semibold text-lg">${queue.service}</h3>
            <p>Prefixo: ${queue.prefix}</p>
            <p>Status: ${queue.status}</p>
            <p>Tickets Ativos: ${queue.active_tickets}/${queue.daily_limit}</p>
        `;
        queueList.appendChild(queueItem);
    });
}

function setupEventListeners() {
    // Logout
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/index.html';
        });
    }

    // Tabs
    const tabQueues = document.getElementById('tab-queues');
    const tabReports = document.getElementById('tab-reports');
    const queuesSection = document.getElementById('queues-section');
    const reportsSection = document.getElementById('reports-section');

    if (tabQueues && tabReports && queuesSection && reportsSection) {
        tabQueues.addEventListener('click', () => {
            tabQueues.classList.add('bg-blue-500', 'text-white');
            tabQueues.classList.remove('bg-gray-300', 'text-gray-700');
            tabReports.classList.add('bg-gray-300', 'text-gray-700');
            tabReports.classList.remove('bg-blue-500', 'text-white');
            queuesSection.classList.remove('hidden');
            reportsSection.classList.add('hidden');
        });

        tabReports.addEventListener('click', () => {
            tabReports.classList.add('bg-blue-500', 'text-white');
            tabReports.classList.remove('bg-gray-300', 'text-gray-700');
            tabQueues.classList.add('bg-gray-300', 'text-gray-700');
            tabQueues.classList.remove('bg-blue-500', 'text-white');
            reportsSection.classList.remove('hidden');
            queuesSection.classList.add('hidden');
        });
    }

    // Filtro
    const queueFilter = document.getElementById('queue-filter');
    if (queueFilter) {
        queueFilter.addEventListener('input', () => {
            const filter = queueFilter.value.toLowerCase();
            const queueItems = document.querySelectorAll('#queues > div');
            queueItems.forEach(item => {
                const service = item.querySelector('h3').textContent.toLowerCase();
                item.style.display = service.includes(filter) ? '' : 'none';
            });
        });
    }
}

function showError(message) {
    console.error(message);
    alert(message); // Temporário, já que não há modal de erro no HTML
}

function generateReport() {
    // Placeholder para relatórios, já que não está implementado
    showError('Funcionalidade de relatórios ainda não implementada.');
}