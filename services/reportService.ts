
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { AbsenceRecord, Official } from '../types';

export const generateAbsencePDF = (record: AbsenceRecord, official: Official) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('RESOLUCIÓN DE AUSENTISMO', pageWidth / 2, 20, { align: 'center' });

    doc.setDrawColor(79, 70, 229); // Indigo
    doc.setLineWidth(1);
    doc.line(20, 25, pageWidth - 20, 25);

    // Official Info Table
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Información del Funcionario:', 20, 40);

    const officialData = [
        ['Nombre:', official.name],
        ['RUT:', official.rut || 'No registrado'],
        ['Departamento:', official.department || 'No especificado'],
        ['Cargo:', official.position],
    ];

    (doc as any).autoTable({
        startY: 45,
        theme: 'plain',
        body: officialData,
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
        },
        styles: { fontSize: 10 }
    });

    // Absence Info Table
    const currentY = (doc as any).lastAutoTable.finalY + 10;
    doc.text('Detalles de la Ausencia:', 20, currentY);

    const absenceData = [
        ['Tipo de Ausencia:', record.type],
        ['Fecha Inicio:', record.startDate],
        ['Fecha Término:', record.endDate],
        ['Total Días:', `${record.days} días`],
        ['Descripción:', record.description || 'Sin descripción adicional'],
    ];

    (doc as any).autoTable({
        startY: currentY + 5,
        theme: 'striped',
        headStyles: { fillStyle: 'F' }, // Fill color
        body: absenceData,
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 40 },
        },
        styles: { fontSize: 10 }
    });

    // Signature Area
    const signatureY = (doc as any).lastAutoTable.finalY + 40;

    doc.line(20, signatureY, 80, signatureY);
    doc.text('Firma Funcionario', 50, signatureY + 10, { align: 'center' });

    doc.line(pageWidth - 80, signatureY, pageWidth - 20, signatureY);
    doc.text('Firma Jefatura', pageWidth - 50, signatureY + 10, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Documento generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 20, doc.internal.pageSize.getHeight() - 10);

    // Save
    doc.save(`Resolucion_${official.name.replace(/\s+/g, '_')}_${record.startDate}.pdf`);
};
