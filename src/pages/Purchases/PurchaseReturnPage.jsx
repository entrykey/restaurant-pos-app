import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { PurchaseService } from '../../services/PurchaseService';
import { formatDate, formatCurrency } from '../../utils/format';
import PurchaseReturnSheet from '../../components/modals/PurchaseReturnSheet';
import { toast } from 'react-hot-toast';

const PurchaseReturnPage = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const resolvedShopId = user?.shopId || user?.shop_id;

    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedPurchase, setSelectedPurchase] = useState(null);
    const [loadingPurchase, setLoadingPurchase] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);

    const loadPurchase = useCallback(async (purchaseId) => {
        if (!purchaseId) return;
        setLoadingPurchase(true);
        try {
            const data = await PurchaseService.getPurchaseById(purchaseId);
            const p = data?.purchase;
            const items = data?.items || [];
            if (!p) throw new Error('Purchase not found');
            setSelectedPurchase({ ...p, items });
            setSheetOpen(true);
        } catch (err) {
            console.error(err);
            toast.error('Could not load purchase invoice.');
        } finally {
            setLoadingPurchase(false);
        }
    }, []);

    useEffect(() => {
        if (!resolvedShopId) return;
        const term = searchQuery.trim();
        if (term.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const list = await PurchaseService.getPurchases({
                    shopId: resolvedShopId,
                    search: term,
                    limit: 12,
                });
                setResults(Array.isArray(list) ? list : []);
            } catch (err) {
                console.error(err);
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, resolvedShopId]);

    const clearSelection = () => {
        setSelectedPurchase(null);
        setSheetOpen(false);
        setSearchQuery('');
        setResults([]);
    };

    return (
        <div className={`min-h-full ${theme.pageBg} p-3 md:p-8`}>
            <div className="max-w-[1000px] mx-auto space-y-4 md:space-y-8 pb-10">
                <div className="mb-2">
                    <Link to="/purchase-returns" className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest transition-colors hover:opacity-70 ${theme.textMuted}`}>
                        <ArrowLeft size={14} /> Purchase Returns
                    </Link>
                </div>

                <div className={`${theme.surfaceBg} rounded-2xl md:rounded-[40px] shadow-md md:shadow-2xl p-4 md:p-12 border ${theme.borderLight} space-y-4 md:space-y-6`}>
                    <h2 className={`text-base md:text-lg font-black flex items-center gap-3 uppercase ${theme.textHeading}`}>
                        <Search className="text-red-600" size={20} /> Find Purchase Invoice
                    </h2>

                    <div className="relative">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={20} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                            }}
                            placeholder="Search by Purchase #, Invoice #..."
                            className={`w-full pl-12 pr-12 py-4 border-2 border-transparent focus:border-red-500 rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary}`}
                        />
                        {searching && (
                            <Loader2 className={`absolute right-4 top-1/2 -translate-y-1/2 animate-spin ${theme.textMuted}`} size={20} />
                        )}
                        {!!selectedPurchase && !searching && (
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-50 text-red-500"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {!selectedPurchase && results.length > 0 && (
                        <div className={`rounded-2xl border overflow-hidden divide-y ${theme.borderLight}`}>
                            {results.map((p) => (
                                <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => loadPurchase(p._id)}
                                    className="w-full p-4 text-left hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center justify-between gap-4 transition-colors"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
                                                {p.purchaseNumber}
                                            </span>
                                            <span className={`text-[10px] font-bold ${theme.textMuted}`}>{formatDate(p.createdAt)}</span>
                                        </div>
                                        <p className={`font-black ${theme.textPrimary}`}>{p.invoiceNumber || p.supplierInvoiceNumber || 'No Invoice'}</p>
                                        <p className={`text-xs font-bold ${theme.textMuted} mt-0.5`}>{p.supplierId?.name || 'General Supplier'}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="font-black text-red-600">{formatCurrency(p.grandTotal || 0)}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {!selectedPurchase && searchQuery.trim().length >= 2 && !searching && results.length === 0 && (
                        <p className={`text-center text-sm font-bold py-6 ${theme.textMuted}`}>No purchase invoices found for this search.</p>
                    )}

                    {loadingPurchase && (
                        <div className="pt-3 flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin text-red-600" size={20} />
                            <p className={`font-bold ${theme.textMuted}`}>Loading invoice details...</p>
                        </div>
                    )}
                </div>

                <PurchaseReturnSheet
                    isOpen={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    purchase={selectedPurchase}
                    onSuccess={() => {
                        toast.success('Purchase return created');
                    }}
                />
            </div>
        </div>
    );
};

export default PurchaseReturnPage;

