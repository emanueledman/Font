const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Sanitiza entradas para evitar XSS
const sanitizeInput = (input) => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
};

// Exibe mensagens de notificação (toast)
const showToast = (message, type = 'success') => {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg text-white shadow-lg animate-slide-in toast-${type}`;
    toast.textContent = sanitizeInput(message);
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
};

// Limpa dados sensíveis
const clearSensitiveData = () => {
    console.log('Limpando dados sensíveis');
    ['localStorage', 'sessionStorage'].forEach(storageType => {
        const storage = window[storageType];
        ['adminToken', 'userRole', 'queues'].forEach(key => storage.removeItem(key));
    });
};

// Obtém token
const getToken = () => {
    return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
};

// Redireciona com base no papel do usuário
const redirectUser = (userRole) => {
    console.log('Redirecionando para:', userRole);
    switch (userRole) {
        case 'attendant':
            window.location.href = '/attendant.html';
            break;
        case 'branch_admin':
            // Já está na página correta, não redireciona
            break;
        case 'inst_admin':
            window.location.href = '/institution-admin.html';
            break;
        case 'sys_admin':
            window.location.href = '/system-admin.html';
            break;
        default:
            showToast('Papel de usuário inválido.', 'error');
            clearSensitiveData();
            window.location.href = '/index.html';
    }
};

// Verifica token com o backend
const verifyToken = async () => {
    const token = getToken();
    if (!token) {
        showToast('Nenhum token encontrado. Faça login novamente.', 'error');
        window.location.href = '/index.html';
        return null;
    }

    try {
        const response = await axios.get(`${API_BASE}/api/auth/verify-token`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;
        if (!data.user_role) {
            throw new Error('Resposta inválida: user_role ausente');
        }

        console.log('Token verificado:', { user_role: data.user_role });
        return data;
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        let message = 'Sessão expirada. Faça login novamente.';
        if (error.response) {
            message = error.response.data?.error || message;
            if (error.response.status === 401) message = 'Token inválido ou expirado.';
            else if (error.response.status === 404) message = 'Usuário não encontrado.';
            else if (error.response.status === 500) message = 'Erro no servidor.';
        } else if (error.code === 'ECONNABORTED') {
            message = 'Tempo de conexão excedido.';
        } else if (error.message.includes('Network Error')) {
            message = 'Erro de rede.';
        }
        showToast(message, 'error');
        clearSensitiveData();
        window.location.href = '/index.html';
        return null;
    }
};

// Exibe overlay de carregamento
const showLoading = (message = 'Carregando...') => {
    const overlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    loadingMessage.textContent = sanitizeInput(message);
    overlay.classList.remove('hidden');
};

// Esconde overlay de carregamento
const hideLoading = () => {
    document.getElementById('loading-overlay').classList.add('hidden');
};

// Atualiza informações do usuário na sidebar
const updateUserInfo = (userData) => {
    document.getElementById('user-name').textContent = sanitizeInput(userData.name || 'Usuário');
    document.getElementById('user-email').textContent = sanitizeInput(userData.email);
    const initials = userData.name ? userData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'JD';
    document.querySelector('#user-info .rounded-full').textContent = initials;
};

// Atualiza data atual
const updateCurrentDate = () => {
    const dateElement = document.getElementById('current-date');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('pt-BR', options);
};

// Alterna entre seções
const toggleSection = (sectionId) => {
    const sections = ['dashboard-section', 'queues-section', 'departments-section', 'attendants-section', 'schedules-section'];
    sections.forEach(id => {
        document.getElementById(id).classList.toggle('hidden', id !== sectionId);
    });

    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.id === `nav-${sectionId.split('-')[0]}`);
    });
};

// Carrega dados do dashboard
const loadDashboardData = async (userData) => {
    try {
        showLoading('Carregando dados do dashboard...');
        const response = await axios.get(`${API_BASE}/api/admin/login`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const data = response.data;
        document.getElementById('active-queues').textContent = data.queues?.length || 0;
        document.getElementById('active-attendants').textContent = data.attendants?.length || 0;
        document.getElementById('total-departments').textContent = data.departments?.length || 0;
        document.getElementById('configured-schedules').textContent = 'N/A'; // Ajustar conforme endpoint de horários

        const queuesOverview = document.getElementById('queues-overview');
        queuesOverview.innerHTML = '';
        data.queues?.forEach(queue => {
            const queueCard = document.createElement('div');
            queueCard.className = 'queue-card bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200';
            queueCard.innerHTML = `
                <h4 class="font-semibold text-gray-800">${sanitizeInput(queue.service)}</h4>
                <p class="text-sm text-gray-600">Departamento: ${sanitizeInput(queue.department)}</p>
                <p class="text-sm text-gray-600">Status: ${sanitizeInput(queue.status)}</p>
                <p class="text-sm text-gray-600">Senhas ativas: ${queue.active_tickets}</p>
            `;
            queuesOverview.appendChild(queueCard);
        });

        hideLoading();
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showToast('Erro ao carregar dados do dashboard.', 'error');
        hideLoading();
    }
};

// Inicializa Socket.IO
const initSocket = () => {
    const socket = io(API_BASE, {
        auth: { token: getToken() }
    });

    socket.on('connect', () => {
        document.getElementById('connection-status').classList.add('bg-green-500');
        document.getElementById('connection-text').textContent = 'AO VIVO';
    });

    socket.on('disconnect', () => {
        document.getElementById('connection-status').classList.remove('bg-green-500');
        document.getElementById('connection-status').classList.add('bg-red-500');
        document.getElementById('connection-text').textContent = 'OFFLINE';
    });

    socket.on('queue_update', (queue) => {
        showToast(`Fila ${sanitizeInput(queue.service)} atualizada: ${queue.status}`, 'success');
        loadDashboardData(); // Recarrega dados do dashboard
    });

    return socket;
};

// Função principal
document.addEventListener('DOMContentLoaded', async () => {
    // Verifica token e carrega dados do usuário
    const userData = await verifyToken();
    if (!userData) return;

    // Verifica se o usuário é branch_admin
    redirectUser(userData.user_role);

    // Atualiza interface
    updateUserInfo(userData);
    updateCurrentDate();
    toggleSection('dashboard-section');
    loadDashboardData(userData);

    // Inicializa Socket.IO
    const socket = initSocket();

    // Configura navegação
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.id.replace('nav-', '') + '-section';
            toggleSection(section);
        });
    });

    // Configura logout
    document.getElementById('logout').addEventListener('click', () => {
        socket.disconnect();
        clearSensitiveData();
        showToast('Sessão encerrada com sucesso.', 'success');
        window.location.href = '/index.html';
    });

    // Configura alternância da sidebar
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('sidebar-collapsed');
    });

    // Configura atualização de filas
    document.getElementById('refresh-queues').addEventListener('click', () => {
        loadDashboardData(userData);
        showToast('Filas atualizadas.', 'success');
    });
});