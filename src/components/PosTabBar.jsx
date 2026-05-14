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
        takeawayCustName
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
            duration: 6000,
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

    // Only show on relevant views
    const normalizedView = String(view || "").toLowerCase();
    const showTabs = normalizedView === 'takeaway' || 
                     normalizedView === 'wholesale' || 
                     normalizedView === 'direct-sale' ||
                     normalizedView === 'order';

    if (!showTabs) return null;

    return (
        <div className="flex items-center justify-center w-full px-4 pt-2 md:pt-4 pointer-events-none">
            <div className={`flex items-center gap-1.5 p-1 bg-slate-900/40 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-white/10 dark:border-slate-700/50 shadow-2xl pointer-events-auto overflow-x-auto no-scrollbar max-w-full`}>
                {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const itemCount = (isActive ? takeawayOrder.items : tab.takeawayOrder.items)?.length || 0;
                    const custName = (isActive ? takeawayCustName : tab.takeawayCustName) || tab.name;

                    return (
                        <div
                            key={tab.id}
                            onClick={() => switchTab(tab.id)}
                            className={`group relative shrink-0 min-w-[100px] md:min-w-[140px] max-w-[180px] h-9 md:h-10 px-3 md:px-4 flex items-center justify-between gap-2 cursor-pointer transition-all duration-300 transform rounded-xl
                                ${isActive 
                                    ? `bg-indigo-600 text-white shadow-lg z-10 scale-105` 
                                    : `text-slate-300 hover:bg-white/10`
                                }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                {itemCount > 0 ? (
                                    <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black 
                                        ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'}`}>
                                        {itemCount}
                                    </div>
                                ) : (
                                    <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-500' : 'bg-white/10'}`}>
                                        <User size={10} className={isActive ? 'text-white' : 'text-slate-400'} />
                                    </div>
                                )}
                                <span className="text-[10px] md:text-[11px] font-black truncate tracking-tight uppercase">
                                    {custName}
                                </span>
                            </div>

                            <button
                                onClick={(e) => closeTab(tab.id, e)}
                                className={`p-0.5 rounded-full transition-all shrink-0
                                    ${isActive 
                                        ? 'hover:bg-white/20 text-white/60 hover:text-white' 
                                        : 'opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-slate-500 hover:text-red-400'
                                    }`}
                            >
                                <X size={10} strokeWidth={3} />
                            </button>
                        </div>
                    );
                })}

                <div className="flex items-center gap-1.5 px-1.5 border-l border-white/10 ml-1">
                    <button
                        onClick={addTab}
                        className={`h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-xl bg-white/10 text-white hover:bg-indigo-600 transition-all flex items-center justify-center border border-white/5`}
                        title="New Sale Tab"
                    >
                        <Plus size={16} strokeWidth={4} />
                    </button>

                    {tabs.length > 1 && (
                        <button
                            onClick={confirmClearAll}
                            className={`h-8 w-8 md:h-9 md:w-9 shrink-0 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-red-500/20`}
                            title="Clear All Tabs"
                        >
                            <Trash2 size={14} strokeWidth={3} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PosTabBar;
