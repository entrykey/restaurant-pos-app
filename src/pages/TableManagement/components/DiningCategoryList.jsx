import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { diningCategoryService, tableService } from '../../../services/api';
import DiningCategoryDialog from './DiningCategoryDialog';
import TableDialog from './TableDialog';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { usePermission } from '../../../auth/usePermission';
import { MODULES } from '../../../constants/modules';
import { Edit2, Trash2, ChevronDown, Plus, Users, LayoutDashboard, Monitor, MonitorOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DiningCategoryList = ({ triggerCreate, onResetCreate }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const { can } = usePermission();
    
    const [categories, setCategories] = useState([]);
    const [tables, setTables] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedCategories, setExpandedCategories] = useState({});
    
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    
    const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
    const [editingTable, setEditingTable] = useState(null);
    const [activeCategoryIdForTable, setActiveCategoryIdForTable] = useState(null);

    // Permissions
    const hasCategoryEdit = can(MODULES.TABLE_MANAGEMENT, 'DININGCATEGORY.EDITING') || user?.role?.name === 'SuperAdmin';
    const hasTableEdit = can(MODULES.TABLE_MANAGEMENT, 'TABLE.EDITING') || user?.role?.name === 'SuperAdmin';

    const branchId = activeBranchId || user?.branchId || user?.branch || (user?.branchIds?.length ? user.branchIds[0] : null);
    const shopId = user?.shop_id || user?.shopId || user?.shop;

    const fetchData = useCallback(async () => {
        if (!branchId) {
            setCategories([]);
            setTables([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const params = { all: true };
            if (branchId) params.branchId = branchId;

            const [catRes, tableRes] = await Promise.all([
                diningCategoryService.getCategories(params),
                tableService.getTables(params)
            ]);
            
            setCategories(catRes || []);
            setTables(tableRes || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Don't show toast if it's just a permission error from stale state
            if (!error.message?.includes("not enabled")) {
                toast.error('Failed to load data');
            }
        } finally {
            setIsLoading(false);
        }
    }, [branchId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (triggerCreate) {
            setEditingCategory(null);
            setIsCategoryDialogOpen(true);
            onResetCreate();
        }
    }, [triggerCreate, onResetCreate]);

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleEditCategory = (e, category) => {
        e.stopPropagation();
        setEditingCategory(category);
        setIsCategoryDialogOpen(true);
    };

    const handleDeleteCategory = async (e, category) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete category "${category.name}"?`)) return;

        try {
            await diningCategoryService.deleteCategory(category._id);
            toast.success('Category deleted successfully');
            fetchData();
        } catch (error) {
            toast.error(error.message || 'Failed to delete category');
        }
    };

    const handleToggleCategoryStatus = async (e, category) => {
        e.stopPropagation();
        if (!hasCategoryEdit) {
            toast.error("You don't have permission to edit categories");
            return;
        }

        try {
            await diningCategoryService.updateCategory(category._id, { isActive: !category.isActive });
            toast.success(`Category ${!category.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchData();
        } catch (error) {
            toast.error('Failed to change status');
        }
    };

    // Table Actions
    const handleAddTable = (categoryId) => {
        setActiveCategoryIdForTable(categoryId);
        setEditingTable(null);
        setIsTableDialogOpen(true);
    };

    const handleEditTable = (table) => {
        setEditingTable(table);
        setActiveCategoryIdForTable(table.diningCategoryId?._id || table.diningCategoryId);
        setIsTableDialogOpen(true);
    };

    const handleDeleteTable = async (table) => {
        if (!window.confirm(`Delete table ${table.tableNumber}?`)) return;
        try {
            await tableService.deleteTable(table._id);
            toast.success('Table deleted');
            fetchData();
        } catch (error) {
            toast.error('Failed to delete table');
        }
    };

    const handleToggleTableStatus = async (table) => {
        try {
            await tableService.updateTable(table._id, { isActive: !table.isActive });
            toast.success('Status updated');
            fetchData();
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const groupedTables = useMemo(() => {
        const grouped = {};
        tables.forEach(table => {
            const catId = table.diningCategoryId?._id || table.diningCategoryId;
            if (!grouped[catId]) grouped[catId] = [];
            grouped[catId].push(table);
        });
        return grouped;
    }, [tables]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-black uppercase tracking-widest text-gray-400">Loading Management Data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className={`overflow-hidden rounded-[32px] border ${theme.borderLight} ${theme.surfaceBg} shadow-sm`}>

                {/* ── Mobile card layout (< sm) ── */}
                <div className="sm:hidden divide-y divide-inherit">
                    {categories.length > 0 ? categories.map((category) => {
                        const isExpanded = expandedCategories[category._id];
                        const categoryTables = groupedTables[category._id] || [];
                        return (
                            <React.Fragment key={category._id}>
                                <div
                                    onClick={() => toggleCategory(category._id)}
                                    className={`p-4 cursor-pointer transition-all ${isExpanded ? theme.pageBg : ''} border-b ${theme.borderLight} last:border-0`}
                                >
                                    {/* Row 1: icon + name + chevron */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : `${theme.pageBg} ${theme.textMuted}`}`}>
                                            <LayoutDashboard size={22} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-base font-black tracking-tight ${theme.textHeading}`}>{category.name}</p>
                                            <p className={`text-xs font-bold ${theme.textMuted}`}>{categoryTables.length} Tables Registered</p>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${isExpanded ? 'bg-indigo-600 text-white rotate-180' : `${theme.pageBg} ${theme.textMuted}`}`}>
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                    {/* Row 2: environment + toggle + edit */}
                                    <div className={`flex items-center justify-between pt-3 border-t ${theme.borderLight}`}>
                                        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${category.environment === 'AC' ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700'}`}>
                                            {category.environment === 'AC' ? 'AC Room' : 'Non-AC Area'}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button onClick={(e) => handleToggleCategoryStatus(e, category)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${category.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${category.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                            {hasCategoryEdit && (
                                                <button onClick={(e) => handleEditCategory(e, category)} className={`p-2 rounded-lg ${theme.sectionBg} ${theme.textSecondary} transition-colors`}>
                                                    <Edit2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Expanded tables on mobile */}
                                {isExpanded && (
                                    <div className={`${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50/50'} border-b ${theme.borderLight} p-4 animate-in slide-in-from-top-2 duration-300`}>
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className={`text-xs font-black uppercase tracking-widest ${theme.textPrimary} flex items-center gap-2`}>
                                                <Monitor size={14} className="text-indigo-500" /> Tables in {category.name}
                                            </h4>
                                            <button onClick={() => handleAddTable(category._id)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all">
                                                <Plus size={12} /> Add Table
                                            </button>
                                        </div>
                                        {categoryTables.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-3">
                                                {categoryTables.map((table) => (
                                                    <div key={table._id} className={`p-4 rounded-2xl border transition-all ${theme.surfaceBg} ${table.isActive ? `border-indigo-100 dark:border-indigo-900/40 shadow-sm` : 'border-dashed opacity-60 grayscale'}`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${table.isActive ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'bg-gray-100 text-gray-400'}`}>
                                                                <LayoutDashboard size={16} />
                                                            </div>
                                                            <button onClick={() => handleToggleTableStatus(table)} className={`p-1.5 rounded-lg transition-colors ${table.isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                                {table.isActive ? <Monitor size={14} /> : <MonitorOff size={14} />}
                                                            </button>
                                                        </div>
                                                        <p className={`font-black text-sm ${theme.textPrimary}`}>{table.tableNumber}</p>
                                                        <p className={`text-[10px] font-bold ${theme.textMuted} flex items-center gap-1 mt-0.5`}><Users size={9} /> {table.capacity} seats</p>
                                                        <div className={`flex items-center justify-between mt-3 pt-2 border-t ${theme.borderLight}`}>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg ${table.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : table.status === 'OCCUPIED' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20'}`}>
                                                                {table.status || 'AVAILABLE'}
                                                            </span>
                                                            {hasTableEdit && (
                                                                <button onClick={() => handleEditTable(table)} className={`p-1.5 rounded-lg ${theme.textMuted} hover:text-indigo-600 transition-colors`}>
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-2xl">
                                                <p className={`text-xs font-bold italic ${theme.textMuted}`}>No tables yet.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    }) : (
                        <div className="p-12 text-center">
                            <p className={`text-xs font-bold uppercase tracking-widest ${theme.textMuted}`}>{!branchId ? "Select a branch to view categories." : "No categories found. Create one to begin."}</p>
                        </div>
                    )}
                </div>

                {/* ── Desktop table layout (sm+) ── */}
                <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${theme.pageBg} ${theme.textMuted} text-[10px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                <th className="p-6">Dining Category</th>
                                <th className="p-6">Environment</th>
                                <th className="p-6 text-center">Active</th>
                                <th className="p-6 text-center">Actions</th>
                                <th className="p-6 text-center w-20">Tables</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.borderLight}`}>
                            {categories.length > 0 ? categories.map((category) => {
                                const isExpanded = expandedCategories[category._id];
                                const categoryTables = groupedTables[category._id] || [];
                                
                                return (
                                    <React.Fragment key={category._id}>
                                        <tr
                                            onClick={() => toggleCategory(category._id)}
                                            className={`group hover:${theme.pageBg} transition-all cursor-pointer ${isExpanded ? theme.pageBg : ''}`}
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : `${theme.pageBg} ${theme.textMuted} group-hover:bg-indigo-600 group-hover:text-white`}`}>
                                                        <LayoutDashboard size={24} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-lg font-black tracking-tight ${theme.textHeading}`}>
                                                            {category.name}
                                                        </p>
                                                        <p className={`text-xs font-bold ${theme.textMuted}`}>
                                                            {categoryTables.length} Tables Registered
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                                                    category.environment === 'AC' 
                                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' 
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700'
                                                }`}>
                                                    {category.environment === 'AC' ? 'AC Room' : 'Non-AC Area'}
                                                </span>
                                            </td>
                                            <td className="p-6 text-center">
                                                <button
                                                    onClick={(e) => handleToggleCategoryStatus(e, category)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${category.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${category.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    {hasCategoryEdit && (
                                                        <button
                                                            onClick={(e) => handleEditCategory(e, category)}
                                                            className={`p-2 rounded-lg ${theme.buttonHoverBg} ${theme.textSecondary} hover:${theme.textPrimary} transition-colors`}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-indigo-600 text-white rotate-180 shadow-lg shadow-indigo-200' : `${theme.pageBg} ${theme.textMuted} hover:bg-indigo-600 hover:text-white`}`}>
                                                    <ChevronDown size={20} />
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expandable Table Row */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={5} className="p-0 border-none bg-transparent">
                                                    <div className={`${theme.mode === 'dark' ? 'bg-slate-900/50' : 'bg-gray-50/50'} border-t ${theme.borderLight} p-8 animate-in slide-in-from-top-2 duration-300 overflow-hidden`}>
                                                        <div className="flex justify-between items-center mb-6">
                                                            <h4 className={`text-sm font-black uppercase tracking-widest ${theme.textPrimary} flex items-center gap-2`}>
                                                                <Monitor size={18} className="text-indigo-500" /> Tables in {category.name}
                                                            </h4>
                                                            <button
                                                                onClick={() => handleAddTable(category._id)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                                                            >
                                                                <Plus size={14} /> Add Table
                                                            </button>
                                                        </div>

                                                        {categoryTables.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                                {categoryTables.map((table) => (
                                                                    <div 
                                                                        key={table._id}
                                                                        className={`p-6 rounded-[2rem] border transition-all ${theme.surfaceBg} ${table.isActive ? 'border-indigo-100 hover:border-indigo-300 shadow-sm' : 'border-dashed opacity-60 grayscale'}`}
                                                                    >
                                                                        <div className="flex justify-between items-start mb-4">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${table.isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                                                                    <LayoutDashboard size={20} />
                                                                                </div>
                                                                                <div>
                                                                                    <p className={`font-black ${theme.textPrimary}`}>{table.tableNumber}</p>
                                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                                                        <Users size={10} /> {table.capacity} Capacity
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <button
                                                                                onClick={() => handleToggleTableStatus(table)}
                                                                                className={`p-2 rounded-lg transition-colors ${table.isActive ? 'text-indigo-600 hover:bg-indigo-50' : 'text-gray-400 hover:bg-gray-100'}`}
                                                                                title={table.isActive ? "Deactivate" : "Activate"}
                                                                            >
                                                                                {table.isActive ? <Monitor size={18} /> : <MonitorOff size={18} />}
                                                                            </button>
                                                                        </div>

                                                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                                                                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                                                                                table.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' : 
                                                                                table.status === 'OCCUPIED' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                                                                            }`}>
                                                                                {table.status || 'AVAILABLE'}
                                                                            </span>
                                                                            
                                                                            <div className="flex items-center gap-1">
                                                                                {hasTableEdit && (
                                                                                    <button
                                                                                        onClick={() => handleEditTable(table)}
                                                                                        className={`p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors`}
                                                                                    >
                                                                                        <Edit2 size={14} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="p-12 text-center border-2 border-dashed border-gray-200 dark:border-white/5 rounded-[2rem]">
                                                                <p className="text-gray-400 font-bold italic text-sm">No tables added to this category yet.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                        {!branchId
                                            ? "Select a branch from the top bar to view dining categories."
                                            : "No categories found for this branch. Create one to begin."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>{/* end desktop table */}
            </div>

            <DiningCategoryDialog
                isOpen={isCategoryDialogOpen}
                onClose={() => setIsCategoryDialogOpen(false)}
                onSuccess={fetchData}
                category={editingCategory}
                shopId={shopId}
                branchId={branchId}
            />

            <TableDialog
                isOpen={isTableDialogOpen}
                onClose={() => setIsTableDialogOpen(false)}
                onSuccess={fetchData}
                table={editingTable}
                categories={categories}
                shopId={shopId}
                branchId={branchId}
                initialCategoryId={activeCategoryIdForTable}
            />
        </div>
    );
};

export default DiningCategoryList;
