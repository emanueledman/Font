const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (token) config.headers['Authorization'] = `Bearer ${token}`;
        return config;
    }
);

// Authentication Module
class AuthManager {
    constructor() {
        this.user = null;
    }

    setUserInfo() {
        const email = localStorage.getItem('email') || sessionStorage.getItem('email');
        const name = email ? email.split('@')[0] : 'Usuário';
        if (email) {
            document.getElementById('user-name').textContent = name;
            document.getElementById('user-email').textContent = email;
        }
    }

    async handleLogout() {
        await axios.post(`${API_BASE}/api/auth/logout`);
        ['adminToken', 'userRole', 'email', 'branchId'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        window.location.href = '/index.html';
    }
}

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
    }
};

// Queue Management
class QueueManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 9;
        this.queues = [];
    }

    async loadQueues() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const container = document.getElementById('queues-container');
        const loading = document.getElementById('queues-loading');
        container.innerHTML = '';
        loading.classList.remove('hidden');
        const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues?page=${this.currentPage}&per_page=${this.perPage}`);
        this.queues = response.data;
        loading.classList.add('hidden');
        this.queues.forEach(queue => {
            const queueCard = document.createElement('div');
            queueCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
            queueCard.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">${queue.service_name}</h3>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${queue.status === 'Aberto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${queue.status}
                    </span>
                </div>
                <p class="text-sm text-gray-500 mb-2">Prefixo: ${queue.prefix}</p>
                <p class="text-sm text-gray-500 mb-2">Tickets pendentes: ${queue.active_tickets}</p>
                <p class="text-sm text-gray-500 mb-4">Tempo médio de espera: ${queue.avg_wait_time ? queue.avg_wait_time + ' min' : 'N/A'}</p>
                <div class="flex space-x-2">
                    <button class="edit-queue-btn px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm" data-id="${queue.id}">Editar</button>
                    <button class="delete-queue-btn px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm" data-id="${queue.id}">Excluir</button>
                </div>
            `;
            container.appendChild(queueCard);
        });
        this.setupQueueActions();
    }

    setupQueueActions() {
        document.querySelectorAll('.edit-queue-btn').forEach(btn => btn.addEventListener('click', () => this.openQueueModal(btn.dataset.id)));
        document.querySelectorAll('.delete-queue-btn').forEach(btn => btn.addEventListener('click', () => this.deleteQueue(btn.dataset.id)));
        document.getElementById('create-queue-btn').addEventListener('click', () => this.openQueueModal());
    }

    async openQueueModal(queueId = null) {
        const modal = document.getElementById('queue-modal');
        const form = document.getElementById('queue-form');
        const title = document.getElementById('queue-modal-title');
        if (queueId) {
            title.textContent = 'Editar Fila';
            const queue = this.queues.find(q => q.id === queueId);
            form.service_id.value = queue.service_id;
            form.department_id.value = queue.department_id;
            form.prefix.value = queue.prefix;
            form.daily_limit.value = queue.daily_limit;
            form.num_counters.value = queue.num_counters;
            form.queue_id.value = queue.id;
        } else {
            title.textContent = 'Nova Fila';
            form.reset();
            form.queue_id.value = '';
        }
        modal.classList.remove('hidden');
        document.getElementById('close-queue-modal').addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('cancel-queue-btn').addEventListener('click', () => modal.classList.add('hidden'));
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.saveQueue();
        };
    }

    async saveQueue() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const form = document.getElementById('queue-form');
        const data = {
            id: form.queue_id.value,
            department_id: form.department_id.value,
            service_id: form.service_id.value,
            prefix: form.prefix.value,
            daily_limit: parseInt(form.daily_limit.value),
            num_counters: parseInt(form.num_counters.value)
        };
        Utils.showLoading(true, 'Salvando fila...');
        await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`, data);
        Utils.showLoading(false);
        document.getElementById('queue-modal').classList.add('hidden');
        Utils.showToast('Fila salva com sucesso', 'success');
        this.loadQueues();
    }

    async deleteQueue(queueId) {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        Utils.showLoading(true, 'Excluindo fila...');
        await axios.delete(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${queueId}`);
        Utils.showLoading(false);
        Utils.showToast('Fila excluída com sucesso', 'success');
        this.loadQueues();
    }
}

// Ticket Management
class TicketManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 9;
        this.tickets = [];
    }

    async loadTickets() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const container = document.getElementById('tickets-container');
        const loading = document.getElementById('tickets-loading');
        container.innerHTML = '';
        loading.classList.remove('hidden');
        const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets?page=${this.currentPage}&per_page=${this.perPage}`);
        this.tickets = response.data;
        loading.classList.add('hidden');
        this.tickets.forEach(ticket => {
            const ticketCard = document.createElement('div');
            ticketCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
            ticketCard.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">${ticket.ticket_number}</h3>
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(ticket.status)}">
                        ${ticket.status}
                    </span>
                </div>
                <p class="text-sm text-gray-500 mb-2">Fila: ${ticket.queue_prefix}</p>
                <p class="text-sm text-gray-500 mb-2">Criado: ${Utils.formatDate(ticket.issued_at)}</p>
                <p class="text-sm text-gray-500 mb-4">Prioridade: ${ticket.priority}</p>
                <div class="flex space-x-2">
                    <button class="edit-ticket-btn px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm" data-id="${ticket.id}">Editar</button>
                    <button class="delete-ticket-btn px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm" data-id="${ticket.id}">Excluir</button>
                </div>
            `;
            container.appendChild(ticketCard);
        });
        this.setupTicketActions();
    }

    getStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'pendente': return 'bg-yellow-100 text-yellow-800';
            case 'chamado': return 'bg-blue-100 text-blue-800';
            case 'atendido': return 'bg-green-100 text-green-800';
            case 'cancelado': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    setupTicketActions() {
        document.querySelectorAll('.edit-ticket-btn').forEach(btn => btn.addEventListener('click', () => this.openTicketModal(btn.dataset.id)));
        document.querySelectorAll('.delete-ticket-btn').forEach(btn => btn.addEventListener('click', () => this.deleteTicket(btn.dataset.id)));
        document.getElementById('generate-ticket-btn').addEventListener('click', () => this.openTicketModal());
        document.getElementById('validate-qr-btn').addEventListener('click', () => this.openQRModal());
    }

    async openTicketModal(ticketId = null) {
        const modal = document.getElementById('ticket-modal');
        const form = document.getElementById('ticket-form');
        if (ticketId) {
            const ticket = this.tickets.find(t => t.id === ticketId);
            form['ticket-queue'].value = ticket.queue_id;
            form['ticket-priority'].value = ticket.priority;
        } else {
            form.reset();
        }
        modal.classList.remove('hidden');
        document.getElementById('close-ticket-modal').addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('cancel-ticket-btn').addEventListener('click', () => modal.classList.add('hidden'));
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.saveTicket();
        };
    }

    async saveTicket() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const form = document.getElementById('ticket-form');
        const data = {
            queue_id: form['ticket-queue'].value,
            priority: form['ticket-priority'].value
        };
        Utils.showLoading(true, 'Gerando ticket...');
        await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/totem`, data);
        Utils.showLoading(false);
        document.getElementById('ticket-modal').classList.add('hidden');
        Utils.showToast('Ticket gerado com sucesso', 'success');
        this.loadTickets();
    }

    async deleteTicket(ticketId) {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        Utils.showLoading(true, 'Excluindo ticket...');
        await axios.delete(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets/${ticketId}`);
        Utils.showLoading(false);
        Utils.showToast('Ticket excluído com sucesso', 'success');
        this.loadTickets();
    }

    async openQRModal() {
        const modal = document.getElementById('qr-modal');
        const form = document.getElementById('qr-form');
        form.reset();
        modal.classList.remove('hidden');
        document.getElementById('close-qr-modal').addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('cancel-qr-btn').addEventListener('click', () => modal.classList.add('hidden'));
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.validateQR();
        };
    }

    async validateQR() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const form = document.getElementById('qr-form');
        const qrCode = form.qr_code.value;
        Utils.showLoading(true, 'Validando QR Code...');
        await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets/validate-qr`, { qr_code: qrCode });
        Utils.showLoading(false);
        document.getElementById('qr-modal').classList.add('hidden');
        Utils.showToast('QR Code validado com sucesso', 'success');
    }
}

// Reports Management
class ReportManager {
    constructor() {
        this.chart = null;
    }

    async generateReport() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const period = document.getElementById('report-period').value;
        const date = period === 'today' ? new Date().toISOString().split('T')[0] : document.getElementById('start-date').value;
        Utils.showLoading(true, 'Gerando relatório...');
        const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/report?date=${date}`);
        Utils.showLoading(false);
        this.renderReport(response.data);
        Utils.showToast('Relatório gerado com sucesso', 'success');
    }

    renderReport(data) {
        const container = document.getElementById('report-results');
        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 class="text-xl font-semibold mb-4">Relatório de Desempenho</h3>
                <div class="h-96">
                    <canvas id="report-chart"></canvas>
                </div>
                <div class="mt-6">
                    <h4 class="text-lg font-semibold mb-2">Resumo</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${data.map(item => `
                            <div class="p-4 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-500">${item.service_name}</p>
                                <p class="text-lg font-semibold">Emitidos: ${item.issued}, Atendidos: ${item.attended}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        this.initChart(data);
    }

    initChart(data) {
        const ctx = document.getElementById('report-chart').getContext('2d');
        if (this.chart) this.chart.destroy();
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.service_name),
                datasets: [{
                    label: 'Tickets Emitidos',
                    data: data.map(item => item.issued),
                    backgroundColor: '#3B82F6'
                }, {
                    label: 'Tickets Atendidos',
                    data: data.map(item => item.attended),
                    backgroundColor: '#10B981'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
    }
}

// Settings Management
class SettingsManager {
    constructor() {
        this.settings = {};
    }

    async loadSettings() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/schedules`);
        this.settings = response.data;
        document.getElementById('dept-name').value = localStorage.getItem('branchName') || '';
        document.getElementById('dept-id').value = branchId;
    }

    async saveSettings() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const form = document.getElementById('department-form');
        const data = {
            weekday: form['weekday'].value,
            open_time: form['open-time'].value,
            end_time: form['end-time'].value,
            is_closed: form['is-closed'].checked
        };
        Utils.showLoading(true, 'Salvando configurações...');
        await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/schedules`, data);
        Utils.showLoading(false);
        Utils.showToast('Configurações salvas com sucesso', 'success');
    }

    async addMember() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const form = document.getElementById('member-form');
        const data = {
            email: form['member-email'].value,
            name: form['member-name'].value,
            password: form['member-password'].value
        };
        Utils.showLoading(true, 'Adicionando membro...');
        await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants`, data);
        Utils.showLoading(false);
        document.getElementById('member-modal').classList.add('hidden');
        Utils.showToast('Membro adicionado com sucesso', 'success');
        this.loadMembers();
    }

    async loadMembers() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const container = document.getElementById('team-members');
        container.innerHTML = '';
        const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants`);
        response.data.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100';
            memberCard.innerHTML = `
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">${member.name[0]}</div>
                    <div>
                        <p class="font-medium">${member.name}</p>
                        <p class="text-xs text-gray-500">${member.email}</p>
                    </div>
                </div>
                <button class="delete-member-btn text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50" data-id="${member.id}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            `;
            container.appendChild(memberCard);
        });
        document.querySelectorAll('.delete-member-btn').forEach(btn => btn.addEventListener('click', () => this.deleteMember(btn.dataset.id)));
    }

    async deleteMember(memberId) {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        Utils.showLoading(true, 'Removendo membro...');
        await axios.delete(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants/${memberId}`);
        Utils.showLoading(false);
        Utils.showToast('Membro removido com sucesso', 'success');
        this.loadMembers();
    }
}

// Dashboard Management
class DashboardManager {
    constructor() {
        this.activityChart = null;
        this.socket = null;
    }

    async loadDashboardData() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const skeletonAreas = ['active-queues', 'pending-tickets', 'today-calls', 'active-users', 'top-queues', 'system-alerts'];
        skeletonAreas.forEach(area => {
            const el = document.getElementById(area);
            el.innerHTML = '';
            el.appendChild(Utils.createSkeletonLoading());
        });
        const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/dashboard`);
        document.getElementById('active-queues').textContent = response.data.queues.filter(q => q.status === 'Aberto').length;
        document.getElementById('pending-tickets').textContent = response.data.metrics.pending_tickets;
        document.getElementById('today-calls').textContent = response.data.metrics.attended_tickets;
        document.getElementById('active-users').textContent = response.data.metrics.active_attendants;
        const topQueues = document.getElementById('top-queues');
        topQueues.innerHTML = response.data.queues.slice(0, 5).map(queue => `
            <div class="flex items-center justify-between">
                <div>
                    <p class="font-medium">${queue.service_name}</p>
                    <p class="text-sm text-gray-500">${queue.active_tickets} tickets</p>
                </div>
                <span class="text-sm ${queue.status === 'Aberto' ? 'text-green-500' : 'text-red-500'}">
                    ${queue.status}
                </span>
            </div>
        `).join('');
        const alerts = document.getElementById('system-alerts');
        alerts.innerHTML = response.data.recent_tickets.filter(t => t.status === 'Pendente').map(ticket => `
            <div class="flex items-center p-3 bg-yellow-50 rounded-lg">
                <svg class="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                    <p class="text-sm font-medium">${ticket.ticket_number}</p>
                    <p class="text-xs text-gray-500">${Utils.formatDate(ticket.issued_at)}</p>
                </div>
            </div>
        `).join('');
        this.initActivityChart();
    }

    initActivityChart() {
        const ctx = document.getElementById('activity-chart').getContext('2d');
        if (this.activityChart) this.activityChart.destroy();
        this.activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
                datasets: [{
                    label: 'Chamadas',
                    data: [10, 20, 50, 80, 60, 30],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
        document.querySelectorAll('.chart-period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.activityChart.data.datasets[0].data = this.getChartData(btn.dataset.period);
                this.activityChart.update();
            });
        });
    }

    getChartData(period) {
        switch (period) {
            case 'today': return [10, 20, 50, 80, 60, 30];
            case 'week': return [100, 200, 500, 800, 600, 300, 150];
            case 'month': return [1000, 2000, 5000, 8000, 6000, 3000];
            default: return [10, 20, 50, 80, 60, 30];
        }
    }

    initWebSocket() {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        this.socket = io(`${API_BASE}/dashboard`, {
            path: '/socket.io',
            transports: ['websocket'],
            reconnectionAttempts: 5,
            query: { branch_id: branchId }
        });
        this.socket.on('dashboard_update', (data) => {
            if (data.event_type === 'ticket_issued') {
                Utils.showToast(`Novo ticket: ${data.data.ticket_number}`, 'info');
                if (!document.getElementById('tickets-section').classList.contains('hidden')) {
                    ticketManager.loadTickets();
                }
            }
            if (data.event_type === 'ticket_called') {
                if (!document.getElementById('call-section').classList.contains('hidden')) {
                    this.updateCurrentTicket(data.data);
                }
            }
            if (data.event_type === 'queue_updated') {
                if (!document.getElementById('queues-section').classList.contains('hidden')) {
                    queueManager.loadQueues();
                }
            }
        });
    }

    updateCurrentTicket(data) {
        document.getElementById('current-ticket').textContent = data.ticket_number;
        document.getElementById('current-service').textContent = data.service_name;
        document.getElementById('current-counter').textContent = data.counter;
        document.getElementById('avg-wait-time').textContent = `${data.avg_wait_time || 'N/A'} min`;
        const waitBar = document.getElementById('wait-bar');
        waitBar.style.width = `${Math.min((data.avg_wait_time / 30) * 100, 100)}%`;
        const nextQueue = document.getElementById('next-queue');
        nextQueue.innerHTML = data.next_tickets ? data.next_tickets.map(ticket => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <p class="font-medium">${ticket.ticket_number}</p>
                    <p class="text-sm text-gray-500">${ticket.service_name}</p>
                </div>
                <p class="text-sm text-gray-500">${ticket.wait_time || 'N/A'} min</p>
            </div>
        `).join('') : '';
    }
}

// Main Application
const authManager = new AuthManager();
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
                case 'settings': settingsManager.loadSettings(); break;
            }
        });
    });
    document.getElementById('logout').addEventListener('click', () => authManager.handleLogout());
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
    authManager.setUserInfo();
    dashboardManager.loadDashboardData();
    setupNavigation();
    dashboardManager.initWebSocket();
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 60000);
    document.getElementById('generate-report-btn').addEventListener('click', () => reportManager.generateReport());
    document.getElementById('save-settings-btn').addEventListener('click', () => settingsManager.saveSettings());
    document.getElementById('add-member-btn').addEventListener('click', () => document.getElementById('member-modal').classList.remove('hidden'));
    document.getElementById('member-form').addEventListener('submit', (e) => {
        e.preventDefault();
        settingsManager.addMember();
    });
    document.getElementById('close-member-modal').addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));
    document.getElementById('cancel-member-btn').addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));
    document.getElementById('refresh-data').addEventListener('click', () => dashboardManager.loadDashboardData());
    document.getElementById('call-next-btn').addEventListener('click', async () => {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/call-next`);
        dashboardManager.updateCurrentTicket(response.data);
    });
    document.getElementById('recall-btn').addEventListener('click', async () => {
        const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
        const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/recall`);
        dashboardManager.updateCurrentTicket(response.data);
    });
});