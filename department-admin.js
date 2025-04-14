// Configuração da URL base da API
const API_BASE = 'https://fila-facilita2-0.onrender.com';

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    
    // Verifica se há token, caso contrário redireciona para login
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Configura axios com token
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    // Listener para logout
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/index.html';
    });

    // Carrega email do usuário e filas
    fetchUserInfo();
    fetchQueues();

    // Configura WebSocket para atualizações em tempo real
    const socket = io(API_BASE, { auth: { token } });
    socket.on('queue_update', () => fetchQueues());
});

// Busca informações do usuário
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        alert('Erro ao carregar informações do usuário.');
        window.location.href = '/index.html';
    }
}

// Busca filas
async function fetchQueues() {
    try {
        const response = await axios.get('/api/admin/queues');
        renderQueues(response.data);
    } catch (error) {
        alert('Erro ao carregar filas.');
    }
}

// Renderiza filas na tela
function renderQueues(queues) {
    const container = document.getElementById('queues');
    container.innerHTML = '';
    queues.forEach(queue => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-gray-50 rounded-lg flex justify-between items-center';
        div.innerHTML = `
            <div>
                <p class="font-semibold">${queue.name}</p>
                <p class="text-sm">Serviço: ${queue.service}</p>
                <p class="text-sm">Próxima senha: ${queue.current_ticket || 'Nenhuma'}</p>
            </div>
            <button onclick="callNextTicket('${queue.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                Chamar Próxima
            </button>
        `;
        container.appendChild(div);
    });
}

// Chama a próxima senha
async function callNextTicket(queueId) {
    try {
        await axios.post(`/api/admin/queue/${queueId}/call`);
        fetchQueues();
    } catch (error) {
        alert('Erro ao chamar próxima senha.');
    }
}