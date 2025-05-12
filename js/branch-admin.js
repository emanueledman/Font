
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
                    <h3 class="text-lg font-semibold">${queue.service_name}</h3>
                    <p class="text-sm text-gray-500">Prefixo: ${queue.prefix}</p>
                    <p class="text-sm text-gray-500">Departamento: ${queue.department_name}</p>
                    <p class="text-sm text-gray-500">Status: ${queue.status}</p>
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
            Utils.showToast(response.data.message, 'success');
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
            document.getElementById('department_id').value = queue.department_id;
            document.getElementById('service_id').value = queue.service_id;
            document.getElementById('prefix').value = queue.prefix;
            document.getElementById('daily_limit').value = queue.daily_limit;
            document.getElementById('num_counters').value = queue.num_counters;
            document.getElementById('queue_id').value = queue.id;
            document.getElementById('queue-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
            Utils.showToast('Erro ao carregar fila', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async generateTotemTicket(queueId) {
        try {
            Utils.showLoading(true, 'Gerando ticket via totem...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/totem`, { queue_id: queueId }, {
                responseType: 'blob'
            });
            Utils.showToast('Ticket gerado com sucesso', 'success');
            Utils.downloadFile(response.data, `ticket_${queueId}_${Date.now()}.pdf`);
            this.loadQueues();
        } catch (error) {
            console.error('Erro ao gerar ticket via totem:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao gerar ticket via totem', 'error');
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
                    <h3 class="text-lg font-semibold">Ticket ${ticket.ticket_number}</h3>
                    <p class="text-sm text-gray-500">Fila: ${ticket.queue_prefix}</p>
                    <p class="text-sm text-gray-500">Status: ${ticket.status}</p>
                    <p class="text-sm text-gray-500">Emitido em: ${Utils.formatDate(ticket.issued_at)}</p>
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
}

class ReportManager {
    async generateReport() {
        try {
            Utils.showLoading(true, 'Gerando relatório...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const date = document.getElementById('report-date').value;
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/report`, {
                params: { date }
            });
            const reportData = response.data;
            const results = document.getElementById('report-results');
            results.innerHTML = '';
            reportData.forEach(report => {
                const reportCard = document.createElement('div');
                reportCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
                reportCard.innerHTML = `
                    <h3 class="text-xl font-semibold mb-4">Relatório ${report.service_name}</h3>
                    <p>Departamento: ${report.department_name}</p>
                    <p>Tickets emitidos: ${report.issued}</p>
                    <p>Tickets atendidos: ${report.attended}</p>
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
    async loadDepartments() {
        try {
            Utils.showLoading(true, 'Carregando departamentos...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/departments`, {
                params: { refresh: true }
            });
            const departments = response.data;
            const container = document.getElementById('departments-container');
            container.innerHTML = '';
            departments.forEach(dept => {
                const deptCard = document.createElement('div');
                deptCard.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
                deptCard.innerHTML = `
                    <h3 class="text-lg font-semibold">${dept.name}</h3>
                    <p class="text-sm text-gray-500">Setor: ${dept.sector}</p>
                `;
                container.appendChild(deptCard);
            });
        } catch (error) {
            console.error('Erro ao carregar departamentos:', error);
            Utils.showToast('Erro ao carregar departamentos', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async createDepartment(data) {
        try {
            Utils.showLoading(true, 'Criando departamento...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/departments`, data);
            Utils.showToast(response.data.message, 'success');
            document.getElementById('department-modal').classList.add('hidden');
            this.loadDepartments();
        } catch (error) {
            console.error('Erro ao criar departamento:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao criar departamento', 'error');
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
                        <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">${attendant.name.charAt(0)}</div>
                        <div>
                            <p class="font-medium">${attendant.name}</p>
                            <p class="text-xs text-gray-500">${attendant.email}</p>
                        </div>
                    </div>
                    <button class="assign-queue-btn text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50" data-id="${attendant.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                    </button>
                `;
                container.appendChild(attendantCard);
            });
            document.querySelectorAll('.assign-queue-btn').forEach(btn => {
                btn.addEventListener('click', () => this.showAssignQueueModal(btn.dataset.id));
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
            Utils.showToast(response.data.message, 'success');
            document.getElementById('member-modal').classList.add('hidden');
            this.loadAttendants();
        } catch (error) {
            console.error('Erro ao criar atendente:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao criar atendente', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async assignAttendantToQueue(attendantId, queueId) {
        try {
            Utils.showLoading(true, 'Atribuindo atendente à fila...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants/${attendantId}/queues`, { queue_id: queueId });
            Utils.showToast(response.data.message, 'success');
            document.getElementById('assign-queue-modal').classList.add('hidden');
            this.loadAttendants();
        } catch (error) {
            console.error('Erro ao atribuir atendente:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao atribuir atendente', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    showAssignQueueModal(attendantId) {
        document.getElementById('assign-queue-modal').classList.remove('hidden');
        document.getElementById('assign-queue-form').dataset.attendantId = attendantId;
        // Carregar filas disponíveis
        this.loadAvailableQueuesForAssignment();
    }

    async loadAvailableQueuesForAssignment() {
        try {
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`);
            const queues = response.data;
            const select = document.getElementById('assign-queue-id');
            select.innerHTML = '<option value="">Selecione uma fila</option>';
            queues.forEach(queue => {
                const option = document.createElement('option');
                option.value = queue.id;
                option.textContent = `${queue.service_name} (${queue.prefix})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar filas disponíveis:', error);
            Utils.showToast('Erro ao carregar filas disponíveis', 'error');
        }
    }

    async loadSchedules() {
        try {
            Utils.showLoading(true, 'Carregando horários...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/schedules`, {
                params: { refresh: true }
            });
            const schedules = response.data;
            const container = document.getElementById('schedules-container');
            container.innerHTML = '';
            schedules.forEach(schedule => {
                const scheduleCard = document.createElement('div');
                scheduleCard.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
                scheduleCard.innerHTML = `
                    <h3 class="text-lg font-semibold">${schedule.weekday}</h3>
                    <p class="text-sm text-gray-500">Horário: ${schedule.is_closed ? 'Fechado' : `${schedule.open_time} - ${schedule.end_time}`}</p>
                `;
                container.appendChild(scheduleCard);
            });
        } catch (error) {
            console.error('Erro ao carregar horários:', error);
            Utils.showToast('Erro ao carregar horários', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async createSchedule(data) {
        try {
            Utils.showLoading(true, 'Criando horário...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/schedules`, data);
            Utils.showToast(response.data.message, 'success');
            document.getElementById('schedule-modal').classList.add('hidden');
            this.loadSchedules();
        } catch (error) {
            console.error('Erro ao criar horário:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao criar horário', 'error');
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

            document.getElementById('active-queues').textContent = data.queues.filter(q => q.status === 'Aberto').length;
            document.getElementById('pending-tickets').textContent = data.metrics.pending_tickets;
            document.getElementById('today-calls').textContent = data.metrics.attended_tickets;
            document.getElementById('active-users').textContent = data.metrics.active_attendants;

            this.updateRecentTickets(data.recent_tickets);
            this.updateActivityChart(data.queues);
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            Utils.showToast('Erro ao carregar dados do dashboard', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    updateRecentTickets(tickets) {
        const container = document.getElementById('recent-tickets');
        container.innerHTML = '';
        tickets.forEach(ticket => {
            const ticketCard = document.createElement('div');
            ticketCard.className = 'bg-white rounded-lg p-3 border border-gray-100';
            ticketCard.innerHTML = `
                <p class="font-medium">${ticket.ticket_number}</p>
                <p class="text-sm text-gray-500">${ticket.service_name}</p>
                <p class="text-sm text-gray-500">${ticket.status}</p>
                <p class="text-sm text-gray-500">${ticket.counter}</p>
            `;
            container.appendChild(ticketCard);
        });
    }

    updateActivityChart(queues) {
        const ctx = document.getElementById('activity-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: queues.map(q => q.prefix),
                datasets: [{
                    label: 'Tickets Ativos',
                    data: queues.map(q => q.active_tickets),
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
            Utils.showToast(`Atualização: ${data.event_type}`, 'info');
        });
        socket.on('queue_created', () => {
            queueManager.loadQueues();
            Utils.showToast('Nova fila criada', 'info');
        });
        socket.on('department_created', () => {
            settingsManager.loadDepartments();
            Utils.showToast('Novo departamento criado', 'info');
        });
        socket.on('attendant_created', () => {
            settingsManager.loadAttendants();
            Utils.showToast('Novo atendente criado', 'info');
        });
        socket.on('attendant_queue_assigned', () => {
            settingsManager.loadAttendants();
            Utils.showToast('Atendente atribuído à fila', 'info');
        });
        socket.on('schedule_created', () => {
            settingsManager.loadSchedules();
            Utils.showToast('Novo horário criado', 'info');
        });
    }
}

// Instâncias das classes
const queueManager = new QueueManager();
const ticketManager = new TicketManager();
const reportManager = new ReportManager();
const settingsManager = new SettingsManager();
const dashboardManager = new DashboardManager();

function setupNavigation() {
    const navButtons = ['dashboard', 'call', 'queues', 'tickets', 'reports', 'settings'];
    navButtons.forEach(button => {
        document.getElementById(`nav-${button}`).addEventListener('click', () => {
            document.querySelectorAll('main > div').forEach(section => section.classList.add('hidden'));
            document.getElementById(`${button}-section`).classList.remove('hidden');
            document.querySelectorAll('#sidebar nav button').forEach(btn => {
                btn.classList.remove('active', 'bg-blue-700/90');
                btn.classList.add('bg-blue-700/50');
            });
            const activeBtn = document.getElementById(`nav-${button}`);
            activeBtn.classList.add('active', 'bg-blue-700/90');
            activeBtn.classList.remove('bg-blue-700/50');
            switch (button) {
                case 'dashboard': dashboardManager.loadDashboardData(); break;
                case 'queues': queueManager.loadQueues(); break;
                case 'tickets': ticketManager.loadTickets(); break;
                case 'reports': reportManager.generateReport(); break;
                case 'settings': 
                    settingsManager.loadDepartments();
                    settingsManager.loadAttendants();
                    settingsManager.loadSchedules();
                    break;
            }
        });
    });

    document.getElementById('logout').addEventListener('click', () => authService.logout());
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('w-20');
        sidebar.classList.toggle('w-64');
        document.querySelectorAll('#sidebar .hidden.md\\:block').forEach(el => el.classList.toggle('hidden'));
    });
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
    document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
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
    document.getElementById('generate-report-btn').addEventListener('click', () => reportManager.generateReport());
    document.getElementById('create-queue-btn').addEventListener('click', () => {
        document.getElementById('queue-modal-title').textContent = 'Nova Fila';
        document.getElementById('queue-form').reset();
        document.getElementById('queue_id').value = '';
        document.getElementById('queue-modal').classList.remove('hidden');
    });
    document.getElementById('queue-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            department_id: document.getElementById('department_id').value,
            service_id: document.getElementById('service_id').value,
            prefix: document.getElementById('prefix').value,
            daily_limit: parseInt(document.getElementById('daily_limit').value),
            num_counters: parseInt(document.getElementById('num_counters').value)
        };
        const queueId = document.getElementById('queue_id').value;
        if (queueId) {
            Utils.showToast('Edição de fila não implementada', 'info');
        } else {
            queueManager.createQueue(data);
        }
    });
    document.getElementById('close-queue-modal').addEventListener('click', () => document.getElementById('queue-modal').classList.add('hidden'));
    document.getElementById('cancel-queue-btn').addEventListener('click', () => document.getElementById('queue-modal').classList.add('hidden'));
    document.getElementById('generate-ticket-btn').addEventListener('click', () => document.getElementById('totem-ticket-modal').classList.remove('hidden'));
    document.getElementById('totem-ticket-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const queueId = document.getElementById('totem-queue-id').value;
        queueManager.generateTotemTicket(queueId);
    });
    document.getElementById('close-ticket-modal').addEventListener('click', () => document.getElementById('totem-ticket-modal').classList.add('hidden'));
    document.getElementById('cancel-ticket-btn').addEventListener('click', () => document.getElementById('totem-ticket-modal').classList.add('hidden'));
    document.getElementById('create-department-btn').addEventListener('click', () => document.getElementById('department-modal').classList.remove('hidden'));
    document.getElementById('department-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('dept-name').value,
            sector: document.getElementById('dept-sector').value
        };
        settingsManager.createDepartment(data);
    });
    document.getElementById('close-department-modal').addEventListener('click', () => document.getElementById('department-modal').classList.add('hidden'));
    document.getElementById('cancel-department-btn').addEventListener('click', () => document.getElementById('department-modal').classList.add('hidden'));
    document.getElementById('add-member-btn').addEventListener('click', () => document.getElementById('member-modal').classList.remove('hidden'));
    document.getElementById('member-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            email: document.getElementById('member-email').value,
            name: document.getElementById('member-name').value,
            password: document.getElementById('member-password').value
        };
        settingsManager.createAttendant(data);
    });
    document.getElementById('close-member-modal').addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));
    document.getElementById('cancel-member-btn').addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));
    document.getElementById('create-schedule-btn').addEventListener('click', () => document.getElementById('schedule-modal').classList.remove('hidden'));
    document.getElementById('schedule-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            weekday: document.getElementById('schedule-weekday').value,
            open_time: document.getElementById('schedule-open-time').value,
            end_time: document.getElementById('schedule-end-time').value,
            is_closed: document.getElementById('schedule-is-closed').checked
        };
        settingsManager.createSchedule(data);
    });
    document.getElementById('close-schedule-modal').addEventListener('click', () => document.getElementById('schedule-modal').classList.add('hidden'));
    document.getElementById('cancel-schedule-btn').addEventListener('click', () => document.getElementById('schedule-modal').classList.add('hidden'));
    document.getElementById('assign-queue-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const attendantId = e.target.dataset.attendantId;
        const queueId = document.getElementById('assign-queue-id').value;
        settingsManager.assignAttendantToQueue(attendantId, queueId);
    });
    document.getElementById('close-assign-queue-modal').addEventListener('click', () => document.getElementById('assign-queue-modal').classList.add('hidden'));
    document.getElementById('cancel-assign-queue-btn').addEventListener('click', () => document.getElementById('assign-queue-modal').classList.add('hidden'));
    document.getElementById('refresh-data').addEventListener('click', () => dashboardManager.loadDashboardData());
});
