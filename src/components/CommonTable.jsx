import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';

/**
 * CommonTable Component
 * Props:
 *  columns        - column defs: { header, key, render, exportValue, headerClassName, className, width }
 *  data           - row objects
 *  rowKey         - unique key field (default: 'id')
 *  onRowClick     - row click callback
 *  className      - extra classes for container
 *  renderAdditionalRow - (row) => <tr> extra rows below each row
 *  isLoading / loadingMessage / emptyMessage
 *  currentPage / totalPages / totalItems / pageSize / onPageSizeChange / onPageChange
 *  mobileCardRender - (row) => JSX for mobile cards
 *  exportFilename - base filename for exports (default: 'export')
 *  exportTitle    - title shown in PDF header
 *  selectable     - if false, hide checkbox column entirely (default: true)
 */
const CommonTable = ({
    columns,
    data,
    rowKey = 'id',
    onRowClick,
    className = '',
    renderAdditionalRow,
    isLoading = false,
    loadingMessage = "Loading...",
    emptyMessage = "No records found.",
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 10,
    onPageSizeChange,
    onPageChange,
    mobileCardRender,
    exportFilename = 'export',
    exportTitle = '',
    selectable = true,
    showExport = true,
    onFetchAll,          // async () => allRows[] — called when user wants to select/export ALL pages
}) => {
    const { theme } = useTheme();

    // ── Selection state ──────────────────────────────────────────────────────
    const [selectedKeys, setSelectedKeys] = useState(new Set());
    const [allPagesSelected, setAllPagesSelected] = useState(false); // ALL records across all pages
    const [fetchingAll, setFetchingAll] = useState(false);
    const [allRows, setAllRows] = useState(null); // cached all-pages rows for export

    const allKeys = (data || []).map((r, i) => r[rowKey] ?? i);
    const allSelected = allKeys.length > 0 && allKeys.every(k => selectedKeys.has(k));
    const someSelected = !allSelected && allKeys.some(k => selectedKeys.has(k));

    const toggleRow = useCallback((key, e) => {
        e.stopPropagation();
        setAllPagesSelected(false);
        setSelectedKeys(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    }, []);

    const toggleAll = useCallback((e) => {
        e.stopPropagation();
        setAllPagesSelected(false);
        setSelectedKeys(allSelected ? new Set() : new Set(allKeys));
    }, [allSelected, allKeys]);

    const handleSelectAllPages = useCallback(async () => {
        if (!onFetchAll) return;
        setFetchingAll(true);
        try {
            const rows = await onFetchAll();
            setAllRows(rows);
            setAllPagesSelected(true);
            setSelectedKeys(new Set(rows.map((r, i) => r[rowKey] ?? i)));
        } catch (e) {
            console.error('Failed to fetch all rows:', e);
        } finally {
            setFetchingAll(false);
        }
    }, [onFetchAll, rowKey]);

    const clearAllPagesSelection = useCallback(() => {
        setAllPagesSelected(false);
        setAllRows(null);
        setSelectedKeys(new Set());
    }, []);

    // Clear selection when data changes
    useEffect(() => {
        if (!allPagesSelected) {
            setSelectedKeys(new Set());
        }
    }, [data, allPagesSelected]);

    const selectedRows = allPagesSelected && allRows
        ? allRows
        : (data || []).filter((r, i) => selectedKeys.has(r[rowKey] ?? i));
    const exportRows = selectedRows.length > 0 ? selectedRows : (data || []);

    // ── Export ───────────────────────────────────────────────────────────────
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
        const { exportToXLSX, exportToPDF } = await import('../utils/exportTable');
        if (format === 'xlsx') exportToXLSX(columns, exportRows, exportFilename);
        else exportToPDF(columns, exportRows, exportFilename, exportTitle || exportFilename);
    };

    // ── Page size dropdown ───────────────────────────────────────────────────
    const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];
    const [pageSizeOpen, setPageSizeOpen] = useState(false);
    const pageSizeRef = useRef(null);

    useEffect(() => {
        if (!pageSizeOpen) return;
        const h = (e) => { if (pageSizeRef.current && !pageSizeRef.current.contains(e.target)) setPageSizeOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [pageSizeOpen]);

    // ── Export + selection toolbar ───────────────────────────────────────────
    const toolbar = (selectable || true) ? (
        <div className={`flex flex-col border-b ${theme.borderLight}`}>
            <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${theme.pageBg}`}>
                <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>
                    {allPagesSelected
                        ? `All ${totalItems || selectedKeys.size} records selected`
                        : selectedKeys.size > 0
                            ? `${selectedKeys.size} of ${(data || []).length} selected`
                            : `${(data || []).length} rows`}
                </span>
                {/* Export dropdown */}
                {showExport && (
                <div ref={exportRef} className="relative">
                    <button
                        onClick={() => setExportOpen(o => !o)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} hover:opacity-80`}
                        title="Export"
                    >
                        <Download size={13} />
                        Export
                        {(selectedKeys.size > 0 || allPagesSelected) && (
                            <span className="text-indigo-500">
                                ({allPagesSelected ? (totalItems || selectedKeys.size) : selectedKeys.size})
                            </span>
                        )}
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
                )}
            </div>
            {/* "Select all pages" banner — only shown when current page all selected and more pages exist */}
            {allSelected && !allPagesSelected && onFetchAll && totalPages > 1 && (
                <div className={`flex items-center justify-center gap-3 px-4 py-2 text-[11px] font-black border-t ${theme.borderLight} bg-indigo-50/50 dark:bg-indigo-900/10`}>
                    <span className={theme.textSecondary}>
                        All {allKeys.length} rows on this page selected.
                    </span>
                    <button onClick={handleSelectAllPages} disabled={fetchingAll}
                        className="text-indigo-600 hover:underline disabled:opacity-50 flex items-center gap-1">
                        {fetchingAll ? 'Loading...' : `Select all ${totalItems} records`}
                    </button>
                    <span className={theme.textMuted}>·</span>
                    <button onClick={clearAllPagesSelection} className={`${theme.textMuted} hover:text-red-500`}>
                        Clear
                    </button>
                </div>
            )}
            {allPagesSelected && (
                <div className={`flex items-center justify-center gap-3 px-4 py-2 text-[11px] font-black border-t ${theme.borderLight} bg-indigo-50/80 dark:bg-indigo-900/20`}>
                    <span className="text-indigo-600">All {totalItems} records across all pages are selected.</span>
                    <button onClick={clearAllPagesSelection} className={`${theme.textMuted} hover:text-red-500`}>Clear selection</button>
                </div>
            )}
        </div>
    ) : null;

    // ── Pagination ───────────────────────────────────────────────────────────
    const pagination = totalPages >= 1 && onPageChange ? (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t ${theme.borderLight}`}>
            <div className="flex items-center gap-3">
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>Show</span>
                        <div ref={pageSizeRef} className="relative">
                            <button
                                onClick={() => setPageSizeOpen(o => !o)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} hover:opacity-80`}
                            >
                                {pageSize}
                                <ChevronDown size={12} className={`transition-transform duration-200 ${pageSizeOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {pageSizeOpen && (
                                <div className={`absolute bottom-full mb-1 left-0 z-50 rounded-2xl shadow-xl border overflow-hidden min-w-[70px] ${theme.surfaceBg} ${theme.borderLight}`}>
                                    {PAGE_SIZE_OPTIONS.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => { onPageSizeChange(size); setPageSizeOpen(false); }}
                                            className={`w-full px-4 py-2 text-[12px] font-black text-left transition-all ${size === pageSize ? 'bg-indigo-500 text-white' : `${theme.textPrimary} hover:bg-indigo-500/10`}`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>of {totalItems}</span>
                    </div>
                )}
                <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>
                    Page {currentPage} of {totalPages}
                </span>
            </div>
            <div className="flex gap-2">
                <button disabled={currentPage === 1 || isLoading} onClick={() => onPageChange(currentPage - 1)}
                    className={`px-4 py-2 font-black text-[11px] uppercase tracking-widest rounded-xl disabled:opacity-30 transition-all ${theme.textPrimary} ${theme.pageBg} hover:opacity-80 active:scale-95 shadow-sm border ${theme.borderLight}`}>
                    Previous
                </button>
                <button disabled={currentPage === totalPages || isLoading} onClick={() => onPageChange(currentPage + 1)}
                    className={`px-4 py-2 font-black text-[11px] uppercase tracking-widest rounded-xl disabled:opacity-30 transition-all ${theme.textPrimary} ${theme.pageBg} hover:opacity-80 active:scale-95 shadow-sm border ${theme.borderLight}`}>
                    Next
                </button>
            </div>
        </div>
    ) : null;

    // ── Checkbox cell helpers ────────────────────────────────────────────────
    const checkboxHeader = selectable ? (
        <th className={`px-3 py-3 w-10 ${theme.pageBg}`} style={{ width: 40 }}>
            <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
        </th>
    ) : null;

    const checkboxCell = (row, i) => selectable ? (
        <td className="px-3 py-2.5 w-10" onClick={e => toggleRow(row[rowKey] ?? i, e)}>
            <input
                type="checkbox"
                checked={selectedKeys.has(row[rowKey] ?? i)}
                onChange={() => {}}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
            />
        </td>
    ) : null;

    const totalCols = columns.length + (selectable ? 1 : 0);

    /* ── Mobile card view ───────────────────────────────────────────────────── */
    if (mobileCardRender) {
        return (
            <>
                <div className={`block sm:hidden ${className}`}>
                    <div className={`rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight}`}>
                        {toolbar}
                        {isLoading ? (
                            <div className="p-10 flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>{loadingMessage}</p>
                            </div>
                        ) : data && data.length > 0 ? (
                            <div className={`divide-y ${theme.borderLight}`}>
                                {data.map((row, rowIndex) => (
                                    <div key={row[rowKey] || rowIndex} onClick={() => onRowClick && onRowClick(row)} className={`${onRowClick ? 'cursor-pointer' : ''}`}>
                                        {mobileCardRender(row)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 text-center font-bold text-sm ${theme.textSecondary}`}>{emptyMessage}</div>
                        )}
                    </div>
                    {pagination && (
                        <div className={`mt-3 rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} overflow-hidden`}>
                            {pagination}
                        </div>
                    )}
                    <div className="pb-24" />
                </div>

                {/* Desktop */}
                <div className={`hidden sm:block rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
                    {toolbar}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className={`${theme.pageBg} sticky top-0 z-10`}>
                                <tr className={`${theme.textSecondary} text-[11px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                    {checkboxHeader}
                                    {columns.map((col, i) => (
                                        <th key={i} className={`px-4 py-3 ${col.headerClassName || ''}`} style={col.width ? { width: col.width } : {}}>
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.borderLight}`}>
                                {isLoading ? (
                                    <tr><td colSpan={totalCols} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>{loadingMessage}</p>
                                        </div>
                                    </td></tr>
                                ) : data && data.length > 0 ? (
                                    data.map((row, rowIndex) => (
                                        <React.Fragment key={row[rowKey] || rowIndex}>
                                            <tr onClick={() => onRowClick && onRowClick(row)}
                                                className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''} group ${selectedKeys.has(row[rowKey] ?? rowIndex) ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}>
                                                {checkboxCell(row, rowIndex)}
                                                {columns.map((col, colIndex) => (
                                                    <td key={colIndex} className={`px-4 py-2.5 ${col.className || ''}`}>
                                                        {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                                                    </td>
                                                ))}
                                            </tr>
                                            {renderAdditionalRow && renderAdditionalRow(row, totalCols)}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <tr><td colSpan={totalCols} className={`p-10 text-center font-bold text-sm ${theme.textSecondary}`}>{emptyMessage}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {pagination}
                </div>
            </>
        );
    }

    /* ── Default table view ─────────────────────────────────────────────────── */
    return (
        <div className={`rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
            {toolbar}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className={`${theme.pageBg} sticky top-0 z-10`}>
                        <tr className={`${theme.textSecondary} text-[11px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                            {checkboxHeader}
                            {columns.map((col, index) => (
                                <th key={index} className={`px-4 py-3 ${col.headerClassName || ''}`} style={col.width ? { width: col.width } : {}}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.borderLight}`}>
                        {isLoading ? (
                            <tr><td colSpan={totalCols} className="p-20 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                    <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>{loadingMessage}</p>
                                </div>
                            </td></tr>
                        ) : data && data.length > 0 ? (
                            data.map((row, rowIndex) => (
                                <React.Fragment key={row[rowKey] || rowIndex}>
                                    <tr onClick={() => onRowClick && onRowClick(row)}
                                        className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''} group ${selectedKeys.has(row[rowKey] ?? rowIndex) ? 'bg-indigo-50/40 dark:bg-indigo-900/10' : ''}`}>
                                        {checkboxCell(row, rowIndex)}
                                        {columns.map((col, colIndex) => (
                                            <td key={colIndex} className={`px-4 py-2.5 ${col.className || ''}`}>
                                                {col.render ? col.render(row[col.key], row, colIndex) : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                    {renderAdditionalRow && renderAdditionalRow(row, totalCols)}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr><td colSpan={totalCols} className={`p-10 text-center font-bold text-sm ${theme.textSecondary}`}>{emptyMessage}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {pagination}
        </div>
    );
};

export default CommonTable;

