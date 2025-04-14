console.log('app.js carregado');

const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function formToObject(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    return data;
}

async function request(endpoint, method = 'GET', data = null) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };

    const options = { method, headers };
    if (data) options.body = JSON.stringify(data);

    try {
        const response = await fetch(`/api${endpoint}`, options);
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userInfo');
            window.location.href = '/index.html';
            throw new Error('Sessão expirada');
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Falha na requisição');
        return result;
    } catch (error) {
        throw error;
    }
}

function logout() {
    console.log('Logout acionado');
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    window.location.href = '/index.html';
}

function showPage(section) {
    console.log('Mostrando seção:', section);
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

// Institutions
async function loadInstitutions() {
    try {
        const institutions = await request('/admin/institutions');
        const tbody = document.querySelector('#institutions-table tbody');
        tbody.innerHTML = '';
        institutions.forEach(inst => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inst.name}</td>
                <td>${inst.location}</td>
                <td>${inst.latitude}</td>
                <td>${inst.longitude}</td>
                <td>
                    <button class="edit" data-id="${inst.id}">Editar</button>
                    <button class="delete" data-id="${inst.id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('#institutions-table .edit').forEach(btn => {
            btn.addEventListener('click', () => openEditInstitutionModal(btn.dataset.id));
        });
        document.querySelectorAll('#institutions-table .delete').forEach(btn => {
            btn.addEventListener('click', () => deleteInstitution(btn.dataset.id));
        });
    } catch (error) {
        showNotification(`Erro ao carregar instituições: ${error.message}`, 'error');
    }
}

function openCreateInstitutionModal() {
    document.getElementById('create-institution-modal').style.display = 'flex';
}

async function createInstitution(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    try {
        await request('/admin/institutions', 'POST', data);
        showNotification('Instituição criada com sucesso', 'success');
        form.reset();
        document.getElementById('create-institution-modal').style.display = 'none';
        loadInstitutions();
    } catch (error) {
        showNotification(`Erro ao criar instituição: ${error.message}`, 'error');
    }
}

async function openEditInstitutionModal(id) {
    try {
        const inst = await request(`/admin/institutions/${id}`);
        const modal = document.getElementById('edit-institution-modal');
        const form = document.getElementById('edit-institution-form');
        form.querySelector('[name="id"]').value = inst.id;
        form.querySelector('[name="name"]').value = inst.name;
        form.querySelector('[name="location"]').value = inst.location;
        form.querySelector('[name="latitude"]').value = inst.latitude;
        form.querySelector('[name="longitude"]').value = inst.longitude;
        modal.style.display = 'flex';
    } catch (error) {
        showNotification(`Erro ao carregar instituição: ${error.message}`, 'error');
    }
}

async function editInstitution(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    try {
        await request(`/admin/institutions/${data.id}`, 'PUT', data);
        showNotification('Instituição atualizada com sucesso', 'success');
        document.getElementById('edit-institution-modal').style.display = 'none';
        loadInstitutions();
    } catch (error) {
        showNotification(`Erro ao atualizar instituição: ${error.message}`, 'error');
    }
}

async function deleteInstitution(id) {
    if (!confirm('Tem certeza que deseja eliminar esta instituição?')) return;
    try {
        await request(`/admin/institutions/${id}`, 'DELETE');
        showNotification('Instituição eliminada com sucesso', 'success');
        loadInstitutions();
    } catch (error) {
        showNotification(`Erro ao eliminar instituição: ${error.message}`, 'error');
    }
}

// Departments
async function loadDepartments() {
    try {
        const endpoint = userInfo.role === 'sys_admin' 
            ? '/admin/institutions' 
            : `/admin/institutions/${userInfo.institution_id}/departments`;
        const data = await request(endpoint);
        const departments = userInfo.role === 'sys_admin' 
            ? data.flatMap(inst => inst.departments || []) 
            : data;
        
        const tbody = document.querySelector('#departments-table tbody');
        tbody.innerHTML = '';
        departments.forEach(dept => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dept.name}</td>
                <td>${dept.sector}</td>
                <td>${dept.institution?.name || 'N/A'}</td>
                <td>
                    <button class="add-user" data-id="${dept.id}">Adicionar Usuário</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('#departments-table .add-user').forEach(btn => {
            btn.addEventListener('click', () => openCreateUserModal(btn.dataset.id));
        });
    } catch (error) {
        showNotification(`Erro ao carregar departamentos: ${error.message}`, 'error');
    }
}

function openCreateDepartmentModal() {
    document.getElementById('create-department-modal').style.display = 'flex';
}

async function createDepartment(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    try {
        await request(`/admin/institutions/${userInfo.institution_id}/departments`, 'POST', data);
        showNotification('Departamento criado com sucesso', 'success');
        form.reset();
        document.getElementById('create-department-modal').style.display = 'none';
        loadDepartments();
    } catch (error) {
        showNotification(`Erro ao criar departamento: ${error.message}`, 'error');
    }
}

// Users
async function loadUsers() {
    try {
        const users = await request(`/admin/institutions/${userInfo.institution_id}/users${userInfo.department_id ? `?department_id=${userInfo.department_id}` : ''}`);
        const tbody = document.querySelector('#users-table tbody');
        tbody.innerHTML = '';
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.name}</td>
                <td>${formatRole(user.role)}</td>
                <td>${user.department?.name || 'N/A'}</td>
                <td>
                    <button class="edit" data-id="${user.id}">Editar</button>
                    <button class="delete" data-id="${user.id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('#users-table .edit').forEach(btn => {
            btn.addEventListener('click', () => openEditUserModal(btn.dataset.id));
        });
        document.querySelectorAll('#users-table .delete').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id));
        });
    } catch (error) {
        showNotification(`Erro ao carregar usuários: ${error.message}`, 'error');
    }
}

function formatRole(role) {
    const roles = {
        user: 'Usuário',
        dept_admin: 'Gestor de Departamento',
        inst_admin: 'Gestor de Instituição',
        sys_admin: 'Super Administrador'
    };
    return roles[role] || role;
}

async function populateDepartmentSelect(selectElement) {
    try {
        const departments = await request(`/admin/institutions/${userInfo.institution_id}/departments`);
        selectElement.innerHTML = '<option value="">Selecione um departamento</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        showNotification(`Erro ao carregar departamentos: ${error.message}`, 'error');
    }
}

async function openCreateUserModal(departmentId = null) {
    const modal = document.getElementById('create-user-modal');
    const select = modal.querySelector('[name="department_id"]');
    select.disabled = userInfo.role === 'dept_admin';
    if (userInfo.role === 'dept_admin') {
        select.innerHTML = `<option value="${userInfo.department_id}">Departamento Atual</option>`;
    } else {
        await populateDepartmentSelect(select);
    }
    if (departmentId) select.value = departmentId;
    modal.style.display = 'flex';
}

async function createUser(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    try {
        await request(`/admin/institutions/${userInfo.institution_id}/users`, 'POST', data);
        showNotification('Usuário criado com sucesso', 'success');
        form.reset();
        document.getElementById('create-user-modal').style.display = 'none';
        loadUsers();
    } catch (error) {
        showNotification(`Erro ao criar usuário: ${error.message}`, 'error');
    }
}

async function openEditUserModal(id) {
    try {
        const user = await request(`/admin/institutions/${userInfo.institution_id}/users/${id}`);
        const modal = document.getElementById('edit-user-modal');
        const form = document.getElementById('edit-user-form');
        const select = form.querySelector('[name="department_id"]');
        
        form.querySelector('[name="id"]').value = user.id;
        form.querySelector('[name="email"]').value = user.email;
        form.querySelector('[name="name"]').value = user.name;
        form.querySelector('[name="role"]').value = user.role;
        select.disabled = userInfo.role === 'dept_admin';
        if (userInfo.role === 'dept_admin') {
            select.innerHTML = `<option value="${userInfo.department_id}">Departamento Atual</option>`;
        } else {
            await populateDepartmentSelect(select);
        }
        form.querySelector('[name="department_id"]').value = user.department_id || '';
        modal.style.display = 'flex';
    } catch (error) {
        showNotification(`Erro ao carregar usuário: ${error.message}`, 'error');
    }
}

async function editUser(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    if (!data.password) delete data.password;
    try {
        await request(`/admin/institutions/${userInfo.institution_id}/users/${data.id}`, 'PUT', data);
        showNotification('Usuário atualizado com sucesso', 'success');
        document.getElementById('edit-user-modal').style.display = 'none';
        loadUsers();
    } catch (error) {
        showNotification(`Erro ao atualizar usuário: ${error.message}`, 'error');
    }
}

async function deleteUser(id) {
    if (!confirm('Tem certeza que deseja eliminar este usuário?')) return;
    try {
        await request(`/admin/institutions/${userInfo.institution_id}/users/${id}`, 'DELETE');
        showNotification('Usuário eliminado com sucesso', 'success');
        loadUsers();
    } catch (error) {
        showNotification(`Erro ao eliminar usuário: ${error.message}`, 'error');
    }
}

// Queues
async function loadQueues() {
    try {
        const queues = await request('/admin/queues');
        const tbody = document.querySelector('#queues-table tbody');
        tbody.innerHTML = '';
        queues.forEach(queue => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${queue.service}</td>
                <td>${queue.prefix}</td>
                <td>${queue.open_time || 'N/A'}</td>
                <td>${queue.end_time || 'N/A'}</td>
                <td>${queue.daily_limit}</td>
                <td>${queue.status}</td>
                <td>
                    <button class="call-next" data-id="${queue.id}" data-service="${queue.service}">Chamar Próxima</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.querySelectorAll('#queues-table .call-next').forEach(btn => {
            btn.addEventListener('click', () => openCallNextModal(btn.dataset.id, btn.dataset.service));
        });
    } catch (error) {
        showNotification(`Erro ao carregar filas: ${error.message}`, 'error');
    }
}

function openCreateQueueModal() {
    document.getElementById('create-queue-modal').style.display = 'flex';
}

async function createQueue(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    try {
        await request(`/admin/departments/${userInfo.department_id}/queues`, 'POST', data);
        showNotification('Fila criada com sucesso', 'success');
        form.reset();
        document.getElementById('create-queue-modal').style.display = 'none';
        loadQueues();
    } catch (error) {
        showNotification(`Erro ao criar fila: ${error.message}`, 'error');
    }
}

function openCallNextModal(queueId, service) {
    const modal = document.getElementById('call-next-modal');
    document.getElementById('call-next-service').textContent = service;
    modal.style.display = 'flex';

    document.getElementById('confirm-call-next').onclick = async () => {
        try {
            const result = await request(`/admin/queue/${queueId}/call`, 'POST');
            showNotification(`Senha ${result.ticket_number} chamada`, 'success');
            modal.style.display = 'none';
            loadQueues();
            loadTickets();
        } catch (error) {
            showNotification(`Erro ao chamar senha: ${error.message}`, 'error');
        }
    };

    document.getElementById('cancel-call-next').onclick = () => {
        modal.style.display = 'none';
    };
}

// Tickets
async function loadTickets() {
    try {
        const tickets = await request(`/tickets/admin${userInfo.department_id ? `?department_id=${userInfo.department_id}` : ''}`);
        const tbody = document.querySelector('#tickets-table tbody');
        tbody.innerHTML = '';
        tickets.forEach(ticket => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ticket.number}</td>
                <td>${ticket.service}</td>
                <td>${formatStatus(ticket.status)}</td>
                <td>${new Date(ticket.issued_at).toLocaleString('pt-AO')}</td>
                <td>${ticket.counter ? `Guichê ${ticket.counter}` : 'N/A'}</td>
                <td></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        showNotification(`Erro ao carregar senhas: ${error.message}`, 'error');
    }
}

function formatStatus(status) {
    const statuses = {
        pending: 'Pendente',
        called: 'Chamado',
        attended: 'Atendido'
    };
    return statuses[status] || status;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, inicializando app');
    if (!userInfo.email) {
        showNotification('Por favor, faça login', 'error');
        window.location.href = '/index.html';
        return;
    }

    // Display user email
    document.getElementById('user-email').textContent = userInfo.email;

    // Role-based UI
    if (userInfo.role === 'sys_admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
        document.getElementById('create-institution-btn').addEventListener('click', openCreateInstitutionModal);
        document.getElementById('create-institution-form').addEventListener('submit', createInstitution);
        document.getElementById('edit-institution-form').addEventListener('submit', editInstitution);
        document.getElementById('cancel-institution').addEventListener('click', () => {
            document.getElementById('create-institution-modal').style.display = 'none';
        });
        document.getElementById('cancel-edit-institution').addEventListener('click', () => {
            document.getElementById('edit-institution-modal').style.display = 'none';
        });
        loadInstitutions();
    }

    if (['inst_admin', 'sys_admin'].includes(userInfo.role)) {
        document.getElementById('create-department-btn').style.display = 'block';
        document.getElementById('create-department-btn').addEventListener('click', openCreateDepartmentModal);
        document.getElementById('create-department-form').addEventListener('submit', createDepartment);
        document.getElementById('cancel-department').addEventListener('click', () => {
            document.getElementById('create-department-modal').style.display = 'none';
        });
    }

    if (['inst_admin', 'sys_admin', 'dept_admin'].includes(userInfo.role)) {
        document.getElementById('create-user-btn').style.display = 'block';
        document.getElementById('create-user-btn').addEventListener('click', () => openCreateUserModal());
        document.getElementById('create-user-form').addEventListener('submit', createUser);
        document.getElementById('edit-user-form').addEventListener('submit', editUser);
        document.getElementById('cancel-user').addEventListener('click', () => {
            document.getElementById('create-user-modal').style.display = 'none';
        });
        document.getElementById('cancel-edit-user').addEventListener('click', () => {
            document.getElementById('edit-user-modal').style.display = 'none';
        });
        if (userInfo.role === 'sys_admin') {
            document.querySelectorAll('#create-user-form .admin-only, #edit-user-form .admin-only').forEach(el => {
                el.style.display = 'block';
            });
        }
        loadUsers();

        document.getElementById('create-queue-btn').style.display = 'block';
        document.getElementById('create-queue-btn').addEventListener('click', openCreateQueueModal);
        document.getElementById('create-queue-form').addEventListener('submit', createQueue);
        document.getElementById('cancel-queue').addEventListener('click', () => {
            document.getElementById('create-queue-modal').style.display = 'none';
        });
        loadQueues();
        loadTickets();
    }

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
});