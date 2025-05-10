// js/attendant.js
const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
const socket = io(API_BASE, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    auth: { token: localStorage.getItem('attendantToken') || '' }
});

// Controla o spinner de carregamento
function toggleLoading(show, message = 'Carregando...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingOverlay && loadingMessage) {
        if (show) {
            loadingMessage.textContent = message;
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Exibe notificações (toasts)
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container não encontrado');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in`;
    toast.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
                    type === 'success' ? 'M5 13l4 4L19 7' :
                    type === 'warning' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' :
                    'M6 18L18 6M6 6l12 12'
                }"/>
            </svg>
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Exibe modal de erro
function showError(title, message = '') {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    document.getElementById('error-modal-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

// Exibe modal de sucesso
function showSuccess(message) {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    document.getElementById('error-modal-title').textContent = 'Sucesso';
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

// Formata data para exibição
function formatDateTime(date) {
    return new Date(date).toLocaleString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formata tempo de espera
function formatWaitTime(seconds) {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} min ${remainingSeconds} s`;
}

// Atualiza data atual no painel
function updateCurrentDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = formatDateTime(now);
    }
}

// Configura Axios com token
function setupAxios() {
    const token = localStorage.getItem('attendantToken');
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE;

    // Interceptor para erros 401
    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                showToast('Sessão expirada. Algumas funções podem estar limitadas.', 'warning');
                localStorage.removeItem('attendantToken');
            }
            return Promise.reject(error);
        }
    );
}

// Fecha modais
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// Busca tickets
async function fetchTickets() {
    try {
        toggleLoading(true, 'Carregando tickets...');
        const response = await axios.get('/api/attendant/tickets', { timeout: 10000 });
        console.log('Resposta tickets:', response.data);
        renderTickets(response.data);
        renderTicketQueueFilter(response.data);
        updateNextQueue(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar tickets:', error.response || error);
        showToast('Falha ao carregar tickets.', 'error');
        document.getElementById('tickets').innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhum ticket disponível.</td></tr>';
        return [];
    } finally {
        toggleLoading(false);
    }
}

// Busca chamadas recentes
async function fetchRecentCalls() {
    try {
        toggleLoading(true, 'Carregando chamadas recentes...');
        const response = await axios.get('/api/attendant/recent-calls', { timeout: 10000 });
        console.log('Resposta recent calls:', response.data);
        renderRecentCalls(response.data);
        renderCallFilter(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar chamadas recentes:', error.response || error);
        showToast('Falha ao carregar chamadas recentes.', 'error');
        document.getElementById('recent-calls-table').innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return [];
    } finally {
        toggleLoading(false);
    }
}

// Busca próximos na fila
async function fetchNextInQueue(queueId) {
    try {
        toggleLoading(true, 'Carregando próximos na fila...');
        const response = await axios.get(`/api/attendant/queue/${queueId}/next`, { timeout: 10000 });
        console.log('Resposta next in queue:', response.data);
        updateNextQueue(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar próximos na fila:', error.response || error);
        showToast('Falha ao carregar próximos na fila.', 'error');
        document.getElementById('next-queue').innerHTML = '<p class="text-gray-500 text-center">Nenhum ticket na fila.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
}

// Renderiza tickets na tabela
function renderTickets(tickets) {
    const tbody = document.getElementById('tickets');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhum ticket disponível.</td></tr>';
        return;
    }
    tickets.forEach(ticket => {
        const tr = document.createElement('tr');
        tr.dataset.queueId = ticket.queue_id;
        tr.innerHTML = `
            <td class="px-4 py-3">${ticket.number}</td>
            <td class="px-4 py-3">${ticket.service}</td>
            <td class="px-4 py-3">${ticket.status}</td>
            <td class="px-4 py-3">${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</td>
            <td class="px-4 py-3">${formatDateTime(ticket.issued_at)}</td>
            <td class="px-4 py-3">
                ${ticket.status === 'Pendente' ? `<button onclick="callTicket('${ticket.queue_id}', '${ticket.id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm">Chamar</button>` : ''}
                ${ticket.status === 'Chamado' ? `<button onclick="completeTicket('${ticket.id}')" class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-sm">Finalizar</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Renderiza chamadas recentes
function renderRecentCalls(calls) {
    const tbody = document.getElementById('recent-calls-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!calls || calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return;
    }
    calls.forEach(call => {
        const statusColor = call.status === 'Atendido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3">${call.ticket_number}</td>
            <td class="px-4 py-3">${call.service}</td>
            <td class="px-4 py-3">Guichê ${call.counter}</td>
            <td class="px-4 py-3">${formatDateTime(call.called_at)}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${call.status}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Renderiza filtro de chamadas
function renderCallFilter(calls) {
    const select = document.getElementById('call-filter');
    if (!select) return;
    select.innerHTML = '<option value="">Todas as filas</option>';
    const services = [...new Set(calls.map(call => call.service))];
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = service;
        select.appendChild(option);
    });
}

// Renderiza filtro de filas para tickets
function renderTicketQueueFilter(tickets) {
    const select = document.getElementById('ticket-queue-filter');
    if (!select) return;
    select.innerHTML = '<option value="all">Todas as filas</option>';
    const queues = [...new Set(tickets.map(ticket => ticket.queue_id))];
    const queueData = JSON.parse(localStorage.getItem('queues')) || [];
    queues.forEach(queueId => {
        const queue = queueData.find(q => q.id === queueId);
        if (queue) {
            const option = document.createElement('option');
            option.value = queueId;
            option.textContent = queue.service;
            select.appendChild(option);
        }
    });
}

// Atualiza próximos na fila
function updateNextQueue(tickets) {
    const nextQueue = document.getElementById('next-queue');
    if (!nextQueue) return;
    nextQueue.innerHTML = '';
    const pending = tickets.filter(t => t.status === 'Pendente').slice(0, 5);
    if (pending.length === 0) {
        nextQueue.innerHTML = '<p class="text-gray-500 text-center">Nenhuma senha na fila.</p>';
        return;
    }
    pending.forEach(ticket => {
        const div = document.createElement('div');
        div.className = 'p-3 bg-gray-50 rounded-lg flex justify-between items-center';
        div.innerHTML = `
            <div>
                <p class="font-medium">${ticket.number}</p>
                <p class="text-xs text-gray-500">${ticket.service}</p>
            </div>
            <p class="text-sm text-gray-600">${formatDateTime(ticket.issued_at)}</p>
        `;
        nextQueue.appendChild(div);
    });
}

// Valida QR code
async function validateQrCode(qrCode) {
    try {
        toggleLoading(true, 'Validando QR code...');
        const response = await axios.post('/api/ticket/validate', { qr_code: qrCode }, { timeout: 5000 });
        showSuccess(`Presença validada para ticket ${response.data.ticket_id}!`);
        await fetchTickets();
        return response.data;
    } catch (error) {
        console.error('Erro ao validar QR code:', error.response || error);
        showToast('Falha ao validar QR code.', 'error');
        throw error;
    } finally {
        toggleLoading(false);
    }
}

// Chama ticket específico
async function callTicket(queueId, ticketId) {
    try {
        toggleLoading(true, 'Chamando ticket...');
        const response = await axios.post(`/api/attendant/queue/${queueId}/call`, { ticket_id: ticketId }, { timeout: 5000 });
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        await Promise.all([
            fetchTickets(),
            fetchRecentCalls(),
            fetchNextInQueue(queueId)
        ]);
        return response.data;
    } catch (error) {
        console.error('Erro ao chamar ticket:', error.response || error);
        showToast('Falha ao chamar ticket.', 'error');
        throw error;
    } finally {
        toggleLoading(false);
    }
}

// Finaliza ticket
async function completeTicket(ticketId) {
    try {
        toggleLoading(true, 'Finalizando atendimento...');
        const response = await axios.post(`/api/attendant/ticket/${ticketId}/complete`, {}, { timeout: 5000 });
        showSuccess('Atendimento finalizado com sucesso!');
        await Promise.all([
            fetchTickets(),
            fetchRecentCalls()
        ]);
        return response.data;
    } catch (error) {
        console.error('Erro ao finalizar ticket:', error.response || error);
        showToast('Falha ao finalizar ticket.', 'error');
        throw error;
    } finally {
        toggleLoading(false);
    }
}

// Renderiza select de filas
function renderQueueSelect(queues) {
    const select = document.getElementById('queue-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma fila</option>';
    if (!queues || queues.length === 0) return;
    queues.forEach(queue => {
        const option = document.createElement('option');
        option.value = queue.id;
        option.textContent = queue.service;
        select.appendChild(option);
    });
}

// Busca informações do usuário
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/attendant/user', { timeout: 5000 });
        console.log('Resposta do perfil:', response.data);
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        if (userName) userName.textContent = response.data.name || 'Atendente';
        if (userEmail) userEmail.textContent = response.data.email || 'atendente@empresa.com';
    } catch (error) {
        console.error('Erro ao buscar usuário:', error.response || error);
        showToast('Não foi possível carregar informações do usuário.', 'warning');
    }
}

// Busca filas atribuídas
async function fetchAssignedQueues() {
    try {
        toggleLoading(true, 'Carregando filas...');
        const response = await axios.get('/api/attendant/queues', { timeout: 10000 });
        console.log('Resposta queues:', response.data);
        renderQueueSelect(response.data);
        localStorage.setItem('queues', JSON.stringify(response.data));
    } catch (error) {
        console.error('Erro ao buscar filas:', error.response || error);
        showToast('Falha ao carregar filas.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Busca ticket atual
async function fetchCurrentTicket() {
    try {
        const response = await axios.get('/api/attendant/current-ticket', { timeout: 5000 });
        console.log('Resposta current ticket:', response.data);
        updateCurrentTicket(response.data);
    } catch (error) {
        console.error('Erro ao buscar ticket atual:', error.response || error);
        showToast('Falha ao carregar ticket atual.', 'error');
        updateCurrentTicket({});
    }
}

// Atualiza ticket atual
function updateCurrentTicket(data) {
    const ticketEl = document.getElementById('current-ticket');
    const serviceEl = document.getElementById('current-service');
    const counterEl = document.getElementById('current-counter');
    const waitTimeEl = document.getElementById('avg-wait-time');
    const waitBarEl = document.getElementById('wait-bar');

    if (!data || !data.ticket_number) {
        ticketEl.textContent = '---';
        serviceEl.textContent = '';
        counterEl.textContent = '';
        waitTimeEl.textContent = 'N/A';
        waitBarEl.style.width = '0%';
        return;
    }

    ticketEl.textContent = data.ticket_number;
    serviceEl.textContent = data.service;
    counterEl.textContent = `Guichê ${data.counter}`;
    waitTimeEl.textContent = data.avg_wait_time ? formatWaitTime(data.avg_wait_time) : 'N/A';
    waitBarEl.style.width = data.avg_wait_time ? `${Math.min((data.avg_wait_time / 600) * 100, 100)}%` : '0%';
}

// Chama próximo ticket
async function callNext(queueId) {
    if (!queueId) {
        showToast('Selecione uma fila antes de chamar.', 'warning');
        return;
    }
    try {
        toggleLoading(true, 'Chamando próximo ticket...');
        const response = await axios.post(`/api/attendant/queue/${queueId}/call`, {}, { timeout: 5000 });
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls(),
            fetchNextInQueue(queueId),
            fetchTickets()
        ]);
    } catch (error) {
        console.error('Erro ao chamar próxima senha:', error.response || error);
        showToast('Falha ao chamar próxima senha.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Rechama ticket
async function recallTicket() {
    try {
        toggleLoading(true, 'Rechamando ticket...');
        const response = await axios.post('/api/attendant/recall', {}, { timeout: 5000 });
        showSuccess(`Senha ${response.data.ticket_number} rechamada para o guichê ${response.data.counter}!`);
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls()
        ]);
    } catch (error) {
        console.error('Erro ao rechamar ticket:', error.response || error);
        showToast('Falha ao rechamar ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Configura navegação
function setupNavigation() {
    const sections = {
        'nav-call': 'call-section',
        'nav-tickets': 'tickets-section'
    };

    Object.keys(sections).forEach(navId => {
        const btn = document.getElementById(navId);
        if (btn) {
            btn.addEventListener('click', () => {
                Object.keys(sections).forEach(id => {
                    const otherBtn = document.getElementById(id);
                    const section = document.getElementById(sections[id]);
                    if (id === navId) {
                        otherBtn.classList.add('active', 'bg-blue-700');
                        otherBtn.classList.remove('hover:bg-blue-600');
                        if (section) section.classList.remove('hidden');
                        if (id === 'nav-tickets') fetchTickets();
                    } else {
                        otherBtn.classList.remove('active', 'bg-blue-700');
                        otherBtn.classList.add('hover:bg-blue-600');
                        if (section) section.classList.add('hidden');
                    }
                });
            });
        }
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('w-20', 'w-64');
        });
    }

    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                toggleLoading(true, 'Saindo...');
                await axios.post('/api/logout', {}, { timeout: 5000 });
                localStorage.removeItem('attendantToken');
                window.location.href = '/index.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error.response || error);
                showToast('Falha ao sair. Sessão limpa localmente.', 'error');
                localStorage.removeItem('attendantToken');
                window.location.href = '/index.html';
            } finally {
                toggleLoading(false);
            }
        });
    }
}

// Configura WebSocket
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Conectado ao WebSocket');
        showToast('Conexão em tempo real estabelecida.', 'success');
    });

    socket.on('ticket_called', async data => {
        showToast(`Ticket ${data.ticket_number} chamado por outro atendente.`, 'info');
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls(),
            fetchTickets()
        ]);
        const queueId = document.getElementById('queue-select').value;
        if (queueId) await fetchNextInQueue(queueId);
    });

    socket.on('ticket_completed', async data => {
        showToast(`Ticket ${data.ticket_number} finalizado.`, 'info');
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls(),
            fetchTickets()
        ]);
    });

    socket.on('connect_error', () => {
        showToast('Falha na conexão em tempo real. Tentando reconectar...', 'error');
    });

    socket.on('disconnect', () => {
        showToast('Conexão perdida. Tentando reconectar...', 'error');
    });
}

// Configura eventos
function setupEventListeners() {
    // Modal de QR Code
    document.getElementById('validate-qr-btn').addEventListener('click', openQrModal);
    document.getElementById('validate-qr-btn-tickets').addEventListener('click', openQrModal);
    document.getElementById('cancel-qr-btn').addEventListener('click', () => closeModal('qr-modal'));
    document.getElementById('close-qr-modal').addEventListener('click', () => closeModal('qr-modal'));
    document.getElementById('qr-form').addEventListener('submit', async e => {
        e.preventDefault();
        const qrCode = document.getElementById('qr_code').value;
        await validateQrCode(qrCode);
        closeModal('qr-modal');
    });

    // Filtro de Tickets
    document.getElementById('ticket-filter').addEventListener('input', () => {
        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        document.querySelectorAll('#tickets tr').forEach(row => {
            const number = row.cells[0].textContent.toLowerCase();
            const service = row.cells[1].textContent.toLowerCase();
            row.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
        });
    });

    // Filtro de Status de Tickets
    document.getElementById('ticket-status-filter').addEventListener('change', () => {
        const status = document.getElementById('ticket-status-filter').value;
        document.querySelectorAll('#tickets tr').forEach(row => {
            const rowStatus = row.cells[2].textContent.toLowerCase();
            row.style.display = status === 'all' || rowStatus === status ? '' : 'none';
        });
    });

    // Filtro de Fila de Tickets
    document.getElementById('ticket-queue-filter').addEventListener('change', () => {
        const queueId = document.getElementById('ticket-queue-filter').value;
        document.querySelectorAll('#tickets tr').forEach(row => {
            const ticketQueueId = row.dataset.queueId;
            row.style.display = queueId === 'all' || ticketQueueId === queueId ? '' : 'none';
        });
    });

    // Seleção de Fila
    document.getElementById('queue-select').addEventListener('change', async e => {
        const queueId = e.target.value;
        if (queueId) {
            await fetchNextInQueue(queueId);
        } else {
            document.getElementById('next-queue').innerHTML = '<p class="text-gray-500 text-center">Selecione uma fila.</p>';
        }
    });

    // Ações de Chamada
    document.getElementById('call-next-btn').addEventListener('click', () => {
        const queueId = document.getElementById('queue-select').value;
        callNext(queueId);
    });
    document.getElementById('recall-btn').addEventListener('click', recallTicket);
    document.getElementById('complete-btn').addEventListener('click', () => {
        const currentTicket = document.getElementById('current-ticket').textContent;
        if (currentTicket !== '---') {
            completeTicket(currentTicket);
        } else {
            showToast('Nenhum ticket ativo para finalizar.', 'warning');
        }
    });

    // Atualizar Fila
    document.getElementById('refresh-queue').addEventListener('click', async () => {
        const queueId = document.getElementById('queue-select').value;
        if (!queueId) {
            showToast('Selecione uma fila para atualizar.', 'warning');
            return;
        }
        toggleLoading(true, 'Atualizando dados da fila...');
        try {
            await fetchNextInQueue(queueId);
            showToast('Dados da fila atualizados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            showToast('Falha ao atualizar dados.', 'error');
        } finally {
            toggleLoading(false);
        }
    });

    // Modal de Erro
    document.getElementById('close-error-btn').addEventListener('click', () => closeModal('error-modal'));
    document.getElementById('close-error-modal').addEventListener('click', () => closeModal('error-modal'));
}

// Abre modal de QR code
function openQrModal() {
    const modal = document.getElementById('qr-modal');
    document.getElementById('qr-form').reset();
    modal.classList.remove('hidden');
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    toggleLoading(true, 'Carregando painel...');

    setupAxios();

    try {
        await Promise.all([
            fetchUserInfo(),
            fetchAssignedQueues(),
            fetchCurrentTicket(),
            fetchRecentCalls()
        ]);

        await fetchTickets();
        setupSocketListeners();
        setupNavigation();
        setupEventListeners();
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000);
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao inicializar painel.', 'error');
    } finally {
        toggleLoading(false);
    }
});