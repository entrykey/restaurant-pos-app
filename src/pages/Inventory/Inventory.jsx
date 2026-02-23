import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Globe, Layers, Wheat } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import ProductForm from '../../components/ProductForm';
import { getCommonFieldKeys } from '../../config/itemFields';
import { ROUTE_ACCESS } from '../../config/permissionStructure';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { itemService, inventoryService } from '../../services/api';

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
    const isAdmin = user?.role === 'Admin';

    const canViewItems = hasPermissionFor?.("inventory", "inventory", "view");
    const canManageItems = hasPermissionFor?.("inventory", "inventory", "edit") || hasPermissionFor?.("inventory", "inventory", "create");

    const canViewMenu = hasPermissionFor?.("inventory", "menu", "view");
    const canManageMenu = hasPermissionFor?.("inventory", "menu", "edit") || hasPermissionFor?.("inventory", "menu", "create");

    // Default to the first allowed tab
    const [activeTab, setActiveTab] = useState(canViewMenu ? "menu" : (canViewItems ? "raw" : "menu"));

    const [inventorySearch, setInventorySearch] = useState("");
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [loadingItemId, setLoadingItemId] = useState(null); // while fetching item by id for edit
    const [visibleFields, setVisibleFields] = useState([]);

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
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-12 bg-white rounded-[40px] shadow-xl border max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 font-medium">You don&apos;t have permission to view Inventory.</p>
                </div>
            </div>
        );
    }

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const handleEditItem = async (item) => {
        // Be very defensive about where the ID might live on the row object
        const itemId = item._id || item.id || item.itemId;
        if (!itemId) {
            console.error("Edit clicked for row without a valid id – cannot call getItemById", item);
            return;
        }
        setLoadingItemId(itemId);
        try {
            // Fetch full item data so form is pre-filled with all fields (including attributes)
            const full = await itemService.getItemById(itemId);
            if (!full) {
                setEditingProduct({ ...item, id: itemId });
                setIsProductModalOpen(true);
                return;
            }
            // Normalize attributes: backend may return unitId as object or string — form expects { value, unitId: string }
            const normalizedAttributes = full.attributes
                ? Object.fromEntries(
                    Object.entries(full.attributes).map(([code, v]) => [
                        code,
                        {
                            value: v?.value ?? '',
                            unitId: v?.unitId?._id ?? v?.unitId ?? '',
                        },
                    ])
                )
                : {};
            // Flatten nested backend structure to match ProductForm field names
            const flat = {
                ...full,
                id: String(full._id),
                _id: String(full._id),
                // IDs (extract from populated objects if needed)
                categoryId: full.categoryId?._id || full.categoryId,
                unitId: full.unitId?._id || full.unitId,
                supplierId: full.supplierId?._id || full.supplierId,
                brandId: full.brandId?._id || full.brandId,
                // Flatten pricing
                purchasePrice: full.pricing?.purchasePrice ?? full.purchasePrice ?? 0,
                sellingPrice: full.pricing?.sellingPrice ?? full.sellingPrice ?? 0,
                mrp: full.pricing?.mrp ?? full.mrp ?? 0,
                // Flatten stockSettings
                stockApplicable: full.stockSettings?.stockApplicable ?? full.stockApplicable ?? true,
                minStockAlert: full.stockSettings?.minStockAlert ?? full.minStockAlert ?? 0,
                // Other flat fields
                itemCode: full.itemCode,
                name: full.name,
                description: full.description,
                status: full.status || 'ACTIVE',
                weightBased: full.weightBased || false,
                hsnSacCode: full.hsnSacCode || '',
                ingredients: full.ingredients || [],
                attributes: normalizedAttributes,
            };
            setEditingProduct(flat);
            setIsProductModalOpen(true);
        } catch (err) {
            console.error('Failed to load item for editing:', err);
            // Fallback — open with partial data from list row (no attributes from API)
            setEditingProduct({ ...item, id: itemId, attributes: item.attributes || {} });
            setIsProductModalOpen(true);
        } finally {
            setLoadingItemId(null);
        }
    };

    const handleSaveProduct = async (formData) => {
        try {
            const isEditing = !!editingProduct;

            // Map frontend form data to backend payload (supplier is per purchase, not per item)
            const payload = {
                ...formData,
                shopid: user?.shop_id,
                branchId: activeBranchId || (user?.branchIds && user.branchIds.length > 0 ? user.branchIds[0] : formData.branchId), // Use activeBranchId from context
                itemType: activeTab === "menu" ? "MANUFACTURED" : "STOCK",
                itemCode: formData.itemCode,
                categoryId: formData.categoryId,
                unitId: formData.unitId,
                taxId: formData.taxId,
                pricing: {
                    purchasePrice: parseFloat(formData.purchasePrice || 0),
                    sellingPrice: parseFloat(formData.sellingPrice || 0),
                    mrp: parseFloat(formData.mrp || 0)
                },
                stockSettings: {
                    stockApplicable: formData.stockApplicable ?? true,
                    minStockAlert: parseFloat(formData.minStockAlert || 0),
                    allowNegativeStock: false
                },
                weightBased: formData.weightBased || false,
                status: formData.status || "ACTIVE",
                name: formData.name,
                description: formData.description,
                ingredients: formData.ingredients,
                attributes: formData.attributes || {} // { [attributeCode]: { value, unitId } } — persisted in ItemAttributeValue
            };

            let savedItem;
            if (isEditing) {
                savedItem = await itemService.updateItem(editingProduct.id, payload);
            } else {
                savedItem = await itemService.createItem(payload);
            }

            // Standardize ID
            const newItem = { ...savedItem, id: savedItem._id || savedItem.id };
            // Refresh current items after creating/editing
            // Ideally we'd just refetch the page to maintain sync and pagination flow
            // For now, updating state directly or forcing a refetch. 
            // We'll mutate the local list directly if on the same page, or just reload page 1
            if (!isEditing) {
                setCurrentPage(1); // Go back to start to see new item
                setInventorySearch(""); // Clear search to see new item
            } else {
                setLocalItems(prev => prev.map(m => m.id === editingProduct.id ? newItem : m));
            }

            // Also update global Context state so POS and other parts see the menu immediately
            if (activeTab === "menu") {
                if (isEditing) {
                    setMenu(prev => prev.map((m) => (m.id === editingProduct.id ? newItem : m)));
                } else {
                    setMenu(prev => [newItem, ...prev]);
                }
            }

            setRefreshTrigger(prev => prev + 1);
            setIsProductModalOpen(false);
            setEditingProduct(null);
        } catch (error) {
            console.error("Failed to save product:", error);
            alert("Failed to save product. Please check console for details.");
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
                    <div className="font-black text-gray-800 text-lg">{value}</div>
                    <div className="text-xs font-bold text-gray-400">Code: {item.itemCode || item.id}</div>
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
                <div className="font-black text-gray-800">{formatCurrency(item.sellingPrice || item.pricing?.sellingPrice || 0)}</div>
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
                    <div className="font-black text-gray-800 text-lg">{value}</div>
                    <div className="text-xs font-bold text-gray-400">Code: {item.itemCode || item.id}</div>
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
                <div className="font-medium text-gray-600">{formatCurrency(item.pricing?.purchasePrice || item.costPerUnit || 0)}</div>
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
                        className="p-3 bg-gray-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-wait"
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
                        className="p-3 bg-gray-50 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )
        });
    }

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    {/* Header with Icon */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 text-white rounded-2xl shadow-lg ${activeTab === "menu" ? "bg-indigo-600 shadow-indigo-100" : "bg-orange-500 shadow-orange-100"}`}>
                            {activeTab === "menu" ? <Package size={28} /> : <Wheat size={28} />}
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">
                            {activeTab === "menu" ? "Menu Items" : "Items"}
                        </h2>
                    </div>
                    <p className="text-gray-500 font-bold ml-1">
                        {activeTab === "menu" ? "Manage sales items & recipes" : "Manage inventory items & stock"}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                        <input
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder={activeTab === "menu" ? "Search menu..." : "Search items..."}
                            className="w-full pl-12 pr-4 py-4 border-2 border-transparent bg-white rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>
                    {canManage && (
                        <button
                            onClick={handleOpenAddModal}
                            className={`px-8 py-4 rounded-2xl font-black shadow-xl text-white transition-all flex items-center justify-center gap-2
                                ${activeTab === "menu" ? "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700" : "bg-orange-500 shadow-orange-200 hover:bg-orange-600"}
                            `}
                        >
                            <Plus size={20} /> Add {activeTab === "menu" ? "Menu Item" : "Item"}
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs - Only show if user has access to BOTH */}
            {canViewMenu && canViewItems && (
                <div className="flex gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm w-fit">
                    <button
                        onClick={() => setActiveTab("menu")}
                        className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "menu"
                            ? "bg-indigo-100 text-indigo-700"
                            : "text-gray-400 hover:bg-gray-50"
                            }`}
                    >
                        <Layers size={18} /> Menu Items
                    </button>
                    <button
                        onClick={() => setActiveTab("raw")}
                        className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === "raw"
                            ? "bg-orange-100 text-orange-700"
                            : "text-gray-400 hover:bg-gray-50"
                            }`}
                    >
                        <Wheat size={18} /> Items
                    </button>
                </div>
            )}

            <CommonTable
                columns={currentColumns}
                data={filteredData}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-sm font-bold text-gray-500">
                        Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1 || loadingItems}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-4 py-2 font-bold text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl disabled:opacity-50 transition-all"
                        >
                            Previous
                        </button>
                        <button
                            disabled={currentPage === totalPages || loadingItems}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="px-4 py-2 font-bold text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl disabled:opacity-50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {isProductModalOpen && (
                <ProductForm
                    initialValues={editingProduct || {}}
                    visibleFields={visibleFields}
                    onSave={handleSaveProduct}
                    onCancel={() => {
                        setIsProductModalOpen(false);
                        setEditingProduct(null);
                    }}
                    title={editingProduct ? `Edit ${activeTab === 'menu' ? 'Menu Item' : 'Item'}` : `Add New ${activeTab === 'menu' ? 'Menu Item' : 'Item'}`}
                    isEditing={!!editingProduct}
                    inventoryItems={inventoryItems}
                    showRecipe={activeTab === 'menu'}
                />
            )}
        </div>
    );
};

export default Inventory;
