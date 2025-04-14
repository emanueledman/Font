import { initApp, logout } from '../common/auth.js';
import { initWebSocket, startPolling, stopPolling } from '../common/websocket.js';
import { ApiService } from '../common/api-service.js';
import { showNotification } from '../common/utils.js';
import { updateDashboardManager, loadDashboard } from './dashboard-manager.js';
import { updateQueuesManager, loadQueues } from './queues-manager.js';
import { updateTicketsManager, loadTickets } from './tickets-manager.js';
import { loadReport } from './reports-manager.js';

let pollingInterval;
const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};

window.loadDashboard = loadDashboard;
window.loadQueues = loadQueues;
window.loadTickets = loadTickets;
window.loadReport = loadReport;

function updateDashboard() {
    updateDashboardManager();
}

function updateQueues() {
    updateQueuesManager();
}

function updateTickets() {
    updateTicketsManager();
}

window.openCallNextModal = async (queueId, service) => {
    const modal = document.getElementById('call-next-modal') || createCallNextModal();
    modal.style.display = 'flex';
    document.getElementById('call-next-service').textContent = service;

    const confirmBtn = document.getElementById('confirm-call-next');
    confirmBtn.onclick = async () => {
        try {
            const result = await ApiService.callNextTicket(queueId);
            showNotification(`Senha ${result.ticket_number} chamada`, 'success');
            modal.style.display = 'none';
            updateDashboard();
            updateQueues();
            updateTickets();
        } catch (error) {
            showNotification('Erro ao chamar senha: ' + error.message, 'error');
        }
    };
};

function createCallNextModal() {
    const modal = document.createElement('div');
    modal.id = 'call-next-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Chamar Próxima Senha</h2>
            <p>Serviço: <span id="call-next-service"></span></p>
            <div class="modal-actions">
                <button id="confirm-call-next">Confirmar</button>
                <button id="cancel-call-next">Cancelar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('cancel-call-next').onclick = () => modal.style.display = 'none';
    return modal;
}

function showPage(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    document.getElementById('section-title').textContent = section.charAt(0).toUpperCase() + section.slice(1).replace('-', ' ');
}

document.addEventListener('DOMContentLoaded', async () => {
    await initApp();
    if (!userInfo.role || !['USER', 'gestor', 'manager'].includes(userInfo.role.toLowerCase())) {
        window.location.href = '/index.html';
        return;
    }

    document.getElementById('user-info').textContent = userInfo.email;
    document.getElementById('logout-btn').onclick = () => {
        logout();
        window.location.href = '/index.html';
    };

    document.querySelectorAll('.menu a').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showPage(section);
            if (section === 'dashboard') updateDashboard();
            else if (section === 'queues') updateQueues();
            else if (section === 'tickets') updateTickets();
            else if (section === 'reports') loadReport();
        });
    });

    initWebSocket(userInfo, updateDashboard, updateQueues, updateTickets);
    pollingInterval = startPolling(updateDashboard, updateQueues, updateTickets);
});