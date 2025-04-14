// Configuração da URL base da API
const API_BASE = 'https://fila-facilita2-0.onrender.com';

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    
    // Verifica token
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Configura axios
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    // Listener para logout
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/index.html';
    });

    // Configura tabs
    setupTabs();

    // Carrega dados iniciais
    fetchUserInfo();
    fetchDepartments();
    fetchInstitution();
});

// Configura navegação por tabs
function setupTabs() {
    const tabs = {
        'tab-departments': 'departments-section',
        'tab-reports': 'reports-section',
        'tab-settings': 'settings-section'
    };
    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).addEventListener('click', () => {
            Object.values(tabs).forEach(section => document.getElementById(section).classList.add('hidden'));
            document.getElementById(tabs[tabId]).classList.remove('hidden');
            document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.replace('bg-blue-500', 'bg-gray-300'));
            document.querySelectorAll('[id^="tab-"]').forEach(btn => btn.classList.replace('text-white', 'text-gray-700'));
            document.getElementById(tabId).classList.replace('bg-gray-300', 'bg-blue-500');
            document.getElementById(tabId).classList.replace('text-gray-700', 'text-white');
        });
    });
}

// Busca informações do usuário
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        alert('Erro ao carregar usuário.');
        window.location.href = '/index.html';
    }
}

// Busca dados da instituição
async function fetchInstitution() {
    try {
        const response = await axios.get('/api/admin/institution');
        document.getElementById('institution-name').value = response.data.name;
    } catch (error) {
        alert('Erro ao carregar instituição.');
    }
}

// Busca departamentos (filtrado pela instituição do usuário)
async function fetchDepartments() {
    try {
        const response = await axios.get('/api/admin/departments');
        renderDepartments(response.data);
    } catch (error) {
        alert('Erro ao carregar departamentos.');
    }
}

// Renderiza departamentos
function renderDepartments(departments) {
    const container = document.getElementById('departments');
    container.innerHTML = '';
    departments.forEach(dept => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-gray-50 rounded-lg flex justify-between items-center';
        div.innerHTML = `
            <div>
                <p class="font-semibold">${dept.name}</p>
                <p class="text-sm text-gray-600">ID: ${dept.id}</p>
            </div>
            <div>
                <button onclick="editDepartment('${dept.id}')" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded mr-2">Editar</button>
                <button onclick="deleteDepartment('${dept.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">Excluir</button>
            </div>
        `;
        container.appendChild(div);
    });
}

// Cria departamento
async function createDepartment() {
    const name = prompt('Nome do novo departamento:');
    if (!name) return;
    try {
        await axios.post('/api/admin/departments', { name });
        fetchDepartments();
    } catch (error) {
        alert('Erro ao criar departamento.');
    }
}

// Edita departamento
async function editDepartment(id) {
    const name = prompt('Novo nome do departamento:');
    if (!name) return;
    try {
        await axios.put(`/api/admin/departments/${id}`, { name });
        fetchDepartments();
    } catch (error) {
        alert('Erro ao editar departamento.');
    }
}

// Exclui departamento
async function deleteDepartment(id) {
    if (!confirm('Excluir este departamento?')) return;
    try {
        await axios.delete(`/api/admin/departments/${id}`);
        fetchDepartments();
    } catch (error) {
        alert('Erro ao excluir departamento.');
    }
}

// Gera relatório
async function generateReport() {
    const date = document.getElementById('report-date').value;
    if (!date) {
        alert('Selecione uma data.');
        return;
    }
    try {
        const response = await axios.get(`/api/admin/report/tickets?date=${date}`);
        renderReport(response.data);
    } catch (error) {
        alert('Erro ao gerar relatório.');
    }
}

// Renderiza relatório
function renderReport(data) {
    const container = document.getElementById('report-results');
    container.innerHTML = `
        <p>Total de senhas: ${data.total_tickets}</p>
        <p>Tempo médio de espera: ${data.avg_wait_time || 'N/D'} minutos</p>
        <p>Senhas atendidas: ${data.completed_tickets}</p>
    `;
}

// Atualiza instituição
async function updateInstitution() {
    const name = document.getElementById('institution-name').value;
    if (!name) {
        alert('Digite o nome da instituição.');
        return;
    }
    try {
        await axios.put('/api/admin/institution', { name });
        alert('Instituição atualizada com sucesso.');
    } catch (error) {
        alert('Erro ao atualizar instituição.');
    }
}