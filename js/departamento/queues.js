async function fetchQueues(page = 1) {
    try {
        document.getElementById('queues-loading').classList.remove('hidden');
        const response = await axios.get(`/api/admin/queues?page=${page}`);
        renderQueues(response.data.queues, page, response.data.total);
        localStorage.setItem('queues', JSON.stringify(response.data.queues));
    } catch (error) {
        console.error('Erro ao buscar filas:', error);
        showError('Erro ao carregar filas.', error.response?.data?.error || error.message);
    } finally {
        document.getElementById('queues-loading').classList.add('hidden');
    }
}

function renderQueues(queues, page, total) {
    const container = document.getElementById('queues-container');
    const startSpan = document.getElementById('queues-start');
    const endSpan = document.getElementById('queues-end');
    const totalSpan = document.getElementById('queues-total');
    const prevBtn = document.getElementById('queues-prev');
    const nextBtn = document.getElementById('queues-next');
    
    container.innerHTML = '';
    if (!queues || queues.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhuma fila disponível.</p>';
        startSpan.textContent = '0';
        endSpan.textContent = '0';
        totalSpan.textContent = '0';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const itemsPerPage = 6;
    const start = (page - 1) * itemsPerPage + 1;
    const end = Math.min(page * itemsPerPage, total);

    queues.forEach(queue => {
        const progress = queue.daily_limit ? (queue.active_tickets / queue.daily_limit) * 100 : 0;
        const statusColor = queue.status === 'active' ? 'bg-green-100 text-green-800' : queue.status === 'inactive' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800';
        const card = document.createElement('div');
        card.className = 'bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover-lift transition-all';
        card.innerHTML = `
            <div class="p-5 border-b border-gray-100">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${queue.service}</h3>
                        <p class="text-sm text-gray-500">Prefix: ${queue.prefix}</p>
                    </div>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${queue.status}</span>
                </div>
            </div>
            <div class="p-5">
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-xs text-gray-500">Tickets Hoje</p>
                        <p class="font-bold">${queue.active_tickets}/${queue.daily_limit}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Tempo Médio</p>
                        <p class="font-bold">${queue.avg_wait_time ? Math.round(queue.avg_wait_time / 60) + ' min' : 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Guichês</p>
                        <p class="font-bold">${queue.num_counters}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500">Horário</p>
                        <p class="font-bold">${queue.open_time || 'N/A'} - ${queue.end_time || 'N/A'}</p>
                    </div>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div class="bg-blue-600 h-2 rounded-full" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="px-5 py-3 bg-gray-50 flex justify-between">
                <button onclick="viewQueueDetails('${queue.id}')" class="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Detalhes
                </button>
                <div class="flex space-x-2">
                    <button onclick="editQueue('${queue.id}')" class="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button onclick="deleteQueue('${queue.id}')" class="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    startSpan.textContent = start;
    endSpan.textContent = end;
    totalSpan.textContent = total;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = end >= total;
}

async function callNext(queueId) {
    try {
        const response = await axios.post(`/api/admin/queue/${queueId}/call`);
        showSuccess(`Senha ${response.data.ticket_number} chamada para o guichê ${response.data.counter}!`);
        await fetchQueues();
        await fetchTickets();
        await fetchCurrentCall();
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

async function viewQueueDetails(queueId) {
    try {
        const response = await axios.get(`/api/queue/${queueId}`);
        const queue = response.data;
        showToast(`Detalhes da fila: ${queue.service} - ${queue.active_tickets} tickets ativos`);
    } catch (error) {
        console.error('Erro ao visualizar detalhes:', error);
        showError('Erro ao carregar detalhes da fila.');
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
    document.querySelectorAll('#queues-container .card').forEach(card => {
        const service = card.querySelector('h3').textContent.toLowerCase();
        const prefix = card.querySelector('p.text-sm').textContent.toLowerCase();
        card.style.display = service.includes(filter) || prefix.includes(filter) ? '' : 'none';
    });
});

document.getElementById('queue-status-filter')?.addEventListener('change', () => {
    const filter = document.getElementById('queue-status-filter').value;
    document.querySelectorAll('#queues-container .card').forEach(card => {
        const status = card.querySelector('.rounded-full').textContent.toLowerCase();
        card.style.display = filter === 'all' || 
                           (filter === 'active' && status === 'active') ||
                           (filter === 'inactive' && status === 'inactive') ||
                           (filter === 'full' && parseInt(card.querySelector('.font-bold').textContent.split('/')[0]) >= parseInt(card.querySelector('.font-bold').textContent.split('/')[1])) 
                           ? '' : 'none';
    });
});

document.getElementById('queues-prev')?.addEventListener('click', () => {
    const currentPage = parseInt(document.getElementById('queues-start').textContent) / 6 + 1;
    if (currentPage > 1) fetchQueues(currentPage - 1);
});

document.getElementById('queues-next')?.addEventListener('click', () => {
    const currentPage = parseInt(document.getElementById('queues-start').textContent) / 6 + 1;
    fetchQueues(currentPage + 1);
});

document.getElementById('export-queues')?.addEventListener('click', async () => {
    try {
        const response = await axios.get('/api/admin/queues?export=true', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'queues_export.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        showSuccess('Filas exportadas com sucesso.');
    } catch (error) {
        console.error('Erro ao exportar filas:', error);
        showError('Erro ao exportar filas.');
    }
});