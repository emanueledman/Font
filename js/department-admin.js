// Configurar interceptor do Axios
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.log('Authentication error:', error.response.data?.error);
            Utils.showToast(error.response.data?.error || 'Erro de autenticação. Por favor, faça login novamente.', 'error');
        }
        return Promise.reject(error);
    }
);

// Authentication Module
class AuthManager {
    constructor() {
        this.user = null;
    }

    async checkAuthStatus() {
        try {
            const response = await axios.get('/api/auth/status');
            this.user = response.data.user;
            if (this.user) {
                document.getElementById('user-name').textContent = this.user.name;
                document.getElementById('user-email').textContent = this.user.email;
                return true;
            }
            window.location.href = '/index.html';
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/index.html';
            return false;
        }
    }

    async handleLogout() {
        try {
            await axios.post('/api/auth/logout');
            localStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminToken');
            localStorage.removeItem('userRole');
            sessionStorage.removeItem('userRole');
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Logout failed:', error);
            Utils.showToast('Erro ao fazer logout', 'error');
        }
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
        toastElement.classList.add(`bg-${type === 'success' ? 'green' : 'red'}-100`, `text-${type === 'success' ? 'green' : 'red'}-800`);
        toast.querySelector('.toast-title').textContent = type === 'success' ? 'Sucesso' : 'Erro';
        toast.querySelector('.toast-message').textContent = message;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        setTimeout(() => {
            toastElement.classList.add('opacity-0');
            setTimeout(() => toastElement.remove(), 300);
        }, 5000);
        
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toastElement.remove();
        });
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
        const container = document.getElementById('queues-container');
        const loading = document.getElementById('queues-loading');
        
        container.innerHTML = '';
        loading.classList.remove('hidden');
        
        try {
            const response = await axios.get(`/api/queues?page=${this.currentPage}&per_page=${this.perPage}`);
            this.queues = response.data.queues;
            
            loading.classList.add('hidden');
            
            this.queues.forEach(queue => {
                const queueCard = document.createElement('div');
                queueCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
                queueCard.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">${queue.service}</h3>
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${queue.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${queue.status === 'active' ? 'Ativa' : 'Inativa'}
                        </span>
                    </div>
                    <p class="text-sm text-gray-500 mb-2">Prefixo: ${queue.prefix}</p>
                    <p class="text-sm text-gray-500 mb-2">Tickets pendentes: ${queue.pending_tickets}</p>
                    <p class="text-sm text-gray-500 mb-4">Horário: ${queue.open_time} - ${queue.close_time}</p>
                    <div class="flex space-x-2">
                        <button class="edit-queue-btn px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm" data-id="${queue.id}">Editar</button>
                        <button class="delete-queue-btn px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm" data-id="${queue.id}">Excluir</button>
                    </div>
                `;
                container.appendChild(queueCard);
            });

            this.updatePagination(response.data.total);
            this.setupQueueActions();
        } catch (error) {
            console.error('Failed to load queues:', error);
            Utils.showToast('Erro ao carregar filas', 'error');
        }
    }

    setupQueueActions() {
        document.querySelectorAll('.edit-queue-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openQueueModal(btn.dataset.id));
        });

        document.querySelectorAll('.delete-queue-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteQueue(btn.dataset.id));
        });

        document.getElementById('create-queue-btn').addEventListener('click', () => this.openQueueModal());
    }

    async openQueueModal(queueId = null) {
        const modal = document.getElementById('queue-modal');
        const form = document.getElementById('queue-form');
        const title = document.getElementById('queue-modal-title');
        
        if (queueId) {
            title.textContent = 'Editar Fila';
            const queue = this.queues.find(q => q.id === queueId);
            form.service.value = queue.service;
            form.prefix.value = queue.prefix;
            form.daily_limit.value = queue.daily_limit;
            form.open_time.value = queue.open_time;
            form.close_time.value = queue.close_time;
            form.num_counters.value = queue.num_counters;
            form.queue_description.value = queue.description || '';
            form.queue_id.value = queue.id;
            
            queue.working_days.forEach(day => {
                form.querySelector(`input[name="working_days"][value="${day}"]`).checked = true;
            });
        } else {
            title.textContent = 'Nova Fila';
            form.reset();
            form.queue_id.value = '';
            form.querySelectorAll('input[name="working_days"]').forEach(checkbox => {
                checkbox.checked = ['0', '6'].includes(checkbox.value) ? false : true;
            });
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
        const form = document.getElementById('queue-form');
        const data = {
            id: form.queue_id.value,
            service: form.service.value,
            prefix: form.prefix.value,
            daily_limit: parseInt(form.daily_limit.value),
            open_time: form.open_time.value,
            close_time: form.close_time.value,
            num_counters: parseInt(form.num_counters.value),
            description: form.queue_description.value,
            working_days: Array.from(form.querySelectorAll('input[name="working_days"]:checked')).map(cb => parseInt(cb.value))
        };

        try {
            Utils.showLoading(true, 'Salvando fila...');
            const response = await axios.post('/api/queues', data);
            Utils.showLoading(false);
            
            document.getElementById('queue-modal').classList.add('hidden');
            Utils.showToast(data.id ? 'Fila atualizada com sucesso' : 'Fila criada com sucesso', 'success');
            this.loadQueues();
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao salvar fila', 'error');
        }
    }

    async deleteQueue(queueId) {
        if (!confirm('Tem certeza que deseja excluir esta fila?')) return;

        try {
            Utils.showLoading(true, 'Excluindo fila...');
            await axios.delete(`/api/queues/${queueId}`);
            Utils.showLoading(false);
            Utils.showToast('Fila excluída com sucesso', 'success');
            this.loadQueues();
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao excluir fila', 'error');
        }
    }

    updatePagination(total) {
        const start = document.getElementById('queues-start');
        const end = document.getElementById('queues-end');
        const totalEl = document.getElementById('queues-total');
        const prevBtn = document.getElementById('queues-prev');
        const nextBtn = document.getElementById('queues-next');

        start.textContent = (this.currentPage - 1) * this.perPage + 1;
        end.textContent = Math.min(this.currentPage * this.perPage, total);
        totalEl.textContent = total;

        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage * this.perPage >= total;

        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadQueues();
            }
        };

        nextBtn.onclick = () => {
            if (this.currentPage * this.perPage < total) {
                this.currentPage++;
                this.loadQueues();
            }
        };
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
        const container = document.getElementById('tickets-container');
        const loading = document.getElementById('tickets-loading');
        
        container.innerHTML = '';
        loading.classList.remove('hidden');
        
        try {
            const response = await axios.get(`/api/tickets?page=${this.currentPage}&per_page=${this.perPage}`);
            this.tickets = response.data.tickets;
            
            loading.classList.add('hidden');
            
            this.tickets.forEach(ticket => {
                const ticketCard = document.createElement('div');
                ticketCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
                ticketCard.innerHTML = `
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">${ticket.number}</h3>
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(ticket.status)}">
                            ${ticket.status}
                        </span>
                    </div>
                    <p class="text-sm text-gray-500 mb-2">Fila: ${ticket.queue_name}</p>
                    <p class="text-sm text-gray-500 mb-2">Criado: ${Utils.formatDate(ticket.created_at)}</p>
                    <p class="text-sm text-gray-500 mb-4">Prioridade: ${ticket.priority}</p>
                    <div class="flex space-x-2">
                        <button class="edit-ticket-btn px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm" data-id="${ticket.id}">Editar</button>
                        <button class="delete-ticket-btn px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm" data-id="${ticket.id}">Excluir</button>
                    </div>
                `;
                container.appendChild(ticketCard);
            });

            this.updatePagination(response.data.total);
            this.setupTicketActions();
        } catch (error) {
            console.error('Failed to load tickets:', error);
            Utils.showToast('Erro ao carregar tickets', 'error');
        }
    }

    getStatusColor(status) {
        switch (status.toLowerCase()) {
            case 'pendente': return 'bg-yellow-100 text-yellow-800';
            case 'chamado': return 'bg-blue-100 text-blue-800';
            case 'finalizado': return 'bg-green-100 text-green-800';
            case 'cancelado': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    setupTicketActions() {
        document.querySelectorAll('.edit-ticket-btn').forEach(btn => {
            btn.addEventListener('click', () => this.openTicketModal(btn.dataset.id));
        });

        document.querySelectorAll('.delete-ticket-btn').forEach(btn => {
            btn.addEventListener('click', () => this.deleteTicket(btn.dataset.id));
        });

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
            form['ticket-notes'].value = ticket.notes || '';
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
        const form = document.getElementById('ticket-form');
        const data = {
            queue_id: form['ticket-queue'].value,
            priority: form['ticket-priority'].value,
            notes: form['ticket-notes'].value
        };

        try {
            Utils.showLoading(true, 'Gerando ticket...');
            const response = await axios.post('/api/tickets', data);
            Utils.showLoading(false);
            
            document.getElementById('ticket-modal').classList.add('hidden');
            Utils.showToast('Ticket gerado com sucesso', 'success');
            this.loadTickets();
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao gerar ticket', 'error');
        }
    }

    async deleteTicket(ticketId) {
        if (!confirm('Tem certeza que deseja excluir este ticket?')) return;

        try {
            Utils.showLoading(true, 'Excluindo ticket...');
            await axios.delete(`/api/tickets/${ticketId}`);
            Utils.showLoading(false);
            Utils.showToast('Ticket excluído com sucesso', 'success');
            this.loadTickets();
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao excluir ticket', 'error');
        }
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
        const form = document.getElementById('qr-form');
        const qrCode = form.qr_code.value;

        try {
            Utils.showLoading(true, 'Validando QR Code...');
            const response = await axios.post('/api/tickets/validate-qr', { qr_code: qrCode });
            Utils.showLoading(false);
            
            document.getElementById('qr-modal').classList.add('hidden');
            Utils.showToast('QR Code validado com sucesso', 'success');
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao validar QR Code', 'error');
        }
    }

    updatePagination(total) {
        const start = document.getElementById('tickets-start');
        const end = document.getElementById('tickets-end');
        const totalEl = document.getElementById('tickets-total');
        const prevBtn = document.getElementById('tickets-prev');
        const nextBtn = document.getElementById('tickets-next');

        start.textContent = (this.currentPage - 1) * this.perPage + 1;
        end.textContent = Math.min(this.currentPage * this.perPage, total);
        totalEl.textContent = total;

        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage * this.perPage >= total;

        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadTickets();
            }
        };

        nextBtn.onclick = () => {
            if (this.currentPage * this.perPage < total) {
                this.currentPage++;
                this.loadTickets();
            }
        };
    }
}

// Reports Management
class ReportManager {
    constructor() {
        this.chart = null;
    }

    async generateReport() {
        const period = document.getElementById('report-period').value;
        const type = document.getElementById('report-type').value;
        const queue = document.getElementById('report-queue').value;
        const attendant = document.getElementById('report-attendant').value;
        const group = document.getElementById('report-group').value;
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;

        const params = new URLSearchParams({
            period,
            type,
            queue,
            attendant,
            group,
            ...(period === 'custom' && { start_date: startDate, end_date: endDate })
        });

        try {
            Utils.showLoading(true, 'Gerando relatório...');
            const response = await axios.get(`/api/reports?${params}`);
            Utils.showLoading(false);
            
            this.renderReport(response.data);
            Utils.showToast('Relatório gerado com sucesso', 'success');
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao gerar relatório', 'error');
        }
    }

    renderReport(data) {
        const container = document.getElementById('report-results');
        container.innerHTML = `
            <div class="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <h3 class="text-xl font-semibold mb-4">${data.title}</h3>
                <div class="h-96">
                    <canvas id="report-chart"></canvas>
                </div>
                <div class="mt-6">
                    <h4 class="text-lg font-semibold mb-2">Resumo</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${data.summary.map(item => `
                            <div class="p-4 bg-gray-50 rounded-lg">
                                <p class="text-sm text-gray-500">${item.label}</p>
                                <p class="text-lg font-semibold">${item.value}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        this.initChart(data.chart_data);
    }

    initChart(data) {
        const ctx = document.getElementById('report-chart').getContext('2d');
        if (this.chart) this.chart.destroy();

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Desempenho',
                    data: data.values,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
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
        try {
            const response = await axios.get('/api/settings');
            this.settings = response.data;
            
            document.getElementById('dept-name').value = this.settings.department.name;
            document.getElementById('dept-id').value = this.settings.department.id;
            document.getElementById('dept-description').value = this.settings.department.description || '';
            document.getElementById('dept-email').value = this.settings.department.email || '';
            document.getElementById('dept-phone').value = this.settings.department.phone || '';
            document.getElementById('dept-location').value = this.settings.department.location || '';
            
            document.getElementById('theme-select').value = this.settings.display.theme;
            document.getElementById('density-select').value = this.settings.display.density;
            document.getElementById('notifications-toggle').checked = this.settings.notifications.panel;
            document.getElementById('email-notifications-toggle').checked = this.settings.notifications.email;
            
            document.getElementById('call-interval').value = this.settings.call.interval;
            document.getElementById('call-attempts').value = this.settings.call.attempts;
            document.getElementById('max-wait-time').value = this.settings.call.max_wait;
            document.getElementById('call-sound').value = this.settings.call.sound;
        } catch (error) {
            console.error('Failed to load settings:', error);
            Utils.showToast('Erro ao carregar configurações', 'error');
        }
    }

    async saveSettings() {
        const form = document.getElementById('department-form');
        const data = {
            department: {
                name: form['dept-name'].value,
                description: form['dept-description'].value,
                email: form['dept-email'].value,
                phone: form['dept-phone'].value,
                location: form['dept-location'].value
            },
            display: {
                theme: document.getElementById('theme-select').value,
                density: document.getElementById('density-select').value
            },
            notifications: {
                panel: document.getElementById('notifications-toggle').checked,
                email: document.getElementById('email-notifications-toggle').checked
            },
            call: {
                interval: document.getElementById('call-interval').value,
                attempts: document.getElementById('call-attempts').value,
                max_wait: document.getElementById('max-wait-time').value,
                sound: document.getElementById('call-sound').value
            }
        };

        try {
            Utils.showLoading(true, 'Salvando configurações...');
            await axios.post('/api/settings', data);
            Utils.showLoading(false);
            Utils.showToast('Configurações salvas com sucesso', 'success');
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao salvar configurações', 'error');
        }
    }

    async addMember() {
        const form = document.getElementById('member-form');
        const data = {
            name: form['member-name'].value,
            email: form['member-email'].value,
            role: form['member-role'].value,
            permissions: Array.from(form.querySelectorAll('input[name="member-permissions"]:checked')).map(cb => cb.value)
        };

        try {
            Utils.showLoading(true, 'Adicionando membro...');
            await axios.post('/api/members', data);
            Utils.showLoading(false);
            document.getElementById('member-modal').classList.add('hidden');
            Utils.showToast('Membro adicionado com sucesso', 'success');
            this.loadMembers();
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao adicionar membro', 'error');
        }
    }

    async loadMembers() {
        const container = document.getElementById('team-members');
        container.innerHTML = '';
        
        try {
            const response = await axios.get('/api/members');
            response.data.forEach(member => {
                const memberCard = document.createElement('div');
                memberCard.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100';
                memberCard.innerHTML = `
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold mr-3">${member.name[0]}</div>
                        <div>
                            <p class="font-medium">${member.name}</p>
                            <p class="text-xs text-gray-500">${member.role}</p>
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

            document.querySelectorAll('.delete-member-btn').forEach(btn => {
                btn.addEventListener('click', () => this.deleteMember(btn.dataset.id));
            });
        } catch (error) {
            console.error('Failed to load members:', error);
            Utils.showToast('Erro ao carregar membros', 'error');
        }
    }

    async deleteMember(memberId) {
        if (!confirm('Tem certeza que deseja remover este membro?')) return;

        try {
            Utils.showLoading(true, 'Removendo membro...');
            await axios.delete(`/api/members/${memberId}`);
            Utils.showLoading(false);
            Utils.showToast('Membro removido com sucesso', 'success');
            this.loadMembers();
        } catch (error) {
            Utils.showLoading(false);
            Utils.showToast('Erro ao remover membro', 'error');
        }
    }
}

// Dashboard Management
class DashboardManager {
    constructor() {
        this.activityChart = null;
        this.socket = null;
    }

    async loadDashboardData() {
        const skeletonAreas = [
            'active-queues', 'pending-tickets', 'today-calls', 'active-users',
            'top-queues', 'system-alerts'
        ];

        skeletonAreas.forEach(area => {
            const el = document.getElementById(area);
            el.innerHTML = '';
            el.appendChild(Utils.createSkeletonLoading());
        });

        try {
            const [queuesRes, ticketsRes, callsRes, usersRes, topQueuesRes, alertsRes] = await Promise.all([
                axios.get('/api/queues/active'),
                axios.get('/api/tickets/pending'),
                axios.get('/api/calls/today'),
                axios.get('/api/users/active'),
                axios.get('/api/queues/top'),
                axios.get('/api/alerts')
            ]);

            document.getElementById('active-queues').textContent = queuesRes.data.count;
            document.getElementById('pending-tickets').textContent = ticketsRes.data.count;
            document.getElementById('today-calls').textContent = callsRes.data.count;
            document.getElementById('active-users').textContent = usersRes.data.count;

            const topQueues = document.getElementById('top-queues');
            topQueues.innerHTML = topQueuesRes.data.map(queue => `
                <div class="flex items-center justify-between">
                    <div>
                        <p class="font-medium">${queue.service}</p>
                        <p class="text-sm text-gray-500">${queue.tickets} tickets</p>
                    </div>
                    <span class="text-sm ${queue.trend === 'up' ? 'text-green-500' : 'text-red-500'}">
                        ${queue.trend === 'up' ? '↑' : '↓'} ${queue.change}%
                    </span>
                </div>
            `).join('');

            const alerts = document.getElementById('system-alerts');
            alerts.innerHTML = alertsRes.data.map(alert => `
                <div class="flex items-center p-3 bg-${alert.type === 'warning' ? 'yellow' : 'red'}-50 rounded-lg">
                    <svg class="w-5 h-5 text-${alert.type === 'warning' ? 'yellow' : 'red'}-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <p class="text-sm font-medium">${alert.message}</p>
                        <p class="text-xs text-gray-500">${Utils.formatDate(alert.created_at)}</p>
                    </div>
                </div>
            `).join('');

            this.initActivityChart();
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            Utils.showToast('Erro ao carregar dashboard', 'error');
        }
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
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
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
        this.socket = io('https://fila-facilita2-0-4uzw.onrender.com', {
            path: '/real-time',
            transports: ['websocket'],
            reconnectionAttempts: 5
        });

        this.socket.on('new_ticket', (data) => {
            Utils.showToast(`Novo ticket: ${data.ticket_number}`, 'info');
            if (!document.getElementById('tickets-section').classList.contains('hidden')) {
                ticketManager.loadTickets();
            }
        });

        this.socket.on('called_ticket', (data) => {
            if (!document.getElementById('call-section').classList.contains('hidden')) {
                this.updateCurrentTicket(data);
            }
        });

        this.socket.on('queue_update', () => {
            if (!document.getElementById('queues-section').classList.contains('hidden')) {
                queueManager.loadQueues();
            }
        });
    }

    updateCurrentTicket(data) {
        document.getElementById('current-ticket').textContent = data.ticket_number;
        document.getElementById('current-service').textContent = data.service;
        document.getElementById('current-counter').textContent = `Guichê ${data.counter}`;
        document.getElementById('avg-wait-time').textContent = `${data.avg_wait_time} min`;
        
        const waitBar = document.getElementById('wait-bar');
        waitBar.style.width = `${Math.min((data.avg_wait_time / 30) * 100, 100)}%`;
        
        const nextQueue = document.getElementById('next-queue');
        nextQueue.innerHTML = data.next_tickets.map(ticket => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                    <p class="font-medium">${ticket.number}</p>
                    <p class="text-sm text-gray-500">${ticket.service}</p>
                </div>
                <p class="text-sm text-gray-500">${ticket.wait_time} min</p>
            </div>
        `).join('');
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
            document.querySelectorAll('main > div').forEach(section => {
                section.classList.add('hidden');
            });
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
        document.querySelectorAll('#sidebar .hidden.md\\:block').forEach(el => {
            el.classList.toggle('hidden');
        });
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

document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname.includes('index.html')) return;

    if (await authManager.checkAuthStatus()) {
        dashboardManager.loadDashboardData();
        setupNavigation();
        dashboardManager.initWebSocket();
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000);

        document.getElementById('generate-report-btn').addEventListener('click', () => reportManager.generateReport());
        document.getElementById('save-settings-btn').addEventListener('click', () => settingsManager.saveSettings());
        document.getElementById('add-member-btn').addEventListener('click', () => {
            document.getElementById('member-modal').classList.remove('hidden');
        });
        document.getElementById('member-form').addEventListener('submit', (e) => {
            e.preventDefault();
            settingsManager.addMember();
        });
        document.getElementById('close-member-modal').addEventListener('click', () => {
            document.getElementById('member-modal').classList.add('hidden');
        });
        document.getElementById('cancel-member-btn').addEventListener('click', () => {
            document.getElementById('member-modal').classList.add('hidden');
        });

        document.getElementById('refresh-data').addEventListener('click', () => dashboardManager.loadDashboardData());
        document.getElementById('call-next-btn').addEventListener('click', async () => {
            try {
                const response = await axios.post('/api/calls/next');
                dashboardManager.updateCurrentTicket(response.data);
            } catch (error) {
                Utils.showToast('Erro ao chamar próximo ticket', 'error');
            }
        });
        document.getElementById('recall-btn').addEventListener('click', async () => {
            try {
                const response = await axios.post('/api/calls/recall');
                dashboardManager.updateCurrentTicket(response.data);
            } catch (error) {
                Utils.showToast('Erro ao rechamar ticket', 'error');
            }
        });
    }
});