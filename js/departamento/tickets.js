async function fetchTickets() {
    try {
        const response = await axios.get('/api/tickets/admin');
        renderTickets(response.data);
    } catch (error) {
        console.error('Erro ao buscar tickets:', error);
        showError('Erro ao carregar tickets.', error.response?.data?.error || error.message);
    }
}

async function fetchCurrentCall() {
    try {
        const tickets = (await axios.get('/api/tickets/admin')).data;
        let latestCalled = null;
        tickets.forEach(ticket => {
            if (ticket.status === 'Chamado' && (!latestCalled || new Date(ticket.called_at) > new Date(latestCalled.called_at))) {
                latestCalled = ticket;
            }
        });

        const currentTicket = document.getElementById('current-ticket');
        const currentService = document.getElementById('current-service');
        const currentCounter = document.getElementById('current-counter');
        const recentCalls = document.getElementById('recent-calls');

        if (latestCalled) {
            currentTicket.textContent = latestCalled.number;
            currentService.textContent = `Serviço: ${latestCalled.service}`;
            currentCounter.textContent = `Guichê: ${latestCalled.counter || 'N/A'}`;
        } else {
            currentTicket.textContent = '---';
            currentService.textContent = '';
            currentCounter.textContent = '';
        }

        recentCalls.innerHTML = '';
        const recent = tickets.filter(t => t.status === 'Chamado' || t.status === 'Atendido').slice(0, 4);
        recent.forEach(ticket => {
            const card = document.createElement('div');
            card.className = 'card bg-white rounded-xl shadow-lg p-4';
            card.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-800">${ticket.number}</h3>
                <p class="text-gray-600">Serviço: ${ticket.service}</p>
                <p class="text-gray-600">Status: ${ticket.status}</p>
                <p class="text-gray-600">Guichê: ${ticket.counter || 'N/A'}</p>
            `;
            recentCalls.appendChild(card);
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
    await callNext(queues[0].id); // Chama a primeira fila; ajustar conforme lógica
});