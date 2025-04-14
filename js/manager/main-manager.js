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

window.loadDashboard = async () => {
    try {
        console.log('Carregando dashboard...'); // Debug
        await loadDashboard();
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error); // Debug
        showNotification('Erro ao carregar dashboard', 'error');
    }
};
window.loadQueues = async () => {
    try {
        console.log('Carregando filas...'); // Debug
        await loadQueues();
    } catch (error) {
        console.error('Erro ao carregar filas:', error); // Debug
        showNotification('Erro ao carregar filas', 'error');
    }
};
window.loadTickets = async () => {
    try {
        console.log('Carregando tickets...'); // Debug
        await loadTickets();
    } catch (error) {
        console.error('Erro ao carregar tickets:', error); // Debug
        showNotification('Erro ao carregar tickets', 'error');
    }
};
window.loadReport = loadReport;

async function updateDashboard() {
    try {
        console.log('Atualizando dashboard...'); // Debug
        await updateDashboardManager();
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error); // Debug
    }
}

async function updateQueues() {
    try {
        console.log('Atualizando filas...'); // Debug
        await updateQueuesManager();
    } catch (error) {
        console.error('Erro ao atualizar filas:', error); // Debug
    }
}

async function updateTickets() {
    try {
        console.log('Atualizando tickets...'); // Debug
        await updateTicketsManager();
    } catch (error) {
        console.error('Erro ao atualizar tickets:', error); // Debug
    }
}

window.openCallNextModal = async (queueId, service) => {
    try {
        const modal = document.getElementById('call-next-modal') || createCallNextModal();
        modal.style.display = 'flex';
        document.getElementById('call-next-service').textContent = service;

        const confirmBtn = document.getElementById('confirm-call-next');
        confirmBtn.onclick = async () => {
            try {
                const result = await ApiService.callNextTicket(queueId);
                showNotification(`Senha ${result.ticket_number} chamada`, 'success');
                modal.style.display = 'none';
                await Promise.all([updateDashboard(), updateQueues(), updateTickets()]);
            } catch (error) {
                console.error('Erro ao chamar ticket:', error); // Debug
                showNotification('Erro ao chamar senha: ' + error.message, 'error');
            }
        };
    } catch (error) {
        console.error('Erro ao abrir modal de chamada:', error); // Debug
        showNotification('Erro ao abrir modal', 'error');
    }
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
    try {
        document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
        const sectionElement = document.getElementById(`${section}-section`);
        const menuItem = document.querySelector(`[data-section="${section}"]`);
        if (sectionElement && menuItem) {
            sectionElement.classList.add('active');
            menuItem.classList.add('active');
            document.getElementById('section-title').textContent = section.charAt(0).toUpperCase() + section.slice(1).replace('-', ' ');
        } else {
            console.error(`Seção ${section} ou item de menu não encontrado`); // Debug
        }
    } catch (error) {
        console.error('Erro ao mostrar página:', error); // Debug
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando manager...'); // Debug
    try {
        await initApp();
        if (!userInfo.role || userInfo.role.toLowerCase() !== 'user') {
            console.warn('Usuário sem permissão para manager, redirecionando...'); // Debug
            window.location.href = '/index.html';
            return;
        }

        const userInfoElement = document.getElementById('user-info');
        const logoutBtn = document.getElementById('logout-btn');
        if (userInfoElement && logoutBtn) {
            userInfoElement.textContent = userInfo.email;
            logoutBtn.onclick = () => {
                logout();
                window.location.href = '/index.html';
            };
        } else {
            console.error('Elementos user-info ou logout-btn não encontrados'); // Debug
        }

        const menuItems = document.querySelectorAll('.menu a');
        if (menuItems.length === 0) {
            console.error('Itens de menu não encontrados'); // Debug
        }
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                console.log(`Navegando para seção: ${section}`); // Debug
                showPage(section);
                if (section === 'dashboard') updateDashboard();
                else if (section === 'queues') updateQueues();
                else if (section === 'tickets') updateTickets();
                else if (section === 'reports') loadReport();
            });
        });

        console.log('Inicializando WebSocket...'); // Debug
        initWebSocket(userInfo, updateDashboard, updateQueues, updateTickets);
        console.log('Iniciando polling...'); // Debug
        pollingInterval = startPolling(updateDashboard, updateQueues, updateTickets);

        // Carrega o dashboard inicial
        await updateDashboard();
    } catch (error) {
        console.error('Erro na inicialização do manager:', error); // Debug
        showNotification('Erro ao inicializar o painel', 'error');
    }
});