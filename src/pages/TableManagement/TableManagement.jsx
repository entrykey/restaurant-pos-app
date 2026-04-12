import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import TableList from './components/TableList';
import DiningCategoryList from './components/DiningCategoryList';
import { LayoutDashboard, UtensilsCrossed } from 'lucide-react';

const TableManagement = ({ hasPermissionFor }) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('tables');
    const [triggerCreateTable, setTriggerCreateTable] = useState(false);
    const [triggerCreateCategory, setTriggerCreateCategory] = useState(false);

    // The module from backend is "table management" -> "table_management" or specific "TABLE.VIEWING"
    // We can rely on the components themselves, but for now we'll just show the tabs.
    // If we want string translation: const { t } = useTranslation();

    return (
        <div className={`p-4 md:p-8 min-h-[calc(100vh-4rem)] overflow-y-auto ${theme.pageBg}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    {/* Header with Icon */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 text-white rounded-2xl shadow-lg ${activeTab === "tables" ? "bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20" : "bg-orange-500 shadow-orange-100 dark:shadow-orange-900/20"}`}>
                            {activeTab === "tables" ? <LayoutDashboard size={28} /> : <UtensilsCrossed size={28} />}
                        </div>
                        <h2 className={`text-2xl md:text-4xl font-black tracking-tight ${theme.textHeading}`}>
                            {activeTab === "tables" ? 'Table Management' : 'Dining Categories'}
                        </h2>
                    </div>
                    <p className={`font-bold ml-1 ${theme.textMuted}`}>
                        {activeTab === "tables" ? "Manage restaurant tables and capacity" : "Manage seating areas and environments"}
                    </p>
                </div>

                <div className="flex w-full md:w-auto mt-4 md:mt-0">
                    <button
                        onClick={() => {
                            if (activeTab === 'tables') setTriggerCreateTable(true);
                            if (activeTab === 'categories') setTriggerCreateCategory(true);
                        }}
                        className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black shadow-xl text-white transition-all flex items-center justify-center gap-2
                            ${activeTab === "tables" ? "bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700" : "bg-orange-500 shadow-orange-200 dark:shadow-orange-900/20 hover:bg-orange-600"}
                        `}
                    >
                        <Plus size={20} /> Create {activeTab === "tables" ? 'Table' : 'Category'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className={`flex gap-4 mb-8 p-2 rounded-2xl shadow-sm w-fit ${theme.surfaceBg}`}>
                <button
                    onClick={() => setActiveTab('tables')}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === 'tables'
                        ? `${theme.primaryIconBg} ${theme.primaryIconText}`
                        : `${theme.textSecondary} hover:opacity-80`
                        }`}
                >
                    <LayoutDashboard size={18} /> Tables
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeTab === 'categories'
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
                        : `${theme.textSecondary} hover:opacity-80`
                        }`}
                >
                    <UtensilsCrossed size={18} /> Dining Categories
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'tables' && (
                    <TableList
                        triggerCreate={triggerCreateTable}
                        onResetCreate={() => setTriggerCreateTable(false)}
                    />
                )}
                {activeTab === 'categories' && (
                    <DiningCategoryList
                        triggerCreate={triggerCreateCategory}
                        onResetCreate={() => setTriggerCreateCategory(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default TableManagement;
