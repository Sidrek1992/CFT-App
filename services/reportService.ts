
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
export const generateBalanceCertificatePDF = (official: Official, stats: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // institutional Header
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('CENTRO FORMACIÓN TÉCNICA ESTATAL', 20, 20);
    doc.text('ARICA Y PARINACOTA', 20, 25);

    // Title
    doc.setFontSize(16);
    doc.setTextColor(40);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICADO DE SALDO DE VACACIONES', pageWidth / 2, 45, { align: 'center' });

    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.5);
    doc.line(60, 48, pageWidth - 60, 48);

    // Content
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.setFont('helvetica', 'normal');

    const text = `La Unidad de Recursos Humanos certifica que el funcionario(a) don(ña) ${official.name}, RUT ${official.rut}, con fecha de ingreso ${official.entryDate || 'N/A'}, presenta el siguiente estado de su Feriado Legal a la fecha ${new Date().toLocaleDateString()}:`;

    const splitText = doc.splitTextToSize(text, pageWidth - 40);
    doc.text(splitText, 20, 65);

    // Stats Table
    const statsData = [
        ['Concepto', 'Días'],
        ['Límite Base Anual', `${stats.baseLimit} días`],
        ['Días Progresivos Reconocidos', `${stats.progressiveDays} días`],
        ['Días Ganados a la Fecha (Proporcional)', `${stats.proportionalDays} días`],
        ['Días Utilizados (Cargados)', `${stats.usedDays} días`],
        ['Saldo Disponible actual', `${stats.balance} días`],
    ];

    (doc as any).autoTable({
        startY: 85,
        head: [statsData[0]],
        body: statsData.slice(1),
        theme: 'striped',
        headStyles: { fillStyle: 'F', fillColor: [79, 70, 229] },
        styles: { fontSize: 10, cellPadding: 5 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    doc.setFontSize(10);
    doc.text('Para los fines que el interesado estime conveniente.', 20, finalY + 20);

    // Signature
    doc.line(pageWidth / 2 - 30, finalY + 60, pageWidth / 2 + 30, finalY + 60);
    doc.text('UNIDAD DE RECURSOS HUMANOS', pageWidth / 2, finalY + 65, { align: 'center' });
    doc.text('CFT ESTATAL ARICA Y PARINACOTA', pageWidth / 2, finalY + 70, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180);
    doc.text(`Cód. Verificación: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, 20, doc.internal.pageSize.getHeight() - 15);
    doc.text('Documento generado por el Sistema de Gestión de Personal Gestor AI', pageWidth - 20, doc.internal.pageSize.getHeight() - 15, { align: 'right' });

    doc.save(`Certificado_Saldo_${official.name.replace(/\s+/g, '_')}.pdf`);
};
