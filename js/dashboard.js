// js/dashboard.js
import { fetchWithAuth } from './api.js';
import { showToast } from './toast.js';
import { isAuthenticated, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    initWebSocket();
    initUI();
    loadQueues();
    setInterval(loadQueues, 30000); // Polling a cada 30s
});

function initWebSocket() {
    const socket = io('http://localhost:5000', {
        path: '/tickets',
        auth: { token: localStorage.getItem('token') }
    });
    socket.on('connect', () => {
        showToast('Notificações ativas', 'success');
    });
    socket.on('connect_error', () => {
        showToast('Sem conexão com notificações', 'error');
    });
    socket.on('ticket_update', (data) => {
        showToast(`Ticket ${data.ticket_number} (${data.status})`, 'info');
    });
    socket.on('queue_update', (data) => {
        showToast(data.message, 'info');
        loadQueues(); // Atualiza tabela ao receber evento
    });
}

function initUI() {
    const logoutBtn = document.getElementById('logout-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const refreshBtn = document.getElementById('refresh-btn');
    const userInfo = document.getElementById('user-info');

    userInfo.textContent = localStorage.getItem('email')?.split('@')[0] || 'Gestor';

    logoutBtn.addEventListener('click', () => {
        logout();
        showToast('Sessão encerrada', 'success');
    });

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        themeToggle.querySelector('i').className = document.documentElement.classList.contains('dark') ? 'fas fa-sun' : 'fas fa-moon';
    });

    refreshBtn.addEventListener('click', loadQueues);
}

async function loadQueues() {
    try {
        const queues = await fetchWithAuth('/admin/queues');
        const tbody = document.getElementById('queues-table');
        tbody.innerHTML = '';
        queues.forEach(q => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${q.service}</td>
                <td>${q.active_tickets}</td>
                <td>${q.current_ticket ? `${q.prefix || ''}${q.current_ticket.toString().padStart(3, '0')}` : 'N/A'}</td>
                <td>${q.status}</td>
                <td>
                    <button class="btn btn-primary btn-small call-btn" data-queue-id="${q.id}">
                        <i class="fas fa-phone"></i> Chamar Próxima
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Adicionar evento aos botões "Chamar Próxima"
        document.querySelectorAll('.call-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const queueId = btn.dataset.queueId;
                btn.disabled = true;
                try {
                    const data = await fetchWithAuth(`/admin/queue/${queueId}/call`, { method: 'POST' });
                    showToast(data.message, 'success');
                    loadQueues();
                } catch (err) {
                    showToast(`Erro: ${err.message}`, 'error');
                } finally {
                    btn.disabled = false;
                }
            });
        });
    } catch (err) {
        showToast(`Erro ao carregar filas: ${err.message}`, 'error');
    }
}