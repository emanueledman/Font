import { ApiService } from '../common/api-service.js';
import { formatTicketStatus, formatDate, showNotification } from '../common/utils.js';

export async function updateTicketsManager() {
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
            </div>
        `).join('');
    } catch (error) {
        showNotification('Erro ao atualizar tickets: ' + error.message, 'error');
    }
}

export function loadTickets() {
    updateTicketsManager();
}