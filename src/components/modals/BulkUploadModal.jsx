import React, { useState } from 'react';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import ThemeLoader from '../ui/ThemeLoader';
import { useTheme } from '../../context/ThemeContext';
import { itemService } from '../../services/api';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-hot-toast';

const BulkUploadModal = ({ isOpen, onClose, onSuccess, activeTab }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
            setFile(selectedFile);
            setResult(null);
        } else {
            toast.error("Please select a valid CSV file");
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
            "100",
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
            const formData = new FormData();
            formData.append('file', file);
            formData.append('shopId', user.shop_id);
            formData.append('branchId', activeBranchId || (user.branchIds?.length ? user.branchIds[0] : null));
            formData.append('itemType', activeTab === 'menu' ? 'MANUFACTURED' : (activeTab === 'raw' ? 'STOCK' : 'TRADE'));

            const res = await itemService.bulkUploadItems(formData);
            setResult(res);
            toast.success("Bulk upload completed!");
            if (res.successCount > 0) {
                onSuccess();
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
                            <li>Download the sample CSV file to ensure correct formatting.</li>
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
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    
                    <div className={`p-6 rounded-full mb-4 transition-transform group-hover:scale-110 ${theme.mode === 'dark' ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                        <Upload size={32} />
                    </div>
                    
                    <p className={`text-lg font-black mb-1 ${theme.textPrimary}`}>
                        {file ? file.name : "Click to select CSV file"}
                    </p>
                    <p className={`text-sm ${theme.textMuted}`}>
                        Maximum file size: 5MB
                    </p>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className={`font-bold text-sm ${theme.textPrimary}`}>Sample File</p>
                                <p className={`text-[11px] ${theme.textMuted}`}>CSV Template with example data</p>
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
                                    {result.errors.map((err, i) => <li key={i}>{err}</li>)}
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
