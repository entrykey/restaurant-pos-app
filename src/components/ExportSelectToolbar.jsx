/**
 * ExportSelectToolbar — reusable export + row-count toolbar for custom tables.
 * Drop this above any <table> that doesn't use CommonTable.
 *
 * Props:
 *  rows         - full data array (used for "X rows" count and default export)
 *  selected     - Set of selected row keys
 *  allSelected  - boolean: all current rows are checked
 *  someSelected - boolean: some (not all) rows checked
 *  onToggleAll  - () => void
 *  getExportRows - () => array of plain objects to export
 *  exportFilename - string
 *  exportTitle  - string
 *  columns      - [{ header, exportValue: (row) => string }] for export column mapping
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

const ExportSelectToolbar = ({
    rows = [],
    selected,
    allSelected,
    someSelected,
    onToggleAll,
    getExportRows,
    exportFilename = 'export',
    exportTitle = '',
    columns = [],
}) => {
    const { theme } = useTheme();
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef(null);

    useEffect(() => {
        if (!exportOpen) return;
        const h = (e) => { if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [exportOpen]);

    const handleExport = async (format) => {
        setExportOpen(false);
        const exportRows = getExportRows ? getExportRows() : rows;
        const { exportToXLSX, exportToPDF } = await import('../utils/exportTable');
        // ExportSelectToolbar pre-flattens rows with header strings as keys.
        // Build simple pass-through columns: key = header, no exportValue needed.
        const flatColumns = columns.map(c => ({ header: c.header, key: c.header }));
        if (format === 'xlsx') exportToXLSX(flatColumns, exportRows, exportFilename);
        else exportToPDF(flatColumns, exportRows, exportFilename, exportTitle || exportFilename);
    };

    const selCount = selected?.size ?? 0;

    return (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b ${theme.borderLight} ${theme.pageBg}`}>
            <div className="flex items-center gap-3">
                {/* Select-all checkbox */}
                <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={onToggleAll}
                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                    title="Select all rows"
                />
                <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>
                    {selCount > 0 ? `${selCount} selected` : `${rows.length} rows`}
                </span>
            </div>

            {/* Export dropdown */}
            <div ref={exportRef} className="relative">
                <button
                    onClick={() => setExportOpen(o => !o)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} hover:opacity-80`}
                >
                    <Download size={13} />
                    Export
                    {selCount > 0 && <span className="text-indigo-500">({selCount})</span>}
                    <ChevronDown size={11} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportOpen && (
                    <div className={`absolute right-0 top-full mt-1 z-50 rounded-2xl shadow-xl border overflow-hidden w-44 ${theme.surfaceBg} ${theme.borderLight}`}>
                        <button onClick={() => handleExport('xlsx')}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-black text-left transition-all ${theme.textPrimary} hover:bg-emerald-500/10`}>
                            <FileSpreadsheet size={15} className="text-emerald-500" /> Export as XLSX
                        </button>
                        <button onClick={() => handleExport('pdf')}
                            className={`w-full flex items-center gap-2 px-4 py-2.5 text-[12px] font-black text-left transition-all ${theme.textPrimary} hover:bg-red-500/10`}>
                            <FileText size={15} className="text-red-500" /> Export as PDF
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExportSelectToolbar;
