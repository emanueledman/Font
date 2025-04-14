console.log('main-manager.js: Script carregado com sucesso!'); // Teste inicial

document.addEventListener('DOMContentLoaded', () => {
    console.log('main-manager.js: DOM carregado, executando...'); // Teste DOM

    // Função para o botão Atualizar
    window.loadDashboard = () => {
        console.log('main-manager.js: Botão Atualizar clicado'); // Log
        alert('Botão Atualizar clicado em manager.html!'); // Ação visível
    };

    /*
    // Lógica original comentada para não alterar comportamento
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
        console.log('main-manager: loadDashboard clicado');
        try {
            await loadDashboard();
        } catch (error) {
            console.error('main-manager: Erro em loadDashboard:', error);
            showNotification('Erro ao carregar dashboard', 'error');
        }
    };
    window.loadQueues = async () => {
        console.log('main-manager: loadQueues clicado');
        try {
            await loadQueues();
        } catch (error) {
            console.error('main-manager: Erro em loadQueues:', error);
            showNotification('Erro ao carregar filas', 'error');
        }
    };
    window.loadTickets = async () => {
        console.log('main-manager: loadTickets clicado');
        try {
            await loadTickets();
        } catch (error) {
            console.error('main-manager: Erro em loadTickets:', error);
            showNotification('Erro ao carregar tickets', 'error');
        }
    };
    window.loadReport = async () => {
        console.log('main-manager: loadReport clicado');
        try {
            await loadReport();
        } catch (error) {
            console.error('main-manager: Erro em loadReport:', error);
            showNotification('Erro ao carregar relatório', 'error');
        }
    };
    window.loadStartService = async () => {
        console.log('main-manager: loadStartService clicado');
        showNotification('Iniciar Atendimento não implementado', 'error');
    };

    async function updateDashboard() {
        console.log('main-manager: Atualizando dashboard...');
        try {
            await updateDashboardManager();
        } catch (error) {
            console.error('main-manager: Erro em updateDashboard:', error);
        }
    }

    async function updateQueues() {
        console.log('main-manager: Atualizando filas...');
        try {
            await updateQueuesManager();
        } catch (error) {
            console.error('main-manager: Erro em updateQueues:', error);
        }
    }

    async function updateTickets() {
        console.log('main-manager: Atualizando tickets...');
        try {
            await updateTicketsManager();
        } catch (error) {
            console.error('main-manager: Erro em updateTickets:', error);
        }
    }

    window.openCallNextModal = async (queueId, service) => {
        console.log(`main-manager: openCallNextModal chamado com queueId: ${queueId}`);
        try {
            const modal = document.getElementById('call-next-modal') || createCallNextModal();
            modal.style.display = 'flex';
            document.getElementById('call-next-service').textContent = service;

            const confirmBtn = document.getElementById('confirm-call-next');
            confirmBtn.onclick = async () => {
                console.log(`main-manager: Confirmando chamada para queueId: ${queueId}`);
                try {
                    const result = await ApiService.callNextTicket(queueId);
                    showNotification(`Senha ${result.ticket_number} chamada`, 'success');
                    modal.style.display = 'none';
                    await Promise.all([updateDashboard(), updateQueues(), updateTickets()]);
                } catch (error) {
                    console.error('main-manager: Erro ao chamar ticket:', error);
                    showNotification('Erro ao chamar senha: ' + error.message, 'error');
                }
            };
        } catch (error) {
            console.error('main-manager: Erro ao abrir modal:', error);
            showNotification('Erro ao abrir modal', 'error');
        }
    };

    function createCallNextModal() {
        console.log('main-manager: Criando modal');
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
            console.log('main-manager: Cancelando modal');
            modal.style.display = 'none';
        };
        return modal;
    }

    function showPage(section) {
        console.log(`main-manager: Mostrando seção: ${section}`);
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
                console.error(`main-manager: Seção ${section} ou item de menu não encontrado`);
            }
        } catch (error) {
            console.error('main-manager: Erro em showPage:', error);
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('main-manager.js: DOM carregado, inicializando...');
        try {
            const authStatus = await initApp();
            if (!authStatus.isAuthenticated) {
                console.warn('main-manager.js: Usuário não autenticado, redirecionando...');
                window.location.href = '/index.html';
                return;
            }

            if (!userInfo.role || userInfo.role.toLowerCase() !== 'user') {
                console.warn('main-manager.js: Usuário sem permissão para manager, redirecionando...');
                window.location.href = '/index.html';
                return;
            }

            console.log('main-manager.js: Usuário autenticado:', userInfo.email);
            const userInfoElement = document.getElementById('user-info');
            const logoutBtn = document.getElementById('logout-btn');
            if (userInfoElement && logoutBtn) {
                userInfoElement.textContent = userInfo.email;
                logoutBtn.onclick = () => {
                    console.log('main-manager.js: Logout clicado');
                    logout();
                    window.location.href = '/index.html';
                };
            } else {
                console.error('main-manager.js: Elementos user-info ou logout-btn não encontrados');
            }

            const menuItems = document.querySelectorAll('.menu a');
            if (menuItems.length === 0) {
                console.error('main-manager.js: Itens de menu não encontrados');
            }
            menuItems.forEach(item => {
                item.addEventListener('click', () => {
                    const section = item.dataset.section;
                    console.log(`main-manager.js: Menu clicado: ${section}`);
                    showPage(section);
                    if (section === 'dashboard') updateDashboard();
                    else if (section === 'queues') updateQueues();
                    else if (section === 'tickets') updateTickets();
                    else if (section === 'reports') loadReport();
                    else if (section === 'start-service') loadStartService();
                });
            });

            console.log('main-manager.js: Inicializando WebSocket...');
            initWebSocket(userInfo, updateDashboard, updateQueues, updateTickets);
            console.log('main-manager.js: Iniciando polling...');
            pollingInterval = startPolling(updateDashboard, updateQueues, updateTickets);

            console.log('main-manager.js: Carregando dashboard inicial...');
            await updateDashboard();
        } catch (error) {
            console.error('main-manager.js: Erro na inicialização:', error);
            showNotification('Erro ao inicializar o painel', 'error');
            window.location.href = '/index.html';
        }
    });

});