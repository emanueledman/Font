const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';

class QueueManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('userInfo')) || {};
        this.init();
    }

    async init() {
        if (!this.token || !this.user.email) {
            console.error('Usuário não autenticado');
            this.showError('Por favor, faça login novamente');
            setTimeout(() => window.location.href = 'login.html', 2000);
            return;
        }

        this.setupListeners();
        await this.loadData();
    }

    setupListeners() {
        document.getElementById('logout').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            window.location.href = 'login.html';
        });

        document.getElementById('call-next').addEventListener('click', async () => {
            const queueId = this.queueId;
            if (!queueId) {
                this.showError('Nenhuma fila selecionada');
                return;
            }
            try {
                document.getElementById('call-next').disabled = true;
                const response = await this.apiRequest(`/api/admin/queue/${queueId}/call`, 'POST');
                console.log('Ticket chamado:', response);
                this.showSuccess(`Ticket ${response.ticket_number} chamado para guichê ${response.counter}`);
                await this.loadData();
            } catch (error) {
                console.error('Erro ao chamar ticket:', error);
                this.showError('Erro ao chamar próximo ticket');
            } finally {
                document.getElementById('call-next').disabled = false;
            }
        });
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };

        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);

        console.log(`Requisição para ${API_BASE_URL}${endpoint}`, { method, headers: { ...headers, Authorization: '[PROTECTED]' }, body });

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (response.status === 401) {
            console.error('Token inválido');
            this.showError('Sessão expirada');
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            setTimeout(() => window.location.href = 'login.html', 2000);
            throw new Error('Sessão expirada');
        }

        if (!response.ok) {
            const error = await response.text();
            console.error(`Erro ${response.status}: ${error}`);
            throw new Error(error || 'Erro na requisição');
        }

        return await response.json();
    }

    async loadData() {
        this.showLoading(true);
        try {
            // Carregar informações do usuário
            document.getElementById('user-email').textContent = `Email: ${this.user.email || 'N/A'}`;
            document.getElementById('user-department').textContent = `Departamento: ${this.user.department || 'N/A'}`;
            console.log('Usuário carregado:', this.user);

            // Carregar filas
            const queues = await this.apiRequest('/api/admin/queues');
            console.log('Resposta de /api/admin/queues:', queues);

            const queueInfo = document.getElementById('queue-info');
            const queueService = document.getElementById('queue-service');
            const queueStatus = document.getElementById('queue-status');
            const queueTickets = document.getElementById('queue-tickets');
            const callNextBtn = document.getElementById('call-next');

            if (queues.length === 0) {
                queueService.textContent = 'Nenhuma fila encontrada';
                queueStatus.textContent = 'Status: N/A';
                queueTickets.textContent = 'Tickets Ativos: 0';
                callNextBtn.disabled = true;
                console.warn('Nenhuma fila retornada');
            } else {
                const queue = queues[0]; // Assume 1 fila, conforme log
                this.queueId = queue.id;
                queueService.textContent = `Serviço: ${queue.service}`;
                queueStatus.textContent = `Status: ${queue.status || 'N/A'}`;
                queueTickets.textContent = `Tickets Ativos: ${queue.active_tickets || 0}`;
                callNextBtn.disabled = queue.status !== 'Aberto';
                console.log('Fila carregada:', queue);
            }

            // Carregar tickets
            const tickets = await this.apiRequest('/api/tickets/admin');
            console.log('Resposta de /api/tickets/admin:', tickets);
            this.renderTickets(tickets);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados');
        } finally {
            this.showLoading(false);
        }
    }

    renderTickets(tickets) {
        const container = document.getElementById('tickets-container');
        container.innerHTML = '';

        if (!tickets || tickets.length === 0) {
            container.innerHTML = '<p>Nenhum ticket encontrado</p>';
            console.warn('Nenhum ticket retornado');
            return;
        }

        tickets.forEach(ticket => {
            const ticketDiv = document.createElement('div');
            ticketDiv.className = 'ticket-item';
            ticketDiv.innerHTML = `
                <p><strong>Ticket:</strong> ${ticket.number}</p>
                <p><strong>Serviço:</strong> ${ticket.service}</p>
                <p><strong>Status:</strong> <span class="status-${ticket.status.toLowerCase()}">${ticket.status}</span></p>
                <p><strong>Guichê:</strong> ${ticket.counter || 'N/A'}</p>
                <p><strong>Emitido em:</strong> ${new Date(ticket.issued_at).toLocaleString('pt-BR')}</p>
            `;
            container.appendChild(ticketDiv);
        });

        console.log(`Renderizados ${tickets.length} tickets`);
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    }

    showSuccess(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.className = 'error success';
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
            errorDiv.className = 'error';
        }, 3000);
    }

    showLoading(show) {
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    new QueueManager();
});