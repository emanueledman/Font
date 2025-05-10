// js/attendant/utils.js
const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

// Controla o spinner de carregamento
function toggleLoading(show, message = 'Carregando...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');
    
    if (loadingOverlay && loadingMessage) {
        if (show) {
            loadingMessage.textContent = message;
            loadingOverlay.classList.remove('hidden');
        } else {
            loadingOverlay.classList.add('hidden');
        }
    }
}

// Exibe notificações (toasts)
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container não encontrado');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in`;
    toast.innerHTML = `
        <div class="flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${
                    type === 'success' ? 'M5 13l4 4L19 7' :
                    type === 'warning' ? 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' :
                    'M6 18L18 6M6 6l12 12'
                }"/>
            </svg>
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('animate-slide-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

// Exibe modal de erro
function showError(title, message = '') {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    document.getElementById('error-modal-title').textContent = title;
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

// Exibe modal de sucesso
function showSuccess(message) {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    document.getElementById('error-modal-title').textContent = 'Sucesso';
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-icon').innerHTML = `
        <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
    `;
    modal.classList.remove('hidden');
}

// Formata data para exibição
function formatDateTime(date) {
    return new Date(date).toLocaleString('pt-BR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Formata tempo de espera
function formatWaitTime(seconds) {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes} min ${remainingSeconds} s`;
}

// Atualiza data atual no painel
function updateCurrentDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = formatDateTime(now);
    }
}

// Configura Axios com token
function setupAxios() {
    const token = localStorage.getItem('attendantToken');
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    axios.defaults.baseURL = API_BASE;

    // Interceptor para erros 401
    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                showToast('Sessão expirada. Algumas funções podem estar limitadas.', 'warning');
                localStorage.removeItem('attendantToken');
            }
            return Promise.reject(error);
        }
    );
}

// Fecha modais
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

export {
    toggleLoading,
    showToast,
    showError,
    showSuccess,
    formatDateTime,
    formatWaitTime,
    updateCurrentDateTime,
    setupAxios,
    closeModal
};