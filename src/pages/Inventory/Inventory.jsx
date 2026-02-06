import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Globe } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import ProductForm from '../../components/ProductForm';
import { getVisibleFieldKeys } from '../../config/itemFields';
import { ROUTE_ACCESS } from '../../config/permissionStructure';

const Inventory = ({
    menu,
    setMenu,
    formatCurrency,
    settings,
    hasPermissionFor,
}) => {
    const [inventorySearch, setInventorySearch] = useState("");
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [visibleFields, setVisibleFields] = useState([]);

    // Load visible fields from local storage or default
    const loadFields = () => {
        const savedFields = localStorage.getItem('visibleInventoryFields');
        if (savedFields) {
            setVisibleFields(JSON.parse(savedFields));
        } else {
            setVisibleFields(getVisibleFieldKeys());
        }
    };

    useEffect(() => {
        loadFields();
        // Listen for updates from settings
        window.addEventListener('inventoryFieldsUpdated', loadFields);
        return () => window.removeEventListener('inventoryFieldsUpdated', loadFields);
    }, []);

    const filteredMenu = menu.filter((item) =>
        item.name?.toLowerCase().includes(inventorySearch.toLowerCase())
    );

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
            // Ensure numeric values are stored as numbers if needed, though form handles inputs as strings primarily
            // The dynamic form returns values as per input type, so number inputs should be numbers/strings.
            // Converting key price fields just in case
            price: parseFloat(formData.price || 0),
        };

        if (editingProduct) {
            setMenu(menu.map((m) => (m.id === editingProduct.id ? newItem : m)));
        } else {
            setMenu([...menu, newItem]);
        }
        setIsProductModalOpen(false);
        setEditingProduct(null);
    };

    const columns = [
        {
            header: "Item Details",
            key: "name",
            render: (value, item) => (
                <>
                    <div className="font-black text-gray-800 text-lg">{value}</div>
                    <div className="text-xs font-bold text-gray-400">ID: {item.id}</div>
                    {item.sku && <div className="text-[10px] text-gray-400">SKU: {item.sku}</div>}
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
            header: "Type",
            key: "productType",
            headerClassName: "text-center",
            className: "text-center",
            render: (value) => (
                <span className="text-xs font-bold text-gray-500 uppercase">{value || "Simple"}</span>
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

    if (canManage) {
        columns.push({
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
                        onClick={(e) => { e.stopPropagation(); setMenu(menu.filter((m) => m.id !== item.id)); }}
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                            <Package size={28} />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">
                            Menu Inventory
                        </h2>
                    </div>
                    <p className="text-gray-500 font-bold ml-1">Manage items, prices and availability</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                        <input
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder="Search items..."
                            className="w-full pl-12 pr-4 py-4 border-2 border-transparent bg-white rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>
                    {canManage && (
                        <button
                            onClick={handleOpenAddModal}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Add Item
                        </button>
                    )}
                </div>
            </div>

            <CommonTable
                columns={columns}
                data={filteredMenu}
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
                    title={editingProduct ? "Edit Item" : "Add New Item"}
                />
            )}
        </div>
    );
};

export default Inventory;
