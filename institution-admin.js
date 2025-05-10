const API_BASE = 'https://fila-facilita2-0-4uzw.onrender.com';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    axios.interceptors.response.use(
        response => response,
        error => {
            if (error.response?.status === 401) {
                localStorage.clear();
                window.location.href = '/index.html';
            }
            return Promise.reject(error);
        }
    );

    try {
        // Carregar departamentos e gestores do localStorage
        let departments = JSON.parse(localStorage.getItem('departments')) || [];
        let managers = JSON.parse(localStorage.getItem('managers')) || [];

        renderDepartments(departments);
        renderManagers(managers);
        setupEventListeners();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro ao inicializar painel.');
    }
});

function renderDepartments(departments) {
    const deptList = document.getElementById('department-list');
    deptList.innerHTML = '';
    departments.forEach(dept => {
        const deptItem = document.createElement('div');
        deptItem.innerHTML = `
            <h3>${dept.name}</h3>
            <p>Setor: ${dept.sector}</p>
        `;
        deptList.appendChild(deptItem);
    });
}

function renderManagers(managers) {
    const managerList = document.getElementById('manager-list');
    managerList.innerHTML = '';
    managers.forEach(manager => {
        const managerItem = document.createElement('div');
        managerItem.innerHTML = `
            <h3>${manager.name}</h3>
            <p>Email: ${manager.email}</p>
            <p>Departamento: ${manager.department_name}</p>
        `;
        managerList.appendChild(managerItem);
    });
}

function setupEventListeners() {
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/index.html';
    });
}