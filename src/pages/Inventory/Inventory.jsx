import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Globe, Layers, Wheat } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import { getCommonFieldKeys } from '../../config/itemFields';
import { ROUTE_ACCESS } from '../../config/permissionStructure';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useText } from '../../context/TextContext';
import { itemService, inventoryService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Inventory = ({
    menu,
    setMenu,
    inventoryItems,
    setInventoryItems,
    formatCurrency,
    settings,
    hasPermissionFor,
}) => {
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const { theme } = useTheme();
    const { t } = useText();
    const isAdmin = user?.role === 'Admin';

    const canViewItems = hasPermissionFor?.("inventory", "inventory", "view");
    const canManageItems = hasPermissionFor?.("inventory", "inventory", "edit") || hasPermissionFor?.("inventory", "inventory", "create");

    const canViewMenu = hasPermissionFor?.("inventory", "menu", "view");
    const canManageMenu = hasPermissionFor?.("inventory", "menu", "edit") || hasPermissionFor?.("inventory", "menu", "create");

    // Default to the first allowed tab
    const [activeTab, setActiveTab] = useState(canViewMenu ? "menu" : (canViewItems ? "raw" : "menu"));

    const [inventorySearch, setInventorySearch] = useState("");
    const [loadingItemId, setLoadingItemId] = useState(null); // while fetching item by id for edit
    const [visibleFields, setVisibleFields] = useState([]);
    const navigate = useNavigate();

    // --- Pagination & Data State ---
    const [localItems, setLocalItems] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingItems, setLoadingItems] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [stockMap, setStockMap] = useState({}); // itemId -> quantityOnHand

    // Reset page to 1 on tab or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, inventorySearch]);

    // Fetch Items when Dependencies Change
    useEffect(() => {
        const fetchPaginatedItems = async () => {
            if (!user?.shop_id) return;
            setLoadingItems(true);
            try {
                const isMenu = activeTab === "menu";
                const payload = {
                    page: currentPage,
                    limit: 10, // Items per page
                    search: inventorySearch,
                    filters: {
                        shopid: user.shop_id,
                        branchId: activeBranchId || (user.branchIds?.length ? user.branchIds[0] : null),
                        itemType: isMenu ? "MANUFACTURED" : undefined, // Menu tab ONLY shows manufactured
                    }
                };

                const response = await itemService.getItems(payload);
                if (response && response.data) {
                    // Filter out MANUFACTURED from the raw/inventory tab if needed, but let's enforce it here
                    let finalData = response.data;
                    if (!isMenu) {
                        // Raw Items tab should not show manufactured items
                        finalData = response.data.filter(item => item.itemType !== "MANUFACTURED");
                    }

                    setLocalItems(finalData.map(item => ({ ...item, id: item._id })));
                    if (response.pagination) {
                        setTotalPages(response.pagination.totalPages || 1);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch paginated items:", error);
            } finally {
                setLoadingItems(false);
            }
        };

        fetchPaginatedItems();
    }, [activeTab, inventorySearch, currentPage, activeBranchId, user?.shop_id, user?.branchIds, refreshTrigger]);

    // Fetch stock levels whenever branchId or items change
    useEffect(() => {
        const branchId = activeBranchId || (user?.branchIds?.length ? user.branchIds[0] : null);
        if (!branchId) return;
        inventoryService.getInventory({ branchId })
            .then(data => {
                const records = Array.isArray(data) ? data : (data.data || []);
                const map = {};
                records.forEach(r => {
                    const id = r.itemId?._id || r.itemId;
                    if (id) map[id] = r.quantityOnHand ?? 0;
                });
                setStockMap(map);
            })
            .catch(() => { });
    }, [activeBranchId, user?.branchIds, refreshTrigger]);

    // Define field sets for each mode
    const MENU_FIELD_KEYS = [
        "item_code", "name", "description", "category_id",
        "unit_id", "selling_price", "tax_id", "hsn_sac_code", "stock_applicable",
        "min_stock_alert", "status"
    ];

    // Supplier is per purchase (purchase.model), not per item — same product can have different suppliers per purchase
    const RAW_FIELD_KEYS = [
        "item_code", "name", "description", "category_id",
        "unit_id", "purchase_price", "selling_price",
        "stock_applicable", "min_stock_alert", "weight_based", "status"
    ];

    useEffect(() => {
        if (activeTab === "menu") {
            setVisibleFields(MENU_FIELD_KEYS);
        } else {
            setVisibleFields(RAW_FIELD_KEYS);
        }
    }, [activeTab]);

    // Listener for settings updates (optional, keeping for compatibility if Settings page updates fields)
    useEffect(() => {
        const handleUpdates = () => {
            // If settings update "visibleInventoryFields", we might want to respect that *within* the context of the tab
            // For now, ignoring to ensure the strict split user requested.
        };
        window.addEventListener('inventoryFieldsUpdated', handleUpdates);
        return () => window.removeEventListener('inventoryFieldsUpdated', handleUpdates);
    }, []);

    // filteredData is now simply the paginated local items
    const filteredData = localItems;

    const inventoryAccess = ROUTE_ACCESS.INVENTORY; // Assuming this points to module 'inventory'
    const menuAccess = ROUTE_ACCESS.MENU || { module: "inventory", resource: "menu" };

    const canView = activeTab === "menu" ? canViewMenu : canViewItems;
    const canManage = activeTab === "menu" ? canManageMenu : canManageItems;

    if (!canView) {
        return (
            <div className={`h-full flex items-center justify-center ${theme.pageBg}`}>
                <div className={`text-center p-12 rounded-[40px] shadow-xl border max-w-md ${theme.surfaceBg} ${theme.borderLight}`}>
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package size={40} />
                    </div>
                    <h2 className={`text-2xl font-black mb-2 ${theme.textHeading}`}>Access Restricted</h2>
                    <p className={`font-medium ${theme.textMuted}`}>You don&apos;t have permission to view Inventory.</p>
                </div>
            </div>
        );
    }

    const handleOpenAddModal = () => {
        navigate(`/inventory/new?tab=${activeTab}`);
    };

    const handleEditItem = async (item) => {
        const itemId = item._id || item.id || item.itemId;
        if (!itemId) {
            console.error("Edit clicked for row without a valid id");
            return;
        }
        navigate(`/inventory/edit/${itemId}?tab=${activeTab}`);
    };

    // --- Columns Definition ---

    // 1. Menu Columns (Existing)
    const menuColumns = [
        {
            header: "Item Details",
            key: "name",
            render: (value, item) => (
                <>
                    <div className={`font-black text-lg ${theme.textHeading}`}>{value}</div>
                    <div className={`text-xs font-bold ${theme.textSecondary}`}>Code: {item.itemCode || item.id}</div>
                    {item.ingredients && item.ingredients.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                            {item.ingredients.map((ing, i) => (
                                <span key={i} className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">
                                    {ing.name}
                                </span>
                            ))}
                        </div>
                    )}
                </>
            )
        },
        {
            header: "Category",
            key: "categoryId",
            render: (value, item) => (
                <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                    {item.categoryId?.name || value?.name || "Uncategorized"}
                </span>
            )
        },
        {
            header: "Price",
            key: "sellingPrice",
            headerClassName: "text-center",
            className: "text-center",
            render: (_, item) => (
                <div className={`font-black ${theme.textHeading}`}>{formatCurrency(item.sellingPrice || item.pricing?.sellingPrice || 0)}</div>
            )
        },
        {
            header: "Online Status",
            key: "isAvailableOnline",
            headerClassName: "text-center",
            className: "text-center",
            render: (value, item) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenu(
                            menu.map((m) =>
                                m.id === item.id ? { ...m, isAvailableOnline: !m.isAvailableOnline } : m
                            )
                        )
                    }}
                    className={`group relative p-3 rounded-2xl transition-all ${value
                        ? "bg-green-100 text-green-600 hover:bg-green-200"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                        }`}
                    title={value ? "Available Online" : "Hidden from Online"}
                >
                    <Globe size={20} />
                    {value && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                </button>
            )
        }
    ];

    // 2. Items Columns (Formerly Raw Items)
    const rawColumns = [
        {
            header: "Item Name",
            key: "name",
            render: (value, item) => (
                <>
                    <div className={`font-black text-lg ${theme.textHeading}`}>{value}</div>
                    <div className={`text-xs font-bold ${theme.textSecondary}`}>Code: {item.itemCode || item.id}</div>
                </>
            )
        },
        {
            header: "Category",
            key: "categoryId",
            render: (value, item) => (
                <span className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                    {item.categoryId?.name || value?.name || "Uncategorized"}
                </span>
            )
        },
        {
            header: "Stock",
            key: "_id",
            headerClassName: "text-center",
            className: "text-center",
            render: (id, item) => {
                const qty = stockMap[id] ?? stockMap[item._id] ?? null;
                const min = item.stockSettings?.minStockAlert ?? item.minStockAlert ?? 0;
                const low = qty !== null && qty <= min && min > 0;
                if (qty === null) {
                    return <span className="text-[11px] text-gray-300 font-bold">—</span>;
                }
                return (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${low
                        ? "bg-red-50 text-red-600 border-red-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                        {low && <span title="Low stock">⚠️</span>}
                        {qty}
                        <span className="font-medium text-[10px] opacity-60">{item.unitId?.name || ""}</span>
                    </div>
                );
            }
        },
        {
            header: "Cost / Unit",
            key: "costPerUnit",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, item) => (
                <div className={`font-medium ${theme.textPrimary}`}>{formatCurrency(item.pricing?.purchasePrice || item.costPerUnit || 0)}</div>
            )
        }
    ];

    const currentColumns = activeTab === "menu" ? menuColumns : rawColumns;

    if (canManage) {
        currentColumns.push({
            header: "Actions",
            key: "actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, item) => (
                <div className="flex justify-end gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}
                        disabled={loadingItemId === (item._id || item.id)}
                        className={`p-3 ${theme.inputBg} ${theme.primaryIconText} hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-wait`}
                    >
                        {loadingItemId === (item._id || item.id) ? (
                            <span className="inline-block w-[18px] h-[18px] border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Edit3 size={18} />
                        )}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (activeTab === "menu") {
                                setMenu(menu.filter((m) => m.id !== item.id));
                            } else {
                                setInventoryItems(inventoryItems.filter((i) => i.id !== item.id));
                            }
                        }}
                        className={`p-3 ${theme.inputBg} text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95`}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )
        });
    }

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto ${theme.pageBg}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    {/* Header with Icon */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 text-white rounded-2xl shadow-lg ${activeTab === "menu" ? "bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20" : "bg-orange-500 shadow-orange-100 dark:shadow-orange-900/20"}`}>
                            {activeTab === "menu" ? <Package size={28} /> : <Wheat size={28} />}
                        </div>
                        <h2 className={`text-2xl md:text-4xl font-black tracking-tight ${theme.textHeading}`}>
                            {activeTab === "menu" ? t('INVENTORY', 'menu_heading', 'Menu Items') : t('INVENTORY', 'items_heading', 'Items')}
                        </h2>
                    </div>
                    <p className={`font-bold ml-1 ${theme.textMuted}`}>
                        {activeTab === "menu" ? "Manage sales items & recipes" : "Manage inventory items & stock"}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                        <input
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder={activeTab === "menu" ? "Search menu..." : "Search items..."}
                            className={`w-full pl-12 pr-4 py-4 border-2 border-transparent rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium ${theme.surfaceBg} ${theme.textPrimary}`}
                        />
                    </div>
                    {canManage && (
                        <button
                            onClick={handleOpenAddModal}
                            className={`px-8 py-4 rounded-2xl font-black shadow-xl text-white transition-all flex items-center justify-center gap-2
                                ${activeTab === "menu" ? "bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700" : "bg-orange-500 shadow-orange-200 dark:shadow-orange-900/20 hover:bg-orange-600"}
                            `}
                        >
                            <Plus size={20} /> Add {activeTab === "menu" ? t('INVENTORY', 'add_menu_btn', 'Menu Item') : t('INVENTORY', 'add_item_btn', 'Item')}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs - Only show if user has access to BOTH */}
            {canViewMenu && canViewItems && (
                <div className={`flex gap-4 mb-8 p-2 rounded-2xl shadow-sm w-fit ${theme.surfaceBg}`}>
                    <button
                        onClick={() => setActiveTab("menu")}
                        className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "menu"
                            ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                            : `${theme.textSecondary} hover:opacity-80`
                            }`}
                    >
                        <Layers size={18} /> {t('INVENTORY', 'menu_items_tab', 'Menu Items')}
                    </button>
                    <button
                        onClick={() => setActiveTab("raw")}
                        className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "raw"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                            : `${theme.textSecondary} hover:opacity-80`
                            }`}
                    >
                        <Wheat size={18} /> {t('INVENTORY', 'items_tab', 'Items')}
                    </button>
                </div>
            )}

            <CommonTable
                columns={currentColumns}
                data={filteredData}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className={`flex items-center justify-between mt-6 p-4 rounded-2xl shadow-sm border ${theme.surfaceBg} ${theme.borderLight}`}>
                    <span className={`text-sm font-bold ${theme.textMuted}`}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1 || loadingItems}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={`px-4 py-2 font-bold text-sm rounded-xl disabled:opacity-50 transition-all ${theme.textPrimary} ${theme.inputBg} hover:opacity-80`}
                        >
                            Previous
                        </button>
                        <button
                            disabled={currentPage === totalPages || loadingItems}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={`px-4 py-2 font-bold text-sm rounded-xl disabled:opacity-50 transition-all ${theme.textPrimary} ${theme.inputBg} hover:opacity-80`}
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Inventory;
