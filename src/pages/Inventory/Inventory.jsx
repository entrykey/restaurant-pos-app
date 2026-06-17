import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Upload, Package, Search, Plus, Edit3, Trash2, Globe, Layers, Boxes, X, History, PackagePlus, PackageOpen, ShoppingBag } from 'lucide-react';
import ThemeLoader from '../../components/ui/ThemeLoader';
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
import RepackModal from '../../components/modals/RepackModal';

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
    const [totalItems, setTotalItems] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [loadingItems, setLoadingItems] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [stockMap, setStockMap] = useState({}); // itemId -> quantityOnHand
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProductId, setEditingProductId] = useState(null);
    const [usedCategories, setUsedCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("ALL");
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const branchId = activeBranchId || (user?.branchIds?.length ? user.branchIds[0] : null);

    const normalizeCategoryValue = (val) => {
        if (val == null || val === "" || val === "ALL") return "ALL";
        return String(val);
    };

    const categoryOptions = useMemo(
        () => [
            { _id: "ALL", name: "All Categories" },
            ...usedCategories.map((c) => ({
                ...c,
                _id: normalizeCategoryValue(c._id ?? c.id),
            })),
        ],
        [usedCategories]
    );

    // Stock Adjustment State
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [selectedAdjustmentItem, setSelectedAdjustmentItem] = useState(null);

    // Repack State
    const [isRepackModalOpen, setIsRepackModalOpen] = useState(false);
    const [selectedRepackItem, setSelectedRepackItem] = useState(null);

    // Item History State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
    const [historyData, setHistoryData] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Reset page to 1 on tab or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, inventorySearch]);

    // Reset category filter only when switching tabs
    useEffect(() => {
        setSelectedCategory("ALL");
    }, [activeTab]);

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
                    branchId,
                    itemType: activeTab === "menu" ? "MANUFACTURED" : (activeTab === "raw" ? "STOCK" : "TRADE"),
                };
                const categories = await itemService.getUsedCategories(params);
                setUsedCategories(categories || []);
            } catch (err) {
                console.error("Failed to fetch used categories:", err);
            }
        };
        fetchCategories();
    }, [activeTab, branchId, currentShopId]);

    const fetchPaginatedItems = useCallback(async () => {
        if (!currentShopId) return;
        setLoadingItems(true);
        try {
            const payload = {
                page: currentPage,
                limit: pageSize,
                search: inventorySearch,
                filters: {
                    shopId: currentShopId,
                    branchId,
                    itemType: activeTab === "menu" ? "MANUFACTURED" : (activeTab === "raw" ? "STOCK" : "TRADE"),
                    categoryId: selectedCategory === "ALL" ? undefined : selectedCategory,
                },
            };

            const response = await itemService.getItems(payload);
            if (response && response.data) {
                setLocalItems(response.data.map((item) => ({ ...item, id: item._id })));
                if (response.pagination) {
                    setTotalPages(response.pagination.totalPages || 1);
                    setTotalItems(response.pagination.total || 0);
                }
            }
        } catch (error) {
            console.error("Failed to fetch paginated items:", error);
        } finally {
            setLoadingItems(false);
        }
    }, [
        activeTab,
        branchId,
        currentPage,
        pageSize,
        currentShopId,
        inventorySearch,
        selectedCategory,
    ]);

    // Fetch items when filters, page, or refresh change
    useEffect(() => {
        fetchPaginatedItems();
    }, [fetchPaginatedItems, refreshTrigger]);

    const handleCategoryChange = (val) => {
        const category = normalizeCategoryValue(val);
        setSelectedCategory(category);
        setCurrentPage(1);
    };

    const handlePageSizeChange = (newSize) => {
        setPageSize(Number(newSize));
        setCurrentPage(1);
    };

    // Fetch stock levels whenever branchId or items change
    useEffect(() => {
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
    }, [branchId, refreshTrigger]);

    // Define field sets for each mode
    const MENU_FIELD_KEYS = [
        "barcode", "item_code", "name", "description", "category_id",
        "unit_id", "selling_price", "tax_id", "hsn_sac_code", "status"
    ];

    // Supplier is per purchase (purchase.model), not per item � same product can have different suppliers per purchase
    const RAW_FIELD_KEYS = [
        "barcode", "item_code", "name", "description", "category_id",
        "unit_id", "purchase_price", "selling_price",
        "weight_based", "status"
    ];

    const TRADE_FIELD_KEYS = [
        "barcode", "item_code", "name", "description", "category_id",
        "unit_id", "purchase_price", "selling_price", "tax_percent",
        "status"
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

    // Sort items so out of stock items are pushed to the end
    const filteredData = [...localItems].sort((a, b) => {
        const stockA = stockMap[a._id || a.id] ?? null;
        const qtyA = stockA && typeof stockA === 'object' ? stockA.qty : (stockA ?? a.quantityOnHand ?? 0);
        
        const stockB = stockMap[b._id || b.id] ?? null;
        const qtyB = stockB && typeof stockB === 'object' ? stockB.qty : (stockB ?? b.quantityOnHand ?? 0);

        const aHasStock = qtyA > 0;
        const bHasStock = qtyB > 0;

        if (aHasStock && !bHasStock) return -1;
        if (!aHasStock && bHasStock) return 1;
        return 0;
    });
    const menuAccess = ROUTE_ACCESS.MENU || { module: "inventory", resource: "menu" };

    const canView = activeTab === "menu" ? canViewMenu : (activeTab === "raw" ? canViewItems : canViewTradeItems);
    const canManage = activeTab === "menu" ? canManageMenu : (activeTab === "raw" ? canManageItems : canManageTradeItems);

    const menuHeading = t('INVENTORY', 'menu_heading', 'Manufactured Items');
    const itemsHeading = t('INVENTORY', 'items_heading', 'Stock Items');
    const tradeHeading = t('INVENTORY', 'trade_items_heading', 'Trade Items');

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

    const toggleSellableStatus = async (item) => {
        const itemId = item._id || item.id;
        const newSellable = item.isSellable === false ? true : false;

        try {
            setLoadingItemId(itemId);
            await itemService.updateItem(itemId, { isSellable: newSellable });
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Failed to toggle sellable status:", error);
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

    const handleProductModalClose = (savedItem, keepOpen = false) => {
        if (savedItem) {
            setRefreshTrigger(prev => prev + 1);
        }
        
        if (!keepOpen) {
            setIsProductModalOpen(false);
            setEditingProductId(null);
        }
    };

    const handleViewHistory = async (item) => {
        const itemId = item._id || item.id;
        setSelectedHistoryItem(item);
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        try {
            const history = await inventoryService.getItemHistory(itemId, activeBranchId);
            setHistoryData(history || []);
        } catch (error) {
            console.error("Failed to fetch item history:", error);
            setHistoryData([]);
        } finally {
            setLoadingHistory(false);
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
                    {item.secondaryUnitId && item.conversionFactor > 1 && (
                        <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black w-fit">
                            1 {item.secondaryUnitId.name || item.secondaryUnitId.code} = {item.conversionFactor} {item.unitId?.name || item.unitId?.code}
                        </div>
                    )}
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
            exportValue: (_, item) => item.categoryId?.name || item.categoryId?.id || "Other",
            render: (value, item) => (
                <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                    {item.categoryId?.name || value?.name || "Other Category"}
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
                    return <span className="text-[11px] text-gray-300 font-bold">�</span>;
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
                        <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition-all ${low
                                ? "bg-red-50 text-red-600 border-red-200 group-hover/stock:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover/stock:bg-emerald-100"
                                }`}>
                                {low && <span title="Low stock">??</span>}
                                {qty}
                                <span className="font-medium text-[10px] opacity-60">{item.unitId?.name || ""}</span>
                            </div>
                            {canManage && (
                                <button
                                    onClick={handleStockClick}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white shadow-sm active:scale-90`}
                                    title="Adjust Stock"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
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
            header: "Price",
            key: "sellingPrice",
            headerClassName: "text-center",
            className: "text-center",
            exportValue: (_, item) => {
                const sp = item.pricing?.sellingPrice ?? item.sellingPrice;
                const mrp = item.pricing?.mrp ?? item.mrp;
                const pp = item.pricing?.purchasePrice ?? item.purchasePrice;
                const parts = [];
                if (sp) parts.push(`Sale: ${sp}`);
                if (mrp) parts.push(`MRP: ${mrp}`);
                if (pp) parts.push(`Purchase: ${pp}`);
                return parts.join(' | ') || '�';
            },
            render: (_, item) => {
                const sp = item.pricing?.sellingPrice ?? item.sellingPrice;
                const mrp = item.pricing?.mrp ?? item.mrp;
                const pp = item.pricing?.purchasePrice ?? item.purchasePrice;
                return (
                    <div className="flex flex-col items-center gap-0.5">
                        {sp != null && sp !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider opacity-50 ${theme.textSecondary}`}>Sale</span>
                                <span className={`font-black text-sm ${theme.textHeading}`}>{formatCurrency(sp)}</span>
                            </div>
                        )}
                        {mrp != null && mrp !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider opacity-50 ${theme.textSecondary}`}>MRP</span>
                                <span className={`font-bold text-xs opacity-70 ${theme.textHeading}`}>{formatCurrency(mrp)}</span>
                            </div>
                        )}
                        {pp != null && pp !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider opacity-50 ${theme.textSecondary}`}>Purchase</span>
                                <span className={`font-bold text-xs opacity-70 ${theme.textHeading}`}>{formatCurrency(pp)}</span>
                            </div>
                        )}
                        {!sp && !mrp && !pp && (
                            <span className={`text-xs opacity-40 ${theme.textSecondary}`}>�</span>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Show on Sale",
            key: "isSellable",
            exportValue: (value) => (value !== false) ? "Yes" : "No",
            headerClassName: "text-center",
            className: "text-center",
            render: (value, item) => {
                const isSellable = value !== false;
                const isToggling = loadingItemId === (item._id || item.id);
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSellableStatus(item);
                        }}
                        disabled={isToggling}
                        className={`group relative p-3 rounded-2xl transition-all ${isSellable
                            ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                        title={isSellable ? "Hide from Sale Page" : "Show on Sale Page"}
                    >
                        {isToggling ? <ThemeLoader size="xs" /> : <ShoppingBag size={20} />}
                        {isSellable && !isToggling && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 border-2 border-white rounded-full"></div>
                        )}
                    </button>
                );
            }
        },
        {
            header: "Status",
            key: "status",
            exportValue: (value) => value || "INACTIVE",
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
                        {isToggling ? <ThemeLoader size="xs" /> : <Globe size={20} />}
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
                    {item.secondaryUnitId && item.conversionFactor > 1 && (
                        <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-black w-fit">
                            1 {item.secondaryUnitId.name || item.secondaryUnitId.code} = {item.conversionFactor} {item.unitId?.name || item.unitId?.code}
                        </div>
                    )}
                </>
            )
        },
        {
            header: "Category",
            key: "categoryId",
            exportValue: (_, item) => item.categoryId?.name || "Other",
            render: (value, item) => (
                <span className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                    {item.categoryId?.name || value?.name || "Other Category"}
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
                    return <span className="text-[11px] text-gray-300 font-bold">�</span>;
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
                        <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition-all ${low
                                ? "bg-red-50 text-red-600 border-red-200 group-hover/stock:bg-red-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover/stock:bg-emerald-100"
                                }`}>
                                {low && <span title="Low stock">??</span>}
                                {qty}
                                <span className="font-medium text-[10px] opacity-60">{item.unitId?.name || ""}</span>
                            </div>
                            {canManage && (
                                <button
                                    onClick={handleStockClick}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white shadow-sm active:scale-90`}
                                    title="Adjust Stock"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
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
            header: "Price",
            key: "costPerUnit",
            headerClassName: "text-right",
            className: "text-right",
            exportValue: (_, item) => {
                const pp = item.pricing?.purchasePrice ?? item.purchasePrice ?? item.costPerUnit;
                const mrp = item.pricing?.mrp ?? item.mrp;
                const sp = item.pricing?.sellingPrice ?? item.sellingPrice;
                const unit = item.unitId?.name || "";
                const parts = [];
                if (pp) parts.push(`Purchase: ${pp}${unit ? ' /' + unit : ''}`);
                if (mrp) parts.push(`MRP: ${mrp}`);
                if (sp) parts.push(`Sale: ${sp}`);
                return parts.join(' | ') || '�';
            },
            render: (_, item) => {
                const pp = item.pricing?.purchasePrice ?? item.purchasePrice ?? item.costPerUnit;
                const mrp = item.pricing?.mrp ?? item.mrp;
                const sp = item.pricing?.sellingPrice ?? item.sellingPrice;
                const unit = item.unitId?.name || "";
                return (
                    <div className="flex flex-col items-end gap-0.5">
                        {pp != null && pp !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider opacity-50 ${theme.textSecondary}`}>Purchase</span>
                                <span className={`font-black text-sm ${theme.textHeading}`}>
                                    {formatCurrency(pp)}
                                    {unit && <span className="text-[10px] ml-1 opacity-40 font-black uppercase tracking-tighter">/ {unit}</span>}
                                </span>
                            </div>
                        )}
                        {mrp != null && mrp !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider opacity-50 ${theme.textSecondary}`}>MRP</span>
                                <span className={`font-bold text-xs opacity-70 ${theme.textHeading}`}>
                                    {formatCurrency(mrp)}
                                    {unit && <span className="text-[10px] ml-1 opacity-40 font-black uppercase tracking-tighter">/ {unit}</span>}
                                </span>
                            </div>
                        )}
                        {sp != null && sp !== 0 && (
                            <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black uppercase tracking-wider opacity-50 ${theme.textSecondary}`}>Sale</span>
                                <span className={`font-bold text-xs opacity-70 ${theme.textHeading}`}>
                                    {formatCurrency(sp)}
                                    {unit && <span className="text-[10px] ml-1 opacity-40 font-black uppercase tracking-tighter">/ {unit}</span>}
                                </span>
                            </div>
                        )}
                        {!pp && !mrp && !sp && (
                            <span className={`text-xs opacity-40 ${theme.textSecondary}`}>�</span>
                        )}
                    </div>
                );
            }
        },
        {
            header: "Show on Sale",
            key: "isSellable",
            exportValue: (value) => (value !== false) ? "Yes" : "No",
            headerClassName: "text-center",
            className: "text-center",
            render: (value, item) => {
                const isSellable = value !== false;
                const isToggling = loadingItemId === (item._id || item.id);
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSellableStatus(item);
                        }}
                        disabled={isToggling}
                        className={`group relative p-3 rounded-2xl transition-all ${isSellable
                            ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                            } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                        title={isSellable ? "Hide from Sale Page" : "Show on Sale Page"}
                    >
                        {isToggling ? <ThemeLoader size="xs" /> : <ShoppingBag size={20} />}
                        {isSellable && !isToggling && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 border-2 border-white rounded-full"></div>
                        )}
                    </button>
                );
            }
        },
        {
            header: "Status",
            key: "status",
            exportValue: (value) => value || "INACTIVE",
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
                        {isToggling ? <ThemeLoader size="xs" /> : <Globe size={20} />}
                        {isActive && !isToggling && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                    </button>
                );
            }
        }
    ];

    const currentColumns = activeTab === "menu" ? menuColumns : rawColumns;

    currentColumns.push({
        header: "Actions",
        key: "actions",
        headerClassName: "text-right",
        className: "text-right",
        render: (_, item) => (
            <div className="flex justify-end gap-3">
                <button
                    onClick={(e) => { e.stopPropagation(); handleViewHistory(item); }}
                    className={`p-3 ${theme.inputBg} text-amber-500 hover:bg-amber-500 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95`}
                    title="View Transaction History"
                >
                    <History size={18} />
                </button>
                {canManage && activeTab === "raw" && (
                    <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedRepackItem(item);
                            setIsRepackModalOpen(true);
                        }}
                        className={`p-3 ${theme.inputBg} text-blue-500 hover:bg-blue-500 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95`}
                        title="Repack Item"
                    >
                        <PackageOpen size={18} />
                    </button>
                )}
                {canManage && (
                    <>
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
                    </>
                )}
            </div>
        )
    });

    // -- Mobile card renderer --------------------------------------------------
    // Truncates name to 7 chars + "�", stacks: name/code ? category ? stock/price ? actions
    const mobileCardRender = (item) => {
        const id = item._id || item.id;
        const rawName = item.name || "";
        const shortName = rawName.length > 7 ? rawName.slice(0, 7) + "�" : rawName;
        const code = item.itemCode || id;
        const categoryName = item.categoryId?.name || "Other";

        const stock = stockMap[id] ?? null;
        const qty = stock && typeof stock === 'object' ? stock.qty : (stock ?? item.quantityOnHand ?? null);
        const damaged = stock && typeof stock === 'object' ? stock.damaged : 0;
        const min = item.stockSettings?.minStockAlert ?? item.minStockAlert ?? 0;
        const low = qty !== null && qty <= min && min > 0;

        const isSellable = item.isSellable !== false;
        const isActive = item.status === "ACTIVE";
        const isToggling = loadingItemId === id;

        const accentColor = activeTab === "menu" ? "indigo" : (activeTab === "raw" ? "orange" : "emerald");
        const categoryBg = activeTab === "menu"
            ? "bg-indigo-50 text-indigo-700"
            : (activeTab === "raw" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700");

        return (
            <div className={`p-3 ${theme.surfaceBg}`}>
                {/* Row 1: Name/Code/Category (left) + Stock & Price (right) */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                        <div className={`font-black text-base leading-tight ${theme.textHeading}`} title={rawName}>
                            {shortName}
                        </div>
                        <div className={`text-[10px] font-bold mt-0.5 ${theme.textSecondary}`}>{code}</div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide ${categoryBg}`}>
                            {categoryName}
                        </span>
                    </div>

                    {/* Right column: Stock badge + Price */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        {/* Stock row */}
                        {qty !== null ? (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!canManage) return;
                                        setSelectedAdjustmentItem(item);
                                        setIsAdjustmentModalOpen(true);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-xs font-black border ${low
                                        ? "bg-red-50 text-red-600 border-red-200"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    }`}
                                >
                                    {low && <span>??</span>}
                                    {qty}
                                    <span className="font-medium text-[10px] opacity-60">{item.unitId?.name || ""}</span>
                                </button>
                                {canManage && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedAdjustmentItem(item);
                                            setIsAdjustmentModalOpen(true);
                                        }}
                                        className="w-6 h-6 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm"
                                        title="Adjust Stock"
                                    >
                                        <Plus size={12} />
                                    </button>
                                )}
                            </div>
                        ) : canManage ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedAdjustmentItem(item);
                                    setIsAdjustmentModalOpen(true);
                                }}
                                className="w-6 h-6 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm"
                                title="Adjust Stock"
                            >
                                <Plus size={12} />
                            </button>
                        ) : null}

                        {damaged > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-black">
                                {damaged} Dmg
                            </span>
                        )}

                        {/* Price � right-aligned below stock */}
                        <div className={`text-sm font-black text-right ${theme.textHeading}`}>
                            {activeTab === "raw" ? (() => {
                                const pp = item.pricing?.purchasePrice ?? item.purchasePrice ?? item.costPerUnit;
                                const mrp = item.pricing?.mrp ?? item.mrp;
                                const sp = item.pricing?.sellingPrice ?? item.sellingPrice;
                                const primary = pp || mrp || sp;
                                const label = pp ? "Purchase" : mrp ? "MRP" : "Sale";
                                return primary ? (
                                    <div className="flex flex-col items-end gap-0.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] opacity-40 font-bold uppercase">{label}</span>
                                            <span>{formatCurrency(primary)}</span>
                                        </div>
                                        {pp && mrp ? <div className="text-[10px] opacity-40 font-bold">MRP {formatCurrency(mrp)}</div> : null}
                                    </div>
                                ) : <span className="opacity-40">�</span>;
                            })() : (() => {
                                const sp = item.pricing?.sellingPrice ?? item.sellingPrice;
                                const mrp = item.pricing?.mrp ?? item.mrp;
                                const pp = item.pricing?.purchasePrice ?? item.purchasePrice;
                                const primary = sp || mrp || pp;
                                const label = sp ? "Sale" : mrp ? "MRP" : "Purchase";
                                return primary ? (
                                    <div className="flex flex-col items-end gap-0.5">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[9px] opacity-40 font-bold uppercase">{label}</span>
                                            <span>{formatCurrency(primary)}</span>
                                        </div>
                                        {sp && mrp ? <div className="text-[10px] opacity-40 font-bold">MRP {formatCurrency(mrp)}</div> : null}
                                    </div>
                                ) : <span className="opacity-40">�</span>;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Row 2: Actions � icon + label so no tooltip needed on mobile */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Show on Sale toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSellableStatus(item); }}
                        disabled={isToggling}
                        className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isSellable
                            ? `bg-${accentColor}-100 text-${accentColor}-600`
                            : "bg-gray-100 text-gray-400"
                        } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                    >
                        {isToggling
                            ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <ShoppingBag size={15} />
                        }
                        <span className="text-[9px] font-black leading-none">
                            {isSellable ? "On Sale" : "Off Sale"}
                        </span>
                        {isSellable && !isToggling && (
                            <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-${accentColor}-500 border-2 border-white rounded-full`} />
                        )}
                    </button>

                    {/* Status toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleItemStatus(item); }}
                        disabled={isToggling}
                        className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all ${isActive
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        } ${isToggling ? "opacity-50 cursor-wait" : ""}`}
                    >
                        {isToggling
                            ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            : <Globe size={15} />
                        }
                        <span className="text-[9px] font-black leading-none">
                            {isActive ? "Active" : "Inactive"}
                        </span>
                        {isActive && !isToggling && (
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                        )}
                    </button>

                    {/* History */}
                    <button
                        onClick={(e) => { e.stopPropagation(); handleViewHistory(item); }}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 ${theme.inputBg} text-amber-500 rounded-xl transition-all shadow-sm active:scale-95`}
                    >
                        <History size={15} />
                        <span className="text-[9px] font-black leading-none">History</span>
                    </button>

                    {/* Repack (raw only) */}
                    {canManage && activeTab === "raw" && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRepackItem(item);
                                setIsRepackModalOpen(true);
                            }}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 ${theme.inputBg} text-blue-500 rounded-xl transition-all shadow-sm active:scale-95`}
                        >
                            <PackageOpen size={15} />
                            <span className="text-[9px] font-black leading-none">Repack</span>
                        </button>
                    )}

                    {/* Edit */}
                    {canManage && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleEditItem(item); }}
                            disabled={loadingItemId === id}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 ${theme.inputBg} ${theme.primaryIconText} rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-wait`}
                        >
                            {loadingItemId === id
                                ? <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                : <Edit3 size={15} />
                            }
                            <span className="text-[9px] font-black leading-none">Edit</span>
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col min-h-full overflow-x-hidden ${theme.pageBg}`}>
            {/* Header section */}
            <div className="p-4 md:p-6 flex-shrink-0">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    {/* Title block */}
                    <div className="flex-shrink-0">
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-2.5 text-white rounded-2xl ${activeTab === "menu" ? "bg-indigo-600" : "bg-orange-500"}`}>
                                {activeTab === "menu" ? <Package size={22} /> : <Boxes size={22} />}
                            </div>
                            <h2 className={`text-xl md:text-2xl lg:text-3xl font-black tracking-tight ${theme.textHeading}`}>
                                {activeTab === "menu" ? menuHeading : (activeTab === "raw" ? itemsHeading : tradeHeading)}
                            </h2>
                        </div>
                        <p className={`font-bold ml-1 text-sm ${theme.textMuted}`}>
                            {activeTab === "menu" ? t('INVENTORY', 'menu_subtitle', `Manage ${menuHeading.toLowerCase()} & bill of materials`) : (activeTab === "raw" ? t('INVENTORY', 'items_subtitle', `Manage ${itemsHeading.toLowerCase()} & levels`) : t('INVENTORY', 'trade_items_subtitle', `Manage ${tradeHeading.toLowerCase()} for buy & sell`))}
                        </p>
                    </div>

                    {/* Search + Buttons row */}
                    <div className="flex flex-row flex-wrap gap-3 w-full lg:w-auto items-center">
                        <div className="relative flex-1 min-w-[140px]">
                            <Search className={`absolute left-3 top-3.5 ${theme.textSecondary}`} size={18} />
                            <input
                                value={inventorySearch}
                                onChange={(e) => setInventorySearch(e.target.value)}
                                placeholder={activeTab === "menu" ? "Search menu..." : "Search items..."}
                                className={`w-full pl-10 pr-4 py-3 border-2 border-transparent rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-sm ${theme.surfaceBg} ${theme.textPrimary}`}
                            />
                        </div>

                        {canManage && (
                            <div className="flex flex-row gap-2 flex-shrink-0">
                                <button
                                    onClick={() => setIsBulkModalOpen(true)}
                                    className={`px-3 md:px-4 py-3 rounded-xl font-black text-sm shadow-md transition-all flex items-center justify-center gap-2
                                    ${theme.mode === 'dark' ? 'bg-slate-800 text-indigo-400 hover:bg-slate-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}
                                `}
                                >
                                    <Upload size={18} />
                                    <span className="hidden sm:inline">Bulk Import</span>
                                </button>
                                <button
                                    onClick={handleOpenAddModal}
                                    className={`px-3 md:px-5 py-3 rounded-xl font-black text-sm shadow-lg text-white transition-all flex items-center justify-center gap-2
                                    ${activeTab === "menu" ? "bg-indigo-600 hover:bg-indigo-700" : (activeTab === "raw" ? "bg-orange-500 hover:bg-orange-600" : "bg-emerald-600 hover:bg-emerald-700")}
                                `}
                                >
                                    <Plus size={18} />
                                    <span className="hidden xs:inline sm:inline">
                                        {activeTab === "menu" ? t('INVENTORY', 'add_menu_item', `Add ${menuHeading.replace(/s$/, '')}`) : (activeTab === "raw" ? t('INVENTORY', 'add_stock_item', `Add ${itemsHeading.replace(/s$/, '')}`) : t('INVENTORY', 'add_trade_item', `Add ${tradeHeading.replace(/s$/, '')}`))}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs + Category Filter */}
            <div className="px-4 md:px-6 mb-6 flex-shrink-0 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className={`flex flex-row flex-wrap gap-1 p-1.5 rounded-2xl shadow-sm w-full lg:w-fit ${theme.surfaceBg}`}>
                    {canViewMenu && (
                        <button
                            onClick={() => setActiveTab("menu")}
                            className={`flex-1 lg:flex-none px-3 md:px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === "menu"
                                ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                                : `${theme.textSecondary} hover:opacity-80`
                                }`}
                        >
                            <Layers size={16} /> {t('INVENTORY', 'menu_items_tab', 'Manufactured Items')}
                        </button>
                    )}
                    {canViewItems && (
                        <button
                            onClick={() => setActiveTab("raw")}
                            className={`flex-1 lg:flex-none px-3 md:px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === "raw"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                                : `${theme.textSecondary} hover:opacity-80`
                                }`}
                        >
                            <Boxes size={16} /> {t('INVENTORY', 'items_tab', 'Stock Items')}
                        </button>
                    )}
                    {canViewTradeItems && (
                        <button
                            onClick={() => setActiveTab("trade")}
                            className={`flex-1 lg:flex-none px-3 md:px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 ${activeTab === "trade"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : `${theme.textSecondary} hover:opacity-80`
                                }`}
                        >
                            <Package size={16} /> {t('INVENTORY', 'trade_items_tab', 'Trade Items')}
                        </button>
                    )}
                </div>

                {/* Category Filter � same line as tabs on desktop, below on mobile/tablet */}
                <div className="w-full lg:w-56">
                    <CommonSelect
                        options={categoryOptions}
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                        labelKey="name"
                        valueKey="_id"
                        placeholder="Filter by Category"
                        searchPlaceholder="Search categories..."
                    />
                </div>
            </div>

            {/* Table section */}
            <div className="px-2 md:px-4 pb-10">
                <CommonTable
                    columns={currentColumns}
                    data={filteredData}
                    isLoading={loadingItems}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={pageSize}
                    onPageSizeChange={handlePageSizeChange}
                    onPageChange={setCurrentPage}
                    className="max-h-full flex flex-col"
                    mobileCardRender={mobileCardRender}
                    exportFilename={`items-${activeTab}-${new Date().toISOString().split('T')[0]}`}
                    exportTitle={`${activeTab === 'menu' ? 'Menu' : activeTab === 'raw' ? 'Stock' : 'Trade'} Items Export`}
                    onFetchAll={async () => {
                        const response = await itemService.getItems({
                            page: 1,
                            limit: 9999,
                            search: inventorySearch || undefined,
                            filters: {
                                shopId: currentShopId,
                                branchId,
                                itemType: activeTab === "menu" ? "MANUFACTURED" : activeTab === "raw" ? "STOCK" : "TRADE",
                                categoryId: selectedCategory === "ALL" ? undefined : selectedCategory,
                            },
                        });
                        return (response?.data || []).map(item => ({ ...item, id: item._id }));
                    }}
                />
            </div>

            {/* Product Create/Edit Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm md:p-8 animate-in fade-in duration-200">
                    <div className={`${theme.surfaceBg} w-full max-w-6xl h-full md:h-auto md:max-h-[90vh] md:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border-0 md:border ${theme.borderLight} animate-in slide-in-from-bottom md:zoom-in-95 duration-200`}>
                         <button 
                            onClick={() => handleProductModalClose()}
                            className="absolute top-8 right-8 p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all z-10"
                        >
                            <X size={24} />
                        </button>
                        
                        <div className="flex-1 overflow-hidden flex flex-col">
                             <ProductPage 
                                id={editingProductId}
                                activeTabOverride={activeTab}
                                asDialog={true} 
                                onClose={handleProductModalClose}
                                menu={menu}
                                setMenu={setMenu}
                                inventoryItems={inventoryItems}
                                setInventoryItems={setInventoryItems}
                                canViewMenu={canViewMenu}
                                canViewItems={canViewItems}
                                canViewTradeItems={canViewTradeItems}
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
                branchId={branchId}
                onAdjustmentSuccess={() => setRefreshTrigger(prev => prev + 1)}
                formatCurrency={formatCurrency}
            />

            {/* Item History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
                    <div className={`${theme.surfaceBg} w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[85vh] sm:rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col border ${theme.borderLight} animate-in slide-in-from-bottom sm:zoom-in-95 duration-200`}>
                        <div className={`p-4 sm:p-8 border-b ${theme.borderLight} flex justify-between items-center`}>
                            <div>
                                <h3 className={`text-lg sm:text-2xl font-black ${theme.textHeading}`}>Transaction History</h3>
                                <p className={`text-sm font-bold ${theme.textSecondary}`}>
                                    {selectedHistoryItem?.name} ({selectedHistoryItem?.itemCode || selectedHistoryItem?.id})
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsHistoryModalOpen(false);
                                    setSelectedHistoryItem(null);
                                    setHistoryData([]);
                                }}
                                className={`p-3 hover:bg-red-500/10 hover:text-red-500 ${theme.textMuted} rounded-full transition-all`}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                            {loadingHistory ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <ThemeLoader size="lg" />
                                    <p className={`mt-4 font-bold ${theme.textMuted}`}>Fetching transaction history...</p>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className={`text-center py-20 ${theme.sectionBg} rounded-[30px] border-2 border-dashed ${theme.borderLight}`}>
                                    <div className={`w-16 h-16 ${theme.surfaceBg} rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm`}>
                                        <History size={32} className={theme.textMuted} />
                                    </div>
                                    <p className={`font-black text-xl ${theme.textHeading}`}>No Transactions Found</p>
                                    <p className={`font-medium ${theme.textMuted}`}>This item has no recorded sales or purchases yet.</p>
                                </div>
                            ) : (
                                <div className={`overflow-hidden rounded-2xl border ${theme.tableBorder}`}>
                                    {/* Mobile card layout */}
                                    <div className="sm:hidden divide-y divide-inherit">
                                        {historyData.map((movement, idx) => {
                                            const isSale = movement.type === 'SALE';
                                            const isPurchase = movement.type === 'PURCHASE';
                                            const isReturn = movement.type === 'RETURN';

                                            let badgeClass = `${theme.sectionBg} ${theme.textSecondary} ${theme.borderLight}`;
                                            if (isSale) badgeClass = `${theme.infoBg} ${theme.infoText} ${theme.infoBorder}`;
                                            if (isPurchase) badgeClass = `${theme.successBg} ${theme.successText} border-emerald-500/20`;
                                            if (isReturn) badgeClass = `${theme.warningBg} ${theme.warningText} ${theme.warningBorder}`;

                                            return (
                                                <div key={idx} className={`p-4 ${theme.tableRowHover} transition-colors border-b ${theme.tableBorder} last:border-0`}>
                                                    {/* Row 1: Date + Type badge */}
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <div className={`text-sm font-bold ${theme.textSecondary}`}>
                                                                {new Date(movement.createdAt).toLocaleDateString()}
                                                            </div>
                                                            <div className={`text-[11px] ${theme.textMuted}`}>
                                                                {new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        </div>
                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black border tracking-wider ${badgeClass}`}>
                                                            {movement.type}
                                                        </span>
                                                    </div>
                                                    {/* Row 2: Invoice number if available */}
                                                    {(movement.invoiceNumber || movement.orderNumber || movement.purchaseNumber) && (
                                                        <div className="mb-3">
                                                            <p className={`text-[10px] font-black uppercase tracking-wider ${theme.tableHeaderText}`}>Invoice</p>
                                                            <p className={`text-sm font-bold ${theme.textPrimary}`}>
                                                                #{movement.invoiceNumber || movement.orderNumber || movement.purchaseNumber}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {/* Row 3: Qty In / Qty Out / Balance */}
                                                    <div className={`grid grid-cols-3 gap-2 pt-3 border-t ${theme.tableBorder}`}>
                                                        <div className="text-center">
                                                            <div className={`text-[10px] font-black uppercase tracking-wider ${theme.tableHeaderText} mb-1`}>Qty In</div>
                                                            <div className={`text-sm font-black ${theme.successText}`}>
                                                                {movement.quantityIn > 0 ? `+${movement.quantityIn}` : "�"}
                                                            </div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className={`text-[10px] font-black uppercase tracking-wider ${theme.tableHeaderText} mb-1`}>Qty Out</div>
                                                            <div className="text-sm font-black text-red-500">
                                                                {movement.quantityOut > 0 ? `-${movement.quantityOut}` : "�"}
                                                            </div>
                                                        </div>
                                                        <div className="text-center">
                                                            <div className={`text-[10px] font-black uppercase tracking-wider ${theme.tableHeaderText} mb-1`}>Balance</div>
                                                            <div className={`text-sm font-black ${theme.textHeading}`}>
                                                                {movement.balanceAfter}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop table layout */}
                                    <table className="hidden sm:table w-full text-left">
                                        <thead>
                                            <tr className={theme.tableHeaderBg}>
                                                <th className={`px-6 py-4 text-xs font-black uppercase ${theme.tableHeaderText} tracking-wider`}>Date</th>
                                                <th className={`px-6 py-4 text-xs font-black uppercase ${theme.tableHeaderText} tracking-wider`}>Type</th>
                                                <th className={`px-6 py-4 text-xs font-black uppercase ${theme.tableHeaderText} tracking-wider`}>Invoice</th>
                                                <th className={`px-6 py-4 text-xs font-black uppercase ${theme.tableHeaderText} tracking-wider text-right`}>Qty In</th>
                                                <th className={`px-6 py-4 text-xs font-black uppercase ${theme.tableHeaderText} tracking-wider text-right`}>Qty Out</th>
                                                <th className={`px-6 py-4 text-xs font-black uppercase ${theme.tableHeaderText} tracking-wider text-right`}>Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y ${theme.tableBorder}`}>
                                            {historyData.map((movement, idx) => {
                                                const isSale = movement.type === 'SALE';
                                                const isPurchase = movement.type === 'PURCHASE';
                                                const isReturn = movement.type === 'RETURN';

                                                let badgeClass = `${theme.sectionBg} ${theme.textSecondary} ${theme.borderLight}`;
                                                if (isSale) badgeClass = `${theme.infoBg} ${theme.infoText} ${theme.infoBorder}`;
                                                if (isPurchase) badgeClass = `${theme.successBg} ${theme.successText} border-emerald-500/20`;
                                                if (isReturn) badgeClass = `${theme.warningBg} ${theme.warningText} ${theme.warningBorder}`;

                                                return (
                                                    <tr key={idx} className={`${theme.tableRowHover} transition-colors`}>
                                                        <td className={`px-6 py-4 text-sm font-medium ${theme.textSecondary}`}>
                                                            {new Date(movement.createdAt).toLocaleDateString()}
                                                            <div className={`text-[10px] ${theme.textMuted}`}>{new Date(movement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black border tracking-wider ${badgeClass}`}>
                                                                {movement.type}
                                                            </span>
                                                        </td>
                                                        <td className={`px-6 py-4 text-sm font-bold ${theme.textPrimary}`}>
                                                            {movement.invoiceNumber || movement.orderNumber || movement.purchaseNumber ? `#${movement.invoiceNumber || movement.orderNumber || movement.purchaseNumber}` : "—"}
                                                        </td>
                                                        <td className={`px-6 py-4 text-sm font-black text-right ${theme.successText}`}>
                                                            {movement.quantityIn > 0 ? `+${movement.quantityIn}` : "-"}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm font-black text-right text-red-500">
                                                            {movement.quantityOut > 0 ? `-${movement.quantityOut}` : "-"}
                                                        </td>
                                                        <td className={`px-6 py-4 text-sm font-black text-right ${theme.textHeading}`}>
                                                            {movement.balanceAfter}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Repack Modal */}
            <RepackModal
                isOpen={isRepackModalOpen}
                onClose={() => {
                    setIsRepackModalOpen(false);
                    setSelectedRepackItem(null);
                }}
                sourceItem={selectedRepackItem}
                sourceStock={selectedRepackItem ? (stockMap[selectedRepackItem._id || selectedRepackItem.id]?.qty ?? selectedRepackItem.quantityOnHand ?? 0) : 0}
                onRepackComplete={() => {
                    // Refresh data
                    setRefreshTrigger(prev => prev + 1);
                }}
            />
        </div>
    );
};

export default Inventory;

