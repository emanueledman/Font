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
    ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        ['adminToken', 'userRole', 'queues', 'departments', 'attendants', 'redirectCount', 'lastRedirect'].forEach(key => storage.removeItem(key));
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
        socket = io(API_BASE, {
            transports: ['websocket'],
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
            query: { token }
        });
        socket.on('connect', () => {
            showToast('Conexão em tempo real estabelecida.', 'success');
            document.querySelector('.animate-pulse.bg-green-400')?.classList.remove('bg-red-500');
        });
        socket.on('connect_error', () => {
            showToast('Falha na conexão em tempo real.', 'warning');
            document.querySelector('.animate-pulse.bg-green-400')?.classList.add('bg-red-500');
        });
        socket.on('disconnect', () => {
            showToast('Conexão em tempo real perdida.', 'warning');
            document.querySelector('.animate-pulse.bg-green-400')?.classList.add('bg-red-500');
        });
        socket.on('queue_updated', () => {
            fetchQueues();
            updateDashboardMetrics();
            renderQueues();
            renderQueuesOverview();
        });
        socket.on('attendant_updated', () => {
            fetchAttendants();
            updateDashboardMetrics();
            renderAttendants();
        });
        socket.on('department_updated', () => {
            fetchDepartments();
            updateDashboardMetrics();
            renderDepartments();
        });
    } catch (err) {
        showToast('Falha ao iniciar conexão em tempo real.', 'warning');
    }
};

// Busca informações do usuário
const fetchUserInfo = async () => {
    try {
        const response = await axios.get('/api/attendant/user');
        const user = response.data;
        document.getElementById('user-name').textContent = sanitizeInput(user.name || 'Administrador');
        document.getElementById('user-email').textContent = sanitizeInput(user.email || 'N/A');
        document.querySelector('#user-info .bg-indigo-500').textContent = (user.name || 'A').slice(0, 2).toUpperCase();
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
        const response = await axios.get('/api/attendant/queues');
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
    try {
        toggleLoading(true, 'Carregando departamentos...');
        const response = await axios.get('/api/branch/departments');
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

// Busca atendentes
const fetchAttendants = async () => {
    try {
        toggleLoading(true, 'Carregando atendentes...');
        const response = await axios.get('/api/branch/attendants');
        const attendants = response.data;
        localStorage.setItem('attendants', JSON.stringify(attendants));
        renderAttendants();
        updateDashboardMetrics();
        return attendants;
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao carregar atendentes.', 'warning');
        document.getElementById('attendants-container').innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum atendente disponível.</p>';
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
        const attendants = JSON.parse(localStorage.getItem('attendants')) || [];
        document.getElementById('active-queues').textContent = queues.filter(q => q.status === 'Aberto').length;
        document.getElementById('total-departments').textContent = departments.length;
        document.getElementById('active-attendants').textContent = attendants.length;
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
                <button onclick="editQueue('${queue.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Editar fila ${queue.service}">
                    Editar
                </button>
                <button onclick="deleteQueue('${queue.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Excluir fila ${queue.service}">
                    Excluir
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

// Renderiza atendentes
const renderAttendants = () => {
    const container = document.getElementById('attendants-container');
    if (!container) return;
    container.innerHTML = '';
    const attendants = JSON.parse(localStorage.getItem('attendants')) || [];

    if (!attendants.length) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum atendente disponível.</p>';
        return;
    }

    attendants.forEach(attendant => {
        const div = document.createElement('div');
        div.className = 'attendant-card bg-white rounded-xl shadow-lg p-6 border border-gray-200 animate-zoom-in hover:shadow-xl transition-all';
        div.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${sanitizeInput(attendant.name)}</h3>
            </div>
            <div class="space-y-2">
                <p class="text-sm text-gray-600"><span class="font-medium">Email:</span> ${sanitizeInput(attendant.email)}</p>
                <p class="text-sm text-gray-600"><span class="font-medium">Filial:</span> ${sanitizeInput(attendant.branch_name)}</p>
            </div>
            <div class="mt-4 flex space-x-2">
                <button onclick="editAttendant('${attendant.id}')" class="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Editar atendente ${attendant.name}">
                    Editar
                </button>
                <button onclick="deleteAttendant('${attendant.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors" aria-label="Excluir atendente ${attendant.name}">
                    Excluir
                </button>
            </div>
        `;
        container.appendChild(div);
    });
};

// Adiciona nova fila
const addQueue = async () => {
    // Implementar modal ou formulário para adicionar fila
    showToast('Funcionalidade de adicionar fila ainda não implementada.', 'warning');
};

// Edita uma fila
const editQueue = async (queueId) => {
    // Implementar modal ou formulário para editar fila
    showToast(`Editar fila ${queueId} ainda não implementado.`, 'warning');
};

// Exclui uma fila
const deleteQueue = async (queueId) => {
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return;
    try {
        toggleLoading(true, 'Excluindo fila...');
        await axios.delete(`/api/branch/queues/${queueId}`);
        showToast('Fila excluída com sucesso.', 'success');
        fetchQueues();
        updateDashboardMetrics();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao excluir fila.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona novo departamento
const addDepartment = async () => {
    // Implementar modal ou formulário para adicionar departamento
    showToast('Funcionalidade de adicionar departamento ainda não implementada.', 'warning');
};

// Edita um departamento
const editDepartment = async (departmentId) => {
    // Implementar modal ou formulário para editar departamento
    showToast(`Editar departamento ${departmentId} ainda não implementado.`, 'warning');
};

// Exclui um departamento
const deleteDepartment = async (departmentId) => {
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    try {
        toggleLoading(true, 'Excluindo departamento...');
        await axios.delete(`/api/branch/departments/${departmentId}`);
        showToast('Departamento excluído com sucesso.', 'success');
        fetchDepartments();
        updateDashboardMetrics();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao excluir departamento.', 'error');
    } finally {
        toggleLoading(false);
    }
};

// Adiciona novo atendente
const addAttendant = async () => {
    // Implementar modal ou formulário para adicionar atendente
    showToast('Funcionalidade de adicionar atendente ainda não implementada.', 'warning');
};

// Edita um atendente
const editAttendant = async (attendantId) => {
    // Implementar modal ou formulário para editar atendente
    showToast(`Editar atendente ${attendantId} ainda não implementado.`, 'warning');
};

// Exclui um atendente
const deleteAttendant = async (attendantId) => {
    if (!confirm('Tem certeza que deseja excluir este atendente?')) return;
    try {
        toggleLoading(true, 'Excluindo atendente...');
        await axios.delete(`/api/branch/attendants/${attendantId}`);
        showToast('Atendente excluído com sucesso.', 'success');
        fetchAttendants();
        updateDashboardMetrics();
    } catch (error) {
        showToast(error.response?.data?.error || 'Falha ao excluir atendente.', 'error');
    } finally {
        toggleLoading(false);
    }
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
                const sector = card.querySelector('p').textContent.toLowerCase();
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
                const email = card.querySelector('p:nth-child(1)').textContent.toLowerCase();
                card.style.display = name.includes(filter) || email.includes(filter) ? '' : 'none';
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
    if (addAttendantBtn) addAttendantBtn.addEventListener('click', addAttendant);

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
            fetchAttendants(),
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