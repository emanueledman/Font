async function fetchDepartmentInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        const deptName = document.getElementById('dept-name');
        const deptId = document.getElementById('dept-id');
        const dashboardName = document.getElementById('department-name');
        if (response.data.department_name) {
            deptName.value = response.data.department_name;
            deptId.value = response.data.department_id;
            dashboardName.textContent = response.data.department_name;
        } else {
            deptName.value = '';
            deptId.value = '';
            dashboardName.textContent = 'Departamento';
        }
    } catch (error) {
        console.error('Erro ao buscar departamento:', error);
        showError('Erro ao carregar informações do departamento.');
    }
}

document.getElementById('department-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('dept-name').value;
    try {
        // Simulado; ajustar conforme endpoint real
        await axios.put('/api/admin/department', { name });
        showSuccess('Departamento atualizado com sucesso.');
        await fetchDepartmentInfo();
    } catch (error) {
        console.error('Erro ao salvar departamento:', error);
        showError('Erro ao salvar departamento.', error.response?.data?.error || error.message);
    }
});