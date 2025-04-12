const API_URL = 'https://fila-facilita2-0.onrender.com/api';

export async function login(email, password) {
    try {
        console.log('Iniciando requisição de login:', { email });
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            credentials: 'include', // Caso precise de cookies
            mode: 'cors' // Garante modo CORS
        });

        console.log('Status da resposta:', response.status, response.statusText);
        
        // Tenta parsear o JSON, mesmo em caso de erro
        let data;
        try {
            data = await response.json();
            console.log('Corpo da resposta:', data);
        } catch (parseError) {
            console.error('Erro ao parsear JSON:', parseError);
            data = { error: 'Resposta inválida do servidor' };
        }

        if (!response.ok) {
            const errorMsg = data.error || `Erro ${response.status}: ${response.statusText}`;
            console.error('Erro na requisição:', errorMsg);
            throw new Error(errorMsg);
        }

        return data; // Esperado: { token, user_id, user_tipo, institution_id, department, email }
    } catch (error) {
        console.error('NetworkError ou outra falha:', error.message);
        // Fallback para teste local
        if (email === 'test@facilita.com' && password === '123') {
            console.warn('Usando dados de teste devido a falha de rede');
            return {
                email,
                token: 'mock-token',
                user_id: 'mock-user-id',
                user_tipo: 'gestor',
                institution_id: 'mock-institution-id',
                department: 'Teste'
            };
        }
        throw error; // Relança o erro para o componente
    }
}

export async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Nenhum token encontrado');
        throw new Error('Não autenticado');
    }

    try {
        console.log(`Requisição autenticada para ${url}`);
        const response = await fetch(`${API_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            mode: 'cors'
        });

        console.log(`Status de ${url}:`, response.status);
        const data = await response.json();
        if (!response.ok) {
            console.error(`Erro em ${url}:`, data.error || response.statusText);
            throw new Error(data.error || `Erro ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`Falha na requisição ${url}:`, error.message);
        throw error;
    }
}