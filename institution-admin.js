// Configuração da URL base da API
const API_BASE = 'https://fila-facilita2-0.onrender.com';

// Inicialização ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('adminToken');
    
    // Verifica se há token, caso contrário redireciona para login
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Configura axios com token
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE;

    // Listener para logout
    document.getElementById('logout').addEventListener('click', () => {
        localStorage.removeItem('adminToken');
        window.location.href = '/index.html';
    });

    // Carrega email do usuário e departamentos
    fetchUserInfo();
    fetchDepartments();
});

// Busca informações do usuário
async function fetchUserInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        document.getElementById('user-email').textContent = response.data.email;
    } catch (error) {
        alert('Erro ao carregar informações do usuário.');
        window.location.href = '/index.html';
    }
}

// Busca departamentos
async function fetchDepartments() {
    try {
        const response = await axios.get('/api/admin/departments');
        renderDepartments(response.data);
    } catch (error) {
        alert('Erro ao carregar departamentos.');
    }
}

// Renderiza departamentos na tela
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

// Cria novo departamento
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

// Edita departamento existente
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
    if (!confirm('Tem certeza que deseja excluir este departamento?')) return;
    try {
        await axios.delete(`/api/admin/departments/${id}`);
        fetchDepartments();
    } catch (error) {
        alert('Erro ao excluir departamento.');
    }
}