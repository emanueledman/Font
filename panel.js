const API_BASE = 'https://fila-facilita2-0.onrender.com';
const socket = io(API_BASE, { transports: ['websocket'] });

document.addEventListener('DOMContentLoaded', () => {
    setupSocketListeners();
});

function setupSocketListeners() {
    socket.on('queue_update', (data) => {
        if (data.message.includes('chamada')) {
            addCall(data);
            playNotificationSound();
        }
    });

    socket.on('connect_error', () => {
        addCall({ message: 'Erro de conexão com o servidor.', counter: 'N/A' });
    });
}

function addCall(data) {
    const callsContainer = document.getElementById('calls');
    const div = document.createElement('div');
    div.className = 'call-item bg-blue-600 p-6 rounded-lg shadow-lg flex justify-between items-center animate-pulse';
    div.innerHTML = `
        <span class="text-2xl md:text-3xl font-semibold">${data.message}</span>
        <span class="text-xl md:text-2xl">Guichê ${data.counter || 'N/A'}</span>
    `;
    callsContainer.insertBefore(div, callsContainer.firstChild);

    // Limita a 4 chamadas visíveis
    while (callsContainer.children.length > 4) {
        callsContainer.removeChild(callsContainer.lastChild);
    }

    // Remove animação após 1 segundo
    setTimeout(() => div.classList.remove('animate-pulse'), 1000);
}

function playNotificationSound() {
    const audio = document.getElementById('notification-sound');
    audio.play().catch(err => console.error('Erro ao tocar som:', err));
}