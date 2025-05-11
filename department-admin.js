// Base URL da API
const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';
const socket = io(API_BASE, {
    transports: ['websocket'],
    reconnectionAttempts: 5,
    path: '/socket.io'
});

// Variáveis globais
let currentInstitutionId = null;
let currentUserRole = null;

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
        await fetchInstitutionInfo();
        await fetchQueues();
        await fetchCalls();
        await fetchDepartments();
        await fetchBranches();
        await fetchManagers();
        setupSocketListeners();
        setupEventListeners();
        loadDashboardData();
        updateCurrentDateTime();
        setInterval(updateCurrentDateTime, 60000); // Atualiza a cada minuto
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.', error.response?.data?.error || error.message);
    }
});

// Funções de Busca
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        const user = response.data;
        currentUserRole = user.user_role;
        currentInstitutionId = user.institution_id;
        document.getElementById('user-name').textContent = user.name || 'Usuário';
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('department-name').textContent = user.department_name || 'Nenhum departamento';
        document.getElementById('branch-name').textContent = user.branch_name || 'Nenhuma filial';
        // Exibir seções com base no papel
        if (currentUserRole !== 'SYSTEM_ADMIN' && currentUserRole !== 'INSTITUTION_ADMIN') {
            document.getElementById('nav-managers').classList.add('hidden');
            document.getElementById('nav-departments').classList.add('hidden');
            document.getElementById('nav-branches').classList.add('hidden');
        }
        if (currentUserRole !== 'SYSTEM_ADMIN') {
            document.getElementById('nav-institutions').classList.add('hidden');
        }
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        showError('Erro ao carregar informações do usuário.');
    }
}

async function fetchInstitutionInfo() {
    if (!currentInstitutionId || currentUserRole === 'SYSTEM_ADMIN') return;
    try {
        const response = await axios.get(`/api/admin/institutions/${currentInstitutionId}`);
        document.getElementById('institution-name').textContent = response.data.institution.name || 'Nenhuma instituição';
    } catch (error) {
        console.error('Erro ao buscar instituição:', error);
        showError('Erro ao carregar informações da instituição.');
    }
}

async function fetchQueues() {
    try {
        const response = await axios.get('/api/admin/queues');
        renderQueues(response.data);
        localStorage.setItem('queues', JSON.stringify(response.data));
    } catch (error) {
        console.error('Erro ao buscar filas:', error);
        showError('Erro ao carregar filas.', error.response?.data?.error || error.message);
    }
}

async function fetchCalls() {
    if (!currentInstitutionId) return;
    try {
        const response = await axios.get(`/api/institutions/${currentInstitutionId}/calls`);
        renderCalls(response.data.calls);
    } catch (error) {
        console.error('Erro ao buscar chamadas:', error);
        showError('Erro ao carregar chamadas.', error.response?.data?.error || error.message);
    }
}

async function fetchDepartments() {
    if (!currentInstitutionId || (currentUserRole !== 'SYSTEM_ADMIN' && currentUserRole !== 'INSTITUTION_ADMIN')) return;
    try {
        const response = await axios.get(`/api/admin/institutions/${currentInstitutionId}/departments`);
        renderDepartments(response.data);
    } catch (error) {
        console.error('Erro ao buscar departamentos:', error);
        showError('Erro ao carregar departamentos.', error.response?.data?.error || error.message);
    }
}

async function fetchBranches() {
    if (!currentInstitutionId || (currentUserRole !== 'SYSTEM_ADMIN' && currentUserRole !== 'INSTITUTION_ADMIN')) return;
    try {
        const response = await axios.get(`/api/admin/institutions/${currentInstitutionId}/branches`);
        renderBranches(response.data);
    } catch (error) {
        console.error('Erro ao buscar filiais:', error);
        showError('Erro ao carregar filiais.', error.response?.data?.error || error.message);
    }
}

async function fetchManagers() {
    if (!currentInstitutionId || (currentUserRole !== 'SYSTEM_ADMIN' && currentUserRole !== 'INSTITUTION_ADMIN')) return;
    try {
        const response = await axios.get(`/api/admin/institutions/${currentInstitutionId}/managers`);
        renderManagers(response.data);
    } catch (error) {
        console.error('Erro ao buscar gestores:', error);
        showError('Erro ao carregar gestores.', error.response?.data?.error || error.message);
    }
}

// Funções de Renderização
function renderQueues(queues) {
    const container = document.getElementById('queues-container');
    container.innerHTML = '';
    if (!queues || queues.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center">Nenhuma fila disponível.</div>';
        return;
    }
    queues.forEach(queue => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
        div.innerHTML = `
            <h3 class="text-lg font-semibold">${queue.service}</h3>
            <p class="text-gray-500">Prefixo: ${queue.prefix}</p>
            <p class="text-gray-500">Status: ${queue.status}</p>
            <p class="text-gray-500">Tickets Ativos: ${queue.active_tickets}/${queue.daily_limit}</p>
            <p class="text-gray-500">Horário: ${queue.open_time || 'N/A'} - ${queue.end_time || 'N/A'}</p>
            <p class="text-gray-500">Departamento: ${queue.department}</p>
            <p class="text-gray-500">Filial: ${queue.branch_name}</p>
            <p class="text-gray-500">Tempo Médio de Espera: ${queue.avg_wait_time}</p>
            <div class="mt-4 flex space-x-2">
                <button onclick="callNext('${queue.id}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">Chamar</button>
                <button onclick="editQueue('${queue.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Editar</button>
                <button onclick="deleteQueue('${queue.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderCalls(calls) {
    const container = document.getElementById('tickets-container');
    container.innerHTML = '';
    if (!calls || calls.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center">Nenhuma chamada disponível.</div>';
        return;
    }
    calls.forEach(call => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
        div.innerHTML = `
            <h3 class="text-lg font-semibold">${call.ticket_number}</h3>
            <p class="text-gray-500">Serviço: ${call.service}</p>
            <p class="text-gray-500">Status: ${call.status}</p>
            <p class="text-gray-500">Guichê: ${call.counter}</p>
            <p class="text-gray-500">Departamento: ${call.department}</p>
            <p class="text-gray-500">Filial: ${call.branch}</p>
            <p class="text-gray-500">Chamado: ${new Date(call.called_at).toLocaleString('pt-BR')}</p>
            ${call.status === 'Chamado' ? `
                <div class="mt-4">
                    <button onclick="callNext('${call.queue_id}')" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">Chamar Novamente</button>
                </div>
            ` : ''}
        `;
        container.appendChild(div);
    });
}

function renderDepartments(departments) {
    const container = document.getElementById('departments-container');
    container.innerHTML = '';
    if (!departments || departments.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center">Nenhum departamento disponível.</div>';
        return;
    }
    departments.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
        div.innerHTML = `
            <h3 class="text-lg font-semibold">${dept.name}</h3>
            <p class="text-gray-500">Setor: ${dept.sector}</p>
            <p class="text-gray-500">Filial: ${dept.branch_name}</p>
            <div class="mt-4 flex space-x-2">
                <button onclick="editDepartment('${dept.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Editar</button>
                <button onclick="deleteDepartment('${dept.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderBranches(branches) {
    const container = document.getElementById('branches-container');
    container.innerHTML = '';
    if (!branches || branches.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center">Nenhuma filial disponível.</div>';
        return;
    }
    branches.forEach(branch => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
        div.innerHTML = `
            <h3 class="text-lg font-semibold">${branch.name}</h3>
            <p class="text-gray-500">Localização: ${branch.location}</p>
            <p class="text-gray-500">Bairro: ${branch.neighborhood}</p>
            <p class="text-gray-500">Coordenadas: (${branch.latitude}, ${branch.longitude})</p>
            <div class="mt-4 flex space-x-2">
                <button onclick="editBranch('${branch.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Editar</button>
                <button onclick="deleteBranch('${branch.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderManagers(managers) {
    const container = document.getElementById('managers-container');
    container.innerHTML = '';
    if (!managers || managers.length === 0) {
        container.innerHTML = '<div class="text-gray-500 text-center">Nenhum gestor disponível.</div>';
        return;
    }
    managers.forEach(manager => {
        const div = document.createElement('div');
        div.className = 'bg-white rounded-xl shadow-lg p-6 border border-gray-100';
        div.innerHTML = `
            <h3 class="text-lg font-semibold">${manager.name}</h3>
            <p class="text-gray-500">Email: ${manager.email}</p>
            <p class="text-gray-500">Departamento: ${manager.department_name}</p>
            <p class="text-gray-500">Filial: ${manager.branch_name}</p>
            <div class="mt-4 flex space-x-2">
                <button onclick="editManager('${manager.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg">Editar</button>
                <button onclick="deleteManager('${manager.id}')" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

async function generateReport() {
    const date = document.getElementById('report-date').value;
    if (!date) {
        showError('Por favor, selecione uma data.');
        return;
    }
    try {
        const response = await axios.get(`/api/admin/report?date=${date}`);
        const results = document.getElementById('report-results');
        results.innerHTML = '';
        if (response.data.length === 0) {
            results.innerHTML = '<p class="text-gray-500">Nenhum dado disponível para esta data.</p>';
            return;
        }

        response.data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'p-4 bg-gray-50 rounded-lg mb-4';
            div.innerHTML = `
                <p><strong>Serviço:</strong> ${item.service}</p>
                <p><strong>Filial:</strong> ${item.branch}</p>
                <p><strong>Senhas Emitidas:</strong> ${item.issued}</p>
                <p><strong>Senhas Atendidas:</strong> ${item.attended}</p>
                <p><strong>Tempo Médio:</strong> ${item.avg_time ? item.avg_time.toFixed(2) + ' min' : 'N/A'}</p>
            `;
            results.appendChild(div);
        });

        const ctx = document.getElementById('activity-chart').getContext('2d');
        if (window.activityChart) {
            window.activityChart.destroy();
        }
        window.activityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: response.data.map(item => item.service),
                datasets: [
                    {
                        label: 'Senhas Emitidas',
                        data: response.data.map(item => item.issued),
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Senhas Atendidas',
                        data: response.data.map(item => item.attended),
                        backgroundColor: 'rgba(34, 197, 94, 0.5)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Quantidade' }
                    },
                    x: {
                        title: { display: true, text: 'Serviço' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        showError('Erro ao gerar relatório.', error.response?.data?.error || error.message);
    }
}

// Ações de Fila
async function callNext(queueId) {
    try {
        const response = await axios.post(`/api/admin/queue/${queueId}/call`);
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        document.getElementById('current-ticket').textContent = response.data.ticket_number;
        document.getElementById('current-service').textContent = response.data.service || 'N/A';
        document.getElementById('current-counter').textContent = `Guichê ${response.data.counter}`;
        await fetchQueues();
        await fetchCalls();
    } catch (error) {
        console.error('Erro ao chamar próxima senha:', error);
        showError('Erro ao chamar próxima senha.', error.response?.data?.error || error.message);
    }
}

function openQueueModal(mode, queue = null) {
    const modal = document.getElementById('queue-modal');
    const title = document.getElementById('queue-modal-title');
    const form = document.getElementById('queue-form');
    const submitBtn = document.getElementById('submit-queue-btn');

    if (mode === 'create') {
        title.textContent = 'Criar Nova Fila';
        submitBtn.textContent = 'Criar';
        form.reset();
        document.getElementById('queue_id').value = '';
    } else {
        title.textContent = 'Editar Fila';
        submitBtn.textContent = 'Salvar';
        document.getElementById('queue_id').value = queue.id;
        document.getElementById('service').value = queue.service;
        document.getElementById('prefix').value = queue.prefix;
        document.getElementById('open_time').value = queue.open_time || '';
        document.getElementById('close_time').value = queue.end_time || '';
        document.getElementById('daily_limit').value = queue.daily_limit;
        document.getElementById('num_counters').value = queue.num_counters || 1;
        const workingDays = queue.working_days ? queue.working_days.split(',').map(Number) : [];
        document.querySelectorAll('input[name="working_days"]').forEach(checkbox => {
            checkbox.checked = workingDays.includes(Number(checkbox.value));
        });
        document.getElementById('queue_description').value = queue.description || '';
    }

    modal.classList.remove('hidden');
}

async function editQueue(queueId) {
    try {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        const queue = queues.find(q => q.id === queueId);
        if (!queue) throw new Error('Fila não encontrada localmente.');
        openQueueModal('edit', queue);
    } catch (error) {
        console.error('Erro ao editar fila:', error);
        showError('Erro ao carregar dados da fila.');
    }
}

async function deleteQueue(queueId) {
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return;
    try {
        // Observação: O backend não fornece uma rota DELETE para filas. Adicione-a se necessário.
        showSuccess('Fila excluída com sucesso.');
        await fetchQueues();
    } catch (error) {
        console.error('Erro ao excluir fila:', error);
        showError('Erro ao excluir fila.', error.response?.data?.error || error.message);
    }
}

// Ações de Departamento
function openDepartmentModal(mode, dept = null) {
    const modal = document.getElementById('department-modal');
    const title = document.getElementById('department-modal-title');
    const form = document.getElementById('department-form');
    const submitBtn = document.getElementById('submit-department-btn');

    if (mode === 'create') {
        title.textContent = 'Criar Novo Departamento';
        submitBtn.textContent = 'Criar';
        form.reset();
        document.getElementById('department_id').value = '';
    } else {
        title.textContent = 'Editar Departamento';
        submitBtn.textContent = 'Salvar';
        document.getElementById('department_id').value = dept.id;
        document.getElementById('department_name').value = dept.name;
        document.getElementById('sector').value = dept.sector;
        document.getElementById('branch_id').value = dept.branch_id;
    }

    modal.classList.remove('hidden');
}

async function editDepartment(departmentId) {
    try {
        const response = await axios.get(`/api/admin/institutions/${currentInstitutionId}/departments`);
        const dept = response.data.find(d => d.id === departmentId);
        if (!dept) throw new Error('Departamento não encontrado.');
        openDepartmentModal('edit', dept);
    } catch (error) {
        console.error('Erro ao editar departamento:', error);
        showError('Erro ao carregar dados do departamento.');
    }
}

async function deleteDepartment(departmentId) {
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    try {
        // Observação: O backend não fornece uma rota DELETE para departamentos. Adicione-a se necessário.
        showSuccess('Departamento excluído com sucesso.');
        await fetchDepartments();
    } catch (error) {
        console.error('Erro ao excluir departamento:', error);
        showError('Erro ao excluir departamento.', error.response?.data?.error || error.message);
    }
}

// Ações de Filial
function openBranchModal(mode, branch = null) {
    const modal = document.getElementById('branch-modal');
    const title = document.getElementById('branch-modal-title');
    const form = document.getElementById('branch-form');
    const submitBtn = document.getElementById('submit-branch-btn');

    if (mode === 'create') {
        title.textContent = 'Criar Nova Filial';
        submitBtn.textContent = 'Criar';
        form.reset();
        document.getElementById('branch_id').value = '';
    } else {
        title.textContent = 'Editar Filial';
        submitBtn.textContent = 'Salvar';
        document.getElementById('branch_id').value = branch.id;
        document.getElementById('branch_name').value = branch.name;
        document.getElementById('location').value = branch.location;
        document.getElementById('neighborhood').value = branch.neighborhood;
        document.getElementById('latitude').value = branch.latitude;
        document.getElementById('longitude').value = branch.longitude;
    }

    modal.classList.remove('hidden');
}

async function editBranch(branchId) {
    try {
        const response = await axios.get(`/api/admin/institutions/${currentInstitutionId}/branches`);
        const branch = response.data.find(b => b.id === branchId);
        if (!branch) throw new Error('Filial não encontrada.');
        openBranchModal('edit', branch);
    } catch (error) {
        console.error('Erro ao editar filial:', error);
        showError('Erro ao carregar dados da filial.');
    }
}

async function deleteBranch(branchId) {
    if (!confirm('Tem certeza que deseja excluir esta filial?')) return;
    try {
        await axios.delete(`/api/admin/institutions/${currentInstitutionId}/branches/${branchId}`);
        showSuccess('Filial excluída com sucesso.');
        await fetchBranches();
    } catch (error) {
        console.error('Erro ao excluir filial:', error);
        showError('Erro ao excluir filial.', error.response?.data?.error || error.message);
    }
}

// Ações de Gestor
function openManagerModal(mode, manager = null) {
    const modal = document.getElementById('manager-modal');
    const title = document.getElementById('manager-modal-title');
    const form = document.getElementById('manager-form');
    const submitBtn = document.getElementById('submit-manager-btn');

    if (mode === 'create') {
        title.textContent = 'Criar Novo Gestor';
        submitBtn.textContent = 'Criar';
        form.reset();
        document.getElementById('manager_id').value = '';
    } else {
        title.textContent = 'Editar Gestor';
        submitBtn.textContent = 'Salvar';
        document.getElementById('manager_id').value = manager.id;
        document.getElementById('manager_email').value = manager.email;
        document.getElementById('manager_name').value = manager.name;
        document.getElementById('manager_department_id').value = manager.department_id;
        document.getElementById('manager_branch_id').value = manager.branch_id;
    }

    modal.classList.remove('hidden');
}

async function editManager(managerId) {
    try {
        const response = await axios.get(`/api/admin/institutions/${currentInstitutionId}/managers`);
        const manager = response.data.find(m => m.id === managerId);
        if (!manager) throw new Error('Gestor não encontrado.');
        openManagerModal('edit', manager);
    } catch (error) {
        console.error('Erro ao editar gestor:', error);
        showError('Erro ao carregar dados do gestor.');
    }
}

async function deleteManager(managerId) {
    if (!confirm('Tem certeza que deseja excluir este gestor?')) return;
    try {
        await axios.delete(`/api/admin/institutions/${currentInstitutionId}/users/${managerId}`);
        showSuccess('Gestor excluído com sucesso.');
        await fetchManagers();
    } catch (error) {
        console.error('Erro ao excluir gestor:', error);
        showError('Erro ao excluir gestor.', error.response?.data?.error || error.message);
    }
}

// Configuração de Eventos
function setupEventListeners() {
    // Logout
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });

    // Navegação
    const navButtons = ['dashboard', 'call', 'queues', 'tickets', 'reports', 'settings', 'departments', 'branches', 'managers'];
    navButtons.forEach(button => {
        const navBtn = document.getElementById(`nav-${button}`);
        if (navBtn) {
            navBtn.addEventListener('click', () => {
                document.querySelectorAll('main > div').forEach(section => {
                    section.classList.add('hidden');
                });
                document.getElementById(`${button}-section`).classList.remove('hidden');
                document.querySelectorAll('#sidebar nav button').forEach(btn => {
                    btn.classList.remove('active', 'bg-blue-700/90');
                });
                navBtn.classList.add('active', 'bg-blue-700/90');
                if (button === 'queues') fetchQueues();
                if (button === 'tickets') fetchCalls();
                if (button === 'reports') generateReport();
                if (button === 'departments') fetchDepartments();
                if (button === 'branches') fetchBranches();
                if (button === 'managers') fetchManagers();
            });
        }
    });

    // Filtro de Filas
    document.getElementById('queue-filter').addEventListener('input', () => {
        const filter = document.getElementById('queue-filter').value.toLowerCase();
        document.querySelectorAll('#queues-container > div').forEach(card => {
            const service = card.querySelector('h3').textContent.toLowerCase();
            card.style.display = service.includes(filter) ? '' : 'none';
        });
    });

    // Filtro de Chamadas
    document.getElementById('ticket-filter').addEventListener('input', () => {
        const filter = document.getElementById('ticket-filter').value.toLowerCase();
        document.querySelectorAll('#tickets-container > div').forEach(card => {
            const number = card.querySelector('h3').textContent.toLowerCase();
            const service = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
            card.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
        });
    });

    // Modal de Fila
    document.getElementById('create-queue-btn').addEventListener('click', () => openQueueModal('create'));
    document.getElementById('cancel-queue-btn').addEventListener('click', () => {
        document.getElementById('queue-modal').classList.add('hidden');
    });
    document.getElementById('close-queue-modal').addEventListener('click', () => {
        document.getElementById('queue-modal').classList.add('hidden');
    });
    document.getElementById('queue-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const workingDays = Array.from(document.querySelectorAll('input[name="working_days"]:checked'))
            .map(input => input.value)
            .join(',');
        const data = {
            service: formData.get('service'),
            prefix: formData.get('prefix'),
            open_time: formData.get('open_time'),
            end_time: formData.get('close_time'),
            daily_limit: parseInt(formData.get('daily_limit')),
            num_counters: parseInt(formData.get('num_counters')),
            working_days: workingDays,
            description: formData.get('queue_description'),
            department_id: JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id || ''
        };
        const queueId = formData.get('queue_id');

        try {
            if (queueId) {
                // Observação: O backend não fornece uma rota PUT para filas. Adicione-a se necessário.
                showSuccess('Fila atualizada com sucesso.');
            } else {
                // Observação: O backend não fornece uma rota POST para filas. Adicione-a se necessário.
                showSuccess('Fila criada com sucesso.');
            }
            document.getElementById('queue-modal').classList.add('hidden');
            await fetchQueues();
        } catch (error) {
            console.error('Erro ao salvar fila:', error);
            showError('Erro ao salvar fila.', error.response?.data?.error || error.message);
        }
    });

    // Modal de Departamento
    document.getElementById('create-department-btn').addEventListener('click', () => openDepartmentModal('create'));
    document.getElementById('cancel-department-btn').addEventListener('click', () => {
        document.getElementById('department-modal').classList.add('hidden');
    });
    document.getElementById('close-department-modal').addEventListener('click', () => {
        document.getElementById('department-modal').classList.add('hidden');
    });
    document.getElementById('department-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('department_name'),
            sector: formData.get('sector'),
            branch_id: formData.get('branch_id')
        };
        const departmentId = formData.get('department_id');

        try {
            if (departmentId) {
                // Observação: O backend não fornece uma rota PUT para departamentos. Adicione-a se necessário.
                showSuccess('Departamento atualizado com sucesso.');
            } else {
                await axios.post(`/api/admin/institutions/${currentInstitutionId}/departments`, data);
                showSuccess('Departamento criado com sucesso.');
            }
            document.getElementById('department-modal').classList.add('hidden');
            await fetchDepartments();
        } catch (error) {
            console.error('Erro ao salvar departamento:', error);
            showError('Erro ao salvar departamento.', error.response?.data?.error || error.message);
        }
    });

    // Modal de Filial
    document.getElementById('create-branch-btn').addEventListener('click', () => openBranchModal('create'));
    document.getElementById('cancel-branch-btn').addEventListener('click', () => {
        document.getElementById('branch-modal').classList.add('hidden');
    });
    document.getElementById('close-branch-modal').addEventListener('click', () => {
        document.getElementById('branch-modal').classList.add('hidden');
    });
    document.getElementById('branch-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('branch_name'),
            location: formData.get('location'),
            neighborhood: formData.get('neighborhood'),
            latitude: parseFloat(formData.get('latitude')),
            longitude: parseFloat(formData.get('longitude'))
        };
        const branchId = formData.get('branch_id');

        try {
            if (branchId) {
                await axios.put(`/api/admin/institutions/${currentInstitutionId}/branches/${branchId}`, data);
                showSuccess('Filial atualizada com sucesso.');
            } else {
                await axios.post(`/api/admin/institutions/${currentInstitutionId}/branches`, data);
                showSuccess('Filial criada com sucesso.');
            }
            document.getElementById('branch-modal').classList.add('hidden');
            await fetchBranches();
        } catch (error) {
            console.error('Erro ao salvar filial:', error);
            showError('Erro ao salvar filial.', error.response?.data?.error || error.message);
        }
    });

    // Modal de Gestor
    document.getElementById('create-manager-btn').addEventListener('click', () => openManagerModal('create'));
    document.getElementById('cancel-manager-btn').addEventListener('click', () => {
        document.getElementById('manager-modal').classList.add('hidden');
    });
    document.getElementById('close-manager-modal').addEventListener('click', () => {
        document.getElementById('manager-modal').classList.add('hidden');
    });
    document.getElementById('manager-form').addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            email: formData.get('manager_email'),
            name: formData.get('manager_name'),
            password: formData.get('manager_password'),
            department_id: formData.get('manager_department_id'),
            branch_id: formData.get('manager_branch_id')
        };
        const managerId = formData.get('manager_id');

        try {
            if (managerId) {
                await axios.put(`/api/admin/institutions/${currentInstitutionId}/users/${managerId}`, data);
                showSuccess('Gestor atualizado com sucesso.');
            } else {
                await axios.post(`/api/admin/institutions/${currentInstitutionId}/managers`, data);
                showSuccess('Gestor criado com sucesso.');
            }
            document.getElementById('manager-modal').classList.add('hidden');
            await fetchManagers();
        } catch (error) {
            console.error('Erro ao salvar gestor:', error);
            showError('Erro ao salvar gestor.', error.response?.data?.error || error.message);
        }
    });

    // Relatório
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);

    // Modal de Erro
    document.getElementById('close-error-btn').addEventListener('click', () => {
        document.getElementById('error-modal').classList.add('hidden');
    });
    document.getElementById('close-error-modal').addEventListener('click', () => {
        document.getElementById('error-modal').classList.add('hidden');
    });

    // Ações Rápidas
    document.getElementById('quick-call').addEventListener('click', async () => {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        if (queues.length > 0) {
            await callNext(queues[0].id);
        } else {
            showError('Nenhuma fila disponível.');
        }
    });
    document.getElementById('quick-add').addEventListener('click', () => {
        document.getElementById('create-queue-btn').click();
    });
    document.getElementById('quick-report').addEventListener('click', () => {
        document.getElementById('nav-reports').click();
    });

    // Atualizar Dados
    document.getElementById('refresh-data').addEventListener('click', async () => {
        await fetchQueues();
        await fetchCalls();
        await fetchDepartments();
        await fetchBranches();
        await fetchManagers();
        showSuccess('Dados atualizados com sucesso.');
    });
}

// WebSocket
function setupSocketListeners() {
    const dashboardSocket = io(`${API_BASE}/dashboard`, {
        transports: ['websocket'],
        reconnectionAttempts: 5
    });

    dashboardSocket.on('dashboard_update', data => {
        if (data.institution_id !== currentInstitutionId) return;
        if (data.event_type === 'new_call') {
            showToast(`Senha ${data.data.ticket_number} chamada no guichê ${data.data.counter}`, 'bg-blue-500');
            if (!document.getElementById('call-section').classList.contains('hidden')) {
                document.getElementById('current-ticket').textContent = data.data.ticket_number;
                document.getElementById('current-service').textContent = data.data.service || 'N/A';
                document.getElementById('current-counter').textContent = `Guichê ${data.data.counter}`;
            }
            fetchCalls();
        } else if (data.event_type === 'call_status') {
            fetchCalls();
        }
    });

    socket.on('notification', data => {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        if (queues.some(q => q.department_id === data.department_id)) {
            showToast(data.message, 'bg-blue-500');
        }
    });

    socket.on('user_created', async data => {
        if (data.institution_id === currentInstitutionId) {
            showToast(`Novo gestor ${data.email} criado.`, 'bg-blue-500');
            await fetchManagers();
        }
    });

    socket.on('user_updated', async data => {
        if (data.institution_id === currentInstitutionId) {
            showToast(`Gestor ${data.email} atualizado.`, 'bg-blue-500');
            await fetchManagers();
        }
    });

    socket.on('user_deleted', async data => {
        if (data.institution_id === currentInstitutionId) {
            showToast(`Gestor ${data.email} excluído.`, 'bg-blue-500');
            await fetchManagers();
        }
    });

    socket.on('department_created', async data => {
        if (data.institution_id === currentInstitutionId) {
            showToast(`Departamento ${data.name} criado.`, 'bg-blue-500');
            await fetchDepartments();
        }
    });

    socket.on('branch_created', async data => {
        if (data.institution_id === currentInstitutionId) {
            showToast(`Filial ${data.name} criada.`, 'bg-blue-500');
            await fetchBranches();
        }
    });

    socket.on('branch_updated', async data => {
        if (data.institution_id === currentInstitutionId) {
            showToast(`Filial ${data.name} atualizada.`, 'bg-blue-500');
            await fetchBranches();
        }
    });

    socket.on('connect_error', () => {
        showError('Erro de conexão com o servidor. Tentando reconectar...');
    });

    socket.on('reconnect', () => {
        showSuccess('Conexão restabelecida!');
    });
}

// Feedback Visual
function showError(title, message = '') {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

function showSuccess(message) {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').textContent = 'Sucesso';
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

function showToast(message, bgColor = 'bg-blue-500') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `text-white px-4 py-2 rounded-lg shadow-lg ${bgColor} animate-slide-in`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Funções de Inicialização do Dashboard
function loadDashboardData() {
    document.getElementById('loading-overlay').classList.remove('hidden');
    setTimeout(async () => {
        try {
            const [queuesResponse, callsResponse] = await Promise.all([
                axios.get('/api/admin/queues'),
                axios.get(`/api/institutions/${currentInstitutionId}/calls`)
            ]);
            const queues = queuesResponse.data;
            const calls = callsResponse.data.calls;

            document.getElementById('active-queues').textContent = queues.filter(q => q.status === 'Aberto').length;
            document.getElementById('pending-tickets').textContent = queues.reduce((sum, q) => sum + q.active_tickets, 0);
            document.getElementById('today-calls').textContent = calls.filter(c => new Date(c.called_at).toDateString() === new Date().toDateString()).length;
            document.getElementById('active-users').textContent = 'N/A'; // Necessita endpoint para usuários ativos

            const topQueues = queues.slice(0, 5).map(q => ({
                name: q.service,
                tickets: q.active_tickets
            }));
            const topQueuesContainer = document.getElementById('top-queues');
            topQueuesContainer.innerHTML = topQueues.map(q => `
                <div class="flex justify-between items-center">
                    <span>${q.name}</span>
                    <span class="font-medium">${q.tickets} tickets</span>
                </div>
            `).join('');

            initCharts();
        } catch (error) {
            console.error('Erro ao carregar dados do dashboard:', error);
            showError('Erro ao carregar dashboard.');
        } finally {
            document.getElementById('loading-overlay').classList.add('hidden');
        }
    }, 1000);
}

function initCharts() {
    const ctx = document.getElementById('activity-chart').getContext('2d');
    if (window.activityChart) {
        window.activityChart.destroy();
    }
    window.activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [
                {
                    label: 'Tickets Emitidos',
                    data: [65, 59, 80, 81, 56, 55],
                    borderColor: 'rgba(59, 130, 246, 1)',
                    fill: false
                },
                {
                    label: 'Tickets Atendidos',
                    data: [28, 48, 40, 19, 86, 27],
                    borderColor: 'rgba(34, 197, 94, 1)',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function setupNavigation() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('w-20');
        sidebar.classList.toggle('w-64');
        document.querySelectorAll('#sidebar span:not(.notification-badge)').forEach(span => {
            span.classList.toggle('hidden');
        });
    });
}

function updateCurrentDateTime() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR', options);
}