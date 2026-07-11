/**
 * Utilidad global para generar y descargar documentos PDF.
 * Uses dynamic imports to avoid loading jsPDF (~400KB) and html2canvas
 * in the initial bundle. They are fetched on-demand when needed.
 */
export class PdfUtils {

    /** Lazy-loads jsPDF on demand */
    private static async loadJsPDF() {
        const mod = await import('jspdf') as any;
        return mod.jsPDF || mod.default || mod;
    }

    /**
     * Descarga un PDF simulado con información básica.
     * Útil como fallback cuando el diseño HTML aún no existe o el elemento no se encuentra.
     */
    static async descargarPDFSimulado(titulo: string, id: string): Promise<void> {
        const jsPDF = await PdfUtils.loadJsPDF();
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Configurar estilos:
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(43, 58, 74); // Dark Navy de Testea

        // Cabecera
        doc.text('Reporte Visual de Resultados', 20, 30);

        // Separador
        doc.setDrawColor(81, 182, 165); // Teal Testea
        doc.setLineWidth(1);
        doc.line(20, 35, 190, 35);

        // Subtítulos
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.setTextColor(100, 116, 139); // Slate Gray

        doc.text(`Instrumento: ${titulo}`, 20, 50);
        doc.text(`ID Referencia: ${id}`, 20, 60);
        doc.text(`Fecha de Genración: ${new Date().toLocaleDateString()}`, 20, 70);

        // Cuerpo: Mensaje de placeholder
        doc.setFontSize(12);
        doc.text('Este es un reporte exportado automáticamente desde la plataforma.', 20, 90);
        doc.text('Aquí se alojará en el futuro el desglose completo del reporte.', 20, 100);

        // Pie de página
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('Generado a través de Testea Engine v2.0', 105, 280, { align: 'center' });

        // Forzar la descarga
        const filename = `Reporte_${titulo.replace(/\\s+/g, '_')}_${id.substring(0, 6)}.pdf`;
        doc.save(filename);
    }

    /**
     * Genera un PDF completo de bitácora de investigación con:
     * - Metadatos del proyecto
     * - Territorios y equipo
     * - Libro de Códigos
     * - Entradas de campo con observaciones, reflexiones y etiquetas
     */
    static async descargarReporteBitacora(bitacora: any): Promise<void> {
        const jsPDF = await PdfUtils.loadJsPDF();
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const margin = 20;
        const contentW = pageW - margin * 2;
        let y = 20;
        let pageNum = 1;

        const addPage = () => {
            doc.addPage();
            pageNum++;
            y = 20;
        };

        const checkSpace = (needed: number) => {
            if (y + needed > 275) addPage();
        };

        const addFooter = (pg: number) => {
            doc.setFontSize(9);
            doc.setTextColor(180, 180, 180);
            doc.text(`Testea Engine v2.0 — Bitácora "${bitacora.nombre || 'Sin nombre'}"`, margin, 290);
            doc.text(`Página ${pg}`, pageW - margin, 290, { align: 'right' });
        };

        // ── Header ──
        doc.setFillColor(43, 58, 74);
        doc.rect(0, 0, pageW, 45, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text('Bitácora de Investigación', margin, 22);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(bitacora.nombre || 'Sin nombre', margin, 32);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, margin, 40);

        y = 55;

        // ── Pregunta Central ──
        if (bitacora.preguntaCentral) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(11);
            doc.setTextColor(100, 116, 139);
            const lines = doc.splitTextToSize(`« ${bitacora.preguntaCentral} »`, contentW);
            doc.text(lines, margin, y);
            y += lines.length * 6 + 8;
        }

        // ── Metadata Grid ──
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageW - margin, y);
        y += 6;

        const addMeta = (label: string, val: string) => {
            if (!val) return;
            checkSpace(8);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(51, 65, 85);
            doc.text(label + ':', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(val, margin + 50, y);
            y += 6;
        };

        addMeta('Organización', bitacora.organizacion);
        addMeta('Financiador', bitacora.entidadFinanciadora);
        addMeta('Estado', (bitacora.estado || 'borrador').toUpperCase());
        addMeta('Período', `${bitacora.fechaInicio || '—'} → ${bitacora.fechaCierre || 'En curso'}`);
        addMeta('Autor', bitacora.autor_nombre);

        // ── Territories ──
        const territorios = bitacora.territorios || [];
        if (territorios.length > 0) {
            y += 4;
            checkSpace(20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(43, 58, 74);
            doc.text('Territorios', margin, y);
            y += 7;

            for (const t of territorios) {
                checkSpace(6);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text(`• ${t.displayLabel || `${t.pais} > ${t.departamento} > ${t.municipio}`}`, margin + 4, y);
                y += 5;
            }
        }

        // ── Team ──
        const equipo = bitacora.equipo || [];
        if (equipo.length > 0) {
            y += 4;
            checkSpace(20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(43, 58, 74);
            doc.text('Equipo de Campo', margin, y);
            y += 7;

            for (const m of equipo) {
                checkSpace(6);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.setTextColor(100, 116, 139);
                doc.text(`• ${m.email} — ${m.rol}`, margin + 4, y);
                y += 5;
            }
        }

        // ── Codebook ──
        const codebook = bitacora.libroCodigos || [];
        if (codebook.length > 0) {
            y += 6;
            checkSpace(20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(43, 58, 74);
            doc.text('Libro de Códigos', margin, y);
            y += 7;

            for (const c of codebook) {
                checkSpace(10);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(51, 65, 85);
                const prefix = c.nivel === 'macro' ? '■' : '  └';
                doc.text(`${prefix} ${c.nombre}`, margin + 4, y);
                y += 4;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                const regla = doc.splitTextToSize(c.reglaUso || '', contentW - 10);
                doc.text(regla, margin + 8, y);
                y += regla.length * 4 + 2;
            }
        }

        // ── Entries ──
        const entradas = bitacora.entradas || [];
        if (entradas.length > 0) {
            addPage();
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(43, 58, 74);
            doc.text(`Entradas de Campo (${entradas.length})`, margin, y);
            y += 10;

            for (let i = 0; i < entradas.length; i++) {
                const e = entradas[i];
                checkSpace(40);

                // Entry header
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, y - 4, contentW, 8, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(79, 70, 229);
                doc.text(`Entrada #${i + 1}`, margin + 2, y);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(148, 163, 184);
                const fecha = e.timestamp ? new Date(e.timestamp).toLocaleString('es-CO') : 'Sin fecha';
                doc.text(fecha, pageW - margin - 2, y, { align: 'right' });
                y += 8;

                // Geo
                if (e.geoLocation) {
                    doc.setFontSize(9);
                    doc.setTextColor(22, 101, 52);
                    doc.text(`📍 ${e.geoLocation.lat}, ${e.geoLocation.lng}`, margin + 2, y);
                    y += 5;
                }

                // Observaciones
                if (e.observaciones) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(14, 165, 233);
                    doc.text('Observaciones:', margin + 2, y);
                    y += 5;
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(51, 65, 85);
                    const obsLines = doc.splitTextToSize(e.observaciones, contentW - 6);
                    for (const line of obsLines) {
                        checkSpace(5);
                        doc.text(line, margin + 4, y);
                        y += 4.5;
                    }
                    y += 2;
                }

                // Reflexiones
                if (e.reflexiones) {
                    checkSpace(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(168, 85, 247);
                    doc.text('Reflexiones:', margin + 2, y);
                    y += 5;
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(100, 116, 139);
                    const refLines = doc.splitTextToSize(e.reflexiones, contentW - 6);
                    for (const line of refLines) {
                        checkSpace(5);
                        doc.text(line, margin + 4, y);
                        y += 4.5;
                    }
                    y += 2;
                }

                // Tags
                const allTags = [...(e.etiquetas || []), ...(e.etiquetasLibres || []).map((t: string) => `*${t}`)];
                if (allTags.length > 0) {
                    checkSpace(8);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(71, 85, 105);
                    doc.text('Tags: ' + allTags.join(', '), margin + 2, y);
                    y += 5;
                }

                // Separator
                y += 4;
                doc.setDrawColor(241, 245, 249);
                doc.line(margin, y, pageW - margin, y);
                y += 6;
            }
        }

        // Add footers to all pages
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addFooter(i);
        }

        // Save
        const safeName = (bitacora.nombre || 'bitacora').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '').replace(/\s+/g, '_');
        doc.save(`Bitacora_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
    }

    /**
     * Convierte un elemento HTML completo de la vista a PDF utilizando html2canvas + jsPDF.
     * @param elementId El ID del contenedor HTML que queremos capturar.
     * @param filename El nombre del archivo a descargar.
     */
    static async exportarElementoAPDF(elementId: string, filename: string = 'Reporte.pdf'): Promise<boolean> {
        const dataElement = document.getElementById(elementId);

        if (!dataElement) {
            console.error(`Error de exportación: No se encontró el elemento con ID "${elementId}".`);
            return false;
        }

        try {
            const [jsPDF, html2canvasModule] = await Promise.all([
                PdfUtils.loadJsPDF(),
                import('html2canvas')
            ]);
            const html2canvas = (html2canvasModule as any).default ? (html2canvasModule as any).default : html2canvasModule;

            const canvas: HTMLCanvasElement = await html2canvas(dataElement, {
                scale: 2, // Mejor resolución en la captura
                useCORS: true, // Permitir imágenes de servidores externos (como ui-avatars)
                logging: false
            });

            // Dimensión en pixeles
            const imgWidth = 210; // ancho de A4 en mm
            const pageHeight = 297; // alto de A4 en mm
            const imgHeight = canvas.height * imgWidth / canvas.width;

            const contentDataURL = canvas.toDataURL('image/png');

            const doc = new jsPDF('p', 'mm', 'a4');
            let position = 0;

            doc.addImage(contentDataURL, 'PNG', 0, position, imgWidth, imgHeight);

            // Si la imagen supera el tamaño de la hoja (A4), generar más hojas:
            let heightLeft = imgHeight - pageHeight;
            while (heightLeft > 0) {
                position = position - pageHeight;
                doc.addPage();
                doc.addImage(contentDataURL, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            doc.save(filename);
            return true;
        } catch (err) {
            console.error('Excepción al capturar canvas: ', err);
            return false;
        }
    }
}
