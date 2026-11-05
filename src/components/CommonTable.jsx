import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
    ChevronDown,
    Download,
    FileSpreadsheet,
    FileText,
    SlidersHorizontal,
    RotateCcw,
    X,
    Search,
    Eye,
    EyeOff,
    Lock,
    Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { settingService } from '../services/api';

/**
 * CommonTable Component
 * Props:
 *  columns        - column defs: { header, key, render, exportValue, headerClassName, className, width, defaultVisible, required }
 *  availableColumns - optional extra column definitions that can be adjusted/toggled
 *  tableId        - unique identifier for persisting column settings
 *  showAdjust     - whether to display the Adjust button (default: true)
 *  onColumnsChange - callback when visible columns change
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
    columns = [],
    availableColumns = [],
    data = [],
    rowKey = 'id',
    tableId,
    showAdjust = true,
    onColumnsChange,
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

    const app = useApp();
    const currentShopId = app?.currentShopId || null;

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

    // Keep selection valid when data changes, without resetting on re-renders
    useEffect(() => {
        if (!allPagesSelected && selectedKeys.size > 0) {
            const currentKeySet = new Set((data || []).map((r, i) => r[rowKey] ?? i));
            setSelectedKeys(prev => {
                const next = new Set();
                let changed = false;
                prev.forEach(key => {
                    if (currentKeySet.has(key)) {
                        next.add(key);
                    } else {
                        changed = true;
                    }
                });
                if (!changed && next.size === prev.size) return prev;
                return next;
            });
        }
    }, [data, rowKey, allPagesSelected]);

    // Reset selection when changing page or page size
    useEffect(() => {
        if (!allPagesSelected) {
            setSelectedKeys(new Set());
        }
    }, [currentPage, pageSize]);

    const getColKey = useCallback((col, idx) => {
        return col.id || col.key || (typeof col.header === 'string' ? col.header : `col_${idx}`);
    }, []);

    // ── All columns pool (base columns + any extra available columns) ─────────
    const allColumns = useMemo(() => {
        const list = [...(columns || []), ...(availableColumns || [])];
        const seen = new Set();
        return list.filter((col, idx) => {
            const k = getColKey(col, idx);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }, [columns, availableColumns, getColKey]);

    // ── Table identity & strictly isolated storage key ───────────────────────
    const resolvedTableId = useMemo(() => {
        if (tableId && typeof tableId === 'string' && tableId.trim()) {
            return tableId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        }
        if (exportFilename && exportFilename !== 'export' && typeof exportFilename === 'string') {
            return exportFilename.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        }
        if (exportTitle && typeof exportTitle === 'string' && exportTitle.trim()) {
            return exportTitle.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        }
        const firstKey = (columns && columns[0]) ? (columns[0].key || columns[0].id || 'col') : 'col';
        return `tbl_${columns?.length || 0}_${firstKey}`;
    }, [tableId, exportFilename, exportTitle]);

    const storageKey = `filepe_tbl_${currentShopId || 'common'}_${resolvedTableId}`;

    const allColKeys = useMemo(() => allColumns.map((c, idx) => getColKey(c, idx)), [allColumns, getColKey]);
    const allColKeysSig = useMemo(() => allColKeys.join(','), [allColKeys]);

    const defaultVisibleKeys = useMemo(() => {
        return allColumns
            .filter(c => c.defaultVisible !== false)
            .map((c, idx) => getColKey(c, idx));
    }, [allColumns, getColKey]);

    // One-time cleanup of legacy keys that caused cross-table pollution
    useEffect(() => {
        try {
            localStorage.removeItem('table_columns_export');
            localStorage.removeItem('table_columns_default-table');
            localStorage.removeItem('table_columns_undefined');
        } catch (e) {}
    }, []);

    const [visibleKeys, setVisibleKeys] = useState(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const valid = parsed.filter(k => allColKeys.includes(k));
                    if (valid.length > 0) {
                        allColumns.forEach((c, idx) => {
                            if (c.required || (c.key === 'name' && !allColumns.some(col => col.key === 'id'))) {
                                const k = getColKey(c, idx);
                                if (!valid.includes(k)) valid.push(k);
                            }
                        });
                        return valid;
                    }
                }
            }
        } catch (e) {}
        return defaultVisibleKeys;
    });

    const prevSigRef = useRef(allColKeysSig);
    const prevStorageKeyRef = useRef(storageKey);

    useEffect(() => {
        if (prevSigRef.current === allColKeysSig && prevStorageKeyRef.current === storageKey) {
            return;
        }
        prevSigRef.current = allColKeysSig;
        prevStorageKeyRef.current = storageKey;

        let targetKeys = defaultVisibleKeys;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const valid = parsed.filter(k => allColKeys.includes(k));
                    if (valid.length > 0) {
                        allColumns.forEach((c, idx) => {
                            if (c.required || (c.key === 'name' && !allColumns.some(col => col.key === 'id'))) {
                                const k = getColKey(c, idx);
                                if (!valid.includes(k)) valid.push(k);
                            }
                        });
                        targetKeys = valid;
                    }
                }
            }
        } catch (e) {}

        setVisibleKeys(prev => {
            if (prev.length === targetKeys.length && prev.every((k, i) => k === targetKeys[i])) {
                return prev;
            }
            return targetKeys;
        });
    }, [storageKey, allColKeysSig]);

    const persistVisibleKeys = useCallback((newKeys) => {
        setVisibleKeys(newKeys);
        try {
            localStorage.setItem(storageKey, JSON.stringify(newKeys));
        } catch (e) {}
        // Only sync to backend if an explicit tableId is provided
        if (settingService && currentShopId && tableId) {
            settingService.updateSetting(storageKey, { value: newKeys, shopId: currentShopId }).catch(() => {});
        }
        if (onColumnsChange) onColumnsChange(newKeys);
    }, [storageKey, currentShopId, tableId, onColumnsChange]);

    const toggleColumn = useCallback((colKey) => {
        const col = allColumns.find((c, idx) => getColKey(c, idx) === colKey);
        if (col?.required) return;

        if (visibleKeys.includes(colKey)) {
            if (visibleKeys.length <= 1) return;
            const next = visibleKeys.filter(k => k !== colKey);
            persistVisibleKeys(next);
        } else {
            const next = allColumns
                .map((c, idx) => getColKey(c, idx))
                .filter(k => visibleKeys.includes(k) || k === colKey);
            persistVisibleKeys(next);
        }
    }, [allColumns, visibleKeys, getColKey, persistVisibleKeys]);

    const resetToDefault = useCallback(() => {
        persistVisibleKeys(defaultVisibleKeys);
        try {
            localStorage.removeItem(storageKey);
        } catch (e) {}
    }, [defaultVisibleKeys, persistVisibleKeys, storageKey]);

    const showAll = useCallback(() => {
        const all = allColumns.map((c, idx) => getColKey(c, idx));
        persistVisibleKeys(all);
    }, [allColumns, getColKey, persistVisibleKeys]);

    const activeColumns = useMemo(() => {
        const keySet = new Set(visibleKeys);
        const filtered = allColumns.filter((c, idx) => {
            const isReq = c.required || (c.key === 'name' && !allColumns.some(col => col.key === 'id'));
            return isReq || keySet.has(getColKey(c, idx));
        });
        return filtered.length > 0 ? filtered : allColumns.filter(c => c.defaultVisible !== false);
    }, [allColumns, visibleKeys, getColKey]);

    // ── Adjust Dropdown State ────────────────────────────────────────────────
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustSearch, setAdjustSearch] = useState('');
    const adjustRef = useRef(null);

    useEffect(() => {
        if (!adjustOpen) return;
        const h = (e) => {
            if (adjustRef.current && !adjustRef.current.contains(e.target)) {
                setAdjustOpen(false);
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [adjustOpen]);

    const filteredColsForAdjust = useMemo(() => {
        if (!adjustSearch.trim()) return allColumns;
        const q = adjustSearch.toLowerCase();
        return allColumns.filter((col, idx) => {
            const headerStr = typeof col.header === 'string' ? col.header : '';
            const keyStr = String(col.key || '');
            return headerStr.toLowerCase().includes(q) || keyStr.toLowerCase().includes(q);
        });
    }, [allColumns, adjustSearch]);

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
        if (format === 'xlsx') exportToXLSX(activeColumns, exportRows, exportFilename, exportTitle || exportFilename);
        else exportToPDF(activeColumns, exportRows, exportFilename, exportTitle || exportFilename);
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

    // ── Export + Adjust + selection toolbar ──────────────────────────────────
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
                <div className="flex items-center gap-2">
                    {/* Adjust Dropdown */}
                    {showAdjust && allColumns.length > 0 && (
                        <div ref={adjustRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setAdjustOpen(o => !o)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} hover:opacity-80 active:scale-95`}
                                title="Adjust Table Fields"
                            >
                                <SlidersHorizontal size={13} className="text-indigo-500 shrink-0" />
                                <span>Adjust</span>
                                {allColumns.length > activeColumns.length && (
                                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                                        {activeColumns.length}/{allColumns.length}
                                    </span>
                                )}
                                <ChevronDown size={11} className={`transition-transform duration-200 ${adjustOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {adjustOpen && (
                                <div className={`absolute right-0 top-full mt-1.5 z-50 rounded-2xl shadow-2xl border overflow-hidden w-72 sm:w-80 ${theme.surfaceBg} ${theme.borderLight}`}>
                                    {/* Header */}
                                    <div className={`p-3.5 border-b ${theme.borderLight} flex items-center justify-between`}>
                                        <div>
                                            <div className={`text-xs font-black uppercase tracking-wider ${theme.textHeading} flex items-center gap-1.5`}>
                                                <SlidersHorizontal size={13} className="text-indigo-500" />
                                                Adjust Fields
                                            </div>
                                            <div className={`text-[10px] font-medium ${theme.textMuted} mt-0.5`}>
                                                {activeColumns.length} of {allColumns.length} fields visible
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={resetToDefault}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${theme.borderLight} ${theme.textSecondary} hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1`}
                                                title="Reset to default fields"
                                            >
                                                <RotateCcw size={11} />
                                                Reset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setAdjustOpen(false)}
                                                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search if more than 5 columns */}
                                    {allColumns.length > 5 && (
                                        <div className={`px-3 py-2 border-b ${theme.borderLight}`}>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Search fields..."
                                                    value={adjustSearch}
                                                    onChange={(e) => setAdjustSearch(e.target.value)}
                                                    className={`w-full pl-7 pr-3 py-1.5 rounded-xl text-xs font-medium border outline-none ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight} focus:border-indigo-500`}
                                                />
                                                <Search size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                                                {adjustSearch && (
                                                    <button onClick={() => setAdjustSearch("")} className="absolute right-2.5 top-2 text-gray-400">
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Column Checklist */}
                                    <div className="max-h-72 overflow-y-auto p-2 space-y-1">
                                        {filteredColsForAdjust.map((col, idx) => {
                                            const key = getColKey(col, idx);
                                            const isRequired = col.required || (col.key === 'name' && !allColumns.some(c => c.key === 'id'));
                                            const isVisible = isRequired || visibleKeys.includes(key);
                                            const label = typeof col.header === 'string' ? col.header : (col.key || `Field ${idx + 1}`);

                                            return (
                                                <div
                                                    key={key}
                                                    onClick={() => !isRequired && toggleColumn(key)}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                        isVisible
                                                            ? "bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200"
                                                            : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-slate-800 opacity-60`
                                                    } ${isRequired ? "cursor-default opacity-90" : ""}`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isVisible}
                                                            disabled={isRequired}
                                                            onChange={() => {}}
                                                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer pointer-events-none"
                                                        />
                                                        <span className="truncate">{label}</span>
                                                    </div>
                                                    {isRequired ? (
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-0.5">
                                                            <Lock size={10} /> Fixed
                                                        </span>
                                                    ) : isVisible ? (
                                                        <Eye size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                                                    ) : (
                                                        <EyeOff size={13} className="text-gray-400 shrink-0" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Footer */}
                                    <div className={`p-2.5 border-t ${theme.borderLight} bg-gray-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[11px]`}>
                                        <button
                                            type="button"
                                            onClick={showAll}
                                            className="text-indigo-600 dark:text-indigo-400 font-black hover:underline"
                                        >
                                            Show All
                                        </button>
                                        <span className="text-gray-400 font-medium text-[10px]">Saved in settings</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

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
                            <div className={`absolute right-0 top-full mt-1.5 z-50 rounded-2xl shadow-xl border overflow-hidden w-44 ${theme.surfaceBg} ${theme.borderLight}`}>
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

    const totalCols = activeColumns.length + (selectable ? 1 : 0);

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
                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className={`${theme.tableHeaderBg || theme.pageBg} sticky top-0 z-10`}>
                                <tr className={`${theme.tableHeaderText || theme.textMuted} text-[11px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                    {checkboxHeader}
                                    {activeColumns.map((col, i) => (
                                        <th key={col.id || col.key || i} className={`px-4 py-3 ${col.headerClassName || ''}`} style={col.width ? { width: col.width } : {}}>
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
                                                className={`${theme.tableRowHover} transition-colors ${onRowClick ? 'cursor-pointer' : ''} group ${selectedKeys.has(row[rowKey] ?? rowIndex) ? theme.infoBg : ''}`}>
                                                {checkboxCell(row, rowIndex)}
                                                {activeColumns.map((col, colIndex) => (
                                                    <td key={col.id || col.key || colIndex} className={`px-4 py-2.5 ${col.className || ''}`}>
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
            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-max">
                    <thead className={`${theme.tableHeaderBg || theme.pageBg} sticky top-0 z-10`}>
                        <tr className={`${theme.tableHeaderText || theme.textMuted} text-[11px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                            {checkboxHeader}
                            {activeColumns.map((col, index) => (
                                <th key={col.id || col.key || index} className={`px-4 py-3 ${col.headerClassName || ''}`} style={col.width ? { width: col.width } : {}}>
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
                                        className={`${theme.tableRowHover} transition-colors ${onRowClick ? 'cursor-pointer' : ''} group ${selectedKeys.has(row[rowKey] ?? rowIndex) ? theme.infoBg : ''}`}>
                                        {checkboxCell(row, rowIndex)}
                                        {activeColumns.map((col, colIndex) => (
                                            <td key={col.id || col.key || colIndex} className={`px-4 py-2.5 ${col.className || ''}`}>
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
    );
};

export default CommonTable;

