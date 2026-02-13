import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Globe, Layers, Wheat } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import ProductForm from '../../components/ProductForm';
import { getVisibleFieldKeys } from '../../config/itemFields';
import { ROUTE_ACCESS } from '../../config/permissionStructure';
import { useAuth } from '../../context/AuthContext';

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
    const isAdmin = user?.role === 'Admin';

    const [activeTab, setActiveTab] = useState("menu"); // "menu" or "raw"
    const [inventorySearch, setInventorySearch] = useState("");
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [visibleFields, setVisibleFields] = useState([]);

    // Define field sets for each mode
    const MENU_FIELD_KEYS = [
        "product_name", "category", "product_type", "selling_price",
        "tax_applicable", "tax_type", "diet_type", "prep_time",
        "kitchen_section", "is_combo", "addons_allowed"
    ];

    const RAW_FIELD_KEYS = [
        "product_name", "category", "supplier", "purchase_price",
        "stock_applicable", "min_stock_alert", "weight_unit"
    ];

    useEffect(() => {
        // Optional: We could still respect user preferences by filtering these lists against localStorage 
        // if we wanted to be fancy, but for now enforcing the split is what the user asked for.
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

    // Filter Logic based on activetab
    const filteredData = activeTab === "menu"
        ? menu.filter((item) => item.name?.toLowerCase().includes(inventorySearch.toLowerCase()))
        : inventoryItems?.filter((item) => item.name?.toLowerCase().includes(inventorySearch.toLowerCase())) || [];

    const inventoryAccess = ROUTE_ACCESS.INVENTORY;
    const canView = hasPermissionFor?.(inventoryAccess.module, inventoryAccess.resource, inventoryAccess.action);
    const canManage = hasPermissionFor?.(inventoryAccess.module, inventoryAccess.resource, "manage");

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

    const handleEditItem = (item) => {
        setEditingProduct(item);
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = (formData) => {
        const newItem = {
            id: editingProduct ? editingProduct.id : Date.now().toString(),
            ...formData,
            isAvailableOnline: editingProduct ? editingProduct.isAvailableOnline : true,
            price: parseFloat(formData.price || 0),
        };

        if (activeTab === "menu") {
            if (editingProduct) {
                setMenu(menu.map((m) => (m.id === editingProduct.id ? newItem : m)));
            } else {
                setMenu([...menu, newItem]);
            }
        } else {
            // Logic for saving Raw Item (Simplified for now, using same form structure but could be different)
            // For now, assuming raw items use similar structure or just basic fields
            if (editingProduct) {
                setInventoryItems(inventoryItems.map((m) => (m.id === editingProduct.id ? newItem : m)));
            } else {
                setInventoryItems([...inventoryItems, newItem]);
            }
        }

        setIsProductModalOpen(false);
        setEditingProduct(null);
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
                    <div className="text-xs font-bold text-gray-400">ID: {item.id}</div>
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
            key: "category",
            render: (value) => (
                <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                    {value || "Uncategorized"}
                </span>
            )
        },
        {
            header: "Price",
            key: "price",
            headerClassName: "text-center",
            className: "text-center",
            render: (_, item) => (
                <div className="font-black text-gray-800">{formatCurrency(item.price || 0)}</div>
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

    // 2. Raw Items Columns (New)
    const rawColumns = [
        {
            header: "Raw Material",
            key: "name",
            render: (value, item) => (
                <>
                    <div className="font-black text-gray-800 text-lg">{value}</div>
                    <div className="text-xs font-bold text-gray-400">Supplier: {item.supplier || "N/A"}</div>
                </>
            )
        },
        {
            header: "Category",
            key: "category",
            render: (value) => (
                <span className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                    {value}
                </span>
            )
        },
        {
            header: "Stock Level",
            key: "currentStock",
            headerClassName: "text-center",
            className: "text-center",
            render: (value, item) => (
                <div className={`font-bold ${value < (item.minStockLevel || 0) ? "text-red-500" : "text-gray-700"}`}>
                    {value} <span className="text-xs text-gray-400">{item.weightUnit || item.unit}</span>
                </div>
            )
        },
        {
            header: "Cost / Unit",
            key: "costPerUnit",
            headerClassName: "text-right",
            className: "text-right",
            render: (value) => (
                <div className="font-medium text-gray-600">{formatCurrency(value || 0)}</div>
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
                        className="p-3 bg-gray-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95"
                    >
                        <Edit3 size={18} />
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
                            {activeTab === "menu" ? "Menu Items" : "Raw Materials"}
                        </h2>
                    </div>
                    <p className="text-gray-500 font-bold ml-1">
                        {activeTab === "menu" ? "Manage sales items & recipes" : "Manage ingredients & stock"}
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                        <input
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder={activeTab === "menu" ? "Search menu..." : "Search ingredients..."}
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
                            <Plus size={20} /> Add {activeTab === "menu" ? "Item" : "Material"}
                        </button>
                    )}
                </div>
            </div>

            {/* Admin Tabs */}
            {isAdmin && (
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
                        <Wheat size={18} /> Raw Items
                    </button>
                </div>
            )}

            <CommonTable
                columns={currentColumns}
                data={filteredData}
            />

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
                    title={editingProduct ? `Edit ${activeTab === 'menu' ? 'Item' : 'Material'}` : `Add New ${activeTab === 'menu' ? 'Item' : 'Material'}`}
                    inventoryItems={inventoryItems} // Pass raw items for recipe selection
                    showRecipe={activeTab === 'menu'}
                />
            )}
        </div>
    );
};

export default Inventory;
