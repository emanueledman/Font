console.log('main-admin.js: Script carregado com sucesso!'); // Teste inicial

document.addEventListener('DOMContentLoaded', () => {
    console.log('main-admin.js: DOM carregado, executando...'); // Teste DOM

    // Função para o botão Atualizar
    window.loadDashboard = () => {
        console.log('main-admin.js: Botão Atualizar clicado'); // Log
        alert('Botão Atualizar clicado em admin.html!'); // Ação visível
    };

    /*
    // Lógica original comentada para não alterar comportamento
    import { initApp, logout } from '../common/auth.js';
    import { initWebSocket, startPolling, stopPolling } from '../common/websocket.js';
    import { ApiService } from '../common/api-service.js';
    import { showNotification } from '../common/utils.js';
    import { updateDashboardAdmin, loadDashboard, exportDashboard } from './dashboard-admin.js';
    import { updateQueuesAdmin, loadQueues, openCreateQueueModal, closeCreateQueueModal, createQueue } from './queues-admin.js';
    import { updateTicketsAdmin, loadTickets } from './tickets-admin.js';
    import { loadSettings, openCreateUserModal, closeCreateUserModal, createUser, saveQueueSettings, saveNotificationSettings } from './settings-admin.js';
    import { loadReport, exportReport, exportReportPDF } from './reports-admin.js';

    let pollingInterval;
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};

    window.loadDashboard = async () => {
        console.log('main-admin: loadDashboard clicado');
        try {
            await loadDashboard();
        } catch (error) {
            console.error('main-admin: Erro em loadDashboard:', error);
            showNotification('Erro ao carregar dashboard', 'error');
        }
    };
    window.exportDashboard = () => {
        console.log('main-admin: exportDashboard clicado');
        exportDashboard();
    };
    window.loadQueues = async () => {
        console.log('main-admin: loadQueues clicado');
        try {
            await loadQueues();
        } catch (error) {
            console.error('main-admin: Erro em loadQueues:', error);
            showNotification('Erro ao carregar filas', 'error');
        }
    };
    window.loadTickets = async () => {
        console.log('main-admin: loadTickets clicado');
        try {
            await loadTickets();
        } catch (error) {
            console.error('main-admin: Erro em loadTickets:', error);
            showNotification('Erro ao carregar tickets', 'error');
        }
    };
    window.loadReport = async () => {
        console.log('main-admin: loadReport clicado');
        try {
            await loadReport();
        } catch (error) {
            console.error('main-admin: Erro em loadReport:', error);
            showNotification('Erro ao carregar relatório', 'error');
        }
    };
    window.exportReport = () => {
        console.log('main-admin: exportReport clicado');
        exportReport();
    };
    window.exportReportPDF = () => {
        console.log('main-admin: exportReportPDF clicado');
        exportReportPDF();
    };
    window.openCreateQueueModal = () => {
        console.log('main-admin: openCreateQueueModal clicado');
        openCreateQueueModal();
    };
    window.closeCreateQueueModal = () => {
        console.log('main-admin: closeCreateQueueModal clicado');
        closeCreateQueueModal();
    };
    window.createQueue = async () => {
        console.log('main-admin: createQueue clicado');
        try {
            await createQueue();
        } catch (error) {
            console.error('main-admin: Erro em createQueue:', error);
            showNotification('Erro ao criar fila', 'error');
        }
    };
    window.loadSettings = async () => {
        console.log('main-admin: loadSettings clicado');
        try {
            await loadSettings();
        } catch (error) {
            console.error('main-admin: Erro em loadSettings:', error);
            showNotification('Erro ao carregar configurações', 'error');
        }
    };
    window.openCreateUserModal = () => {
        console.log('main-admin: openCreateUserModal clicado');
        openCreateUserModal();
    };
    window.closeCreateUserModal = () => {
        console.log('main-admin: closeCreateUserModal clicado');
        closeCreateUserModal();
    };
    window.createUser = async () => {
        console.log('main-admin: createUser clicado');
        try {
            await createUser();
        } catch (error) {
            console.error('main-admin: Erro em createUser:', error);
            showNotification('Erro ao criar usuário', 'error');
        }
    };
    window.saveQueueSettings = async () => {
        console.log('main-admin: saveQueueSettings clicado');
        try {
            await saveQueueSettings();
        } catch (error) {
            console.error('main-admin: Erro em saveQueueSettings:', error);
            showNotification('Erro ao salvar configurações de fila', 'error');
        }
    };
    window.saveNotificationSettings = async () => {
        console.log('main-admin: saveNotificationSettings clicado');
        try {
            await saveNotificationSettings();
        } catch (error) {
            console.error('main-admin: Erro em saveNotificationSettings:', error);
            showNotification('Erro ao salvar configurações de notificação', 'error');
        }
    };

    async function updateDashboard() {
        console.log('main-admin: Atualizando dashboard...');
        try {
            await updateDashboardAdmin();
        } catch (error) {
            console.error('main-admin: Erro em updateDashboard:', error);
        }
    }

    async function updateQueues() {
        console.log('main-admin: Atualizando filas...');
        try {
            await updateQueuesAdmin();
        } catch (error) {
            console.error('main-admin: Erro em updateQueues:', error);
        }
    }

    async function updateTickets() {
        console.log('main-admin: Atualizando tickets...');
        try {
            await updateTicketsAdmin();
        } catch (error) {
            console.error('main-admin: Erro em updateTickets:', error);
        }
    }

    window.openCallNextModal = async (queueId, service) => {
        console.log(`main-admin: openCallNextModal chamado com queueId: ${queueId}`);
        try {
            const modal = document.getElementById('call-next-modal') || createCallNextModal();
            modal.style.display = 'flex';
            document.getElementById('call-next-service').textContent = service;

            const confirmBtn = document.getElementById('confirm-call-next');
            confirmBtn.onclick = async () => {
                console.log(`main-admin: Confirmando chamada para queueId: ${queueId}`);
                try {
                    const result = await ApiService.callNextTicket(queueId);
                    showNotification(`Senha ${result.ticket_number} chamada`, 'success');
                    modal.style.display = 'none';
                    await Promise.all([updateDashboard(), updateQueues(), updateTickets()]);
                } catch (error) {
                    console.error('main-admin: Erro ao chamar ticket:', error);
                    showNotification('Erro ao chamar senha: ' + error.message, 'error');
                }
            };
        } catch (error) {
            console.error('main-admin: Erro ao abrir modal:', error);
            showNotification('Erro ao abrir modal', 'error');
        }
    };

    function createCallNextModal() {
        console.log('main-admin: Criando modal');
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
            console.log('main-admin: Cancelando modal');
            modal.style.display = 'none';
        };
        return modal;
    }

    function showPage(section) {
        console.log(`main-admin: Mostrando seção: ${section}`);
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
                console.error(`main-admin: Seção ${section} ou item de menu não encontrado`);
            }
        } catch (error) {
            console.error('main-admin: Erro em showPage:', error);
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        console.log('main-admin.js: DOM carregado, inicializando...');
        try {
            const authStatus = await initApp();
            if (!authStatus.isAuthenticated) {
                console.warn('main-admin.js: Usuário não autenticado, redirecionando...');
                window.location.href = '/index.html';
                return;
            }

            if (!userInfo.role || !['dept_admin', 'inst_admin', 'sys_admin'].includes(userInfo.role.toLowerCase())) {
                console.warn('main-admin.js: Usuário sem permissão para admin, redirecionando...');
                window.location.href = '/index.html';
                return;
            }

            console.log('main-admin.js: Usuário autenticado:', userInfo.email);
            const userInfoElement = document.getElementById('user-info');
            const logoutBtn = document.getElementById('logout-btn');
            if (userInfoElement && logoutBtn) {
                userInfoElement.textContent = userInfo.email;
                logoutBtn.onclick = () => {
                    console.log('main-admin.js: Logout clicado');
                    logout();
                    window.location.href = '/index.html';
                };
            } else {
                console.error('main-admin.js: Elementos user-info ou logout-btn não encontrados');
            }

            const menuItems = document.querySelectorAll('.menu a');
            if (menuItems.length === 0) {
                console.error('main-admin.js: Itens de menu não encontrados');
            }
            menuItems.forEach(item => {
                item.addEventListener('click', () => {
                    const section = item.dataset.section;
                    console.log(`main-admin.js: Menu clicado: ${section}`);
                    showPage(section);
                    if (section === 'dashboard') updateDashboard();
                    else if (section === 'queues') updateQueues();
                    else if (section === 'tickets') updateTickets();
                    else if (section === 'reports') loadReport();
                    else if (section === 'settings') loadSettings();
                });
            });

            console.log('main-admin.js: Inicializando WebSocket...');
            initWebSocket(userInfo, updateDashboard, updateQueues, updateTickets);
            console.log('main-admin.js: Iniciando polling...');
            pollingInterval = startPolling(updateDashboard, updateQueues, updateTickets);

            console.log('main-admin.js: Carregando dashboard inicial...');
            await updateDashboard();
        } catch (error) {
            console.error('main-admin.js: Erro na inicialização:', error);
            showNotification('Erro ao inicializar o painel', 'error');
            window.location.href = '/index.html';
        }
    });
    */
});