import React from 'react';
import { TrendingUp, Package, MinusCircle, ChevronDown } from 'lucide-react';

const ProfitLossAccordion = ({
    profitLossReport,
    salesInRange,
    expandedPlSections,
    togglePlSection,
    formatCurrency,
    currency,
    theme,
}) => {
    if (!profitLossReport) return null;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-5 rounded-2xl border ${theme.infoBorder} ${theme.infoBg}`}>
                    <p className={`text-[10px] font-black uppercase opacity-70 ${theme.infoText}`}>Revenue</p>
                    <p className={`text-2xl font-black mt-1 ${theme.infoText}`}>
                        {formatCurrency(profitLossReport.revenue, currency)}
                    </p>
                </div>
                <div className="p-5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20">
                    <p className="text-[10px] font-black uppercase opacity-70 text-red-600 dark:text-red-400">COGS + Expenses</p>
                    <p className="text-2xl font-black mt-1 text-red-600 dark:text-red-400">
                        {formatCurrency((profitLossReport.cogs || 0) + (profitLossReport.expenses?.total || 0), currency)}
                    </p>
                </div>
                <div className={`p-5 rounded-2xl border ${profitLossReport.netProfit >= 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'} ${profitLossReport.netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <p className={`text-[10px] font-black uppercase opacity-70 ${profitLossReport.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Net Profit</p>
                    <p className={`text-2xl font-black mt-1 ${profitLossReport.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(profitLossReport.netProfit, currency)}
                    </p>
                    <p className={`text-[10px] font-bold mt-1 opacity-80 ${profitLossReport.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {profitLossReport.netMarginPercent?.toFixed(1)}% net margin
                    </p>
                </div>
            </div>

            <div className={`overflow-hidden rounded-[32px] border ${theme.borderLight} ${theme.surfaceBg} shadow-sm`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${theme.pageBg} ${theme.textMuted} text-[10px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                <th className="p-6">Section</th>
                                <th className="p-6 text-right">Amount</th>
                                <th className="p-6 text-center w-20">Details</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.borderLight}`}>
                            {(profitLossReport.sections || []).map((section) => {
                                const isExpanded = expandedPlSections[section.id];
                                const isDebit = section.type === 'debit';
                                const SectionIcon = section.id === 'income' ? TrendingUp : section.id === 'cogs' ? Package : MinusCircle;
                                const accentActive = section.id === 'income' ? 'bg-indigo-600' : section.id === 'cogs' ? 'bg-orange-600' : 'bg-red-600';

                                return (
                                    <React.Fragment key={section.id}>
                                        <tr
                                            onClick={() => togglePlSection(section.id)}
                                            className={`group cursor-pointer transition-all ${isExpanded ? theme.pageBg : ''}`}
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? `${accentActive} text-white` : `${theme.pageBg} ${theme.textMuted}`}`}>
                                                        <SectionIcon size={24} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-lg font-black tracking-tight ${theme.textHeading}`}>{section.label}</p>
                                                        <p className={`text-xs font-bold ${theme.textMuted}`}>{section.subtitle}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <p className={`text-lg font-black ${isDebit ? 'text-red-600' : 'text-indigo-600'}`}>
                                                    {isDebit ? '−' : ''}{formatCurrency(section.total, currency)}
                                                </p>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? `${accentActive} text-white rotate-180` : `${theme.pageBg} ${theme.textMuted}`}`}>
                                                    <ChevronDown size={20} />
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={3} className="p-0 border-none bg-transparent">
                                                    <div className={`${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50/50'} border-t ${theme.borderLight} p-6 md:p-8 animate-in slide-in-from-top-2 duration-300`}>
                                                        {section.id === 'income' && salesInRange.length > 0 && (
                                                            <div className="mb-6">
                                                                <h5 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-3`}>Sales Invoices</h5>
                                                                <div className={`divide-y ${theme.borderLight} rounded-2xl border ${theme.borderLight} overflow-hidden`}>
                                                                    {salesInRange.map((sale) => (
                                                                        <div key={sale.id} className={`flex justify-between items-center px-4 py-3 ${theme.surfaceBg}`}>
                                                                            <div>
                                                                                <p className={`text-sm font-bold ${theme.textPrimary}`}>#{sale.invoiceNumber}</p>
                                                                                <p className={`text-[10px] font-bold ${theme.textMuted}`}>{sale.type} · {sale.date}</p>
                                                                            </div>
                                                                            <span className="text-sm font-black text-indigo-600">{formatCurrency(sale.amount, currency)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <h5 className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} mb-3`}>
                                                            {section.id === 'income' ? 'By channel' : section.id === 'cogs' ? 'By item' : 'Line items'}
                                                        </h5>
                                                        {(section.items || []).length > 0 ? (
                                                            <div className={`divide-y ${theme.borderLight} rounded-2xl border ${theme.borderLight} overflow-hidden`}>
                                                                {section.items.map((item, idx) => (
                                                                    <div key={`${item.label}-${idx}`} className={`flex justify-between items-center px-4 py-3 ${theme.surfaceBg}`}>
                                                                        <div>
                                                                            <p className={`text-sm font-bold ${theme.textPrimary}`}>{item.label}</p>
                                                                            {(item.orders != null || item.qty != null || item.date) && (
                                                                                <p className={`text-[10px] font-bold ${theme.textMuted}`}>
                                                                                    {item.orders != null && `${item.orders} orders`}
                                                                                    {item.qty != null && ` · ${item.qty} qty`}
                                                                                    {item.date && ` · ${item.date}`}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <span className={`text-sm font-black ${isDebit ? 'text-red-600' : 'text-indigo-600'}`}>
                                                                            {formatCurrency(item.amount, currency)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className={`text-sm font-bold ${theme.textMuted} italic`}>No line items in this period.</p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            <tr className={`${theme.pageBg} border-t-2 ${theme.borderLight}`}>
                                <td className="p-6">
                                    <p className={`text-lg font-black uppercase tracking-wider ${theme.textHeading}`}>Net Profit / (Loss)</p>
                                    <p className={`text-xs font-bold ${theme.textMuted}`}>Revenue − COGS − Operating expenses</p>
                                </td>
                                <td className="p-6 text-right">
                                    <p className={`text-xl font-black ${profitLossReport.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(profitLossReport.netProfit, currency)}
                                    </p>
                                </td>
                                <td className="p-6" />
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <p className={`text-xs ${theme.textMuted} font-medium`}>
                Tap a row to expand details. COGS uses purchase and recipe costs; recurring expenses are prorated for the selected period.
            </p>
        </>
    );
};

export default ProfitLossAccordion;
