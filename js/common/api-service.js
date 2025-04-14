export const ApiService = {
    async request(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };

        const options = { method, headers };
        if (data) options.body = JSON.stringify(data);

        try {
            const response = await fetch(`/api${endpoint}`, options);
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('userInfo');
                window.location.href = '/index.html';
                throw new Error('Sessão expirada');
            }
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha na requisição');
            return result;
        } catch (error) {
            throw error;
        }
    },

    login(email, password) {
        return this.request('/admin/login', 'POST', { email, password });
    },

    getAdminQueues() {
        return this.request('/admin/queues');
    },

    getInstitutions() {
        return this.request('/admin/institutions');
    },

    createInstitution(data) {
        return this.request('/admin/institutions', 'POST', data);
    },

    updateInstitution(id, data) {
        return this.request(`/admin/institutions/${id}`, 'PUT', data);
    },

    deleteInstitution(id) {
        return this.request(`/admin/institutions/${id}`, 'DELETE');
    },

    getDepartments(institutionId) {
        return institutionId
            ? this.request(`/admin/institutions/${institutionId}/departments`)
            : this.request('/admin/institutions');
    },

    createDepartment(institutionId, data) {
        return this.request(`/admin/institutions/${institutionId}/departments`, 'POST', data);
    },

    getUsers(institutionId, departmentId) {
        return this.request(`/admin/institutions/${institutionId}/users${departmentId ? `?department_id=${departmentId}` : ''}`);
    },

    createUser(institutionId, data) {
        return this.request(`/admin/institutions/${institutionId}/users`, 'POST', data);
    },

    updateUser(institutionId, userId, data) {
        return this.request(`/admin/institutions/${institutionId}/users/${userId}`, 'PUT', data);
    },

    deleteUser(institutionId, userId) {
        return this.request(`/admin/institutions/${institutionId}/users/${userId}`, 'DELETE');
    },

    createQueue(departmentId, data) {
        return this.request(`/admin/departments/${departmentId}/queues`, 'POST', data);
    },

    callNextTicket(queueId) {
        return this.request(`/admin/queue/${queueId}/call`, 'POST');
    },

    getTickets(departmentId) {
        return this.request(`/tickets/admin${departmentId ? `?department_id=${departmentId}` : ''}`);
    }
};