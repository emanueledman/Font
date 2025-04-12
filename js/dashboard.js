// js/dashboard.js
import { fetchWithAuth } from './api.js';
import { showToast } from './toast.js';
import { isAuthenticated, logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    initSidebar();
    loadQueues();
});

function initSidebar() {
    const logoutBtn = document.getElementById('logout-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const userEmail = document.getElementById('user-email');

    userEmail.textContent = localStorage.getItem('email') || 'Usuário';

    logoutBtn.addEventListener('click', () => {
        logout();
        showToast('Sessão encerrada', 'success');
    });

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const isDark = document.body.classList.contains('dark');
        themeToggle.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }
}

function loadQueues() {
    fetchWithAuth('/admin/queues')
        .then(queues => {
            const tbody = document.getElementById('queues-table');
            tbody.innerHTML = '';
            queues.forEach(queue => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${queue.service}</td>
                    <td>${queue.active_tickets}</td>
                    <td>${queue.status}</td>
                    <td>
                        <button class="btn btn-icon" onclick="alert('Chamar próxima senha')">
                            <i class="fas fa-bullhorn"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => showToast(`Erro ao carregar filas: ${err.message}`, 'error'));
}