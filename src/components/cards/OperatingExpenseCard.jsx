import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Trash2, Save, ArrowRightCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/format';

const OperatingExpenseCard = ({
    category,
    amount,
    term,
    onUpdate,
    onSave,
    onDelete,
    isDefault,
    isSaving,
    isDraft = false,
    onMoveToExpense,
    isPurchase = false
}) => {
    const { theme } = useTheme();
    const { organization } = useApp();
    const currency = organization?.defaultCurrency || 'USD';

    const terms = [
        { value: 'daily', label: 'Daily' },
        { value: 'monthly', label: 'Monthly' },
        { value: '2months', label: '2 Months' },
        { value: '3months', label: '3 Months' },
        { value: '6months', label: '6 Months' },
        { value: 'yearly', label: 'Yearly' },
        { value: 'one time', label: 'One Time' }
    ];

    const termDaysMap = {
        'daily': 1,
        'monthly': 30,
        '2months': 60,
        '3months': 90,
        '6months': 180,
        'yearly': 365,
        'one time': 0
    };

    const perDay = term === 'one time' ? 0 : amount / (termDaysMap[term] || 30);

    return (
        <div className={`${theme.surfaceBg} p-6 rounded-[32px] border ${isDraft ? 'border-amber-500 border-2' : theme.borderLight} ${isPurchase ? 'border-blue-500 border-2' : ''} shadow-sm space-y-6 flex flex-col ${isDraft ? 'bg-amber-50/20 dark:bg-amber-900/10' : ''}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className={`text-xl font-bold ${theme.textHeading}`}>{category}</h3>
                    {isDraft && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded">
                            Draft
                        </span>
                    )}
                    {isPurchase && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded">
                            Stock Purchase
                        </span>
                    )}
                </div>
                {!isDefault && !isPurchase && (
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

            <div className="space-y-4 flex-1">
                <div>
                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-3`}>Billing Term</label>
                    <div className="flex flex-wrap gap-2">
                        {terms.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => !isPurchase && onUpdate({ term: t.value })}
                                disabled={isPurchase}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${term === t.value
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                                        : `${theme.surfaceBg} ${theme.borderLight} ${theme.textSecondary} hover:border-indigo-200`
                                    } ${isPurchase ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {t.label.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className={`block text-[11px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>Amount ({currency})</label>
                    <input
                        type="number"
                        value={amount || ''}
                        onChange={(e) => !isPurchase && onUpdate({ amount: e.target.value === '' ? 0 : Number(e.target.value) })}
                        disabled={isPurchase}
                        className={`w-full p-4 border-2 border-transparent ${theme.pageBg} rounded-2xl outline-none focus:border-indigo-500 font-bold ${theme.textPrimary} transition-all text-xl ${isPurchase ? 'opacity-50 cursor-not-allowed' : ''}`}
                        placeholder="0.00"
                    />
                </div>
            </div>

            <div className="pt-4 border-t border-dashed border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <div className="text-right">
                    <p className={`text-[10px] uppercase font-black tracking-widest ${theme.textMuted}`}>Per Day</p>
                    <p className={`text-lg font-black ${theme.textPrimary}`}>{formatCurrency(perDay, currency)}</p>
                </div>
                <div className="flex gap-2">
                    {isDraft && onMoveToExpense && (
                        <button
                            onClick={onMoveToExpense}
                            disabled={isSaving}
                            className="bg-emerald-600 text-white px-4 py-3 rounded-2xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 text-sm uppercase tracking-widest"
                        >
                            <ArrowRightCircle size={18} />
                            Move to Expenses
                        </button>
                    )}
                    {!isPurchase && (
                        <button
                            onClick={onSave}
                            disabled={isSaving}
                            className="bg-indigo-600 text-white p-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Save size={20} />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OperatingExpenseCard;
