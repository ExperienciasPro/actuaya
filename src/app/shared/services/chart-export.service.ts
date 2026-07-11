import { Injectable } from '@angular/core';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'png';

export interface ExportColumn {
    key: string;
    header: string;
    width?: number;          // ancho en px (para Excel)
    format?: 'number' | 'percent' | 'date' | 'text';
}

export interface ExportDataSet {
    title: string;
    columns: ExportColumn[];
    rows: Record<string, any>[];
}

export interface ExportOptions {
    fileName?: string;
    title?: string;
    subtitle?: string;
    watermark?: string;
    orientation?: 'portrait' | 'landscape';
    includeTimestamp?: boolean;
    logoUrl?: string;
}

export interface ExportChartOptions extends ExportOptions {
    elementRef?: HTMLElement;        // Elemento DOM para capturar como imagen
    quality?: number;               // Calidad PNG (0-1)
    backgroundColor?: string;
}

// ─── Servicio ────────────────────────────────────────────────────────────────

@Injectable({
    providedIn: 'root'
})
export class ChartExportService {

    private isExporting = false;

    // ═════════════════════════════════════════════════════════════════════════
    // CSV EXPORT
    // ═════════════════════════════════════════════════════════════════════════

    exportCSV(dataset: ExportDataSet, options: ExportOptions = {}): void {
        const fileName = this.buildFileName(options.fileName || dataset.title, 'csv');

        // Header row
        const headers = dataset.columns.map(c => `"${c.header}"`).join(',');

        // Data rows
        const rows = dataset.rows.map(row =>
            dataset.columns.map(col => {
                const val = row[col.key];
                if (val == null) return '""';
                if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
                return val;
            }).join(',')
        );

        // BOM + content
        const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
        this.downloadBlob(csvContent, fileName, 'text/csv;charset=utf-8;');
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXCEL EXPORT (XLSX)
    // ═════════════════════════════════════════════════════════════════════════

    async exportExcel(datasets: ExportDataSet[], options: ExportOptions = {}): Promise<void> {
        if (this.isExporting) return;
        this.isExporting = true;

        try {
            const XLSX = await import('xlsx');
            const wb = XLSX.utils.book_new();

            datasets.forEach((ds, idx) => {
                // Preparar datos con headers
                const headerRow = ds.columns.map(c => c.header);
                const dataRows = ds.rows.map(row =>
                    ds.columns.map(col => {
                        const val = row[col.key];
                        if (col.format === 'percent' && typeof val === 'number') {
                            return val / 100; // Excel maneja porcentajes como decimales
                        }
                        return val ?? '';
                    })
                );

                const wsData = [headerRow, ...dataRows];

                // Crear hoja
                const ws = XLSX.utils.aoa_to_sheet(wsData);

                // Configurar anchos de columna
                ws['!cols'] = ds.columns.map(col => ({
                    wch: col.width || Math.max(col.header.length + 2, 12)
                }));

                // Nombre de hoja (max 31 chars, sin caracteres especiales)
                const sheetName = this.sanitizeSheetName(ds.title || `Hoja ${idx + 1}`);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // Generar archivo
            const fileName = this.buildFileName(options.fileName || 'Informe_Testea', 'xlsx');
            XLSX.writeFile(wb, fileName);
        } catch (err) {
            console.error('[Export] Error generando Excel:', err);
        } finally {
            this.isExporting = false;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PDF EXPORT
    // ═════════════════════════════════════════════════════════════════════════

    async exportPDF(datasets: ExportDataSet[], options: ExportOptions = {}): Promise<void> {
        if (this.isExporting) return;
        this.isExporting = true;

        try {
            const jspdfModule = await import('jspdf') as any;
            const jsPDF = jspdfModule.jsPDF || jspdfModule.default;

            const orientation = options.orientation || 'portrait';
            const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let y = margin;

            // ── Header ──
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, 28, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(options.title || 'Informe de Análisis', margin, 12);

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(options.subtitle || 'Generado por Testea — Plataforma de Evaluación', margin, 20);

            if (options.includeTimestamp !== false) {
                const now = new Date().toLocaleString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });
                doc.setFontSize(8);
                doc.text(now, pageWidth - margin, 20, { align: 'right' });
            }

            y = 36;

            // ── Datasets como tablas ──
            for (let d = 0; d < datasets.length; d++) {
                const ds = datasets[d];

                // Sección título
                if (y > pageHeight - 40) {
                    doc.addPage();
                    y = margin;
                }

                doc.setFillColor(241, 245, 249);
                doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, 'F');
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(ds.title, margin + 4, y + 5.5);
                y += 12;

                // Tabla simple
                const colWidths = this.computeColWidths(ds.columns, pageWidth - margin * 2);
                const cellHeight = 7;

                // Header de tabla
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, y, pageWidth - margin * 2, cellHeight, 'F');
                doc.setTextColor(100, 116, 139);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');

                let xOffset = margin;
                ds.columns.forEach((col, ci) => {
                    doc.text(col.header.toUpperCase(), xOffset + 2, y + 4.5);
                    xOffset += colWidths[ci];
                });
                y += cellHeight;

                // Rows
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
                doc.setFontSize(8);

                ds.rows.forEach((row, ri) => {
                    if (y > pageHeight - 20) {
                        doc.addPage();
                        y = margin;
                    }

                    // Alternate row color
                    if (ri % 2 === 0) {
                        doc.setFillColor(252, 252, 253);
                        doc.rect(margin, y, pageWidth - margin * 2, cellHeight, 'F');
                    }

                    xOffset = margin;
                    ds.columns.forEach((col, ci) => {
                        let val = row[col.key];
                        if (val == null) val = '–';
                        if (col.format === 'percent') val = `${val}%`;
                        if (col.format === 'number' && typeof val === 'number') val = val.toLocaleString('es-ES');
                        doc.text(String(val).substring(0, 30), xOffset + 2, y + 4.5);
                        xOffset += colWidths[ci];
                    });

                    // Línea divisoria sutil
                    doc.setDrawColor(241, 245, 249);
                    doc.line(margin, y + cellHeight, pageWidth - margin, y + cellHeight);

                    y += cellHeight;
                });

                y += 8; // Gap entre secciones
            }

            // ── Footer ──
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `${options.watermark || 'Testea'} — Página ${i} de ${totalPages}`,
                    pageWidth / 2, pageHeight - 8,
                    { align: 'center' }
                );
            }

            const fileName = this.buildFileName(options.fileName || 'Informe_Testea', 'pdf');
            doc.save(fileName);

        } catch (err) {
            console.error('[Export] Error generando PDF:', err);
        } finally {
            this.isExporting = false;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PNG EXPORT (Screenshot de un elemento DOM)
    // ═════════════════════════════════════════════════════════════════════════

    async exportPNG(chartOptions: ExportChartOptions): Promise<void> {
        if (this.isExporting || !chartOptions.elementRef) return;
        this.isExporting = true;

        try {
            const h2cModule = await import('html2canvas') as any;
            const html2canvas = h2cModule.default || h2cModule;

            const canvas = await html2canvas(chartOptions.elementRef, {
                backgroundColor: chartOptions.backgroundColor || '#ffffff',
                scale: 2, // Retina quality
                useCORS: true,
                logging: false
            });

            // Descargar como PNG
            const link = document.createElement('a');
            link.download = this.buildFileName(chartOptions.fileName || 'grafica_testea', 'png');
            link.href = canvas.toDataURL('image/png', chartOptions.quality || 0.92);
            link.click();

        } catch (err) {
            console.error('[Export] Error capturando PNG:', err);
        } finally {
            this.isExporting = false;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PDF CON CAPTURA DE GRÁFICAS (Combina tablas + screenshots)
    // ═════════════════════════════════════════════════════════════════════════

    async exportFullReport(
        datasets: ExportDataSet[],
        chartElements: HTMLElement[],
        options: ExportOptions = {}
    ): Promise<void> {
        if (this.isExporting) return;
        this.isExporting = true;

        try {
            const jspdfModule = await import('jspdf') as any;
            const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
            const h2cModule = await import('html2canvas') as any;
            const html2canvas = h2cModule.default || h2cModule;

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 12;

            // ── Portada ──
            doc.setFillColor(15, 23, 42);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(28);
            doc.setFont('helvetica', 'bold');
            doc.text(options.title || 'Informe Analítico', pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text(options.subtitle || 'Plataforma Testea', pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });

            const now = new Date().toLocaleString('es-ES', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
            doc.setFontSize(10);
            doc.setTextColor(148, 163, 184);
            doc.text(now, pageWidth / 2, pageHeight / 2 + 18, { align: 'center' });

            // ── Capturas de gráficas ──
            for (const el of chartElements) {
                try {
                    const canvas = await html2canvas(el, {
                        backgroundColor: '#ffffff',
                        scale: 2,
                        useCORS: true,
                        logging: false
                    });

                    doc.addPage();
                    const imgData = canvas.toDataURL('image/png');

                    // Calcular dimensiones manteniendo aspecto
                    const imgWidth = pageWidth - margin * 2;
                    const ratio = canvas.height / canvas.width;
                    let imgHeight = imgWidth * ratio;

                    if (imgHeight > pageHeight - margin * 2 - 10) {
                        imgHeight = pageHeight - margin * 2 - 10;
                    }

                    doc.addImage(imgData, 'PNG', margin, margin + 5, imgWidth, imgHeight);
                } catch (e) {
                    console.warn('[Export] Error capturando gráfica, saltando:', e);
                }
            }

            // ── Páginas con datos tabulares ──
            if (datasets.length > 0) {
                doc.addPage();
                let y = margin;

                for (const ds of datasets) {
                    if (y > pageHeight - 30) {
                        doc.addPage();
                        y = margin;
                    }

                    doc.setFillColor(241, 245, 249);
                    doc.roundedRect(margin, y, pageWidth - margin * 2, 8, 2, 2, 'F');
                    doc.setTextColor(15, 23, 42);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.text(ds.title, margin + 4, y + 5.5);
                    y += 12;

                    const colWidths = this.computeColWidths(ds.columns, pageWidth - margin * 2);
                    const cellH = 6;

                    // Headers
                    doc.setFillColor(248, 250, 252);
                    doc.rect(margin, y, pageWidth - margin * 2, cellH, 'F');
                    doc.setTextColor(100, 116, 139);
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'bold');

                    let xOff = margin;
                    ds.columns.forEach((col, ci) => {
                        doc.text(col.header.toUpperCase(), xOff + 1.5, y + 4);
                        xOff += colWidths[ci];
                    });
                    y += cellH;

                    // Rows
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(30, 41, 59);
                    doc.setFontSize(7);

                    ds.rows.forEach((row, ri) => {
                        if (y > pageHeight - 15) {
                            doc.addPage();
                            y = margin;
                        }
                        if (ri % 2 === 0) {
                            doc.setFillColor(252, 252, 253);
                            doc.rect(margin, y, pageWidth - margin * 2, cellH, 'F');
                        }
                        xOff = margin;
                        ds.columns.forEach((col, ci) => {
                            let val = row[col.key] ?? '–';
                            if (col.format === 'percent') val = `${val}%`;
                            doc.text(String(val).substring(0, 40), xOff + 1.5, y + 4);
                            xOff += colWidths[ci];
                        });
                        y += cellH;
                    });

                    y += 6;
                }
            }

            // ── Footers ──
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `${options.watermark || 'Testea'} — Pág. ${i}/${totalPages}`,
                    pageWidth / 2, pageHeight - 6,
                    { align: 'center' }
                );
            }

            const fn = this.buildFileName(options.fileName || 'Informe_Completo_Testea', 'pdf');
            doc.save(fn);

        } catch (err) {
            console.error('[Export] Error generando informe completo:', err);
        } finally {
            this.isExporting = false;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    get exporting(): boolean {
        return this.isExporting;
    }

    private buildFileName(base: string, ext: string): string {
        const clean = base.replace(/[^a-zA-Z0-9_\-áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_');
        const date = new Date().toISOString().substring(0, 10);
        return `${clean}_${date}.${ext}`;
    }

    private sanitizeSheetName(name: string): string {
        return name.replace(/[\\\/\?\*\[\]:]/g, '').substring(0, 31);
    }

    private computeColWidths(columns: ExportColumn[], totalWidth: number): number[] {
        const fixed = columns.filter(c => c.width);
        const flexible = columns.filter(c => !c.width);
        const fixedTotal = fixed.reduce((s, c) => s + (c.width || 0), 0);
        const flexWidth = flexible.length > 0 ? (totalWidth - fixedTotal) / flexible.length : 0;

        return columns.map(c => {
            if (c.width) return Math.min(c.width, totalWidth * 0.4);
            return Math.max(flexWidth, 20);
        });
    }

    private downloadBlob(content: string, fileName: string, mimeType: string): void {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}
