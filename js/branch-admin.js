const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
let socket = null;
let institutionId = null;
let branchId = null;

// Sanitiza entradas
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML.replace(/</g, '<').replace(/>/g, '>');
};

// Limpa dados sensíveis
const clearSensitiveData = () => {
    ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        ['adminToken', 'userRole', 'queues', 'departments', 'managers', 'schedules', 'redirectCount', 'lastRedirect'].forEach(key => storage.removeItem(key));
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

// Configura modal
const showModal = (title, formHtml, onSubmit) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">${sanitizeInput(title)}</h3>
            <form id="modal-form" class="space-y-4">
                ${formHtml}
                <div class="flex justify-end space-x-2">
                    <button type="button" id="modal-cancel" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg">Salvar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    const form = modal.querySelector('#modal-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await onSubmit(form);
        modal.remove();
    });
    modal.querySelector('#modal-cancel').addEventListener('click', () => modal.remove());
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
    axios.defaults.timeout = 15000;

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
                showToast('Recurso não encontrado.', 'warning');
            } else if (error.code === 'ECONNABORTED') {
                showToast('Tempo de conexão excedido.', 'error');
            } else if (error.message.includes('Network Error')) {
                showToast('Falha na conexão com o servidor.', 'error');
            }
            return Promise.reject(error);
        }
    );

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
        socket = io(API_BASE + '/admin', {
            transports: ['websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            query: { token }
        });
        socket.on('connect', () => {
            showToast('Conexão em tempo real estabelecida.', 'success');
            document.querySelector('.animate-pulse.bg-green-500')?.classList.remove('bg-red-500');
        });
        socket.on('connect_error', () => {
            showToast('Falha na conexão em tempo real.', 'warning');
            document.querySelector('.animate-pulse.bg-green-500')?.classList.add('bg-red-500');
        });
        socket.on('disconnect', () => {
            showToast('Conexão em tempo real perdida.', 'warning');
            document.querySelector('.animate-pulse.bg-green-500')?.classList.add('bg-red-500');
        });
        socket.on('queue_updated', () => {
            fetchQueues();
            updateDashboardMetrics();
            renderQueues();
            renderQueuesOverview();
        });
        socket.on('department_created', () => {
            fetchDepartments();
            updateDashboardMetrics();
            renderDepartments();
        });
        socket.on('user_created', () => {
            fetchManagers();
            updateDashboardMetrics();
            renderManagers();
        });
        socket.on('user_updated', () => {
            fetchManagers();
            updateDashboardMetrics();
            renderManagers();
        });
        socket.on('user_deleted', () => {
            fetchManagers();
            updateDashboardMetrics();
            renderManagers();
        });
        socket.on('branch_schedule_updated', () => {
            fetchSchedules();
            renderSchedules();
        });
    } catch (err) {
        showToast('Falha ao iniciar conexão em tempo real.', 'warning');
    }
};

// Busca informações do usuário
const fetchUserInfo = async () => {
    try {
        const response = await axios.get('/api/admin/user');
        const user = response.data;
        institutionId = user.institution_id;
        branchId = user.branch_id;
        document.getElementById('user-name').textContent = sanitizeInput(user.name || 'Gestor');
        document.getElementById('user-email').textContent = sanitizeInput(user.email || 'N/A');
        document.querySelector('#user-info .bg-indigo-500').textContent = (user.name || 'G').slice(0, 2).toUpperCase();
        return user;
    } catch (error) {
        showToast('Não foi possível carregar informações do usuário.', 'warning');
        return null;
    }
};

// Busca filas
const fetchQueues = async () => {
    try {
        toggleLoading(true, 'Carregando filas...');
        const response = await axios.get('/api/admin/queues');
        const queues = response.data;
        localStorage.setItem('queues', JSON.stringify(queues));
        renderQueues();
        renderQueuesOverview();
        updateDashboardMetrics();
        return queues;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar filas.', 'warning');
        document.getElementById('queues-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhuma fila disponível.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Busca departamentos
const fetchDepartments = async () => {
    if (!institutionId) return [];
    try {
        toggleLoading(true, 'Carregando departamentos...');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/departments`);
        const departments = response.data;
        localStorage.setItem('departments', JSON.stringify(departments));
        renderDepartments();
        updateDashboardMetrics();
        return departments;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar departamentos.', 'warning');
        document.getElementById('departments-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum departamento disponível.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Busca gestores (atendentes com papel ATTENDANT ou BRANCH_ADMIN)
const fetchManagers = async () => {
    if (!institutionId) return [];
    try {
        toggleLoading(true, 'Carregando gestores...');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/managers`);
        const managers = response.data;
        localStorage.setItem('managers', JSON.stringify(managers));
        renderManagers();
        updateDashboardMetrics();
        return managers;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar gestores.', 'warning');
        document.getElementById('attendants-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum gestor disponível.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Busca horários da filial
const fetchSchedules = async () => {
    if (!institutionId || !branchId) return [];
    try {
        toggleLoading(true, 'Carregando horários...');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/branches/${branchId}/schedules`);
        const schedules = response.data;
        localStorage.setItem('schedules', JSON.stringify(schedules));
        renderSchedules();
        return schedules;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar horários.', 'warning');
        document.getElementById('schedules-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum horário disponível.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
};

// Atualiza métricas do dashboard
const updateDashboardMetrics = async () => {
    try {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        const departments = JSON.parse(localStorage.getItem('departments')) || [];
        const managers = JSON.parse(localStorage.getItem('managers')) || [];
        document.getElementById('active-queues').textContent = queues.filter(q => q.status === 'Aberto').length;
        document.getElementById('total-departments').textContent = departments.length;
        document.getElementById('active-attendants').textContent = managers.length;
    } catch (error) {
        showToast('Falha ao atualizar métricas.', 'warning');
    }
};

// Renderiza visão geral das filas
const renderQueuesOverview = () => {
    const container = document.getElementById('queues-overview');
    if (!container) return;
    container.innerHTML = '';
    const queues = JSON.parse(localStorage.getItem('queues')) || [];

    if (!queues.length) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma fila disponível.</p>';
        return;
    }

    queues.slice(0, 5).forEach(queue => {
        const statusColor = queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const div = document.createElement('div');
        div.className = 'queue-card bg-gray-50 rounded-lg p-3 border border-gray-200 animate-zoom-in hover:shadow-lg transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <h4 class="text-lg font-semibold text-gray-800">${sanitizeInput(queue.service)}</h4>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${sanitizeInput(queue.status)}</span>
            </div>
            <p class="text-sm text-gray-600">Departamento: ${sanitizeInput(queue.department)}</p>
            <p class="text-sm text-gray-600">Tickets ativos: ${queue.active_tickets}</p>
        `;
        container.appendChild(div);
    });
};

// Renderiza filas
const renderQueues = () => {
    const container = document.getElementById('queues-container');
    if (!container) return;
    container.innerHTML = '';
    const queues = JSON.parse(localStorage.getItem('queues')) || [];

    if (!queues.length) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhuma fila disponível.</p>';
        return;
    }

    queues.forEach(queue => {
        const statusColor = queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
        const div = document.createElement('div');
        div.className = 'queue-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(queue.service)}</h3>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${sanitizeInput(queue.status)}</span>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><span class="font-medium">Departamento:</span> ${sanitizeInput(queue.department)}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Prefixo:</span> ${sanitizeInput(queue.prefix)}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Tickets ativos:</span> ${queue.active_tickets}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Limite diário:</span> ${queue.daily_limit}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Horário:</span> ${queue.open_time || 'N/A'} - ${queue.end_time || 'N/A'}</p>
            </div>
            <div class="mt-4 flex space-x-2">
                <button onclick="callNextTicket('${queue.id}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Chamar próximo ticket na fila ${queue.service}">
                    Chamar Próximo
                </button>
                <button onclick="editQueue('${queue.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Editar fila ${queue.service}">
                    Editar
                </button>
            </div>
        `;
        container.appendChild(div);
    });
};

// Renderiza departamentos
const renderDepartments = () => {
    const container = document.getElementById('departments-container');
    if (!container) return;
    container.innerHTML = '';
    const departments = JSON.parse(localStorage.getItem('departments')) || [];

    if (!departments.length) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum departamento disponível.</p>';
        return;
    }

    departments.forEach(department => {
        const div = document.createElement('div');
        div.className = 'department-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(department.name)}</h3>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><span class="font-medium">Setor:</span> ${sanitizeInput(department.sector)}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Filial:</span> ${sanitizeInput(department.branch_name)}</p>
            </div>
            <div class="mt-4 flex space-x-2">
                <button onclick="editDepartment('${department.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Editar departamento ${department.name}">
                    Editar
                </button>
                <button onclick="deleteDepartment('${department.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Excluir departamento ${department.name}">
                    Excluir
                </button>
            </div>
        `;
        container.appendChild(div);
    });
};

// Renderiza gestores
const renderManagers = () => {
    const container = document.getElementById('attendants-container');
    if (!container) return;
    container.innerHTML = '';
    const managers = JSON.parse(localStorage.getItem('managers')) || [];

    if (!managers.length) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum gestor disponível.</p>';
        return;
    }

    managers.forEach(manager => {
        const div = document.createElement('div');
        div.className = 'attendant-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(manager.name)}</h3>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><span class="font-medium">Email:</span> ${sanitizeInput(manager.email)}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Departamento:</span> ${sanitizeInput(manager.department_name)}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Filial:</span> ${sanitizeInput(manager.branch_name)}</p>
            </div>
            <div class="mt-4 flex space-x-2">
                <button onclick="editManager('${manager.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Editar gestor ${manager.name}">
                    Editar
                </button>
                <button onclick="deleteManager('${manager.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Excluir gestor ${manager.name}">
                    Excluir
                </button>
            </div>
        `;
        container.appendChild(div);
    });
};

// Renderiza horários da filial
const renderSchedules = () => {
    const container = document.getElementById('schedules-container');
    if (!container) return;
    container.innerHTML = '';
    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];

    if (!schedules.length) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum horário configurado.</p>';
        return;
    }

    schedules.forEach(schedule => {
        const div = document.createElement('div');
        div.className = 'schedule-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(schedule.weekday)}</h3>
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${schedule.is_closed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">${schedule.is_closed ? 'Fechado' : 'Aberto'}</span>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><span class="font-medium">Horário:</span> ${schedule.is_closed ? 'Fechado' : `${sanitizeInput(schedule.open_time)} - ${sanitizeInput(schedule.end_time)}`}</p>
            </div>
            <div class="mt-4 flex space-x-2">
                <button onclick="editSchedule('${schedule.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Editar horário para ${schedule.weekday}">
                    Editar
                </button>
            </div>
        `;
        container.appendChild(div);
    });
};

// Chama próximo ticket
const callNextTicket = async (queueId) => {
    try {
        toggleLoading(true, 'Chamando próximo ticket...');
        const response = await axios.post(`/api/admin/queue/${queueId}/call`);
        showToast(response.data.message, 'success');
        fetchQueues();
        updateDashboardMetrics();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao chamar próximo ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona nova fila
const addQueue = async () => {
    if (!institutionId || !branchId) {
        showToast('Informações de instituição ou filial ausentes.', 'error');
        return;
    }
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    if (!departments.length) {
        showToast('Nenhum departamento disponível para vincular.', 'warning');
        return;
    }
    showModal('Adicionar Fila', `
        <div>
            <label class="block text-sm font-medium text-gray-700">Serviço</label>
            <input type="text" name="service" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Nome do serviço">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Prefixo</label>
            <input type="text" name="prefix" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Prefixo da fila">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Limite Diário</label>
            <input type="number" name="daily_limit" required min="1" class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Limite diário de tickets">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Departamento</label>
            <select name="department_id" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Departamento da fila">
                ${departments.map(d => `<option value="${d.id}">${sanitizeInput(d.name)}</option>`).join('')}
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Serviço da Instituição</label>
            <input type="text" name="service_id" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="ID do serviço da instituição">
        </div>
    `, async (form) => {
        const data = {
            service: form.querySelector('[name="service"]').value.trim(),
            prefix: form.querySelector('[name="prefix"]').value.trim(),
            daily_limit: parseInt(form.querySelector('[name="daily_limit"]').value),
            department_id: form.querySelector('[name="department_id"]').value,
            service_id: form.querySelector('[name="service_id"]').value
        };
        if (!data.service || !data.prefix || !data.daily_limit || !data.department_id || !data.service_id) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        if (data.prefix.length > 10) {
            showToast('O prefixo deve ter no máximo 10 caracteres.', 'warning');
            return;
        }
        try {
            toggleLoading(true, 'Criando fila...');
            await axios.post(`/api/admin/queues`, data);
            showToast('Fila criada com sucesso.', 'success');
            fetchQueues();
            updateDashboardMetrics();
        } catch (error) {
            showToast(error.response?.data?.error || 'Falha ao criar fila.', 'error');
        } finally {
            toggleLoading(false);
        }
    });
};

// Edita uma fila
const editQueue = async (queueId) => {
    if (!institutionId) {
        showToast('Informações de instituição ausentes.', 'error');
        return;
    }
    const queues = JSON.parse(localStorage.getItem('queues')) || [];
    const queue = queues.find(q => q.id === queueId);
    if (!queue) {
        showToast('Fila não encontrada.', 'warning');
        return;
    }
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    showModal('Editar Fila', `
        <div>
            <label class="block text-sm font-medium text-gray-700">Serviço</label>
            <input type="text" name="service" value="${sanitizeInput(queue.service)}" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Nome do serviço">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Prefixo</label>
            <input type="text" name="prefix" value="${sanitizeInput(queue.prefix)}" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Prefixo da fila">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Limite Diário</label>
            <input type="number" name="daily_limit" value="${queue.daily_limit}" required min="1" class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Limite diário de tickets">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Departamento</label>
            <select name="department_id" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Departamento da fila">
                ${departments.map(d => `<option value="${d.id}" ${d.id === queue.department_id ? 'selected' : ''}>${sanitizeInput(d.name)}</option>`).join('')}
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Serviço da Instituição</label>
            <input type="text" name="service_id" value="${sanitizeInput(queue.service_id || '')}" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="ID do serviço da instituição">
        </div>
    `, async (form) => {
        const data = {
            service: form.querySelector('[name="service"]').value.trim(),
            prefix: form.querySelector('[name="prefix"]').value.trim(),
            daily_limit: parseInt(form.querySelector('[name="daily_limit"]').value),
            department_id: form.querySelector('[name="department_id"]').value,
            service_id: form.querySelector('[name="service_id"]').value
        };
        if (!data.service || !data.prefix || !data.daily_limit || !data.department_id || !data.service_id) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        if (data.prefix.length > 10) {
            showToast('O prefixo deve ter no máximo 10 caracteres.', 'warning');
            return;
        }
        try {
            toggleLoading(true, 'Atualizando fila...');
            await axios.put(`/api/admin/queues/${queueId}`, data);
            showToast('Fila atualizada com sucesso.', 'success');
            fetchQueues();
            updateDashboardMetrics();
        } catch (error) {
            showToast(error.response?.data?.error || 'Falha ao atualizar fila.', 'error');
        } finally {
            toggleLoading(false);
        }
    });
};

// Adiciona novo departamento
const addDepartment = async () => {
    if (!institutionId || !branchId) {
        showToast('Informações de instituição ou filial ausentes.', 'error');
        return;
    }
    showModal('Adicionar Departamento', `
        <div>
            <label class="block text-sm font-medium text-gray-700">Nome</label>
            <input type="text" name="name" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Nome do departamento">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Setor</label>
            <input type="text" name="sector" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Setor do departamento">
        </div>
        <input type="hidden" name="branch_id" value="${branchId}">
    `, async (form) => {
        const data = {
            name: form.querySelector('[name="name"]').value.trim(),
            sector: form.querySelector('[name="sector"]').value.trim(),
            branch_id: form.querySelector('[name="branch_id"]').value
        };
        if (!data.name || !data.sector) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        if (data.name.length > 50 || data.sector.length > 50) {
            showToast('Nome e setor devem ter no máximo 50 caracteres.', 'warning');
            return;
        }
        try {
            toggleLoading(true, 'Criando departamento...');
            await axios.post(`/api/admin/institutions/${institutionId}/departments`, data);
            showToast('Departamento criado com sucesso.', 'success');
            fetchDepartments();
            updateDashboardMetrics();
        } catch (error) {
            showToast(error.response?.data?.error || 'Falha ao criar departamento.', 'error');
        } finally {
           Loading(false);
        }
    });
};

// Edita um departamento
const editDepartment = async (departmentId) => {
    if (!institutionId) {
        showToast('Informações de instituição ausentes.', 'error');
        return;
    }
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    const department = departments.find(d => d.id === departmentId);
    if (!department) {
        showToast('Departamento não encontrado.', 'warning');
        return;
    }
    showModal('Editar Departamento', `
        <div>
            <label class="block text-sm font-medium text-gray-700">Nome</label>
            <input type="text" name="name" value="${sanitizeInput(department.name)}" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Nome do departamento">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Setor</label>
            <input type="text" name="sector" value="${sanitizeInput(department.sector)}" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Setor do departamento">
        </div>
        <input type="hidden" name="branch_id" value="${department.branch_id}">
    `, async (form) => {
        const data = {
            name: form.querySelector('[name="name"]').value.trim(),
            sector: form.querySelector('[name="sector"]').value.trim(),
            branch_id: form.querySelector('[name="branch_id"]').value
        };
        if (!data.name || !data.sector) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        if (data.name.length > 50 || data.sector.length > 50) {
            showToast('Nome e setor devem ter no máximo 50 caracteres.', 'warning');
            return;
        }
        try {
            toggleLoading(true, 'Atualizando departamento...');
            await axios.put(`/api/admin/institutions/${institutionId}/departments/${departmentId}`, data);
            showToast('Departamento atualizado com sucesso.', 'success');
            fetchDepartments();
            updateDashboardMetrics();
        } catch (error) {
            showToast(error.response?.data?.error || 'Falha ao atualizar departamento.', 'error');
        } finally {
            toggleLoading(false);
        }
    });
};

// Exclui um departamento
const deleteDepartment = async (departmentId) => {
    if (!institutionId) {
        showToast('Informações de instituição ausentes.', 'error');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    try {
        toggleLoading(true, 'Excluindo departamento...');
        await axios.delete(`/api/admin/institutions/${institutionId}/departments/${departmentId}`);
        showToast('Departamento excluído com sucesso.', 'success');
        fetchDepartments();
        updateDashboardMetrics();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao excluir departamento.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona novo gestor
const addManager = async () => {
    if (!institutionId || !branchId) {
        showToast('Informações de instituição ou filial ausentes.', 'error');
        return;
    }
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    if (!departments.length) {
        showToast('Nenhum departamento disponível para vincular.', 'warning');
        return;
    }
    showModal('Adicionar Gestor', `
        <div>
            <label class="block text-sm font-medium text-gray-700">Nome</label>
            <input type="text" name="name" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Nome do gestor">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Email do gestor">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Senha</label>
            <input type="password" name="password" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Senha do gestor">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Papel</label>
            <select name="user_role" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Papel do gestor">
                <option value="attendant">Atendente</option>
                <option value="branch_admin">Administrador de Filial</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Departamento</label>
            <select name="department_id" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Departamento do gestor">
                ${departments.map(d => `<option value="${d.id}">${sanitizeInput(d.name)}</option>`).join('')}
            </select>
        </div>
        <input type="hidden" name="branch_id" value="${branchId}">
    `, async (form) => {
        const data = {
            name: form.querySelector('[name="name"]').value.trim(),
            email: form.querySelector('[name="email"]').value.trim(),
            password: form.querySelector('[name="password"]').value.trim(),
            user_role: form.querySelector('[name="user_role"]').value,
            department_id: form.querySelector('[name="department_id"]').value,
            branch_id: form.querySelector('[name="branch_id"]').value
        };
        if (!data.name || !data.email || !data.password || !data.user_role || !data.department_id) {
            showToast('Todos os campos são obrigatórios.', 'warning');
            return;
        }
        if (data.password.length < 8) {
            showToast('A senha deve ter pelo menos 8 caracteres.', 'warning');
            return;
        }
        try {
            toggleLoading(true, 'Criando gestor...');
            await axios.post(`/api/admin/institutions/${institutionId}/managers`, data);
            showToast('Gestor criado com sucesso.', 'success');
            fetchManagers();
            updateDashboardMetrics();
        } catch (error) {
            showToast(error.response?.data?.error || 'Falha ao criar gestor.', 'error');
        } finally {
            toggleLoading(false);
        }
    });
};

// Edita um gestor
const editManager = async (managerId) => {
    if (!institutionId) {
        showToast('Informações de instituição ausentes.', 'error');
        return;
    }
    const managers = JSON.parse(localStorage.getItem('managers')) || [];
    const manager = managers.find(m => m.id === managerId);
    if (!manager) {
        showToast('Gestor não encontrado.', 'warning');
        return;
    }
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    showModal('Editar Gestor', `
        <div>
            <label class="block text-sm font-medium text-gray-700">Nome</label>
            <input type="text" name="name" value="${sanitizeInput(manager.name)}" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Nome do gestor">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" name="email" value="${sanitizeInput(manager.email)}" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Email do gestor">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Nova Senha (opcional)</label>
            <input type="password" name="password" class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Nova senha do gestor">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Papel</label>
            <select name="user_role" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Papel do gestor">
                <option value="attendant" ${manager.user_role === 'attendant' ? 'selected' : ''}>Atendente</option>
                <option value="branch_admin" ${manager.user_role === 'branch_admin' ? 'selected' : ''}>Administrador de Filial</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Departamento</label>
            <select name="department_id" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Departamento do gestor">
                ${departments.map(d => `<option value="${d.id}" ${d.id === manager.department_id ? 'selected' : ''}>${sanitizeInput(d.name)}</option>`).join('')}
            </select>
        </div>
        <input type="hidden" name="branch_id" value="${manager.branch_id}">
    `, async (form) => {
        const data = {
            name: form.querySelector('[name="name"]').value.trim(),
            email: form.querySelector('[name="email"]').value.trim(),
            password: form.querySelector('[name="password"]').value.trim(),
            user_role: form.querySelector('[name="user_role"]').value,
            department_id: form.querySelector('[name="department_id"]').value,
            branch_id: form.querySelector('[name="branch_id"]').value
        };
        if (!data.name || !data.email || !data.user_role || !data.department_id) {
            showToast('Campos obrigatórios não preenchidos.', 'warning');
            return;
        }
        if (data.password && data.password.length < 8) {
            showToast('A nova senha deve ter pelo menos 8 caracteres.', 'warning');
            return;
        }
        if (!data.password) delete data.password;
        try {
            toggleLoading(true, 'Atualizando gestor...');
            await axios.put(`/api/admin/institutions/${institutionId}/users/${managerId}`, data);
            showToast('Gestor atualizado com sucesso.', 'success');
            fetchManagers();
            updateDashboardMetrics();
        } catch (error) {
            showToast(error.response?.data?.error || 'Falha ao atualizar gestor NSGator.', 'error');
            return;
        } finally {
            toggleLoading(false);
        }
    });
};

// Exclui um gestor
const deleteManager = async (managerId) => {
    if (!institutionId) {
        showToast('Informações de instituição ausentes.', 'error');
        return;
    }
    if (!confirm('Tem certeza que deseja excluir este gestor?')) return;
    try {
        toggleLoading(true, 'Excluindo gestor...');
        await axios.delete(`/api/admin/institutions/${institutionId}/users/${managerId}`);
        showToast('Gestor excluído com sucesso.', 'success');
        fetchManagers();
        updateDashboardMetrics();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao excluir gestor.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona ou edita horário da filial
const editSchedule = async (scheduleId) => {
    if (!institutionId || !branchId) {
        showToast('Informações de instituição ou filial ausentes.', 'error');
        return;
    }
    const schedules = JSON.parse(localStorage.getItem('schedules')) || [];
    const schedule = schedules.find(s => s.id === scheduleId);
    showModal('Editar Horário', `
        <div>
            <label class="block text-sm font-medium text-gray-700">Dia da Semana</label>
            <select name="weekday" required class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Dia da semana">
                <option value="Monday" ${schedule?.weekday === 'Monday' ? 'selected' : ''}>Segunda-feira</option>
                <option value="Tuesday" ${schedule?.weekday === 'Tuesday' ? 'selected' : ''}>Terça-feira</option>
                <option value="Wednesday" ${schedule?.weekday === 'Wednesday' ? 'selected' : ''}>Quarta-feira</option>
                <option value="Thursday" ${schedule?.weekday === 'Thursday' ? 'selected' : ''}>Quinta-feira</option>
                <option value="Friday" ${schedule?.weekday === 'Friday' ? 'selected' : ''}>Sexta-feira</option>
                <option value="Saturday" ${schedule?.weekday === 'Saturday' ? 'selected' : ''}>Sábado</option>
                <option value="Sunday" ${schedule?.weekday === 'Sunday' ? 'selected' : ''}>Domingo</option>
            </select>
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Horário de Abertura</label>
            <input type="time" name="open_time" value="${schedule?.open_time || ''}" class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Horário de abertura">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Horário de Fechamento</label>
            <input type="time" name="end_time" value="${schedule?.end_time || ''}" class="mt-1 p-2 border rounded-lg w-full focus:ring-indigo-500" aria-label="Horário de fechamento">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Fechado</label>
            <input type="checkbox" name="is_closed" ${schedule?.is_closed ? 'checked' : ''} class="mt-1 p-2" aria-label="Fechado">
        </div>
    `, async (form) => {
        const data = {
            weekday: form.querySelector('[name="weekday"]').value,
            open_time: form.querySelector('[name="open_time"]').value || null,
            end_time: form.querySelector('[name="end_time"]').value || null,
            is_closed: form.querySelector('[name="is_closed"]').checked
        };
        if (!data.weekday) {
            showToast('O dia da semana é obrigatório.', 'warning');
            return;
        }
        if (!data.is_closed && (!data.open_time || !data.end_time)) {
            showToast('Horários de abertura e fechamento são obrigatórios se não estiver fechado.', 'warning');
            return;
        }
        try {
            toggleLoading(true, 'Atualizando horário...');
            await axios.put(`/api/admin/institutions/${institutionId}/branches/${branchId}/schedules/${scheduleId}`, data);
            showToast('Horário atualizado com sucesso.', 'success');
            fetchSchedules();
        } catch (error) {
            showToast(error.response?.data?.error || 'Falha ao atualizar horário.', 'error');
        } finally {
            toggleLoading(false);
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

    // Filtro de filas
    const queueFilter = document.getElementById('queue-filter');
    if (queueFilter) {
        queueFilter.addEventListener('input', () => {
            const filter = sanitizeInput(queueFilter.value.toLowerCase());
            document.querySelectorAll('#queues-container > div').forEach(card => {
                const service = card.querySelector('h3').textContent.toLowerCase();
                const department = card.querySelector('p:nth-child(1)').textContent.toLowerCase();
                card.style.display = service.includes(filter) || department.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de status de filas
    const queueStatusFilter = document.getElementById('queue-status-filter');
    if (queueStatusFilter) {
        queueStatusFilter.addEventListener('change', () => {
            const status = queueStatusFilter.value.toLowerCase();
            document.querySelectorAll('#queues-container > div').forEach(card => {
                const cardStatus = card.querySelector('span').textContent.toLowerCase();
                card.style.display = status === 'all' || cardStatus === status ? '' : 'none';
            });
        });
    }

    // Filtro de departamentos
    const departmentFilter = document.getElementById('department-filter');
    if (departmentFilter) {
        departmentFilter.addEventListener('input', () => {
            const filter = sanitizeInput(departmentFilter.value.toLowerCase());
            document.querySelectorAll('#departments-container > div').forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const sector = card.querySelector('p:nth-child(1)').textContent.toLowerCase();
                card.style.display = name.includes(filter) || sector.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de gestores
    const attendantFilter = document.getElementById('attendant-filter');
    if (attendantFilter) {
        attendantFilter.addEventListener('input', () => {
            const filter = sanitizeInput(attendantFilter.value.toLowerCase());
            document.querySelectorAll('#attendants-container > div').forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const email = card.querySelector('p:nth-child(1)').textContent.toLowerCase();
                card.style.display = name.includes(filter) || email.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de horários
    const scheduleFilter = document.getElementById('schedule-filter');
    if (scheduleFilter) {
        scheduleFilter.addEventListener('input', () => {
            const filter = sanitizeInput(scheduleFilter.value.toLowerCase());
            document.querySelectorAll('#schedules-container > div').forEach(card => {
                const weekday = card.querySelector('h3').textContent.toLowerCase();
                card.style.display = weekday.includes(filter) ? '' : 'none';
            });
        });
    }

    // Navegação entre seções
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active', 'bg-indigo-600'));
            btn.classList.add('active', 'bg-indigo-600');
            const sectionId = btn.id.replace('nav-', '') + '-section';
            document.querySelectorAll('main > div').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(sectionId).classList.remove('hidden');
        });
    });

    // Botões de ação
    const addQueueBtn = document.getElementById('add-queue-btn');
    if (addQueueBtn) addQueueBtn.addEventListener('click', addQueue);

    const addDepartmentBtn = document.getElementById('add-department-btn');
    if (addDepartmentBtn) addDepartmentBtn.addEventListener('click', addDepartment);

    const addAttendantBtn = document.getElementById('add-attendant-btn');
    if (addAttendantBtn) addAttendantBtn.addEventListener('click', addManager);

    const refreshQueuesBtn = document.getElementById('refresh-queues');
    if (refreshQueuesBtn) refreshQueuesBtn.addEventListener('click', renderQueuesOverview);
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
    if (userRole !== 'branch_admin') {
        showToast('Acesso restrito a administradores de filial. Algumas funções podem estar limitadas.', 'warning');
    }

    initializeWebSocket();
    try {
        await Promise.allSettled([
            fetchUserInfo(),
            fetchQueues(),
            fetchDepartments(),
            fetchManagers(),
            fetchSchedules(),
            updateDashboardMetrics()
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