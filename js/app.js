// Basic app logic without modules
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    window.location.href = '/index.html';
}

function showPage(section) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
    document.getElementById(`${section}-section`).classList.add('active');
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    document.getElementById('section-title').textContent = {
        institutions: 'Instituições',
        departments: 'Departamentos',
        users: 'Usuários',
        queues: 'Filas',
        tickets: 'Senhas'
    }[section];
}

document.addEventListener('DOMContentLoaded', () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    if (!userInfo.email) {
        showNotification('Por favor, faça login', 'error');
        window.location.href = '/index.html';
        return;
    }

    // Display user email
    document.getElementById('user-email').textContent = userInfo.email;

    // Show admin-only sections
    if (userInfo.role === 'sys_admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
    }

    // Menu navigation
    document.querySelectorAll('.menu a').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section === 'institutions' && userInfo.role !== 'sys_admin') return;
            showPage(section);
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
});