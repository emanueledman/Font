export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

export function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatTicketStatus(status) {
    const statusMap = {
        Pendente: '<span class="badge badge-warning">Pendente</span>',
        attended: '<span class="badge badge-success">Atendido</span>',
        Cancelado: '<span class="badge badge-danger">Cancelado</span>',
        Chamado: '<span class="badge badge-info">Chamado</span>',
    };
    return statusMap[status] || `<span class="badge badge-info">${status}</span>`;
}

export function formatQueueStatus(activeTickets, dailyLimit) {
    return activeTickets < dailyLimit
        ? '<span class="badge badge-success">Aberto</span>'
        : '<span class="badge badge-danger">Lotado</span>';
}