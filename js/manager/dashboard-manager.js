import { ApiService } from '../common/api-service.js';
import { formatTicketStatus, formatDate, showNotification } from '../common/utils.js';

export async function updateDashboardManager() {
    if (!localStorage.getItem('token')) return;
    try {
        const tickets = await ApiService.getAdminTickets();
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
        document.getElementById('attended-tickets').textContent = tickets.filter(t => t.status === 'attended').length;

        const recentTickets = tickets.slice(0, 3);
        document.getElementById('recent-tickets-content').innerHTML = recentTickets.map(ticket => `
            <tr>
                <td>${ticket.ticket_number}</td>
                <td>${ticket.service}</td>
                <td>${ticket.counter || '-'}</td>
                <td>${formatDate(ticket.attended_at)}</td>
                <td>${formatTicketStatus(ticket.status)}</td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification('Erro ao atualizar dashboard: ' + error.message, 'error');
    }
}

export function loadDashboard() {
    updateDashboardManager();
}

export function exportDashboard() {
    showNotification('Exportação não permitida', 'error');
}