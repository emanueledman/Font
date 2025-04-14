import { ApiService } from '../common/api-service.js';
import { showNotification } from '../common/utils.js';

export async function loadReport() {
    console.log('loadReport chamado'); // Debug
    try {
        const startDate = document.getElementById('report-start-date').value || new Date().toISOString().split('T')[0];
        const endDate = document.getElementById('report-end-date').value || new Date().toISOString().split('T')[0];
        console.log(`Carregando relatório de ${startDate} a ${endDate}`); // Debug

        const reportContent = document.getElementById('report-content');
        if (!reportContent) {
            console.error('Elemento report-content não encontrado'); // Debug
            return;
        }

        const report = await ApiService.getReport(startDate, endDate);
        console.log('Relatório recebido:', report); // Debug
        reportContent.innerHTML = report.map(item => `
            <tr>
                <td>${item.service}</td>
                <td>${item.attended}</td>
                <td>-</td>
                <td>-</td>
                <td>${item.avg_time || 0}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Erro em loadReport:', error); // Debug
        showNotification('Erro ao carregar relatório: ' + error.message, 'error');
    }
}

export function exportReport() {
    console.log('exportReport chamado'); // Debug
    showNotification('Exportação CSV não implementada', 'error');
}

export function exportReportPDF() {
    console.log('exportReportPDF chamado'); // Debug
    showNotification('Exportação PDF não permitida', 'error');
}