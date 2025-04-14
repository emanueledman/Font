import { ApiService } from '../common/api-service.js';
import { formatTicketStatus, formatDate, showNotification } from '../common/utils.js';

export async function updateTicketsManager() {
    console.log('updateTicketsManager chamado'); // Debug
    if (!localStorage.getItem('token')) {
        console.warn('Token não encontrado, pulando atualização de tickets'); // Debug
        return;
    }
    try {
        const ticketContent = document.getElementById('ticket-content');
        if (!ticketContent) {
            console.error('Elemento ticket-content não encontrado'); // Debug
            return;
        }

        const tickets = await ApiService.getAdminTickets();
        console.log('Tickets recebidos:', tickets); // Debug
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
        console.error('Erro em updateTicketsManager:', error); // Debug
        showNotification('Erro ao atualizar tickets: ' + error.message, 'error');
    }
}

export function loadTickets() {
    console.log('loadTickets chamado'); // Debug
    updateTicketsManager();
}