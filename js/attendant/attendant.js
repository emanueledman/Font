const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
let socket = null;
let currentTicket = null;

// Sanitiza entradas
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

// Valida código QR
const validateQRCode = (code) => {
    const qrRegex = /^[A-Z0-9_-]+$/;
    return qrRegex.test(code);
};

// Limpa dados sensíveis
const clearSensitiveData = () => {
    ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        ['adminToken', 'userRole', 'queues', 'redirectCount', 'lastRedirect'].forEach(key => storage.removeItem(key));
    });
};

// Obtém token
const getToken = () => {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
};

// Atualiza data atual
const updateCurrentDate = () => {
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

// Controla spinner de carregamento
const toggleLoading = (show, message = 'Carregando...') => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    if (loadingOverlay && loadingMessage) {
        loadingMessage.textContent = sanitizeInput(message);
        loadingOverlay.classList.toggle('hidden', !show);
    }
};

// Exibe notificações
const showToast = (message, type = 'success') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
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
            ${sanitizeInput(message)}
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
};

// Configura Axios com retry
const setupAxios = () => {
    const token = getToken();
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        showToast('Faça login para acessar todas as funcionalidades.', 'warning');
    }
    axios.defaults.baseURL = API_BASE;
    axios.defaults.timeout = 10000;

    let authFailedCount = 0;
    axios.interceptors.response.use(
        response => {
            authFailedCount = 0;
            return response;
        },
        error => {
            if (error.response?.status === 401) {
                authFailedCount++;
                if (authFailedCount > 3) {
                    showToast('Sessão inválida. Redirecionando para login...', 'error');
                    clearSensitiveData();
                    setTimeout(() => window.location.href = '/index.html', 3000);
                } else {
                    showToast('Problema de autenticação. Tente novamente.', 'warning');
                }
            } else if (error.response?.status === 403) {
                showToast(error.response.data?.error || 'Acesso não autorizado.', 'error');
            } else if (error.response?.status === 404) {
                showToast('Funcionalidade indisponível no momento.', 'warning');
            } else if (error.code === 'ECONNABORTED') {
                showToast('Tempo de conexão excedido.', 'error');
            } else if (error.message.includes('Network Error')) {
                showToast('Falha na conexão com o servidor.', 'error');
            }
            return Promise.reject(error);
        }
    );

    // Adicionar retry
    axiosRetry(axios, {
        retries: 3,
        retryDelay: (retryCount) => retryCount * 1000,
        retryCondition: (error) => {
            return error.code === 'ECONNABORTED' || error.message.includes('Network Error');
        }
    });
};

// Inicializa WebSocket
const initializeWebSocket = () => {
    const token = getToken();
    if (!token) {
        showToast('Conexão em tempo real indisponível.', 'warning');
        return;
    }
    try {
        socket = io(API_BASE, {
            transports: ['websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            query: { token }
        });
        socket.on('connect', () => {
            showToast('Conexão em tempo real estabelecida.', 'success');
            document.querySelector('.animate-pulse.bg-green-400').classList.remove('bg-red-500');
        });
        socket.on('connect_error', () => {
            showToast('Falha na conexão em tempo real.', 'warning');
            document.querySelector('.animate-pulse.bg-green-400').classList.add('bg-red-500');
        });
        socket.on('disconnect', () => {
            showToast('Conexão em tempo real perdida.', 'warning');
            document.querySelector('.animate-pulse.bg-green-400').classList.add('bg-red-500');
        });
        socket.on('ticket_called', (data) => {
            updateCurrentTicket(data);
            fetchTickets();
            fetchRecentCalls();
        });
        socket.on('ticket_issued', () => {
            fetchTickets();
            renderNextQueue();
        });
        socket.on('queue_updated', () => {
            fetchQueues();
            renderNextQueue();
        });
    } catch (err) {
        showToast('Falha ao iniciar conexão em tempo real.', 'warning');
    }
};

// Atualiza ticket atual
const updateCurrentTicket = (ticket) => {
    currentTicket = ticket;
    const ticketEl = document.getElementById('current-ticket');
    const serviceEl = document.getElementById('current-service');
    const counterEl = document.getElementById('current-counter');
    const counterBadge = document.getElementById('ticket-counter');
    const waitTimeEl = document.getElementById('avg-wait-time');
    const waitBarEl = document.getElementById('wait-bar');

    if (ticket) {
        ticketEl.textContent = ticket.number || '---';
        serviceEl.textContent = `${ticket.service} (${ticket.department_name})` || 'N/A';
        counterEl.textContent = `Guichê ${ticket.counter || 'N/A'}`;
        counterBadge.textContent = ticket.counter || '';
        counterBadge.classList.remove('hidden');
        waitTimeEl.textContent = ticket.avg_wait_time ? `${ticket.avg_wait_time.toFixed(1)} min` : 'N/A';
        waitBarEl.style.width = ticket.avg_wait_time ? `${Math.min((ticket.avg_wait_time / 15) * 100, 100)}%` : '0%';
    } else {
        ticketEl.textContent = '---';
        serviceEl.textContent = '';
        counterEl.textContent = '';
        counterBadge.classList.add('hidden');
        waitTimeEl.textContent = 'N/A';
        waitBarEl.style.width = '0%';
    }
};

// Busca informações do usuário
const fetchUserInfo = async () => {
    try {
        const response = await axios.get('/api/attendant/user');
        const user = response.data;
        document.getElementById('user-name').textContent = sanitizeInput(user.name || 'Atendente');
        document.getElementById('user-email').textContent = sanitizeInput(user.email || 'N/A');
        document.querySelector('#user-info .bg-blue-600').textContent = (user.name || 'A').slice(0, 2).toUpperCase();
        return user;
    } catch (error) {
        showToast('Não foi possível carregar informações do usuário.', 'warning');
        return null;
    }
};

// Busca filas
const fetchQueues = async () => {
    try {
        const response = await axios.get('/api/attendant/queues');
        const queues = response.data;
        localStorage.setItem('queues', JSON.stringify(queues));
        renderQueueSelect(queues);
        renderNextQueue();
        return queues;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar filas.', 'warning');
        return [];
    }
};

// Busca tickets
const fetchTickets = async () => {
    try {
        toggleLoading(true, 'Carregando tickets...');
        const response = await axios.get('/api/attendant/tickets');
        const tickets = response.data;
        renderTickets(tickets);
        renderTicketQueueFilter(tickets);
        return tickets;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar tickets.', 'error');
        document.getElementById('tickets-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum ticket disponível.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Busca chamadas recentes
const fetchRecentCalls = async () => {
    try {
        toggleLoading(true, 'Carregando chamadas recentes...');
        const response = await axios.get('/api/attendant/recent-calls');
        const calls = response.data;
        renderRecentCalls(calls);
        renderCallFilter(calls);
        return calls;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar chamadas recentes.', 'warning');
        document.getElementById('recent-calls-table').innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Chama um ticket específico
const callTicket = async (queueId, ticketId) => {
    try {
        toggleLoading(true, 'Chamando ticket...');
        await axios.post('/api/attendant/call-ticket', { queue_id: queueId, ticket_id: ticketId });
        showToast('Ticket chamado com sucesso.', 'success');
        fetchTickets();
        fetchRecentCalls();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao chamar ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Chama o próximo ticket
const callNextTicket = async () => {
    const queueSelect = document.getElementById('queue-select');
    const queueId = queueSelect.value;
    if (!queueId) {
        showToast('Selecione uma fila antes de chamar.', 'warning');
        return;
    }
    try {
        toggleLoading(true, 'Chamando próximo ticket...');
        const response = await axios.post('/api/attendant/call-next', { queue_id: queueId });
        showToast('Próximo ticket chamado com sucesso.', 'success');
        updateCurrentTicket(response.data);
        fetchTickets();
        fetchRecentCalls();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao chamar próximo ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Rechama o ticket atual
const recallTicket = async () => {
    if (!currentTicket) {
        showToast('Nenhum ticket atual para rechamar.', 'warning');
        return;
    }
    try {
        toggleLoading(true, 'Rechamando ticket...');
        await axios.post('/api/attendant/recall', { ticket_id: currentTicket.id });
        showToast('Ticket rechamado com sucesso.', 'success');
        fetchRecentCalls();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao rechamar ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Finaliza o ticket atual
const completeTicket = async () => {
    if (!currentTicket) {
        showToast('Nenhum ticket atual para finalizar.', 'warning');
        return;
    }
    try {
        toggleLoading(true, 'Finalizando ticket...');
        await axios.post('/api/attendant/complete', { ticket_id: currentTicket.id });
        showToast('Ticket finalizado com sucesso.', 'success');
        updateCurrentTicket(null);
        fetchTickets();
        fetchRecentCalls();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao finalizar ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Valida QR Code
const validateQR = async (qrCode) => {
    if (!validateQRCode(qrCode)) {
        showToast('Código QR inválido.', 'error');
        return;
    }
    try {
        toggleLoading(true, 'Validando QR Code...');
        const response = await axios.post('/api/attendant/validate-qr', { qr_code: qrCode });
        showToast('QR Code validado com sucesso.', 'success');
        updateCurrentTicket(response.data);
        fetchTickets();
        fetchRecentCalls();
        document.getElementById('qr-modal').classList.add('hidden');
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao validar QR Code.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Renderiza select de filas
const renderQueueSelect = (queues) => {
    const select = document.getElementById('queue-select');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione uma fila</option>';
    if (!queues || queues.length === 0) {
        select.disabled = true;
        return;
    }
    select.disabled = false;
    queues.forEach(queue => {
        const option = document.createElement('option');
        option.value = queue.id;
        option.textContent = `${sanitizeInput(queue.service)} (${sanitizeInput(queue.department_name)})`;
        select.appendChild(option);
    });
};

// Renderiza próximos na fila
const renderNextQueue = async () => {
    const container = document.getElementById('next-queue');
    if (!container) return;
    container.innerHTML = '';
    const queues = JSON.parse(localStorage.getItem('queues')) || [];
    if (!queues.length) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma fila disponível.</p>';
        return;
    }
    try {
        for (const queue of queues) {
            const response = await axios.get(`/api/attendant/tickets?queue_id=${queue.id}&status=pending`);
            const tickets = response.data.slice(0, 3); // Mostrar até 3 tickets pendentes
            const div = document.createElement('div');
            div.className = 'bg-gray-50 p-3 rounded-lg';
            div.innerHTML = `
                <h4 class="text-sm font-medium text-gray-700">${sanitizeInput(queue.service)} (${sanitizeInput(queue.department_name)})</h4>
                <ul class="mt-2 space-y-1">
                    ${tickets.length ? tickets.map(ticket => `
                        <li class="text-sm text-gray-600">${sanitizeInput(ticket.number)} - ${new Date(ticket.issued_at).toLocaleTimeString('pt-BR')}</li>
                    `).join('') : '<li class="text-sm text-gray-500">Nenhum ticket pendente</li>'}
                </ul>
            `;
            container.appendChild(div);
        }
    } catch (error) {
        container.innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar próximos tickets.</p>';
    }
};

// Renderiza tickets
const renderTickets = (tickets) => {
    const container = document.getElementById('tickets-container');
    if (!container) return;
    container.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum ticket disponível.</p>';
        return;
    }
    tickets.forEach(ticket => {
        const statusColor = ticket.status === 'Atendido' ? 'bg-green-100 text-green-800' :
                          ticket.status === 'Chamado' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800';
        const div = document.createElement('div');
        div.dataset.queueId = ticket.queue_id;
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(ticket.number)}</h3>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${sanitizeInput(ticket.status)}</span>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><span class="font-medium">Serviço:</span> ${sanitizeInput(ticket.service)} (${sanitizeInput(ticket.department_name)})</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Guichê:</span> ${ticket.counter || 'N/A'}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Emitido em:</span> ${new Date(ticket.issued_at).toLocaleString('pt-BR')}</p>
            </div>
            ${ticket.status === 'Pendente' ? `
            <div class="mt-4">
                <button onclick="callTicket('${ticket.queue_id}', '${ticket.id}')" class="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors">
                    <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    Chamar
                </button>
            </div>` : ''}
        `;
        container.appendChild(div);
    });
};

// Renderiza chamadas recentes
const renderRecentCalls = (calls) => {
    const tbody = document.getElementById('recent-calls-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!calls || calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return;
    }
    calls.forEach(call => {
        const statusColor = call.status === 'Atendido' ? 'bg-green-100 text-green-800' :
                          call.status === 'Chamado' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3">${sanitizeInput(call.ticket_number)}</td>
            <td class="px-4 py-3">${sanitizeInput(call.service)} (${sanitizeInput(call.department_name)})</td>
            <td class="px-4 py-3">${call.counter || 'N/A'}</td>
            <td class="px-4 py-3">${new Date(call.called_at).toLocaleString('pt-BR')}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${sanitizeInput(call.status)}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

// Renderiza filtro de chamadas
const renderCallFilter = (calls) => {
    const select = document.getElementById('call-filter');
    if (!select) return;
    select.innerHTML = '<option value="">Todas as filas</option>';
    const services = [...new Set(calls.map(call => `${call.service} (${call.department_name})`))];
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = sanitizeInput(service);
        select.appendChild(option);
    });
};

// Renderiza filtro de filas para tickets
const renderTicketQueueFilter = (tickets) => {
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
            option.textContent = `${sanitizeInput(queue.service)} (${sanitizeInput(queue.department_name)})`;
            select.appendChild(option);
        }
    });
};

// Configura eventos
const setupEventListeners = () => {
    // Logout
    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            toggleLoading(true, 'Saindo...');
            if (socket) socket.disconnect();
            clearSensitiveData();
            showToast('Sessão encerrada.', 'success');
            setTimeout(() => window.location.href = '/index.html', 1500);
        });
    }

    // Filtro de tickets
    const ticketFilter = document.getElementById('ticket-filter');
    if (ticketFilter) {
        ticketFilter.addEventListener('input', () => {
            const filter = sanitizeInput(ticketFilter.value.toLowerCase());
            document.querySelectorAll('#tickets-container > div').forEach(card => {
                const number = card.querySelector('h3').textContent.toLowerCase();
                const service = card.querySelector('p:nth-child(1)').textContent.toLowerCase();
                card.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de status
    const ticketStatusFilter = document.getElementById('ticket-status-filter');
    if (ticketStatusFilter) {
        ticketStatusFilter.addEventListener('change', () => {
            const status = ticketStatusFilter.value.toLowerCase();
            document.querySelectorAll('#tickets-container > div').forEach(card => {
                const cardStatus = card.querySelector('span').textContent.toLowerCase();
                card.style.display = status === 'all' || cardStatus === status ? '' : 'none';
            });
        });
    }

    // Filtro de filas
    const ticketQueueFilter = document.getElementById('ticket-queue-filter');
    if (ticketQueueFilter) {
        ticketQueueFilter.addEventListener('change', () => {
            const queueId = ticketQueueFilter.value;
            document.querySelectorAll('#tickets-container > div').forEach(card => {
                const ticketQueueId = card.dataset.queueId;
                card.style.display = queueId === 'all' || ticketQueueId === queueId ? '' : 'none';
            });
        });
    }

    // Navegação entre seções
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-blue-700/90'));
            btn.classList.add('active', 'bg-blue-700/90');
            const sectionId = btn.id.replace('nav-', '') + '-section';
            document.querySelectorAll('main > div').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(sectionId).classList.remove('hidden');
        });
    });

    // Botões de chamada
    const callNextBtn = document.getElementById('call-next-btn');
    if (callNextBtn) {
        callNextBtn.addEventListener('click', callNextTicket);
    }

    const recallBtn = document.getElementById('recall-btn');
    if (recallBtn) {
        recallBtn.addEventListener('click', recallTicket);
    }

    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', completeTicket);
    }

    // Validação de QR Code
    const validateQrBtn = document.getElementById('validate-qr-btn');
    const validateQrBtnTickets = document.getElementById('validate-qr-btn-tickets');
    const qrModal = document.getElementById('qr-modal');
    const qrForm = document.getElementById('qr-form');
    const closeQrModal = document.getElementById('close-qr-modal');
    const cancelQrBtn = document.getElementById('cancel-qr-btn');

    if (validateQrBtn) {
        validateQrBtn.addEventListener('click', () => qrModal.classList.remove('hidden'));
    }
    if (validateQrBtnTickets) {
        validateQrBtnTickets.addEventListener('click', () => qrModal.classList.remove('hidden'));
    }
    if (closeQrModal) {
        closeQrModal.addEventListener('click', () => qrModal.classList.add('hidden'));
    }
    if (cancelQrBtn) {
        cancelQrBtn.addEventListener('click', () => qrModal.classList.add('hidden'));
    }
    if (qrForm) {
        qrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const qrCode = document.getElementById('qr_code').value.trim();
            await validateQR(qrCode);
        });
    }

    // Atualizar fila
    const refreshQueueBtn = document.getElementById('refresh-queue');
    if (refreshQueueBtn) {
        refreshQueueBtn.addEventListener('click', renderNextQueue);
    }

    // Filtro de chamadas
    const callFilter = document.getElementById('call-filter');
    if (callFilter) {
        callFilter.addEventListener('change', () => {
            const filter = callFilter.value.toLowerCase();
            document.querySelectorAll('#recent-calls-table tr').forEach(row => {
                const service = row.cells[1].textContent.toLowerCase();
                row.style.display = filter === '' || service === filter ? '' : 'none';
            });
        });
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    toggleLoading(true, 'Carregando painel...');

    // Verificar loop de redirecionamento
    let redirectCount = parseInt(sessionStorage.getItem('redirectCount') || '0');
    const lastRedirect = sessionStorage.getItem('lastRedirect');
    const now = Date.now();
    if (lastRedirect && (now - parseInt(lastRedirect)) < 3000 && redirectCount > 2) {
        clearSensitiveData();
        showToast('Problema de autenticação. Redirecionando para login...', 'error');
        setTimeout(() => window.location.href = '/index.html', 3000);
        return;
    }
    sessionStorage.setItem('redirectCount', (redirectCount + 1).toString());
    sessionStorage.setItem('lastRedirect', now.toString());

    setupAxios();
    updateCurrentDate();
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    if (userRole !== 'ATTENDANT') {
        showToast('Acesso restrito a atendentes. Algumas funções podem estar limitadas.', 'warning');
    }

    initializeWebSocket();
    try {
        await Promise.allSettled([
            fetchUserInfo(),
            fetchQueues(),
            fetchTickets(),
            fetchRecentCalls()
        ]);
        setupEventListeners();
    } catch (error) {
        showToast('Erro ao inicializar painel. Verifique sua conexão.', 'error');
    } finally {
        toggleLoading(false);
    }
});

// Adicionar axios-retry
const axiosRetry = (axios, options) => {
    const maxRetries = options.retries || 3;
    const retryDelay = options.retryDelay || (() => 1000);
    const shouldRetry = options.retryCondition || (() => true);

    axios.interceptors.request.use(config => {
        config.__retryCount = config.__retryCount || 0;
        return config;
    });

    axios.interceptors.response.use(null, async error => {
        const config = error.config;
        if (!config || config.__retryCount >= maxRetries || !shouldRetry(error)) {
            return Promise.reject(error);
        }

        config.__retryCount += 1;
        const delay = retryDelay(config.__retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return axios(config);
    });
};