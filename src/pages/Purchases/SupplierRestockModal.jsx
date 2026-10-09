import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Search, ShoppingBag, AlertTriangle, AlertCircle, CheckCircle2,
    Plus, Minus, ArrowRight, RefreshCw, Layers, DollarSign, SupplierIcon, Building2, Package
} from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';
import { SupplierService } from '../Suppliers/SupplierService';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-hot-toast';
import CommonSelect from '../../components/ui/CommonSelect';

const SupplierRestockModal = ({ isOpen, onClose, onProceedToDraft, initialSupplierId }) => {
    const { theme, isDark } = useTheme();
    const { activeBranchId, branches } = useApp();
    const selectedBranchId = activeBranchId || (branches && branches[0]?._id);
    const [suppliers, setSuppliers] = useState([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplierId || '');
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Overview data from API
    const [products, setProducts] = useState([]);
    const [summary, setSummary] = useState({ totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 });
    
    // Filters & Search
    const [activeFilter, setActiveFilter] = useState('ALL'); // ALL | LOW_STOCK | OUT_OF_STOCK
    const [searchQuery, setSearchQuery] = useState('');

    // Cart / Selected items for PO Draft: { productId: { item, qty, rate } }
    const [selectedItems, setSelectedItems] = useState({});

    // Load Suppliers list on mount
    useEffect(() => {
        if (!isOpen) return;
        SupplierService.getSuppliers()
            .then(res => {
                const list = res.data || res || [];
                setSuppliers(list);
                if (!selectedSupplierId && list.length > 0) {
                    setSelectedSupplierId(list[0]._id);
                }
            })
            .catch(err => console.error('Failed to load suppliers:', err));
    }, [isOpen]);

    // Load Supplier Products & Stock overview whenever selected supplier or navbar branch changes
    useEffect(() => {
        if (!isOpen || !selectedSupplierId) return;
        setLoading(true);
        PurchaseService.getSupplierProductsOverview({
            supplierId: selectedSupplierId,
            filter: activeFilter,
            branchId: selectedBranchId
        })
            .then(res => {
                setProducts(res.data || []);
                setSummary(res.summary || { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 });
                setSelectedSupplier(res.supplier || suppliers.find(s => String(s._id || s.id) === String(selectedSupplierId)));
            })
            .catch(err => {
                console.error(err);
                toast.error('Failed to load supplier products');
            })
            .finally(() => setLoading(false));
    }, [isOpen, selectedSupplierId, activeFilter, selectedBranchId]);

    // Handle "Restock" click: Auto calculate order shortfall
    const handleRestockClick = (product) => {
        const currentQty = selectedItems[product._id]?.qty || 0;
        const suggested = product.suggestedOrderQty || Math.max(1, (product.minStockLevel || 10) - (product.availableStock || 0));
        const newQty = currentQty > 0 ? currentQty + suggested : suggested;
        
        setSelectedItems(prev => ({
            ...prev,
            [product._id]: {
                product,
                qty: newQty,
                unitPrice: product.lastPurchaseRate || 0
            }
        }));
        toast.success(`Added ${product.name} (${newQty} ${product.unitName}) to draft`, { duration: 1500 });
    };

    // Handle manual quantity adjustment
    const handleQtyChange = (product, delta) => {
        const current = selectedItems[product._id]?.qty || 0;
        const updated = Math.max(0, current + delta);

        if (updated === 0) {
            const copy = { ...selectedItems };
            delete copy[product._id];
            setSelectedItems(copy);
        } else {
            setSelectedItems(prev => ({
                ...prev,
                [product._id]: {
                    product,
                    qty: updated,
                    unitPrice: product.lastPurchaseRate || 0
                }
            }));
        }
    };

    // Filter products by search query
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.itemCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (activeFilter === 'LOW_STOCK') return matchesSearch && p.stockStatus === 'LOW_STOCK';
            if (activeFilter === 'OUT_OF_STOCK') return matchesSearch && p.stockStatus === 'OUT_OF_STOCK';
            return matchesSearch;
        });
    }, [products, searchQuery, activeFilter]);

    // Calculate cart total
    const selectedCount = Object.keys(selectedItems).length;
    const estimatedTotal = Object.values(selectedItems).reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);

    const handleCreateOrder = () => {
        if (selectedCount === 0) {
            toast.error('Please select at least one product to create a purchase order');
            return;
        }
        if (!selectedSupplier) {
            toast.error('Please select a supplier');
            return;
        }
        
        const draftItems = Object.values(selectedItems).map(i => ({
            productId: i.product._id,
            productName: i.product.name,
            itemCode: i.product.itemCode,
            unitName: i.product.unitName,
            currentStock: i.product.availableStock,
            reorderLevel: i.product.minStockLevel,
            orderedQty: i.qty,
            unitPrice: i.unitPrice,
            taxRate: i.product.taxPercent || 0,
            discount: 0
        }));

        onProceedToDraft({
            supplier: selectedSupplier,
            items: draftItems
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
            <div className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border ${theme.surfaceBg} ${theme.borderLight} ${theme.textPrimary} overflow-hidden`}>
                
                {/* ── Modal Header ── */}
                <div className={`px-6 py-5 border-b flex items-center justify-between ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h2 className={`text-lg font-black tracking-tight ${theme.textHeading}`}>Supplier Restocking & PO Creator</h2>
                            <p className={`text-xs font-semibold ${theme.textMuted}`}>
                                Browse products, check stock shortfalls, and build purchase orders instantly.
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={onClose}
                        className={`p-2.5 rounded-full transition-all ${theme.mode === 'dark' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Supplier Selection & Stats Header Bar ── */}
                <div className={`p-6 border-b space-y-4 ${theme.borderLight} ${theme.surfaceBg}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Supplier Selector */}
                        <div className="flex items-center gap-3 min-w-[280px]">
                            <label className={`text-xs font-black uppercase tracking-wider shrink-0 ${theme.textMuted}`}>
                                Select Supplier:
                            </label>
                            <div className="flex-1 min-w-[220px]">
                                <CommonSelect
                                    options={suppliers.map(s => ({
                                        label: `${s.name} ${s.contactPerson ? `(${s.contactPerson})` : ''}`,
                                        value: s._id
                                    }))}
                                    value={selectedSupplierId}
                                    onChange={(val) => {
                                        setSelectedSupplierId(val);
                                        setSelectedItems({}); // Reset draft when supplier changes
                                    }}
                                    placeholder="Select Supplier..."
                                    searchable={true}
                                    searchPlaceholder="Search supplier..."
                                    size="sm"
                                />
                            </div>
                        </div>

                        {/* Metric Cards */}
                        <div className="flex items-center gap-3">
                            <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 bg-transparent ${theme.borderLight}`}>
                                <Package size={16} className="text-indigo-500" />
                                <div>
                                    <div className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Products</div>
                                    <div className="text-sm font-black text-indigo-500">{summary.totalProducts}</div>
                                </div>
                            </div>

                            <div className="px-4 py-2 rounded-2xl border flex items-center gap-2.5 bg-transparent border-amber-400/80 text-amber-600 dark:text-amber-400">
                                <AlertTriangle size={16} />
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-wider opacity-90">Low Stock</div>
                                    <div className="text-sm font-black">{summary.lowStockCount}</div>
                                </div>
                            </div>

                            <div className="px-4 py-2 rounded-2xl border flex items-center gap-2.5 bg-transparent border-rose-400/80 text-rose-600 dark:text-rose-400">
                                <AlertCircle size={16} />
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-wider opacity-90">Out of Stock</div>
                                    <div className="text-sm font-black">{summary.outOfStockCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Tabs & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        {/* Status Filter Pills */}
                        <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border w-full sm:w-auto ${theme.mode === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                            {[
                                { id: 'ALL', label: 'All Products' },
                                { id: 'LOW_STOCK', label: `Low Stock (${summary.lowStockCount})` },
                                { id: 'OUT_OF_STOCK', label: `Out of Stock (${summary.outOfStockCount})` }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setActiveFilter(f.id)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        activeFilter === f.id
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                                            : theme.mode === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-72">
                            <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search products or SKU..."
                                className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-bold border outline-none transition-all ${
                                    theme.mode === 'dark' ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                                }`}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Product List Grid ── */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <RefreshCw size={28} className="animate-spin text-indigo-500" />
                            <p className={`text-xs font-bold ${theme.textMuted}`}>Loading supplier catalog & inventory data...</p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="text-center py-16 opacity-60">
                            <Package size={40} className="mx-auto mb-3 opacity-40" />
                            <p className="text-sm font-bold">No products found matching filter</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredProducts.map(product => {
                                const inCartQty = selectedItems[product._id]?.qty || 0;
                                const isLow = product.stockStatus === 'LOW_STOCK';
                                const isOut = product.stockStatus === 'OUT_OF_STOCK';

                                return (
                                    <div
                                        key={product._id}
                                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                            inCartQty > 0
                                                ? theme.mode === 'dark' ? 'bg-indigo-950/30 border-indigo-500/60' : 'bg-indigo-50/70 border-indigo-300'
                                                : theme.mode === 'dark' ? 'bg-slate-800/50 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h4 className={`text-sm font-black tracking-tight ${theme.textHeading}`}>{product.name}</h4>
                                                    <p className={`text-[11px] font-medium ${theme.textMuted}`}>
                                                        Category: {product.categoryName} {product.itemCode ? `• SKU: ${product.itemCode}` : ''}
                                                    </p>
                                                </div>

                                                {/* Stock Status Tag - Clean transparent bg inside border */}
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border bg-transparent ${
                                                    isOut
                                                        ? 'border-rose-500 text-rose-600 dark:text-rose-400 font-black'
                                                        : isLow
                                                            ? 'border-amber-500 text-amber-600 dark:text-amber-400 font-black'
                                                            : 'border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black'
                                                }`}>
                                                    {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                                                </span>
                                            </div>

                                            {/* Stock & Rate Info */}
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-semibold">
                                                <span className={isOut ? 'text-rose-500 font-bold' : isLow ? 'text-amber-500 font-bold' : theme.textPrimary}>
                                                    Available: <strong className="font-black">{product.availableStock}</strong> {product.unitName}
                                                </span>
                                                <span className={theme.textMuted}>
                                                    Minimum: {product.minStockLevel} {product.unitName}
                                                </span>
                                                <span className="text-indigo-500 font-bold">
                                                    Last Rate: {formatCurrency(product.lastPurchaseRate)}
                                                </span>
                                            </div>

                                            {/* Pending PO Notification if item is on an open PO */}
                                            {product.pendingQtyOnPO > 0 && (
                                                <div className="mt-2 px-2.5 py-1 rounded-xl bg-transparent border border-blue-500/50 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center gap-1.5">
                                                    <AlertCircle size={13} />
                                                    Pending on open PO: {product.pendingQtyOnPO} {product.unitName} (avoid duplicate order)
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons: Restock vs Add More / Quantity Adjuster */}
                                        <div className={`flex items-center justify-between pt-2 border-t ${theme.borderLight}`}>
                                            {inCartQty > 0 ? (
                                                <div className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold">
                                                    <button onClick={() => handleQtyChange(product, -1)} className="hover:opacity-75">
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="px-2 font-black text-sm">{inCartQty} {product.unitName}</span>
                                                    <button onClick={() => handleQtyChange(product, 1)} className="hover:opacity-75">
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    {/* Restock Button (Auto calculate shortfall) */}
                                                    <button
                                                        onClick={() => handleRestockClick(product)}
                                                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                                                    >
                                                        <RefreshCw size={13} />
                                                        Restock ({product.suggestedOrderQty} {product.unitName})
                                                    </button>

                                                    {/* Add More Button (Manual 1 Qty add) */}
                                                    <button
                                                        onClick={() => handleQtyChange(product, 1)}
                                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                            theme.mode === 'dark' ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                                                        }`}
                                                    >
                                                        + Add custom
                                                    </button>
                                                </div>
                                            )}

                                            {inCartQty > 0 && (
                                                <span className="text-xs font-black text-indigo-500">
                                                    {formatCurrency(inCartQty * product.lastPurchaseRate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Sticky Bottom Drawer (Order Summary & Proceed Button) ── */}
                <div className={`p-5 border-t flex items-center justify-between gap-4 ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50'}`}>
                    <div>
                        <div className="text-xs font-black uppercase tracking-wider text-indigo-500">
                            {selectedCount} product{selectedCount === 1 ? '' : 's'} selected
                        </div>
                        <div className={`text-lg font-black ${theme.textHeading}`}>
                            Estimated Order Value: <span className="text-indigo-500">{formatCurrency(estimatedTotal)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                                theme.mode === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateOrder}
                            disabled={selectedCount === 0}
                            className={`px-7 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                                selectedCount > 0
                                    ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                                    : 'bg-slate-400 opacity-50 cursor-not-allowed'
                            }`}
                        >
                            Create Order <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupplierRestockModal;
