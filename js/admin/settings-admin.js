import { ApiService } from '../common/api-service.js';
import { showNotification } from '../common/utils.js';

export async function loadSettings() {
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    if (!userInfo.department_id) return;
    try {
        const users = await ApiService.getUsers(userInfo.department_id);
        document.getElementById('users-content').innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.department || '-'}</td>
                <td>${user.active ? 'Ativo' : 'Inativo'}</td>
                <td>
                    <button onclick="editUser('${user.id}')">Editar</button>
                    <button onclick="deleteUser('${user.id}')">Excluir</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification('Erro ao carregar configurações: ' + error.message, 'error');
    }
}

export function openCreateUserModal() {
    document.getElementById('create-user-modal').style.display = 'flex';
}

export function closeCreateUserModal() {
    document.getElementById('create-user-modal').style.display = 'none';
}

export async function createUser(event) {
    event.preventDefault();
    const userInfo = JSON.parse(localStorage.getItem('userInfo')) || {};
    const data = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value,
    };
    try {
        await ApiService.createUser(userInfo.department_id, data);
        showNotification('Usuário criado com sucesso', 'success');
        closeCreateUserModal();
        loadSettings();
    } catch (error) {
        showNotification('Erro ao criar usuário: ' + error.message, 'error');
    }
}

export async function saveQueueSettings(event) {
    event.preventDefault();
    showNotification('Configurações salvas (mock)', 'success');
}

export async function saveNotificationSettings(event) {
    event.preventDefault();
    showNotification('Notificações salvas (mock)', 'success');
}