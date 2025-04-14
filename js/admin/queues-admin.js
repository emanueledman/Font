import { ApiService } from '../common/api-service.js';
import { formatQueueStatus, formatDate, showNotification } from '../common/utils.js';

export async function updateQueuesAdmin() {
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
                    <button onclick="pauseQueue('${queue.id}')">Pausar</button>
                </td>
            </tr>
        `).join('');
        updateQueueHistory(queues);
    } catch (error) {
        showNotification('Erro ao atualizar filas: ' + error.message, 'error');
    }
}

function updateQueueHistory(queues) {
    document.getElementById('queue-history-content').innerHTML = queues.map(queue => `
        <tr>
            <td>${queue.service}</td>
            <td>${queue.total_tickets}</td>
            <td>${queue.attended_tickets}</td>
            <td>${queue.cancelled_tickets}</td>
            <td>${formatDate(queue.updated_at)}</td>
        </tr>
    `).join('');
}

export function openCreateQueueModal() {
    document.getElementById('create-queue-modal').style.display = 'flex';
}

export function closeCreateQueueModal() {
    document.getElementById('create-queue-modal').style.display = 'none';
}

export async function createQueue(event) {
    event.preventDefault();
    const data = {
        service: document.getElementById('queue-service').value,
        prefix: document.getElementById('queue-prefix').value,
        open_time: document.getElementById('queue-open-time').value,
        end_time: document.getElementById('queue-end-time').value,
        daily_limit: parseInt(document.getElementById('queue-daily-limit').value),
        num_counters: parseInt(document.getElementById('queue-num-counters').value),
    };
    try {
        await ApiService.createQueue(data);
        showNotification('Fila criada com sucesso', 'success');
        closeCreateQueueModal();
        updateQueuesAdmin();
    } catch (error) {
        showNotification('Erro ao criar fila: ' + error.message, 'error');
    }
}

export function loadQueues() {
    updateQueuesAdmin();
}

export function openCallNextModal(queueId, service) {
    // Implementação será compartilhada com manager, movida para main.js
}