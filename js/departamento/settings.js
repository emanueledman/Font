async function fetchDepartmentInfo() {
    try {
        const response = await axios.get('/api/admin/user');
        const deptInfo = document.getElementById('department-info');
        if (response.data.department_name) {
            deptInfo.textContent = `Departamento: ${response.data.department_name} (ID: ${response.data.department_id})`;
        } else {
            deptInfo.textContent = 'Nenhum departamento vinculado.';
        }
    } catch (error) {
        console.error('Erro ao buscar departamento:', error);
        showError('Erro ao carregar informações do departamento.');
    }
}