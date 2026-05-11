import React, { useState } from 'react';
import { Plus, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import DiningCategoryList from './components/DiningCategoryList';

const TableManagement = ({ hasPermissionFor }) => {
    const { theme } = useTheme();
    const [triggerCreateCategory, setTriggerCreateCategory] = useState(false);

    return (
        <div className={`p-4 md:p-8 min-h-[calc(100vh-4rem)] overflow-y-auto ${theme.pageBg}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    {/* Header with Icon */}
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-3 text-white rounded-2xl shadow-lg bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20`}>
                            <LayoutDashboard size={28} />
                        </div>
                        <h2 className={`text-2xl md:text-4xl font-black tracking-tight ${theme.textHeading}`}>
                            Table Management
                        </h2>
                    </div>
                    <p className={`font-bold ml-1 ${theme.textMuted}`}>
                        Manage restaurant tables, capacity and dining areas
                    </p>
                </div>

                <div className="flex w-full md:w-auto mt-4 md:mt-0">
                    <button
                        onClick={() => setTriggerCreateCategory(true)}
                        className={`w-full md:w-auto px-8 py-4 rounded-2xl font-black shadow-xl text-white transition-all flex items-center justify-center gap-2 bg-indigo-600 shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700`}
                    >
                        <Plus size={20} /> Create Category
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                <DiningCategoryList
                    triggerCreate={triggerCreateCategory}
                    onResetCreate={() => setTriggerCreateCategory(false)}
                />
            </div>
        </div>
    );
};

export default TableManagement;
