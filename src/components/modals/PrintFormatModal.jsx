import React, { useEffect } from 'react';
import { X, Printer, FileText, ArrowRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const PrintFormatModal = ({
    isOpen,
    onClose,
    order,
    onSelectFormat,
    loading = false
}) => {
    const { theme } = useTheme();

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, loading, onClose]);

    if (!isOpen || !order) return null;

    const invoiceNumber = order.invoiceNumber || order.orderNumber || '';
    const customerName = order.customerId?.name || order.customer?.name || order.customerName || 'Walk-in Customer';

    const handleSelect = (format) => {
        if (loading) return;
        onSelectFormat(format);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={!loading ? onClose : undefined}
            />

            {/* Modal Dialog */}
            <div className={`relative w-full max-w-md ${theme.surfaceBg || 'bg-white dark:bg-slate-900'} rounded-[32px] shadow-2xl border ${theme.borderLight || 'border-gray-200 dark:border-white/10'} overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
                {/* Header */}
                <div className={`p-6 border-b ${theme.borderLight || 'border-gray-200 dark:border-white/10'} flex items-center justify-between`}>
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
                            <Printer size={22} />
                        </div>
                        <div>
                            <h3 className={`text-lg font-black ${theme.textHeading || 'text-gray-900 dark:text-white'} leading-tight`}>
                                Select Print Format
                            </h3>
                            <p className={`text-xs font-semibold ${theme.textMuted || 'text-gray-500 dark:text-gray-400'}`}>
                                {invoiceNumber ? `Invoice #${invoiceNumber}` : 'Sales Receipt'} • {customerName}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={`p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 ${theme.textMuted || 'text-gray-400'} transition-colors disabled:opacity-50`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-3">
                    <p className={`text-xs font-bold uppercase tracking-wider ${theme.textSecondary || 'text-gray-500 dark:text-gray-400'} mb-2`}>
                        Choose format for this print
                    </p>

                    {/* Option 1: Thermal Receipt */}
                    <button
                        type="button"
                        onClick={() => handleSelect('thermal')}
                        disabled={loading}
                        className={`w-full group text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                            theme.mode === 'dark'
                                ? 'bg-slate-800/60 hover:bg-indigo-950/40 border-slate-700/80 hover:border-indigo-500'
                                : 'bg-white hover:bg-indigo-50/50 border-gray-200 hover:border-indigo-500 shadow-sm hover:shadow-md'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Printer size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`font-black text-sm ${theme.textHeading || 'text-gray-900 dark:text-white'}`}>
                                    Thermal Receipt
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                                    3" / 80mm
                                </span>
                            </div>
                            <p className={`text-xs ${theme.textMuted || 'text-gray-500 dark:text-gray-400'} leading-relaxed`}>
                                Standard POS roll printer format. Compact slip receipt.
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                            <ArrowRight size={16} />
                        </div>
                    </button>

                    {/* Option 2: A4 Invoice */}
                    <button
                        type="button"
                        onClick={() => handleSelect('a4')}
                        disabled={loading}
                        className={`w-full group text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${
                            theme.mode === 'dark'
                                ? 'bg-slate-800/60 hover:bg-blue-950/40 border-slate-700/80 hover:border-blue-500'
                                : 'bg-white hover:bg-blue-50/50 border-gray-200 hover:border-blue-500 shadow-sm hover:shadow-md'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={`font-black text-sm ${theme.textHeading || 'text-gray-900 dark:text-white'}`}>
                                    A4 Invoice
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                                    A4 Sheet
                                </span>
                            </div>
                            <p className={`text-xs ${theme.textMuted || 'text-gray-500 dark:text-gray-400'} leading-relaxed`}>
                                Full-page formal tax invoice with breakdown tables.
                            </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                            <ArrowRight size={16} />
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className={`p-4 px-6 border-t ${theme.borderLight || 'border-gray-200 dark:border-white/10'} flex justify-end bg-gray-50/50 dark:bg-slate-900/50`}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl text-xs font-bold ${theme.textSecondary || 'text-gray-600 dark:text-gray-300'} hover:bg-gray-200/60 dark:hover:bg-white/10 transition-colors`}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintFormatModal;

