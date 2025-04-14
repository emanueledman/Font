import { ApiService } from '../common/api-service.js';
import { showNotification } from '../common/utils.js';

export async function loadReport() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    try {
        const report = await ApiService.getReport(startDate, endDate);
        document.getElementById('report-content').innerHTML = report.map(item => `
            <tr>
                <td>${item.service}</td>
                <td>${item.issued}</td>
                <td>${item.attended}</td>
                <td>${item.cancelled}</td>
                <td>${item.avg_time || 0}</td>
            </tr>
        `).join('');
    } catch (error) {
        showNotification('Erro ao carregar relatório: ' + error.message, 'error');
    }
}

export function exportReport() {
    showNotification('Exportação CSV não implementada', 'error');
}

export function exportReportPDF() {
    showNotification('Exportação PDF não implementada', 'error');
}