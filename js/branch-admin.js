console.log('branch_admin.js carregado');

// Configurações
const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
let socket = null;

// Sanitiza entradas
const sanitizeInput = (input) => {
    if (typeof input !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML.replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

// Limpa dados sensíveis
const clearSensitiveData = () => {
    ['adminToken', 'email', 'institution_id', 'branch_id'].forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
    console.log('Dados sensíveis limpos');
};

// Obtém token
const getToken = () => localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

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
        console.log('Data atualizada:', currentDateEl.textContent);
    } else {
        console.error('Elemento #current-date não encontrado');
    }
};

// Controla spinner de carregamento
const toggleLoading = (show, message = 'Carregando...') => {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    if (loadingOverlay && loadingMessage) {
        loadingMessage.textContent = sanitizeInput(message);
        loadingOverlay.classList.toggle('hidden', !show);
        console.log('Loading:', show, message);
    } else {
        console.error('Elemento #loading-overlay ou #loading-message não encontrado');
    }
};

// Exibe notificações no toast
const showToast = (message, type = 'success') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error('Elemento #toast-container não encontrado');
        return;
    }
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
    console.log('Toast exibido:', message, type);
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

// Validações
const validateName = (name) => /^[A-Za-zÀ-ÿ\s0-9.,-]{1,100}$/.test(name);
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);

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
                console.log('Erro 401/403 detectado, redirecionando');
                setTimeout(() => {
                    clearSensitiveData();
                    if (socket) socket.disconnect();
                    window.location.href = '/index.html';
                }, 3000);
            } else if (error.response?.status === 404) {
                showToast('Recurso não encontrado.', 'warning');
            } else if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
                showToast('Problema na conexão com o servidor.', 'warning');
            }
            console.error('Erro Axios:', error.message);
            return Promise.reject(error);
        }
    );
    console.log('Axios configurado');
};

// Inicializa WebSocket
const initializeWebSocket = () => {
    const token = getToken();
    const institution_id = localStorage.getItem('institution_id');
    if (!token || !institution_id) {
        showToast('Token ou instituição não encontrados. Redirecionando...', 'error');
        console.log('Token ou institution_id ausente');
        setTimeout(() => window.location.href = '/index.html', 3000);
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
            document.querySelector('#connection-text').textContent = 'AO VIVO';
        });
        socket.on('connect_error', (error) => {
            console.error('Erro na conexão WebSocket:', error.message);
            showToast('Problema na conexão em tempo real.', 'warning');
            document.querySelector('#connection-status')?.classList.remove('bg-green-500');
            document.querySelector('#connection-status')?.classList.add('bg-red-500');
            document.querySelector('#connection-text').textContent = 'DESCONECTADO';
        });
        socket.on('disconnect', () => {
            console.log('WebSocket desconectado');
            showToast('Conexão em tempo real perdida.', 'warning');
            document.querySelector('#connection-status')?.classList.remove('bg-green-500');
            document.querySelector('#connection-status')?.classList.add('bg-red-500');
            document.querySelector('#connection-text').textContent = 'DESCONECTADO';
        });
        socket.on('queue_updated', () => {
            debouncedLoadDashboard();
            debouncedLoadQueues();
        });
        socket.on('department_created', debouncedLoadDepartments);
        socket.on('user_created', debouncedLoadAttendants);
    } catch (err) {
        console.error('Erro ao iniciar WebSocket:', err);
        showToast('Falha ao iniciar conexão em tempo real.', 'error');
    }
};

// Busca informações do usuário
const fetchUserInfo = async () => {
    try {
        const email = localStorage.getItem('email') || 'N/A';
        document.getElementById('user-name').textContent = sanitizeInput(email.split('@')[0]);
        document.getElementById('user-email').textContent = sanitizeInput(email);
        const userInitials = email.split('@')[0].slice(0, 2).toUpperCase() || 'JD';
        document.querySelector('#user-info .bg-indigo-500').textContent = userInitials;
        console.log('Informações do usuário carregadas:', email);
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        showToast('Não foi possível carregar informações do usuário.', 'warning');
    }
};

// Carrega dashboard
const loadDashboard = async () => {
    try {
        toggleLoading(true, 'Carregando painel...');
        const institutionId = localStorage.getItem('institution_id');
        const branchId = localStorage.getItem('branch_id');

        // Buscar filas
        const queuesRes = await axios.get('/api/admin/queues', { params: { branch_id: branchId } });
        const queues = queuesRes.data.queues || [];
        document.getElementById('active-queues').textContent = queues.filter(q => q.status === 'Aberto').length;

        // Buscar atendentes
        const attendantsRes = await axios.get(`/api/admin/institutions/${institutionId}/department_admins`);
        document.getElementById('active-attendants').textContent = attendantsRes.data.attendants.filter(a => a.active).length;

        // Buscar departamentos
        const departmentsRes = await axios.get(`/api/admin/institutions/${institutionId}/departments`);
        document.getElementById('total-departments').textContent = departmentsRes.data.departments.length;

        // Buscar horários
        const branchesRes = await axios.get(`/api/admin/institutions/${institutionId}/branches`);
        const schedulesCount = branchesRes.data.branches.find(b => b.id === parseInt(branchId))?.schedules?.length || 0;
        document.getElementById('configured-schedules').textContent = schedulesCount;

        // Renderizar visão geral das filas
        const queuesOverview = document.getElementById('queues-overview');
        queuesOverview.innerHTML = queues.length ? queues.slice(0, 5).map(queue => `
            <div class="queue-card bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                <div class="flex items-center justify-between">
                    <h4 class="font-medium text-gray-800">${sanitizeInput(queue.service)}</h4>
                    <span class="text-xs px-2 py-1 rounded-full ${queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${sanitizeInput(queue.status)}</span>
                </div>
                <p class="text-sm text-gray-600 mt-1">Departamento: ${sanitizeInput(queue.department)}</p>
                <p class="text-sm text-gray-600">Senhas ativas: ${queue.active_tickets || 0}</p>
                <button class="call-next-btn mt-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-queue-id="${queue.id}" ${queue.status !== 'Aberto' ? 'disabled' : ''}>Chamar Próximo</button>
            </div>
        `).join('') : '<p class="text-gray-500 text-center">Nenhuma fila disponível.</p>';
        console.log('Dashboard carregado:', queues.length, 'filas');
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showToast('Falha ao carregar painel.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Carrega filas
const loadQueues = async () => {
    try {
        toggleLoading(true, 'Carregando filas...');
        const branchId = localStorage.getItem('branch_id');
        const response = await axios.get('/api/admin/queues', { params: { branch_id: branchId } });
        const queues = response.data.queues || [];
        renderQueues(queues);
        console.log('Filas carregadas:', queues.length);
    } catch (error) {
        console.error('Erro ao carregar filas:', error);
        showToast('Falha ao carregar filas.', 'error');
        document.getElementById('queues-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhuma fila disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Carrega departamentos
const loadDepartments = async () => {
    try {
        toggleLoading(true, 'Carregando departamentos...');
        const institutionId = localStorage.getItem('institution_id');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/departments`);
        const departments = response.data.departments || [];
        renderDepartments(departments);
        console.log('Departamentos carregados:', departments.length);
    } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
        showToast('Falha ao carregar departamentos.', 'error');
        document.getElementById('departments-container').innerHTML = '<p class="text-gray-500 text-center">Nenhum departamento disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Carrega atendentes
const loadAttendants = async () => {
    try {
        toggleLoading(true, 'Carregando atendentes...');
        const institutionId = localStorage.getItem('institution_id');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/department_admins`);
        const attendants = response.data.attendants || [];
        renderAttendants(attendants);
        console.log('Atendentes carregados:', attendants.length);
    } catch (error) {
        console.error('Erro ao carregar atendentes:', error);
        showToast('Falha ao carregar atendentes.', 'error');
        document.getElementById('attendants-container').innerHTML = '<p class="text-gray-500 text-center">Nenhum atendente disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Carrega horários
const loadSchedules = async () => {
    try {
        toggleLoading(true, 'Carregando horários...');
        const institutionId = localStorage.getItem('institution_id');
        const branchId = localStorage.getItem('branch_id');
        const response = await axios.get(`/api/admin/institutions/${institutionId}/branches`);
        const branch = response.data.branches.find(b => b.id === parseInt(branchId));
        const schedules = branch?.schedules || [];
        renderSchedules(schedules);
        console.log('Horários carregados:', schedules.length);
    } catch (error) {
        console.error('Erro ao carregar horários:', error);
        showToast('Falha ao carregar horários.', 'error');
        document.getElementById('schedules-container').innerHTML = '<p class="text-gray-500 text-center">Nenhum horário disponível.</p>';
    } finally {
        toggleLoading(false);
    }
};

// Renderiza filas
const renderQueues = (queues) => {
    const container = document.getElementById('queues-container');
    if (!container) {
        console.error('Elemento #queues-container não encontrado');
        return;
    }
    container.innerHTML = queues.length ? queues.map(queue => `
        <div class="queue-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in" data-queue-id="${queue.id}">
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-semibold text-gray-800">${sanitizeInput(queue.service)}</h3>
                <span class="text-xs px-2 py-1 rounded-full ${queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${sanitizeInput(queue.status)}</span>
            </div>
            <p class="text-sm text-gray-600">Prefixo: ${sanitizeInput(queue.prefix)}</p>
            <p class="text-sm text-gray-600">Departamento: ${sanitizeInput(queue.department)}</p>
            <p class="text-sm text-gray-600">Senhas ativas: ${queue.active_tickets || 0}</p>
            <div class="flex space-x-2 mt-4">
                <button class="call-next-btn flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-queue-id="${queue.id}" ${queue.status !== 'Aberto' ? 'disabled' : ''}>Chamar Próximo</button>
                <button class="edit-queue-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-queue-id="${queue.id}">Editar</button>
            </div>
        </div>
    `).join('') : '<p class="text-gray-500 text-center col-span-full">Nenhuma fila disponível.</p>';
};

// Renderiza departamentos
const renderDepartments = (departments) => {
    const container = document.getElementById('departments-container');
    if (!container) {
        console.error('Elemento #departments-container não encontrado');
        return;
    }
    container.innerHTML = departments.length ? departments.map(dept => `
        <div class="department-card bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-zoom-in" data-department-id="${dept.id}">
            <h3 class="font-semibold text-gray-800">${sanitizeInput(dept.name)}</h3>
            <p class="text-sm text-gray-600 mt-1">Setor: ${sanitizeInput(dept.sector)}</p>
            <p class="text-sm text-gray-600">Filial: ${sanitizeInput(dept.branch_name)}</p>
            <div class="flex space-x-2 mt-4">
                <button class="edit-department-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-department-id="${dept.id}">Editar</button>
                <button class="delete-department-btn flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" data-department-id="${dept.id}">Excluir</button>
            </div>
        </div>
    `).join('') : '<p class="text-gray-500 text-center">Nenhum departamento disponível.</p>';
};

// Renderiza atendentes
const renderAttendants = (attendants) => {
    const container = document.getElementById('attendants-container');
    if (!container) {
        console.error('Elemento #attendants-container não encontrado');
        return;
    }
    container.innerHTML = attendants.length ? attendants.map(attendant => `
        <div class="attendant-card bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-zoom-in" data-user-id="${attendant.id}">
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
        </div>
    `).join('') : '<p class="text-gray-500 text-center">Nenhum atendente disponível.</p>';
};

// Renderiza horários
const renderSchedules = (schedules) => {
    const container = document.getElementById('schedules-container');
    if (!container) {
        console.error('Elemento #schedules-container não encontrado');
        return;
    }
    container.innerHTML = schedules.length ? schedules.map(schedule => `
        <div class="schedule-card bg-white p-6 rounded-xl shadow-lg border border-gray-200 animate-zoom-in" data-schedule-id="${schedule.id}">
            <h3 class="font-semibold text-gray-800">${sanitizeInput(schedule.weekday)}</h3>
            <p class="text-sm text-gray-600 mt-1">${schedule.is_closed ? 'Fechado' : `${sanitizeInput(schedule.open_time)} - ${sanitizeInput(schedule.end_time)}`}</p>
            <div class="flex space-x-2 mt-4">
                <button class="edit-schedule-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-schedule-id="${schedule.id}">Editar</button>
            </div>
        </div>
    `).join('') : '<p class="text-gray-500 text-center">Nenhum horário disponível.</p>';
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
                ${buttons.map(btn => `<button class="${btn.class}" ${btn.onclick ? `onclick="${btn.onclick}"` : ''}>${sanitizeInput(btn.label)}</button>`).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    console.log('Modal criado:', title);
    return modal;
};

// Carrega departamentos para filtro
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
        console.log('Filtro de departamentos carregado:', departments.length);
        return departments;
    } catch (error) {
        console.error('Erro ao carregar filtro de departamentos:', error);
        showToast('Falha ao carregar departamentos.', 'error');
        return [];
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
        console.log('Campos de fila incompletos');
        return;
    }

    try {
        toggleLoading(true, 'Adicionando fila...');
        await axios.post('/api/admin/queues', {
            service,
            prefix,
            daily_limit: parseInt(limit),
            department_id: parseInt(departmentId)
        });
        showToast('Fila adicionada com sucesso.', 'success');
        document.querySelector('.modal-content').closest('.fixed').remove();
        loadQueues();
        console.log('Fila adicionada');
    } catch (error) {
        console.error('Erro ao adicionar fila:', error);
        showToast('Falha ao adicionar fila.', 'error');
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
        console.log('Campos de departamento incompletos');
        return;
    }

    if (!validateName(name) || !validateName(sector)) {
        showToast('Nome ou setor inválido.', 'error');
        console.log('Validação de departamento falhou');
        return;
    }

    try {
        toggleLoading(true, 'Adicionando departamento...');
        const institutionId = localStorage.getItem('institution_id');
        const branchId = localStorage.getItem('branch_id');
        await axios.post(`/api/admin/institutions/${institutionId}/departments`, {
            name,
            sector,
            branch_id: parseInt(branchId)
        });
        showToast('Departamento adicionado com sucesso.', 'success');
        document.querySelector('.modal-content').closest('.fixed').remove();
        loadDepartments();
        loadQueueDepartmentFilter();
        console.log('Departamento adicionado');
    } catch (error) {
        console.error('Erro ao adicionar departamento:', error);
        showToast('Falha ao adicionar departamento.', 'error');
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

    if (!name || !email || !password || !departmentId || !role) {
        showToast('Preencha todos os campos.', 'error');
        console.log('Campos de atendente incompletos');
        return;
    }

    if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) {
        showToast('Dados inválidos. Verifique nome, email ou senha.', 'error');
        console.log('Validação de atendente falhou');
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
        console.log('Atendente adicionado');
    } catch (error) {
        console.error('Erro ao adicionar atendente:', error);
        showToast('Falha ao adicionar atendente.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Chama próximo ticket
const callNextTicket = async (queueId) => {
    try {
        toggleLoading(true, 'Chamando próximo ticket...');
        await axios.post(`/api/admin/queue/${queueId}/call`);
        showToast('Próximo ticket chamado com sucesso.', 'success');
        loadDashboard();
        loadQueues();
        console.log('Ticket chamado:', queueId);
    } catch (error) {
        console.error('Erro ao chamar ticket:', error);
        showToast('Falha ao chamar próximo ticket.', 'error');
    } finally {
        toggleLoading(false);
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
            document.querySelectorAll('.hidden-md').forEach(el => el.classList.toggle('hidden'));
            showToast('Sidebar alternada', 'success');
            console.log('Sidebar toggled');
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
            console.log('Logout iniciado');
        });
    }

    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('active', 'bg-indigo-600');
                b.classList.add('hover:bg-indigo-500');
            });
            btn.classList.add('active', 'bg-indigo-600');
            btn.classList.remove('hover:bg-indigo-500');
            const sectionId = btn.id.replace('nav-', '') + '-section';
            document.querySelectorAll('main > div').forEach(section => section.classList.add('hidden'));
            document.getElementById(sectionId)?.classList.remove('hidden');
            if (sectionId === 'dashboard-section') loadDashboard();
            else if (sectionId === 'queues-section') loadQueues();
            else if (sectionId === 'departments-section') loadDepartments();
            else if (sectionId === 'attendants-section') loadAttendants();
            else if (sectionId === 'schedules-section') loadSchedules();
            console.log('Navegação para:', sectionId);
        });
    });

    // Filtro de filas
    const queueFilter = document.getElementById('queue-filter');
    if (queueFilter) {
        queueFilter.addEventListener('input', () => {
            const filter = sanitizeInput(queueFilter.value.toLowerCase());
            document.querySelectorAll('#queues-container .queue-card').forEach(card => {
                const service = card.querySelector('h3').textContent.toLowerCase();
                const department = card.querySelector('p:nth-child(3)').textContent.toLowerCase();
                card.style.display = service.includes(filter) || department.includes(filter) ? '' : 'none';
            });
            console.log('Filtro de filas aplicado:', filter);
        });
    }

    // Filtro de status de filas
    const queueStatusFilter = document.getElementById('queue-status-filter');
    if (queueStatusFilter) {
        queueStatusFilter.addEventListener('change', () => {
            const status = queueStatusFilter.value === 'open' ? 'Aberto' : queueStatusFilter.value === 'closed' ? 'Fechado' : 'all';
            document.querySelectorAll('#queues-container .queue-card').forEach(card => {
                const cardStatus = card.querySelector('span').textContent;
                card.style.display = status === 'all' || cardStatus === status ? '' : 'none';
            });
            console.log('Filtro de status de filas aplicado:', status);
        });
    }

    // Filtro de departamentos para filas
    const queueDepartmentFilter = document.getElementById('queue-department-filter');
    if (queueDepartmentFilter) {
        queueDepartmentFilter.addEventListener('change', () => {
            const deptId = queueDepartmentFilter.value;
            document.querySelectorAll('#queues-container .queue-card').forEach(card => {
                const cardDeptId = card.dataset.departmentId || '';
                card.style.display = deptId === 'all' || cardDeptId === deptId ? '' : 'none';
            });
            console.log('Filtro de departamento de filas aplicado:', deptId);
        });
    }

    // Filtro de departamentos
    const departmentFilter = document.getElementById('department-filter');
    if (departmentFilter) {
        departmentFilter.addEventListener('input', () => {
            const filter = sanitizeInput(departmentFilter.value.toLowerCase());
            document.querySelectorAll('#departments-container .department-card').forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const sector = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
                card.style.display = name.includes(filter) || sector.includes(filter) ? '' : 'none';
            });
            console.log('Filtro de departamentos aplicado:', filter);
        });
    }

    // Filtro de atendentes
    const attendantFilter = document.getElementById('attendant-filter');
    if (attendantFilter) {
        attendantFilter.addEventListener('input', () => {
            const filter = sanitizeInput(attendantFilter.value.toLowerCase());
            document.querySelectorAll('#attendants-container .attendant-card').forEach(card => {
                const name = card.querySelector('h3').textContent.toLowerCase();
                const email = card.querySelector('p').textContent.toLowerCase();
                card.style.display = name.includes(filter) || email.includes(filter) ? '' : 'none';
            });
            console.log('Filtro de atendentes aplicado:', filter);
        });
    }

    // Filtro de papéis de atendentes
    const attendantRoleFilter = document.getElementById('attendant-role-filter');
    if (attendantRoleFilter) {
        attendantRoleFilter.addEventListener('change', () => {
            const role = attendantRoleFilter.value;
            document.querySelectorAll('#attendants-container .attendant-card').forEach(card => {
                const cardRole = card.querySelector('p:nth-child(4)').textContent.toLowerCase();
                card.style.display = role === 'all' || cardRole.includes(role) ? '' : 'none';
            });
            console.log('Filtro de papéis aplicado:', role);
        });
    }

    // Filtro de horários
    const scheduleFilter = document.getElementById('schedule-filter');
    if (scheduleFilter) {
        scheduleFilter.addEventListener('input', () => {
            const filter = sanitizeInput(scheduleFilter.value.toLowerCase());
            document.querySelectorAll('#schedules-container .schedule-card').forEach(card => {
                const weekday = card.querySelector('h3').textContent.toLowerCase();
                card.style.display = weekday.includes(filter) ? '' : 'none';
            });
            console.log('Filtro de horários aplicado:', filter);
        });
    }

    // Atualizar dashboard
    const refreshQueues = document.getElementById('refresh-queues');
    if (refreshQueues) {
        refreshQueues.addEventListener('click', () => {
            loadDashboard();
            console.log('Dashboard atualizado');
        });
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
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg', onclick: 'addQueue()' }
                ]
            );
            console.log('Botão de adicionar fila clicado');
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
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg', onclick: 'addDepartment()' }
                ]
            );
            console.log('Botão de adicionar departamento clicado');
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
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg', onclick: 'addAttendant()' }
                ]
            );
            console.log('Botão de adicionar atendente clicado');
        });
    }

    // Ações dinâmicas
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('call-next-btn')) {
            const queueId = e.target.dataset.queueId;
            await callNextTicket(queueId);
        } else if (e.target.classList.contains('edit-queue-btn')) {
            showToast('Edição de fila não implementada.', 'warning');
            console.log('Edição de fila clicada, não implementada');
        } else if (e.target.classList.contains('edit-department-btn')) {
            showToast('Edição de departamento não implementada.', 'warning');
            console.log('Edição de departamento clicada, não implementada');
        } else if (e.target.classList.contains('delete-department-btn')) {
            const departmentId = e.target.dataset.departmentId;
            if (confirm('Tem certeza que deseja excluir este departamento?')) {
                try {
                    toggleLoading(true, 'Excluindo departamento...');
                    const institutionId = localStorage.getItem('institution_id');
                    await axios.delete(`/api/admin/institutions/${institutionId}/departments/${departmentId}`);
                    showToast('Departamento excluído com sucesso.', 'success');
                    loadDepartments();
                    loadQueueDepartmentFilter();
                    console.log('Departamento excluído:', departmentId);
                } catch (error) {
                    console.error('Erro ao excluir departamento:', error);
                    showToast('Falha ao excluir departamento.', 'error');
                } finally {
                    toggleLoading(false);
                }
            }
        } else if (e.target.classList.contains('edit-attendant-btn')) {
            showToast('Edição de atendente não implementada.', 'warning');
            console.log('Edição de atendente clicada, não implementada');
        } else if (e.target.classList.contains('delete-attendant-btn')) {
            const userId = e.target.dataset.userId;
            if (confirm('Tem certeza que deseja excluir este atendente?')) {
                try {
                    toggleLoading(true, 'Excluindo atendente...');
                    const institutionId = localStorage.getItem('institution_id');
                    await axios.delete(`/api/admin/institutions/${institutionId}/users/${userId}`);
                    showToast('Atendente excluído com sucesso.', 'success');
                    loadAttendants();
                    console.log('Atendente excluído:', userId);
                } catch (error) {
                    console.error('Erro ao excluir atendente:', error);
                    showToast('Falha ao excluir atendente.', 'error');
                } finally {
                    toggleLoading(false);
                }
            }
        } else if (e.target.classList.contains('edit-schedule-btn')) {
            showToast('Edição de horário não implementada.', 'warning');
            console.log('Edição de horário clicada, não implementada');
        }
    });
};

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoaded disparado');
    setupAxios();
    updateCurrentDate();
    initializeWebSocket();
    await fetchUserInfo();
    await loadDashboard();
    await loadQueueDepartmentFilter();
    setupEventListeners();
    showToast('Página carregada com sucesso!', 'success');
});