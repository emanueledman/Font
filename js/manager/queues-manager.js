import { ApiService } from '../common/api-service.js';
import { formatQueueStatus, showNotification } from '../common/utils.js';

export async function updateQueuesManager() {
    console.log('updateQueuesManager chamado'); // Debug
    if (!localStorage.getItem('token')) {
        console.warn('Token não encontrado, pulando atualização de filas'); // Debug
        return;
    }
    try {
        const queueContent = document.getElementById('queue-content');
        if (!queueContent) {
            console.error('Elemento queue-content não encontrado'); // Debug
            return;
        }

        const queues = await ApiService.getAdminQueues();
        console.log('Filas recebidas:', queues); // Debug
        queueContent.innerHTML = queues.map(queue => `
            <tr>
                <td>${queue.service}</td>
                <td>${queue.department || '-'}</td>
                <td>${queue.prefix}</td>
                <td>${queue.active_tickets}</td>
                <td>${queue.current_ticket || '-'}</td>
                <td>${queue.avg_wait_time || 0}</td>
                <td>${formatQueueStatus(queue.active_tickets, queue.daily_limit)}</td>
                <td>
                    <button onclick="window.openCallNextModal('${queue.id}', '${queue.service}')">Chamar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro em updateQueuesManager:', error); // Debug
        showNotification('Erro ao atualizar filas: ' + error.message, 'error');
    }
}

export function loadQueues() {
    console.log('loadQueues chamado'); // Debug
    updateQueuesManager();
}