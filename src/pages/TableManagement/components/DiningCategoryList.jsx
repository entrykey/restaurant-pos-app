import React, { useState, useEffect } from 'react';
import CommonTable from '../../../components/CommonTable';
import { useTheme } from '../../../context/ThemeContext';
import { diningCategoryService } from '../../../services/api';
import DiningCategoryDialog from './DiningCategoryDialog';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { usePermission } from '../../../auth/usePermission';
import { ACTIONS } from '../../../constants/actions';
import { MODULES } from '../../../constants/modules';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const DiningCategoryList = ({ triggerCreate, onResetCreate }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const { can } = usePermission();
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    // Permissions: DININGCATEGORY.VIEWING, DININGCATEGORY.EDITING, DININGCATEGORY.CREATING, DININGCATEGORY.DELETING
    const hasCreatePermission = can(MODULES.TABLE_MANAGEMENT, 'DININGCATEGORY.CREATING') || user?.role?.name === 'SuperAdmin';
    const hasEditPermission = can(MODULES.TABLE_MANAGEMENT, 'DININGCATEGORY.EDITING') || user?.role?.name === 'SuperAdmin';
    const hasDeletePermission = can(MODULES.TABLE_MANAGEMENT, 'DININGCATEGORY.DELETING') || user?.role?.name === 'SuperAdmin';

    const branchId = activeBranchId || user?.branchId || user?.branch || (user?.branchIds?.length ? user.branchIds[0] : null);
    const shopId = user?.shop_id || user?.shopId || user?.shop;

    useEffect(() => {
        fetchData();
    }, [branchId, shopId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = { all: true };
            if (branchId) params.branchId = branchId;

            const res = await diningCategoryService.getCategories(params);
            setCategories(res || []);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to load dining categories');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (triggerCreate) {
            setEditingCategory(null);
            setIsDialogOpen(true);
            onResetCreate();
        }
    }, [triggerCreate]);

    const handleCreate = () => {
        setEditingCategory(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setIsDialogOpen(true);
    };

    const handleDelete = async (category) => {
        if (!window.confirm(`Are you sure you want to delete category "${category.name}"?`)) return;

        try {
            await diningCategoryService.deleteCategory(category._id);
            toast.success('Category deleted successfully');
            fetchData();
        } catch (error) {
            toast.error(error.message || 'Failed to delete category');
        }
    };

    const handleToggleActive = async (category) => {
        if (!hasEditPermission && !hasDeletePermission) {
            toast.error("You don't have permission to edit categories");
            return;
        }

        try {
            await diningCategoryService.updateCategory(category._id, { isActive: !category.isActive });
            toast.success(`Category ${!category.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchData();
        } catch (error) {
            toast.error('Failed to change category status');
        }
    };

    const columns = [
        {
            header: 'Name',
            key: 'name',
            render: (val) => (
                <div className="font-semibold">{val}</div>
            )
        },
        {
            header: 'Environment',
            key: 'environment',
            render: (val) => {
                const isAC = val === 'AC';
                return (
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm border ${
                        isAC 
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' 
                        : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700'
                    }`}>
                        {isAC ? 'AC Room' : 'Non-AC Area'}
                    </span>
                );
            }
        },
        {
            header: 'Active',
            key: 'isActive',
            render: (val, row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); handleToggleActive(row); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${val ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            )
        },
        {
            header: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    {(hasEditPermission) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
                            className={`p-2 rounded-lg ${theme.buttonHoverBg} ${theme.textSecondary} hover:${theme.textPrimary} transition-colors`}
                            title="Edit Category"
                        >
                            <Edit2 size={16} />
                        </button>
                    )}
                    {(hasDeletePermission) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Category"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="flex flex-col gap-4">
            {/* Create button moved to parent TableManagement.jsx */}

            <CommonTable
                columns={columns}
                data={categories}
                isLoading={isLoading}
                emptyMessage="No categories found. Create one to get started."
            />

            <DiningCategoryDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={fetchData}
                category={editingCategory}
                shopId={shopId}
                branchId={branchId}
            />
        </div>
    );
};

export default DiningCategoryList;
