import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Search, Loader2, ReceiptText, Truck } from 'lucide-react';
import { PurchaseService } from '../../services/PurchaseService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency, formatDate } from '../../utils/format';
import CommonTable from '../../components/CommonTable';

const PurchaseReturnsPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme } = useTheme();
    const resolvedShopId = user?.shopId || user?.shop_id;

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => {
            const purchaseNo = r?.purchaseId?.purchaseNumber || '';
            const invoiceNo = r?.purchaseId?.invoiceNumber || '';
            const supplier = r?.supplierId?.name || '';
            return `${purchaseNo} ${invoiceNo} ${supplier}`.toLowerCase().includes(q);
        });
    }, [rows, search]);

    const fetchReturns = useCallback(async () => {
        if (!resolvedShopId) return;
        setLoading(true);
        try {
            const result = await PurchaseService.getPurchaseReturns({ shopId: resolvedShopId });
            setRows(Array.isArray(result) ? result : []);
        } catch (err) {
            console.error(err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [resolvedShopId]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    return (
        <div className="p-4 md:p-8 space-y-6 min-h-full animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className={`text-2xl md:text-4xl font-black ${theme.textHeading} tracking-tight`}>Purchase Returns</h1>
                    <p className={`${theme.textMuted} mt-1 font-medium`}>Manage returns sent back to suppliers</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={20} />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by Purchase/Invoice/Supplier..."
                            className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none transition-all font-bold ${theme.surfaceBg} ${theme.borderLight} focus:border-red-500 focus:ring-4 focus:ring-red-500/10`}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/purchases/return')}
                        className="px-6 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 whitespace-nowrap"
                    >
                        <RotateCcw size={18} /> Make Return
                    </button>
                </div>
            </div>

            {loading ? (
                <div className={`rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} p-10 flex items-center justify-center gap-3`}>
                    <Loader2 className="animate-spin text-red-600" size={22} />
                    <p className={`font-bold ${theme.textMuted}`}>Loading returns...</p>
                </div>
            ) : (
                <CommonTable
                    columns={[
                        {
                            header: 'Return',
                            key: 'createdAt',
                            render: (_, r) => (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                            RETURN
                                        </span>
                                        <span className="text-[10px] font-black text-gray-400">{formatDate(r.createdAt)}</span>
                                    </div>
                                    <p className={`font-black ${theme.textHeading}`}>{r?.purchaseId?.invoiceNumber || r?.purchaseId?.purchaseNumber || '—'}</p>
                                </div>
                            ),
                        },
                        {
                            header: 'Supplier',
                            key: 'supplier',
                            render: (_, r) => (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 flex-shrink-0">
                                        <Truck size={15} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-black text-sm truncate ${theme.textPrimary}`}>{r?.supplierId?.name || 'General Supplier'}</p>
                                        <p className={`text-[10px] font-bold ${theme.textMuted}`}>{r?.purchaseId?.purchaseNumber || ''}</p>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            header: 'Items',
                            key: 'items',
                            headerClassName: 'text-center',
                            className: 'text-center',
                            render: (_, r) => (
                                <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${theme.mode === 'dark' ? 'bg-white/5 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                                    {r?.items?.length || 0} Items
                                </span>
                            ),
                        },
                        {
                            header: 'Amount',
                            key: 'totalReturnAmount',
                            render: (_, r) => (
                                <p className="font-black text-base text-red-600">{formatCurrency(r?.totalReturnAmount || 0)}</p>
                            ),
                        },
                        {
                            header: 'Notes',
                            key: 'notes',
                            render: (_, r) => (
                                <p className={`text-xs font-bold ${theme.textMuted} line-clamp-2`}>{r?.notes || '—'}</p>
                            ),
                        },
                    ]}
                    data={filtered}
                    emptyMessage="No purchase returns found"
                    keyField="_id"
                    title="Purchase Returns"
                    icon={ReceiptText}
                />
            )}
        </div>
    );
};

export default PurchaseReturnsPage;

