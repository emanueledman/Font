import { ApiService } from '../common/api-service.js';
import { showNotification, formToObject } from '../common/utils.js';

export async function loadDepartments() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    try {
        const data = await ApiService.getDepartments(userInfo.institution_id);
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

        document.querySelectorAll('.add-user').forEach(btn => {
            btn.addEventListener('click', () => openCreateUserModal(btn.dataset.id));
        });
    } catch (error) {
        showNotification(`Erro ao carregar departamentos: ${error.message}`, 'error');
    }
}

function openCreateDepartmentModal() {
    const modal = document.getElementById('create-department-modal');
    modal.style.display = 'flex';
}

async function createDepartment(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    
    try {
        await ApiService.createDepartment(userInfo.institution_id, data);
        showNotification('Departamento criado com sucesso', 'success');
        form.reset();
        document.getElementById('create-department-modal').style.display = 'none';
        loadDepartments();
    } catch (error) {
        showNotification(`Erro ao criar departamento: ${error.message}`, 'error');
    }
}

function openCreateUserModal(departmentId) {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const modal = document.getElementById('create-user-modal');
    const select = modal.querySelector('[name="department_id"]');
    select.value = departmentId;
    select.disabled = true;
    modal.style.display = 'flex';
}

export function initDepartments() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (['inst_admin', 'sys_admin'].includes(userInfo.role)) {
        document.getElementById('create-department-btn').style.display = 'block';
        document.getElementById('create-department-btn').addEventListener('click', openCreateDepartmentModal);
        document.getElementById('create-department-form').addEventListener('submit', createDepartment);
        document.getElementById('cancel-department').addEventListener('click', () => {
            document.getElementById('create-department-modal').style.display = 'none';
        });
    }
    loadDepartments();
}