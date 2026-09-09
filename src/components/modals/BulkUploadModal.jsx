import React, { useState, useEffect } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import ThemeLoader from '../ui/ThemeLoader';
import { useTheme } from '../../context/ThemeContext';
import { itemService } from '../../services/api';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
// Helper to turn raw database errors into user-friendly messages for non-technical clients
const formatFriendlyErrorMessage = (rawMsg) => {
    if (!rawMsg || typeof rawMsg !== 'string') return "An error occurred during processing.";

    let msg = rawMsg.trim();

    // Handle Mongo E11000 and duplicate key errors
    if (msg.includes('E11000') || msg.toLowerCase().includes('duplicate')) {
        const itemCodeMatch = msg.match(/itemCode:\s*"([^"]+)"/i) || msg.match(/itemCode:\s*([^\s,{}]+)/i);
        if (itemCodeMatch && itemCodeMatch[1]) {
            const cleanCode = itemCodeMatch[1].replace(/["']/g, '');
            return `Item with code "${cleanCode}" already exists.`;
        }

        const barcodeMatch = msg.match(/barcode:\s*"([^"]+)"/i) || msg.match(/barcode:\s*([^\s,{}]+)/i);
        if (barcodeMatch && barcodeMatch[1]) {
            const cleanBarcode = barcodeMatch[1].replace(/["']/g, '');
            return `Item with barcode "${cleanBarcode}" already exists.`;
        }

        const nameMatch = msg.match(/name:\s*"([^"]+)"/i) || msg.match(/name:\s*([^\s,{}]+)/i);
        if (nameMatch && nameMatch[1]) {
            const cleanName = nameMatch[1].replace(/["']/g, '');
            return `Item named "${cleanName}" already exists.`;
        }

        return "This item already exists in the system.";
    }

    if (msg.includes('Cast to ObjectId failed')) {
        return "Invalid ID format provided.";
    }

    // Strip technical Mongo IDs or internal database terms
    return msg.replace(/ObjectId\("[^"]+"\)/g, '')
              .replace(/ObjectId\('[^']+'\)/g, '')
              .replace(/branchId:\s*/gi, '')
              .replace(/shopId:\s*/gi, '')
              .trim();
};

const BulkUploadModal = ({ isOpen, onClose, onSuccess, activeTab }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setResult(null);
            setUploading(false);
            const fileInput = document.getElementById('bulk-csv-input');
            if (fileInput) fileInput.value = '';
        }
    }, [isOpen]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        const fileName = selectedFile.name.toLowerCase();
        const fileType = selectedFile.type || '';
        const isCsv = fileName.endsWith('.csv') || fileType === 'text/csv';
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileType.includes('excel') || fileType.includes('spreadsheetml');
        
        if (isCsv || isExcel) {
            setFile(selectedFile);
            setResult(null);
        } else {
            toast.error("Please select a valid CSV or Excel (.xlsx, .xls) file");
            e.target.value = null;
        }
    };

    const handleDownloadSample = () => {
        const headers = ["Name", "ItemCode", "Barcode", "Description", "Category", "Unit", "PurchasePrice", "SellingPrice", "MRP", "TaxPercent", "MinStockAlert", "StockApplicable"];
        const exampleRow = [
            activeTab === 'menu' ? "Mutton Biryani" : (activeTab === 'raw' ? "Rice" : "Coca Cola"),
            "",
            "",
            "Imported via bulk upload",
            activeTab === 'menu' ? "Main Course" : "Raw Materials",
            "Pieces",
            activeTab === 'menu' ? "0" : "100",
            "150",
            "150",
            "5",
            "10",
            "Yes"
        ];
        
        const csvContent = [headers.join(","), exampleRow.join(",")].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory_sample_${activeTab}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setResult(null);

        try {
            const rawShopId = user?.shop_id || user?.shopId || user?.shop?._id || (typeof user?.shop === 'string' ? user.shop : null) || localStorage.getItem('pos_shopId');
            const rawBranchId = activeBranchId || user?.branchId || user?.branch_id || (user?.branchIds?.length ? user.branchIds[0] : null) || localStorage.getItem('pos_branchId');

            const shopId = (rawShopId && rawShopId !== 'undefined' && rawShopId !== 'null') ? String(rawShopId) : null;
            const branchId = (rawBranchId && rawBranchId !== 'undefined' && rawBranchId !== 'null') ? String(rawBranchId) : null;

            if (!shopId) {
                toast.error("Shop ID is missing. Please re-select your shop or log in again.");
                setUploading(false);
                return;
            }

            if (!branchId) {
                toast.error("Branch ID is missing. Please select an active branch.");
                setUploading(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('shopId', shopId);
            formData.append('branchId', branchId);
            formData.append('itemType', activeTab === 'menu' ? 'MANUFACTURED' : (activeTab === 'raw' ? 'STOCK' : 'TRADE'));

            const res = await itemService.bulkUploadItems(formData);
            setResult(res);

            if (res.successCount > 0) {
                toast.success(`Bulk upload complete! ${res.successCount} items imported successfully.`);
                // Reset file selection after successful upload
                setFile(null);
                const fileInput = document.getElementById('bulk-csv-input');
                if (fileInput) fileInput.value = '';
                onSuccess();
            } else {
                toast.error(res.message || "No items were imported.");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to upload items");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Upload Inventory" maxWidth="max-w-2xl">
            <div className="p-6">
                <div className={`p-4 rounded-2xl mb-6 flex gap-3 border ${theme.mode === 'dark' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                    <Info size={20} className="flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-bold mb-1">Before you upload:</p>
                        <ul className="list-disc list-inside space-y-1 opacity-90">
                            <li>Supports both <strong>Excel (.xlsx, .xls)</strong> and <strong>CSV (.csv)</strong> files.</li>
                            <li>Download the sample file to ensure correct formatting.</li>
                            <li>Items will be automatically tagged as <strong>{activeTab === 'menu' ? 'MANUFACTURED' : (activeTab === 'raw' ? 'STOCK' : 'TRADE')}</strong> items.</li>
                            <li><strong>Unit</strong> name must exist in the system (e.g., Pieces, Kg, Ltr).</li>
                            <li>Categories will be auto-created if they do not exist.</li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-[32px] p-12 transition-all cursor-pointer hover:border-indigo-500 group relative mb-6"
                    style={{ borderColor: theme.mode === 'dark' ? '#334155' : '#e2e8f0' }}
                    onClick={() => document.getElementById('bulk-csv-input').click()}
                >
                    <input 
                        id="bulk-csv-input"
                        type="file" 
                        accept=".csv, .xlsx, .xls"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    
                    <div className={`p-6 rounded-full mb-4 transition-transform group-hover:scale-110 ${theme.mode === 'dark' ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Upload size={32} />
                    </div>
                    
                    {file ? (
                        <div className="flex flex-col items-center">
                            <p className={`text-lg font-black mb-2 ${theme.textPrimary}`}>
                                {file.name}
                            </p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    const fileInput = document.getElementById('bulk-csv-input');
                                    if (fileInput) fileInput.value = '';
                                }}
                                className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <X size={14} /> Remove selected file
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className={`text-lg font-black mb-1 ${theme.textPrimary}`}>
                                Click to select Excel (.xlsx, .xls) or CSV file
                            </p>
                            <p className={`text-sm ${theme.textMuted}`}>
                                Maximum file size: 10MB
                            </p>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className={`font-bold text-sm ${theme.textPrimary}`}>Sample File</p>
                                <p className={`text-[11px] ${theme.textMuted}`}>Template with example data</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleDownloadSample}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${theme.mode === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-gray-100 border text-gray-700'}`}
                        >
                            <Download size={16} /> DOWNLOAD
                        </button>
                    </div>

                    {result && (
                        <div className={`p-4 rounded-2xl border ${result.errorCount > 0 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'} dark:bg-opacity-10 dark:border-opacity-20`}>
                            <div className="flex items-center gap-2 font-black mb-2">
                                {result.errorCount === 0 ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                                {result.message}
                            </div>
                            {result.errors && result.errors.length > 0 && (
                                <ul className="text-xs space-y-1 list-disc list-inside opacity-90">
                                    {result.errors.map((err, i) => <li key={i}>{formatFriendlyErrorMessage(err)}</li>)}
                                </ul>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-4 mt-8">
                    <button
                        onClick={onClose}
                        className={`flex-1 py-4 px-6 rounded-2xl font-black transition-all ${theme.mode === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className={`flex-1 py-4 px-6 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 ${!file || uploading ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/20'}`}
                    >
                        {uploading ? (
                            <>
                                <ThemeLoader size="sm" /> UPLOADING...
                            </>
                        ) : (
                            <>
                                <Upload size={20} /> PROCEED UPLOAD
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BulkUploadModal;
