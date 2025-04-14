// Configuração da URL base da API
const API_BASE = 'https://fila-facilita2-0.onrender.com';

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    
    // Verifica token
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Configura axios
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    // Listener para logout
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/index.html';
    });

    // Configura tabs
    setupTabs();

    // Carrega dados iniciais
    fetchUserInfo();
    fetchQueues();

    // Configura WebSocket
    const socket = io(API_BASE, { auth: { token } });
    socket.on('queue_update', () => fetchQueues());

    // Filtro de filas
    document.getElementById('queue-filter').addEventListener('input', () => fetchQueues());
});

// Configura navegação por tabs
function setupTabs() {
    const tabs = {
        'tab-queues': 'queues-section',
        'tab-reports': 'reports-section'
    };
    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).addEventListener('click', () => {
            Object.values(tabs).forEach(section => document.getElementById(section).classList.add('hidden'));
            document.getElementById(tabs[tabId]).classList.remove('hidden');
            document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.replace('bg-blue-500', 'bg-gray-300'));
            document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.replace('text-white', 'text-gray-700'));
            document.getElementById(tabId).classList.replace('bg-gray-300', 'bg-blue-500');
            document.getElementById(tabId).classList.replace('text-gray-700', 'text-white');
        });
    });
}

// Busca informações do usuário
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        alert('Erro ao carregar usuário.');
        window.location.href = '/index.html';
    }
}

// Busca filas (filtrado pelo departamento do usuário)
async function fetchQueues() {
    try {
        const filter = document.getElementById('queue-filter').value.toLowerCase();
        const response = await axios.get('/api/admin/queues');
        const filteredQueues = response.data.filter(queue => 
            queue.service.toLowerCase().includes(filter) || 
            queue.name.toLowerCase().includes(filter)
        );
        renderQueues(filteredQueues);
    } catch (error) {
        alert('Erro ao carregar filas.');
    }
}

// Renderiza filas
function renderQueues(queues) {
    const container = document.getElementById('queues');
    container.innerHTML = '';
    queues.forEach(queue => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-gray-50 rounded-lg';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-semibold">${queue.name}</p>
                    <p class="text-sm">Serviço: ${queue.service}</p>
                    <p class="text-sm">Próxima senha: ${queue.current_ticket || 'Nenhuma'}</p>
                    <p class="text-sm">Status: ${queue.is_paused ? 'Pausada' : 'Ativa'}</p>
                </div>
                <div class="space-x-2">
                    <button onclick="callNextTicket('${queue.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded">
                        Chamar Próxima
                    </button>
                    <button onclick="toggleQueuePause('${queue.id}', ${queue.is_paused})" 
                            class="${queue.is_paused ? 'bg-green-500 hover:bg-green-600' : 'bg-yellow-500 hover:bg-yellow-600'} text-white px-2 py-1 rounded">
                        ${queue.is_paused ? 'Retomar' : 'Pausar'}
                    </button>
                    <button onclick="endService('${queue.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">
                        Encerrar Atendimento
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

// Chama a próxima senha
async function callNextTicket(queueId) {
    try {
        await axios.post(`/api/admin/queue/${queueId}/call`);
    } catch (error) {
        alert('Erro ao chamar próxima senha.');
    }
}

// Pausa ou retoma fila
async function toggleQueuePause(queueId, isPaused) {
    try {
        await axios.put(`/api/admin/queue/${queueId}/pause`, { pause: !isPaused });
        fetchQueues();
    } catch (error) {
        alert('Erro ao atualizar status da fila.');
    }
}

// Encerra atendimento
async function endService(queueId) {
    if (!confirm('Encerrar o atendimento desta fila?')) return;
    try {
        await axios.post(`/api/admin/queue/${queueId}/end`);
        fetchQueues();
    } catch (error) {
        alert('Erro ao encerrar atendimento.');
    }
}

// Gera relatório
async function generateReport() {
    const date = document.getElementById('report-date').value;
    if (!date) {
        alert('Selecione uma data.');
        return;
    }
    try {
        const response = await axios.get(`/api/admin/report/tickets?date=${date}`);
        renderReport(response.data);
    } catch (error) {
        alert('Erro ao gerar relatório.');
    }
}

// Renderiza relatório
function renderReport(data) {
    const container = document.getElementById('report-results');
    container.innerHTML = `
        <p>Total de senhas: ${data.total_tickets}</p>
        <p>Tempo médio de espera: ${data.avg_wait_time || 'N/D'} minutos</p>
        <p>Senhas atendidas: ${data.completed_tickets}</p>
    `;
}