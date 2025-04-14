const API_BASE = 'https://fila-facilita2-0.onrender.com';
const socket = io(API_BASE, { transports: ['websocket'], reconnectionAttempts: 5 });

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Configurar Axios com retry para robustez
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;
    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                localStorage.removeItem('adminToken');
                window.location.href = '/index.html';
            }
            return Promise.reject(error);
        }
    );

    // Carregar dados iniciais
    fetchUserInfo();
    fetchQueues();
    setupSocketListeners();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('close-error').addEventListener('click', () => {
        document.getElementById('error-modal').classList.add('hidden');
    });
    document.getElementById('filter-service').addEventListener('input', filterQueues);
    document.getElementById('filter-status').addEventListener('change', filterQueues);
}

// Modificação no arquivo que verifica o usuário após login
async function fetchUserInfo() {
    try {
        // Usar a rota correta conforme implementado no backend
        const response = await axios.get('/api/admin/user');
        const userInfo = document.getElementById('user-info');
        userInfo.textContent = `Gestor: ${response.data.email}`;
        userInfo.classList.remove('hidden');
    } catch (error) {
        console.error('Erro ao buscar informações do usuário:', error);
        // Verificar se é erro de autenticação
        if (error.response?.status === 401) {
            localStorage.removeItem('adminToken');
            window.location.href = '/index.html';
        }
        showError('Erro ao carregar informações do usuário.');
    }
}

async function fetchQueues() {
    try {
        const response = await axios.get('/api/admin/queues');
        renderQueues(response.data);
        updateStats(response.data);
    } catch (error) {
        showError('Erro ao carregar filas: ' + (error.response?.data?.error || error.message));
    }
}

function renderQueues(queues) {
    const queueContainer = document.getElementById('queues');
    queueContainer.innerHTML = '';
    queues.forEach(queue => {
        const div = document.createElement('div');
        div.className = 'queue-item flex justify-between items-center p-4 bg-gray-50 rounded-lg';
        div.innerHTML = `
            <div>
                <p class="font-semibold">${queue.service}</p>
                <p class="text-sm">${queue.institution_name}</p>
                <p class="text-sm">Senhas Ativas: ${queue.active_tickets}/${queue.daily_limit}</p>
                <p class="text-sm">Status: ${queue.status}</p>
            </div>
            <button onclick="callNext('${queue.id}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center">
                <i class="fas fa-phone mr-2"></i> Chamar Próxima
            </button>
        `;
        queueContainer.appendChild(div);
    });
}

async function callNext(queueId) {
    try {
        const response = await axios.post(`/api/admin/queue/${queueId}/call`);
        alert(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        fetchQueues();
    } catch (error) {
        showError('Erro ao chamar senha: ' + (error.response?.data?.error || error.message));
    }
}

function setupSocketListeners() {
    socket.on('queue_update', (data) => {
        fetchQueues();
    });

    socket.on('connect_error', () => {
        showError('Erro de conexão com o servidor. Tentando reconectar...');
    });

    socket.on('reconnect', () => {
        fetchQueues();
        showError('Conexão restabelecida!');
        setTimeout(() => document.getElementById('error-modal').classList.add('hidden'), 2000);
    });
}

function updateStats(queues) {
    const totalTickets = queues.reduce((sum, q) => sum + q.active_tickets, 0);
    const avgWaitTime = queues.reduce((sum, q) => sum + (q.avg_wait_time || 0), 0) / queues.length || 0;
    const calledTickets = queues.reduce((sum, q) => sum + (q.current_ticket || 0), 0);

    document.getElementById('total-tickets').textContent = totalTickets;
    document.getElementById('avg-wait-time').textContent = `${avgWaitTime.toFixed(1)} min`;
    document.getElementById('called-tickets').textContent = calledTickets;
}

function filterQueues() {
    const serviceFilter = document.getElementById('filter-service').value.toLowerCase();
    const statusFilter = document.getElementById('filter-status').value;

    document.querySelectorAll('.queue-item').forEach(item => {
        const service = item.querySelector('p.font-semibold').textContent.toLowerCase();
        const status = item.querySelector('p.text-sm:last-child').textContent.includes(statusFilter) || !statusFilter;

        item.style.display = (service.includes(serviceFilter) && status) ? 'flex' : 'none';
    });
}

function showError(message) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-message').textContent = message;
    modal.classList.remove('hidden');
}

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = '/index.html';
}