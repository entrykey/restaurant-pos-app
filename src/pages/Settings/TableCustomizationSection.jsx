import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    SlidersHorizontal,
    RotateCcw,
    Trash2,
    Search,
    X,
    Columns3,
    Check,
    AlertCircle,
    Info,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Friendly names dictionary for standard table IDs
const KNOWN_TABLE_NAMES = {
    'SALES-ORDERS-HISTORY': 'Sales Orders History',
    'SALES-ORDERS-ACTIVE': 'Active Sales Orders',
    'SALES-ORDERS-DRAFT': 'Draft Orders',
    'SALES-ORDERS-COMPLETED': 'Completed Orders',
    'SALES-SALE-MARKING-LIST': 'Sale Marking Records',
    'INVENTORY-ITEMS-MENU': 'Inventory Items & Menu',
    'INVENTORY-ITEMS-ALL': 'All Inventory Items',
    'INVENTORY-ITEMS-STOCK': 'Stock Items',
    'INVENTORY-ITEMS-MANUFACTURED': 'Manufactured Items',
    'INVENTORY-ITEMS-TRADE': 'Trade Items',
    'PARTIES-CUSTOMERS-LIST': 'Customers Directory',
    'PARTIES-SUPPLIERS-LIST': 'Suppliers Directory',
    'PURCHASES-INVOICES-LIST': 'Purchase Invoices',
    'PURCHASES-RETURNS-LIST': 'Purchase Returns',
    'STAFF-EMPLOYEES-LIST': 'Staff Employees List',
    'STAFF-ROLES-LIST': 'Staff Roles & Permissions',
    'STAFF-ATTENDANCE-LOGS-LIST': 'Staff Attendance Logs',
    'STAFF-MY-ATTENDANCE-LIST': 'My Attendance',
    'STAFF-MY-LEAVES-LIST': 'My Leaves',
    'STAFF-EMPLOYEE-LEAVES-LIST': 'Employee Leaves',
    'STAFF-ATTENDANCE-POLICIES-LIST': 'Attendance Policies',
    'ADMIN-SHOPS-LIST': 'Shops Management',
    'ADMIN-SUBSCRIPTIONS-LIST': 'Subscription Plans List',
    'ADMIN-PLANS-LIST': 'Plans List',
    'ADMIN-TRIAL-REQUESTS-LIST': 'Trial Requests List',
    'ADMIN-CLIENTS-LIST': 'Clients List',
    'ORGANIZATION-BRANCHES-LIST': 'Organization Branches',
    'PROMOTIONS-OFFERS-LIST': 'Promotions & Offers',
    'OPERATING-EXPENSES-EXPENSES': 'Operating Expenses',
    'SETTINGS-ATTRIBUTES-LIST': 'Inventory Attributes',
    'SETTINGS-CATEGORIES-LIST': 'Inventory Categories',
    'SETTINGS-TAXES-LIST': 'Tax Rates & Rules',
    'SETTINGS-UNITS-LIST': 'Measurement Units',
    'HSN_REPORTS': 'HSN Tax Reports',
};

// Friendly names dictionary for standard column keys
const KNOWN_COL_LABELS = {
    orderNumber: 'Order #',
    customerName: 'Customer Name',
    customerId: 'Customer',
    phone: 'Phone Number',
    total: 'Total',
    grandTotal: 'Grand Total',
    subTotal: 'Subtotal',
    tax: 'Tax',
    status: 'Status',
    createdAt: 'Date Created',
    updatedAt: 'Date Updated',
    actions: 'Actions',
    action: 'Actions',
    items: 'Items',
    itemCount: 'Item Count',
    name: 'Item Name',
    categoryId: 'Category',
    category: 'Category',
    price: 'Price',
    sellingPrice: 'Selling Price',
    costPrice: 'Cost Price',
    stock: 'Current Stock',
    unit: 'Unit',
    sku: 'SKU / Code',
    barcode: 'Barcode',
    role: 'Role',
    email: 'Email',
    shopId: 'Shop',
    branchId: 'Branch',
    _id: 'ID',
    id: 'ID',
    select: 'Select',
    sel: 'Select',
    paymentMethod: 'Payment Method',
    deliveryType: 'Delivery Type',
    tableNumber: 'Table #',
    cashier: 'Cashier / Staff',
    notes: 'Notes / Remarks',
    type: 'Type',
    code: 'Code',
    rate: 'Rate %',
    balance: 'Balance',
    creditLimit: 'Credit Limit',
    invoiceNumber: 'Invoice #',
    supplierName: 'Supplier Name',
};

export const parseColumnList = (val) => {
    if (Array.isArray(val)) return val.map(String).map(s => s.trim()).filter(Boolean);
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed.map(String).map(s => s.trim()).filter(Boolean);
            } catch (e) {}
        }
        return trimmed ? trimmed.split(',').map(s => s.trim()).filter(Boolean) : [];
    }
    return [];
};

export const formatColumnName = (colKey) => {
    if (!colKey) return '';
    if (KNOWN_COL_LABELS[colKey]) return KNOWN_COL_LABELS[colKey];
    return colKey
        .replace(/([A-Z])/g, ' $1')
        .replace(/[-_]+/g, ' ')
        .trim()
        .replace(/\b\w/g, char => char.toUpperCase());
};

export const parseTableInfo = (setting) => {
    const rawKey = setting.key || '';
    const display = setting.displayString || '';

    const isLegacy = rawKey.startsWith('TABLE_COLUMNS') ||
        rawKey.startsWith('TABLE_COLS') ||
        display.startsWith('TABLE COLUMNS') ||
        display.startsWith('TABLE COLS');

    let clean = (display || rawKey).trim();

    // Strip known prefixes
    clean = clean
        .replace(/^FILEPE[_ ]*TBL[_ ]*/i, '')
        .replace(/^TABLE[_ ]*COLS[_ ]*(?:V\d+[_ ]*)?/i, '')
        .replace(/^TABLE[_ ]*COLUMNS[_ ]*/i, '')
        .trim();

    // Strip 24-character hexadecimal ObjectId (e.g. shopId) if present
    clean = clean.replace(/^[a-fA-F0-9]{24}[_ ]*/, '').trim();

    // Normalized table identifier
    const tableId = clean.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

    const friendlyName = KNOWN_TABLE_NAMES[clean.toUpperCase()] ||
        KNOWN_TABLE_NAMES[tableId.toUpperCase()] ||
        clean
            .split(/[-_]+/)
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ') || 'Custom Table';

    return {
        tableId,
        tableName: friendlyName,
        isLegacy,
        rawKey,
        displayString: display
    };
};

export const isTableCustomizationSetting = (setting) => {
    if (!setting) return false;
    const key = (setting.key || '').toUpperCase();
    const display = (setting.displayString || '').toUpperCase();
    return (
        key.startsWith('TABLE_COLUMNS') ||
        key.startsWith('TABLE_COLS') ||
        key.startsWith('FILEPE_TBL') ||
        key.startsWith('FILEPETBL') ||
        display.startsWith('TABLE COLUMNS') ||
        display.startsWith('TABLE COLS') ||
        display.startsWith('FILEPE TBL') ||
        display.startsWith('FILEPETBL')
    );
};

const TableCustomizationSection = ({
    tableSettings = [],
    onDeleteSetting,
    onUpdateSetting,
    currentShopId,
    theme,
    themeName
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeletingKey, setIsDeletingKey] = useState(null);
    const [isResettingAll, setIsResettingAll] = useState(false);

    // Deduplicate and group by tableId: ensure EXACTLY 1 card per table!
    const { uniqueTables, redundantKeys } = useMemo(() => {
        const groups = {};
        const redundant = [];

        tableSettings.forEach(setting => {
            const info = parseTableInfo(setting);
            const columns = parseColumnList(setting.value);
            const item = {
                ...info,
                originalSetting: setting,
                columns
            };

            const tid = info.tableId;
            if (!groups[tid]) {
                groups[tid] = item;
            } else {
                const existing = groups[tid];
                // Priority ranking:
                // Current modern FILEPE_TBL (score 10) > TABLE_COLS (score 5) > TABLE_COLUMNS (score 1)
                const getScore = (it) => {
                    const k = (it.rawKey || '').toUpperCase();
                    if (k.startsWith('FILEPE_TBL') || k.startsWith('FILEPETBL')) return 10;
                    if (k.startsWith('TABLE_COLS')) return 5;
                    return 1;
                };

                const existingScore = getScore(existing);
                const currentScore = getScore(item);

                if (currentScore > existingScore) {
                    redundant.push({ key: existing.rawKey, tableId: tid });
                    groups[tid] = item;
                } else {
                    redundant.push({ key: item.rawKey, tableId: tid });
                }
            }
        });

        return {
            uniqueTables: Object.values(groups),
            redundantKeys: redundant
        };
    }, [tableSettings]);

    const purgedKeysRef = useRef(new Set());

    // Automatically clean up any redundant / stale duplicate keys from the database in the background
    useEffect(() => {
        if (redundantKeys.length > 0 && onDeleteSetting) {
            redundantKeys.forEach(({ key, tableId }) => {
                if (purgedKeysRef.current.has(key)) return;
                purgedKeysRef.current.add(key);
                onDeleteSetting(key, tableId).catch((err) => {
                    console.warn(`Could not auto-purge redundant key ${key}:`, err);
                });
            });
        }
    }, [redundantKeys, onDeleteSetting]);

    // Check for any remaining legacy entries
    const legacyCount = useMemo(() => {
        return uniqueTables.filter(t => t.isLegacy).length;
    }, [uniqueTables]);

    // Filter by search query
    const filteredTables = useMemo(() => {
        if (!searchQuery.trim()) return uniqueTables;
        const q = searchQuery.toLowerCase().trim();
        return uniqueTables.filter(t =>
            t.tableName.toLowerCase().includes(q) ||
            t.tableId.toLowerCase().includes(q) ||
            t.columns.some(col => col.toLowerCase().includes(q) || formatColumnName(col).toLowerCase().includes(q))
        );
    }, [uniqueTables, searchQuery]);

    const handleResetSingleTable = async (table) => {
        const confirmMsg = `Reset column preferences for "${table.tableName}" to default?\n\nThis will remove your customized column view and restore the default visible columns.`;
        if (!window.confirm(confirmMsg)) return;

        setIsDeletingKey(table.rawKey);
        try {
            // 1. Clear from localStorage (all known prefix patterns)
            try {
                if (currentShopId && table.tableId) {
                    localStorage.removeItem(`filepe_tbl_${currentShopId}_${table.tableId}`);
                    localStorage.removeItem(`table_cols_v2_${currentShopId}_${table.tableId}`);
                }
                localStorage.removeItem(`filepe_tbl_common_${table.tableId}`);
                localStorage.removeItem(`table_columns_${table.tableId}`);
                localStorage.removeItem(table.rawKey.toLowerCase());
                localStorage.removeItem(table.rawKey);
            } catch (e) {
                console.error("Failed to clear localStorage:", e);
            }

            // 2. Delete from backend DB: active key AND all legacy/other keys for this tableId
            if (onDeleteSetting) {
                await onDeleteSetting(table.rawKey, table.tableId);
                const otherKeys = tableSettings
                    .filter(s => parseTableInfo(s).tableId === table.tableId && s.key !== table.rawKey)
                    .map(s => s.key);
                for (const k of otherKeys) {
                    await onDeleteSetting(k, table.tableId).catch(() => {});
                }
            }

            toast.success(`Reset columns for "${table.tableName}" to defaults`);
        } catch (error) {
            console.error("Failed to reset table columns:", error);
            toast.error("Failed to reset table columns");
        } finally {
            setIsDeletingKey(null);
        }
    };

    const handleRemoveColumn = async (table, colToRemove) => {
        const nextCols = table.columns.filter(c => c !== colToRemove);
        if (nextCols.length === 0) {
            toast.error("Table must have at least one visible column.");
            return;
        }

        try {
            // Update setting in state and backend
            if (onUpdateSetting) {
                await onUpdateSetting(table.rawKey, nextCols, table.originalSetting);
            }

            // Sync to localStorage
            try {
                const storageKey = `filepe_tbl_${currentShopId || 'common'}_${table.tableId}`;
                localStorage.setItem(storageKey, JSON.stringify(nextCols));
            } catch (e) {}

            toast.success(`Removed "${formatColumnName(colToRemove)}" from ${table.tableName}`);
        } catch (error) {
            console.error("Failed to update column:", error);
            toast.error("Failed to remove column");
        }
    };

    const handleResetAllTables = async () => {
        const confirmMsg = `Are you sure you want to reset ALL ${uniqueTables.length} table column customizations?\n\nEvery table will revert back to its factory default columns.`;
        if (!window.confirm(confirmMsg)) return;

        setIsResettingAll(true);
        try {
            for (const table of uniqueTables) {
                try {
                    if (currentShopId && table.tableId) {
                        localStorage.removeItem(`filepe_tbl_${currentShopId}_${table.tableId}`);
                        localStorage.removeItem(`table_cols_v2_${currentShopId}_${table.tableId}`);
                    }
                    localStorage.removeItem(`filepe_tbl_common_${table.tableId}`);
                    localStorage.removeItem(`table_columns_${table.tableId}`);
                    localStorage.removeItem(table.rawKey.toLowerCase());
                    localStorage.removeItem(table.rawKey);
                } catch (e) {}

                if (onDeleteSetting) {
                    await onDeleteSetting(table.rawKey, table.tableId);
                }
            }
            toast.success("All table column customizations have been reset to default!");
        } catch (error) {
            console.error("Failed to reset all tables:", error);
            toast.error("Error resetting some table customizations");
        } finally {
            setIsResettingAll(false);
        }
    };

    const handleCleanLegacyKeys = async () => {
        const legacyTables = uniqueTables.filter(t => t.isLegacy);
        if (legacyTables.length === 0) return;

        if (!window.confirm(`Clean up ${legacyTables.length} older legacy column configuration(s)?\n\nActive views will not be lost if newer configurations exist.`)) return;

        try {
            for (const t of legacyTables) {
                if (onDeleteSetting) {
                    await onDeleteSetting(t.rawKey, t.tableId);
                }
            }
            toast.success(`Cleaned up ${legacyTables.length} legacy table configuration(s)`);
        } catch (error) {
            console.error("Failed to clean legacy keys:", error);
            toast.error("Failed to clean up legacy keys");
        }
    };

    return (
        <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            <SlidersHorizontal size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h3 className={`text-xl font-black ${theme.textHeading}`}>
                                    Table Customisation
                                </h3>
                                <span className="px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-black">
                                    {uniqueTables.length} {uniqueTables.length === 1 ? 'Table' : 'Tables'} Customized
                                </span>
                                {legacyCount > 0 && (
                                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                                        <AlertCircle size={12} /> {legacyCount} Legacy
                                    </span>
                                )}
                            </div>
                            <p className={`text-xs ${theme.textSecondary} mt-1 max-w-2xl`}>
                                Manage your saved column views and visibility preferences for tables across FilePe (Orders History, Inventory, Customers, etc.).
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {legacyCount > 0 && (
                        <button
                            type="button"
                            onClick={handleCleanLegacyKeys}
                            className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            title="Remove older duplicate configuration keys"
                        >
                            <Trash2 size={14} /> Clean Legacy ({legacyCount})
                        </button>
                    )}

                    {uniqueTables.length > 0 && (
                        <button
                            type="button"
                            onClick={handleResetAllTables}
                            disabled={isResettingAll}
                            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                            <RotateCcw size={14} className={isResettingAll ? 'animate-spin' : ''} />
                            {isResettingAll ? 'Resetting All...' : 'Reset All to Defaults'}
                        </button>
                    )}
                </div>
            </div>

            {/* Search & Overview bar */}
            {uniqueTables.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.textSecondary}`} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter customized tables or columns..."
                            className={`w-full pl-10 pr-4 py-2.5 text-xs font-bold rounded-2xl border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} outline-none ${theme.inputFocus}`}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 ${theme.textSecondary} hover:${theme.textPrimary}`}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className={`text-xs ${theme.textSecondary} font-semibold flex items-center gap-1.5`}>
                        <Info size={14} className="text-indigo-500 shrink-0" />
                        <span>Changes made with table <b>Adjust</b> buttons sync automatically here.</span>
                    </div>
                </div>
            )}

            {/* Table Cards Grid */}
            {filteredTables.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {filteredTables.map((table) => {
                        const isDeletingThis = isDeletingKey === table.rawKey;

                        return (
                            <div
                                key={table.rawKey}
                                className={`p-5 rounded-3xl border transition-all duration-300 ${
                                    themeName === 'dark'
                                        ? 'bg-slate-800/40 border-slate-700/60 hover:border-indigo-500/50'
                                        : 'bg-slate-50/70 border-slate-200/80 hover:border-indigo-300'
                                } flex flex-col justify-between gap-4 shadow-sm hover:shadow-md`}
                            >
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="p-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                                <Columns3 size={16} />
                                            </div>
                                            <h4 className={`text-base font-black ${theme.textHeading}`}>
                                                {table.tableName}
                                            </h4>
                                            {table.isLegacy && (
                                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 text-[10px] font-bold">
                                                    Legacy Key
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                                            <span>Identifier: <code className="px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-mono text-[10px]">{table.tableId}</code></span>
                                            <span>•</span>
                                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                                {table.columns.length} columns active
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Action: Reset to default */}
                                    <button
                                        type="button"
                                        onClick={() => handleResetSingleTable(table)}
                                        disabled={isDeletingThis}
                                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-xs disabled:opacity-50"
                                        title="Restore default columns for this table"
                                    >
                                        <RotateCcw size={13} className={isDeletingThis ? 'animate-spin' : ''} />
                                        <span>{isDeletingThis ? 'Resetting...' : 'Reset to Default'}</span>
                                    </button>
                                </div>

                                {/* Columns Badges List */}
                                <div className="space-y-2 pt-2 border-t border-gray-200/60 dark:border-slate-700/60">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-gray-400">
                                        <span>Visible Table Columns</span>
                                        <span className="normal-case text-gray-400 text-[10px]">Click × on any column to hide</span>
                                    </div>

                                    {table.columns.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                                            {table.columns.map((colKey) => (
                                                <div
                                                    key={colKey}
                                                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs hover:border-indigo-400 transition-all"
                                                >
                                                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                    <span>{formatColumnName(colKey)}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                                                        ({colKey})
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveColumn(table, colKey)}
                                                        className="text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-0.5 rounded-md transition-colors ml-0.5"
                                                        title={`Hide ${formatColumnName(colKey)}`}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-xs italic text-gray-400 py-2">
                                            No columns currently visible.
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer tip */}
                                <div className="pt-2 border-t border-dashed border-gray-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <Sparkles size={12} className="text-amber-500" />
                                        <span>Use the table's <b>Adjust</b> menu to add or reorder columns</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400 truncate max-w-[150px]" title={table.rawKey}>
                                        {table.rawKey}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Empty State */
                <div className={`py-14 text-center border-2 border-dashed rounded-3xl ${theme.inputBorder} p-6 space-y-3`}>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center mx-auto">
                        <Columns3 size={24} />
                    </div>
                    {searchQuery ? (
                        <>
                            <h4 className={`text-base font-bold ${theme.textHeading}`}>No tables matching "{searchQuery}"</h4>
                            <p className={`text-xs ${theme.textSecondary}`}>
                                Try searching with a different table name or column name.
                            </p>
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                            >
                                Clear Search
                            </button>
                        </>
                    ) : (
                        <>
                            <h4 className={`text-base font-bold ${theme.textHeading}`}>No Table Customizations Saved</h4>
                            <p className={`text-xs ${theme.textSecondary} max-w-md mx-auto`}>
                                All tables across FilePe are currently showing their default column layouts. When you click <b>Adjust</b> on any table (like Sales Orders, Inventory, or Parties) and choose custom columns, your saved views will appear here.
                            </p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default TableCustomizationSection;
