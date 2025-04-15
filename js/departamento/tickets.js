async function fetchTickets() {
    try {
        const response = await axios.get('/api/tickets/admin');
        renderTickets(response.data);
        updateNextQueue(response.data);
    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        showError('Erro ao carregar tickets.', error.response?.data?.error || error.message);
    }
}

async function fetchCurrentCall() {
    try {
        const tickets = (await axios.get('/api/tickets/admin')).data;
        let latestCalled = null;
        let totalWaitTime = 0;
        let ticketCount = 0;

        tickets.forEach(ticket => {
            if (ticket.status === 'Chamado' && (!latestCalled || new Date(ticket.called_at) > new Date(latestCalled.called_at))) {
                latestCalled = ticket;
            }
            if (ticket.wait_time) {
                totalWaitTime += ticket.wait_time;
                ticketCount++;
            }
        });

        const currentTicket = document.getElementById('current-ticket');
        const currentService = document.getElementById('current-service');
        const currentCounter = document.getElementById('current-counter');
        const ticketCounter = document.getElementById('ticket-counter');
        const avgWaitTime = document.getElementById('avg-wait-time');
        const waitBar = document.getElementById('wait-bar');
        const recentCallsTable = document.getElementById('recent-calls-table');

        if (latestCalled) {
            currentTicket.textContent = latestCalled.number;
            currentService.textContent = `Serviço: ${latestCalled.service}`;
            currentCounter.textContent = `Guichê: ${latestCalled.counter || 'N/A'}`;
            ticketCounter.textContent = '1';
            ticketCounter.classList.remove('hidden');
        } else {
            currentTicket.textContent = '---';
            currentService.textContent = '';
            currentCounter.textContent = '';
            ticketCounter.classList.add('hidden');
        }

        const avgTime = ticketCount > 0 ? totalWaitTime / ticketCount : 0;
        avgWaitTime.textContent = avgTime ? `${Math.floor(avgTime / 60)} min ${Math.round(avgTime % 60)} s` : 'N/A';
        waitBar.style.width = avgTime ? `${Math.min((avgTime / 600) * 100, 100)}%` : '0%';

        recentCallsTable.innerHTML = '';
        const recent = tickets.filter(t => t.status === 'Chamado' || t.status === 'Atendido').slice(0, 4);
        recent.forEach(ticket => {
            const statusColor = ticket.status === 'Atendido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 bg-${ticket.status === 'Atendido' ? 'green' : 'blue'}-100 rounded-lg flex items-center justify-center">
                            <span class="text-${ticket.status === 'Atendido' ? 'green' : 'blue'}-800 font-bold">${ticket.number}</span>
                        </div>
                        <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">${ticket.number}</div>
                            <div class="text-sm text-gray-500">#${ticket.id}</div>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">${ticket.service}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">${ticket.counter || 'N/A'}</span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${new Date(ticket.called_at || ticket.issued_at).toLocaleTimeString('pt-BR')}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">${ticket.status}</span>
                </td>
            `;
            recentCallsTable.appendChild(row);
        });

        const callFilter = document.getElementById('call-filter');
        callFilter.innerHTML = '<option value="">Todas as filas</option>';
        const services = [...new Set(tickets.map(t => t.service))];
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service;
            option.textContent = service;
            callFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao buscar chamada atual:', error);
        showError('Erro ao carregar chamada atual.');
    }
}

function renderTickets(tickets) {
    const container = document.getElementById('tickets-container');
    container.innerHTML = '';
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center col-span-full">Nenhum ticket disponível.</p>';
        return;
    }

    tickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = 'card bg-white rounded-xl shadow-lg p-6';
        card.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800">${ticket.number}</h3>
            <p class="text-gray-600">Serviço: ${ticket.service}</p>
            <p class="text-gray-600">Status: ${ticket.status}</p>
            <p class="text-gray-600">Guichê: ${ticket.counter || 'N/A'}</p>
            <p class="text-gray-600">Emitido: ${new Date(ticket.issued_at).toLocaleString('pt-BR')}</p>
            ${ticket.status === 'Pendente' ? `
                <button onclick="callNext('${ticket.queue_id}')" class="mt-4 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg">
                    Chamar
                </button>
            ` : ''}
        `;
        container.appendChild(card);
    });
}

function updateNextQueue(tickets) {
    const nextQueue = document.getElementById('next-queue');
    nextQueue.innerHTML = '';
    const pending = tickets.filter(t => t.status === 'Pendente').slice(0, 3);
    if (pending.length === 0) {
        nextQueue.innerHTML = '<p class="text-gray-500 text-center">Nenhuma senha na fila.</p>';
        return;
    }
    pending.forEach(ticket => {
        const div = document.createElement('div');
        div.className = 'p-3 rounded-lg bg-blue-50 border border-blue-100 flex justify-between items-center';
        div.innerHTML = `
            <div>
                <span class="font-bold text-blue-800 text-lg">${ticket.number}</span>
                <p class="text-sm text-gray-600">${ticket.service}</p>
            </div>
            <span class="text-xs text-gray-500">Espera: ${ticket.wait_time ? Math.round(ticket.wait_time / 60) + 'min' : 'N/A'}</span>
        `;
        nextQueue.appendChild(div);
    });
}

async function validateQrCode(qrCode) {
    try {
        const response = await axios.post('/api/ticket/validate', { qr_code: qrCode });
        showSuccess(`Presença validada para ticket ${response.data.ticket_id}!`);
        await fetchTickets();
        await fetchCurrentCall();
    } catch (error) {
        console.error('Erro ao validar QR code:', error);
        showError('Erro ao validar QR code.', error.response?.data?.error || error.message);
    }
}

document.getElementById('validate-qr-btn')?.addEventListener('click', () => {
    const modal = document.getElementById('qr-modal');
    document.getElementById('qr-form').reset();
    modal.classList.remove('hidden');
});

document.getElementById('cancel-qr-btn')?.addEventListener('click', () => {
    document.getElementById('qr-modal').classList.add('hidden');
});

document.getElementById('qr-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const qrCode = document.getElementById('qr_code').value;
    await validateQrCode(qrCode);
    document.getElementById('qr-modal').classList.add('hidden');
});

document.getElementById('ticket-filter')?.addEventListener('input', () => {
    const filter = document.getElementById('ticket-filter').value.toLowerCase();
    document.querySelectorAll('#tickets-container .card').forEach(card => {
        const number = card.querySelector('h3').textContent.toLowerCase();
        const service = card.querySelector('p:nth-child(2)').textContent.toLowerCase();
        card.style.display = number.includes(filter) || service.includes(filter) ? '' : 'none';
    });
});

document.getElementById('call-next-btn')?.addEventListener('click', async () => {
    const queues = JSON.parse(localStorage.getItem('queues')) || [];
    if (queues.length === 0) {
        showError('Nenhuma fila disponível para chamar.');
        return;
    }
    await callNext(queues[0].id);
});

document.getElementById('call-filter')?.addEventListener('change', () => {
    const filter = document.getElementById('call-filter').value.toLowerCase();
    document.querySelectorAll('#recent-calls-table tr').forEach(row => {
        const service = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        row.style.display = filter === '' || service.includes(filter) ? '' : 'none';
    });
});

document.getElementById('refresh-queue')?.addEventListener('click', async () => {
    await fetchTickets();
    await fetchCurrentCall();
});

document.getElementById('view-all-queue')?.addEventListener('click', () => {
    document.getElementById('nav-tickets').click();
});

document.getElementById('view-all-calls')?.addEventListener('click', () => {
    document.getElementById('nav-tickets').click();
});

document.getElementById('recall-btn')?.addEventListener('click', async () => {
    try {
        const tickets = (await axios.get('/api/tickets/admin')).data;
        const latestCalled = tickets.find(t => t.status === 'Chamado');
        if (!latestCalled) {
            showError('Nenhuma senha chamada para rechamar.');
            return;
        }
        await axios.post(`/api/admin/queue/${latestCalled.queue_id}/call`);
        showSuccess(`Senha ${latestCalled.number} rechamada!`);
        await fetchTickets();
        await fetchCurrentCall();
    } catch (error) {
        console.error('Erro ao rechamar:', error);
        showError('Erro ao rechamar senha.', error.response?.data?.error || error.message);
    }
});