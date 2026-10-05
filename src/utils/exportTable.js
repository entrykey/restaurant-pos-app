/**
 * Export utilities for CommonTable — XLSX and PDF.
 * Accepts a flat array of row objects and a columns definition.
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function getNestedValue(obj, keyPath) {
    if (!obj || !keyPath) return undefined;
    if (Object.prototype.hasOwnProperty.call(obj, keyPath)) return obj[keyPath];
    return keyPath.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/**
 * Get plain cell text from a column definition for a given row.
 * Handles two export value conventions:
 *  1. col.exportValue(cellValue, row) — CommonTable columns style
 *  2. col.exportValue(row)            — ExportSelectToolbar columns style (whole row)
 */
function getCellText(col, row) {
    const rawVal = getNestedValue(row, col.key);

    if (typeof col.exportValue === 'function') {
        try {
            // Try with (cellValue, row) first — CommonTable convention
            const result = col.exportValue(rawVal, row);
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
    if (rawVal === null || rawVal === undefined) return '';
    if (typeof rawVal === 'object') return '';
    return String(rawVal);
}

function buildMatrix(columns, rows) {
    // Skip action/checkbox columns, columns with no header, and columns marked as non-exportable
    const exportCols = columns.filter(c => {
        if (!c || !c.header) return false;
        if (c.exportable === false) return false;

        const headerLower = String(c.header).trim().toLowerCase();
        if (headerLower === 'action' || headerLower === 'actions') return false;

        if (c.key) {
            const keyLower = String(c.key).trim().toLowerCase();
            if (keyLower === '_actions' || keyLower === 'actions' || keyLower === 'action') return false;
        }

        return true;
    });

    const headers = exportCols.map(c => c.header);
    const body = rows.map(row => exportCols.map(col => getCellText(col, row)));
    return { headers, body, exportCols };
}

export function exportToXLSX(columns, rows, filename = 'export', headerTitle = '') {
    const { headers, body } = buildMatrix(columns, rows);
    
    const displayTitle = headerTitle || (filename !== 'export' ? filename.replace(/_/g, ' ') : '');
    
    const metaRows = [];
    if (displayTitle) {
        metaRows.push([displayTitle.toUpperCase()]);
        metaRows.push([`Generated: ${new Date().toLocaleString()}`]);
        metaRows.push([`Total Records: ${rows.length}`]);
        metaRows.push([]); // blank line separator
    }

    const wsData = metaRows.length > 0 ? [...metaRows, headers, ...body] : [headers, ...body];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-calculate column widths
    const colWidths = headers.map((h, i) => {
        let maxLen = String(h || '').length;
        body.forEach(r => {
            const cellLen = String(r[i] ?? '').length;
            if (cellLen > maxLen) maxLen = cellLen;
        });
        return { wch: Math.max(maxLen + 4, 12) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = (displayTitle || 'Sheet1').replace(/[\/\\?*\[\]]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Sheet1');
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
