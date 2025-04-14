import { ApiService } from '../common/api-service.js';
import { formatTicketStatus, formatDate, showNotification } from '../common/utils.js';

export async function updateTicketsAdmin() {
    if (!localStorage.getItem('token')) return;
    try {
        const tickets = await ApiService.getAdminTickets();
        const ticketContent = document.getElementById('ticket-content');
        ticketContent.innerHTML = tickets.map(ticket => `
            <div class="ticket-card">
                <div class="ticket-number">${ticket.ticket_number}</div>
                <div class="ticket-info">
                    <span>Serviço</span>
                    <span>${ticket.service}</span>
                </div>
                <div class="ticket-info">
                    <span>Status</span>
                    <span>${formatTicketStatus(ticket.status)}</span>
                </div>
                <div class="ticket-info">
                    <span>Emitido</span>
                    <span>${formatDate(ticket.issued_at)}</span>
                </div>
                <div class="ticket-actions">
                    <button onclick="callTicket('${ticket.id}')">Chamar</button>
                    <button onclick="cancelTicket('${ticket.id}')">Cancelar</button>
                </div>
            </div>
        `).join('');
        updateTicketHistory(tickets);
    } catch (error) {
        showNotification('Erro ao atualizar tickets: ' + error.message, 'error');
    }
}

function updateTicketHistory(tickets) {
    document.getElementById('ticket-history-content').innerHTML = tickets.map(ticket => `
        <tr>
            <td>${ticket.ticket_number}</td>
            <td>${ticket.status}</td>
            <td>${formatDate(ticket.updated_at)}</td>
            <td>${ticket.user || '-'}</td>
        </tr>
    `).join('');
}

export function loadTickets() {
    updateTicketsAdmin();
}