import { Package, Receipt, Calendar, Wallet, ArrowRightCircle, RotateCcw } from 'lucide-react';
import { formatDate, formatCurrency } from '../utils/format';
import { useTheme } from '../context/ThemeContext';

/**
 * HistoryTimeline Component
 * Displays a chronological list of events (Purchases and Payments) in a vertical timeline.
 * 
 * @param {Array} events - Array of event objects:
 *   { 
 *     id: string, 
 *     type: 'PURCHASE' | 'PAYMENT', 
 *     date: Date | string, 
 *     orderNumber: string, 
 *     amount: number, 
 *     balance: number, 
 *     method: string, 
 *     order: object, (original order object for actions)
 *     status: string 
 *   }
 * @param {Function} onAction - Callback for the 'Collect' button: (order) => void
 */
const HistoryTimeline = ({ events = [], onAction, onReturn }) => {
    const { theme } = useTheme();

    if (!events || events.length === 0) {
        return (
            <div className={`text-center py-10 rounded-2xl border border-dashed ${theme.borderLight} ${theme.mode === 'dark' ? 'bg-slate-800/50' : 'bg-gray-50/50'}`}>
                <p className={`text-sm font-bold uppercase tracking-widest ${theme.textMuted}`}>No history available</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Vertical Timeline Line */}
            <div className={`absolute left-[21px] top-2 bottom-2 w-0.5 ${theme.mode === 'dark' ? 'bg-slate-700' : 'bg-gray-100'}`}></div>

            <div className="space-y-8 relative">
                {events.map((event) => (
                    <div key={event.id} className="flex gap-6 items-start group">
                        {/* Timeline Icon */}
                        <div className={`z-10 w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-4 ${theme.mode === 'dark' ? 'border-slate-900' : 'border-white'} ${event.type === 'PURCHASE'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-emerald-500 text-white'
                            }`}>
                            {event.type === 'PURCHASE' ? <Package size={18} /> : <Receipt size={18} />}
                        </div>

                        {/* Event Card */}
                        <div className={`flex-1 rounded-2xl p-5 border transition-all ${theme.surfaceBg} ${theme.borderLight}`}>
                            <div className="flex flex-wrap justify-between items-start gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${event.type === 'PURCHASE' 
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' 
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400'
                                            }`}>
                                            {event.type === 'PURCHASE' ? 'Purchase' : 'Payment Received'}
                                        </span>
                                        <span className={`text-xs font-bold flex items-center gap-1.5 ${theme.textMuted}`}>
                                            <Calendar size={12} />
                                            {formatDate(event.date)}
                                        </span>
                                    </div>
                                    <h4 className={`text-base font-black ${theme.textHeading}`}>
                                        {event.type === 'PURCHASE' ? `Ordered Items #${event.orderNumber}` : `Payment for #${event.orderNumber}`}
                                    </h4>
                                    {event.method && (
                                        <p className={`text-xs font-bold px-2 py-1 rounded inline-block mt-1 ${theme.mode === 'dark' ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-500'}`}>
                                            Method: {event.method}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-3 text-right shrink-0">
                                    <div>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme.textMuted}`}>
                                            {event.type === 'PURCHASE' ? 'Order Total' : 'Amount Paid'}
                                        </p>
                                        <p className={`text-xl font-black ${event.type === 'PURCHASE' ? theme.textHeading : 'text-emerald-600'}`}>
                                            {event.type === 'PURCHASE' ? '' : '+ '}{formatCurrency(event.amount)}
                                        </p>
                                    </div>

                                    {event.type === 'PURCHASE' && (
                                        <div className={`pt-3 border-t ${theme.borderLight} flex items-center gap-2`}>
                                            {event.balance > 0 ? (
                                                <>
                                                    <div className="text-right mr-2">
                                                        <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Remaining</p>
                                                        <p className="font-black text-orange-600">{formatCurrency(event.balance)}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onAction && onAction(event.order);
                                                        }}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-black transition-all shadow-lg"
                                                    >
                                                        <Wallet size={14} />
                                                        Collect
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`flex items-center gap-1 font-black text-[10px] uppercase px-2 py-1 rounded-full border ${theme.mode === 'dark' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                    <ArrowRightCircle size={12} /> Paid
                                                </span>
                                            )}
                                            
                                            {onReturn && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onReturn(event.order);
                                                    }}
                                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all border ${theme.mode === 'dark' ? 'bg-orange-900/20 text-orange-400 border-orange-900/50 hover:bg-orange-900/40' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'}`}
                                                >
                                                    <RotateCcw size={14} />
                                                    Return
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryTimeline;
