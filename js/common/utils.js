export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

export function formToObject(form) {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    return data;
}

export async function populateDepartmentSelect(selectElement, institutionId) {
    try {
        const departments = await ApiService.getDepartments(institutionId);
        selectElement.innerHTML = '<option value="">Selecione um departamento</option>';
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        showNotification(`Erro ao carregar departamentos: ${error.message}`, 'error');
    }
}