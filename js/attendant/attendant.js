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
        ['adminToken', 'userRole', 'queues', 'tickets', 'institution_id', 'user_id'].forEach(key => storage.removeItem(key));
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
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

// Debounce para evitar atualizações excessivas
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

// Configura Axios com retry
const setupAxios = () => {
    const token = getToken();
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE;
    axios.defaults.timeout = 15000;

    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401 || error.response?.status === 403) {
                showToast('Sessão expirada. Faça login novamente.', 'error');
                setTimeout(() => {
                    clearSensitiveData();
                    if (socket) socket.disconnect();
                    window.location.href = '/index.html';
                }, 2000);
            } else if (error.response?.status === 404) {
                showToast('Recurso não encontrado.', 'warning');
            } else if (error.code === 'ECONNABORTED') {
                showToast('Tempo de conexão excedido. Verifique sua conexão.', 'error');
            } else if (error.message.includes('Network Error')) {
                showToast('Falha na conexão com o servidor. Tentando novamente...', 'error');
            }
            return Promise.reject(error);
        }
    );

    // Configura retry apenas para erros de rede
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
        showToast('Token não encontrado. Faça login novamente.', 'error');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
        return;
    }
    try {
        socket = io(`${API_BASE}/dashboard`, {
            transports: ['websocket'],
            reconnectionAttempts: 15, // Aumentado para mais tentativas
            reconnectionDelay: 2000,
            query: { 
                token, 
                institution_id: localStorage.getItem('institution_id') || '',
                user_id: localStorage.getItem('user_id') || ''
            }
        });
        socket.on('connect', () => {
            const institution_id = localStorage.getItem('institution_id') || '';
            socket.emit('join_room', { room: institution_id });
            console.log('WebSocket conectado:', socket.id, 'Room:', institution_id);
            showToast('Conexão em tempo real estabelecida.', 'success');
            document.querySelector('.w-3.h-3.bg-green-400.animate-pulse')?.classList.remove('bg-red-500');
        });
        socket.on('connect_error', (error) => {
            console.error('Erro na conexão WebSocket:', error.message);
            showToast('Problema temporário na conexão em tempo real. Tentando reconectar...', 'warning');
            document.querySelector('.w-3.h-3.bg-green-400.animate-pulse')?.classList.add('bg-red-500');
        });
        socket.on('disconnect', () => {
            console.log('WebSocket desconectado');
            showToast('Conexão em tempo real perdida. Tentando reconectar...', 'warning');
            document.querySelector('.w-3.h-3.bg-green-400.animate-pulse')?.classList.add('bg-red-500');
        });
        socket.on('ticket_called', debouncedHandleTicketCalled);
        socket.on('ticket_completed', debouncedHandleTicketUpdate);
        socket.on('ticket_recalled', debouncedHandleTicketCalled);
    } catch (err) {
        console.error('Erro ao iniciar WebSocket:', err);
        showToast('Falha ao iniciar conexão em tempo real. Verifique sua conexão.', 'error');
    }
};

// Handlers para eventos WebSocket
const debouncedHandleTicketCalled = debounce((data) => {
    updateCurrentTicket(data);
    debouncedFetchTickets();
    debouncedFetchRecentCalls();
    debouncedUpdateDashboardMetrics();
    debouncedRenderNextQueue();
    debouncedRenderQueues();
}, 500);

const debouncedHandleTicketUpdate = debounce(() => {
    debouncedFetchTickets();
    debouncedRenderNextQueue();
    debouncedRenderQueues();
    debouncedUpdateDashboardMetrics();
}, 500);

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
        const response = await axios.get('/api/attendant/user?refresh=true');
        const user = response.data;
        localStorage.setItem('institution_id', user.institution_id || '');
        localStorage.setItem('user_id', user.id || '');
        document.getElementById('user-name').textContent = sanitizeInput(user.name || 'Atendente');
        document.getElementById('user-email').textContent = sanitizeInput(user.email || 'N/A');
        const userInitials = (user.name || 'A').slice(0, 2).toUpperCase();
        document.querySelector('#user-info .bg-indigo-500').textContent = userInitials;
        return user;
    } catch (error) {
        showToast('Não foi possível carregar informações do usuário.', 'warning');
        return null;
    }
};

// Busca filas
const fetchQueues = async () => {
    try {
        const response = await axios.get('/api/attendant/queues?refresh=true');
        const queues = response.data;
        localStorage.setItem('queues', JSON.stringify(queues));
        renderQueueSelect(queues);
        renderNextQueue();
        renderQueues();
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
        const response = await axios.get('/api/attendant/tickets?refresh=true');
        const tickets = response.data;
        renderTickets(tickets);
        renderTicketQueueFilter(tickets);
        updateDashboardMetrics();
        localStorage.setItem('tickets', JSON.stringify(tickets));
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
        const response = await axios.get('/api/attendant/recent-calls?refresh=true');
        const calls = response.data;
        renderRecentCalls(calls);
        renderCallFilter(calls);
        return calls;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar chamadas recentes.', 'warning');
        document.getElementById('recent-calls').innerHTML = '<p class="text-gray-500 text-center">Nenhuma chamada recente.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Atualiza métricas do dashboard
const updateDashboardMetrics = async () => {
    try {
        const response = await axios.get('/api/attendant/tickets?refresh=true');
        const tickets = response.data;
        const pending = tickets.filter(t => t.status === 'Pendente').length;
        const called = tickets.filter(t => t.status === 'Chamado').length;
        const completed = tickets.filter(t => t.status === 'Atendido').length;
        document.getElementById('pending-tickets').textContent = pending;
        document.getElementById('called-tickets').textContent = called;
        document.getElementById('completed-tickets').textContent = completed;
    } catch (error) {
        showToast('Falha ao atualizar métricas. Tentando novamente...', 'warning');
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
        const callNextBtn = document.getElementById('call-next-btn');
        callNextBtn.disabled = true;
        const response = await axios.post('/api/attendant/call-next', { queue_id: queueId });
        showToast('Próximo ticket chamado com sucesso.', 'success');
        updateCurrentTicket(response.data);
        fetchTickets();
        fetchRecentCalls();
        updateDashboardMetrics();
        renderNextQueue();
        renderQueues();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao chamar próximo ticket.', 'error');
    } finally {
        toggleLoading(false);
        document.getElementById('call-next-btn').disabled = false;
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
        const recallBtn = document.getElementById('recall-btn');
        recallBtn.disabled = true;
        await axios.post('/api/attendant/recall', { ticket_id: currentTicket.id });
        showToast('Ticket rechamado com sucesso.', 'success');
        fetchRecentCalls();
        updateDashboardMetrics();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao rechamar ticket.', 'error');
    } finally {
        toggleLoading(false);
        document.getElementById('recall-btn').disabled = false;
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
        const completeBtn = document.getElementById('complete-btn');
        completeBtn.disabled = true;
        await axios.post('/api/attendant/complete', { ticket_id: currentTicket.id });
        showToast('Ticket finalizado com sucesso.', 'success');
        updateCurrentTicket(null);
        fetchTickets();
        fetchRecentCalls();
        updateDashboardMetrics();
        renderNextQueue();
        renderQueues();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao finalizar ticket.', 'error');
    } finally {
        toggleLoading(false);
        document.getElementById('complete-btn').disabled = false;
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
        updateDashboardMetrics();
        renderNextQueue();
        renderQueues();
        document.getElementById('qr-modal')?.classList.add('hidden');
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao validar QR Code.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Renderiza select de filas
const renderQueueSelect = (queues) => {
    const select = document.getElementById('queue-select');
    const ticketQueueFilter = document.getElementById('ticket-queue-filter');
    if (select) {
        select.innerHTML = '<option value="">Selecione uma fila</option>';
        if (!queues || queues.length === 0) {
            select.disabled = true;
        } else {
            select.disabled = false;
            queues.forEach(queue => {
                const option = document.createElement('option');
                option.value = queue.id;
                option.textContent = `${sanitizeInput(queue.service)} (${sanitizeInput(queue.department_name)})`;
                select.appendChild(option);
            });
        }
    }
    if (ticketQueueFilter) {
        ticketQueueFilter.innerHTML = '<option value="all">Todas as filas</option>';
        if (queues && queues.length > 0) {
            queues.forEach(queue => {
                const option = document.createElement('option');
                option.value = queue.id;
                option.textContent = `${sanitizeInput(queue.service)} (${sanitizeInput(queue.department_name)})`;
                ticketQueueFilter.appendChild(option);
            });
        }
        ticketQueueFilter.value = 'all';
    }
};

// Renderiza próximos na fila
const renderNextQueue = async () => {
    const container = document.getElementById('next-queue');
    if (!container) return;
    container.innerHTML = '';
    const queueSelect = document.getElementById('queue-select');
    const selectedQueueId = queueSelect.value;
    const queues = JSON.parse(localStorage.getItem('queues')) || [];

    if (!queues.length) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma fila disponível.</p>';
        return;
    }

    try {
        const filteredQueues = selectedQueueId ? queues.filter(queue => queue.id === selectedQueueId) : queues;
        for (const queue of filteredQueues) {
            const response = await axios.get(`/api/attendant/tickets?queue_id=${queue.id}&status=pending,called&refresh=true`);
            const tickets = response.data.filter(ticket => ['Pendente', 'Chamado'].includes(ticket.status)).slice(0, 5);
            if (tickets.length) {
                tickets.forEach(ticket => {
                    const statusColor = ticket.status === 'Chamado' ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-800';
                    const div = document.createElement('div');
                    div.className = 'ticket-card bg-gray-50 rounded-lg p-3 border border-gray-200 animate-zoom-in hover:shadow-lg transition-all';
                    div.innerHTML = `
                        <div class="flex justify-between items-center">
                            <h4 class="text-lg font-semibold text-gray-800">${sanitizeInput(ticket.number)}</h4>
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${sanitizeInput(ticket.status)}</span>
                        </div>
                        <p class="text-sm text-gray-600">${sanitizeInput(ticket.service)}</p>
                    `;
                    container.appendChild(div);
                });
            } else {
                const div = document.createElement('div');
                div.className = 'bg-gray-50 rounded-lg p-3 border border-gray-200';
                div.innerHTML = '<p class="text-sm text-gray-500">Nenhum ticket pendente ou chamado</p>';
                container.appendChild(div);
            }
        }
    } catch (error) {
        console.error('Erro ao renderizar próximos tickets:', error);
        container.innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar próximos tickets.</p>';
    }
};

// Renderiza tickets
const renderTickets = (tickets) => {
    const container = document.getElementById('tickets-container');
    if (!container) return;
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum ticket disponível.</p>';
        return;
    }
    const fragment = document.createDocumentFragment();
    tickets.forEach(ticket => {
        const statusColor = ticket.status === 'Atendido' ? 'bg-green-100 text-green-800' :
                          ticket.status === 'Chamado' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800';
        const div = document.createElement('div');
        div.dataset.queueId = ticket.queue_id;
        div.dataset.ticketId = ticket.id;
        div.className = 'ticket-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(ticket.number)}</h3>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${sanitizeInput(ticket.status)}</span>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><span class="font-medium">Serviço:</span> ${sanitizeInput(ticket.service)} (${sanitizeInput(ticket.department_name)})</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Guichê:</span> ${ticket.counter || 'N/A'}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Emitido em:</span> ${new Date(ticket.issued_at).toLocaleString('pt-BR')}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Espera:</span> ${typeof ticket.avg_wait_time === 'number' ? `${ticket.avg_wait_time.toFixed(1)} min` : 'N/A'}</p>
            </div>
        `;
        fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
};

// Renderiza filas
const renderQueues = async () => {
    const container = document.getElementById('queues-container');
    if (!container) return;
    container.innerHTML = '';
    const queues = JSON.parse(localStorage.getItem('queues')) || [];

    if (!queues.length) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma fila disponível.</p>';
        return;
    }

    try {
        for (const queue of queues) {
            const response = await axios.get(`/api/attendant/tickets?queue_id=${queue.id}&status=pending,called&refresh=true`);
            const tickets = response.data.slice(0, 5);
            const div = document.createElement('div');
            div.className = 'queue-card bg-white rounded-xl shadow-lg p-4 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(queue.service)}</h3>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">${tickets.length} tickets</span>
                </div>
            `;
            container.appendChild(div);
        }
    } catch (error) {
        console.error('Erro ao renderizar filas:', error);
        container.innerHTML = '<p class="text-gray-500 text-center">Erro ao carregar filas.</p>';
    }
};

// Renderiza chamadas recentes
const renderRecentCalls = (calls) => {
    const container = document.getElementById('recent-calls');
    if (!container) return;
    container.innerHTML = '';
    if (!calls || calls.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma chamada recente.</p>';
        return;
    }
    const fragment = document.createDocumentFragment();
    calls.forEach(call => {
        const statusColor = call.status === 'Atendido' ? 'bg-green-100 text-green-800' :
                          call.status === 'Chamado' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800';
        const div = document.createElement('div');
        div.className = 'call-card bg-gray-50 rounded-lg p-3 border border-gray-200 animate-zoom-in hover:shadow-lg transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="text-lg font-semibold text-gray-800">${sanitizeInput(call.ticket_number)}</h4>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${sanitizeInput(call.status)}</span>
            </div>
            <p class="text-sm text-gray-600">${sanitizeInput(call.service)}</p>
            <p class="text-sm text-gray-600">Guichê: ${call.counter || 'N/A'}</p>
        `;
        fragment.appendChild(div);
    });
    container.appendChild(fragment);
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
    select.value = 'all';
};

// Debounced functions
const debouncedFetchTickets = debounce(fetchTickets, 500);
const debouncedFetchRecentCalls = debounce(fetchRecentCalls, 500);
const debouncedUpdateDashboardMetrics = debounce(updateDashboardMetrics, 500);
const debouncedRenderNextQueue = debounce(renderNextQueue, 500);
const debouncedRenderQueues = debounce(renderQueues, 500);

// Configura eventos
const setupEventListeners = () => {
    // Toggle da sidebar
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('w-20');
            sidebar.classList.toggle('md:w-64');
            document.querySelectorAll('.hidden.md\\:block').forEach(el => {
                el.classList.toggle('hidden');
            });
        });
    }

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
        ticketQueueFilter.value = 'all';
    }

    // Filtro de filas na seção Filas
    const queueFilter = document.getElementById('queue-filter');
    if (queueFilter) {
        queueFilter.addEventListener('input', () => {
            const filter = sanitizeInput(queueFilter.value.toLowerCase());
            document.querySelectorAll('#queues-container > div').forEach(card => {
                const service = card.querySelector('h3').textContent.toLowerCase();
                card.style.display = service.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de status na seção Filas
    const queueStatusFilter = document.getElementById('queue-status-filter');
    if (queueStatusFilter) {
        queueStatusFilter.addEventListener('change', () => {
            const status = queueStatusFilter.value;
            document.querySelectorAll('#queues-container > div').forEach(card => {
                const ticketCount = parseInt(card.querySelector('span').textContent) || 0;
                if (status === 'all') {
                    card.style.display = '';
                } else if (status === 'active' && ticketCount > 0) {
                    card.style.display = '';
                } else if (status === 'empty' && ticketCount === 0) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }

    // Navegação entre seções
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active', 'bg-indigo-600');
                b.classList.add('hover:bg-indigo-500');
            });
            btn.classList.add('active', 'bg-indigo-600');
            btn.classList.remove('hover:bg-indigo-500');
            const sectionId = btn.id.replace('nav-', '') + '-section';
            document.querySelectorAll('main > div').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(sectionId)?.classList.remove('hidden');
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
        validateQrBtn.addEventListener('click', () => qrModal?.classList.remove('hidden'));
    }
    if (validateQrBtnTickets) {
        validateQrBtnTickets.addEventListener('click', () => qrModal?.classList.remove('hidden'));
    }
    if (closeQrModal) {
        closeQrModal.addEventListener('click', () => qrModal?.classList.add('hidden'));
    }
    if (cancelQrBtn) {
        cancelQrBtn.addEventListener('click', () => qrModal?.classList.add('hidden'));
    }
    if (qrForm) {
        qrForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const qrCode = document.getElementById('qr_code')?.value.trim();
            if (qrCode) await validateQR(qrCode);
        });
    }

    // Atualizar fila
    const refreshQueueBtn = document.getElementById('refresh-queue');
    if (refreshQueueBtn) {
        refreshQueueBtn.addEventListener('click', renderNextQueue);
    }

    // Atualizar filas
    const refreshQueuesBtn = document.getElementById('refresh-queues-btn');
    if (refreshQueuesBtn) {
        refreshQueuesBtn.addEventListener('click', renderQueues);
    }

    // Filtro de chamadas
    const callFilter = document.getElementById('call-filter');
    if (callFilter) {
        callFilter.addEventListener('change', () => {
            const filter = callFilter.value.toLowerCase();
            document.querySelectorAll('#recent-calls > div').forEach(card => {
                const service = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
                card.style.display = filter === '' || service.includes(filter) ? '' : 'none';
            });
        });
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    setupAxios();
    updateCurrentDate();
    initializeWebSocket();
    await fetchUserInfo();
    await fetchQueues();
    await fetchTickets();
    await fetchRecentCalls();
    setupEventListeners();
});