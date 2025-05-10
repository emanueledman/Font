// js/attendant/tickets.js
import {
    toggleLoading,
    showToast,
    showError,
    showSuccess,
    formatDateTime,
    formatWaitTime
} from './utils.js';

const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Busca tickets
async function fetchTickets() {
    try {
        toggleLoading(true, 'Carregando tickets...');
        const response = await axios.get('/api/attendant/tickets', { timeout: 10000 });
        console.log('Resposta tickets:', response.data);
        renderTickets(response.data);
        renderTicketQueueFilter(response.data);
        updateNextQueue(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar tickets:', error.response || error);
        showToast('Falha ao carregar tickets.', 'error');
        document.getElementById('tickets').innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhum ticket disponível.</td></tr>';
        return [];
    } finally {
        toggleLoading(false);
    }
}

// Busca chamadas recentes
async function fetchRecentCalls() {
    try {
        toggleLoading(true, 'Carregando chamadas recentes...');
        const response = await axios.get('/api/attendant/recent-calls', { timeout: 10000 });
        console.log('Resposta recent calls:', response.data);
        renderRecentCalls(response.data);
        renderCallFilter(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar chamadas recentes:', error.response || error);
        showToast('Falha ao carregar chamadas recentes.', 'error');
        document.getElementById('recent-calls-table').innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return [];
    } finally {
        toggleLoading(false);
    }
}

// Busca próximos na fila
async function fetchNextInQueue(queueId) {
    try {
        toggleLoading(true, 'Carregando próximos na fila...');
        const response = await axios.get(`/api/attendant/queue/${queueId}/next`, { timeout: 10000 });
        console.log('Resposta next in queue:', response.data);
        renderNextQueue(response.data);
        return response.data;
    } catch (error) {
        console.error('Erro ao buscar próximos na fila:', error.response || error);
        showToast('Falha ao carregar próximos na fila.', 'error');
        document.getElementById('next-queue').innerHTML = '<p class="text-gray-500 text-center">Nenhum ticket na fila.</p>';
        return [];
    } finally {
        toggleLoading(false);
    }
}

// Renderiza tickets na tabela
function renderTickets(tickets) {
    const tbody = document.getElementById('tickets');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhum ticket disponível.</td></tr>';
        return;
    }
    tickets.forEach(ticket => {
        const tr = document.createElement('tr');
        tr.dataset.queueId = ticket.queue_id;
        tr.innerHTML = `
            <td class="px-4 py-3">${ticket.number}</td>
            <td class="px-4 py-3">${ticket.service}</td>
            <td class="px-4 py-3">${ticket.status}</td>
            <td class="px-4 py-3">${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</td>
            <td class="px-4 py-3">${formatDateTime(ticket.issued_at)}</td>
            <td class="px-4 py-3">
                ${ticket.status === 'Pendente' ? `<button onclick="callTicket('${ticket.queue_id}', '${ticket.id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm">Chamar</button>` : ''}
                ${ticket.status === 'Chamado' ? `<button onclick="completeTicket('${ticket.id}')" class="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-sm">Finalizar</button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Renderiza chamadas recentes
function renderRecentCalls(calls) {
    const tbody = document.getElementById('recent-calls-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!calls || calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-3 text-gray-500 text-center">Nenhuma chamada recente.</td></tr>';
        return;
    }
    calls.forEach(call => {
        const statusColor = call.status === 'Atendido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-3">${call.ticket_number}</td>
            <td class="px-4 py-3">${call.service}</td>
            <td class="px-4 py-3">Guichê ${call.counter}</td>
            <td class="px-4 py-3">${formatDateTime(call.called_at)}</td>
            <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${call.status}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Renderiza filtro de chamadas
function renderCallFilter(calls) {
    const select = document.getElementById('call-filter');
    if (!select) return;
    select.innerHTML = '<option value="">Todas as filas</option>';
    const services = [...new Set(calls.map(call => call.service))];
    services.forEach(service => {
        const option = document.createElement('option');
        option.value = service;
        option.textContent = service;
        select.appendChild(option);
    });
}

// Renderiza filtro de filas para tickets
function renderTicketQueueFilter(tickets) {
    const select = document.getElementById('ticket-queue-filter');
    if (!select) return;
    select.innerHTML = '<option value="all">Todas as filas</option>';
    const queues = [...new Set(tickets.map(ticket => ticket.queue_id))];
    const queueData = JSON.parse(localStorage.getItem('queues')) || [];
    queues.forEach(queueId => {
        const queue = queueData.find(q => q.id === queueId);
        if (queue) {
            const option = document.createElement('option');
            option.value = queueId;
            option.textContent = queue.service;
            select.appendChild(option);
        }
    });
}

// Atualiza próximos na fila
function updateNextQueue(tickets) {
    const nextQueue = document.getElementById('next-queue');
    if (!nextQueue) return;
    nextQueue.innerHTML = '';
    const pending = tickets.filter(t => t.status === 'Pendente').slice(0, 5);
    if (pending.length === 0) {
        nextQueue.innerHTML = '<p class="text-gray-500 text-center">Nenhuma senha na fila.</p>';
        return;
    }
    pending.forEach(ticket => {
        const div = document.createElement('div');
        div.className = 'p-3 bg-gray-50 rounded-lg flex justify-between items-center';
        div.innerHTML = `
            <div>
                <p class="font-medium">${ticket.number}</p>
                <p class="text-xs text-gray-500">${ticket.service}</p>
            </div>
            <p class="text-sm text-gray-600">${formatDateTime(ticket.issued_at)}</p>
        `;
        nextQueue.appendChild(div);
    });
}

// Valida QR code
async function validateQrCode(qrCode) {
    try {
        toggleLoading(true, 'Validando QR code...');
        const response = await axios.post('/api/ticket/validate', { qr_code: qrCode }, { timeout: 5000 });
        showSuccess(`Presença validada para ticket ${response.data.ticket_id}!`);
        await fetchTickets();
        return response.data;
    } catch (error) {
        console.error('Erro ao validar QR code:', error.response || error);
        showToast('Falha ao validar QR code.', 'error');
        throw error;
    } finally {
        toggleLoading(false);
    }
}

// Chama ticket específico
async function callTicket(queueId, ticketId) {
    try {
        toggleLoading(true, 'Chamando ticket...');
        const response = await axios.post(`/api/attendant/queue/${queueId}/call`, { ticket_id: ticketId }, { timeout: 5000 });
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        await Promise.all([
            fetchTickets(),
            fetchRecentCalls(),
            fetchNextInQueue(queueId)
        ]);
        return response.data;
    } catch (error) {
        console.error('Erro ao chamar ticket:', error.response || error);
        showToast('Falha ao chamar ticket.', 'error');
        throw error;
    } finally {
        toggleLoading(false);
    }
}

// Finaliza ticket
async function completeTicket(ticketId) {
    try {
        toggleLoading(true, 'Finalizando atendimento...');
        const response = await axios.post(`/api/attendant/ticket/${ticketId}/complete`, {}, { timeout: 5000 });
        showSuccess('Atendimento finalizado com sucesso!');
        await Promise.all([
            fetchTickets(),
            fetchRecentCalls()
        ]);
        return response.data;
    } catch (error) {
        console.error('Erro ao finalizar ticket:', error.response || error);
        showToast('Falha ao finalizar ticket.', 'error');
        throw error;
    } finally {
        toggleLoading(false);
    }
}

export {
    fetchTickets,
    fetchRecentCalls,
    fetchNextInQueue,
    renderTickets,
    renderRecentCalls,
    renderCallFilter,
    renderTicketQueueFilter,
    updateNextQueue,
    validateQrCode,
    callTicket,
    completeTicket
};