import React, { useState, useEffect, useMemo } from "react";
import {
    X, Save, Plus, Trash2, Search, Calculator,
    Calendar, User, Building, FileText, ShoppingCart,
    Package, Info, Tag, ChevronDown, Check
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { PurchaseService } from "../../services/PurchaseService";
import { SupplierService } from "../Suppliers/SupplierService";
import { itemService, branchService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";

const PurchaseForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeBranchId, formatCurrency } = useApp();
    const isEditing = !!id;

    // --- State ---
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [stockItems, setStockItems] = useState([]);

    const [formData, setFormData] = useState({
        supplierId: "",
        branchId: activeBranchId || "",
        supplierInvoiceNumber: "",
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        notes: "",
        items: [],
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceAmount: 0
    });

    const [itemSearch, setItemSearch] = useState("");
    const [showResults, setShowResults] = useState(false);

    // --- Initialize Data ---
    useEffect(() => {
        if (user?.shop_id) {
            fetchInitialData();
        }
        if (isEditing) {
            loadPurchase();
        }
    }, [user?.shop_id, id]);

    const fetchInitialData = async () => {
        try {
            const [suppliersData, branchesData] = await Promise.all([
                SupplierService.getSuppliers(user.shop_id),
                branchService.getBranchesByShopId(user.shop_id)
            ]);
            setSuppliers(suppliersData);
            setBranches(branchesData);

            // Fetch STOCK items for search
            const itemsRes = await itemService.getItems({
                filters: { shopid: user.shop_id, itemType: "STOCK" },
                limit: 100
            });
            setStockItems(itemsRes.data || []);
        } catch (error) {
            console.error("Error fetching form data:", error);
        }
    };

    const loadPurchase = async () => {
        setLoading(true);
        try {
            const data = await PurchaseService.getPurchaseById(id);
            const p = data.purchase;
            setFormData({
                ...p,
                supplierId: p.supplierId?._id || p.supplierId,
                branchId: p.branchId?._id || p.branchId,
                invoiceDate: new Date(p.invoiceDate).toISOString().split('T')[0],
                dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : "",
                items: data.items.map(it => ({
                    ...it,
                    itemId: it.itemId?._id || it.itemId,
                    name: it.itemId?.name || "Unknown Item",
                    itemCode: it.itemId?.itemCode || ""
                }))
            });
        } catch (error) {
            console.error("Error loading purchase:", error);
            alert("Failed to load purchase details");
        } finally {
            setLoading(false);
        }
    };

    // --- Calculations ---
    const totals = useMemo(() => {
        const sub = formData.items.reduce((acc, it) => acc + (it.quantity * it.purchasePrice), 0);
        const tax = formData.items.reduce((acc, it) => acc + (it.taxAmount || 0), 0);
        const disc = formData.items.reduce((acc, it) => acc + (it.discountAmount || 0), 0);
        const grand = sub + tax - disc;
        return { sub, tax, disc, grand };
    }, [formData.items]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            subtotal: totals.sub,
            taxTotal: totals.tax,
            discountTotal: totals.disc,
            grandTotal: totals.grand,
            balanceAmount: totals.grand - (prev.paidAmount || 0)
        }));
    }, [totals]);

    // --- Handlers ---
    const handleAddItem = (item) => {
        const existing = formData.items.find(it => it.itemId === item._id);
        if (existing) {
            alert("Item already added. Adjust quantity in the list.");
            return;
        }

        const newItem = {
            itemId: item._id,
            name: item.name,
            itemCode: item.itemCode,
            quantity: 1,
            purchasePrice: item.pricing?.purchasePrice || 0,
            taxAmount: 0,
            discountAmount: 0,
            batchNo: "",
            expiryDate: ""
        };

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
        setItemSearch("");
        setShowResults(false);
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) {
            alert("Please add at least one item.");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...formData,
                shopId: user.shop_id,
            };
            if (isEditing) {
                await PurchaseService.updatePurchase(id, payload);
            } else {
                await PurchaseService.createPurchase(payload);
            }
            navigate("/purchases");
        } catch (error) {
            console.error("Save error:", error);
            alert(error.message || "Failed to save purchase");
        } finally {
            setLoading(false);
        }
    };

    const filteredSearchItems = stockItems.filter(it =>
        it.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        it.itemCode.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 5);

    if (loading && isEditing) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin text-indigo-600"><ShoppingCart size={40} /></div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full bg-gray-50/30 overflow-y-auto">
            <div className="max-w-[1400px] mx-auto">
                {/* Back Link / Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate("/purchases")}
                        className="text-gray-400 font-bold hover:text-indigo-600 flex items-center gap-2 transition-colors uppercase text-xs tracking-widest"
                    >
                        <ShoppingCart size={14} /> Back to Invoices
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-800 uppercase">
                            {isEditing ? "Edit Purchase" : "New Purchase Entry"}
                        </h1>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Invoice Details & Stock Update</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                    {/* section: General Info */}
                    <div className="bg-white rounded-[40px] shadow-2xl p-8 md:p-12 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    <User size={12} /> Supplier *
                                </label>
                                <select
                                    required
                                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black text-gray-700 appearance-none"
                                    value={formData.supplierId}
                                    onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    <Building size={12} /> Branch *
                                </label>
                                <select
                                    required
                                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black text-gray-700 appearance-none"
                                    value={formData.branchId}
                                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                >
                                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    <FileText size={12} /> Invoice No *
                                </label>
                                <input
                                    required
                                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black text-gray-700"
                                    value={formData.supplierInvoiceNumber}
                                    onChange={e => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                                    placeholder="INV/2024/001"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    <Calendar size={12} /> Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black text-gray-700"
                                    value={formData.invoiceDate}
                                    onChange={e => setFormData({ ...formData, invoiceDate: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* section: Item Entry */}
                    <div className="bg-white rounded-[40px] shadow-2xl p-8 md:p-12 border border-gray-100 flex flex-col gap-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 pb-8">
                            <h2 className="text-xl font-black text-gray-800 flex items-center gap-3 uppercase tracking-tight">
                                <Package className="text-indigo-600" /> Items List
                            </h2>

                            {/* Search for Adding Items */}
                            <div className="relative w-full md:w-96">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        value={itemSearch}
                                        onChange={(e) => {
                                            setItemSearch(e.target.value);
                                            setShowResults(true);
                                        }}
                                        onFocus={() => setShowResults(true)}
                                        placeholder="Add items to invoice..."
                                        className="w-full pl-12 pr-4 py-4 bg-indigo-50/30 border-2 border-indigo-100 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                    />
                                </div>
                                {showResults && itemSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50 animate-in slide-in-from-top-2 duration-200">
                                        {filteredSearchItems.map(item => (
                                            <button
                                                key={item._id}
                                                type="button"
                                                onClick={() => handleAddItem(item)}
                                                className="w-full p-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div>
                                                    <div className="font-black text-gray-800">{item.name}</div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase">{item.itemCode}</div>
                                                </div>
                                                <Plus size={16} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                                            </button>
                                        ))}
                                        {filteredSearchItems.length === 0 && (
                                            <div className="p-4 text-center text-gray-400 font-bold text-xs uppercase">No items found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto min-h-[200px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                                        <th className="py-4 px-2">#</th>
                                        <th className="py-4 px-2">Item Description</th>
                                        <th className="py-4 px-2 w-24">Qty</th>
                                        <th className="py-4 px-2 w-32">Purchase Price</th>
                                        <th className="py-4 px-2 w-28">Batch / Exp</th>
                                        <th className="py-4 px-2 text-right">Total</th>
                                        <th className="py-4 px-2 text-right w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {formData.items.map((it, idx) => (
                                        <tr key={it.itemId} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-5 px-2 font-bold text-gray-300">{idx + 1}</td>
                                            <td className="py-5 px-2">
                                                <div className="font-black text-gray-800">{it.name}</div>
                                                <div className="text-[10px] font-bold text-gray-400">{it.itemCode}</div>
                                            </td>
                                            <td className="py-5 px-2 text-sm">
                                                <input
                                                    type="number"
                                                    value={it.quantity}
                                                    onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value || 0))}
                                                    className="w-full p-2 bg-gray-50 rounded-lg font-black text-indigo-600 border border-transparent focus:border-indigo-400 outline-none text-center"
                                                />
                                            </td>
                                            <td className="py-5 px-2">
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        value={it.purchasePrice}
                                                        onChange={e => handleItemChange(idx, 'purchasePrice', parseFloat(e.target.value || 0))}
                                                        className="w-full pl-6 p-2 bg-gray-50 rounded-lg font-black text-gray-700 border border-transparent focus:border-indigo-400 outline-none"
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 space-y-1">
                                                <input
                                                    placeholder="Batch"
                                                    value={it.batchNo}
                                                    onChange={e => handleItemChange(idx, 'batchNo', e.target.value)}
                                                    className="w-full p-1.5 bg-gray-50 text-[10px] rounded border-transparent focus:border-indigo-200 uppercase font-black placeholder:font-medium outline-none border"
                                                />
                                                <input
                                                    type="date"
                                                    value={it.expiryDate}
                                                    onChange={e => handleItemChange(idx, 'expiryDate', e.target.value)}
                                                    className="w-full p-1.5 bg-gray-50 text-[10px] rounded border-transparent focus:border-indigo-200 outline-none border"
                                                />
                                            </td>
                                            <td className="py-5 px-2 text-right">
                                                <div className="font-black text-gray-800">
                                                    {formatCurrency ? formatCurrency(it.quantity * it.purchasePrice) : `₹${(it.quantity * it.purchasePrice).toFixed(2)}`}
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {formData.items.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="py-12 text-center text-gray-300 font-bold uppercase tracking-widest text-xs italic">
                                                Your invoice is empty. Add items from the search above.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* section: Footer Totals & Save */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Notes Area */}
                        <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-100">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 block mb-3">Optional Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any additional information about this purchase..."
                                className="w-full min-h-[140px] p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold text-gray-700 resize-none"
                            />
                        </div>

                        {/* Summary Column */}
                        <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-100 space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Subtotal</span>
                                <span className="font-black text-gray-800">{formatCurrency ? formatCurrency(formData.subtotal) : `₹${formData.subtotal.toFixed(2)}`}</span>
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest font-black">Tax Total (+)</span>
                                <input
                                    type="number"
                                    value={formData.taxTotal}
                                    onChange={e => setFormData({ ...formData, taxTotal: parseFloat(e.target.value || 0) })}
                                    className="text-right font-black text-gray-800 bg-gray-50 min-w-[80px] p-2 rounded-lg outline-none"
                                />
                            </div>
                            <div className="flex justify-between items-center px-2 border-b border-gray-100 pb-4">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Discount (-)</span>
                                <input
                                    type="number"
                                    value={formData.discountTotal}
                                    onChange={e => setFormData({ ...formData, discountTotal: parseFloat(e.target.value || 0) })}
                                    className="text-right font-black text-indigo-600 bg-indigo-50 min-w-[80px] p-2 rounded-lg outline-none"
                                />
                            </div>
                            <div className="flex justify-between items-center bg-gray-900 rounded-3xl p-6 text-white shadow-2xl">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Grand Total</div>
                                    <div className="text-3xl font-black">{formatCurrency ? formatCurrency(formData.grandTotal) : `₹${formData.grandTotal.toFixed(2)}`}</div>
                                </div>
                                <Calculator size={32} className="opacity-20" />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-6 rounded-3xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-2xl ${loading
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-95"
                                    }`}
                            >
                                {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                <Save size={24} />
                                {isEditing ? "UPDATE INVOICE" : "SAVE PURCHASE"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseForm;
