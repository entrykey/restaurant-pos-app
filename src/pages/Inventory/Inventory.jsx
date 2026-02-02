import React, { useState } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Globe, X } from 'lucide-react';
import CommonTable from '../../components/CommonTable';

const Inventory = ({
    menu,
    setMenu,
    formatCurrency,
    settings,
    hasPermission
}) => {
    const [inventorySearch, setInventorySearch] = useState("");
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [selectedProductCategory, setSelectedProductCategory] = useState("Main Course");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [prodSellingType, setProdSellingType] = useState("Standard");
    const [prodVariants, setProdVariants] = useState([{ name: "", price: "" }]);
    const [prodExtras, setProdExtras] = useState([]);

    const filteredMenu = menu.filter((item) =>
        item.name.toLowerCase().includes(inventorySearch.toLowerCase())
    );

    const categories = ["Main Course", "Starters", "Breads", "Rice", "Desserts", "Drinks", "Sea Food", "Grills", "Biriyani"];

    const handleOpenAddModal = () => {
        setEditingProduct(null);
        setSelectedProductCategory("Main Course");
        setNewCategoryName("");
        setProdSellingType("Standard");
        setProdVariants([{ name: "", price: "" }]);
        setProdExtras([]);
        setIsProductModalOpen(true);
    };

    const handleEditItem = (item) => {
        setEditingProduct(item);
        setSelectedProductCategory(item.category);
        setNewCategoryName("");
        setProdSellingType(item.sellingType || "Standard");
        setProdVariants(item.variants ? [...item.variants] : [{ name: "", price: "" }]);
        setProdExtras(item.availableExtras ? [...item.availableExtras] : []);
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = () => {
        const name = document.getElementById("prod-name").value;
        const taxPercent = document.getElementById("prod-tax").value;

        let price = 0;
        let pricePerUnit = 0;
        let unitName = "";

        if (prodSellingType === "Standard") {
            price = parseFloat(document.getElementById("prod-price").value || 0);
        } else if (prodSellingType === "Weight") {
            pricePerUnit = parseFloat(document.getElementById("prod-price-unit").value || 0);
            unitName = document.getElementById("prod-unit-name").value;
        }

        let finalCategory = selectedProductCategory;
        if (selectedProductCategory === "NEW_CATEGORY_TRIGGER") {
            finalCategory = newCategoryName.trim() || "Uncategorized";
        }

        if (name) {
            const newItem = {
                id: editingProduct ? editingProduct.id : Date.now().toString(),
                name,
                category: finalCategory,
                taxPercent: parseFloat(taxPercent) || settings.defaultTaxPercent,
                sellingType: prodSellingType,
                price,
                pricePerUnit,
                unitName,
                variants: prodVariants
                    .filter((v) => v.name && v.price)
                    .map((v) => ({ ...v, price: parseFloat(v.price) })),
                availableExtras: prodExtras
                    .filter((e) => e.name && e.price)
                    .map((e) => ({ ...e, price: parseFloat(e.price) })),
                isAvailableOnline: editingProduct ? editingProduct.isAvailableOnline : true,
            };

            if (editingProduct) {
                setMenu(menu.map((m) => (m.id === editingProduct.id ? newItem : m)));
            } else {
                setMenu([...menu, newItem]);
            }
            setIsProductModalOpen(false);
            setEditingProduct(null);
        }
    };

    const columns = [
        {
            header: "Item Details",
            key: "name",
            render: (value, item) => (
                <>
                    <div className="font-black text-gray-800 text-lg">{value}</div>
                    <div className="text-xs font-bold text-gray-400">ID: {item.id}</div>
                </>
            )
        },
        {
            header: "Category",
            key: "category",
            render: (value) => (
                <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                    {value}
                </span>
            )
        },
        {
            header: "Price Structure",
            key: "price",
            headerClassName: "text-center",
            className: "text-center",
            render: (_, item) => (
                <>
                    {item.sellingType === "Standard" && (
                        <div className="font-black text-gray-800">{formatCurrency(item.price)}</div>
                    )}
                    {item.sellingType === "Weight" && (
                        <div className="flex flex-col items-center">
                            <span className="font-black text-gray-800">{formatCurrency(item.pricePerUnit)}</span>
                            <span className="text-[10px] font-bold text-gray-400 italic">per {item.unitName}</span>
                        </div>
                    )}
                    {["Portion", "Volume"].includes(item.sellingType) && (
                        <div className="flex flex-col items-center">
                            <span className="font-black text-indigo-600">Variants</span>
                            <span className="text-[10px] font-bold text-gray-400">{item.variants?.length} Sizes</span>
                        </div>
                    )}
                </>
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

    if (hasPermission("MANAGE_INVENTORY")) {
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
                    {hasPermission("MANAGE_INVENTORY") && (
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-lg z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-10 rounded-[50px] w-full max-w-2xl shadow-2xl h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-3xl font-black text-gray-800">
                                {editingProduct ? "Edit" : "Add New"} Item
                            </h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Item Name</label>
                                    <input
                                        id="prod-name"
                                        defaultValue={editingProduct?.name || ""}
                                        placeholder="e.g. Butter Chicken"
                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-500 bg-gray-50/50 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Category</label>
                                    <select
                                        id="prod-category"
                                        value={selectedProductCategory}
                                        onChange={(e) => setSelectedProductCategory(e.target.value)}
                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50/50 outline-none focus:border-indigo-500 font-bold"
                                    >
                                        {categories.map((c) => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                        <option value="NEW_CATEGORY_TRIGGER">+ Add New Category...</option>
                                    </select>
                                </div>
                            </div>

                            {selectedProductCategory === "NEW_CATEGORY_TRIGGER" && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <input
                                        autoFocus
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Type new category name..."
                                        className="w-full p-4 border-2 border-indigo-500 rounded-2xl outline-none shadow-indigo-100 shadow-inner font-bold"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Selling Type</label>
                                <div className="grid grid-cols-4 gap-3">
                                    {["Standard", "Portion", "Weight", "Volume"].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setProdSellingType(type)}
                                            className={`py-4 rounded-2xl text-xs font-black border-2 transition-all ${prodSellingType === type
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                                                : "bg-white border-gray-100 text-gray-500 hover:border-indigo-100"
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                                {prodSellingType === "Standard" && (
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Standard Price (INR)</label>
                                        <input
                                            id="prod-price"
                                            type="number"
                                            defaultValue={editingProduct?.price || ""}
                                            placeholder="0.00"
                                            className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none bg-white font-black text-xl"
                                        />
                                    </div>
                                )}

                                {prodSellingType === "Weight" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Price Per Unit</label>
                                            <input
                                                id="prod-price-unit"
                                                type="number"
                                                defaultValue={editingProduct?.pricePerUnit || ""}
                                                placeholder="e.g. 500"
                                                className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none bg-white font-black"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Unit Name</label>
                                            <input
                                                id="prod-unit-name"
                                                defaultValue={editingProduct?.unitName || "kg"}
                                                placeholder="e.g. kg"
                                                className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none bg-white font-black"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(prodSellingType === "Portion" || prodSellingType === "Volume") && (
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">{prodSellingType} Variants</label>
                                        {prodVariants.map((v, i) => (
                                            <div key={i} className="flex gap-3">
                                                <input
                                                    value={v.name}
                                                    onChange={(e) => {
                                                        const n = [...prodVariants];
                                                        n[i].name = e.target.value;
                                                        setProdVariants(n);
                                                    }}
                                                    placeholder={prodSellingType === "Portion" ? "Size (e.g. Half)" : "Volume (e.g. 500ml)"}
                                                    className="flex-1 p-4 border-2 border-gray-100 rounded-2xl text-sm font-bold outline-none bg-white"
                                                />
                                                <input
                                                    type="number"
                                                    value={v.price}
                                                    onChange={(e) => {
                                                        const n = [...prodVariants];
                                                        n[i].price = e.target.value;
                                                        setProdVariants(n);
                                                    }}
                                                    placeholder="Price"
                                                    className="w-32 p-4 border-2 border-gray-100 rounded-2xl text-sm font-black outline-none bg-white"
                                                />
                                                {prodVariants.length > 1 && (
                                                    <button
                                                        onClick={() => setProdVariants(prodVariants.filter((_, idx) => idx !== i))}
                                                        className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            onClick={() => setProdVariants([...prodVariants, { name: "", price: "" }])}
                                            className="text-indigo-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-4 ml-1 hover:text-indigo-800 transition-colors"
                                        >
                                            <Plus size={16} /> Add Variant
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1">Tax Rate (%)</label>
                                <input
                                    id="prod-tax"
                                    type="number"
                                    defaultValue={editingProduct ? editingProduct.taxPercent : settings.defaultTaxPercent}
                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-500 bg-gray-50/50 font-bold"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        setIsProductModalOpen(false);
                                        setEditingProduct(null);
                                    }}
                                    className="flex-1 py-5 font-black text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSaveProduct}
                                    className="flex-2 py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all text-lg"
                                >
                                    Save Product
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
