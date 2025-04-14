export class ApiService {
    static async login(email, password) {
        const response = await fetch('https://fila-facilita2-0.onrender.com/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            throw new Error('Falha no login');
        }
        return response.json();
    }

    static async getAdminQueues() {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Nenhum token de autenticação encontrado');
        }
        const response = await fetch('https://fila-facilita2-0.onrender.com/api/admin/queues', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error('Falha ao carregar filas');
        }
        return response.json();
    }

    static async callNextTicket(queueId) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Nenhum token de autenticação encontrado');
        }
        const response = await fetch(`https://fila-facilita2-0.onrender.com/api/admin/queues/${queueId}/call`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error('Falha ao chamar próximo ticket');
        }
        return response.json();
    }
}