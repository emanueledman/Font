import { ApiService } from '../common/api-service.js';
import { formatQueueStatus, showNotification } from '../common/utils.js';

export async function updateQueuesManager() {
    if (!localStorage.getItem('token')) return;
    try {
        const queues = await ApiService.getAdminQueues();
        document.getElementById('queue-content').innerHTML = queues.map(queue => `
            <tr>
                <td>${queue.service}</td>
                <td>${queue.department || '-'}</td>
                <td>${queue.prefix}</td>
                <td>${queue.active_tickets}</td>
                <td>${queue.current_ticket || '-'}</td>
                <td>${queue.avg_wait_time || 0}</td>
                <td>${formatQueueStatus(queue.active_tickets, queue.daily_limit)}</td>
                <td>
                    <button onclick="openCallNextModal('${queue.id}', '${queue.service}')">Chamar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification('Erro ao atualizar filas: ' + error.message, 'error');
    }
}

export function loadQueues() {
    updateQueuesManager();
}