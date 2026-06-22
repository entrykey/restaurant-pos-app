import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

const ProfitLossReport = ({ data, formatCurrency, shopName, branchName }) => {
    const { theme } = useTheme();

    if (!data) return null;

    const ReportSection = ({ title, subtitle, items, total, type, showTotal = true }) => {
        const isCredit = type === 'credit';
        
        return (
            <div className="space-y-3">
                {/* Section Header */}
                <div className="border-b-2 border-gray-300 dark:border-gray-600 pb-2">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p className={`text-xs ${theme.textMuted} mt-0.5`}>{subtitle}</p>
                    )}
                </div>

                {/* Section Items */}
                <div className="space-y-1.5 pl-4">
                    {items && items.length > 0 ? (
                        items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                                <span className={`font-medium text-sm ${theme.textPrimary}`}>
                                    {item.name}
                                </span>
                                <span className={`font-bold text-sm ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {formatCurrency(item.amount)}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className={`text-sm italic ${theme.textMuted}`}>No items</p>
                    )}
                </div>

                {/* Section Total */}
                {showTotal && (
                    <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 flex justify-between items-center font-black">
                        <span className={`text-sm uppercase ${theme.textPrimary}`}>
                            Total {title}
                        </span>
                        <span className={`text-base ${isCredit ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                            {formatCurrency(total)}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const SubtotalLine = ({ label, amount, percentage, highlight = false, final = false }) => {
        const isPositive = amount >= 0;
        const bgClass = final 
            ? (isPositive ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 border-2 border-emerald-600' : 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-600')
            : highlight 
            ? `${theme.surfaceBg} border ${theme.borderLight}` 
            : '';

        return (
            <div className={`flex justify-between items-center p-4 rounded-xl ${bgClass} ${final ? 'shadow-lg' : ''}`}>
                <div className="flex items-center gap-2">
                    {final && (
                        isPositive ? <TrendingUp className="text-emerald-600" size={20} /> : <TrendingDown className="text-red-600" size={20} />
                    )}
                    <span className={`font-black uppercase ${final ? (isPositive ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200') : theme.textPrimary} ${final ? 'text-lg' : 'text-base'}`}>
                        {label}
                    </span>
                </div>
                <div className="text-right">
                    <p className={`font-black ${final ? (isPositive ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-800 dark:text-red-200') : (isPositive ? 'text-green-700' : 'text-red-700')} ${final ? 'text-2xl' : 'text-lg'}`}>
                        {formatCurrency(amount)}
                    </p>
                    {percentage !== undefined && (
                        <p className={`text-xs font-bold ${final ? 'opacity-80' : theme.textMuted}`}>
                            {percentage.toFixed(2)}% {final ? 'margin' : ''}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Report Header */}
            <div className={`text-center border-b-4 ${theme.borderLight} pb-6`}>
                <h1 className={`text-3xl font-black ${theme.textHeading} tracking-tight`}>
                    PROFIT & LOSS STATEMENT
                </h1>
                <p className={`text-lg font-bold ${theme.textPrimary} mt-2`}>
                    {shopName} {branchName && `— ${branchName}`}
                </p>
                <p className={`text-sm font-semibold ${theme.textSecondary} mt-1`}>
                    {data.period?.startDate} → {data.period?.endDate}
                    {data.period?.days && ` (${data.period.days} days)`}
                </p>
            </div>

            {/* Income Section */}
            {data.income && (
                <ReportSection
                    title={data.income.label}
                    subtitle={data.income.subtitle}
                    items={data.income.items}
                    total={data.income.total}
                    type="credit"
                />
            )}

            {/* COGS Section */}
            {data.costOfGoodsSold && (
                <ReportSection
                    title={data.costOfGoodsSold.label}
                    subtitle={data.costOfGoodsSold.subtitle}
                    items={data.costOfGoodsSold.items}
                    total={data.costOfGoodsSold.total}
                    type="debit"
                />
            )}

            {/* Gross Profit */}
            {data.grossProfit && (
                <SubtotalLine
                    label={data.grossProfit.label}
                    amount={data.grossProfit.amount}
                    percentage={data.grossProfit.percentage}
                    highlight
                />
            )}

            {/* Operating Expenses Section */}
            {data.operatingExpenses && (
                <ReportSection
                    title={data.operatingExpenses.label}
                    subtitle={data.operatingExpenses.subtitle}
                    items={data.operatingExpenses.items}
                    total={data.operatingExpenses.total}
                    type="debit"
                />
            )}

            {/* Net Profit */}
            {data.netProfit && (
                <SubtotalLine
                    label={data.netProfit.label}
                    amount={data.netProfit.amount}
                    percentage={data.netProfit.percentage}
                    final
                />
            )}

            {/* Summary Stats (Optional) */}
            {data.summary && (
                <div className={`mt-8 p-6 rounded-2xl border-2 ${theme.borderLight} ${theme.pageBg}`}>
                    <h4 className={`text-xs font-black uppercase tracking-widest ${theme.textSecondary} mb-4`}>
                        Summary
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className={`text-xs ${theme.textMuted}`}>Revenue</p>
                            <p className={`text-base font-black ${theme.textPrimary}`}>{formatCurrency(data.summary.totalRevenue)}</p>
                        </div>
                        <div>
                            <p className={`text-xs ${theme.textMuted}`}>COGS</p>
                            <p className={`text-base font-black text-red-600`}>{formatCurrency(data.summary.totalCogs)}</p>
                        </div>
                        <div>
                            <p className={`text-xs ${theme.textMuted}`}>Gross Margin</p>
                            <p className={`text-base font-black text-indigo-600`}>{data.summary.grossMargin.toFixed(2)}%</p>
                        </div>
                        <div>
                            <p className={`text-xs ${theme.textMuted}`}>Net Margin</p>
                            <p className={`text-base font-black ${data.summary.netMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {data.summary.netMargin.toFixed(2)}%
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfitLossReport;
