// js/branch-admin.js
document.addEventListener('DOMContentLoaded', () => {
    const userRole = localStorage.getItem('userRole');

    // Verificar se o usuário tem o papel correto
    if (userRole !== 'branch_admin') {
        showToast('Acesso restrito a administradores de filial.', 'error');
        setTimeout(() => window.location.href = '/index.html', 2000);
        return;
    }

    const API_BASE_URL = 'https://fila-facilita2-0-4uzw.onrender.com/api/admin';
    const socket = io('https://fila-facilita2-0-4uzw.onrender.com/admin', {
        auth: { token: localStorage.getItem('adminToken') }
    });

    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = {
        dashboard: document.getElementById('dashboard-section'),
        queues: document.getElementById('queues-section'),
        departments: document.getElementById('departments-section'),
        attendants: document.getElementById('attendants-section'),
        schedules: document.getElementById('schedules-section')
    };
    const userInfo = document.getElementById('user-info');
    const userName = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    const logoutBtn = document.getElementById('logout');
    const currentDate = document.getElementById('current-date');
    const connectionStatus = document.getElementById('connection-status');
    const connectionText = document.getElementById('connection-text');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    const activeQueues = document.getElementById('active-queues');
    const activeAttendants = document.getElementById('active-attendants');
    const totalDepartments = document.getElementById('total-departments');
    const configuredSchedules = document.getElementById('configured-schedules');
    const queuesOverview = document.getElementById('queues-overview');
    const refreshQueues = document.getElementById('refresh-queues');
    const addQueueBtn = document.getElementById('add-queue-btn');
    const queueFilter = document.getElementById('queue-filter');
    const queueStatusFilter = document.getElementById('queue-status-filter');
    const queueDepartmentFilter = document.getElementById('queue-department-filter');
    const queuesContainer = document.getElementById('queues-container');
    const addDepartmentBtn = document.getElementById('add-department-btn');
    const departmentFilter = document.getElementById('department-filter');
    const departmentsContainer = document.getElementById('departments-container');
    const addAttendantBtn = document.getElementById('add-attendant-btn');
    const attendantFilter = document.getElementById('attendant-filter');
    const attendantRoleFilter = document.getElementById('attendant-role-filter');
    const attendantsContainer = document.getElementById('attendants-container');
    const scheduleFilter = document.getElementById('schedule-filter');
    const schedulesContainer = document.getElementById('schedules-container');
    const toastContainer = document.getElementById('toast-container');

    // Utility Functions
    const showLoading = (message) => {
        if (loadingMessage && loadingOverlay) {
            loadingMessage.textContent = message;
            loadingOverlay.classList.remove('hidden');
        }
    };

    const hideLoading = () => {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    };

    const showToast = (message, type = 'success') => {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `flex items-center px-4 py-3 rounded-lg shadow-lg text-white animate-slide-in toast-${type}`;
        toast.innerHTML = `
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                ${type === 'success' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />' :
                  type === 'error' ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />' :
                  '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />'}
            </svg>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('animate-slide-out');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    };

    const handleApiError = (error) => {
        let message = 'Erro na operação. Tente novamente.';
        if (error.response) {
            message = error.response.data?.error || message;
            if (error.response.status === 401) {
                showToast('Sessão expirada. Faça login novamente.', 'error');
                localStorage.clear();
                setTimeout(() => window.location.href = '/index.html', 2000);
                return true;
            } else if (error.response.status === 403) {
                message = 'Acesso não autorizado.';
            } else if (error.response.status === 500) {
                message = 'Erro interno no servidor.';
            }
        } else if (error.code === 'ECONNABORTED') {
            message = 'Tempo de conexão esgotado.';
        } else if (error.message.includes('Network Error')) {
            message = 'Erro de rede.';
        }
        showToast(message, 'error');
        console.error('API error:', error);
        return false;
    };

    const switchSection = (sectionId) => {
        Object.values(sections).forEach(section => section?.classList.add('hidden'));
        if (sections[sectionId]) {
            sections[sectionId].classList.remove('hidden');
        }
        navButtons.forEach(btn => btn.classList.remove('active', 'bg-indigo-600'));
        const navButton = document.getElementById(`nav-${sectionId}`);
        if (navButton) {
            navButton.classList.add('active', 'bg-indigo-600');
        }
    };

    const formatDate = (date) => {
        return new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date);
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const validateName = (name) => {
        return /^[A-Za-zÀ-ÿ\s0-9.,-]{1,100}$/.test(name);
    };

    const validatePassword = (password) => {
        return password.length >= 8 &&
               /[A-Z]/.test(password) &&
               /[a-z]/.test(password) &&
               /[0-9]/.test(password);
    };

    // Initialize User Info
    const initUserInfo = () => {
        const token = localStorage.getItem('adminToken');
        const userRole = localStorage.getItem('userRole');
        const storedEmail = localStorage.getItem('email') || 'admin@queue.com';

        if (!token || !userRole) {
            showToast('Acesso não autorizado. Faça login novamente.', 'error');
            setTimeout(() => window.location.href = '/index.html', 2000);
            return null;
        }

        if (userRole !== 'branch_admin') {
            showToast('Acesso restrito a administradores de filial.', 'error');
            setTimeout(() => window.location.href = '/index.html', 2000);
            return null;
        }

        if (userName && userEmailElement && userInfo) {
            userName.textContent = storedEmail;
            userEmailElement.textContent = storedEmail;
            const initialsElement = userInfo.querySelector('.w-8');
            if (initialsElement) {
                initialsElement.textContent = storedEmail.split('@')[0].slice(0, 2).toUpperCase();
            }
        }
        return { email: storedEmail };
    };

    // API Calls
    const loadDashboard = async () => {
        try {
            showLoading('Carregando dados do painel...');
            const token = localStorage.getItem('adminToken');
            const storedQueues = localStorage.getItem('queues');
            let queuesData = storedQueues ? JSON.parse(storedQueues) : [];

            const queuesRes = await axios.get(`${API_BASE_URL}/queues`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            queuesData = queuesRes.data.queues || [];

            const activeQueuesCount = queuesData.filter(q => q.status === 'Aberto').length;
            if (activeQueues) activeQueues.textContent = activeQueuesCount;

            if (activeAttendants) activeAttendants.textContent = 'N/A';
            if (totalDepartments) totalDepartments.textContent = 'N/A';
            if (configuredSchedules) configuredSchedules.textContent = 'N/A';

            if (queuesOverview) {
                queuesOverview.innerHTML = queuesData.slice(0, 5).map(queue => `
                    <div class="queue-card bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                        <div class="flex items-center justify-between">
                            <h4 class="font-medium text-gray-800">${queue.service || 'N/A'}</h4>
                            <span class="text-xs px-2 py-1 rounded-full ${queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : queue.status === 'Fechado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${queue.status}</span>
                        </div>
                        <p class="text-sm text-gray-600 mt-1">Departamento: ${queue.department || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Senhas ativas: ${queue.active_tickets || 0}</p>
                        <p class="text-sm text-gray-600">Tempo médio: ${queue.avg_wait_time || 'N/A'}</p>
                        <button class="call-next-btn mt-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-queue-id="${queue.id}" ${queue.status !== 'Aberto' ? 'disabled' : ''}>Chamar Próximo</button>
                    </div>
                `).join('');
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

    const loadQueues = async () => {
        try {
            showLoading('Carregando filas...');
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_BASE_URL}/queues`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page: 1, per_page: 20 }
            });
            const queues = response.data.queues || [];
            if (queuesContainer) {
                queuesContainer.innerHTML = queues.map(queue => `
                    <div class="queue-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-semibold text-gray-800">${queue.service || 'N/A'}</h3>
                            <span class="text-xs px-2 py-1 rounded-full ${queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : queue.status === 'Fechado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${queue.status}</span>
                        </div>
                        <p class="text-sm text-gray-600">Prefixo: ${queue.prefix || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Departamento: ${queue.department || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Senhas ativas: ${queue.active_tickets || 0}/${queue.daily_limit || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Tempo médio: ${queue.avg_wait_time || 'N/A'}</p>
                        <div class="flex space-x-2 mt-4">
                            <button class="call-next-btn flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700" data-queue-id="${queue.id}" ${queue.status !== 'Aberto' ? 'disabled' : ''}>Chamar Próximo</button>
                            <button class="edit-queue-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-queue-id="${queue.id}">Editar</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

    const loadDepartments = async () => {
        try {
            showLoading('Carregando departamentos...');
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_BASE_URL}/institutions/1/departments`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page: 1, per_page: 20 }
            });
            const departments = response.data.departments || [];
            if (departmentsContainer) {
                departmentsContainer.innerHTML = departments.map(dept => `
                    <div class="department-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h3 class="font-semibold text-gray-800">${dept.name || 'N/A'}</h3>
                        <p class="text-sm text-gray-600 mt-1">Setor: ${dept.sector || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Filial: ${dept.branch_name || 'N/A'}</p>
                        <div class="flex space-x-2 mt-4">
                            <button class="edit-department-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-department-id="${dept.id}">Editar</button>
                            <button class="delete-department-btn flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" data-department-id="${dept.id}">Excluir</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

    const loadAttendants = async () => {
        try {
            showLoading('Carregando atendentes...');
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_BASE_URL}/institutions/1/department_admins`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { page: 1, per_page: 20 }
            });
            const attendants = response.data.attendants || [];
            if (attendantsContainer) {
                attendantsContainer.innerHTML = attendants.map(attendant => `
                    <div class="attendant-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <div class="flex items-center mb-2">
                            <div class="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold mr-3">
                                ${attendant.name ? attendant.name.split(' ').map(n => n[0]).join('').toUpperCase() : (attendant.email || '').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800">${attendant.name || attendant.email || 'N/A'}</h3>
                                <p class="text-sm text-gray-600">${attendant.email || 'N/A'}</p>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600">Departamento: ${attendant.department_name || 'N/A'}</p>
                        <p class="text-sm text-gray-600">Filial: ${attendant.branch_name || 'N/A'}</p>
                        <div class="flex space-x-2 mt-4">
                            <button class="edit-attendant-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-user-id="${attendant.id}">Editar</button>
                            <button class="delete-attendant-btn flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700" data-user-id="${attendant.id}">Excluir</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

    const loadSchedules = async () => {
        try {
            showLoading('Carregando horários...');
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_BASE_URL}/institutions/1/branches`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const branch = response.data.branches && response.data.branches[0] ? response.data.branches[0] : { schedules: [] };
            if (schedulesContainer) {
                schedulesContainer.innerHTML = (branch.schedules || []).map(schedule => `
                    <div class="schedule-card bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h3 class="font-semibold text-gray-800">${schedule.weekday || 'N/A'}</h3>
                        <p class="text-sm text-gray-600 mt-1">${schedule.is_closed ? 'Fechado' : `${schedule.open_time || 'N/A'} - ${schedule.end_time || 'N/A'}`}</p>
                        <div class="flex space-x-2 mt-4">
                            <button class="edit-schedule-btn flex-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300" data-schedule-id="${schedule.id || ''}">Editar</button>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

    const loadDepartmentsFilter = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_BASE_URL}/institutions/1/departments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const departments = response.data.departments || [];
            if (queueDepartmentFilter) {
                queueDepartmentFilter.innerHTML = '<option value="all">Todos os departamentos</option>' +
                    departments.map(dept => `<option value="${dept.id}">${dept.name || 'N/A'}</option>`).join('');
            }
        } catch (error) {
            handleApiError(error);
        }
    };

    // Modal Creation
    const createModal = (title, content, buttons) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-xl p-6 max-w-lg w-full mx-4 animate-zoom-in">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">${title}</h3>
                <div class="modal-content">${content}</div>
                <div class="flex justify-end space-x-2 mt-6">
                    ${buttons.map(btn => `<button class="${btn.class}" ${btn.onclick ? `onclick="${btn.onclick}"` : ''}>${btn.label}</button>`).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    };

    // Event Handlers
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-collapsed');
            sidebar.classList.toggle('w-64');
            sidebar.classList.toggle('w-20');
        });
    }

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const section = button.id.replace('nav-', '');
            switchSection(section);
            if (section === 'queues') loadQueues();
            else if (section === 'departments') loadDepartments();
            else if (section === 'attendants') loadAttendants();
            else if (section === 'schedules') loadSchedules();
        });
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/index.html';
        });
    }

    if (refreshQueues) {
        refreshQueues.addEventListener('click', loadDashboard);
    }

    if (queueFilter) {
        queueFilter.addEventListener('input', () => {
            const filter = queueFilter.value.toLowerCase();
            const cards = queuesContainer?.querySelectorAll('.queue-card') || [];
            cards.forEach(card => {
                const service = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const department = card.querySelector('p:nth-child(3)')?.textContent.toLowerCase() || '';
                card.style.display = (service.includes(filter) || department.includes(filter)) ? '' : 'none';
            });
        });
    }

    if (queueStatusFilter) {
        queueStatusFilter.addEventListener('change', () => {
            const status = queueStatusFilter.value;
            const cards = queuesContainer?.querySelectorAll('.queue-card') || [];
            cards.forEach(card => {
                const cardStatus = card.querySelector('span')?.textContent || '';
                card.style.display = (status === 'all' || (status === 'open' && cardStatus === 'Aberto') || (status === 'closed' && cardStatus === 'Fechado')) ? '' : 'none';
            });
        });
    }

    if (queueDepartmentFilter) {
        queueDepartmentFilter.addEventListener('change', () => {
            const deptId = queueDepartmentFilter.value;
            const cards = queuesContainer?.querySelectorAll('.queue-card') || [];
            cards.forEach(card => {
                const cardDept = card.querySelector('p:nth-child(3)')?.textContent || '';
                card.style.display = (deptId === 'all' || cardDept.includes(queueDepartmentFilter.selectedOptions[0]?.text)) ? '' : 'none';
            });
        });
    }

    if (departmentFilter) {
        departmentFilter.addEventListener('input', () => {
            const filter = departmentFilter.value.toLowerCase();
            const cards = departmentsContainer?.querySelectorAll('.department-card') || [];
            cards.forEach(card => {
                const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const sector = card.querySelector('p:nth-child(2)')?.textContent.toLowerCase() || '';
                card.style.display = (name.includes(filter) || sector.includes(filter)) ? '' : 'none';
            });
        });
    }

    if (attendantFilter) {
        attendantFilter.addEventListener('input', () => {
            const filter = attendantFilter.value.toLowerCase();
            const cards = attendantsContainer?.querySelectorAll('.attendant-card') || [];
            cards.forEach(card => {
                const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
                const email = card.querySelector('p')?.textContent.toLowerCase() || '';
                card.style.display = (name.includes(filter) || email.includes(filter)) ? '' : 'none';
            });
        });
    }

    if (attendantRoleFilter) {
        attendantRoleFilter.addEventListener('change', () => {
            const role = attendantRoleFilter.value;
            const cards = attendantsContainer?.querySelectorAll('.attendant-card') || [];
            cards.forEach(card => {
                const cardRole = card.querySelector('p:nth-child(3)')?.textContent.toLowerCase() || '';
                card.style.display = (role === 'all' || cardRole.includes(role.toLowerCase())) ? '' : 'none';
            });
        });
    }

    if (scheduleFilter) {
        scheduleFilter.addEventListener('input', () => {
            const filter = scheduleFilter.value.toLowerCase();
            const cards = schedulesContainer?.querySelectorAll('.schedule-card') || [];
            cards.forEach(card => {
                const weekday = card.querySelector('h3')?.textContent.toLowerCase() || '';
                card.style.display = weekday.includes(filter) ? '' : 'none';
            });
        });
    }

    if (addQueueBtn) {
        addQueueBtn.addEventListener('click', () => {
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
                                <option value="">Selecione um departamento</option>
                                ${queueDepartmentFilter?.innerHTML || ''}
                            </select>
                        </div>
                    </div>
                `,
                [
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg', onclick: 'addQueue()' }
                ]
            );
        });
    }

    window.addQueue = async () => {
        const service = document.getElementById('queue-service')?.value;
        const prefix = document.getElementById('queue-prefix')?.value;
        const limit = document.getElementById('queue-limit')?.value;
        const departmentId = document.getElementById('queue-department')?.value;

        if (!service || !prefix || !limit || !departmentId) {
            showToast('Preencha todos os campos', 'error');
            return;
        }

        try {
            showLoading('Adicionando fila...');
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_BASE_URL}/queues`, {
                service_id: service, // Ajustar conforme a API
                prefix,
                daily_limit: parseInt(limit),
                department_id: parseInt(departmentId)
            }, { headers: { Authorization: `Bearer ${token}` } });
            document.querySelector('.modal-content')?.closest('.fixed')?.remove();
            showToast('Fila adicionada com sucesso');
            loadQueues();
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

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
        });
    }

    window.addDepartment = async () => {
        const name = document.getElementById('department-name')?.value;
        const sector = document.getElementById('department-sector')?.value;

        if (!name || !sector) {
            showToast('Preencha todos os campos', 'error');
            return;
        }

        if (!validateName(name) || !/^[A-Za-zÀ-ÿ\s]{1,50}$/.test(sector)) {
            showToast('Nome ou setor inválido', 'error');
            return;
        }

        try {
            showLoading('Adicionando departamento...');
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_BASE_URL}/institutions/1/departments`, {
                name,
                sector,
                branch_id: localStorage.getItem('branch_id') || 1
            }, { headers: { Authorization: `Bearer ${token}` } });
            document.querySelector('.modal-content')?.closest('.fixed')?.remove();
            showToast('Departamento adicionado com sucesso');
            loadDepartments();
            loadDepartmentsFilter();
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

    if (addAttendantBtn) {
        addAttendantBtn.addEventListener('click', () => {
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
                                <option value="">Selecione um departamento</option>
                                ${queueDepartmentFilter?.innerHTML || ''}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Papel</label>
                            <select id="attendant-role" class="modal-input w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                                <option value="ATTENDANT">Atendente</option>
                                <option value="BRANCH_ADMIN">Administrador de Filial</option>
                            </select>
                        </div>
                    </div>
                `,
                [
                    { label: 'Cancelar', class: 'bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg' },
                    { label: 'Adicionar', class: 'bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg', onclick: 'addAttendant()' }
                ]
            );
        });
    }

    window.addAttendant = async () => {
        const name = document.getElementById('attendant-name')?.value;
        const email = document.getElementById('attendant-email')?.value;
        const password = document.getElementById('attendant-password')?.value;
        const departmentId = document.getElementById('attendant-department')?.value;
        const role = document.getElementById('attendant-role')?.value;

        if (!name || !email || !password || !departmentId || !role) {
            showToast('Preencha todos os campos', 'error');
            return;
        }

        if (!validateName(name) || !validateEmail(email) || !validatePassword(password)) {
            showToast('Dados inválidos. Verifique nome, email ou senha', 'error');
            return;
        }

        try {
            showLoading('Adicionando atendente...');
            const token = localStorage.getItem('adminToken');
            await axios.post(`${API_BASE_URL}/departments/${departmentId}/users`, {
                name,
                email,
                password,
                role
            }, { headers: { Authorization: `Bearer ${token}` } });
            document.querySelector('.modal-content')?.closest('.fixed')?.remove();
            showToast('Atendente adicionado com sucesso');
            loadAttendants();
        } catch (error) {
            handleApiError(error);
        } finally {
            hideLoading();
        }
    };

    if (queuesContainer) {
        queuesContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('call-next-btn')) {
                const queueId = e.target.dataset.queueId;
                try {
                    showLoading('Chamando próximo ticket...');
                    const token = localStorage.getItem('adminToken');
                    const response = await axios.post(`${API_BASE_URL}/queue/${queueId}/call`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    showToast(response.data.message || 'Próximo ticket chamado');
                    loadDashboard();
                    loadQueues();
                } catch (error) {
                    handleApiError(error);
                } finally {
                    hideLoading();
                }
            } else if (e.target.classList.contains('edit-queue-btn')) {
                showToast('Funcionalidade de edição de fila não implementada', 'warning');
            }
        });
    }

    if (departmentsContainer) {
        departmentsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-department-btn')) {
                const departmentId = e.target.dataset.departmentId;
                if (confirm('Tem certeza que deseja excluir este departamento?')) {
                    try {
                        showLoading('Excluindo departamento...');
                        const token = localStorage.getItem('adminToken');
                        await axios.delete(`${API_BASE_URL}/institutions/1/departments/${departmentId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        showToast('Departamento excluído com sucesso');
                        loadDepartments();
                        loadDepartmentsFilter();
                    } catch (error) {
                        handleApiError(error);
                    } finally {
                        hideLoading();
                    }
                }
            } else if (e.target.classList.contains('edit-department-btn')) {
                showToast('Funcionalidade de edição de departamento não implementada', 'warning');
            }
        });
    }

    if (attendantsContainer) {
        attendantsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('delete-attendant-btn')) {
                const userId = e.target.dataset.userId;
                if (confirm('Tem certeza que deseja excluir este atendente?')) {
                    try {
                        showLoading('Excluindo atendente...');
                        const token = localStorage.getItem('adminToken');
                        await axios.delete(`${API_BASE_URL}/institutions/1/users/${userId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        showToast('Atendente excluído com sucesso');
                        loadAttendants();
                    } catch (error) {
                        handleApiError(error);
                    } finally {
                        hideLoading();
                    }
                }
            } else if (e.target.classList.contains('edit-attendant-btn')) {
                showToast('Funcionalidade de edição de atendente não implementada', 'warning');
            }
        });
    }

    if (schedulesContainer) {
        schedulesContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-schedule-btn')) {
                showToast('Funcionalidade de edição de horário não implementada', 'warning');
            }
        });
    }

    // WebSocket Events
    socket.on('connect', () => {
        if (connectionStatus && connectionText) {
            connectionStatus.classList.add('bg-green-500');
            connectionText.textContent = 'AO VIVO';
        }
    });

    socket.on('disconnect', () => {
        if (connectionStatus && connectionText) {
            connectionStatus.classList.remove('bg-green-500');
            connectionStatus.classList.add('bg-red-500');
            connectionText.textContent = 'DESCONECTADO';
        }
    });

    socket.on('department_created', () => {
        loadDepartments();
        loadDepartmentsFilter();
        showToast('Novo departamento criado');
    });

    socket.on('user_created', () => {
        loadAttendants();
        showToast('Novo atendente adicionado');
    });

    socket.on('queue_updated', () => {
        loadDashboard();
        loadQueues();
        showToast('Fila atualizada');
    });

    // Initialize
    if (currentDate) {
        currentDate.textContent = formatDate(new Date());
    }
    const userData = initUserInfo();
    if (userData) {
        loadDashboard();
        loadDepartmentsFilter();
    }
});