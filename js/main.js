import { initApp, handleLogin, logout } from './common/auth.js';
import { initWebSocket, startPolling, stopPolling } from './common/websocket.js';
import { ApiService } from './common/api-service.js';
import { showNotification } from './common/utils.js';
import { updateDashboardAdmin, loadDashboard as loadDashboardAdmin, exportDashboard as exportDashboardAdmin } from './admin/dashboard-admin.js';
import { updateQueuesAdmin, loadQueues as loadQueuesAdmin, openCreateQueueModal, closeCreateQueueModal, createQueue } from './admin/queues-admin.js';
import { updateTicketsAdmin, loadTickets as loadTicketsAdmin } from './admin/tickets-admin.js';
import { loadSettings, openCreateUserModal, closeCreateUserModal, createUser, saveQueueSettings, saveNotificationSettings } from './admin/settings-admin.js';
import { loadReport as loadReportAdmin, exportReport as exportReportAdmin, exportReportPDF as exportReportPDFAdmin } from './admin/reports-admin.js';
import { updateDashboardManager, loadDashboard as loadDashboardManager, exportDashboard as exportDashboardManager } from './manager/dashboard-manager.js';
import { updateQueuesManager, loadQueues as loadQueuesManager } from './manager/queues-manager.js';
import { updateTicketsManager, loadTickets as loadTicketsManager } from './manager/tickets-manager.js';
import { loadReport as loadReportManager, exportReport as exportReportManager, exportReportPDF as exportReportPDFManager } from './manager/reports-manager.js';

let pollingInterval;
const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};

window.handleLogin = handleLogin;
window.loadDashboard = userInfo.role === 'DEPARTMENT_ADMIN' ? loadDashboardAdmin : loadDashboardManager;
window.exportDashboard = userInfo.role === 'DEPARTMENT_ADMIN' ? exportDashboardAdmin : exportDashboardManager;
window.loadQueues = userInfo.role === 'DEPARTMENT_ADMIN' ? loadQueuesAdmin : loadQueuesManager;
window.loadTickets = userInfo.role === 'DEPARTMENT_ADMIN' ? loadTicketsAdmin : loadTicketsManager;
window.loadReport = userInfo.role === 'DEPARTMENT_ADMIN' ? loadReportAdmin : loadReportManager;
window.exportReport = userInfo.role === 'DEPARTMENT_ADMIN' ? exportReportAdmin : exportReportManager;
window.exportReportPDF = userInfo.role === 'DEPARTMENT_ADMIN' ? exportReportPDFAdmin : exportReportPDFManager;
window.openCreateQueueModal = openCreateQueueModal;
window.closeCreateQueueModal = closeCreateQueueModal;
window.createQueue = createQueue;
window.loadSettings = loadSettings;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.createUser = createUser;
window.saveQueueSettings = saveQueueSettings;
window.saveNotificationSettings = saveNotificationSettings;

function updateDashboard() {
    if (userInfo.role === 'DEPARTMENT_ADMIN') updateDashboardAdmin();
    else updateDashboardManager();
}

function updateQueues() {
    if (userInfo.role === 'DEPARTMENT_ADMIN') updateQueuesAdmin();
    else updateQueuesManager();
}

function updateTickets() {
    if (userInfo.role === 'DEPARTMENT_ADMIN') updateTicketsAdmin();
    else updateTicketsManager();
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
    document.getElementById('section-title').textContent = section.charAt(0).toUpperCase() + section.slice(1);
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    if (userInfo.role === 'DEPARTMENT_ADMIN') {
        document.querySelector('.admin-only').style.display = 'block';
    }

    document.getElementById('logout-btn').onclick = () => logout();
    document.querySelectorAll('.menu a').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            showPage(section);
            if (section === 'dashboard') updateDashboard();
            else if (section === 'queues') updateQueues();
            else if (section === 'tickets') updateTickets();
            else if (section === 'reports') loadReport();
            else if (section === 'settings') loadSettings();
        });
    });

    initWebSocket(userInfo, updateDashboard, updateQueues, updateTickets);
    pollingInterval = startPolling(updateDashboard, updateQueues, updateTickets);
});