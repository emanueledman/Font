const API_BASE_URL = 'https://fila-facilita2-0.onrender.com';
let token = localStorage.getItem('token');

export class ApiService {
    static async request(endpoint, method = 'GET', body = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            throw new Error('Nenhum token de autenticação encontrado');
        }

        const config = { method, headers, mode: 'cors', credentials: 'omit' };
        if (body) config.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        if (response.status === 401) {
            throw new Error('Sessão expirada');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || response.statusText);
        }
        return await response.json();
    }

    static async login(email, password) {
        return await this.request('/api/admin/login', 'POST', { email, password });
    }

    static async getAdminQueues() {
        return await this.request('/api/admin/queues');
    }

    static async getAdminTickets() {
        return await this.request('/api/tickets/admin');
    }

    static async callNextTicket(queueId) {
        return await this.request(`/api/admin/queue/${queueId}/call`, 'POST');
    }

    static async createQueue(data) {
        return await this.request('/api/admin/queues', 'POST', data);
    }

    static async createUser(departmentId, data) {
        return await this.request(`/api/admin/departments/${departmentId}/users`, 'POST', data);
    }

    static async getUsers(departmentId) {
        return await this.request(`/api/admin/departments/${departmentId}/users`);
    }

    static async getReport(startDate, endDate) {
        return await this.request(`/api/admin/reports?start=${startDate}&end=${endDate}`);
    }
}