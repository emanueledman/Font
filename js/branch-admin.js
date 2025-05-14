
const Utils = {
    formatDate(date) {
        if (!date) return 'N/A';
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
class QueueManager {
    constructor() {
        this.initEventListeners();
        this.currentPage = 1;
        this.perPage = 10;
        this.filterText = '';
    }

    initEventListeners() {
        // Filtro de busca
        document.getElementById('queue-filter').addEventListener('input', (e) => {
            this.filterText = e.target.value.toLowerCase();
            this.loadQueues();
        });

        // Botão para abrir o modal de criação
        document.getElementById('create-queue-btn').addEventListener('click', () => {
            this.openCreateQueueModal();
        });

        // Formulário do modal
        document.getElementById('queue-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitQueueForm();
        });

        // Botões de cancelar e fechar modal
        document.getElementById('cancel-queue').addEventListener('click', () => {
            document.getElementById('queue-modal').classList.add('hidden');
        });
        document.getElementById('close-queue-modal').addEventListener('click', () => {
            document.getElementById('queue-modal').classList.add('hidden');
        });
    }

    async loadQueues() {
        try {
            Utils.showLoading(true, 'Carregando filas...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`, {
                params: { refresh: true, page: this.currentPage, per_page: this.perPage }
            });
            const queues = response.data;

            const container = document.getElementById('queues-container');
            container.innerHTML = '';

            // Filtrar filas com base no texto de busca
            const filteredQueues = queues.filter(queue =>
                queue.service_name.toLowerCase().includes(this.filterText) ||
                queue.prefix.toLowerCase().includes(this.filterText) ||
                queue.department_name.toLowerCase().includes(this.filterText)
            );

            if (filteredQueues.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center">Nenhuma fila encontrada.</p>';
                return;
            }

            filteredQueues.forEach(queue => {
                const statusColor = {
                    'Aberto': 'bg-green-100 text-green-800',
                    'Pausado': 'bg-yellow-100 text-yellow-800',
                    'Fechado': 'bg-red-100 text-red-800',
                    'Lotado': 'bg-orange-100 text-orange-800'
                }[queue.status] || 'bg-gray-100 text-gray-800';

                const queueCard = document.createElement('div');
                queueCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow';
                queueCard.innerHTML = `
                    <div class="flex justify-between items-center">
                        <h3 class="text-lg font-semibold text-gray-800">${queue.service_name}</h3>
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${statusColor}">${queue.status}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">Prefixo: ${queue.prefix}</p>
                    <p class="text-sm text-gray-600">Departamento: ${queue.department_name}</p>
                    <p class="text-sm text-gray-600">Tickets Ativos: ${queue.active_tickets}/${queue.daily_limit}</p>
                    <p class="text-sm text-gray-600">Guichês: ${queue.num_counters}</p>
                    <p class="text-sm text-gray-600">Tempo de Espera Estimado: ${queue.estimated_wait_time ? queue.estimated_wait_time + ' min' : 'N/A'}</p>
                    <div class="mt-4 flex space-x-3">
                        <button class="edit-queue-btn flex items-center text-blue-600 hover:text-blue-800" data-id="${queue.id}">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Editar
                        </button>
                        <button class="call-ticket-btn flex items-center text-green-600 hover:text-green-800" data-id="${queue.id}">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Chamar
                        </button>
                        <button class="pause-queue-btn flex items-center text-yellow-600 hover:text-yellow-800" data-id="${queue.id}">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${queue.status === 'Pausado' ? 'M5 3v18m14-18v18' : 'M10 9v6m4-6v6'}" />
                            </svg>
                            ${queue.status === 'Pausado' ? 'Retomar' : 'Pausar'}
                        </button>
                        <button class="totem-ticket-btn flex items-center text-purple-600 hover:text-purple-800" data-id="${queue.id}">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Gerar Ticket Totem
                        </button>
                    </div>
                `;
                container.appendChild(queueCard);
            });

            // Adicionar event listeners
            document.querySelectorAll('.edit-queue-btn').forEach(btn => {
                btn.addEventListener('click', () => this.editQueue(btn.dataset.id));
            });
            document.querySelectorAll('.call-ticket-btn').forEach(btn => {
                btn.addEventListener('click', () => ticketManager.callNextTicket(btn.dataset.id));
            });
            document.querySelectorAll('.pause-queue-btn').forEach(btn => {
                btn.addEventListener('click', () => this.toggleQueuePause(btn.dataset.id));
            });
            document.querySelectorAll('.totem-ticket-btn').forEach(btn => {
                btn.addEventListener('click', () => this.generateTotemTicket(btn.dataset.id));
            });
        } catch (error) {
            console.error('Erro ao carregar filas:', error);
            Utils.showToast('Erro ao carregar filas', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadDepartmentsAndServices() {
        try {
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const [deptResponse, serviceResponse] = await Promise.all([
                axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/departments`),
                axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/services`) // Supõe uma rota para serviços
            ]);

            const deptSelect = document.getElementById('queue-department');
            const serviceSelect = document.getElementById('queue-service');
            deptSelect.innerHTML = '<option value="">Selecione um departamento</option>';
            serviceSelect.innerHTML = '<option value="">Selecione um serviço</option>';

            deptResponse.data.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.id;
                option.textContent = dept.name;
                deptSelect.appendChild(option);
            });

            serviceResponse.data.forEach(service => {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                serviceSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar departamentos e serviços:', error);
            Utils.showToast('Erro ao carregar opções', 'error');
        }
    }

    openCreateQueueModal() {
        document.getElementById('queue-modal-title').textContent = 'Nova Fila';
        document.getElementById('queue-form').reset();
        document.getElementById('queue_id').value = '';
        document.getElementById('queue-modal').classList.remove('hidden');
        this.loadDepartmentsAndServices();
    }

    async submitQueueForm() {
        const form = document.getElementById('queue-form');
        const data = {
            department_id: form.department_id.value,
            service_id: form.service_id.value,
            prefix: form.prefix.value,
            daily_limit: parseInt(form.daily_limit.value),
            num_counters: parseInt(form.num_counters.value)
        };

        // Validação básica
        if (!data.department_id || !data.service_id || !data.prefix || data.daily_limit <= 0 || data.num_counters <= 0) {
            Utils.showToast('Preencha todos os campos corretamente', 'error');
            return;
        }

        try {
            Utils.showLoading(true, 'Salvando fila...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const queueId = form.queue_id.value;
            if (queueId) {
                // Atualizar fila (PUT)
                await axios.put(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${queueId}`, data);
                Utils.showToast('Fila atualizada com sucesso', 'success');
            } else {
                // Criar nova fila (POST)
                await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`, data);
                Utils.showToast('Fila criada com sucesso', 'success');
            }
            document.getElementById('queue-modal').classList.add('hidden');
            this.loadQueues();
        } catch (error) {
            console.error('Erro ao salvar fila:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao salvar fila', 'error');
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

            await this.loadDepartmentsAndServices();
            document.getElementById('queue-modal-title').textContent = 'Editar Fila';
            document.getElementById('queue-department').value = queue.department_id;
            document.getElementById('queue-service').value = queue.service_id;
            document.getElementById('queue-prefix').value = queue.prefix;
            document.getElementById('daily-limit').value = queue.daily_limit;
            document.getElementById('num-counters').value = queue.num_counters;
            document.getElementById('queue_id').value = queue.id;
            document.getElementById('queue-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
            Utils.showToast('Erro ao carregar fila', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async toggleQueuePause(queueId) {
        try {
            Utils.showLoading(true, 'Atualizando status da fila...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`);
            const queue = response.data.find(q => q.id === queueId);
            if (!queue) throw new Error('Fila não encontrada');

            const isPaused = queue.status === 'Pausado';
            const data = isPaused ? { daily_limit: queue.daily_limit || 100 } : { daily_limit: 0 };
            await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${queueId}/pause`, data);
            Utils.showToast(`Fila ${isPaused ? 'retomada' : 'pausada'} com sucesso`, 'success');
            this.loadQueues();
        } catch (error) {
            console.error('Erro ao pausar/retomar fila:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao atualizar status da fila', 'error');
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
    async loadTickets(statusFilter = 'all') {
        try {
            Utils.showLoading(true, 'Carregando tickets...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const params = { refresh: true };
            if (statusFilter !== 'all') params.status = statusFilter;
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets`, { params });
            const tickets = response.data.tickets;
            const container = document.getElementById('tickets-container');
            container.innerHTML = '';
            tickets.forEach(ticket => {
                const ticketCard = document.createElement('div');
                ticketCard.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100 cursor-pointer hover:bg-gray-50';
                ticketCard.innerHTML = `
                    <h3 class="text-lg font-semibold">Ticket ${ticket.queue_prefix}${ticket.ticket_number}</h3>
                    <p class="text-sm text-gray-500">Fila: ${ticket.queue_prefix}</p>
                    <p class="text-sm text-gray-500">Status: ${ticket.status}</p>
                    <p class="text-sm text-gray-500">Prioridade: ${ticket.priority}</p>
                    <p class="text-sm text-gray-500">Emitido em: ${Utils.formatDate(ticket.issued_at)}</p>
                    <p class="text-sm text-gray-500">Atendido em: ${ticket.attended_at ? Utils.formatDate(ticket.attended_at) : 'N/A'}</p>
                    <div class="mt-2 space-x-2">
                        ${ticket.status === 'Chamado' ? `<button class="recall-ticket-btn text-blue-600 hover:text-blue-800" data-id="${ticket.id}">Rechamar</button>` : ''}
                        ${ticket.status === 'Pendente' ? `<button class="cancel-ticket-btn text-red-600 hover:text-red-800" data-id="${ticket.id}">Cancelar</button>` : ''}
                    </div>
                `;
                ticketCard.dataset.id = ticket.id;
                ticketCard.addEventListener('click', (e) => {
                    if (!e.target.classList.contains('recall-ticket-btn') && !e.target.classList.contains('cancel-ticket-btn')) {
                        this.showTicketDetails(ticket.id);
                    }
                });
                container.appendChild(ticketCard);
            });
            document.querySelectorAll('.recall-ticket-btn').forEach(btn => {
                btn.addEventListener('click', () => this.recallTicket(btn.dataset.id));
            });
            document.querySelectorAll('.cancel-ticket-btn').forEach(btn => {
                btn.addEventListener('click', () => this.cancelTicket(btn.dataset.id));
            });
        } catch (error) {
            console.error('Erro ao carregar tickets:', error);
            Utils.showToast('Erro ao carregar tickets', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async showTicketDetails(ticketId) {
        try {
            Utils.showLoading(true, 'Carregando detalhes do ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets`);
            const ticket = response.data.tickets.find(t => t.id === ticketId);
            if (!ticket) throw new Error('Ticket não encontrado');
            document.getElementById('ticket-details-number').textContent = `${ticket.queue_prefix}${ticket.ticket_number}`;
            document.getElementById('ticket-details-queue').textContent = ticket.queue_prefix;
            document.getElementById('ticket-details-service').textContent = ticket.service_name || 'N/A';
            document.getElementById('ticket-details-counter').textContent = ticket.counter ? `Guichê ${ticket.counter}` : 'N/A';
            document.getElementById('ticket-details-status').textContent = ticket.status;
            document.getElementById('ticket-details-issued').textContent = Utils.formatDate(ticket.issued_at);
            document.getElementById('ticket-details-notes').textContent = ticket.notes || 'Nenhuma';
            document.getElementById('ticket-details-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao carregar detalhes do ticket:', error);
            Utils.showToast('Erro ao carregar detalhes do ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async generateTicket(data) {
        try {
            Utils.showLoading(true, 'Gerando ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets`, data);
            Utils.showToast(response.data.message || 'Ticket gerado com sucesso', 'success');
            document.getElementById('ticket-modal').classList.add('hidden');
            this.loadTickets();
        } catch (error) {
            console.error('Erro ao gerar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao gerar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async callNextTicket(queueId) {
        try {
            Utils.showLoading(true, 'Chamando próximo ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const counter = document.getElementById('call-counter')?.value || 1;
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${queueId}/call`, { counter });
            Utils.showToast(response.data.message || 'Ticket chamado com sucesso', 'success');
            this.loadTickets();
            queueManager.loadQueues();
            dashboardManager.loadDashboardData();
            if (response.data.ticket) {
                this.playCallSound(response.data.ticket.number);
            }
        } catch (error) {
            console.error('Erro ao chamar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao chamar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async recallTicket(ticketId) {
        try {
            Utils.showLoading(true, 'Rechamando ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets/${ticketId}/recall`);
            Utils.showToast(response.data.message || 'Ticket rechamado com sucesso', 'success');
            this.loadTickets();
            dashboardManager.loadDashboardData();
            if (response.data.ticket) {
                this.playCallSound(response.data.ticket.number);
            }
        } catch (error) {
            console.error('Erro ao rechamar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao rechamar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async cancelTicket(ticketId) {
        try {
            Utils.showLoading(true, 'Cancelando ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/tickets/${ticketId}/cancel`);
            Utils.showToast(response.data.message || 'Ticket cancelado com sucesso', 'success');
            this.loadTickets();
            queueManager.loadQueues();
            dashboardManager.loadDashboardData();
        } catch (error) {
            console.error('Erro ao cancelar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao cancelar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    playCallSound(ticketNumber) {
        const audio = new Audio('/sounds/call.mp3'); // Ensure this file exists
        audio.play().catch(error => console.error('Erro ao tocar som:', error));
        Utils.showToast(`Chamando ${ticketNumber}`, 'info');
    }
}

class ReportManager {
    async generateReport() {
        try {
            Utils.showLoading(true, 'Gerando relatório...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const startDate = document.getElementById('report-start-date')?.value;
            const endDate = document.getElementById('report-end-date')?.value;
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/report/export`, {
                params: { start_date: startDate, end_date: endDate }
            });
            const reportData = response.data.report;
            const results = document.getElementById('report-results');
            results.innerHTML = '';
            reportData.forEach(report => {
                const reportCard = document.createElement('div');
                reportCard.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
                reportCard.innerHTML = `
                    <h3 class="text-xl font-semibold mb-4">Ticket ${report.queue_prefix}${report.ticket_number}</h3>
                    <p>Status: ${report.status}</p>
                    <p>Emitido: ${Utils.formatDate(report.issued_at)}</p>
                    <p>Atendido: ${report.attended_at ? Utils.formatDate(report.attended_at) : 'N/A'}</p>
                    <p>Tempo de atendimento: ${report.service_time ? report.service_time + ' min' : 'N/A'}</p>
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

    async exportReport(data) {
        try {
            Utils.showLoading(true, 'Exportando relatório...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/report/export`, {
                params: {
                    start_date: data.start_date,
                    end_date: data.end_date
                },
                responseType: 'blob'
            });
            const filename = `report_${Date.now()}.pdf`;
            Utils.downloadFile(response.data, filename);
            Utils.showToast('Relatório exportado com sucesso', 'success');
            document.getElementById('export-report-modal').classList.add('hidden');
        } catch (error) {
            console.error('Erro ao exportar relatório:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao exportar relatório', 'error');
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
                    <p class="text-sm text-gray-500">Descrição: ${dept.description || 'N/A'}</p>
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
            Utils.showToast(response.data.message || 'Departamento criado com sucesso', 'success');
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
            const container = document.getElementById('members-container');
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
                            <p class="text-xs text-gray-500">Filas: ${attendant.queues.join(', ') || 'Nenhuma'}</p>
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

    async assignAttendantToQueue(attendantId, queueId) {
        try {
            Utils.showLoading(true, 'Atribuindo atendente à fila...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants/${attendantId}/queues`, { queue_id: queueId });
            Utils.showToast(response.data.message || 'Atendente atribuído com sucesso', 'success');
            document.getElementById('assign-queue-modal').classList.add('hidden');
            this.loadAttendants();
        } catch (error) {
            console.error('Erro ao atribuir atendente:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao atribuir atendente', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadCounters() {
        try {
            Utils.showLoading(true, 'Carregando guichês...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/counters`, {
                params: { refresh: true }
            });
            const counters = response.data;
            const container = document.getElementById('counters-container');
            container.innerHTML = '';
            counters.forEach(counter => {
                const counterCard = document.createElement('div');
                counterCard.className = 'bg-white rounded-xl shadow-lg p-4 border border-gray-100';
                counterCard.innerHTML = `
                    <h3 class="text-lg font-semibold">Guichê ${counter.number}</h3>
                    <p class="text-sm text-gray-500">Atendente: ${counter.attendant_name || 'Nenhum'}</p>
                    <p class="text-sm text-gray-500">Status: ${counter.status}</p>
                    <p class="text-sm text-gray-500">Localização: ${counter.location || 'N/A'}</p>
                    <button class="edit-counter-btn mt-2 text-blue-600 hover:text-blue-800" data-id="${counter.id}">Editar</button>
                `;
                container.appendChild(counterCard);
            });
            document.querySelectorAll('.edit-counter-btn').forEach(btn => {
                btn.addEventListener('click', () => this.editCounter(btn.dataset.id));
            });
        } catch (error) {
            console.error('Erro ao carregar guichês:', error);
            Utils.showToast('Erro ao carregar guichês', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async createCounter(data) {
        try {
            Utils.showLoading(true, 'Criando guichê...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/counters`, data);
            Utils.showToast(response.data.message || 'Guichê criado com sucesso', 'success');
            document.getElementById('counter-modal').classList.add('hidden');
            this.loadCounters();
        } catch (error) {
            console.error('Erro ao criar guichê:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao criar guichê', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async editCounter(counterId) {
        try {
            Utils.showLoading(true, 'Carregando dados do guichê...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/counters/${counterId}`);
            const counter = response.data;
            document.getElementById('counter-modal-title').textContent = 'Editar Guichê';
            document.getElementById('counter-number').value = counter.number;
            document.getElementById('counter-attendant').value = counter.attendant_id || '';
            document.getElementById('counter-status').value = counter.status;
            document.getElementById('counter-location').value = counter.location || '';
            document.getElementById('counter_id').value = counter.id;
            await this.loadAttendantsForCounter();
            document.getElementById('counter-modal').classList.remove('hidden');
        } catch (error) {
            console.error('Erro ao carregar guichê:', error);
            Utils.showToast('Erro ao carregar guichê', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadAttendantsForCounter() {
        try {
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/attendants`);
            const attendants = response.data;
            const select = document.getElementById('counter-attendant');
            select.innerHTML = '<option value="">Nenhum</option>';
            attendants.forEach(attendant => {
                const option = document.createElement('option');
                option.value = attendant.id;
                option.textContent = attendant.name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar atendentes para guichê:', error);
            Utils.showToast('Erro ao carregar atendentes', 'error');
        }
    }

    async loadCallSettings() {
        try {
            Utils.showLoading(true, 'Carregando configurações de chamada...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/call_settings`);
            const settings = response.data;
            document.getElementById('call-priority').value = settings.priority || 'fifo';
            document.getElementById('call-counter').value = settings.counter_id || 'auto';
            document.getElementById('call-sound').value = settings.sound || 'default';
            document.getElementById('call-interval').value = settings.interval || 30;
            await this.loadCountersForCallSettings();
        } catch (error) {
            console.error('Erro ao carregar configurações de chamada:', error);
            Utils.showToast('Erro ao carregar configurações de chamada', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async saveCallSettings(data) {
        try {
            Utils.showLoading(true, 'Salvando configurações de chamada...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/call_settings`, data);
            Utils.showToast(response.data.message || 'Configurações salvas com sucesso', 'success');
            document.getElementById('call-settings-modal').classList.add('hidden');
        } catch (error) {
            console.error('Erro ao salvar configurações de chamada:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao salvar configurações de chamada', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadCountersForCallSettings() {
        try {
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/counters`);
            const counters = response.data;
            const select = document.getElementById('call-counter');
            select.innerHTML = '<option value="auto">Automático</option>';
            counters.forEach(counter => {
                const option = document.createElement('option');
                option.value = counter.id;
                option.textContent = `Guichê ${counter.number}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar guichês para configurações de chamada:', error);
            Utils.showToast('Erro ao carregar guichês', 'error');
        }
    }

    showAssignQueueModal(attendantId) {
        document.getElementById('assign-queue-modal').classList.remove('hidden');
        document.getElementById('assign-queue-form').dataset.attendantId = attendantId;
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
                    <p class="text-sm text-gray-500">Horário: ${schedule.is_closed ? 'Fechado' : `${Utils.formatTime(schedule.open_time)} - ${Utils.formatTime(schedule.end_time)}`}</p>
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
            Utils.showToast(response.data.message || 'Horário criado com sucesso', 'success');
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
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/overview`, {
                params: { refresh: true }
            });
            const data = response.data;

            document.getElementById('active-queues').textContent = data.queues.filter(q => q.status === 'Aberto').length;
            document.getElementById('pending-tickets').textContent = data.ticket_stats.pending;
            document.getElementById('today-calls').textContent = data.ticket_stats.attended;
            document.getElementById('active-users').textContent = data.attendants.length;

            this.updateRecentTickets(data.queues);
            this.updateActivityChart(data.queues);
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            Utils.showToast('Erro ao carregar dados do dashboard', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    updateRecentTickets(queues) {
        const container = document.getElementById('recent-tickets');
        container.innerHTML = '';
        queues.forEach(queue => {
            if (queue.current_ticket) {
                const ticketCard = document.createElement('div');
                ticketCard.className = 'bg-white rounded-lg p-3 border border-gray-100';
                ticketCard.innerHTML = `
                    <p class="font-medium">${queue.current_ticket.ticket_number}</p>
                    <p class="text-sm text-gray-500">${queue.service_name}</p>
                    <p class="text-sm text-gray-500">${queue.current_ticket.status}</p>
                    <p class="text-sm text-gray-500">${queue.current_ticket.counter}</p>
                `;
                container.appendChild(ticketCard);
            }
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
        const socket = io(API_BASE, { path: '/socket.io', query: { namespace: '/branch_admin' } });
        socket.on('connect', () => {
            console.log('Conectado ao WebSocket');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            socket.emit('join', { room: `branch_${branchId}` });
        });
        socket.on('ticket_updated', (data) => {
            ticketManager.loadTickets();
            Utils.showToast(`Ticket ${data.ticket_number} atualizado: ${data.status}`, 'info');
        });
        socket.on('ticket_called', (data) => {
            ticketManager.loadTickets();
            queueManager.loadQueues();
            Utils.showToast(`Ticket ${data.ticket_number} chamado no ${data.counter}`, 'info');
        });
        socket.on('ticket_recalled', (data) => {
            ticketManager.loadTickets();
            Utils.showToast(`Ticket ${data.ticket_number} rechamado no ${data.counter}`, 'info');
        });
        socket.on('ticket_cancelled', () => {
            ticketManager.loadTickets();
            queueManager.loadQueues();
            Utils.showToast('Ticket cancelado', 'info');
        });
        socket.on('queue_updated', (data) => {
            queueManager.loadQueues();
            Utils.showToast(`Fila atualizada: ${data.status}`, 'info');
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
        socket.on('counter_created', () => {
            settingsManager.loadCounters();
            Utils.showToast('Novo guichê criado', 'info');
        });
        socket.on('call_settings_updated', () => {
            settingsManager.loadCallSettings();
            Utils.showToast('Configurações de chamada atualizadas', 'info');
        });
    }
}

class CallManager {
    constructor() {
        this.currentQueueId = null;
        this.currentTicket = null;
        this.timeElapsedInterval = null;
        this.initEventListeners();
        this.loadCallSettings();
        this.loadRecentCalls();
        this.setupSocketIO();
    }

    initEventListeners() {
        // Botão de configurações
        document.getElementById('call-settings-btn').addEventListener('click', () => {
            document.getElementById('call-settings-modal').classList.remove('hidden');
        });

        // Formulário de configurações
        document.getElementById('call-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCallSettings();
        });

        // Botões de cancelar e fechar modal
        document.getElementById('cancel-call-settings').addEventListener('click', () => {
            document.getElementById('call-settings-modal').classList.add('hidden');
        });
        document.getElementById('close-call-settings-modal').addEventListener('click', () => {
            document.getElementById('call-settings-modal').classList.add('hidden');
        });

        // Botão Chamar Próxima
        document.getElementById('call-next-btn').addEventListener('click', () => {
            if (!this.currentQueueId) {
                Utils.showToast('Selecione uma fila no filtro', 'error');
                return;
            }
            this.callNextTicket();
        });

        // Botão Rechamar
        document.getElementById('recall-btn').addEventListener('click', () => {
            this.recallTicket();
        });

        // Botão Finalizar
        document.getElementById('complete-call-btn').addEventListener('click', () => {
            this.completeTicket();
        });

        // Botão Ver Detalhes
        document.getElementById('view-ticket-btn').addEventListener('click', () => {
            this.viewTicketDetails();
        });

        // Botão Pausar
        document.getElementById('pause-call-btn').addEventListener('click', () => {
            queueManager.toggleQueuePause(this.currentQueueId);
        });

        // Botão Retomar
        document.getElementById('resume-call-btn').addEventListener('click', () => {
            queueManager.toggleQueuePause(this.currentQueueId);
        });

        // Botão Cancelar
        document.getElementById('cancel-call-btn').addEventListener('click', () => {
            this.cancelTicket();
        });

        // Botão Atualizar Próximos
        document.getElementById('refresh-queue').addEventListener('click', () => {
            this.loadNextInQueue();
        });

        // Filtro de busca de últimas chamadas
        document.getElementById('last-calls-filter').addEventListener('input', (e) => {
            this.filterLastCalls(e.target.value);
        });

        // Filtro de filas
        document.getElementById('queue-filter-select').addEventListener('change', (e) => {
            this.currentQueueId = e.target.value;
            this.loadNextInQueue();
            this.updateCallButtonState();
        });
    }

    async loadCallSettings() {
        try {
            Utils.showLoading(true, 'Carregando configurações de chamada...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/call_settings`);
            const settings = response.data;
            document.getElementById('call-priority').value = settings.priority || 'fifo';
            document.getElementById('call-counter').value = settings.counter_id || 'auto';
            document.getElementById('call-sound').value = settings.sound || 'default';
            document.getElementById('call-interval').value = settings.interval || 30;
            await this.loadCountersForCallSettings();
        } catch (error) {
            console.error('Erro ao carregar configurações de chamada:', error);
            Utils.showToast('Erro ao carregar configurações de chamada', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadCountersForCallSettings() {
        try {
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`);
            const queues = response.data;
            const counterSelect = document.getElementById('call-counter');
            counterSelect.innerHTML = '<option value="auto">Automático</option>';
            queues.forEach(queue => {
                for (let i = 1; i <= queue.num_counters; i++) {
                    const option = document.createElement('option');
                    option.value = `${queue.id}:${i}`;
                    option.textContent = `${queue.service_name} - Guichê ${i}`;
                    counterSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Erro ao carregar guichês:', error);
        }
    }

    async saveCallSettings() {
        try {
            Utils.showLoading(true, 'Salvando configurações de chamada...');
            const form = document.getElementById('call-settings-form');
            const data = {
                priority: form.priority.value,
                counter_id: form.counter_id.value,
                sound: form.sound.value,
                interval: parseInt(form.interval.value)
            };
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/call_settings`, data);
            Utils.showToast('Configurações salvas com sucesso', 'success');
            document.getElementById('call-settings-modal').classList.add('hidden');
        } catch (error) {
            console.error('Erro ao salvar configurações de chamada:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao salvar configurações', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async callNextTicket() {
        try {
            Utils.showLoading(true, 'Chamando próximo ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const counter = document.getElementById('call-counter').value;
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${this.currentQueueId}/call`, {
                counter: counter.includes(':') ? parseInt(counter.split(':')[1]) : counter
            });
            this.currentTicket = response.data.ticket;
            this.updateCallPanel();
            this.playCallSound();
            this.startTimeElapsed();
            this.loadNextInQueue();
            this.loadRecentCalls();
            Utils.showToast(response.data.message, 'success');
        } catch (error) {
            console.error('Erro ao chamar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao chamar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async recallTicket() {
        if (!this.currentTicket) {
            Utils.showToast('Nenhum ticket atual para rechamar', 'error');
            return;
        }
        try {
            Utils.showLoading(true, 'Rechamando ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${this.currentQueueId}/recall`, {
                ticket_id: this.currentTicket.id
            });
            this.playCallSound();
            Utils.showToast(response.data.message || 'Ticket rechamado com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao rechamar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao rechamar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async completeTicket() {
        if (!this.currentTicket) {
            Utils.showToast('Nenhum ticket atual para finalizar', 'error');
            return;
        }
        try {
            Utils.showLoading(true, 'Finalizando ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${this.currentQueueId}/tickets/${this.currentTicket.id}/complete`);
            this.currentTicket = null;
            this.updateCallPanel();
            this.stopTimeElapsed();
            this.loadNextInQueue();
            this.loadRecentCalls();
            Utils.showToast(response.data.message, 'success');
        } catch (error) {
            console.error('Erro ao finalizar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao finalizar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async cancelTicket() {
        if (!this.currentTicket) {
            Utils.showToast('Nenhum ticket atual para cancelar', 'error');
            return;
        }
        try {
            Utils.showLoading(true, 'Cancelando ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.post(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${this.currentQueueId}/tickets/${this.currentTicket.id}/cancel`);
            this.currentTicket = null;
            this.updateCallPanel();
            this.stopTimeElapsed();
            this.loadNextInQueue();
            this.loadRecentCalls();
            Utils.showToast(response.data.message || 'Ticket cancelado com sucesso', 'success');
        } catch (error) {
            console.error('Erro ao cancelar ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao cancelar ticket', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async viewTicketDetails() {
        if (!this.currentTicket) {
            Utils.showToast('Nenhum ticket atual para visualizar', 'error');
            return;
        }
        try {
            Utils.showLoading(true, 'Carregando detalhes do ticket...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${this.currentQueueId}/tickets/${this.currentTicket.id}`);
            const ticket = response.data;
            // Exibir detalhes em um modal ou popup
            Utils.showToast(`Ticket: ${ticket.ticket_number}\nServiço: ${ticket.service_name}\nGuichê: ${ticket.counter}\nStatus: ${ticket.status}`, 'info');
        } catch (error) {
            console.error('Erro ao carregar detalhes do ticket:', error);
            Utils.showToast(error.response?.data?.error || 'Erro ao carregar detalhes', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadNextInQueue() {
        if (!this.currentQueueId) {
            document.getElementById('next-in-queue').innerHTML = '<p class="text-gray-500">Selecione uma fila no filtro</p>';
            return;
        }
        try {
            Utils.showLoading(true, 'Carregando próximos na fila...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues/${this.currentQueueId}/next_tickets`);
            const tickets = response.data;
            const container = document.getElementById('next-in-queue');
            container.innerHTML = '';
            if (tickets.length === 0) {
                container.innerHTML = '<p class="text-gray-500">Nenhum ticket pendente</p>';
                return;
            }
            tickets.forEach(ticket => {
                const ticketItem = document.createElement('div');
                ticketItem.className = 'bg-gray-50 rounded-lg p-3 flex justify-between items-center';
                ticketItem.innerHTML = `
                    <div>
                        <p class="text-sm font-medium">${ticket.ticket_number}</p>
                        <p class="text-xs text-gray-500">${ticket.service_name}</p>
                    </div>
                    <span class="text-xs text-gray-500">${ticket.priority ? 'Prioridade' : 'Normal'}</span>
                `;
                container.appendChild(ticketItem);
            });
        } catch (error) {
            console.error('Erro ao carregar próximos na fila:', error);
            Utils.showToast('Erro ao carregar próximos na fila', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async loadRecentCalls() {
        try {
            Utils.showLoading(true, 'Carregando últimas chamadas...');
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/recent_calls`);
            const calls = response.data;
            const tbody = document.getElementById('last-calls');
            tbody.innerHTML = '';
            calls.forEach(call => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-gray-50';
                row.innerHTML = `
                    <td class="py-3 px-4 text-sm">${call.ticket_number}</td>
                    <td class="py-3 px-4 text-sm">${call.service_name}</td>
                    <td class="py-3 px-4 text-sm">${call.counter || 'N/A'}</td>
                    <td class="py-3 px-4 text-sm">${call.called_at ? new Date(call.called_at).toLocaleTimeString() : 'N/A'}</td>
                    <td class="py-3 px-4 text-sm">${call.status}</td>
                `;
                tbody.appendChild(row);
            });
        } catch (error) {
            console.error('Erro ao carregar últimas chamadas:', error);
            Utils.showToast('Erro ao carregar últimas chamadas', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    filterLastCalls(searchText) {
        const rows = document.querySelectorAll('#last-calls tr');
        const search = searchText.toLowerCase();
        rows.forEach(row => {
            const ticketNumber = row.cells[0].textContent.toLowerCase();
            const serviceName = row.cells[1].textContent.toLowerCase();
            row.style.display = ticketNumber.includes(search) || serviceName.includes(search) ? '' : 'none';
        });
    }

    async loadQueueFilter() {
        try {
            const branchId = localStorage.getItem('branchId') || sessionStorage.getItem('branchId');
            const response = await axios.get(`${API_BASE}/api/branch_admin/branches/${branchId}/queues`);
            const queues = response.data;
            const select = document.getElementById('queue-filter-select');
            select.innerHTML = '<option value="">Selecione uma fila</option>';
            queues.forEach(queue => {
                const option = document.createElement('option');
                option.value = queue.id;
                option.textContent = `${queue.service_name} (${queue.prefix})`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar filtro de filas:', error);
            Utils.showToast('Erro ao carregar filas', 'error');
        }
    }

    updateCallPanel() {
        const ticketEl = document.getElementById('current-ticket');
        const serviceEl = document.getElementById('current-service');
        const counterEl = document.getElementById('current-counter');
        const statusEl = document.getElementById('call-status');
        const avgWaitEl = document.getElementById('avg-wait-time');
        const waitBar = document.getElementById('wait-bar');

        if (this.currentTicket) {
            ticketEl.textContent = this.currentTicket.ticket_number;
            serviceEl.textContent = this.currentTicket.service_name || 'N/A';
            counterEl.textContent = `Guichê ${this.currentTicket.counter}`;
            statusEl.textContent = 'Ativa';
            avgWaitEl.textContent = this.currentTicket.avg_wait_time ? `${this.currentTicket.avg_wait_time} min` : 'N/A';
            waitBar.style.width = this.currentTicket.avg_wait_time ? `${Math.min(this.currentTicket.avg_wait_time * 5, 100)}%` : '0%';
        } else {
            ticketEl.textContent = '---';
            serviceEl.textContent = '';
            counterEl.textContent = '';
            statusEl.textContent = 'Inativa';
            avgWaitEl.textContent = 'N/A';
            waitBar.style.width = '0%';
        }
    }

    playCallSound() {
        const sound = document.getElementById('call-sound').value;
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.play().catch(err => console.error('Erro ao tocar som:', err));
    }

    startTimeElapsed() {
        this.stopTimeElapsed();
        const timeEl = document.getElementById('current-time-elapsed').querySelector('span');
        let seconds = 0;
        this.timeElapsedInterval = setInterval(() => {
            seconds++;
            timeEl.textContent = `${seconds}s`;
        }, 1000);
    }

    stopTimeElapsed() {
        if (this.timeElapsedInterval) {
            clearInterval(this.timeElapsedInterval);
            this.timeElapsedInterval = null;
            document.getElementById('current-time-elapsed').querySelector('span').textContent = '0s';
        }
    }

    updateCallButtonState() {
        const callBtn = document.getElementById('call-next-btn');
        callBtn.disabled = !this.currentQueueId;
        callBtn.classList.toggle('opacity-50', !this.currentQueueId);
        callBtn.classList.toggle('cursor-not-allowed', !this.currentQueueId);
    }

    setupSocketIO() {
        socket.on('ticket_called', (data) => {
            if (data.queue_id === this.currentQueueId) {
                this.currentTicket = {
                    id: data.ticket_id,
                    ticket_number: data.ticket_number,
                    counter: data.counter,
                    service_name: data.service_name
                };
                this.updateCallPanel();
                this.playCallSound();
                this.startTimeElapsed();
                this.loadNextInQueue();
                this.loadRecentCalls();
            }
        });
        socket.on('ticket_completed', (data) => {
            if (data.queue_id === this.currentQueueId) {
                this.currentTicket = null;
                this.updateCallPanel();
                this.stopTimeElapsed();
                this.loadNextInQueue();
                this.loadRecentCalls();
            }
        });
        socket.on('queue_updated', () => {
            this.loadQueueFilter();
            this.loadNextInQueue();
        });
    }
}
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
                    settingsManager.loadCounters();
                    break;
                case 'call': 
                    settingsManager.loadCountersForCallSettings();
                    queueManager.loadQueues();
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
    document.getElementById('generate-report-btn')?.addEventListener('click', () => reportManager.generateReport());
    document.getElementById('create-queue-btn')?.addEventListener('click', () => {
        document.getElementById('queue-modal-title').textContent = 'Nova Fila';
        document.getElementById('queue-form').reset();
        document.getElementById('queue_id').value = '';
        document.getElementById('queue-modal').classList.remove('hidden');
    });
    document.getElementById('queue-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            department_id: document.getElementById('queue-department')?.value,
            service_id: document.getElementById('queue-service')?.value,
            prefix: document.getElementById('queue-prefix').value,
            daily_limit: parseInt(document.getElementById('daily-limit').value),
            num_counters: parseInt(document.getElementById('num-counters').value)
        };
        const queueId = document.getElementById('queue_id').value;
        if (queueId) {
            Utils.showToast('Edição de fila não implementada', 'info');
        } else {
            queueManager.createQueue(data);
        }
    });
    document.getElementById('close-queue-modal')?.addEventListener('click', () => document.getElementById('queue-modal').classList.add('hidden'));
    document.getElementById('cancel-queue')?.addEventListener('click', () => document.getElementById('queue-modal').classList.add('hidden'));
    document.getElementById('generate-ticket-btn')?.addEventListener('click', () => {
        document.getElementById('ticket-modal').classList.remove('hidden');
        settingsManager.loadAvailableQueuesForAssignment();
    });
    document.getElementById('ticket-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            queue_id: document.getElementById('ticket-queue').value,
            priority: document.getElementById('ticket-priority').value,
            notes: document.getElementById('ticket-notes').value,
            source: 'manual'
        };
        ticketManager.generateTicket(data);
    });
    document.getElementById('close-ticket-modal')?.addEventListener('click', () => document.getElementById('ticket-modal').classList.add('hidden'));
    document.getElementById('cancel-ticket')?.addEventListener('click', () => document.getElementById('ticket-modal').classList.add('hidden'));
    document.getElementById('create-department-btn')?.addEventListener('click', () => document.getElementById('department-modal').classList.remove('hidden'));
    document.getElementById('department-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            name: document.getElementById('dept-name').value,
            description: document.getElementById('dept-description').value
        };
        settingsManager.createDepartment(data);
    });
    document.getElementById('close-department-modal')?.addEventListener('click', () => document.getElementById('department-modal').classList.add('hidden'));
    document.getElementById('cancel-department-btn')?.addEventListener('click', () => document.getElementById('department-modal').classList.add('hidden'));
    document.getElementById('add-member-btn')?.addEventListener('click', () => {
        document.getElementById('member-modal').classList.remove('hidden');
        settingsManager.loadAttendantsForCounter();
    });
    document.getElementById('member-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            email: document.getElementById('member-email').value,
            name: document.getElementById('member-name').value,
            role: 'ATTENDANT'
        };
        settingsManager.createAttendant(data);
    });
    document.getElementById('close-member-modal')?.addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));
    document.getElementById('cancel-member')?.addEventListener('click', () => document.getElementById('member-modal').classList.add('hidden'));
    document.getElementById('create-schedule-btn')?.addEventListener('click', () => document.getElementById('schedule-modal').classList.remove('hidden'));
    document.getElementById('schedule-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            weekday: document.getElementById('schedule-weekday').value,
            open_time: document.getElementById('schedule-open-time').value,
            end_time: document.getElementById('schedule-end-time').value,
            is_closed: document.getElementById('schedule-is-closed').checked
        };
        settingsManager.createSchedule(data);
    });
    document.getElementById('close-schedule-modal')?.addEventListener('click', () => document.getElementById('schedule-modal').classList.add('hidden'));
    document.getElementById('cancel-schedule-btn')?.addEventListener('click', () => document.getElementById('schedule-modal').classList.add('hidden'));
    document.getElementById('assign-queue-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const attendantId = e.target.dataset.attendantId;
        const queueId = document.getElementById('assign-queue-id').value;
        settingsManager.assignAttendantToQueue(attendantId, queueId);
    });
    document.getElementById('close-assign-queue-modal')?.addEventListener('click', () => document.getElementById('assign-queue-modal').classList.add('hidden'));
    document.getElementById('cancel-assign-queue-btn')?.addEventListener('click', () => document.getElementById('assign-queue-modal').classList.add('hidden'));
    document.getElementById('refresh-data')?.addEventListener('click', () => dashboardManager.loadDashboardData());
    document.getElementById('create-counter-btn')?.addEventListener('click', () => {
        document.getElementById('counter-modal-title').textContent = 'Novo Guichê';
        document.getElementById('counter-form').reset();
        document.getElementById('counter_id').value = '';
        settingsManager.loadAttendantsForCounter();
        document.getElementById('counter-modal').classList.remove('hidden');
    });
    document.getElementById('counter-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            number: document.getElementById('counter-number').value,
            attendant_id: document.getElementById('counter-attendant').value || null,
            status: document.getElementById('counter-status').value,
            location: document.getElementById('counter-location').value
        };
        const counterId = document.getElementById('counter_id').value;
        if (counterId) {
            Utils.showToast('Edição de guichê não implementada', 'info');
        } else {
            settingsManager.createCounter(data);
        }
    });
    document.getElementById('close-counter-modal')?.addEventListener('click', () => document.getElementById('counter-modal').classList.add('hidden'));
    document.getElementById('cancel-counter')?.addEventListener('click', () => document.getElementById('counter-modal').classList.add('hidden'));
    document.getElementById('call-settings-btn')?.addEventListener('click', () => {
        settingsManager.loadCallSettings();
        document.getElementById('call-settings-modal').classList.remove('hidden');
    });
    document.getElementById('call-settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            priority: document.getElementById('call-priority').value,
            counter_id: document.getElementById('call-counter').value,
            sound: document.getElementById('call-sound').value,
            interval: parseInt(document.getElementById('call-interval').value)
        };
        settingsManager.saveCallSettings(data);
    });
    document.getElementById('close-call-settings-modal')?.addEventListener('click', () => document.getElementById('call-settings-modal').classList.add('hidden'));
    document.getElementById('cancel-call-settings')?.addEventListener('click', () => document.getElementById('call-settings-modal').classList.add('hidden'));
    document.getElementById('export-report-btn')?.addEventListener('click', () => {
        document.getElementById('export-report-modal').classList.remove('hidden');
        settingsManager.loadAvailableQueuesForAssignment();
    });
    document.getElementById('export-report-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            queue_id: document.getElementById('export-queue').value,
            start_date: document.getElementById('export-start-date').value,
            end_date: document.getElementById('export-end-date').value
        };
        reportManager.exportReport(data);
    });
    document.getElementById('close-export-report-modal')?.addEventListener('click', () => document.getElementById('export-report-modal').classList.add('hidden'));
    document.getElementById('cancel-export-report')?.addEventListener('click', () => document.getElementById('export-report-modal').classList.add('hidden'));
    document.getElementById('ticket-details-modal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('ticket-details-modal') || e.target.id === 'close-ticket-details') {
            document.getElementById('ticket-details-modal').classList.add('hidden');
        }
    });
    document.getElementById('ticket-status-filter')?.addEventListener('change', (e) => {
        ticketManager.loadTickets(e.target.value);
    });
});