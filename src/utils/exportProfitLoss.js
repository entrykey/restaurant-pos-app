import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const formatCurrency = (amount, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
    }).format(amount || 0);
};

/**
 * Export Profit & Loss Report to PDF with professional formatting
 */
export const exportProfitLossPDF = (data, filename, shopName, branchName) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('PROFIT & LOSS STATEMENT', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`${shopName}${branchName ? ` — ${branchName}` : ''}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 6;
    doc.setFontSize(9);
    doc.text(`${data.period?.startDate || ''} → ${data.period?.endDate || ''}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 10;

    // Helper function to add a section
    const addSection = (title, items, total, type) => {
        // Check if we need a new page
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        // Section header
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(60, 60, 60);
        doc.text((title || '').toUpperCase(), 20, yPos);
        yPos += 2;
        
        // Header underline
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 8;

        // Items
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(50, 50, 50);
        
        if (items && items.length > 0) {
            items.forEach(item => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                const itemName = item.name || item.label || 'Unknown';
                doc.text(`  ${itemName}`, 25, yPos);
                doc.text(formatCurrency(item.amount), pageWidth - 25, yPos, { align: 'right' });
                yPos += 6;
            });
        }

        // Subtotal line
        yPos += 2;
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.line(25, yPos, pageWidth - 25, yPos);
        yPos += 7;

        // Total
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(`Total ${title || ''}`, 25, yPos);
        
        // Color code totals
        if (type === 'credit') {
            doc.setTextColor(0, 128, 0); // Green for income
        } else {
            doc.setTextColor(180, 0, 0); // Red for expenses
        }
        doc.text(formatCurrency(total), pageWidth - 25, yPos, { align: 'right' });
        doc.setTextColor(0, 0, 0); // Reset to black
        
        yPos += 10;
        return yPos;
    };

    // Helper function to add subtotal/calculated line
    const addCalculatedLine = (label, amount, isFinal = false) => {
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }

        const isPositive = amount >= 0;
        const displayLabel = label || 'Result';
        
        if (isFinal) {
            // Draw box for final result
            doc.setDrawColor(isPositive ? 0 : 180, isPositive ? 128 : 0, 0);
            doc.setFillColor(isPositive ? 220 : 255, isPositive ? 255 : 220, isPositive ? 220 : 220);
            doc.setLineWidth(1);
            doc.rect(20, yPos - 5, pageWidth - 40, 12, 'FD');
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(isPositive ? 0 : 128, isPositive ? 96 : 0, 0);
            doc.text(displayLabel.toUpperCase(), 25, yPos + 2);
            doc.text(formatCurrency(amount), pageWidth - 25, yPos + 2, { align: 'right' });
            doc.setTextColor(0, 0, 0);
            yPos += 15;
        } else {
            // Regular calculated line
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.8);
            doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(isPositive ? 0 : 160, isPositive ? 100 : 0, 0);
            doc.text(displayLabel.toUpperCase(), 25, yPos + 3);
            doc.text(formatCurrency(amount), pageWidth - 25, yPos + 3, { align: 'right' });
            doc.setTextColor(0, 0, 0);
            yPos += 12;
        }
        
        return yPos;
    };

    // Add sections - handle both new structured format and legacy format
    if (data.income) {
        yPos = addSection(data.income.label || 'Income', data.income.items, data.income.total, 'credit');
    }

    if (data.costOfGoodsSold) {
        yPos = addSection(data.costOfGoodsSold.label || 'Cost of Goods Sold', data.costOfGoodsSold.items, data.costOfGoodsSold.total, 'debit');
    }

    if (data.grossProfit && data.grossProfit.amount !== undefined) {
        yPos = addCalculatedLine(data.grossProfit.label || 'Gross Profit', data.grossProfit.amount);
    } else if (data.grossProfit !== undefined && typeof data.grossProfit === 'number') {
        yPos = addCalculatedLine('Gross Profit', data.grossProfit);
    }

    if (data.operatingExpenses) {
        yPos = addSection(data.operatingExpenses.label || 'Operating Expenses', data.operatingExpenses.items, data.operatingExpenses.total, 'debit');
    }

    if (data.netProfit && data.netProfit.amount !== undefined) {
        yPos = addCalculatedLine(data.netProfit.label || 'Net Profit', data.netProfit.amount, true);
    } else if (data.netProfit !== undefined && typeof data.netProfit === 'number') {
        yPos = addCalculatedLine('Net Profit', data.netProfit, true);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`${filename}.pdf`);
};

/**
 * Export Profit & Loss Report to Excel with formulas and formatting
 */
export const exportProfitLossXLSX = (data, filename, shopName, branchName) => {
    const workbook = XLSX.utils.book_new();
    const worksheet = [];
    
    let rowNum = 1;

    // Header
    worksheet.push(['PROFIT & LOSS STATEMENT']);
    worksheet.push([`${shopName}${branchName ? ` — ${branchName}` : ''}`]);
    worksheet.push([`${data.period?.startDate || ''} → ${data.period?.endDate || ''}`]);
    worksheet.push([]);
    
    rowNum = 5;

    // Helper to add section
    const addSection = (title, items, totalLabel) => {
        worksheet.push([(title || 'Section').toUpperCase()]);
        const sectionStartRow = worksheet.length + 1;
        
        if (items && items.length > 0) {
            items.forEach(item => {
                const itemName = item.name || item.label || 'Unknown';
                worksheet.push(['', itemName, item.amount]);
            });
        }
        
        const sectionEndRow = worksheet.length;
        worksheet.push(['', `Total ${title || ''}`, { f: `SUM(C${sectionStartRow}:C${sectionEndRow})` }]);
        worksheet.push([]);
        
        return { startRow: sectionStartRow, endRow: sectionEndRow, totalRow: sectionEndRow + 1 };
    };

    // Add sections and track row numbers for formulas
    worksheet.push(['SECTION', 'DETAIL', 'AMOUNT']);
    worksheet.push([]);
    
    let incomeTotal, cogsTotal, expensesTotal;

    if (data.income) {
        const { totalRow } = addSection(data.income.label || 'Income', data.income.items, 'Income');
        incomeTotal = `C${totalRow}`;
    }

    if (data.costOfGoodsSold) {
        const { totalRow } = addSection(data.costOfGoodsSold.label || 'Cost of Goods Sold', data.costOfGoodsSold.items, 'COGS');
        cogsTotal = `C${totalRow}`;
    }

    // Gross Profit calculation
    if (incomeTotal && cogsTotal) {
        worksheet.push(['GROSS PROFIT', '', { f: `${incomeTotal}-${cogsTotal}` }]);
        worksheet.push([]);
    }

    if (data.operatingExpenses) {
        const { totalRow } = addSection(data.operatingExpenses.label || 'Operating Expenses', data.operatingExpenses.items, 'Expenses');
        expensesTotal = `C${totalRow}`;
    }

    // Net Profit calculation
    if (incomeTotal && cogsTotal && expensesTotal) {
        worksheet.push(['NET PROFIT', '', { f: `${incomeTotal}-${cogsTotal}-${expensesTotal}` }]);
    }

    // Convert to sheet
    const ws = XLSX.utils.aoa_to_sheet(worksheet);

    // Column widths
    ws['!cols'] = [
        { wch: 25 },  // Section
        { wch: 40 },  // Detail
        { wch: 15 }   // Amount
    ];

    // Add to workbook
    XLSX.utils.book_append_sheet(workbook, ws, 'P&L Statement');
    
    // Write file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Main export function that determines format
 */
export const exportProfitLoss = (data, format, filename, shopName, branchName) => {
    if (format === 'pdf') {
        exportProfitLossPDF(data, filename, shopName, branchName);
    } else if (format === 'xlsx' || format === 'excel') {
        exportProfitLossXLSX(data, filename, shopName, branchName);
    }
};
