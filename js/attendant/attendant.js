// js/attendant/attendant.js
import {
    toggleLoading,
    showToast,
    showError,
    showSuccess,
    formatDateTime,
    updateCurrentDateTime,
    setupAxios,
    closeModal
} from './utils.js';
import {
    fetchTickets,
    fetchRecentCalls,
    fetchNextInQueue,
    renderQueueSelect,
    renderTickets,
    renderRecentCalls,
    renderCallFilter,
    renderTicketQueueFilter,
    validateQrCode,
    callTicket,
    completeTicket
} from './tickets.js';

const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
const socket = io(API_BASE, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    auth: { token: localStorage.getItem('attendantToken') || '' }
});

document.addEventListener('DOMContentLoaded', async () => {
    toggleLoading(true, 'Carregando painel...');

    setupAxios();

    try {
        await Promise.all([
            fetchUserInfo(),
            fetchAssignedQueues(),
            fetchCurrentTicket(),
            fetchRecentCalls()
        ]);

        await fetchTickets();
        setupSocketListeners();
        setupNavigation();
        setupEventListeners();
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000);
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao inicializar painel.', 'error');
    } finally {
        toggleLoading(false);
    }
});

// Busca informações do usuário
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/attendant/user', { timeout: 5000 });
        console.log('Resposta do perfil:', response.data);
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        if (userName) userName.textContent = response.data.name || 'Atendente';
        if (userEmail) userEmail.textContent = response.data.email || 'atendente@empresa.com';
    } catch (error) {
        console.error('Erro ao buscar usuário:', error.response || error);
        showToast('Não foi possível carregar informações do usuário.', 'warning');
    }
}

// Busca filas atribuídas
async function fetchAssignedQueues() {
    try {
        toggleLoading(true, 'Carregando filas...');
        const response = await axios.get('/api/attendant/queues', { timeout: 10000 });
        console.log('Resposta queues:', response.data);
        renderQueueSelect(response.data);
        localStorage.setItem('queues', JSON.stringify(response.data));
    } catch (error) {
        console.error('Erro ao buscar filas:', error.response || error);
        showToast('Falha ao carregar filas.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Busca ticket atual
async function fetchCurrentTicket() {
    try {
        const response = await axios.get('/api/attendant/current-ticket', { timeout: 5000 });
        console.log('Resposta current ticket:', response.data);
        updateCurrentTicket(response.data);
    } catch (error) {
        console.error('Erro ao buscar ticket atual:', error.response || error);
        showToast('Falha ao carregar ticket atual.', 'error');
        updateCurrentTicket({});
    }
}

// Atualiza ticket atual
function updateCurrentTicket(data) {
    const ticketEl = document.getElementById('current-ticket');
    const serviceEl = document.getElementById('current-service');
    const counterEl = document.getElementById('current-counter');
    const waitTimeEl = document.getElementById('avg-wait-time');
    const waitBarEl = document.getElementById('wait-bar');

    if (!data || !data.ticket_number) {
        ticketEl.textContent = '---';
        serviceEl.textContent = '';
        counterEl.textContent = '';
        waitTimeEl.textContent = 'N/A';
        waitBarEl.style.width = '0%';
        return;
    }

    ticketEl.textContent = data.ticket_number;
    serviceEl.textContent = data.service;
    counterEl.textContent = `Guichê ${data.counter}`;
    waitTimeEl.textContent = data.avg_wait_time ? formatWaitTime(data.avg_wait_time) : 'N/A';
    waitBarEl.style.width = data.avg_wait_time ? `${Math.min((data.avg_wait_time / 600) * 100, 100)}%` : '0%';
}

// Chama próximo ticket
async function callNext(queueId) {
    if (!queueId) {
        showToast('Selecione uma fila antes de chamar.', 'warning');
        return;
    }
    try {
        toggleLoading(true, 'Chamando próximo ticket...');
        const response = await axios.post(`/api/attendant/queue/${queueId}/call`, {}, { timeout: 5000 });
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls(),
            fetchNextInQueue(queueId),
            fetchTickets()
        ]);
    } catch (error) {
        console.error('Erro ao chamar próxima senha:', error.response || error);
        showToast('Falha ao chamar próxima senha.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Rechama ticket
async function recallTicket() {
    try {
        toggleLoading(true, 'Rechamando ticket...');
        const response = await axios.post('/api/attendant/recall', {}, { timeout: 5000 });
        showSuccess(`Senha ${response.data.ticket_number} rechamada para o guichê ${response.data.counter}!`);
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls()
        ]);
    } catch (error) {
        console.error('Erro ao rechamar ticket:', error.response || error);
        showToast('Falha ao rechamar ticket.', 'error');
    } finally {
        toggleLoading(false);
    }
}

// Configura navegação
function setupNavigation() {
    const sections = {
        'nav-call': 'call-section',
        'nav-tickets': 'tickets-section'
    };

    Object.keys(sections).forEach(navId => {
        const btn = document.getElementById(navId);
        if (btn) {
            btn.addEventListener('click', () => {
                Object.keys(sections).forEach(id => {
                    const otherBtn = document.getElementById(id);
                    const section = document.getElementById(sections[id]);
                    if (id === navId) {
                        otherBtn.classList.add('active', 'bg-blue-700');
                        otherBtn.classList.remove('hover:bg-blue-600');
                        if (section) section.classList.remove('hidden');
                        if (id === 'nav-tickets') fetchTickets();
                    } else {
                        otherBtn.classList.remove('active', 'bg-blue-700');
                        otherBtn.classList.add('hover:bg-blue-600');
                        if (section) section.classList.add('hidden');
                    }
                });
            });
        }
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('w-20', 'w-64');
        });
    }

    const logoutButton = document.getElementById('logout');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                toggleLoading(true, 'Saindo...');
                await axios.post('/api/logout', {}, { timeout: 5000 });
                localStorage.removeItem('attendantToken');
                window.location.href = '/index.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error.response || error);
                showToast('Falha ao sair. Sessão limpa localmente.', 'error');
                localStorage.removeItem('attendantToken');
                window.location.href = '/index.html';
            } finally {
                toggleLoading(false);
            }
        });
    }
}

// Configura WebSocket
function setupSocketListeners() {
    socket.on('connect', () => {
        console.log('Conectado ao WebSocket');
        showToast('Conexão em tempo real estabelecida.', 'success');
    });

    socket.on('ticket_called', async data => {
        showToast(`Ticket ${data.ticket_number} chamado por outro atendente.`, 'info');
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls(),
            fetchTickets()
        ]);
        const queueId = document.getElementById('queue-select').value;
        if (queueId) await fetchNextInQueue(queueId);
    });

    socket.on('ticket_completed', async data => {
        showToast(`Ticket ${data.ticket_number} finalizado.`, 'info');
        await Promise.all([
            fetchCurrentTicket(),
            fetchRecentCalls(),
            fetchTickets()
        ]);
    });

    socket.on('connect_error', () => {
        showToast('Falha na conexão em tempo real. Tentando reconectar...', 'error');
    });

    socket.on('disconnect', () => {
        showToast('Conexão perdida. Tentando reconectar...', 'error');
    });
}

// Configura eventos
function setupEventListeners() {
    // Modal de QR Code
    document.getElementById('validate-qr-btn').addEventListener('click', openQrModal);
    document.getElementById('validate-qr-btn-tickets').addEventListener('click', openQrModal);
    document.getElementById('cancel-qr-btn').addEventListener('click', () => closeModal('qr-modal'));
    document.getElementById('close-qr-modal').addEventListener('click', () => closeModal('qr-modal'));
    document.getElementById('qr-form').addEventListener('submit', async e => {
        e.preventDefault();
        const qrCode = document.getElementById('qr_code').value;
        await validateQrCode(qrCode);
        closeModal('qr-modal');
    });

    // Filtro de Tickets
    document.getElementById('ticket-filter').addEventListener('input', () => {
        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        document.querySelectorAll('#tickets tr').forEach(row => {
            const number = row.cells[0].textContent.toLowerCase();
            const service = row.cells[1].textContent.toLowerCase();
            row.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
        });
    });

    // Filtro de Status de Tickets
    document.getElementById('ticket-status-filter').addEventListener('change', () => {
        const status = document.getElementById('ticket-status-filter').value;
        document.querySelectorAll('#tickets tr').forEach(row => {
            const rowStatus = row.cells[2].textContent.toLowerCase();
            row.style.display = status === 'all' || rowStatus === status ? '' : 'none';
        });
    });

    // Filtro de Fila de Tickets
    document.getElementById('ticket-queue-filter').addEventListener('change', () => {
        const queueId = document.getElementById('ticket-queue-filter').value;
        document.querySelectorAll('#tickets tr').forEach(row => {
            const ticketQueueId = row.dataset.queueId;
            row.style.display = queueId === 'all' || ticketQueueId === queueId ? '' : 'none';
        });
    });

    // Seleção de Fila
    document.getElementById('queue-select').addEventListener('change', async e => {
        const queueId = e.target.value;
        if (queueId) {
            await fetchNextInQueue(queueId);
        } else {
            document.getElementById('next-queue').innerHTML = '<p class="text-gray-500 text-center">Selecione uma fila.</p>';
        }
    });

    // Ações de Chamada
    document.getElementById('call-next-btn').addEventListener('click', () => {
        const queueId = document.getElementById('queue-select').value;
        callNext(queueId);
    });
    document.getElementById('recall-btn').addEventListener('click', recallTicket);
    document.getElementById('complete-btn').addEventListener('click', () => {
        const currentTicket = document.getElementById('current-ticket').textContent;
        if (currentTicket !== '---') {
            completeTicket(currentTicket);
        } else {
            showToast('Nenhum ticket ativo para finalizar.', 'warning');
        }
    });

    // Atualizar Fila
    document.getElementById('refresh-queue').addEventListener('click', async () => {
        const queueId = document.getElementById('queue-select').value;
        if (!queueId) {
            showToast('Selecione uma fila para atualizar.', 'warning');
            return;
        }
        toggleLoading(true, 'Atualizando dados da fila...');
        try {
            await fetchNextInQueue(queueId);
            showToast('Dados da fila atualizados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            showToast('Falha ao atualizar dados.', 'error');
        } finally {
            toggleLoading(false);
        }
    });

    // Modal de Erro
    document.getElementById('close-error-btn').addEventListener('click', () => closeModal('error-modal'));
    document.getElementById('close-error-modal').addEventListener('click', () => closeModal('error-modal'));
}

// Abre modal de QR code
function openQrModal() {
    const modal = document.getElementById('qr-modal');
    document.getElementById('qr-form').reset();
    modal.classList.remove('hidden');
}

export {
    fetchUserInfo,
    fetchAssignedQueues,
    fetchCurrentTicket,
    updateCurrentTicket,
    callNext,
    recallTicket,
    setupNavigation,
    setupSocketListeners,
    setupEventListeners,
    openQrModal
};