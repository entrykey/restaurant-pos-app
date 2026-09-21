import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { shopExpenseService } from '../../services/api/shopExpenses';
import { dashboardService } from '../../services/api';
import OperatingExpenseCard from '../../components/cards/OperatingExpenseCard';
import { ArrowLeft, Plus, X, Building2, ChevronDown, TrendingUp, History, Settings2, Calendar, ShoppingBag, Coins, TrendingDown, FileText, ArrowRightCircle, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import CommonSelect from '../../components/ui/CommonSelect';
import CommonDialog from '../../components/modals/CommonDialog';
import { PurchaseService } from '../../services/PurchaseService';
import { toast } from 'react-hot-toast';

const OperatingExpenses = () => {
    const { user } = useAuth();
    const { activeBranchId, branches, organization, formatCurrency } = useApp();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const urlTab = queryParams.get('tab');
    const urlStartDate = queryParams.get('startDate');
    const urlEndDate = queryParams.get('endDate');

    const [selectedBranchId, setSelectedBranchId] = useState(activeBranchId || user?.branchId || branches[0]?._id);
    const [expenses, setExpenses] = useState([]);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '', categoryName: '' });
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showAddInput, setShowAddInput] = useState(false);
    const [showBranchDropdown, setShowBranchDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState(() => urlTab || 'expenses'); // 'expenses', 'drafts', or 'timeline'
    const [todayProfit, setTodayProfit] = useState(0);
    const [profitTimeline, setProfitTimeline] = useState([]);
    const [expandedDate, setExpandedDate] = useState(null);
    const [deletedDefaultCategories, setDeletedDefaultCategories] = useState([]);

    useEffect(() => {
        if (urlTab) {
            setActiveTab(urlTab);
        }
    }, [urlTab]);

    useEffect(() => {
        if (urlStartDate) {
            setExpandedDate(urlStartDate);
        }
    }, [urlStartDate]);

    const defaultCategories = ['Salary', 'Rent', 'Electricity', 'Water'];

    // Determine which branches this user can see/manage
    const filteredBranches = (branches || []).filter(b => {
        const branchShopId = b.shopId || b.shop_id;
        const userShopId = user?.shop_id || user?.shopId;
        const belongsToShop = branchShopId?.toString() === userShopId?.toString();

        if (!belongsToShop) return false;

        if (user?.isBranchUser) {
            return user.branchIds?.includes(b._id.toString()) || b._id.toString() === user.branchId?.toString();
        }
        return true;
    });

    useEffect(() => {
        if (filteredBranches.length > 0) {
            const isValid = filteredBranches.some(b => b._id.toString() === selectedBranchId?.toString());
            if (!isValid) {
                setSelectedBranchId(filteredBranches[0]._id);
            }
        }
    }, [filteredBranches, selectedBranchId]);

    const fetchData = useCallback(async () => {
        const resolvedShopId = user?.shopId || user?.shop_id;
        if (!selectedBranchId || !resolvedShopId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const shopId = resolvedShopId;
            const branchId = selectedBranchId;
            
            // Fetch Fixed Expenses (including drafts)
            const expenseRes = await shopExpenseService.getExpenses(shopId, branchId);
            const fetchedExpenses = expenseRes.data;

            // Separate drafts from actual expenses
            const actualExpenses = fetchedExpenses.filter(e => !e.isDraft && e.category !== 'Stock');
            const draftExpenses = fetchedExpenses.filter(e => e.isDraft);

            if (activeTab === 'drafts') {
                // Show only draft expenses
                setExpenses(draftExpenses);
            } else if (activeTab === 'expenses') {
                // Ensure default categories exist in actual expenses unless deleted
                const finalExpenses = [...actualExpenses];
                defaultCategories.forEach(cat => {
                    if (!deletedDefaultCategories.includes(cat) && !finalExpenses.find(e => e.category === cat)) {
                        finalExpenses.push({
                            category: cat,
                            amount: 0,
                            term: 'monthly',
                            isDefault: true,
                            isNew: true
                        });
                    }
                });

                // Fetch Stock Expenses (Purchases for this branch) and combine into one
                const purchaseRes = await PurchaseService.getPurchases({
                    shopId,
                    branchId,
                    status: 'COMPLETED',
                    limit: 1000
                });
                
                // Calculate total stock amount from all purchases
                const totalStockAmount = (purchaseRes?.purchases || []).reduce((sum, purchase) => {
                    return sum + (purchase.grandTotal || 0);
                }, 0);

                // Find existing Stock expense or create new one
                const existingStockExpense = fetchedExpenses.find(e => e.category === 'Stock');
                if (existingStockExpense) {
                    finalExpenses.push({
                        ...existingStockExpense,
                        amount: totalStockAmount,
                        isPurchase: true
                    });
                } else {
                    finalExpenses.push({
                        category: 'Stock',
                        amount: totalStockAmount,
                        term: 'one time',
                        isDefault: false,
                        isNew: false,
                        isPurchase: true
                    });
                }
                
                setExpenses(finalExpenses);
            }

            // Fetch Today's Profit for header
            const dashboardData = await dashboardService.getShopDashboard(shopId);
            setTodayProfit(dashboardData.totalProfit || 0);

            // Fetch Profit Timeline
            const timelineData = await dashboardService.getProfitTimeline(shopId, branchId);
            setProfitTimeline(timelineData);

        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.shopId, user?.shop_id, selectedBranchId, activeTab, deletedDefaultCategories]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUpdate = (index, updates) => {
        const newExpenses = [...expenses];
        newExpenses[index] = { ...newExpenses[index], ...updates };
        setExpenses(newExpenses);
    };

    const handleSave = async (index) => {
        const expense = expenses[index];
        const shopId = user?.shopId || user?.shop_id;
        const branchId = selectedBranchId;

        if (!branchId) {
            toast.error("Please select a branch first");
            return;
        }

        setSavingId(index);
        try {
            await shopExpenseService.upsertExpense(shopId, branchId, {
                _id: expense._id,
                category: expense.category,
                amount: expense.amount,
                term: expense.term,
                isDefault: expense.isDefault || false,
                isDraft: activeTab === 'drafts'
            });
            toast.success(activeTab === 'drafts' ? "Draft expense saved successfully" : "Expense saved successfully");
            fetchData();
        } catch (error) {
            console.error("Failed to save expense:", error);
            toast.error(error?.response?.data?.message || error?.message || "Failed to save expense");
        } finally {
            setSavingId(null);
        }
    };

    const handleDeleteExpense = (index) => {
        const expense = expenses[index];
        if (!expense._id || expense.isNew) {
            if (expense.category) {
                setDeletedDefaultCategories(prev => [...prev, expense.category]);
            }
            setExpenses(expenses.filter((_, i) => i !== index));
            return;
        }

        setDeleteModal({
            isOpen: true,
            id: expense._id,
            title: `Delete category "${expense.category}"?`,
            categoryName: expense.category
        });
    };

    const handleDeleteExpenseFromAccordion = (expenseId, categoryName) => {
        if (!expenseId) return;
        setDeleteModal({
            isOpen: true,
            id: expenseId,
            title: `Delete expense "${categoryName || 'item'}"?`,
            categoryName: categoryName
        });
    };

    const handleConfirmDeleteExpense = async () => {
        if (!deleteModal.id) return;
        try {
            await shopExpenseService.deleteExpense(deleteModal.id);
            if (deleteModal.categoryName) {
                setDeletedDefaultCategories(prev => [...prev, deleteModal.categoryName]);
            }
            toast.success("Expense deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Failed to delete expense:", error);
            toast.error("Failed to delete expense");
        } finally {
            setDeleteModal({ isOpen: false, id: null, title: '', categoryName: '' });
        }
    };

    const handleAddCategory = () => {
        if (!newCategoryName.trim()) return;

        if (expenses.find(e => e.category.toLowerCase() === newCategoryName.trim().toLowerCase())) {
            toast.error("Category already exists");
            return;
        }

        setExpenses([{
            category: newCategoryName.trim(),
            amount: 0,
            term: 'monthly',
            isDefault: false,
            isNew: true,
            isDraft: activeTab === 'drafts'
        }, ...expenses]);

        setNewCategoryName('');
        setShowAddInput(false);
    };

    const handleMoveToDraft = async (expense) => {
        const shopId = user?.shopId || user?.shop_id;
        const branchId = selectedBranchId;
        
        setSavingId(expense._id);
        try {
            await shopExpenseService.upsertExpense(shopId, branchId, {
                ...expense,
                isDraft: true
            });
            toast.success("Expense moved to Draft Expenses");
            setActiveTab('drafts');
        } catch (error) {
            console.error("Failed to move to draft:", error);
            toast.error(error?.response?.data?.message || error?.message || "Failed to move to draft");
        } finally {
            setSavingId(null);
        }
    };

    const handleMoveToExpense = async (expense) => {
        if (!expense._id) {
            toast.error("Please save the draft first");
            return;
        }

        setSavingId(expense._id);
        try {
            await shopExpenseService.moveDraftToExpense(expense._id);
            toast.success("Expense moved to Manage Expenses");
            setActiveTab('expenses');
        } catch (error) {
            console.error("Failed to move to expenses:", error);
            toast.error(error?.response?.data?.message || error?.message || "Failed to move to expenses");
        } finally {
            setSavingId(null);
        }
    };

    const filteredTimeline = useMemo(() => {
        if (!urlStartDate && !urlEndDate) return profitTimeline;
        return profitTimeline.filter(day => {
            if (urlStartDate && urlEndDate) {
                return day.date >= urlStartDate && day.date <= urlEndDate;
            } else if (urlStartDate) {
                return day.date >= urlStartDate;
            } else if (urlEndDate) {
                return day.date <= urlEndDate;
            }
            return true;
        });
    }, [profitTimeline, urlStartDate, urlEndDate]);

    const totalDailyExpense = expenses.reduce((sum, exp) => {
        if (exp.term === 'one time' || exp.isDraft) return sum;
        const termDaysMap = {
            'daily': 1, 'monthly': 30, '2months': 60, '3months': 90, '6months': 180, 'yearly': 365
        };
        return sum + (exp.amount / (termDaysMap[exp.term] || 30));
    }, 0);

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    if (loading && expenses.length === 0) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className={`p-8 space-y-8 w-full h-full overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`p-2 ${theme.surfaceBg} border ${theme.borderLight} rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors`}
                    >
                        <ArrowLeft className={`w-5 h-5 ${theme.textPrimary}`} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-gray-800">Operating Expenses</h1>
                        <p className="text-gray-500 mt-1 uppercase text-[10px] font-black tracking-widest">Analytics & Management</p>
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Branch Filter */}
                    {filteredBranches.length > 1 && (
                        <div className="min-w-[200px]">
                            <CommonSelect
                                options={filteredBranches.map(b => ({ label: b.name, value: b._id }))}
                                value={selectedBranchId}
                                onChange={(val) => setSelectedBranchId(val)}
                                placeholder="Select Branch"
                            />
                        </div>
                    )}

                    <div className={`${theme.surfaceBg} p-4 rounded-2xl border ${theme.borderLight} text-right min-w-[150px]`}>
                        <p className={`text-[10px] uppercase font-black tracking-widest ${theme.textMuted}`}>Total Daily Cost</p>
                        <p className="text-2xl font-black text-indigo-600">{formatCurrency(totalDailyExpense)}</p>
                    </div>

                    <div className={`${todayProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'} p-4 rounded-2xl border text-right min-w-[150px]`}>
                        <p className={`text-[10px] uppercase font-black tracking-widest ${todayProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>Today Profit</p>
                        <p className={`text-2xl font-black ${todayProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {formatCurrency(todayProfit)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tab Switching */}
            <div className={`flex gap-2 p-1 ${theme.surfaceBg} border ${theme.borderLight} rounded-2xl w-fit`}>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'expenses'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : `${theme.textMuted} hover:bg-gray-100 dark:hover:bg-white/5`
                        }`}
                >
                    <Settings2 size={18} />
                    Manage Expenses
                </button>
                <button
                    onClick={() => setActiveTab('drafts')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'drafts'
                        ? 'bg-amber-600 text-white shadow-lg'
                        : `${theme.textMuted} hover:bg-gray-100 dark:hover:bg-white/5`
                        }`}
                >
                    <FileText size={18} />
                    Draft Expenses
                </button>
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${activeTab === 'timeline'
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : `${theme.textMuted} hover:bg-gray-100 dark:hover:bg-white/5`
                        }`}
                >
                    <History size={18} />
                    Profit History
                </button>
            </div>

            {activeTab === 'expenses' || activeTab === 'drafts' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Add Category Card */}
                    {!showAddInput ? (
                        <button
                            onClick={() => setShowAddInput(true)}
                            className={`h-full min-h-[200px] border-2 border-dashed ${activeTab === 'drafts' ? 'border-amber-300' : theme.borderLight} rounded-[32px] flex flex-col items-center justify-center gap-4 ${activeTab === 'drafts' ? 'text-amber-600 hover:border-amber-500 hover:bg-amber-50/50' : 'text-gray-400 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50/50'} transition-all group order-last`}
                        >
                            <div className={`p-4 ${activeTab === 'drafts' ? 'bg-amber-50' : 'bg-gray-50 dark:bg-white/5'} rounded-2xl ${activeTab === 'drafts' ? 'group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30' : 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30'} transition-colors`}>
                                <Plus size={32} />
                            </div>
                            <span className="font-bold uppercase tracking-widest text-sm text-[11px]">
                                {activeTab === 'drafts' ? 'Add Draft Category' : 'Add Custom Category'}
                            </span>
                        </button>
                    ) : (
                        <div className={`${theme.surfaceBg} p-6 rounded-[32px] border-2 ${activeTab === 'drafts' ? 'border-amber-500' : 'border-indigo-500'} shadow-xl space-y-4 flex flex-col items-center justify-center order-first animate-in zoom-in-95 duration-200`}>
                            <div className="w-full">
                                <label className={`block text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>New Category Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                    placeholder="e.g. Broadband"
                                    className={`w-full p-4 ${theme.pageBg} rounded-2xl outline-none font-bold ${theme.textPrimary}`}
                                />
                            </div>
                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={handleAddCategory}
                                    className={`flex-1 ${activeTab === 'drafts' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white p-4 rounded-xl font-black shadow-lg transition-all`}
                                >
                                    ADD
                                </button>
                                <button
                                    onClick={() => { setShowAddInput(false); setNewCategoryName(''); }}
                                    className={`p-4 ${theme.pageBg} ${theme.textSecondary} rounded-xl hover:bg-gray-100 transition-all`}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Show regular expenses or drafts based on active tab */}
                    {expenses.map((expense, idx) => (
                        <OperatingExpenseCard
                            key={expense._id || expense.category || idx}
                            {...expense}
                            isSaving={savingId === idx || savingId === expense._id}
                            isDraft={activeTab === 'drafts'}
                            onUpdate={(updates) => handleUpdate(idx, updates)}
                            onSave={() => handleSave(idx)}
                            onDelete={() => handleDeleteExpense(idx)}
                            onMoveToExpense={activeTab === 'drafts' ? () => handleMoveToExpense(expense) : null}
                        />
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    {(urlStartDate || urlEndDate) && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-widest">
                            <Calendar size={12} />
                            {urlStartDate === urlEndDate ? `Showing Today: ${urlStartDate}` : `${urlStartDate || '—'} → ${urlEndDate || '—'}`}
                            <button
                                onClick={() => navigate('/dashboard/operating-expenses?tab=timeline')}
                                className="ml-1 hover:text-red-500 transition-colors"
                                title="Show full 30 days history"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                    <div className={`overflow-hidden rounded-[32px] border ${theme.borderLight} ${theme.surfaceBg} shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-white/5 text-gray-400 text-[10px] uppercase font-black border-b border-gray-100 dark:border-white/5 tracking-widest">
                                        <th className="p-6">Date</th>
                                        <th className="p-6 text-right">Revenue</th>
                                        <th className="p-6 text-right">Gross Profit</th>
                                        <th className="p-6 text-right">Daily Expense</th>
                                        <th className="p-6 text-right">Net Profit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                    {filteredTimeline.length > 0 ? filteredTimeline.map((day) => (
                                    <React.Fragment key={day.date}>
                                        <tr
                                            onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                                            className={`cursor-pointer transition-colors group ${expandedDate === day.date ? 'bg-indigo-50/30' : 'hover:bg-gray-50/50 dark:hover:bg-white/5'}`}
                                        >
                                            <td className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${expandedDate === day.date ? 'bg-indigo-600 text-white shadow-lg' : `${theme.pageBg} ${theme.borderLight} border ${theme.textMuted}`}`}>
                                                        <Calendar size={18} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold ${theme.textPrimary}`}>{formatDate(day.date)}</span>
                                                        <span className="text-[10px] uppercase font-black text-indigo-500 flex items-center gap-1 mt-0.5">
                                                            {day.itemsSummary?.length || 0} products sold
                                                            <ChevronDown size={10} className={`transition-transform ${expandedDate === day.date ? 'rotate-180' : ''}`} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <ShoppingBag size={14} className="text-blue-500" />
                                                    <span className={`font-black ${theme.textPrimary}`}>{formatCurrency(day.revenue)}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right font-black text-gray-600">
                                                {formatCurrency(day.grossProfit)}
                                            </td>
                                            <td className={`p-6 text-right font-bold ${day.dailyExpense < 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {formatCurrency(day.dailyExpense)}
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black ${day.netProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {day.netProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                    {formatCurrency(day.netProfit)}
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedDate === day.date && (
                                            <tr>
                                                <td colSpan={5} className="p-0 bg-gray-50/30 dark:bg-white/2">
                                                    <div className="p-8 border-l-4 border-indigo-600 animate-in slide-in-from-top-4 duration-300">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                            {/* Product Breakdown */}
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-4">
                                                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center">
                                                                        <ShoppingBag size={14} />
                                                                    </div>
                                                                    <h3 className={`text-sm font-black uppercase tracking-widest ${theme.textPrimary}`}>Product Breakdown</h3>
                                                                </div>
                                                                <div className={`overflow-hidden rounded-2xl border ${theme.borderLight} ${theme.surfaceBg}`}>
                                                                    <table className="w-full text-left">
                                                                        <thead>
                                                                            <tr className="bg-gray-50/50 dark:bg-white/5 text-[9px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100 dark:border-white/5">
                                                                                <th className="p-4">Item Name</th>
                                                                                <th className="p-4 text-center">Qty</th>
                                                                                <th className="p-4 text-right">Revenue</th>
                                                                                <th className="p-4 text-right">Gross Profit</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                                                            {(day.itemsSummary || []).map((item, idx) => (
                                                                                <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-white/2 transition-colors">
                                                                                    <td className={`p-4 font-bold ${theme.textPrimary}`}>{item.name}</td>
                                                                                    <td className="p-4 text-center">
                                                                                        <span className={`px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-[11px] font-black ${theme.textMuted}`}>
                                                                                            {item.quantity}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className={`p-4 text-right font-black ${theme.textPrimary}`}>{formatCurrency(item.revenue)}</td>
                                                                                    <td className={`p-4 text-right font-black ${item.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                                        {formatCurrency(item.profit)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>

                                                            {/* Expense Breakdown */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
                                                                            <Coins size={14} />
                                                                        </div>
                                                                        <h3 className={`text-sm font-black uppercase tracking-widest ${theme.textPrimary}`}>Expense Breakdown</h3>
                                                                    </div>
                                                                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                                                                        Daily Expense: <span className={day.dailyExpense < 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(day.dailyExpense)}</span>
                                                                    </span>
                                                                </div>
                                                                <div className={`overflow-hidden rounded-2xl border ${theme.borderLight} ${theme.surfaceBg}`}>
                                                                    <table className="w-full text-left">
                                                                        <thead>
                                                                            <tr className="bg-gray-50/50 dark:bg-white/5 text-[9px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100 dark:border-white/5">
                                                                                <th className="p-4">Category</th>
                                                                                <th className="p-4 text-center">Term</th>
                                                                                <th className="p-4 text-right">Daily Cost</th>
                                                                                <th className="p-4 text-center">Action</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                                                            {(day.expensesSummary || []).length > 0 ? (
                                                                                day.expensesSummary.map((exp, idx) => {
                                                                                    const isNegative = (exp.dailyCost < 0 || exp.amount < 0);
                                                                                    return (
                                                                                        <tr key={exp._id || idx} className="hover:bg-gray-50/30 dark:hover:bg-white/2 transition-colors">
                                                                                            <td className="p-4">
                                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                                    <span className={`font-bold ${theme.textPrimary}`}>{exp.category}</span>
                                                                                                    {isNegative && (
                                                                                                        <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 rounded">
                                                                                                            Negative Expense
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="p-4 text-center">
                                                                                                <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-[10px] font-black uppercase text-gray-500">
                                                                                                    {exp.term}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="p-4 text-right">
                                                                                                <span className={`font-black ${isNegative ? 'text-red-600 dark:text-red-400' : theme.textPrimary}`}>
                                                                                                    {formatCurrency(exp.dailyCost)}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="p-4 text-center">
                                                                                                {exp._id && (
                                                                                                    <button
                                                                                                        onClick={() => handleDeleteExpenseFromAccordion(exp._id, exp.category)}
                                                                                                        title="Delete Expense"
                                                                                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                                                    >
                                                                                                        <Trash2 size={14} />
                                                                                                    </button>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })
                                                                            ) : (
                                                                                <tr>
                                                                                    <td colSpan={4} className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                                                                                        No expenses logged
                                                                                    </td>
                                                                                </tr>
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                            No data for the last 30 days
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

            {/* Delete Confirmation Modal */}
            <CommonDialog
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, id: null, title: '', categoryName: '' })}
                onConfirm={handleConfirmDeleteExpense}
                title="Delete Expense"
                message={deleteModal.title || "Are you sure you want to delete this expense?"}
                type="error"
                confirmText="Delete Expense"
                cancelText="Cancel"
            />
        </div>
    );
};

export default OperatingExpenses;
