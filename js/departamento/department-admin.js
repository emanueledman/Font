const API_BASE = 'https://fila-facilita2-0.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                localStorage.clear();
                window.location.href = '/index.html';
            }
            return Promise.reject(error);
        }
    );

    try {
        await fetchUserInfo();
        await fetchDepartmentInfo();
        await fetchDashboardData();
        await fetchQueues();
        await fetchTickets();
        await fetchCurrentCall();
        await fetchNotifications();
        setupSocketListeners();
        setupNavigation();
        updateCurrentDate();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.', error.response?.data?.error || error.message);
    }
});

async function fetchDashboardData() {
    try {
        document.getElementById('chart-loading').classList.remove('hidden');
        const [queuesRes, ticketsRes, reportRes, usersRes] = await Promise.all([
            axios.get('/api/admin/queues'),
            axios.get('/api/tickets/admin'),
            axios.get(`/api/admin/report?period=today`),
            axios.get('/api/admin/users?role=dept_admin')
        ]);

        const queues = queuesRes.data.queues || [];
        const tickets = ticketsRes.data.tickets || [];
        const report = reportRes.data;
        const users = usersRes.data;

        // Atualiza métricas do dashboard
        document.getElementById('active-queues').textContent = queues.filter(q => q.status === 'active').length;
        document.getElementById('active-queues-trend').textContent = `+${queues.filter(q => new Date(q.updated_at).toDateString() === new Date().toDateString()).length} hoje`;
        document.getElementById('pending-tickets').textContent = tickets.filter(t => t.status === 'pending').length;
        document.getElementById('pending-tickets-trend').textContent = `+${tickets.filter(t => new Date(t.created_at).toDateString() === new Date().toDateString() && t.status === 'pending').length} hoje`;
        document.getElementById('today-calls').textContent = report.reduce((sum, item) => sum + (item.attended || 0), 0);
        document.getElementById('today-calls-trend').textContent = `+${report.reduce((sum, item) => sum + (item.attended || 0), 0)} agora`;
        document.getElementById('active-users').textContent = users.filter(u => u.is_online).length;
        document.getElementById('active-users-trend').textContent = `${users.filter(u => u.is_online).length}/${users.length} online`;

        // Atualiza filas mais ativas
        const topQueues = document.getElementById('top-queues');
        topQueues.innerHTML = '';
        const sortedQueues = queues
            .map(q => ({
                ...q,
                ticket_count: tickets.filter(t => t.queue_id === q.id && new Date(t.created_at).toDateString() === new Date().toDateString()).length
            }))
            .sort((a, b) => b.ticket_count - a.ticket_count)
            .slice(0, 3);
        
        if (sortedQueues.length === 0) {
            topQueues.innerHTML = '<p class="text-gray-500 text-sm">Nenhuma fila ativa hoje.</p>';
        } else {
            sortedQueues.forEach(queue => {
                const percentage = queue.daily_limit ? (queue.active_tickets / queue.daily_limit) * 100 : 0;
                const div = document.createElement('div');
                div.className = 'flex items-center justify-between';
                div.innerHTML = `
                    <div class="flex items-center">
                        <div class="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                        <span class="text-gray-700">${queue.service}</span>
                    </div>
                    <div class="w-1/3 bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                    <span class="text-sm font-medium">${queue.ticket_count} tickets</span>
                `;
                topQueues.appendChild(div);
            });
        }

        // Atualiza gráfico de atividade
        const ctx = document.getElementById('activity-chart').getContext('2d');
        if (window.activityChart) {
            window.activityChart.destroy();
        }
        window.activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: report.map(item => item.service || item.period),
                datasets: [
                    {
                        label: 'Senhas Atendidas',
                        data: report.map(item => item.attended || 0),
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Senhas Emitidas',
                        data: report.map(item => item.issued || 0),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
                    x: { title: { display: true, text: 'Serviço' } }
                }
            }
        });

        // Configura botões de período do gráfico
        document.querySelectorAll('.chart-period-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.chart-period-btn').forEach(b => b.classList.remove('active', 'bg-blue-100', 'text-blue-700'));
                btn.classList.add('active', 'bg-blue-100', 'text-blue-700');
                const period = btn.dataset.period;
                try {
                    document.getElementById('chart-loading').classList.remove('hidden');
                    const reportRes = await axios.get(`/api/admin/report?period=${period}`);
                    const report = reportRes.data;
                    window.activityChart.data.labels = report.map(item => item.service || item.period);
                    window.activityChart.data.datasets[0].data = report.map(item => item.attended || 0);
                    window.activityChart.data.datasets[1].data = report.map(item => item.issued || 0);
                    window.activityChart.update();
                } catch (error) {
                    console.error('Erro ao atualizar gráfico:', error);
                    showError('Erro ao atualizar gráfico.');
                } finally {
                    document.getElementById('chart-loading').classList.add('hidden');
                }
            });
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showError('Erro ao carregar dados do dashboard.');
    } finally {
        document.getElementById('chart-loading').classList.add('hidden');
    }
}

async function fetchNotifications() {
    try {
        const response = await axios.get('/api/admin/notifications');
        const notifications = response.data.slice(0, 5); // Limita a 5 notificações
        const notificationList = document.getElementById('notifications-list');
        const notificationCount = document.getElementById('notification-count');
        
        notificationList.innerHTML = '';
        if (notifications.length === 0) {
            notificationList.innerHTML = '<p class="p-3 text-gray-500 text-sm">Nenhuma notificação disponível.</p>';
            notificationCount.classList.add('hidden');
        } else {
            notificationCount.classList.remove('hidden');
            notifications.forEach(notification => {
                const typeStyles = {
                    ticket: { bg: 'bg-blue-100', icon: 'text-blue-600', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' },
                    queue: { bg: 'bg-yellow-100', icon: 'text-yellow-600', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />' },
                    system: { bg: 'bg-green-100', icon: 'text-green-600', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />' }
                };
                const style = typeStyles[notification.type] || typeStyles.system;
                const div = document.createElement('div');
                div.className = 'p-3 hover:bg-gray-50 cursor-pointer';
                div.innerHTML = `
                    <div class="flex items-start">
                        <div class="${style.bg} p-2 rounded-lg mr-3">
                            <svg class="w-4 h-4 ${style.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                ${style.svg}
                            </svg>
                        </div>
                        <div>
                            <p class="text-sm font-medium">${notification.title}</p>
                            <p class="text-xs text-gray-500">${notification.message}</p>
                            <p class="text-xs text-gray-400 mt-1">${new Date(notification.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                `;
                notificationList.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        showError('Erro ao carregar notificações.');
    }
}

async function fetchSystemAlerts() {
    try {
        const response = await axios.get('/api/admin/alerts');
        const alerts = response.data.slice(0, 3); // Limita a 3 alertas
        const alertList = document.getElementById('system-alerts');
        
        alertList.innerHTML = '';
        if (alerts.length === 0) {
            alertList.innerHTML = '<p class="text-gray-500 text-sm">Nenhum alerta no momento.</p>';
        } else {
            alerts.forEach(alert => {
                const typeStyles = {
                    warning: { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-yellow-800', subtext: 'text-yellow-600', button: 'text-yellow-700 hover:text-yellow-900', iconBg: 'bg-yellow-100', icon: 'text-yellow-600', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />' },
                    info: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-800', subtext: 'text-blue-600', button: 'text-blue-700 hover:text-blue-900', iconBg: 'bg-blue-100', icon: 'text-blue-600', svg: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />' }
                };
                const style = typeStyles[alert.type] || typeStyles.info;
                const div = document.createElement('div');
                div.className = `flex items-start p-3 ${style.bg} rounded-lg border ${style.border}`;
                div.innerHTML = `
                    <div class="${style.iconBg} p-2 rounded-lg mr-3 flex-shrink-0">
                        <svg class="w-5 h-5 ${style.icon}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${style.svg}
                        </svg>
                    </div>
                    <div>
                        <p class="font-medium ${style.text}">${alert.title}</p>
                        <p class="text-sm ${style.subtext}">${alert.message}</p>
                        <button onclick="viewAlertDetails('${alert.id}')" class="text-xs ${style.button} mt-1 font-medium">Ver detalhes</button>
                    </div>
                `;
                alertList.appendChild(div);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar alertas:', error);
        showError('Erro ao carregar alertas do sistema.');
    }
}

async function viewAlertDetails(alertId) {
    try {
        const response = await axios.get(`/api/admin/alerts/${alertId}`);
        const alert = response.data;
        showToast(`Detalhes do alerta: ${alert.title} - ${alert.message}`);
    } catch (error) {
        console.error('Erro ao visualizar alerta:', error);
        showError('Erro ao carregar detalhes do alerta.');
    }
}

async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-name').textContent = response.data.name || 'Usuário';
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
        showError('Erro ao carregar informações do usuário.');
    }
}

async function fetchDepartmentInfo() {
    try {
        const response = await axios.get('/api/admin/department');
        document.getElementById('department-name').textContent = response.data.name || 'Departamento';
    } catch (error) {
        console.error('Erro ao carregar informações do departamento:', error);
        showError('Erro ao carregar informações do departamento.');
    }
}

function updateCurrentDate() {
    const today = new Date();
    document.getElementById('current-date').textContent = today.toLocaleDateString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function setupNavigation() {
    const sections = {
        'nav-dashboard': 'dashboard-section',
        'nav-call': 'call-section',
        'nav-queues': 'queues-section',
        'nav-tickets': 'tickets-section',
        'nav-reports': 'reports-section',
        'nav-settings': 'settings-section'
    };

    Object.keys(sections).forEach(navId => {
        const btn = document.getElementById(navId);
        if (btn) {
            btn.addEventListener('click', () => {
                Object.keys(sections).forEach(id => {
                    const otherBtn = document.getElementById(id);
                    const section = document.getElementById(sections[id]);
                    if (id === navId) {
                        otherBtn.classList.add('bg-blue-700');
                        otherBtn.classList.remove('hover:bg-blue-600');
                        section.classList.remove('hidden');
                    } else {
                        otherBtn.classList.remove('bg-blue-700');
                        otherBtn.classList.add('hover:bg-blue-600');
                        section.classList.add('hidden');
                    }
                });
            });
        }
    });

    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }

    const logout = document.getElementById('logout');
    if (logout) {
        logout.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/index.html';
        });
    }
}

function setupSocketListeners() {
    const socket = io(API_BASE, {
        auth: { token: localStorage.getItem('adminToken') }
    });

    socket.on('connect', () => {
        console.log('Conectado ao WebSocket');
    });

    socket.on('new_notification', (notification) => {
        fetchNotifications();
        showToast(`Nova notificação: ${notification.title}`);
    });

    socket.on('new_alert', () => {
        fetchSystemAlerts();
    });

    socket.on('ticket_update', () => {
        fetchTickets();
        fetchDashboardData();
    });

    socket.on('queue_update', () => {
        fetchQueues();
        fetchDashboardData();
    });

    socket.on('disconnect', () => {
        console.warn('Desconectado do WebSocket');
    });
}

document.getElementById('refresh-data')?.addEventListener('click', async () => {
    try {
        await Promise.all([
            fetchDashboardData(),
            fetchNotifications(),
            fetchSystemAlerts(),
            fetchQueues(),
            fetchTickets(),
            fetchCurrentCall()
        ]);
        showSuccess('Dados atualizados com sucesso.');
    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        showError('Erro ao atualizar dados.');
    }
});

document.getElementById('notifications-btn')?.addEventListener('click', () => {
    const dropdown = document.getElementById('notifications-dropdown');
    dropdown.classList.toggle('hidden');
});

document.getElementById('quick-call')?.addEventListener('click', async () => {
    try {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        if (queues.length === 0) {
            showError('Nenhuma fila disponível para chamar.');
            return;
        }
        const queueId = queues[0].id; // Seleciona a primeira fila
        await callNext(queueId);
    } catch (error) {
        console.error('Erro ao chamar próximo:', error);
        showError('Erro ao chamar próximo ticket.');
    }
});

document.getElementById('quick-add')?.addEventListener('click', () => {
    document.getElementById('generate-ticket-btn')?.click();
});

document.getElementById('quick-report')?.addEventListener('click', () => {
    document.getElementById('nav-reports')?.click();
});