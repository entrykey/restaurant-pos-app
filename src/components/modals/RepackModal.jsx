import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { PackageOpen, Plus, Combine, Loader2, RefreshCw, Printer, Layers, Scale, Hash } from 'lucide-react';
import { inventoryService, itemService, unitService, categoryService, api } from '../../services/api';
import toast from 'react-hot-toast';
import CommonSelect from '../ui/CommonSelect';
import BarcodePrintDialog from './BarcodePrintDialog';

const RepackModal = ({ isOpen, onClose, sourceItem, sourceStock = 0, onRepackComplete }) => {
    const { theme } = useTheme();
    const { activeBranchId, currentShopId } = useApp();
    const navigate = useNavigate();
    
    const [mode, setMode] = useState('existing'); // 'existing' | 'new'
    const [existingItems, setExistingItems] = useState([]);
    const [loadingExisting, setLoadingExisting] = useState(false);
    
    // Form Data
    const [targetItemId, setTargetItemId] = useState('');
    const [packsToCreate, setPacksToCreate] = useState('');
    const [amountPerPack, setAmountPerPack] = useState('');
    
    // New Item specific data
    const [newItemName, setNewItemName] = useState('');
    const [newItemBarcode, setNewItemBarcode] = useState('');
    const [isNameEdited, setIsNameEdited] = useState(false);
    const [isBarcodeEdited, setIsBarcodeEdited] = useState(false);
    const [newItemPrice, setNewItemPrice] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [unitId, setUnitId] = useState('');
    
    // Dependencies for new item
    const [categories, setCategories] = useState([]);
    const [units, setUnits] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [barcodePrintDialog, setBarcodePrintDialog] = useState({
        isOpen: false,
        copies: 1,
        item: null,
        barcode: null,
        includeName: true,
        includeCode: true,
        includePrice: true,
        includeMRP: false,
        includeLogo: true,
        includeShopName: true,
        includeBatch: false,
        includeExpiry: false,
        includeUnit: true,
        showNameLabel: false,
        showCodeLabel: false,
        showPriceLabel: false,
        showMRPLabel: false,
        showBatchLabel: false,
        showExpiryLabel: false,
        showUnitLabel: false,
        batchOverride: "",
        expiryOverride: "",
        unitValueOverride: "",
        customText: "",
        layout: "ROWS",
        labelWidth: 50,
        labelHeight: 25,
        labelGapX: 2,
        labelGapY: 2,
        barcodeHeight: 30,
        baseFontSize: 10,
        printMode: 'ROLL',
        labelsPerRow: 1,
        elementsOrder: ["shopName", "logo", "barcode", "name", "code", "unit", "price", "mrp", "batch", "expiry", "custom"]
    });

    useEffect(() => {
        if (isOpen && sourceItem) {
            fetchExistingRepacks();
            if (mode === 'new') {
                fetchDependencies();
            }
        } else {
            resetForm();
        }
    }, [isOpen, sourceItem, mode]);

    useEffect(() => {
        if (mode === 'new' && sourceItem) {
            const unitObj = units.find(u => u._id === unitId);
            const unitName = unitObj?.name || "Units";
            if (!isNameEdited) {
                const generatedName = `${sourceItem.name || 'Item'} ${amountPerPack} ${unitName} Pack`.trim();
                setNewItemName(generatedName);
            }
            if (!isBarcodeEdited) {
                setNewItemBarcode(sourceItem.barcode || `RPK${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`);
            }
        }
    }, [amountPerPack, unitId, units, sourceItem, mode, isNameEdited, isBarcodeEdited]);

    const fetchExistingRepacks = async () => {
        if (!sourceItem) return;
        setLoadingExisting(true);
        try {
            // We need manufactured items whose recipe contains the sourceItem.
            // For now, we'll fetch all manufactured items and filter if the API doesn't support specific ingredient filtering easily.
            // Ideally, we'd have a specific endpoint or use filters if supported.
            // Let's assume itemService.getItems handles basic fetching.
            const response = await itemService.getItems({
                page: 1, limit: 100, filters: { itemType: 'MANUFACTURED', shopId: currentShopId }
            });
            const items = Array.isArray(response) ? response : (response.data || []);
            
            // We can't perfectly filter by recipe purely on frontend if recipes are separate, 
            // but the backend processRepack adds ingredients to the Item object (in getItems aggregation).
            const repacks = items.filter(i => 
                i.ingredients && i.ingredients.some(ing => 
                    String(ing.rawItemId || ing.itemId?._id || ing.itemId) === String(sourceItem._id || sourceItem.id)
                )
            );
            setExistingItems(repacks);
            
            if (repacks.length > 0 && !targetItemId) {
                setTargetItemId(repacks[0]._id || repacks[0].id);
            }
        } catch (error) {
            console.error("Failed to fetch existing repacks", error);
        } finally {
            setLoadingExisting(false);
        }
    };

    const fetchDependencies = async () => {
        try {
            const cats = await categoryService.getCategories({ shopId: currentShopId });
            const categoriesData = Array.isArray(cats) ? cats : (cats.data || []);
            setCategories(categoriesData);
            
            const uns = await unitService.getUnits();
            const unitsData = Array.isArray(uns) ? uns : (uns.data || []);
            setUnits(unitsData);
            
            if (!categoryId) {
                const sCatId = sourceItem?.categoryId?._id || sourceItem?.categoryId;
                if (sCatId && categoriesData.some(c => c._id === sCatId)) {
                    setCategoryId(sCatId);
                } else if (categoriesData.length > 0) {
                    setCategoryId(categoriesData[0]._id);
                }
            }
            if (!unitId) {
                const sUnitId = sourceItem?.unitId?._id || sourceItem?.unitId;
                if (sUnitId && unitsData.some(u => u._id === sUnitId)) {
                    setUnitId(sUnitId);
                } else if (unitsData.length > 0) {
                    setUnitId(unitsData[0]._id);
                }
            }
        } catch (error) {
            console.error("Failed to fetch dependencies", error);
        }
    };

    const resetForm = () => {
        setMode('existing');
        setTargetItemId('');
        setPacksToCreate('');
        setAmountPerPack('');
        setNewItemName('');
        setIsNameEdited(false);
        setNewItemPrice('');
        setCategoryId('');
        setUnitId('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!packsToCreate || !amountPerPack) {
            toast.error("Quantity and amount per pack are required");
            return;
        }

        if (mode === 'existing' && !targetItemId) {
            toast.error("Please select an existing item to repack into");
            return;
        }

        if (mode === 'new' && (!newItemName || !categoryId || !unitId || !newItemPrice)) {
            toast.error("Please fill all details for the new item");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                sourceItemId: sourceItem._id || sourceItem.id,
                branchId: activeBranchId,
                packsToCreate: Number(packsToCreate),
                amountPerPack: Number(amountPerPack),
                targetItemId: mode === 'existing' ? targetItemId : null,
                newItemDetails: mode === 'new' ? {
                    name: newItemName,
                    categoryId,
                    unitId,
                    pricing: {
                        sellingPrice: Number(newItemPrice) || 0,
                        mrp: Number(newItemPrice) || 0,
                        purchasePrice: 0
                    },
                    itemCode: `RPK-${Date.now().toString().slice(-6)}`,
                    barcode: newItemBarcode
                } : null
            };

            const res = await inventoryService.repackItem(payload);
            toast.success("Repack successful!");
            
            if (mode === 'new') {
                const unitObj = units.find(u => u._id === unitId);
                const printItem = {
                    _id: res.newTargetId,
                    name: newItemName,
                    itemCode: `RPK-${Date.now().toString().slice(-6)}`,
                    pricing: {
                        sellingPrice: Number(newItemPrice) || 0,
                        mrp: Number(newItemPrice) || 0
                    }
                };

                let barcodeData = await itemService.getPreviewBarcode(newItemBarcode);
                const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
                const fullUrl = barcodeData.imageUrl.startsWith("http") ? barcodeData.imageUrl : `${root}${barcodeData.imageUrl}`;

                setBarcodePrintDialog(prev => ({
                    ...prev,
                    isOpen: true,
                    item: printItem,
                    barcode: { code: newItemBarcode, fullUrl },
                    unitValueOverride: `${amountPerPack} ${unitObj?.name || ''}`
                }));
            } else {
                onRepackComplete();
                onClose();
            }
        } catch (error) {
            toast.error(error.message || "Failed to repack item");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!sourceItem) return null;

    const sourceUnit = sourceItem.unitId?.name || "Units";
    const totalDeduction = (Number(packsToCreate) || 0) * (Number(amountPerPack) || 0);
    const remainingBalance = sourceStock - totalDeduction;
    const maxPacks = (Number(amountPerPack) || 0) > 0 ? Math.floor(sourceStock / Number(amountPerPack)) : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="max-w-2xl mx-auto"
            title={
                <div className="flex items-center gap-3">
                    <div className={`p-2 bg-indigo-500/10 text-indigo-500 rounded-lg`}>
                        <PackageOpen size={24} />
                    </div>
                    <span>Repack <span className={`font-black text-indigo-500`}>{sourceItem.name}</span></span>
                </div>
            }
        >
            <div className="w-full">
                <div className={`flex gap-2 p-1.5 ${theme.inputBg} rounded-xl mb-6`}>
                    <button
                        type="button"
                        onClick={() => setMode('existing')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'existing' ? `${theme.surfaceBg} ${theme.textHeading} shadow-sm border ${theme.borderLight}` : `${theme.textSecondary} hover:${theme.textPrimary}`}`}
                    >
                        Use Existing Item
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('new')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'new' ? `${theme.surfaceBg} ${theme.textHeading} shadow-sm border ${theme.borderLight}` : `${theme.textSecondary} hover:${theme.textPrimary}`}`}
                    >
                        Create New Item
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-indigo-500/5 p-6 rounded-[32px] border border-indigo-500/10 mb-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="space-y-1">
                                <h4 className={`text-sm font-black ${theme.textHeading}`}>Repack Quantities</h4>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Source: {sourceItem.name}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Current Stock</div>
                                <div className="text-xl font-black text-indigo-500">
                                    {sourceStock} <span className="text-xs opacity-60">{sourceUnit}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <Scale size={12} /> Amount per pack ({sourceUnit})
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        value={amountPerPack}
                                        onChange={(e) => setAmountPerPack(e.target.value)}
                                        className={`w-full p-4 pr-16 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black text-lg ${theme.inputBg} ${theme.textPrimary}`}
                                        placeholder="0.00"
                                        required
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-xl text-[10px] font-black uppercase border border-indigo-500/20">
                                        {sourceUnit}
                                    </div>
                                </div>
                                {(Number(amountPerPack) || 0) > 0 && (
                                    <div className="text-[10px] font-black text-emerald-500/80 px-1 flex items-center gap-1.5">
                                        <Layers size={10} /> Max possible: {maxPacks} packs
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <Hash size={12} /> Total Packs to Create
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        min="1"
                                        max={maxPacks > 0 ? maxPacks : undefined}
                                        value={packsToCreate}
                                        onChange={(e) => setPacksToCreate(e.target.value)}
                                        className={`w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black text-lg ${theme.inputBg} ${theme.textPrimary}`}
                                        placeholder="0"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {totalDeduction > 0 && (
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="p-5 bg-red-500/5 rounded-3xl border border-red-500/10 space-y-2">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-red-400 opacity-70">Total To Use</div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-2xl font-black text-red-500">-{totalDeduction}</span>
                                        <span className="text-xs font-black text-red-400/60 uppercase">{sourceUnit}</span>
                                    </div>
                                </div>
                                <div className={`p-5 rounded-3xl border border-indigo-500/10 space-y-2 ${remainingBalance < 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-indigo-500/5'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-widest ${remainingBalance < 0 ? 'text-red-400' : 'text-indigo-400'} opacity-70`}>Remaining</div>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`text-2xl font-black ${remainingBalance < 0 ? 'text-red-500' : theme.textPrimary}`}>{remainingBalance}</span>
                                        <span className={`text-xs font-black uppercase ${remainingBalance < 0 ? 'text-red-400/60' : theme.textMuted}`}>{sourceUnit}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {mode === 'existing' ? (
                        <div>
                            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textSecondary}`}>
                                Select Target Item
                            </label>
                            {loadingExisting ? (
                                <div className={`p-3 text-center text-sm ${theme.textSecondary}`}>Loading existing repacks...</div>
                            ) : existingItems.length > 0 ? (
                                <CommonSelect
                                    options={existingItems}
                                    value={targetItemId}
                                    onChange={(val) => setTargetItemId(val)}
                                    labelKey="name"
                                    valueKey="_id"
                                    placeholder="Select Target Item..."
                                    required={mode === 'existing'}
                                />
                            ) : (
                                <div className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-500 rounded-xl text-sm font-medium">
                                    No existing repacks found for this item. Please create a new one.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`space-y-4 p-5 ${theme.surfaceBg} rounded-xl border ${theme.borderLight}`}>
                            <h4 className={`text-sm font-black ${theme.textHeading} mb-2 border-b ${theme.borderLight} pb-2`}>New Item Details</h4>
                            <div>
                                <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>New Item Name</label>
                                <input
                                    type="text"
                                    value={newItemName}
                                    onChange={(e) => {
                                        setNewItemName(e.target.value);
                                        setIsNameEdited(true);
                                    }}
                                    className={`w-full p-2.5 rounded-lg border-2 transition-all ${theme.inputBg} ${theme.textPrimary} border-transparent focus:border-indigo-500 text-sm`}
                                    placeholder="e.g. Beef 1kg Pack"
                                    required={mode === 'new'}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>Category</label>
                                    <CommonSelect
                                        options={categories}
                                        value={categoryId}
                                        onChange={(val) => setCategoryId(val)}
                                        labelKey="name"
                                        valueKey="_id"
                                        placeholder="Select..."
                                        required={mode === 'new'}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>Selling Unit</label>
                                    <CommonSelect
                                        options={units}
                                        value={unitId}
                                        onChange={(val) => setUnitId(val)}
                                        labelKey="name"
                                        valueKey="_id"
                                        placeholder="Select..."
                                        required={mode === 'new'}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>Selling Price</label>
                                    <input
                                        type="number"
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(e.target.value)}
                                        className={`w-full p-2.5 rounded-lg border-2 transition-all ${theme.inputBg} ${theme.textPrimary} border-transparent focus:border-indigo-500 text-sm`}
                                        placeholder="Price per pack"
                                        required={mode === 'new'}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>Barcode</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newItemBarcode}
                                            onChange={(e) => {
                                                setNewItemBarcode(e.target.value);
                                                setIsBarcodeEdited(true);
                                            }}
                                            className={`flex-1 w-full p-2.5 rounded-lg border-2 transition-all ${theme.inputBg} ${theme.textPrimary} border-transparent focus:border-indigo-500 text-sm`}
                                            placeholder="Barcode"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewItemBarcode(`RPK${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`);
                                                setIsBarcodeEdited(true);
                                            }}
                                            className={`px-3 py-2.5 rounded-lg border ${theme.borderLight} text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center`}
                                            title="Generate New Barcode"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    const unitObj = units.find(u => u._id === unitId);
                                                    let barcodeData = await itemService.getPreviewBarcode(newItemBarcode);
                                                    const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
                                                    const fullUrl = barcodeData.imageUrl.startsWith("http") ? barcodeData.imageUrl : `${root}${barcodeData.imageUrl}`;

                                                    setBarcodePrintDialog(prev => ({
                                                        ...prev,
                                                        isOpen: true,
                                                        item: { name: newItemName, itemCode: `RPK-${Date.now().toString().slice(-6)}` },
                                                        barcode: { code: newItemBarcode, fullUrl },
                                                        unitValueOverride: `${amountPerPack} ${unitObj?.name || ''}`
                                                    }));
                                                } catch (err) {
                                                    toast.error("Failed to generate barcode preview");
                                                }
                                            }}
                                            className={`px-3 py-2.5 rounded-lg border ${theme.borderLight} text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center`}
                                            title="Print Barcode Preview"
                                        >
                                            <Printer size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preview Summary removed to avoid duplication, now inline above */}

                    <div className="flex gap-3 justify-end pt-4 border-t border-white/5 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all ${theme.surfaceBg} ${theme.textPrimary} border ${theme.borderLight} hover:opacity-80`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || (mode === 'existing' && !targetItemId)}
                            className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all flex items-center justify-center disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Confirm Repack"}
                        </button>
                    </div>
                </form>
            </div>

            <BarcodePrintDialog
                isOpen={barcodePrintDialog.isOpen}
                onClose={() => {
                    setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }));
                    onRepackComplete();
                    onClose();
                }}
                dialogState={barcodePrintDialog}
                setDialogState={setBarcodePrintDialog}
            />
        </Modal>
    );
};

export default RepackModal;
