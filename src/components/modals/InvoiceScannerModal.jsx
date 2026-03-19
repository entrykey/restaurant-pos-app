import React, { useState } from 'react';
import { X, Upload, Camera, FileText, Search, Plus, Trash2, Save, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PurchaseService } from '../../services/PurchaseService';

const STORAGE_KEY = 'invoice_patterns';

const InvoiceScannerModal = ({ isOpen, onClose, onDataExtracted, theme, suppliers, stockItems }) => {
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState({
        invoiceNumber: "",
        date: "",
        supplierName: "",
        items: []
    });
    const [step, setStep] = useState(1); // 1: Upload, 2: Process, 3: Mapping/Verification

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            setPreview(URL.createObjectURL(file));
            setStep(2);
            processWithBackend(file);
        }
    };

    const processWithBackend = async (file) => {
        setIsProcessing(true);
        try {
            const response = await PurchaseService.scanInvoice(file);
            console.log("Backend OCR Response:", response);

            if (response.success && response.extracted_data) {
                const data = response.extracted_data;
                
                // Try to find matching supplier from local list
                const localSupplier = suppliers.find(s => 
                    data.supplierName && (
                        s.name.toLowerCase().includes(data.supplierName.toLowerCase()) ||
                        data.supplierName.toLowerCase().includes(s.name.toLowerCase())
                    )
                );

                setExtractedData({
                    ...data,
                    supplierId: localSupplier?._id || localSupplier?.id || "",
                    supplierName: localSupplier?.name || data.supplierName || ""
                });
                setStep(3);
            } else {
                throw new Error(response.error || "Failed to extract data");
            }
        } catch (error) {
            console.error("OCR Error:", error);
            toast.error(error.message || "Failed to process image. Make sure the Python OCR service is running.");
            setStep(1);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSavePattern = () => {
        if (!extractedData.supplierId) {
            toast.error("Please select a valid supplier to save this pattern for.");
            return;
        }

        const savedPatterns = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        savedPatterns[extractedData.supplierId] = {
            lastUsed: new Date().toISOString(),
            isTrained: true,
            model: "PYTHON_V1"
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPatterns));
        toast.success(`System trained for ${extractedData.supplierName}!`);
    };

    const handleConfirm = () => {
        onDataExtracted(extractedData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
            <div className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl relative flex flex-col ${theme.surfaceBg} border ${theme.borderLight}`}>
                
                {/* Header */}
                <div className={`p-6 border-b ${theme.borderLight} flex items-center justify-between`}>
                    <div>
                        <h2 className={`text-xl font-black uppercase tracking-tight ${theme.textHeading}`}>FivePe AI Scanner</h2>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${theme.textMuted}`}>Intelligent invoice data extraction</p>
                    </div>
                    <button onClick={onClose} className={`p-2 hover:${theme.inputBg.replace('bg-', 'bg-')} rounded-full transition-colors ${theme.textMuted}`}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in zoom-in duration-300">
                            <div className={`w-32 h-32 rounded-[40px] bg-indigo-500/10 flex items-center justify-center text-indigo-500 border-2 border-dashed border-indigo-500/30`}>
                                <Upload size={48} />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className={`text-lg font-black uppercase ${theme.textPrimary}`}>Upload invoices and auto-fill your POS in seconds</h3>
                                <p className={`text-xs font-bold ${theme.textSecondary}`}>Intelligent data extraction powered by FivePe AI</p>
                            </div>
                            <label className="cursor-pointer group">
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                <div className="px-12 py-4 rounded-[20px] bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-500/20 group-hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                                    <Camera size={18} /> Upload & Scan
                                </div>
                            </label>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col items-center justify-center h-full space-y-8">
                            <div className="relative w-48 h-48">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-sm font-black text-indigo-500 uppercase tracking-tighter">Analyzing...</div>
                                </div>
                            </div>
                            <div className="text-center space-y-2 animate-pulse">
                                <h3 className={`text-lg font-black uppercase ${theme.textPrimary}`}>FivePe AI is scanning...</h3>
                                <p className={`text-xs font-bold ${theme.textSecondary}`}>Intelligent structured data extraction in progress.</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left: Preview */}
                                <div className={`rounded-[30px] border ${theme.borderLight} overflow-hidden ${theme.mode === 'dark' ? 'bg-black/20' : 'bg-gray-900/10'} relative`}>
                                    <img src={preview} alt="Invoice" className="w-full h-auto opacity-80" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                </div>

                                {/* Right: Extracted Fields */}
                                <div className="space-y-6">
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Extracted Information</h4>
                                    
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase px-2 text-indigo-500">Invoice Number</label>
                                            <div className="relative">
                                                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input 
                                                    value={extractedData.invoiceNumber}
                                                    onChange={e => setExtractedData({...extractedData, invoiceNumber: e.target.value})}
                                                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-bold outline-none focus:border-indigo-500 transition-all`}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase px-2 text-indigo-500">Invoice Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input 
                                                    value={extractedData.date}
                                                    onChange={e => setExtractedData({...extractedData, date: e.target.value})}
                                                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-bold outline-none focus:border-indigo-500 transition-all`}
                                                />
                                            </div>
                                        </div>

                                         <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase px-2 text-indigo-500">Supplier Name</label>
                                                {!extractedData.supplierId && extractedData.supplierName && (
                                                    <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">DIDN'T EXIST / NEW</span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                <input 
                                                    value={extractedData.supplierName}
                                                    onChange={e => {
                                                        const name = e.target.value;
                                                        const match = suppliers.find(s => 
                                                            s.name.toLowerCase().includes(name.toLowerCase()) ||
                                                            name.toLowerCase().includes(s.name.toLowerCase())
                                                        );
                                                        setExtractedData({
                                                            ...extractedData, 
                                                            supplierName: name,
                                                            supplierId: match?._id || match?.id || ""
                                                        });
                                                    }}
                                                    className={`w-full pl-12 pr-4 py-3 rounded-2xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-bold outline-none focus:border-indigo-500 transition-all`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items List */}
                            <div className={`space-y-4 pt-4 border-t border-dashed ${theme.borderLight}`}>
                                <div className="flex justify-between items-center">
                                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Extracted Items ({extractedData.items.length})</h4>
                                    <button 
                                        onClick={() => setExtractedData({...extractedData, items: [...extractedData.items, { name: "", quantity: 1, purchasePrice: 0 }]})}
                                        className="text-[10px] font-black text-indigo-500 uppercase hover:underline"
                                    >
                                        + Add Missing Item
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {extractedData.items.map((it, idx) => {
                                        const match = stockItems.find(s => 
                                            s.name.toLowerCase().includes(it.name.toLowerCase()) ||
                                            it.name.toLowerCase().includes(s.name.toLowerCase())
                                        );

                                        return (
                                            <div key={idx} className={`p-4 rounded-2xl border ${theme.borderLight} ${theme.inputBg} flex items-center gap-4 animate-in slide-in-from-left duration-200 relative`}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <input 
                                                            value={it.name}
                                                            onChange={e => {
                                                                const newItems = [...extractedData.items];
                                                                newItems[idx].name = e.target.value;
                                                                setExtractedData({...extractedData, items: newItems});
                                                            }}
                                                            className={`flex-1 bg-transparent font-black ${theme.textPrimary} outline-none border-b border-transparent focus:border-indigo-500`}
                                                        />
                                                        {!match && it.name && (
                                                            <span className="text-[8px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full">NEW</span>
                                                        )}
                                                        {match && (
                                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${match.itemType === 'TRADE' ? (theme.mode === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-600') : (theme.mode === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
                                                                {match.itemType}
                                                            </span>
                                                        )}

                                                    </div>
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase">Description / Name</div>
                                                </div>
                                                <div className="w-20">
                                                    <input 
                                                        type="number"
                                                        value={it.quantity}
                                                        onChange={e => {
                                                            const newItems = [...extractedData.items];
                                                            newItems[idx].quantity = parseFloat(e.target.value);
                                                            setExtractedData({...extractedData, items: newItems});
                                                        }}
                                                        className={`w-full bg-transparent font-black text-indigo-600 outline-none text-center`}
                                                    />
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase text-center">Qty</div>
                                                </div>
                                                <div className="w-28">
                                                    <input 
                                                        type="number"
                                                        value={it.purchasePrice}
                                                        onChange={e => {
                                                            const newItems = [...extractedData.items];
                                                            newItems[idx].purchasePrice = parseFloat(e.target.value);
                                                            setExtractedData({...extractedData, items: newItems});
                                                        }}
                                                        className={`w-full bg-transparent font-black text-right outline-none`}
                                                    />
                                                    <div className="text-[9px] font-bold text-gray-400 uppercase text-right">Price</div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newItems = extractedData.items.filter((_, i) => i !== idx);
                                                        setExtractedData({...extractedData, items: newItems});
                                                    }}
                                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 3 && (
                    <div className={`p-8 border-t ${theme.borderLight} flex flex-col md:flex-row gap-4`}>
                        <div className="flex gap-4 flex-1">
                            <button 
                                onClick={() => setStep(1)}
                                className={`flex-1 py-4 rounded-3xl font-black transition-all border-2 ${theme.borderLight} ${theme.textSecondary} ${theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                            >
                                RESCAN
                            </button>
                            <button 
                                onClick={handleSavePattern}
                                className={`flex-1 py-4 rounded-3xl font-black transition-all border-2 ${theme.mode === 'dark' ? 'border-indigo-500/30' : 'border-indigo-500/20'} text-indigo-500 ${theme.mode === 'dark' ? 'hover:bg-indigo-500/10' : 'hover:bg-indigo-50'} flex items-center justify-center gap-2`}
                            >
                                <Plus size={16} /> SAVE PATTERN
                            </button>
                        </div>
                        <button 
                            onClick={handleConfirm}
                            className={`flex-[1.5] py-4 rounded-3xl font-black bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 transition-all text-sm`}
                        >
                            <Save size={20} /> SYNC TO INVOICE FORM
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvoiceScannerModal;
