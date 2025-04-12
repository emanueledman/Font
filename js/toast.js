export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('[Toast] Container não encontrado');
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}