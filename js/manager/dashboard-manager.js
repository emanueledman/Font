import { ApiService } from '../common/api-service.js';
import { formatTicketStatus, formatDate, showNotification } from '../common/utils.js';

export async function updateDashboardManager() {
    console.log('updateDashboardManager chamado'); // Debug
    if (!localStorage.getItem('token')) {
        console.warn('Token não encontrado, pulando atualização do dashboard'); // Debug
        return;
    }
    try {
        const pendingTickets = document.getElementById('pending-tickets');
        const attendedTickets = document.getElementById('attended-tickets');
        const recentTicketsContent = document.getElementById('recent-tickets-content');
        if (!pendingTickets || !attendedTickets || !recentTicketsContent) {
            console.error('Elementos do dashboard não encontrados'); // Debug
            return;
        }

        const tickets = await ApiService.getAdminTickets();
        console.log('Tickets recebidos:', tickets); // Debug
        pendingTickets.textContent = tickets.filter(t => t.status === 'Pendente').length;
        attendedTickets.textContent = tickets.filter(t => t.status === 'attended').length;

        const recentTickets = tickets.slice(0, 3);
        recentTicketsContent.innerHTML = recentTickets.map(ticket => `
            <tr>
                <td>${ticket.ticket_number}</td>
                <td>${ticket.service}</td>
                <td>${ticket.counter || '-'}</td>
                <td>${formatDate(ticket.attended_at)}</td>
                <td>${formatTicketStatus(ticket.status)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro em updateDashboardManager:', error); // Debug
        showNotification('Erro ao atualizar dashboard: ' + error.message, 'error');
    }
}

export function loadDashboard() {
    console.log('loadDashboard chamado'); // Debug
    updateDashboardManager();
}

export function exportDashboard() {
    console.log('exportDashboard chamado'); // Debug
    showNotification('Exportação não permitida', 'error');
}