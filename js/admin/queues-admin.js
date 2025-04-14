import { ApiService } from '../common/api-service.js';
import { showNotification, formToObject } from '../common/utils.js';

export async function loadQueues() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    try {
        const queues = await ApiService.getAdminQueues();
        const tbody = document.querySelector('#queues-table tbody');
        tbody.innerHTML = '';
        queues.forEach(queue => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${queue.service}</td>
                <td>${queue.prefix}</td>
                <td>${queue.open_time || 'N/A'}</td>
                <td>${queue.end_time || 'N/A'}</td>
                <td>${queue.daily_limit}</td>
                <td>${queue.status}</td>
                <td>
                    <button class="call-next" data-id="${queue.id}" data-service="${queue.service}">Chamar Próxima</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('.call-next').forEach(btn => {
            btn.addEventListener('click', () => openCallNextModal(btn.dataset.id, btn.dataset.service));
        });
    } catch (error) {
        showNotification(`Erro ao carregar filas: ${error.message}`, 'error');
    }
}

function openCreateQueueModal() {
    const modal = document.getElementById('create-queue-modal');
    modal.style.display = 'flex';
}

async function createQueue(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    try {
        await ApiService.createQueue(userInfo.department_id, data);
        showNotification('Fila criada com sucesso', 'success');
        form.reset();
        document.getElementById('create-queue-modal').style.display = 'none';
        loadQueues();
    } catch (error) {
        showNotification(`Erro ao criar fila: ${error.message}`, 'error');
    }
}

function openCallNextModal(queueId, service) {
    const modal = document.getElementById('call-next-modal');
    document.getElementById('call-next-service').textContent = service;
    modal.style.display = 'flex';

    const confirmBtn = document.getElementById('confirm-call-next');
    confirmBtn.onclick = async () => {
        try {
            const result = await ApiService.callNextTicket(queueId);
            showNotification(`Senha ${result.ticket_number} chamada`, 'success');
            modal.style.display = 'none';
            loadQueues();
        } catch (error) {
            showNotification(`Erro ao chamar senha: ${error.message}`, 'error');
        }
    };

    document.getElementById('cancel-call-next').onclick = () => {
        modal.style.display = 'none';
    };
}

export function initQueues() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (['dept_admin', 'inst_admin', 'sys_admin'].includes(userInfo.role)) {
        document.getElementById('create-queue-btn').style.display = 'block';
        document.getElementById('create-queue-btn').addEventListener('click', openCreateQueueModal);
        document.getElementById('create-queue-form').addEventListener('submit', createQueue);
        document.getElementById('cancel-queue').addEventListener('click', () => {
            document.getElementById('create-queue-modal').style.display = 'none';
        });
        loadQueues();
    }
}