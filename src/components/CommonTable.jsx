import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ChevronDown } from 'lucide-react';

/**
 * CommonTable Component
 * @param {Array} columns - Array of column definitions: { header: string, key: string, render: func, headerClassName: string, className: string, width: string }
 * @param {Array} data - Array of data objects
 * @param {string} rowKey - Unique key for each row (default: 'id')
 * @param {func} onRowClick - Callback function on row click
 * @param {string} className - Additional classes for the container
 * @param {func} mobileCardRender - Optional: (row) => JSX — renders a custom mobile card per row
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
    mobileCardRender
}) => {
    const { theme } = useTheme();

    const PAGE_SIZE_OPTIONS = [10, 25, 50, 75, 100];
    const [pageSizeOpen, setPageSizeOpen] = useState(false);
    const pageSizeRef = useRef(null);

    // Close dropdown on outside click
    useEffect(() => {
        if (!pageSizeOpen) return;
        const handler = (e) => {
            if (pageSizeRef.current && !pageSizeRef.current.contains(e.target)) {
                setPageSizeOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [pageSizeOpen]);

    const pagination = totalPages >= 1 && onPageChange ? (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t ${theme.borderLight}`}>
            {/* Left: page size selector + count */}
            <div className="flex items-center gap-3">
                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>Show</span>
                        {/* Custom page size dropdown */}
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
                                            className={`w-full px-4 py-2 text-[12px] font-black text-left transition-all
                                                ${size === pageSize
                                                    ? 'bg-indigo-500 text-white'
                                                    : `${theme.textPrimary} hover:bg-indigo-500/10`
                                                }`}
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
            {/* Right: prev / next */}
            <div className="flex gap-2">
                <button
                    disabled={currentPage === 1 || isLoading}
                    onClick={() => onPageChange(currentPage - 1)}
                    className={`px-4 py-2 font-black text-[11px] uppercase tracking-widest rounded-xl disabled:opacity-30 transition-all ${theme.textPrimary} ${theme.pageBg} hover:opacity-80 active:scale-95 shadow-sm border ${theme.borderLight}`}
                >
                    Previous
                </button>
                <button
                    disabled={currentPage === totalPages || isLoading}
                    onClick={() => onPageChange(currentPage + 1)}
                    className={`px-4 py-2 font-black text-[11px] uppercase tracking-widest rounded-xl disabled:opacity-30 transition-all ${theme.textPrimary} ${theme.pageBg} hover:opacity-80 active:scale-95 shadow-sm border ${theme.borderLight}`}
                >
                    Next
                </button>
            </div>
        </div>
    ) : null;

    /* ── Mobile card view (shown only on small screens when mobileCardRender is provided) ── */
    if (mobileCardRender) {
        return (
            <>
                {/* Mobile cards — visible only on small screens */}
                <div className={`block sm:hidden ${className}`}>
                    <div className={`rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight}`}>
                        {isLoading ? (
                            <div className="p-10 flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>{loadingMessage}</p>
                            </div>
                        ) : data && data.length > 0 ? (
                            <div className={`divide-y ${theme.borderLight}`}>
                                {data.map((row, rowIndex) => (
                                    <div
                                        key={row[rowKey] || rowIndex}
                                        onClick={() => onRowClick && onRowClick(row)}
                                        className={`${onRowClick ? 'cursor-pointer' : ''}`}
                                    >
                                        {mobileCardRender(row)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`p-10 text-center font-bold text-sm ${theme.textSecondary}`}>
                                {emptyMessage}
                            </div>
                        )}
                    </div>

                    {/* Pagination sits outside the card box so it's never clipped */}
                    {pagination && (
                        <div className={`mt-3 rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} overflow-hidden`}>
                            {pagination}
                        </div>
                    )}

                    {/* Bottom spacer so the pagination clears any fixed bottom nav */}
                    <div className="pb-24" />
                </div>

                {/* Desktop table — hidden on small screens */}
                <div className={`hidden sm:block rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className={`${theme.pageBg} sticky top-0 z-10`}>
                                <tr className={`${theme.textSecondary} text-[11px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                    {columns.map((col, index) => (
                                        <th key={index} className={`px-4 py-3 ${col.headerClassName || ''}`} style={col.width ? { width: col.width } : {}}>
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${theme.borderLight}`}>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={columns.length} className="p-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                                <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>{loadingMessage}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : data && data.length > 0 ? (
                                    data.map((row, rowIndex) => (
                                        <React.Fragment key={row[rowKey] || rowIndex}>
                                            <tr
                                                onClick={() => onRowClick && onRowClick(row)}
                                                className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''} group`}
                                            >
                                                {columns.map((col, colIndex) => (
                                                    <td key={colIndex} className={`px-4 py-2.5 ${col.className || ''}`}>
                                                        {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                                                    </td>
                                                ))}
                                            </tr>
                                            {renderAdditionalRow && renderAdditionalRow(row)}
                                        </React.Fragment>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={columns.length} className={`p-10 text-center font-bold text-sm ${theme.textSecondary}`}>
                                            {emptyMessage}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {pagination}
                </div>
            </>
        );
    }

    /* ── Default table view (no mobileCardRender provided) ── */
    return (
        <div className={`rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className={`${theme.pageBg} sticky top-0 z-10`}>
                        <tr className={`${theme.textSecondary} text-[11px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`px-4 py-3 ${col.headerClassName || ''}`}
                                    style={col.width ? { width: col.width } : {}}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${theme.borderLight}`}>
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length} className="p-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                                        <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>{loadingMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : data && data.length > 0 ? (
                            data.map((row, rowIndex) => (
                                <React.Fragment key={row[rowKey] || rowIndex}>
                                    <tr
                                        onClick={() => onRowClick && onRowClick(row)}
                                        className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''} group`}
                                    >
                                        {columns.map((col, colIndex) => (
                                            <td
                                                key={colIndex}
                                                className={`px-4 py-2.5 ${col.className || ''}`}
                                            >
                                                {col.render ? col.render(row[col.key], row, rowIndex) : row[col.key]}
                                            </td>
                                        ))}
                                    </tr>
                                    {renderAdditionalRow && renderAdditionalRow(row)}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className={`p-10 text-center font-bold text-sm ${theme.textSecondary}`}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {pagination}
        </div>
    );
};

export default CommonTable;
