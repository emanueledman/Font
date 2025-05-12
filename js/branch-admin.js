const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Utility Functions
const Utils = {
    formatDate(date) {
        return new Date(date).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    formatTime(time) {
        if (!time) return 'N/A';
        return time;
    },

    showToast(message, type = 'success') {
        const toast = document.importNode(document.getElementById('toast-template').content, true);
        const toastElement = toast.querySelector('.toast');
        toastElement.classList.add(`bg-${type === 'success' ? 'green' : type === 'info' ? 'blue' : 'red'}-100`, `text-${type === 'success' ? 'green' : type === 'info' ? 'blue' : 'red'}-800`);
        toast.querySelector('.toast-title').textContent = type === 'success' ? 'Sucesso' : type === 'info' ? 'Info' : 'Erro';
        toast.querySelector('.toast-message').textContent = message;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => {
            toastElement.classList.add('opacity-0');
            setTimeout(() => toastElement.remove(), 300);
        }, 5000);
        toast.querySelector('.toast-close').addEventListener('click', () => toastElement.remove());
    },

    showLoading(show = true, message = 'Carregando...') {
        const overlay = document.getElementById('loading-overlay');
        document.getElementById('loading-message').textContent = message;
        overlay.classList.toggle('hidden', !show);
    },

    createSkeletonLoading(count = 3) {
        const template = document.getElementById('skeleton-template').content;
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            fragment.appendChild(template.cloneNode(true));
        }
        return fragment;
    },

    downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }
};

// Classes para gerenciar funcionalidades
class QueueManager {
    async loadQueues() {
        try {
            Utils.showLoading(true, 'Carregando filas...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`, {
                params: { refresh: true }
            });
            const queues = response.data;
            const container = document.getElementById('queues-container');
            container.innerHTML = '';
            queues.forEach(queue => {
                const queueCard = document.createElement('div');
                queueCard.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
                queueCard.innerHTML = `
                    <h3 class="text-lg font-semibold">${queue.service_name || 'Sem nome'}</h3>
                    <p class="text-sm text-gray-500">Prefixo: ${queue.prefix || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Departamento: ${queue.department_name || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Status: ${queue.status || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Tempo de espera estimado: ${queue.estimated_wait_time ? queue.estimated_wait_time + ' min' : 'N/A'}</p>
                    <button class="edit-queue-btn mt-2 text-blue-600 hover:text-blue-800" data-id="${queue.id}">Editar</button>
                `;
                container.appendChild(queueCard);
            });
            document.querySelectorAll('.edit-queue-btn').forEach(btn => {
                btn.addEventListener('click', () => this.editQueue(btn.dataset.id));
            });
        } catch (error) {
            console.error('Erro ao carregar filas:', error);
            Utils.showToast('Erro ao carregar filas', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async createQueue(data) {
        try {
            Utils.showLoading(true, 'Criando fila...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`, data);
            Utils.showToast(response.data.message || 'Fila criada com sucesso', 'success');
            document.getElementById('queue-modal').classList.add('hidden');
            this.loadQueues();
        } catch (error) {
            console.error('Erro ao criar fila:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao criar fila', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async editQueue(queueId) {
        try {
            Utils.showLoading(true, 'Carregando dados da fila...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`);
            const queue = response.data.find(q => q.id === queueId);
            if (!queue) throw new Error('Fila não encontrada');
            document.getElementById('queue-modal-title').textContent = 'Editar Fila';
            document.getElementById('service').value = queue.service_name || '';
            document.getElementById('prefix').value = queue.prefix || '';
            document.getElementById('daily_limit').value = queue.daily_limit || '';
            document.getElementById('open_time').value = queue.open_time || '';
            document.getElementById('close_time').value = queue.close_time || '';
            document.getElementById('num_counters').value = queue.num_counters || '';
            document.getElementById('queue_description').value = queue.description || '';
            document.getElementById('queue_id').value = queue.id;
            document.getElementById('queue-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
            Utils.showToast('Erro ao carregar fila', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }
}

class TicketManager {
    async loadTickets() {
        try {
            Utils.showLoading(true, 'Carregando tickets...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets`, {
                params: { refresh: true }
            });
            const tickets = response.data;
            const container = document.getElementById('tickets-container');
            container.innerHTML = '';
            tickets.forEach(ticket => {
                const ticketCard = document.createElement('div');
                ticketCard.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
                ticketCard.innerHTML = `
                    <h3 class="text-lg font-semibold">Ticket ${ticket.ticket_number || 'N/A'}</h3>
                    <p class="text-sm text-gray-500">Fila: ${ticket.queue_prefix || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Status: ${ticket.status || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Emitido em: ${ticket.issued_at ? Utils.formatDate(ticket.issued_at) : 'N/A'}</p>
                    <p class="text-sm text-gray-500">Atendido em: ${ticket.attended_at ? Utils.formatDate(ticket.attended_at) : 'N/A'}</p>
                `;
                container.appendChild(ticketCard);
            });
        } catch (error) {
            console.error('Erro ao carregar tickets:', error);
            Utils.showToast('Erro ao carregar tickets', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async createTicket(data) {
        try {
            Utils.showLoading(true, 'Criando ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets`, data);
            Utils.showToast(response.data.message || 'Ticket criado com sucesso', 'success');
            document.getElementById('ticket-modal').classList.add('hidden');
            this.loadTickets();
        } catch (error) {
            console.error('Erro ao criar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao criar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }
}

class ReportManager {
    async generateReport() {
        try {
            Utils.showLoading(true, 'Gerando relatório...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const period = document.getElementById('report-period').value;
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            const params = { period };
            if (period === 'custom') {
                params.start_date = startDate;
                params.end_date = endDate;
            }
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/report`, { params });
            const reportData = response.data;
            const results = document.getElementById('report-results');
            results.innerHTML = '';
            reportData.forEach(report => {
                const reportCard = document.createElement('div');
                reportCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
                reportCard.innerHTML = `
                    <h3 class="text-xl font-semibold mb-4">Relatório ${report.service_name || 'N/A'}</h3>
                    <p>Departamento: ${report.department_name || 'N/A'}</p>
                    <p>Tickets emitidos: ${report.issued || 0}</p>
                    <p>Tickets atendidos: ${report.attended || 0}</p>
                    <p>Tempo médio de atendimento: ${report.avg_time ? report.avg_time + ' min' : 'N/A'}</p>
                `;
                results.appendChild(reportCard);
            });
            Utils.showToast('Relatório gerado com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao gerar relatório', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }
}

class SettingsManager {
    async loadSettings() {
        try {
            Utils.showLoading(true, 'Carregando configurações...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/settings`);
            const settings = response.data;
            document.getElementById('dept-name').value = settings.name || '';
            document.getElementById('dept-id').value = settings.id || '';
            document.getElementById('dept-description').value = settings.description || '';
            document.getElementById('dept-email').value = settings.email || '';
            document.getElementById('dept-phone').value = settings.phone || '';
            document.getElementById('dept-location').value = settings.location || '';
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            Utils.showToast('Erro ao carregar configurações', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async saveSettings(data) {
        try {
            Utils.showLoading(true, 'Salvando configurações...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.put(`${API_BASE}/api/branch_admin/branches/${branchId}/settings`, data);
            Utils.showToast(response.data.message || 'Configurações salvas com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao salvar configurações', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadAttendants() {
        try {
            Utils.showLoading(true, 'Carregando atendentes...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants`, {
                params: { refresh: true }
            });
            const attendants = response.data;
            const container = document.getElementById('team-members');
            container.innerHTML = '';
            attendants.forEach(attendant => {
                const attendantCard = document.createElement('div');
                attendantCard.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100';
                attendantCard.innerHTML = `
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">${attendant.name?.charAt(0) || 'A'}</div>
                        <div>
                            <p class="font-medium">${attendant.name || 'Sem nome'}</p>
                            <p class="text-xs text-gray-500">${attendant.role || 'Atendente'}</p>
                        </div>
                    </div>
                    <button class="remove-attendant-btn text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50" data-id="${attendant.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                `;
                container.appendChild(attendantCard);
            });
            document.querySelectorAll('.remove-attendant-btn').forEach(btn => {
                btn.addEventListener('click', () => this.removeAttendant(btn.dataset.id));
            });
        } catch (error) {
            console.error('Erro ao carregar atendentes:', error);
            Utils.showToast('Erro ao carregar atendentes', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async createAttendant(data) {
        try {
            Utils.showLoading(true, 'Criando atendente...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants`, data);
            Utils.showToast(response.data.message || 'Atendente criado com sucesso', 'success');
            document.getElementById('member-modal').classList.add('hidden');
            this.loadAttendants();
        } catch (error) {
            console.error('Erro ao criar atendente:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao criar atendente', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async removeAttendant(attendantId) {
        try {
            Utils.showLoading(true, 'Removendo atendente...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.delete(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants/${attendantId}`);
            Utils.showToast(response.data.message || 'Atendente removido com sucesso', 'success');
            this.loadAttendants();
        } catch (error) {
            console.error('Erro ao remover atendente:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao remover atendente', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }
}

class DashboardManager {
    async loadDashboardData() {
        try {
            Utils.showLoading(true, 'Carregando dados do dashboard...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/dashboard`, {
                params: { refresh: true }
            });
            const data = response.data;

            document.getElementById('active-queues').textContent = data.queues?.filter(q => q.status === 'Aberto').length || 0;
            document.getElementById('pending-tickets').textContent = data.metrics?.pending_tickets || 0;
            document.getElementById('today-calls').textContent = data.metrics?.attended_tickets || 0;
            document.getElementById('active-users').textContent = data.metrics?.active_attendants || 0;

            this.updateTopQueues(data.queues || []);
            this.updateActivityChart(data.queues || []);
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            Utils.showToast('Erro ao carregar dados do dashboard', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    updateTopQueues(queues) {
        const container = document.getElementById('top-queues');
        container.innerHTML = '';
        queues.slice(0, 5).forEach(queue => {
            const queueItem = document.createElement('div');
            queueItem.className = 'flex items-center justify-between';
            queueItem.innerHTML = `
                <div>
                    <p class="font-medium">${queue.service_name || 'N/A'}</p>
                    <p class="text-sm text-gray-500">${queue.prefix || 'N/A'}</p>
                </div>
                <span class="text-sm font-semibold text-blue-600">${queue.active_tickets || 0} tickets</span>
            `;
            container.appendChild(queueItem);
        });
    }

    updateActivityChart(queues) {
        const ctx = document.getElementById('activity-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: queues.map(q => q.prefix || 'N/A'),
                datasets: [{
                    label: 'Tickets Ativos',
                    data: queues.map(q => q.active_tickets || 0),
                    borderColor: 'rgba(59, 130, 246, 1)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    initWebSocket() {
        const socket = io(API_BASE, { path: '/socket.io' });
        socket.on('connect', () => {
            console.log('Conectado ao WebSocket');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            socket.emit('join', { room: branchId });
        });
        socket.on('dashboard_update', (data) => {
            this.loadDashboardData();
            Utils.showToast(`Atualização: ${data.event_type || 'Dados atualizados'}`, 'info');
        });
        socket.on('queue_created', () => {
            queueManager.loadQueues();
            Utils.showToast('Nova fila criada', 'info');
        });
    }
}

// Instâncias das classes
const queueManager = new QueueManager();
const ticketManager = new TicketManager();
const reportManager = new ReportManager();
const settingsManager = new SettingsManager();
const dashboardManager = new DashboardManager();

// Mock authService para evitar erros
const authService = {
    isAuthenticated() {
        return !!(localStorage.getItem('branchId') || sessionStorage.getItem('branchId'));
    },
    logout() {
        localStorage.removeItem('branchId');
        sessionStorage.removeItem('branchId');
        window.location.href = '/index.html';
    },
    setUserInfoUI() {
        document.getElementById('user-name').textContent = 'Usuário';
        document.getElementById('user-email').textContent = 'usuario@empresa.com';
    },
    redirectBasedOnRole() {
        window.location.href = '/index.html';
    }
};

function setupNavigation() {
    const navButtons = ['dashboard', 'call', 'queues', 'tickets', 'reports', 'settings'];
    navButtons.forEach(button => {
        const btn = document.getElementById(`nav-${button}`);
        if (btn) {
            btn.addEventListener('click', () => {
                document.querySelectorAll('main > div').forEach(section => section.classList.add('hidden'));
                const section = document.getElementById(`${button}-section`);
                if (section) section.classList.remove('hidden');
                document.querySelectorAll('#sidebar nav button').forEach(b => {
                    b.classList.remove('active', 'bg-blue-700/90');
                    b.classList.add('bg-blue-700/50');
                });
                btn.classList.add('active', 'bg-blue-700/90');
                btn.classList.remove('bg-blue-700/50');
                switch (button) {
                    case 'dashboard': dashboardManager.loadDashboardData(); break;
                    case 'queues': queueManager.loadQueues(); break;
                    case 'tickets': ticketManager.loadTickets(); break;
                    case 'reports': reportManager.generateReport(); break;
                    case 'settings': settingsManager.loadSettings(); settingsManager.loadAttendants(); break;
                }
            });
        }
    });

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => authService.logout());

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            sidebar.classList.toggle('w-20');
            sidebar.classList.toggle('w-64');
            document.querySelectorAll('#sidebar .hidden.md\\:block').forEach(el => el.classList.toggle('hidden'));
        });
    }
}

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
    const currentDate = document.getElementById('current-date');
    if (currentDate) currentDate.textContent = now.toLocaleDateString('pt-BR', options);
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html')) return;

    if (!authService.isAuthenticated()) {
        console.warn('Usuário não autenticado, redirecionando para login');
        window.location.href = '/index.html';
        return;
    }

    const role = (localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || '').toLowerCase();
    if (role !== 'branch_admin') {
        console.warn(`Acesso não autorizado para papel ${role}, redirecionando...`);
        authService.redirectBasedOnRole();
        return;
    }

    authService.setUserInfoUI();
    dashboardManager.loadDashboardData();
    setupNavigation();
    dashboardManager.initWebSocket();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 60000);

    // Eventos de modais e formulários
    const generateReportBtn = document.getElementById('generate-report-btn');
    if (generateReportBtn) generateReportBtn.addEventListener('click', () => reportManager.generateReport());

    const createQueueBtn = document.getElementById('create-queue-btn');
    if (createQueueBtn) {
        createQueueBtn.addEventListener('click', () => {
            document.getElementById('queue-modal-title').textContent = 'Nova Fila';
            document.getElementById('queue-form').reset();
            document.getElementById('queue_id').value = '';
            document.getElementById('queue-modal').classList.remove('hidden');
        });
    }

    const queueForm = document.getElementById('queue-form');
    if (queueForm) {
        queueForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                service_name: document.getElementById('service').value,
                prefix: document.getElementById('prefix').value,
                daily_limit: parseInt(document.getElementById('daily_limit').value),
                open_time: document.getElementById('open_time').value,
                close_time: document.getElementById('close_time').value,
                num_counters: parseInt(document.getElementById('num_counters').value),
                description: document.getElementById('queue_description').value,
                working_days: Array.from(document.querySelectorAll('input[name="working_days"]:checked')).map(input => parseInt(input.value))
            };
            const queueId = document.getElementById('queue_id').value;
            if (queueId) {
                Utils.showToast('Edição de fila não implementada', 'info');
            } else {
                queueManager.createQueue(data);
            }
        });
    }

    const closeQueueModal = document.getElementById('close-queue-modal');
    if (closeQueueModal) closeQueueModal.addEventListener('click', () => document.getElementById('queue-modal').classList.add('hidden'));

    const cancelQueueBtn = document.getElementById('cancel-queue-btn');
    if (cancelQueueBtn) cancelQueueBtn.addEventListener('click', () => document.getElementById('queue-modal').classList.add('hidden'));

    const generateTicketBtn = document.getElementById('generate-ticket-btn');
    if (generateTicketBtn) {
        generateTicketBtn.addEventListener('click', () => document.getElementById('ticket-modal').classList.remove('hidden'));
    }

    const ticketForm = document.getElementById('ticket-form');
    if (ticketForm) {
        ticketForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                queue_id: document.getElementById('ticket-queue').value,
                priority: document.getElementById('ticket-priority').value,
                notes: document.getElementById('ticket-notes').value
            };
            ticketManager.createTicket(data);
        });
    }

    const closeTicketModal = document.getElementById('close-ticket-modal');
    if (closeTicketModal) closeTicketModal.addEventListener('click', () => document.getElementById('ticket-modal').classList.add('hidden'));

    const cancelTicketBtn = document.getElementById('cancel-ticket-btn');
    if (cancelTicketBtn) cancelTicketBtn.addEventListener('click', () => document.getElementById('ticket-modal').classList.add('hidden'));

    const addMemberBtn = document.getElementById('add-member-btn');
    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => document.getElementById('member-modal').classList.remove('hidden'));
    }

    const memberForm = document.getElementById('member-form');
    if (memberForm) {
        memberForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('member-name').value,
                email: document.getElementById('member-email').value,
                role: document.getElementById('member-role').value,
                permissions: Array.from(document.querySelectorAll('input[name="member-permissions"]:checked')).map(input => input.value)
            };
            settingsManager.createAttendant(data);
        });
    }

    const closeMemberModal = document.getElementById('close-member-modal');
    if (closeMemberModal) closeMemberModal.addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));

    const cancelMemberBtn = document.getElementById('cancel-member-btn');
    if (cancelMemberBtn) cancelMemberBtn.addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));

    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            const data = {
                name: document.getElementById('dept-name').value,
                description: document.getElementById('dept-description').value,
                email: document.getElementById('dept-email').value,
                phone: document.getElementById('dept-phone').value,
                location: document.getElementById('dept-location').value
            };
            settingsManager.saveSettings(data);
        });
    }

    const refreshDataBtn = document.getElementById('refresh-data');
    if (refreshDataBtn) refreshDataBtn.addEventListener('click', () => dashboardManager.loadDashboardData());

    const reportPeriod = document.getElementById('report-period');
    if (reportPeriod) {
        reportPeriod.addEventListener('change', (e) => {
            const customStart = document.getElementById('custom-start-date');
            const customEnd = document.getElementById('custom-end-date');
            if (customStart && customEnd) {
                customStart.classList.toggle('hidden', e.target.value !== 'custom');
                customEnd.classList.toggle('hidden', e.target.value !== 'custom');
            }
        });
    }
});