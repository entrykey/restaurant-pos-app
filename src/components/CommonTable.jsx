import React from 'react';
import { useTheme } from '../context/ThemeContext';

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
    onPageChange,
    mobileCardRender
}) => {
    const { theme } = useTheme();

    const pagination = totalPages > 1 && onPageChange ? (
        <div className={`flex items-center justify-between p-4 border-t ${theme.borderLight}`}>
            <span className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>
                Page {currentPage} of {totalPages}
            </span>
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
                <div className={`block sm:hidden overflow-hidden rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
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
                    {pagination}
                </div>

                {/* Desktop table — hidden on small screens */}
                <div className={`hidden sm:block overflow-hidden rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
                    <div className="overflow-auto flex-1">
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
        <div className={`overflow-hidden rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
            <div className="overflow-auto flex-1">
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
