import React from 'react';
import { Plus, X, User, Trash2 } from 'lucide-react';
import { useTakeaway } from '../pages/Takeaway/TakeawayContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

const PosTabBar = ({ view }) => {
    const { 
        tabs, 
        activeTabId, 
        addTab, 
        switchTab, 
        closeTab,
        clearAllTabs,
        takeawayOrder,
        takeawayCustName,
        tableId
    } = useTakeaway();
    const { theme } = useTheme();

    const confirmClearAll = () => {
        toast((t) => (
            <div className="flex flex-col gap-3 min-w-[280px]">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-xl">
                        <Trash2 size={20} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-sm font-black text-slate-100 uppercase tracking-tight">Clear all tabs?</p>
                        <p className="text-[10px] font-bold text-slate-400">This will reset all current orders.</p>
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            clearAllTabs();
                            toast.dismiss(t.id);
                            toast.success("All tabs cleared", {
                                icon: '🗑️',
                                style: {
                                    borderRadius: '12px',
                                    background: '#1e293b',
                                    color: '#fff',
                                },
                            });
                        }}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all active:scale-95"
                    >
                        Confirm Clear
                    </button>
                </div>
            </div>
        ), {
            duration: 3000,
            position: 'top-center',
            style: {
                background: '#0f172a',
                color: '#fff',
                padding: '16px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            },
        });
    };

    // Never show when a table order is active
    if (tableId) return null;

    // Only show on relevant views — table orders are never in the tabs array
    const normalizedView = String(view || "").toLowerCase();
    const showTabs = normalizedView === 'takeaway' || 
                     normalizedView === 'wholesale' || 
                     normalizedView === 'direct-sale' ||
                     normalizedView === 'order';

    if (!showTabs) return null;

    // Only render sale tabs (no tableId) — safety filter for any stale data
    const saleTabs = tabs.filter(t => !t.tableId);

    return (
        <div className="flex items-center justify-start md:justify-center xl:justify-center w-full px-4 pt-2 pb-2 xl:pt-0 xl:pb-0">
            <div className={`flex items-center gap-1.5 p-1.5 bg-[#7a818e] rounded-full shadow-lg overflow-x-auto no-scrollbar max-w-full xl:pointer-events-auto`}>
                {saleTabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const activeOrder = isActive ? takeawayOrder : (tab.takeawayOrder || {});
                    const itemCount = (activeOrder.items || []).length || 0;
                    const rawOrderLabel = activeOrder.orderNumber || activeOrder.orderId;
                    const orderLabel = rawOrderLabel ? `#${String(rawOrderLabel).slice(-6)}` : null;
                    const fallbackName = (isActive ? takeawayCustName : tab.takeawayCustName) || tab.name;
                    const tabLabel = orderLabel || fallbackName;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`group relative shrink-0 min-w-[100px] md:min-w-[140px] max-w-[180px] h-9 md:h-11 px-3 md:px-5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 transform rounded-full
                                ${isActive 
                                    ? `bg-[#5b52f6] text-white shadow-lg z-10` 
                                    : `text-slate-200 hover:bg-white/10`
                                }`}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                {itemCount > 0 ? (
                                    <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black 
                                        ${isActive ? 'bg-white text-[#5b52f6]' : 'bg-slate-400/50 text-white'}`}>
                                        {itemCount}
                                    </div>
                                ) : (
                                    <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${isActive ? 'bg-white/20' : 'bg-white/10'}`}>
                                        <User size={12} className={isActive ? 'text-white' : 'text-slate-200'} />
                                    </div>
                                )}
                                <span className="text-[11px] md:text-[13px] font-black truncate tracking-wide uppercase">
                                    {tabLabel}
                                </span>
                            </div>

                            <button
                                onClick={(e) => closeTab(tab.id, e)}
                                className={`p-0.5 rounded-full transition-all shrink-0
                                    ${isActive 
                                        ? 'hover:bg-white/20 text-white/70 hover:text-white' 
                                        : 'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-400 hover:text-red-400'
                                    }`}
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    );
                })}

                <div className="flex items-center gap-1.5 px-2 border-l border-white/10 ml-1 shrink-0">
                    <button
                        onClick={addTab}
                        className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-all flex items-center justify-center`}
                        title="New Sale Tab"
                    >
                        <Plus size={18} strokeWidth={4} />
                    </button>

                    {saleTabs.length > 1 && (
                        <button
                            onClick={confirmClearAll}
                            className={`h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl bg-[#c17878]/30 text-[#e68c8c] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center`}
                            title="Clear All Tabs"
                        >
                            <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PosTabBar;
