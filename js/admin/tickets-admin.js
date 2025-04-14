import { ApiService } from '../common/api-service.js';
import { showNotification } from '../common/utils.js';

export async function loadTickets() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    try {
        const tickets = await ApiService.getTickets(userInfo.department_id);
        const tbody = document.querySelector('#tickets-table tbody');
        tbody.innerHTML = '';
        tickets.forEach(ticket => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ticket.number}</td>
                <td>${ticket.service}</td>
                <td>${formatStatus(ticket.status)}</td>
                <td>${new Date(ticket.issued_at).toLocaleString('pt-AO')}</td>
                <td>${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</td>
                <td></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showNotification(`Erro ao carregar senhas: ${error.message}`, 'error');
    }
}

function formatStatus(status) {
    const statuses = {
        Pendente: 'Pendente',
        Chamado: 'Chamado',
        attended: 'Atendido'
    };
    return statuses[status] || status;
}

export function initTickets() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (['dept_admin', 'inst_admin', 'sys_admin'].includes(userInfo.role)) {
        loadTickets();
    }
}