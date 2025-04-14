import { showNotification } from './utils.js';

export function initWebSocket(userInfo, updateInstitutions, updateDepartments, updateUsers, updateQueues, updateTickets) {
    const socket = io('/admin', {
        auth: { token: localStorage.getItem('token') },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
    });

    socket.on('connect', () => {
        console.log('WebSocket conectado');
        socket.emit('join', {
            department_id: userInfo.department_id,
            institution_id: userInfo.institution_id
        });
    });

    socket.on('institution_created', (data) => {
        showNotification(`Instituição ${data.name} criada`, 'success');
        updateInstitutions();
    });

    socket.on('institution_updated', (data) => {
        showNotification(`Instituição ${data.name} atualizada`, 'success');
        updateInstitutions();
    });

    socket.on('institution_deleted', (data) => {
        showNotification(`Instituição ${data.name} eliminada`, 'success');
        updateInstitutions();
    });

    socket.on('department_created', (data) => {
        showNotification(`Departamento ${data.name} criado`, 'success');
        updateDepartments();
    });

    socket.on('user_created', (data) => {
        showNotification(`Usuário ${data.email} criado`, 'success');
        updateUsers();
    });

    socket.on('user_updated', (data) => {
        showNotification(`Usuário ${data.email} atualizado`, 'success');
        updateUsers();
    });

    socket.on('user_deleted', (data) => {
        showNotification(`Usuário ${data.email} eliminado`, 'success');
        updateUsers();
    });

    socket.on('ticket_update', (data) => {
        showNotification(`Senha ${data.ticket_number} atualizada: ${data.status}`, 'success');
        updateQueues();
        updateTickets();
    });

    socket.on('notification', (data) => {
        showNotification(data.message, 'success');
        updateQueues();
        updateTickets();
    });

    socket.on('connect_error', (error) => {
        console.error('Erro no WebSocket:', error);
        showNotification('Falha na conexão em tempo real', 'error');
    });

    socket.on('disconnect', () => {
        console.warn('WebSocket desconectado');
    });

    return socket;
}

export function startPolling(updateFn, interval = 30000) {
    return setInterval(updateFn, interval);
}

export function stopPolling(intervalId) {
    clearInterval(intervalId);
}