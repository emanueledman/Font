import { initApp, logout } from './common/auth.js';
import { initWebSocket, startPolling, stopPolling } from './common/websocket.js';
import { initInstitutions, loadInstitutions } from './admin/institutions-admin.js';
import { initDepartments, loadDepartments } from './admin/departments-admin.js';
import { initUsers, loadUsers } from './admin/users-admin.js';
import { initQueues, loadQueues } from './admin/queues-admin.js';
import { initTickets, loadTickets } from './admin/tickets-admin.js';

const userInfo = JSON.parse(localStorage.getItem('userInfo') || {});

function showPage(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    document.getElementById('section-title').textContent = {
        institutions: 'Instituições',
        departments: 'Departamentos',
        users: 'Usuários',
        queues: 'Filas',
        tickets: 'Senhas'
    }[section];
}

document.addEventListener('DOMContentLoaded', async () => {
    const auth = await initApp();
    if (!auth.isAuthenticated) {
        window.location.href = '/index.html';
        return;
    }

    // Display user email
    document.getElementById('user-email').textContent = userInfo.email;

    // Initialize based on role
    if (userInfo.role === 'sys_admin') {
        initInstitutions();
    }
    initDepartments();
    initUsers();
    initQueues();
    initTickets();

    // Menu navigation
    document.querySelectorAll('.menu a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section === 'institutions' && userInfo.role !== 'sys_admin') return;
            showPage(section);
            if (section === 'institutions') loadInstitutions();
            else if (section === 'departments') loadDepartments();
            else if (section === 'users') loadUsers();
            else if (section === 'queues') loadQueues();
            else if (section === 'tickets') loadTickets();
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);

    // WebSocket
    const socket = initWebSocket(userInfo, loadInstitutions, loadDepartments, loadUsers, loadQueues, loadTickets);

    // Polling
    const pollingInterval = startPolling(() => {
        const activeSection = document.querySelector('.content-section.active').id.replace('-section', '');
        if (activeSection === 'institutions') loadInstitutions();
        else if (activeSection === 'departments') loadDepartments();
        else if (activeSection === 'users') loadUsers();
        else if (activeSection === 'queues') loadQueues();
        else if (activeSection === 'tickets') loadTickets();
    });

    // Cleanup
    window.addEventListener('unload', () => {
        stopPolling(pollingInterval);
        socket.disconnect();
    });
});