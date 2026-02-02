import React from 'react';

/**
 * CommonTable Component
 * @param {Array} columns - Array of column definitions: { header: string, key: string, render: func, headerClassName: string, className: string, width: string }
 * @param {Array} data - Array of data objects
 * @param {string} rowKey - Unique key for each row (default: 'id')
 * @param {func} onRowClick - Callback function on row click
 * @param {string} className - Additional classes for the container
 */
const CommonTable = ({ columns, data, rowKey = 'id', onRowClick, className = '' }) => {
    return (
        <div className={`bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50">
                        <tr className="text-gray-400 text-[10px] uppercase font-black border-b tracking-widest">
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    className={`p-6 ${col.headerClassName || ''}`}
                                    style={col.width ? { width: col.width } : {}}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr
                                key={row[rowKey] || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`border-b last:border-0 hover:bg-indigo-50/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                            >
                                {columns.map((col, colIndex) => (
                                    <td
                                        key={colIndex}
                                        className={`p-6 ${col.className || ''}`}
                                    >
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={columns.length} className="p-10 text-center text-gray-400 font-bold">
                                    No records found
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
