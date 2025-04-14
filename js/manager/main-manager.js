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
    console.log('Botão loadDashboard clicado'); // Debug
    try {
        await loadDashboard();
    } catch (error) {
        console.error('Erro em loadDashboard:', error); // Debug
        showNotification('Erro ao carregar dashboard', 'error');
    }
};
window.loadQueues = async () => {
    console.log('Botão loadQueues clicado'); // Debug
    try {
        await loadQueues();
    } catch (error) {
        console.error('Erro em loadQueues:', error); // Debug
        showNotification('Erro ao carregar filas', 'error');
    }
};
window.loadTickets = async () => {
    console.log('Botão loadTickets clicado'); // Debug
    try {
        await loadTickets();
    } catch (error) {
        console.error('Erro em loadTickets:', error); // Debug
        showNotification('Erro ao carregar tickets', 'error');
    }
};
window.loadReport = async () => {
    console.log('Botão loadReport clicado'); // Debug
    try {
        await loadReport();
    } catch (error) {
        console.error('Erro em loadReport:', error); // Debug
        showNotification('Erro ao carregar relatório', 'error');
    }
};
window.loadStartService = async () => {
    console.log('Botão loadStartService clicado'); // Debug
    showNotification('Iniciar Atendimento não implementado', 'error');
};

async function updateDashboard() {
    console.log('Atualizando dashboard...'); // Debug
    try {
        await updateDashboardManager();
    } catch (error) {
        console.error('Erro em updateDashboard:', error); // Debug
    }
}

async function updateQueues() {
    console.log('Atualizando filas...'); // Debug
    try {
        await updateQueuesManager();
    } catch (error) {
        console.error('Erro em updateQueues:', error); // Debug
    }
}

async function updateTickets() {
    console.log('Atualizando tickets...'); // Debug
    try {
        await updateTicketsManager();
    } catch (error) {
        console.error('Erro em updateTickets:', error); // Debug
    }
}

window.openCallNextModal = async (queueId, service) => {
    console.log(`Abrindo modal para queueId: ${queueId}, serviço: ${service}`); // Debug
    try {
        const modal = document.getElementById('call-next-modal') || createCallNextModal();
        modal.style.display = 'flex';
        document.getElementById('call-next-service').textContent = service;

        const confirmBtn = document.getElementById('confirm-call-next');
        confirmBtn.onclick = async () => {
            console.log(`Confirmando chamada para queueId: ${queueId}`); // Debug
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
        console.error('Erro ao abrir modal:', error); // Debug
        showNotification('Erro ao abrir modal', 'error');
    }
};

function createCallNextModal() {
    console.log('Criando modal de chamada'); // Debug
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
    document.getElementById('cancel-call-next').onclick = () => {
        console.log('Cancelando modal'); // Debug
        modal.style.display = 'none';
    };
    return modal;
}

function showPage(section) {
    console.log(`Mostrando seção: ${section}`); // Debug
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
        console.error('Erro em showPage:', error); // Debug
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('main-manager.js: Inicializando...'); // Debug
    try {
        const authStatus = await initApp();
        if (!authStatus.isAuthenticated) {
            console.warn('main-manager.js: Usuário não autenticado, redirecionando para index.html'); // Debug
            window.location.href = '/index.html';
            return;
        }

        if (!userInfo.role || userInfo.role.toLowerCase() !== 'user') {
            console.warn('main-manager.js: Usuário sem permissão para manager, redirecionando para index.html'); // Debug
            window.location.href = '/index.html';
            return;
        }

        const userInfoElement = document.getElementById('user-info');
        const logoutBtn = document.getElementById('logout-btn');
        if (userInfoElement && logoutBtn) {
            userInfoElement.textContent = userInfo.email;
            logoutBtn.onclick = () => {
                console.log('main-manager.js: Logout clicado'); // Debug
                logout();
                window.location.href = '/index.html';
            };
        } else {
            console.error('main-manager.js: Elementos user-info ou logout-btn não encontrados'); // Debug
        }

        const menuItems = document.querySelectorAll('.menu a');
        if (menuItems.length === 0) {
            console.error('main-manager.js: Itens de menu não encontrados'); // Debug
        }
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                console.log(`main-manager.js: Navegando para seção: ${section}`); // Debug
                showPage(section);
                if (section === 'dashboard') updateDashboard();
                else if (section === 'queues') updateQueues();
                else if (section === 'tickets') updateTickets();
                else if (section === 'reports') loadReport();
                else if (section === 'start-service') loadStartService();
            });
        });

        console.log('main-manager.js: Inicializando WebSocket...'); // Debug
        initWebSocket(userInfo, updateDashboard, updateQueues, updateTickets);
        console.log('main-manager.js: Iniciando polling...'); // Debug
        pollingInterval = startPolling(updateDashboard, updateQueues, updateTickets);

        // Carrega o dashboard inicial
        await updateDashboard();
    } catch (error) {
        console.error('main-manager.js: Erro na inicialização:', error); // Debug
        window.location.href = '/index.html';
    }
});