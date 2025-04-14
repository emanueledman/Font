import { ApiService } from '../common/api-service.js';
import { showNotification, formToObject, populateDepartmentSelect } from '../common/utils.js';

export async function loadUsers() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    try {
        const users = await ApiService.getUsers(userInfo.institution_id, userInfo.department_id);
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

        document.querySelectorAll('.edit').forEach(btn => {
            btn.addEventListener('click', () => openEditUserModal(btn.dataset.id));
        });
        document.querySelectorAll('.delete').forEach(btn => {
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

async function openCreateUserModal() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const modal = document.getElementById('create-user-modal');
    const select = modal.querySelector('[name="department_id"]');
    select.disabled = userInfo.role === 'dept_admin';
    if (!select.disabled) {
        await populateDepartmentSelect(select, userInfo.institution_id);
    } else {
        select.innerHTML = `<option value="${userInfo.department_id}">Departamento Atual</option>`;
    }
    modal.style.display = 'flex';
}

async function createUser(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    try {
        await ApiService.createUser(userInfo.institution_id, data);
        showNotification('Usuário criado com sucesso', 'success');
        form.reset();
        document.getElementById('create-user-modal').style.display = 'none';
        loadUsers();
    } catch (error) {
        showNotification(`Erro ao criar usuário: ${error.message}`, 'error');
    }
}

async function openEditUserModal(id) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    try {
        const user = await ApiService.request(`/admin/institutions/${userInfo.institution_id}/users/${id}`);
        const modal = document.getElementById('edit-user-modal');
        const form = document.getElementById('edit-user-form');
        const select = form.querySelector('[name="department_id"]');
        
        form.querySelector('[name="id"]').value = user.id;
        form.querySelector('[name="email"]').value = user.email;
        form.querySelector('[name="name"]').value = user.name;
        form.querySelector('[name="role"]').value = user.role;
        select.disabled = userInfo.role === 'dept_admin';
        if (!select.disabled) {
            await populateDepartmentSelect(select, userInfo.institution_id);
        } else {
            select.innerHTML = `<option value="${userInfo.department_id}">Departamento Atual</option>`;
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
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    if (!data.password) delete data.password; // Don't update password if empty
    
    try {
        await ApiService.updateUser(userInfo.institution_id, data.id, data);
        showNotification('Usuário atualizado com sucesso', 'success');
        document.getElementById('edit-user-modal').style.display = 'none';
        loadUsers();
    } catch (error) {
        showNotification(`Erro ao atualizar usuário: ${error.message}`, 'error');
    }
}

async function deleteUser(id) {
    if (!confirm('Tem certeza que deseja eliminar este usuário?')) return;
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    try {
        await ApiService.deleteUser(userInfo.institution_id, id);
        showNotification('Usuário eliminado com sucesso', 'success');
        loadUsers();
    } catch (error) {
        showNotification(`Erro ao eliminar usuário: ${error.message}`, 'error');
    }
}

export function initUsers() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (['inst_admin', 'sys_admin', 'dept_admin'].includes(userInfo.role)) {
        document.getElementById('create-user-btn').style.display = 'block';
        document.getElementById('create-user-btn').addEventListener('click', openCreateUserModal);
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
    }
}