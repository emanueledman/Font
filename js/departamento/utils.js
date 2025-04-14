const socket = io('https://fila-facilita2-0.onrender.com', { transports: ['websocket'], reconnectionAttempts: 5 });

async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        showError('Erro ao carregar informações do usuário.');
    }
}

function setupSocketListeners() {
    socket.on('queue_update', async data => {
        showToast(`Fila atualizada: ${data.message}`);
        await fetchQueues();
        await fetchTickets();
        await fetchCurrentCall();
        await fetchDashboardData();
    });

    socket.on('notification', data => {
        if (data.department_id === JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id) {
            showToast(data.message);
        }
    });

    socket.on('connect_error', () => {
        showError('Erro de conexão com o servidor. Tentando reconectar...');
    });

    socket.on('reconnect', () => {
        showSuccess('Conexão restabelecida!');
    });
}

function showError(title, message = '') {
    const modal = document.getElementById('error-modal');
    document.getElementById('error-modal-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    modal.classList.remove('hidden');
}

function showSuccess(message) {
    showToast(message, 'bg-green-500');
}

function showToast(message, bgColor = 'bg-blue-500') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `text-white px-6 py-3 rounded-lg shadow-lg ${bgColor} animate-slide-in`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

document.getElementById('close-error-btn')?.addEventListener('click', () => {
    document.getElementById('error-modal').classList.add('hidden');
});