const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
let socket = null;

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
        ['adminToken', 'userRole', 'email', 'institution_id', 'branch_id', 'queues'].forEach(key => storage.removeItem(key));
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

// Exibe notificações no toast
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

// Valida nome
const validateName = (name) => {
    return /^[A-Za-zÀ-ÿ\s0-9.,-]{1,100}$/.test(name);
};

// Valida email
const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Valida senha
const validatePassword = (password) => {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password);
};

// Configura Axios
const setupAxios = () => {
    const token = getToken();
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE;
    axios.defaults.timeout = 15000;

    axios.interceptors.response.use(
        response => response,
        async error => {
            if (error.response?.status === 401 || error.response?.status === 403) {
                showToast('Sessão expirada. Redirecionando para login...', 'error');
                setTimeout(() => {
                    clearSensitiveData();
                    if (socket) socket.disconnect();
                    window.location.href = '/index.html';
                }, 3000);
            } else if (error.response?.status === 404) {
                showToast('Recurso não encontrado.', 'warning');
            } else if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
                showToast('Problema na conexão com o servidor. Tentando novamente...', 'warning');
                if (!error.config.retryCount) {
                    error.config.retryCount = 0;
                }
                if (error.config.retryCount < 3) {
                    error.config.retryCount++;
                    await new Promise(resolve => setTimeout(resolve, error.config.retryCount * 1000));
                    return axios(error.config);
                }
            }
            return Promise.reject(error);
        }
    );
};

// Inicializa WebSocket
const initializeWebSocket = () => {
    const token = getToken();
    const institution_id = localStorage.getItem('institution_id') || '';
    if (!token || !institution_id) {
        showToast('Token ou instituição não encontrados. Redirecionando para login...', 'error');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 3000);
        return;
    }
    try {
        socket = io(`${API_BASE}/admin`, {
            transports: ['websocket'],
            reconnectionAttempts: 20,
            reconnectionDelay: 2000,
            query: { token, institution_id }
        });
        socket.on('connect', () => {
            socket.emit('join_room', { room: institution_id });
            console.log('WebSocket conectado:', socket.id, 'Room:', institution_id);
            showToast('Conexão em tempo real estabelecida.', 'success');
            document.querySelector('#connection-status')?.classList.remove('bg-red-500');
            document.querySelector('#connection-status')?.classList.add('bg-green-500');
            document.querySelector('#connection-text')?.textContent = 'AO VIVO';
        });
        socket.on('connect_error', (error) => {
            console.error('Erro na conexão WebSocket:', error.message);
            showToast('Problema temporário na conexão em tempo real. Tentando reconectar...', 'warning');
            document.querySelector('#connection-status')?.classList.remove('bg-green-500');
            document.querySelector('#connection-status')?.classList.add('bg-red-500');
            document.querySelector('#connection-text')?.textContent = 'DESCONECTADO';
        });
        socket.on('disconnect', () => {
            console.log('WebSocket desconectado');
            showToast('Conexão em tempo real perdida. Tentando reconectar...', 'warning');
            document.querySelector('#connection-status')?.classList.remove('bg-green-500');
            document.querySelector('#connection-status')?.classList.add('bg-red-500');
            document.querySelector('#connection-text')?.textContent = 'DESCONECTADO';
        });
        socket.on('department_created', debouncedLoadDepartments);
        socket.on('user_created', debouncedLoadAttendants);
        socket.on('queue_updated', () => {
            debouncedLoadDashboard();
            debouncedLoadQueues();
        });
    } catch (err) {
        console.error('Erro ao iniciar WebSocket:', err);
        showToast('Falha ao iniciar conexão em tempo real. Verifique sua conexão.', 'error');
    }
};

// Busca informações do usuário
const fetchUserInfo = async () => {
    try {
        const email = localStorage.getItem('email') || 'N/A';
        document.getElementById('user-name').textContent = sanitizeInput(email.split('@')[0]);
        document.getElementById('user-email').textContent = sanitizeInput(email);
        const userInitials = email.split('@')[0].slice(0, 2).toUpperCase();
        document.querySelector('#user-info .bg-indigo-500').textContent = userInitials || 'JD';
        return { email };
    } catch (error) {
        showToast('Não foi possível carregar informações do usuário.', 'warning');
        return null;
    }
};

// Busca painel de controle
const loadDashboard = async () => {
    try {
        toggleLoading(true, 'Carregando dados do painel...');
        const institutionId = localStorage.getItem('institution_id');
        const branchId = localStorage.getItem('branch_id');

        // Buscar filas do backend
        const queuesRes = await axios.get('/api/admin/queues', {
            params: { branch_id: branchId }
        });
        const queuesData = queuesRes.data.queues || [];
        localStorage.setItem('queues', JSON.stringify(queuesData));

        // Contar filas ativas
        const activeQueuesCount = queuesData.filter(q => q.status === 'Aberto').length;
        document.getElementById('active-queues').textContent = activeQueuesCount;

        // Carregar atendentes
        const attendantsRes = await axios.get(`/api/admin/institutions/${institutionId}/department_admins`);
        const activeAttendantsCount = attendantsRes.data.attendants.filter(a => a.active).length;
        document.getElementById('active-attendants').textContent = activeAttendantsCount;

        // Carregar departamentos
        const departmentsRes = await axios.get(`/api/admin/institutions/${institutionId}/departments`);
        document.getElementById('total-departments').textContent = departmentsRes.data.departments.length;

        // Carregar horários
        const branchesRes = await axios.get(`/api/admin/institutions/${institutionId}/branches`);
        const schedulesCount = branchesRes.data.branches.find(b => b.id === parseInt(branchId))?.schedules?.length || 0;
        document.getElementById('configured-schedules').textContent = schedulesCount;

        // Renderizar visão geral das filas
        const queuesOverview = document.getElementById('queues-overview');
        if (queuesOverview) {
            queuesOverview.innerHTML = queuesData.length ? queuesData.slice(0, 5).map(queue => `
                <div class="queue-card bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                    <div class="flex items-center justify-between">
                        <h4 class="font-medium text-gray-800">${sanitizeInput(queue.service)}</h4>
                        <span class="text-xs px-2 py-1 rounded-full ${queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : queue.status === 'Fechado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${sanitizeInput(queue.status)}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">Departamento: ${sanitizeInput(queue.department)}</p>
                    <p class="text-sm text-gray-600">Senhas ativas: ${queue.active_tickets || 0}</p>
                    <p class="text-sm text-gray-600">Tempo médio: ${queue.avg_wait_time || 'N/A'}</p>
                    <button class="call-next-btn mt-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-queue-id="${queue.id}" ${queue.status !== 'Aberto' ? 'disabled' : ''}>Chamar Próximo</button>
                </div>
            `).join('') : '<p class="text-gray-500 text-center">Nenhuma fila disponível.</p>';
        }
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar painel.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Busca filas
const loadQueues = async () => {
    try {
        toggleLoading(true, 'Carregando filas...');
        const branchId = localStorage.getItem('branch_id');
        const response = await axios.get('/api/admin/queues', {
            params: {
                page: 1,
                per_page: 20,
                branch_id: branchId
            }
        });
        const queues = response.data.queues || [];
        localStorage.setItem('queues', JSON.stringify(queues));
        renderQueues(queues);
        renderQueueFilters(queues);
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar filas.', 'error');
        document.getElementById('queues-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhuma fila disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Busca departamentos
const loadDepartments = async () => {
    try {
        toggleLoading(true, 'Carregando departamentos...');
        const institutionId = localStorage.getItem('institution_id');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/departments`, {
            params: { page: 1, per_page: 20 }
        });
        const departments = response.data.departments || [];
        renderDepartments(departments);
        renderDepartmentFilters(departments);
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar departamentos.', 'error');
        document.getElementById('departments-container').innerHTML = '<p class="text-gray-500 text-center">Nenhum departamento disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Busca atendentes
const loadAttendants = async () => {
    try {
        toggleLoading(true, 'Carregando atendentes...');
        const institutionId = localStorage.getItem('institution_id');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/department_admins`, {
            params: { page: 1, per_page: 20 }
        });
        const attendants = response.data.attendants || [];
        renderAttendants(attendants);
        renderAttendantFilters(attendants);
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar atendentes.', 'error');
        document.getElementById('attendants-container').innerHTML = '<p class="text-gray-500 text-center">Nenhum atendente disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Busca horários
const loadSchedules = async () => {
    try {
        toggleLoading(true, 'Carregando horários...');
        const institutionId = localStorage.getItem('institution_id');
        const branchId = localStorage.getItem('branch_id');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/branches`);
        const branch = response.data.branches.find(b => b.id === parseInt(branchId));
        const schedules = branch?.schedules || [];
        renderSchedules(schedules);
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar horários.', 'error');
        document.getElementById('schedules-container').innerHTML = '<p class="text-gray-500 text-center">Nenhum horário disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Renderiza filas
const renderQueues = (queues) => {
    const container = document.getElementById('queues-container');
    if (!container) return;
    if (!queues || queues.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhuma fila disponível.</p>';
        return;
    }
    const fragment = document.createDocumentFragment();
    queues.forEach(queue => {
        const div = document.createElement('div');
        div.dataset.queueId = queue.id;
        div.className = 'queue-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-semibold text-gray-800">${sanitizeInput(queue.service)}</h3>
                <span class="text-xs px-2 py-1 rounded-full ${queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : queue.status === 'Fechado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${sanitizeInput(queue.status)}</span>
            </div>
            <p class="text-sm text-gray-600">Prefixo: ${sanitizeInput(queue.prefix)}</p>
            <p class="text-sm text-gray-600">Departamento: ${sanitizeInput(queue.department)}</p>
            <p class="text-sm text-gray-600">Senhas ativas: ${queue.active_tickets || 0}/${queue.daily_limit || 'N/A'}</p>
            <p class="text-sm text-gray-600">Tempo médio: ${queue.avg_wait_time || 'N/A'}</p>
            <div class="flex space-x-2 mt-4">
                <button class="call-next-btn flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-queue-id="${queue.id}" ${queue.status !== 'Aberto' ? 'disabled' : ''}>Chamar Próximo</button>
                <button class="edit-queue-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-queue-id="${queue.id}">Editar</button>
            </div>
        `;
        fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
};

// Renderiza departamentos
const renderDepartments = (departments) => {
    const container = document.getElementById('departments-container');
    if (!container) return;
    if (!departments || departments.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhum departamento disponível.</p>';
        return;
    }
    const fragment = document.createDocumentFragment();
    departments.forEach(dept => {
        const div = document.createElement('div');
        div.dataset.departmentId = dept.id;
        div.className = 'department-card bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <h3 class="font-semibold text-gray-800">${sanitizeInput(dept.name)}</h3>
            <p class="text-sm text-gray-600 mt-1">Setor: ${sanitizeInput(dept.sector)}</p>
            <p class="text-sm text-gray-600">Filial: ${sanitizeInput(dept.branch_name)}</p>
            <div class="flex space-x-2 mt-4">
                <button class="edit-department-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-department-id="${dept.id}">Editar</button>
                <button class="delete-department-btn flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" data-department-id="${dept.id}">Excluir</button>
            </div>
        `;
        fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
};

// Renderiza atendentes
const renderAttendants = (attendants) => {
    const container = document.getElementById('attendants-container');
    if (!container) return;
    if (!attendants || attendants.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhum atendente disponível.</p>';
        return;
    }
    const fragment = document.createDocumentFragment();
    attendants.forEach(attendant => {
        const div = document.createElement('div');
        div.dataset.userId = attendant.id;
        div.className = 'attendant-card bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex items-center mb-2">
                <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold mr-3">
                    ${attendant.name ? attendant.name.split(' ').map(n => n[0]).join('').toUpperCase() : attendant.email.slice(0, 2).toUpperCase()}
                </div>
                <div>
                    <h3 class="font-semibold text-gray-800">${sanitizeInput(attendant.name || attendant.email)}</h3>
                    <p class="text-sm text-gray-600">${sanitizeInput(attendant.email)}</p>
                </div>
            </div>
            <p class="text-sm text-gray-600">Departamento: ${sanitizeInput(attendant.department_name || 'N/A')}</p>
            <p class="text-sm text-gray-600">Papel: ${sanitizeInput(attendant.role === 'ATTENDANT' ? 'Atendente' : 'Administrador de Filial')}</p>
            <div class="flex space-x-2 mt-4">
                <button class="edit-attendant-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-user-id="${attendant.id}">Editar</button>
                <button class="delete-attendant-btn flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" data-user-id="${attendant.id}">Excluir</button>
            </div>
        `;
        fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
};

// Renderiza horários
const renderSchedules = (schedules) => {
    const container = document.getElementById('schedules-container');
    if (!container) return;
    if (!schedules || schedules.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">Nenhum horário disponível.</p>';
        return;
    }
    const fragment = document.createDocumentFragment();
    schedules.forEach(schedule => {
        const div = document.createElement('div');
        div.dataset.scheduleId = schedule.id;
        div.className = 'schedule-card bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <h3 class="font-semibold text-gray-800">${sanitizeInput(schedule.weekday)}</h3>
            <p class="text-sm text-gray-600 mt-1">${schedule.is_closed ? 'Fechado' : `${sanitizeInput(schedule.open_time)} - ${sanitizeInput(schedule.end_time)}`}</p>
            <div class="flex space-x-2 mt-4">
                <button class="edit-schedule-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-schedule-id="${schedule.id}">Editar</button>
            </div>
        `;
        fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
};

// Renderiza filtros de filas
const renderQueueFilters = (queues) => {
    const queueFilter = document.getElementById('queue-filter');
    const queueStatusFilter = document.getElementById('queue-status-filter');
    const queueDepartmentFilter = document.getElementById('queue-department-filter');

    if (queueDepartmentFilter) {
        queueDepartmentFilter.innerHTML = '<option value="all">Todos os departamentos</option>';
        if (queues && queues.length > 0) {
            const departments = [...new Set(queues.map(q => q.department))];
            departments.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept;
                option.textContent = sanitizeInput(dept);
                queueDepartmentFilter.appendChild(option);
            });
        }
        queueDepartmentFilter.value = 'all';
    }
};

// Renderiza filtros de departamentos
const renderDepartmentFilters = (departments) => {
    const departmentFilter = document.getElementById('department-filter');
    if (departmentFilter) {
        departmentFilter.value = '';
    }
};

// Renderiza filtros de atendentes
const renderAttendantFilters = (attendants) => {
    const attendantFilter = document.getElementById('attendant-filter');
    const attendantRoleFilter = document.getElementById('attendant-role-filter');
    if (attendantRoleFilter) {
        attendantRoleFilter.innerHTML = '<option value="all">Todos os papéis</option><option value="attendant">Atendente</option><option value="branch_admin">Administrador de Filial</option>';
        attendantRoleFilter.value = 'all';
    }
};

// Cria modal genérico
const createModal = (title, content, buttons) => {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4 animate-zoom-in">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">${sanitizeInput(title)}</h3>
            <div class="modal-content">${content}</div>
            <div class="flex justify-end space-x-2 mt-6">
                ${buttons.map(btn => `<button class="${btn.class} px-4 py-2 rounded-lg" ${btn.onclick ? `onclick="${btn.onclick}"` : ''}>${sanitizeInput(btn.label)}</button>`).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
};

// Chama próximo ticket
const callNextTicket = async (queueId) => {
    try {
        toggleLoading(true, 'Chamando próximo ticket...');
        const response = await axios.post(`/api/admin/queue/${queueId}/call`);
        showToast('Próximo ticket chamado com sucesso.', 'success');
        loadDashboard();
        loadQueues();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao chamar próximo ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona nova fila
const addQueue = async () => {
    const service = document.getElementById('queue-service')?.value;
    const prefix = document.getElementById('queue-prefix')?.value;
    const limit = document.getElementById('queue-limit')?.value;
    const departmentId = document.getElementById('queue-department')?.value;

    if (!service || !prefix || !limit || !departmentId) {
        showToast('Preencha todos os campos.', 'error');
        return;
    }

    try {
        toggleLoading(true, 'Adicionando fila...');
        await axios.post('/api/admin/queues', {
            service_id: service, // Supondo que o serviço já existe
            prefix,
            daily_limit: parseInt(limit),
            department_id: departmentId
        });
        showToast('Fila adicionada com sucesso.', 'success');
        document.querySelector('.modal-content').closest('.fixed').remove();
        loadQueues();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao adicionar fila.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona novo departamento
const addDepartment = async () => {
    const name = document.getElementById('department-name')?.value;
    const sector = document.getElementById('department-sector')?.value;

    if (!name || !sector) {
        showToast('Preencha todos os campos.', 'error');
        return;
    }

    if (!validateName(name) || !/^[A-Za-zÀ-ÿ\s]{1,50}$/.test(sector)) {
        showToast('Nome ou setor inválido.', 'error');
        return;
    }

    try {
        toggleLoading(true, 'Adicionando departamento...');
        const institutionId = localStorage.getItem('institution_id');
        const branchId = localStorage.getItem('branch_id');
        await axios.post(`/api/admin/institutions/${institutionId}/departments`, {
            name,
            sector,
            branch_id: branchId
        });
        showToast('Departamento adicionado com sucesso.', 'success');
        document.querySelector('.modal-content').closest('.fixed').remove();
        loadDepartments();
        loadQueueDepartmentFilter();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao adicionar departamento.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona novo atendente
const addAttendant = async () => {
    const name = document.getElementById('attendant-name')?.value;
    const email = document.getElementById('attendant-email')?.value;
    const password = document.getElementById('attendant-password')?.value;
    const departmentId = document.getElementById('attendant-department')?.value;
    const role = document.getElementById('attendant-role')?.value;

    if (!name || !email || !password || !departmentId) {
        showToast('Preencha todos os campos.', 'error');
        return;
    }

    if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) {
        showToast('Dados inválidos. Verifique nome, email ou senha.', 'error');
        return;
    }

    try {
        toggleLoading(true, 'Adicionando atendente...');
        await axios.post(`/api/admin/departments/${departmentId}/users`, {
            name,
            email,
            password,
            role: role.toUpperCase()
        });
        showToast('Atendente adicionado com sucesso.', 'success');
        document.querySelector('.modal-content').closest('.fixed').remove();
        loadAttendants();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao adicionar atendente.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Carrega filtro de departamentos para filas
const loadQueueDepartmentFilter = async () => {
    try {
        const institutionId = localStorage.getItem('institution_id');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/departments`);
        const departments = response.data.departments || [];
        const queueDepartmentFilter = document.getElementById('queue-department-filter');
        if (queueDepartmentFilter) {
            queueDepartmentFilter.innerHTML = '<option value="all">Todos os departamentos</option>' +
                departments.map(dept => `<option value="${dept.id}">${sanitizeInput(dept.name)}</option>`).join('');
        }
        return departments;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar departamentos.', 'error');
        return [];
    }
};

// Debounced functions
const debouncedLoadDashboard = debounce(loadDashboard, 500);
const debouncedLoadQueues = debounce(loadQueues, 500);
const debouncedLoadDepartments = debounce(loadDepartments, 500);
const debouncedLoadAttendants = debounce(loadAttendants, 500);
const debouncedLoadSchedules = debounce(loadSchedules, 500);

// Configura eventos
const setupEventListeners = () => {
    // Toggle da sidebar
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('w-20');
            sidebar.classList.toggle('md:w-64');
            document.querySelectorAll('.hidden-md').forEach(el => {
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
            if (sectionId === 'queues-section') loadQueues();
            else if (sectionId === 'departments-section') loadDepartments();
            else if (sectionId === 'attendants-section') loadAttendants();
            else if (sectionId === 'schedules-section') loadSchedules();
        });
    });

    // Filtro de filas
    const queueFilter = document.getElementById('queue-filter');
    if (queueFilter) {
        queueFilter.addEventListener('input', () => {
            const filter = sanitizeInput(queueFilter.value.toLowerCase());
            document.querySelectorAll('#queues-container > div').forEach(card => {
                const service = card.querySelector('h3').textContent.toLowerCase();
                const department = card.querySelector('p:nth-child(3)').textContent.toLowerCase();
                card.style.display = service.includes(filter) || department.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de status de filas
    const queueStatusFilter = document.getElementById('queue-status-filter');
    if (queueStatusFilter) {
        queueStatusFilter.addEventListener('change', () => {
            const status = queueStatusFilter.value === 'open' ? 'Aberto' : queueStatusFilter.value === 'closed' ? 'Fechado' : 'all';
            document.querySelectorAll('#queues-container > div').forEach(card => {
                const cardStatus = card.querySelector('span').textContent;
                card.style.display = status === 'all' || cardStatus === status ? '' : 'none';
            });
        });
    }

    // Filtro de departamentos para filas
    const queueDepartmentFilter = document.getElementById('queue-department-filter');
    if (queueDepartmentFilter) {
        queueDepartmentFilter.addEventListener('change', () => {
            const dept = queueDepartmentFilter.value;
            document.querySelectorAll('#queues-container > div').forEach(card => {
                const cardDept = card.querySelector('p:nth-child(3)').textContent;
                card.style.display = dept === 'all' || cardDept === dept ? '' : 'none';
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
                const sector = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
                card.style.display = name.includes(filter) || sector.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de atendentes
    const attendantFilter = document.getElementById('attendant-filter');
    if (attendantFilter) {
        attendantFilter.addEventListener('input', () => {
            const filter = sanitizeInput(attendantFilter.value.toLowerCase());
            document.querySelectorAll('#attendants-container > div').forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const email = card.querySelector('p').textContent.toLowerCase();
                card.style.display = name.includes(filter) || email.includes(filter) ? '' : 'none';
            });
        });
    }

    // Filtro de papéis de atendentes
    const attendantRoleFilter = document.getElementById('attendant-role-filter');
    if (attendantRoleFilter) {
        attendantRoleFilter.addEventListener('change', () => {
            const role = attendantRoleFilter.value;
            document.querySelectorAll('#attendants-container > div').forEach(card => {
                const cardRole = card.querySelector('p:nth-child(4)').textContent.toLowerCase();
                card.style.display = role === 'all' || cardRole.includes(role) ? '' : 'none';
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

    // Atualizar painel
    const refreshQueues = document.getElementById('refresh-queues');
    if (refreshQueues) {
        refreshQueues.addEventListener('click', loadDashboard);
    }

    // Adicionar nova fila
    const addQueueBtn = document.getElementById('add-queue-btn');
    if (addQueueBtn) {
        addQueueBtn.addEventListener('click', async () => {
            await loadQueueDepartmentFilter();
            createModal(
                'Adicionar Nova Fila',
                `
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Serviço</label>
                            <input type="text" id="queue-service" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Nome do serviço">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Prefixo</label>
                            <input type="text" id="queue-prefix" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Ex: A, B">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Limite Diário</label>
                            <input type="number" id="queue-limit" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 100">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Departamento</label>
                            <select id="queue-department" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                                ${document.getElementById('queue-department-filter').innerHTML}
                            </select>
                        </div>
                    </div>
                `,
                [
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700', onclick: 'addQueue()' }
                ]
            );
        });
    }

    // Adicionar novo departamento
    const addDepartmentBtn = document.getElementById('add-department-btn');
    if (addDepartmentBtn) {
        addDepartmentBtn.addEventListener('click', () => {
            createModal(
                'Adicionar Novo Departamento',
                `
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Nome</label>
                            <input type="text" id="department-name" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Nome do departamento">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Setor</label>
                            <input type="text" id="department-sector" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Atendimento ao Cliente">
                        </div>
                    </div>
                `,
                [
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700', onclick: 'addDepartment()' }
                ]
            );
        });
    }

    // Adicionar novo atendente
    const addAttendantBtn = document.getElementById('add-attendant-btn');
    if (addAttendantBtn) {
        addAttendantBtn.addEventListener('click', async () => {
            await loadQueueDepartmentFilter();
            createModal(
                'Adicionar Novo Atendente',
                `
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Nome</label>
                            <input type="text" id="attendant-name" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Nome completo">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Email</label>
                            <input type="email" id="attendant-email" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="email@exemplo.com">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Senha</label>
                            <input type="password" id="attendant-password" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Mínimo 8 caracteres">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Departamento</label>
                            <select id="attendant-department" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                                ${document.getElementById('queue-department-filter').innerHTML}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Papel</label>
                            <select id="attendant-role" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option value="attendant">Atendente</option>
                                <option value="branch_admin">Administrador de Filial</option>
                            </select>
                        </div>
                    </div>
                `,
                [
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700', onclick: 'addAttendant()' }
                ]
            );
        });
    }

    // Ações em filas
    const queuesContainer = document.getElementById('queues-container');
    if (queuesContainer) {
        queuesContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('call-next-btn')) {
                const queueId = e.target.dataset.queueId;
                await callNextTicket(queueId);
            } else if (e.target.classList.contains('edit-queue-btn')) {
                showToast('Funcionalidade de edição de fila ainda não implementada.', 'warning');
            }
        });
    }

    // Ações em departamentos
    const departmentsContainer = document.getElementById('departments-container');
    if (departmentsContainer) {
        departmentsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-department-btn')) {
                const departmentId = e.target.dataset.departmentId;
                if (confirm('Tem certeza que deseja excluir este departamento?')) {
                    try {
                        toggleLoading(true, 'Excluindo departamento...');
                        const institutionId = localStorage.getItem('institution_id');
                        await axios.delete(`/api/admin/institutions/${institutionId}/departments/${departmentId}`);
                        showToast('Departamento excluído com sucesso.', 'success');
                        loadDepartments();
                        loadQueueDepartmentFilter();
                    } catch (error) {
                        showToast(error.response?.data?.error || 'Falha ao excluir departamento.', 'error');
                    } finally {
                        toggleLoading(false);
                    }
                }
            } else if (e.target.classList.contains('edit-department-btn')) {
                showToast('Funcionalidade de edição de departamento ainda não implementada.', 'warning');
            }
        });
    }

    // Ações em atendentes
    const attendantsContainer = document.getElementById('attendants-container');
    if (attendantsContainer) {
        attendantsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-attendant-btn')) {
                const userId = e.target.dataset.userId;
                if (confirm('Tem certeza que deseja excluir este atendente?')) {
                    try {
                        toggleLoading(true, 'Excluindo atendente...');
                        const institutionId = localStorage.getItem('institution_id');
                        await axios.delete(`/api/admin/institutions/${institutionId}/users/${userId}`);
                        showToast('Atendente excluído com sucesso.', 'success');
                        loadAttendants();
                    } catch (error) {
                        showToast(error.response?.data?.error || 'Falha ao excluir atendente.', 'error');
                    } finally {
                        toggleLoading(false);
                    }
                }
            } else if (e.target.classList.contains('edit-attendant-btn')) {
                showToast('Funcionalidade de edição de atendente ainda não implementada.', 'warning');
            }
        });
    }

    // Ações em horários
    const schedulesContainer = document.getElementById('schedules-container');
    if (schedulesContainer) {
        schedulesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-schedule-btn')) {
                showToast('Funcionalidade de edição de horário ainda não implementada.', 'warning');
            }
        });
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    setupAxios();
    updateCurrentDate();
    initializeWebSocket();
    await fetchUserInfo();
    await loadDashboard();
    await loadQueueDepartmentFilter();
    setupEventListeners();
});