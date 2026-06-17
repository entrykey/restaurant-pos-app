/**
 * Export utilities for CommonTable — XLSX and PDF.
 * Accepts a flat array of row objects and a columns definition.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Get plain cell text from a column definition for a given row.
 * Handles two export value conventions:
 *  1. col.exportValue(cellValue, row) — CommonTable columns style
 *  2. col.exportValue(row)            — ExportSelectToolbar columns style (whole row)
 */
function getCellText(col, row) {
    if (typeof col.exportValue === 'function') {
        try {
            // Try with (cellValue, row) first — CommonTable convention
            const cellValue = row[col.key];
            const result = col.exportValue(cellValue, row);
            if (result !== undefined && result !== null) return String(result);
            // Fall back to (row) only convention
            const result2 = col.exportValue(row);
            return result2 !== undefined && result2 !== null ? String(result2) : '';
        } catch (e) {
            // If the two-arg call threw (e.g. destructuring undefined), try single-arg
            try {
                const result = col.exportValue(row);
                return result !== undefined && result !== null ? String(result) : '';
            } catch {
                return '';
            }
        }
    }
    const raw = row[col.key];
    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'object') return '';
    return String(raw);
}

/**
 * Build a 2-D array: [ [header...], [row...], ... ]
 */
function buildMatrix(columns, rows) {
    // Skip action/checkbox columns, and columns with no header
    const exportCols = columns.filter(c => c.header && c.key !== '_actions' && c.key !== 'actions');
    const headers = exportCols.map(c => c.header);
    const body = rows.map(row => exportCols.map(col => getCellText(col, row)));
    return { headers, body, exportCols };
}

export function exportToXLSX(columns, rows, filename = 'export') {
    const { headers, body } = buildMatrix(columns, rows);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(columns, rows, filename = 'export', title = '') {
    const { headers, body } = buildMatrix(columns, rows);
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

    if (title) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(title, 40, 40);
    }

    autoTable(doc, {
        head: [headers],
        body,
        startY: title ? 60 : 30,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        margin: { left: 40, right: 40 },
    });

    doc.save(`${filename}.pdf`);
}
