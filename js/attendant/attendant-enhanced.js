const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
const socket = io(API_BASE, { transports: ['websocket'], reconnectionAttempts: 5 });

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('attendantToken');
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
        await fetchAssignedQueues();
        await fetchActiveTickets();
        await fetchAttendedTickets();
        setupSocketListeners();
        setupEventListeners();
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000);
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.', error.response?.data?.error || error.message);
    }
});

// Funções de Busca
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/attendant/user');
        document.getElementById('user-name').textContent = response.data.name || 'Atendente';
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        showError('Erro ao carregar informações do usuário.');
    }
}

async function fetchDepartmentInfo() {
    try {
        const response = await axios.get('/api/attendant/department');
        const deptName = document.getElementById('department-name');
        deptName.textContent = response.data.department_name || 'Departamento';
    } catch (error) {
        console.error('Erro ao buscar departamento:', error);
        showError('Erro ao carregar informações do departamento.');
    }
}

async function fetchAssignedQueues() {
    try {
        const response = await axios.get('/api/attendant/queues');
        renderQueues(response.data);
        localStorage.setItem('queues', JSON.stringify(response.data));
        for (const queue of response.data) {
            await fetchActiveTicketsForQueue(queue.id);
        }
    } catch (error) {
        console.error('Erro ao buscar filas:', error);
        showError('Erro ao carregar filas.', error.response?.data?.error || error.message);
    }
}

async function fetchActiveTickets() {
    try {
        const response = await axios.get('/api/attendant/tickets');
        renderTickets(response.data);
    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        showError('Erro ao carregar tickets.', error.response?.data?.error || error.message);
    }
}

async function fetchActiveTicketsForQueue(queueId) {
    try {
        const response = await axios.get(`/api/attendant/queue/${queueId}/active-tickets`);
        renderActiveTickets(queueId, response.data);
    } catch (error) {
        console.error(`Erro ao buscar tickets ativos para fila ${queueId}:`, error);
        showError(`Erro ao carregar tickets ativos da fila ${queueId}.`);
    }
}

async function fetchAttendedTickets() {
    try {
        const response = await axios.get('/api/attendant/tickets/attended', {
            params: {
                date: document.getElementById('attended-date-filter')?.value || new Date().toISOString().split('T')[0]
            }
        });
        renderAttendedTickets(response.data);
    } catch (error) {
        console.error('Erro ao buscar tickets atendidos:', error);
        showError('Erro ao carregar tickets atendidos.', error.response?.data?.error || error.message);
    }
}

// Funções de Renderização
function renderQueues(queues) {
    const container = document.getElementById('queues-container');
    container.innerHTML = '';
    if (!queues || queues.length === 0) {
        container.innerHTML = '<p class="p-3 text-gray-500 text-center">Nenhuma fila atribuída.</p>';
        return;
    }
    queues.forEach(queue => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-lg font-semibold">${queue.service}</h3>
                <span class="text-sm ${queue.status === 'active' ? 'text-green-500' : 'text-red-500'}">${queue.status === 'active' ? 'Ativa' : 'Inativa'}</span>
            </div>
            <p class="text-sm text-gray-500">Prefixo: ${queue.prefix}</p>
            <p class="text-sm text-gray-500">Tickets ativos: <span id="active-count-${queue.id}">${queue.active_tickets || 0}</span>/${queue.daily_limit}</p>
            <p class="text-sm text-gray-500">Horário: ${queue.open_time || 'N/A'} - ${queue.close_time || 'N/A'}</p>
            <div class="mt-3 flex space-x-2">
                <button onclick="callNext('${queue.id}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Chamar Próxima
                </button>
                <button onclick="recallTicket('${queue.id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-sm flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Rechamar
                </button>
            </div>
            <div id="active-tickets-${queue.id}" class="mt-3 text-sm text-gray-600"></div>
        `;
        container.appendChild(div);
    });
}

function renderActiveTickets(queueId, tickets) {
    const container = document.getElementById(`active-tickets-${queueId}`);
    container.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Nenhuma senha ativa.</p>';
        document.getElementById(`active-count-${queueId}`).textContent = '0';
        return;
    }
    document.getElementById(`active-count-${queueId}`).textContent = tickets.length;
    const ul = document.createElement('ul');
    ul.className = 'list-disc pl-5';
    tickets.forEach(ticket => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${ticket.number} - ${ticket.status} 
            ${ticket.status === 'Pendente' ? `
                <button onclick="callNext('${queueId}')" class="text-green-500 hover:underline">Chamar</button>
            ` : ''}
        `;
        ul.appendChild(li);
    });
    container.appendChild(ul);
}

function renderTickets(tickets) {
    const container = document.getElementById('tickets-container');
    container.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="p-3 text-gray-500 text-center">Nenhum ticket ativo.</p>';
        return;
    }
    tickets.forEach(ticket => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-lg font-semibold">${ticket.number}</h3>
                <span class="text-sm ${ticket.status === 'Pendente' ? 'text-yellow-500' : ticket.status === 'Chamado' ? 'text-blue-500' : 'text-green-500'}">${ticket.status}</span>
            </div>
            <p class="text-sm text-gray-500">Serviço: ${ticket.service}</p>
            <p class="text-sm text-gray-500">Guichê: ${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</p>
            <p class="text-sm text-gray-500">Emitido em: ${new Date(ticket.issued_at).toLocaleString('pt-BR')}</p>
            ${ticket.status === 'Pendente' ? `
                <button onclick="callNext('${ticket.queue_id}')" class="mt-3 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Chamar
                </button>
            ` : ''}
        `;
        container.appendChild(div);
    });
}

function renderAttendedTickets(tickets) {
    const container = document.getElementById('attended-tickets-container');
    container.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="p-3 text-gray-500 text-center">Nenhum ticket atendido hoje.</p>';
        return;
    }
    tickets.forEach(ticket => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="text-lg font-semibold">${ticket.number}</h3>
                <span class="text-sm text-green-500">Atendido</span>
            </div>
            <p class="text-sm text-gray-500">Serviço: ${ticket.service}</p>
            <p class="text-sm text-gray-500">Guichê: ${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</p>
            <p class="text-sm text-gray-500">Atendido em: ${new Date(ticket.attended_at).toLocaleString('pt-BR')}</p>
        `;
        container.appendChild(div);
    });
}

// Ações de Chamada
async function callNext(queueId) {
    try {
        const response = await axios.post(`/api/attendant/queue/${queueId}/call`);
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        document.getElementById('current-ticket').textContent = response.data.ticket_number;
        document.getElementById('current-service').textContent = response.data.service;
        document.getElementById('current-counter').textContent = `Guichê ${response.data.counter}`;
        await fetchAssignedQueues();
        await fetchActiveTickets();
        await fetchActiveTicketsForQueue(queueId);
        await fetchAttendedTickets();
        showToast(`Senha ${response.data.ticket_number} chamada!`, 'bg-green-500');
    } catch (error) {
        console.error('Erro ao chamar próxima senha:', error);
        showError('Erro ao chamar próxima senha.', error.response?.data?.error || error.message);
    }
}

async function recallTicket(queueId) {
    try {
        const response = await axios.post(`/api/attendant/queue/${queueId}/recall`);
        showSuccess(`Senha ${response.data.ticket_number} rechamada para o guichê ${response.data.counter}!`);
        document.getElementById('current-ticket').textContent = response.data.ticket_number;
        document.getElementById('current-service').textContent = response.data.service;
        document.getElementById('current-counter').textContent = `Guichê ${response.data.counter}`;
        await fetchActiveTickets();
        await fetchActiveTicketsForQueue(queueId);
        showToast(`Senha ${response.data.ticket_number} rechamada!`, 'bg-yellow-500');
    } catch (error) {
        console.error('Erro ao rechamar senha:', error);
        showError('Erro ao rechamar senha.', error.response?.data?.error || error.message);
    }
}

// Validação de QR Code
function openQrModal() {
    const modal = document.getElementById('qr-modal');
    document.getElementById('qr-form').reset();
    modal.classList.remove('hidden');
}

async function validateQrCode(qrCode) {
    try {
        const response = await axios.post('/api/attendant/ticket/validate', { qr_code: qrCode });
        showSuccess(`Presença validada para ticket ${response.data.ticket_number}!`);
        await fetchActiveTickets();
        await fetchAttendedTickets();
        showToast(`Ticket ${response.data.ticket_number} validado!`, 'bg-green-500');
        return response.data;
    } catch (error) {
        console.error('Erro ao validar QR code:', error);
        showError('Erro ao validar QR code.', error.response?.data?.error || error.message);
        throw error;
    }
}

// Configuração de Eventos
function setupEventListeners() {
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    const navButtons = ['call', 'queues', 'tickets', 'attended'];
    navButtons.forEach(button => {
        document.getElementById(`nav-${button}`).addEventListener('click', () => {
            document.querySelectorAll('main > div').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(`${button}-section`).classList.remove('hidden');
            document.querySelectorAll('#sidebar nav button').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-700/90');
            });
            document.getElementById(`nav-${button}`).classList.add('active', 'bg-blue-700/90');
            if (button === 'queues') fetchAssignedQueues();
            if (button === 'tickets') fetchActiveTickets();
            if (button === 'attended') fetchAttendedTickets();
        });
    });

    document.getElementById('queue-filter').addEventListener('input', () => {
        const filter = document.getElementById('queue-filter').value.toLowerCase();
        document.querySelectorAll('#queues-container > div').forEach(card => {
            const service = card.querySelector('h3').textContent.toLowerCase();
            card.style.display = service.includes(filter) ? '' : 'none';
        });
    });

    document.getElementById('ticket-filter').addEventListener('input', () => {
        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        document.querySelectorAll('#tickets-container > div').forEach(card => {
            const number = card.querySelector('h3').textContent.toLowerCase();
            const service = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
            card.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
        });
    });

    document.getElementById('attended-date-filter').addEventListener('change', () => {
        fetchAttendedTickets();
    });

    document.getElementById('validate-qr-btn').addEventListener('click', openQrModal);
    document.getElementById('cancel-qr-btn').addEventListener('click', () => {
        document.getElementById('qr-modal').classList.add('hidden');
    });
    document.getElementById('qr-form').addEventListener('submit', async e => {
        e.preventDefault();
        const qrCode = document.getElementById('qr_code').value;
        await validateQrCode(qrCode);
        document.getElementById('qr-modal').classList.add('hidden');
    });

    document.getElementById('quick-call').addEventListener('click', async () => {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        if (queues.length === 0) {
            showError('Nenhuma fila atribuída.');
            return;
        }
        await callNext(queues[0].id);
    });

    document.getElementById('close-error-btn').addEventListener('click', () => {
        document.getElementById('error-modal').classList.add('hidden');
    });
    document.getElementById('close-error-modal').addEventListener('click', () => {
        document.getElementById('error-modal').classList.add('hidden');
    });

    document.getElementById('refresh-data').addEventListener('click', async () => {
        await fetchAssignedQueues();
        await fetchActiveTickets();
        await fetchAttendedTickets();
        showSuccess('Dados atualizados com sucesso.');
        showToast('Dados atualizados!', 'bg-blue-500');
    });
}

// WebSocket
function setupSocketListeners() {
    socket.on('queue_update', async data => {
        if (data.department_id === JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id) {
            showToast(`Fila atualizada: ${data.message}`, 'bg-blue-500');
            await fetchAssignedQueues();
        }
    });

    socket.on('ticket_called', async data => {
        if (data.department_id === JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id) {
            showToast(`Senha ${data.ticket_number} chamada no guichê ${data.counter}`, 'bg-green-500');
            if (!document.getElementById('call-section').classList.contains('hidden')) {
                document.getElementById('current-ticket').textContent = data.ticket_number;
                document.getElementById('current-service').textContent = data.service;
                document.getElementById('current-counter').textContent = `Guichê ${data.counter}`;
            }
            await fetchActiveTickets();
            await fetchActiveTicketsForQueue(data.queue_id);
            await fetchAttendedTickets();
        }
    });

    socket.on('ticket_attended', async data => {
        if (data.department_id === JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id) {
            showToast(`Senha ${data.ticket_number} marcada como atendida`, 'bg-green-500');
            await fetchActiveTicketsForQueue(data.queue_id);
            await fetchAttendedTickets();
        }
    });

    socket.on('notification', data => {
        if (data.department_id === JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id) {
            showToast(data.message, 'bg-blue-500');
        }
    });

    socket.on('connect_error', () => {
        showError('Erro de conexão com o servidor. Tentando reconectar...');
    });

    socket.on('reconnect', () => {
        showSuccess('Conexão restabelecida!');
        showToast('Conexão restabelecida!', 'bg-green-500');
    });
}

// Funções Auxiliares
function updateCurrentDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
}

function showError(title, message = '') {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

function showSuccess(message) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').textContent = 'Sucesso';
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

function showToast(message, bgColor = 'bg-blue-500') {
    const container = document.getElementById('toast-container');
    const toast = document.getElementById('toast-template').content.cloneNode(true);
    toast.querySelector('.toast').classList.add(bgColor);
    toast.querySelector('.toast-title').textContent = 'Notificação';
    toast.querySelector('.toast-message').textContent = message;
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.querySelector('.toast').remove();
    });
    container.appendChild(toast);
    setTimeout(() => {
        const toastEl = container.querySelector('.toast');
        if (toastEl) {
            toastEl.classList.add('opacity-0');
            setTimeout(() => toastEl.remove(), 500);
        }
    }, 5000);
}