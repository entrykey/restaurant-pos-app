import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * CommonTable Component
 * @param {Array} columns - Array of column definitions: { header: string, key: string, render: func, headerClassName: string, className: string, width: string }
 * @param {Array} data - Array of data objects
 * @param {string} rowKey - Unique key for each row (default: 'id')
 * @param {func} onRowClick - Callback function on row click
 * @param {string} className - Additional classes for the container
 */
const CommonTable = ({
    columns,
    data,
    rowKey = 'id',
    onRowClick,
    className = '',
    isLoading = false,
    loadingMessage = "Loading...",
    emptyMessage = "No records found."
}) => {
    const { theme } = useTheme();

    return (
        <div className={`overflow-hidden rounded-[24px] shadow-sm border ${theme.surfaceBg} ${theme.borderLight} ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className={theme.pageBg}>
                        <tr className={`${theme.textSecondary} text-[11px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`p-4 ${col.headerClassName || ''}`}
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
                                <tr
                                    key={row[rowKey] || rowIndex}
                                    onClick={() => onRowClick && onRowClick(row)}
                                    className={`hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors ${onRowClick ? 'cursor-pointer' : ''} group`}
                                >
                                    {columns.map((col, colIndex) => (
                                        <td
                                            key={colIndex}
                                            className={`p-4 ${col.className || ''}`}
                                        >
                                            {col.render ? col.render(row[col.key], row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
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
        </div>
    );
};

export default CommonTable;
