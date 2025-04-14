import { ApiService } from '../common/api-service.js';
import { formatTicketStatus, formatQueueStatus, showNotification } from '../common/utils.js';

export async function updateDashboardAdmin() {
    if (!localStorage.getItem('token')) return;
    try {
        const queues = await ApiService.getAdminQueues();
        const tickets = await ApiService.getAdminTickets();

        document.getElementById('active-queues').textContent = queues.filter(q => q.active_tickets < q.daily_limit).length;
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'Pendente').length;
        document.getElementById('attended-tickets').textContent = tickets.filter(t => t.status === 'attended').length;
        document.getElementById('cancelled-tickets').textContent = tickets.filter(t => t.status === 'Cancelado').length;
        document.getElementById('avg-wait-time').textContent = calculateAvgWaitTime(tickets);
        document.getElementById('attendance-rate').textContent = calculateAttendanceRate(tickets);
        document.getElementById('paused-queues').textContent = queues.filter(q => q.paused).length;

        const recentTickets = tickets.slice(0, 5);
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

function calculateAvgWaitTime(tickets) {
    const attended = tickets.filter(t => t.status === 'attended' && t.issued_at && t.attended_at);
    if (!attended.length) return '0 min';
    const total = attended.reduce((sum, t) => {
        const issued = new Date(t.issued_at);
        const attended = new Date(t.attended_at);
        return sum + (attended - issued) / 1000 / 60;
    }, 0);
    return `${Math.round(total / attended.length)} min`;
}

function calculateAttendanceRate(tickets) {
    const today = new Date().setHours(0, 0, 0, 0);
    const attendedToday = tickets.filter(t => t.status === 'attended' && new Date(t.attended_at).setHours(0, 0, 0, 0) === today);
    return attendedToday.length;
}

export function loadDashboard() {
    updateDashboardAdmin();
}

export function exportDashboard() {
    showNotification('Exportação não implementada', 'error');
}