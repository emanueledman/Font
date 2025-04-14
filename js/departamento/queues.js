async function fetchQueues() {
    try {
        const response = await axios.get('/api/admin/queues');
        renderQueues(response.data);
        localStorage.setItem('queues', JSON.stringify(response.data));
    } catch (error) {
        console.error('Erro ao buscar filas:', error);
        showError('Erro ao carregar filas.', error.response?.data?.error || error.message);
    }
}

function renderQueues(queues) {
    const tbody = document.getElementById('queues');
    tbody.innerHTML = '';
    if (!queues || queues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-3 text-gray-500 text-center">Nenhuma fila disponível.</td></tr>';
        return;
    }
    queues.forEach(queue => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="p-3">${queue.service}</td>
            <td class="p-3">${queue.prefix}</td>
            <td class="p-3">${queue.status}</td>
            <td class="p-3">${queue.active_tickets}/${queue.daily_limit}</td>
            <td class="p-3">${queue.open_time || 'N/A'} - ${queue.end_time || 'N/A'}</td>
            <td class="p-3">
                <button onclick="callNext('${queue.id}')" class="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-sm mr-1">Chamar</button>
                <button onclick="editQueue('${queue.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm mr-1">Editar</button>
                <button onclick="deleteQueue('${queue.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm">Excluir</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function callNext(queueId) {
    try {
        const response = await axios.post(`/api/admin/queue/${queueId}/call`);
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        await fetchQueues();
        await fetchTickets();
    } catch (error) {
        console.error('Erro ao chamar próxima senha:', error);
        showError('Erro ao chamar próxima senha.', error.response?.data?.error || error.message);
    }
}

function openQueueModal(mode, queue = null) {
    const modal = document.getElementById('queue-modal');
    const title = document.getElementById('queue-modal-title');
    const form = document.getElementById('queue-form');
    const submitBtn = document.getElementById('submit-queue-btn');

    if (mode === 'create') {
        title.textContent = 'Criar Nova Fila';
        submitBtn.textContent = 'Criar';
        form.reset();
        document.getElementById('queue_id').value = '';
    } else {
        title.textContent = 'Editar Fila';
        submitBtn.textContent = 'Salvar';
        document.getElementById('queue_id').value = queue.id;
        document.getElementById('service').value = queue.service;
        document.getElementById('prefix').value = queue.prefix;
        document.getElementById('open_time').value = queue.open_time || '';
        document.getElementById('daily_limit').value = queue.daily_limit;
        document.getElementById('num_counters').value = queue.num_counters;
    }

    modal.classList.remove('hidden');
}

async function editQueue(queueId) {
    try {
        const queues = JSON.parse(localStorage.getItem('queues')) || [];
        const queue = queues.find(q => q.id === queueId);
        if (!queue) {
            showError('Fila não encontrada localmente.');
            return;
        }
        openQueueModal('edit', queue);
    } catch (error) {
        console.error('Erro ao editar fila:', error);
        showError('Erro ao carregar dados da fila.');
    }
}

async function deleteQueue(queueId) {
    if (!confirm('Tem certeza que deseja excluir esta fila?')) return;
    try {
        await axios.delete(`/api/queue/${queueId}`);
        showSuccess('Fila excluída com sucesso.');
        await fetchQueues();
    } catch (error) {
        console.error('Erro ao excluir fila:', error);
        showError('Erro ao excluir fila.', error.response?.data?.error || error.message);
    }
}

document.getElementById('create-queue-btn')?.addEventListener('click', () => openQueueModal('create'));
document.getElementById('cancel-queue-btn')?.addEventListener('click', () => {
    document.getElementById('queue-modal').classList.add('hidden');
});
document.getElementById('queue-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        service: formData.get('service'),
        prefix: formData.get('prefix'),
        open_time: formData.get('open_time'),
        daily_limit: parseInt(formData.get('daily_limit')),
        num_counters: parseInt(formData.get('num_counters')),
        department_id: JSON.parse(localStorage.getItem('queues'))?.[0]?.department_id || ''
    };
    const queueId = formData.get('queue_id');

    try {
        if (queueId) {
            await axios.put(`/api/queue/${queueId}`, data);
            showSuccess('Fila atualizada com sucesso.');
        } else {
            await axios.post('/api/queue/create', data);
            showSuccess('Fila criada com sucesso.');
        }
        document.getElementById('queue-modal').classList.add('hidden');
        await fetchQueues();
    } catch (error) {
        console.error('Erro ao salvar fila:', error);
        showError('Erro ao salvar fila.', error.response?.data?.error || error.message);
    }
});

document.getElementById('queue-filter')?.addEventListener('input', () => {
    const filter = document.getElementById('queue-filter').value.toLowerCase();
    document.querySelectorAll('#queues tr').forEach(row => {
        const service = row.cells[0].textContent.toLowerCase();
        row.style.display = service.includes(filter) ? '' : 'none';
    });
});