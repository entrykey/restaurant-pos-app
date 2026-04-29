import React from 'react';
import { Plus, X, ShoppingCart, User } from 'lucide-react';
import { useTakeaway } from '../pages/Takeaway/TakeawayContext';
import { useTheme } from '../context/ThemeContext';

const PosTabBar = ({ view }) => {
    const { 
        tabs, 
        activeTabId, 
        addTab, 
        switchTab, 
        closeTab,
        takeawayOrder,
        takeawayCustName
    } = useTakeaway();
    const { theme } = useTheme();

    // Only show on relevant views
    const normalizedView = String(view || "").toLowerCase();
    const showTabs = normalizedView === 'takeaway' || 
                     normalizedView === 'wholesale' || 
                     normalizedView === 'direct-sale' ||
                     normalizedView === 'order' || 
                     normalizedView === 'tables' ||
                     normalizedView === 'dining';

    if (!showTabs) return null;

    return (
        <div className={`flex items-center gap-2 px-3 pb-2 md:pb-3 ${theme.navbarBg} z-20 overflow-x-auto no-scrollbar shrink-0 min-h-[52px] md:min-h-[60px]`}>
            {tabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const itemCount = (isActive ? takeawayOrder.items : tab.takeawayOrder.items)?.length || 0;
                const custName = (isActive ? takeawayCustName : tab.takeawayCustName) || tab.name;

                return (
                    <div
                        key={tab.id}
                        onClick={() => switchTab(tab.id)}
                        className={`group relative shrink-0 min-w-[120px] md:min-w-[150px] max-w-[180px] md:max-w-[240px] h-10 md:h-11 px-3 md:px-5 flex items-center justify-between gap-2 cursor-pointer transition-all duration-300 transform rounded-xl md:rounded-b-2xl md:rounded-t-none
                            ${isActive 
                                ? `bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-600/10 z-10 ${window.innerWidth > 768 ? 'scale-105' : ''}` 
                                : `bg-white/80 dark:bg-slate-800/60 text-slate-500 hover:bg-white dark:hover:bg-slate-800 border ${theme.borderLight}`
                            }`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            {itemCount > 0 ? (
                                <div className={`shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[10px] md:text-[11px] font-black 
                                    ${isActive ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {itemCount}
                                </div>
                            ) : (
                                <div className={`shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center ${isActive ? 'bg-indigo-500' : 'bg-gray-100'}`}>
                                    <User size={12} className={isActive ? 'text-white' : 'text-gray-400'} />
                                </div>
                            )}
                            <span className="text-[11px] md:text-xs font-black truncate tracking-tight">
                                {custName}
                            </span>
                        </div>

                        <button
                            onClick={(e) => closeTab(tab.id, e)}
                            className={`p-1 rounded-full transition-all shrink-0
                                ${isActive 
                                    ? 'hover:bg-white/20 text-white/60 hover:text-white' 
                                    : 'opacity-0 group-hover:opacity-100 hover:bg-red-50 text-gray-400 hover:text-red-500'
                                }`}
                        >
                            <X size={12} strokeWidth={3} />
                        </button>
                    </div>
                );
            })}

            <button
                onClick={addTab}
                className={`h-8 w-8 md:h-10 md:w-10 shrink-0 rounded-full bg-indigo-50 dark:bg-slate-800 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center shadow-sm border ${theme.borderLight} hover:scale-110 active:scale-95`}
                title="New Sale Tab"
            >
                <Plus size={18} strokeWidth={4} />
            </button>
        </div>
    );
};

export default PosTabBar;
