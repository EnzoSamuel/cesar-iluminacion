/**
 * ========================================
 * PDF SERVICE
 * ========================================
 * Genera PDFs profesionales de remitos
 */

const PDFService = {

    /**
     * Generar PDF de un remito
     */
    generarRemito(trabajo) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();

        // ---- HEADER ----
        doc.setFillColor(26, 39, 68);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Línea de acento
        doc.setFillColor(59, 103, 178);
        doc.rect(0, 45, pageWidth, 3, 'F');

        // Título (CESAR SIN ACENTO)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('CESAR ILUMINACION', 14, 20);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Equipos de Iluminacion Profesional', 14, 28);

        // Número de remito
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`REMITO #${trabajo.numero || '----'}`, pageWidth - 14, 20, { align: 'right' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generado: ${this.formatearSoloFecha(new Date())}`, pageWidth - 14, 28, { align: 'right' });

        // ---- INFO DEL TRABAJO ----
        let yPos = 58;
        const margenIzq = 14;
        const cuadroAncho = pageWidth - 28;

        // Configuración de columnas
        const colIzqLabel = margenIzq + 5;
        const colIzqValor = margenIzq + 45;
        const colDerLabel = margenIzq + (cuadroAncho / 2) + 3;
        const colDerValor = margenIzq + (cuadroAncho / 2) + 43;

        // Anchos máximos de los valores
        const anchoMaxValorIzq = (cuadroAncho / 2) - 45;
        const anchoMaxValorDer = (cuadroAncho / 2) - 48;

        // ===== PREPARAR DATOS DE COLUMNA IZQUIERDA =====
        const filasIzq = [
            { label: 'EVENTO / TRABAJO:', valor: trabajo.nombre || 'Sin nombre', bold: true },
            { label: 'LUGAR:', valor: trabajo.lugar || 'Sin especificar', bold: false },
            { label: 'FECHA:', valor: this.formatearFecha(trabajo.fecha) || 'Sin fecha', bold: false }
        ];

        // ===== PREPARAR DATOS DE COLUMNA DERECHA =====
        const filasDer = [
            { label: 'PERSONA / CLIENTE:', valor: trabajo.persona || 'Sin especificar', bold: true },
            { label: 'TIPO DE EVENTO:', valor: trabajo.tipoEvento || 'Sin especificar', bold: false },
            { label: 'NOTAS:', valor: trabajo.notas || '---', bold: false }
        ];

        // Calcular altura necesaria de cada fila (en ambas columnas)
        doc.setFontSize(9);

        const alturasIzq = filasIzq.map(f => {
            doc.setFont('helvetica', f.bold ? 'bold' : 'normal');
            const lineas = doc.splitTextToSize(f.valor, anchoMaxValorIzq);
            return lineas.length * 4.5; // 4.5mm por línea
        });

        const alturasDer = filasDer.map(f => {
            doc.setFont('helvetica', f.bold ? 'bold' : 'normal');
            const lineas = doc.splitTextToSize(f.valor, anchoMaxValorDer);
            return lineas.length * 4.5;
        });

        // Altura de cada fila = el mayor entre izquierda y derecha
        const alturasFilas = [
            Math.max(alturasIzq[0], alturasDer[0], 7),
            Math.max(alturasIzq[1], alturasDer[1], 7),
            Math.max(alturasIzq[2], alturasDer[2], 7)
        ];

        const espaciadoEntreFilas = 4;
        const cuadroAlto =
            alturasFilas[0] +
            alturasFilas[1] +
            alturasFilas[2] +
            (espaciadoEntreFilas * 2) +
            10; // padding interno

        // Dibujar cuadro de fondo (con altura dinámica)
        doc.setFillColor(245, 247, 250);
        doc.roundedRect(margenIzq, yPos - 5, cuadroAncho, cuadroAlto, 3, 3, 'F');

        // Posición Y actual dentro del cuadro
        let yActual = yPos + 2;

        // ===== DIBUJAR CADA FILA =====
        for (let i = 0; i < 3; i++) {
            // --- LABEL IZQUIERDA ---
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text(filasIzq[i].label, colIzqLabel, yActual);

            // --- VALOR IZQUIERDA (multilinea) ---
            doc.setFontSize(9);
            doc.setFont('helvetica', filasIzq[i].bold ? 'bold' : 'normal');
            doc.setTextColor(30, 30, 30);
            const lineasIzq = doc.splitTextToSize(filasIzq[i].valor, anchoMaxValorIzq);
            doc.text(lineasIzq, colIzqValor, yActual);

            // --- LABEL DERECHA ---
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 100, 100);
            doc.text(filasDer[i].label, colDerLabel, yActual);

            // --- VALOR DERECHA (multilinea) ---
            doc.setFontSize(9);
            doc.setFont('helvetica', filasDer[i].bold ? 'bold' : 'normal');
            doc.setTextColor(30, 30, 30);
            const lineasDer = doc.splitTextToSize(filasDer[i].valor, anchoMaxValorDer);
            doc.text(lineasDer, colDerValor, yActual);

            // Avanzar al siguiente "renglón"
            yActual += alturasFilas[i] + espaciadoEntreFilas;
        }

        // Actualizar yPos para la tabla siguiente
        yPos = yPos - 5 + cuadroAlto + 8;

        // ---- TABLA DE EQUIPOS ----
        const filas = [];
        let itemCount = 0;

        for (const categoria in EQUIPOS_DB) {
            const items = EQUIPOS_DB[categoria].items;
            let categoriaAgregada = false;

            items.forEach(equipo => {
                if (trabajo.equipos && trabajo.equipos[equipo] > 0) {
                    if (!categoriaAgregada) {
                        filas.push([{
                            content: categoria,
                            colSpan: 2,
                            styles: {
                                fillColor: [26, 39, 68],
                                textColor: [255, 255, 255],
                                fontStyle: 'bold',
                                fontSize: 10,
                                cellPadding: 5,
                                halign: 'left'
                            }
                        }]);
                        categoriaAgregada = true;
                    }
                    itemCount++;
                    filas.push([
                        equipo,
                        trabajo.equipos[equipo].toString()
                    ]);
                }
            });
        }

        doc.autoTable({
            head: [['Equipo', 'Cant.']],
            body: filas,
            startY: yPos,
            theme: 'grid',
            headStyles: {
                fillColor: [59, 103, 178],
                fontSize: 9,
                fontStyle: 'bold',
                cellPadding: 5,
                halign: 'center',
                textColor: [255, 255, 255]
            },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [220, 220, 220],
                lineWidth: 0.3,
                overflow: 'linebreak' // ← Permite múltiples líneas en celdas
            },
            columnStyles: {
                0: { cellWidth: 160, halign: 'left' },
                1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
            },
            alternateRowStyles: {
                fillColor: [248, 249, 252]
            },
            didDrawPage: (data) => {
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Cesar Iluminacion  -  Pagina ${data.pageNumber} de ${pageCount}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 10,
                    { align: 'center' }
                );
            }
        });

        // Total después de la tabla
        const finalY = doc.lastAutoTable.finalY + 10;

        doc.setFillColor(245, 247, 250);
        doc.roundedRect(pageWidth - 80, finalY, 66, 15, 2, 2, 'F');

        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'bold');
        doc.text('Total items:', pageWidth - 75, finalY + 10);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(59, 103, 178);
        doc.text(itemCount.toString(), pageWidth - 20, finalY + 10, { align: 'right' });

        return doc;
    },

    /**
     * Descargar PDF
     */
    descargar(trabajo) {
        const doc = this.generarRemito(trabajo);
        const nombreLimpio = (trabajo.nombre || 'sin_nombre')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .substring(0, 30);
        const fileName = `Remito_${nombreLimpio}_${this.formatearFechaArchivo(trabajo.fecha)}.pdf`;
        doc.save(fileName);
    },

    /**
     * Formato de fecha legible (sin acentos para PDF)
     */
    formatearFecha(fechaStr) {
        if (!fechaStr) return '';
        const fecha = new Date(fechaStr + 'T12:00:00');
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const dia = dias[fecha.getDay()];
        const numDia = fecha.getDate();
        const mes = meses[fecha.getMonth()];
        const anio = fecha.getFullYear();

        return `${dia}, ${numDia} de ${mes} de ${anio}`;
    },

    /**
     * Solo fecha (sin hora)
     */
    formatearSoloFecha(fecha) {
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    },

    formatearFechaArchivo(fechaStr) {
        if (!fechaStr) return 'sin_fecha';
        return fechaStr.replace(/-/g, '');
    }
};
