import React, { useState, useEffect } from 'react';
import { Upload, Package, Search, Plus, Edit3, Trash2, Globe, Layers, Boxes, Loader2, X } from 'lucide-react';
import { BUSINESS_FEATURES } from '../../config/businessTypes';
import CommonTable from '../../components/CommonTable';
import { getCommonFieldKeys } from '../../config/itemFields';
import { ROUTE_ACCESS } from '../../config/permissionStructure';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useText } from '../../context/TextContext';
import { itemService, inventoryService } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import ProductPage from './ProductPage';
import Modal from '../../components/ui/Modal';
import CommonSelect from '../../components/ui/CommonSelect';
import BulkUploadModal from '../../components/modals/BulkUploadModal';
import StockAdjustmentModal from '../../components/modals/StockAdjustmentModal';

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
    const { activeBranchId, currentShopId, businessTypeData, businessType } = useApp();
    const { theme } = useTheme();
    const { t } = useText();
    const isAdmin = user?.role === 'Admin';

    const features = businessTypeData?.features || BUSINESS_FEATURES[businessType] || { 
        sellManufacturedItems: true, 
        sellStockItems: true, 
        sellTradeItems: true 
    };

    const canViewItems = hasPermissionFor?.("inventory", "inventory", "view");
    const canManageItems = (hasPermissionFor?.("inventory", "inventory", "edit") || hasPermissionFor?.("inventory", "inventory", "create"));

    const canViewTradeItems = hasPermissionFor?.("inventory", "tradeitem", "view");
    const canManageTradeItems = (hasPermissionFor?.("inventory", "tradeitem", "edit") || hasPermissionFor?.("inventory", "tradeitem", "create"));

    const canViewMenu = hasPermissionFor?.("inventory", "menu", "view");
    const canManageMenu = (hasPermissionFor?.("inventory", "menu", "edit") || hasPermissionFor?.("inventory", "menu", "create"));

    // Default to the first allowed tab
    const [activeTab, setActiveTab] = useState(() => {
        if (canViewMenu) return "menu";
        if (canViewItems) return "raw";
        if (canViewTradeItems) return "trade";
        return "menu"; // Fallback
    });

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
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const [usedCategories, setUsedCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    // Stock Adjustment State
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [selectedAdjustmentItem, setSelectedAdjustmentItem] = useState(null);

    // Reset page to 1 on tab, search or category change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, inventorySearch, selectedCategory]);

    // Ensure activeTab is valid if features change
    useEffect(() => {
        if (activeTab === "menu" && !canViewMenu) {
            if (canViewItems) setActiveTab("raw");
            else if (canViewTradeItems) setActiveTab("trade");
        } else if (activeTab === "raw" && !canViewItems) {
            if (canViewMenu) setActiveTab("menu");
            else if (canViewTradeItems) setActiveTab("trade");
        } else if (activeTab === "trade" && !canViewTradeItems) {
            if (canViewMenu) setActiveTab("menu");
            else if (canViewItems) setActiveTab("raw");
        }
    }, [canViewMenu, canViewItems, canViewTradeItems, activeTab]);

    // Fetch Used Categories for the current tab
    useEffect(() => {
        const fetchCategories = async () => {
            if (!currentShopId) return;
            try {
                const params = {
                    shopId: currentShopId,
                    branchId: activeBranchId || (user.branchIds?.length ? user.branchIds[0] : null),
                    itemType: activeTab === "menu" ? "MANUFACTURED" : (activeTab === "raw" ? "STOCK" : "TRADE"),
                };
                const categories = await itemService.getUsedCategories(params);
                setUsedCategories(categories || []);
                setSelectedCategory("ALL"); // Reset filter when tab changes
            } catch (err) {
                console.error("Failed to fetch used categories:", err);
            }
        };
        fetchCategories();
    }, [activeTab, activeBranchId, currentShopId, user?.branchIds]);

    // Fetch Items when Dependencies Change
    useEffect(() => {
        const fetchPaginatedItems = async () => {
            if (!currentShopId) return;
            setLoadingItems(true);
            try {
                const isMenu = activeTab === "menu";
                const payload = {
                    page: currentPage,
                    limit: 5, // Items per page (as requested)
                    search: inventorySearch,
                    filters: {
                        shopId: currentShopId,
                        branchId: activeBranchId || (user.branchIds?.length ? user.branchIds[0] : null),
                        itemType: activeTab === "menu" ? "MANUFACTURED" : (activeTab === "raw" ? "STOCK" : "TRADE"),
                        categoryId: selectedCategory === "ALL" ? undefined : selectedCategory
                    }
                };

                const response = await itemService.getItems(payload);
                if (response && response.data) {
                    setLocalItems(response.data.map(item => ({ ...item, id: item._id })));
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
    }, [activeTab, inventorySearch, currentPage, activeBranchId, currentShopId, user?.branchIds, refreshTrigger]);

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
                    if (id) {
                        map[id] = {
                            qty: r.quantityOnHand ?? 0,
                            damaged: r.damagedQuantity ?? 0
                        };
                    }
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

    const TRADE_FIELD_KEYS = [
        "item_code", "name", "description", "category_id",
        "unit_id", "purchase_price", "selling_price", "tax_percent",
        "stock_applicable", "min_stock_alert", "status"
    ];

    useEffect(() => {
        if (activeTab === "menu") {
            setVisibleFields(MENU_FIELD_KEYS);
        } else if (activeTab === "raw") {
            setVisibleFields(RAW_FIELD_KEYS);
        } else {
            setVisibleFields(TRADE_FIELD_KEYS);
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

    const canView = activeTab === "menu" ? canViewMenu : (activeTab === "raw" ? canViewItems : canViewTradeItems);
    const canManage = activeTab === "menu" ? canManageMenu : (activeTab === "raw" ? canManageItems : canManageTradeItems);

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
        setEditingProductId(null);
        setIsProductModalOpen(true);
    };

    const toggleItemStatus = async (item) => {
        const itemId = item._id || item.id;
        const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        try {
            setLoadingItemId(itemId);
            await itemService.updateItem(itemId, { status: newStatus });
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Failed to toggle item status:", error);
        } finally {
            setLoadingItemId(null);
        }
    };

    const handleEditItem = async (item) => {
        const itemId = item._id || item.id || item.itemId;
        if (!itemId) {
            console.error("Edit clicked for row without a valid id");
            return;
        }
        setEditingProductId(itemId);
        setIsProductModalOpen(true);
    };

    const handleProductModalClose = (savedItem) => {
        setIsProductModalOpen(false);
        setEditingProductId(null);
        if (savedItem) {
            setRefreshTrigger(prev => prev + 1);
        }
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
            header: "Status",
            key: "status",
            headerClassName: "text-center",
            className: "text-center",
            render: (value, item) => {
                const isActive = value === "ACTIVE";
                const isToggling = loadingItemId === (item._id || item.id);
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleItemStatus(item);
                        }}
                        disabled={isToggling}
                        className={`group relative p-3 rounded-2xl transition-all ${isActive
                            ? "bg-green-100 text-green-600 hover:bg-green-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                        title={isActive ? "Deactivate Item" : "Activate Item"}
                    >
                        {isToggling ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />}
                        {isActive && !isToggling && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                    </button>
                );
            }
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
                const stock = stockMap[id] ?? stockMap[item._id] ?? null;
                const qty = stock && typeof stock === 'object' ? stock.qty : (stock ?? item.quantityOnHand ?? null);
                const damaged = stock && typeof stock === 'object' ? stock.damaged : 0;

                const min = item.stockSettings?.minStockAlert ?? item.minStockAlert ?? 0;
                const low = qty !== null && qty <= min && min > 0;
                
                if (qty === null && damaged === 0) {
                    return <span className="text-[11px] text-gray-300 font-bold">—</span>;
                }

                const handleStockClick = (e) => {
                    e.stopPropagation();
                    if (!canManage) return;
                    setSelectedAdjustmentItem(item);
                    setIsAdjustmentModalOpen(true);
                };

                return (
                    <div 
                        className="flex flex-col items-center gap-1 cursor-pointer group/stock"
                        onClick={handleStockClick}
                        title={canManage ? "Click to adjust stock" : ""}
                    >
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition-all ${low
                            ? "bg-red-50 text-red-600 border-red-200 group-hover/stock:bg-red-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover/stock:bg-emerald-100"
                            }`}>
                            {low && <span title="Low stock">⚠️</span>}
                            {qty}
                            <span className="font-medium text-[10px] opacity-60">{item.unitId?.name || ""}</span>
                        </div>
                        {damaged > 0 && (
                            <div className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-black">
                                {damaged} Damaged
                            </div>
                        )}
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
                <div className={`font-black ${theme.textHeading}`}>
                    {formatCurrency(item.pricing?.purchasePrice || item.costPerUnit || 0)}
                    <span className={`text-[10px] ml-1 opacity-40 font-black uppercase tracking-tighter`}>
                        / {item.unitId?.name || ""}
                    </span>
                </div>
            )
        },
        {
            header: "Status",
            key: "status",
            headerClassName: "text-center",
            className: "text-center",
            render: (value, item) => {
                const isActive = value === "ACTIVE";
                const isToggling = loadingItemId === (item._id || item.id);
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleItemStatus(item);
                        }}
                        disabled={isToggling}
                        className={`group relative p-3 rounded-2xl transition-all ${isActive
                            ? "bg-green-100 text-green-600 hover:bg-green-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                        title={isActive ? "Deactivate Item" : "Activate Item"}
                    >
                        {isToggling ? <Loader2 size={20} className="animate-spin" /> : <Globe size={20} />}
                        {isActive && !isToggling && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                    </button>
                );
            }
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
                            } else if (activeTab === "raw") {
                                setInventoryItems(inventoryItems.filter((i) => i.id !== item.id));
                            } else {
                                // For trade items, we might need a separate setter if they are stored separately, 
                                // but based on other tabs it seems localItems handle display.
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
        <div className={`flex flex-col h-full overflow-hidden ${theme.pageBg}`}>
            {/* Header section */}
            <div className="p-4 md:p-6 flex-shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
                    <div>
                        {/* Header with Icon */}
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-3 text-white rounded-2xl ${activeTab === "menu" ? "bg-indigo-600" : "bg-orange-500"}`}>
                                {activeTab === "menu" ? <Package size={28} /> : <Boxes size={28} />}
                            </div>
                            <h2 className={`text-2xl md:text-4xl font-black tracking-tight ${theme.textHeading}`}>
                                {activeTab === "menu" ? t('INVENTORY', 'menu_heading', 'Manufactured Items') : (activeTab === "raw" ? t('INVENTORY', 'items_heading', 'Stock Items') : t('INVENTORY', 'trade_items_heading', 'Trade Items'))}
                            </h2>
                        </div>
                        <p className={`font-bold ml-1 ${theme.textMuted}`}>
                            {activeTab === "menu" ? "Manage manufactured items & bill of materials" : (activeTab === "raw" ? "Manage stock items & levels" : "Manage trade items for buy & sell")}
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
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsBulkModalOpen(true)}
                                    className={`px-6 py-4 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2
                                    ${theme.mode === 'dark' ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}
                                `}
                                >
                                    <Upload size={20} /> Bulk Import
                                </button>
                                <button
                                    onClick={handleOpenAddModal}
                                    className={`px-8 py-4 rounded-2xl font-black shadow-xl text-white transition-all flex items-center justify-center gap-2
                                    ${activeTab === "menu" ? "bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700" : (activeTab === "raw" ? "bg-orange-500 shadow-orange-200 dark:shadow-orange-900/20 hover:bg-orange-600" : "bg-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-700")}
                                `}
                                >
                                    <Plus size={20} /> 
                                    {activeTab === "menu" ? "Add Manufactured Item" : (activeTab === "raw" ? "Add Stock Item" : "Add Trade Item")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs section */}
            <div className="px-4 md:px-6 mb-6 flex-shrink-0 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className={`flex flex-wrap gap-4 p-2 rounded-2xl shadow-sm w-fit ${theme.surfaceBg}`}>
                    {canViewMenu && (
                        <button
                            onClick={() => setActiveTab("menu")}
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "menu"
                                ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                                : `${theme.textSecondary} hover:opacity-80`
                                }`}
                        >
                            <Layers size={18} /> {t('INVENTORY', 'menu_items_tab', 'Manufactured Items')}
                        </button>
                    )}
                    {canViewItems && (
                        <button
                            onClick={() => setActiveTab("raw")}
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "raw"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                                : `${theme.textSecondary} hover:opacity-80`
                                }`}
                        >
                            <Boxes size={18} /> {t('INVENTORY', 'items_tab', 'Stock Items')}
                        </button>
                    )}
                    {canViewTradeItems && (
                        <button
                            onClick={() => setActiveTab("trade")}
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "trade"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : `${theme.textSecondary} hover:opacity-80`
                                }`}
                        >
                            <Package size={18} /> {t('INVENTORY', 'trade_items_tab', 'Trade Items')}
                        </button>
                    )}
                </div>

                {/* Category Filter Dropdown */}
                <div className="w-full md:w-64">
                    <CommonSelect
                        options={[{ _id: "ALL", name: "All Categories" }, ...usedCategories]}
                        value={selectedCategory}
                        onChange={(val) => setSelectedCategory(val)}
                        labelKey="name"
                        valueKey="_id"
                        placeholder="Filter by Category"
                        searchPlaceholder="Search categories..."
                    />
                </div>
            </div>

            {/* Table section - FULL WIDTH with minimal padding */}
            <div className="flex-1 overflow-hidden px-2 md:px-4 pb-4">
                <CommonTable
                    columns={currentColumns}
                    data={filteredData}
                    isLoading={loadingItems}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    className="max-h-full flex flex-col"
                />
            </div>

            {/* Product Create/Edit Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-8 animate-in fade-in duration-200">
                    <div className={`${theme.surfaceBg} w-full max-w-6xl max-h-[90vh] rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border ${theme.borderLight} animate-in zoom-in-95 duration-200`}>
                         <button 
                            onClick={() => handleProductModalClose()}
                            className="absolute top-8 right-8 p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all z-10"
                        >
                            <X size={24} />
                        </button>
                        
                        <div className="flex-1 overflow-y-auto">
                             <ProductPage 
                                id={editingProductId}
                                activeTabOverride={activeTab}
                                asDialog={true} 
                                onClose={handleProductModalClose}
                                menu={menu}
                                setMenu={setMenu}
                                inventoryItems={inventoryItems}
                                setInventoryItems={setInventoryItems}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            <BulkUploadModal 
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                activeTab={activeTab}
            />

            {/* Stock Adjustment Modal */}
            <StockAdjustmentModal 
                isOpen={isAdjustmentModalOpen}
                onClose={() => {
                    setIsAdjustmentModalOpen(false);
                    setSelectedAdjustmentItem(null);
                }}
                item={selectedAdjustmentItem}
                branchId={activeBranchId || (user.branchIds?.length ? user.branchIds[0] : null)}
                onAdjustmentSuccess={() => setRefreshTrigger(prev => prev + 1)}
                formatCurrency={formatCurrency}
            />
        </div>
    );
};

export default Inventory;
