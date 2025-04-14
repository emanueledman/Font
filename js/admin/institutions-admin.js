import { ApiService } from '../common/api-service.js';
import { showNotification, formToObject } from '../common/utils.js';

export async function loadInstitutions() {
    try {
        const institutions = await ApiService.getInstitutions();
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

        document.querySelectorAll('.edit').forEach(btn => {
            btn.addEventListener('click', () => openEditInstitutionModal(btn.dataset.id));
        });
        document.querySelectorAll('.delete').forEach(btn => {
            btn.addEventListener('click', () => deleteInstitution(btn.dataset.id));
        });
    } catch (error) {
        showNotification(`Erro ao carregar instituições: ${error.message}`, 'error');
    }
}

function openCreateInstitutionModal() {
    const modal = document.getElementById('create-institution-modal');
    modal.style.display = 'flex';
}

async function createInstitution(event) {
    event.preventDefault();
    const form = event.target;
    const data = formToObject(form);
    try {
        await ApiService.createInstitution(data);
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
        const inst = await ApiService.request(`/admin/institutions/${id}`);
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
        await ApiService.updateInstitution(data.id, data);
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
        await ApiService.deleteInstitution(id);
        showNotification('Instituição eliminada com sucesso', 'success');
        loadInstitutions();
    } catch (error) {
        showNotification(`Erro ao eliminar instituição: ${error.message}`, 'error');
    }
}

export function initInstitutions() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
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
}