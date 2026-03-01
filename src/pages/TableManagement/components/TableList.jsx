import React, { useState, useEffect } from 'react';
import CommonTable from '../../../components/CommonTable';
import { useTheme } from '../../../context/ThemeContext';
import { tableService, diningCategoryService } from '../../../services/api';
import TableDialog from './TableDialog';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { usePermission } from '../../../auth/usePermission';
import { ACTIONS } from '../../../constants/actions';
import { MODULES } from '../../../constants/modules';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TableList = ({ triggerCreate, onResetCreate }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const { can } = usePermission();
    const [tables, setTables] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTable, setEditingTable] = useState(null);

    // Permission checks (keys from user req: TABLE.CREATING, TABLE.EDITING, TABLE.DELETING)
    const hasCreatePermission = can(MODULES.TABLE_MANAGEMENT, 'TABLE.CREATING') || user?.role?.name === 'SuperAdmin';
    const hasEditPermission = can(MODULES.TABLE_MANAGEMENT, 'TABLE.EDITING') || user?.role?.name === 'SuperAdmin';
    const hasDeletePermission = can(MODULES.TABLE_MANAGEMENT, 'TABLE.DELETING') || user?.role?.name === 'SuperAdmin';

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

            // Fetch both tables and categories so we can display category names
            const [tablesRes, categoriesRes] = await Promise.all([
                tableService.getTables(params),
                diningCategoryService.getCategories(params)
            ]);

            setTables(tablesRes || []);
            setCategories(categoriesRes || []);
        } catch (error) {
            console.error('Error fetching tables data:', error);
            toast.error('Failed to load tables');
        } finally {
            setIsLoading(false);
        }
    };

    // Changed handleCreate to open create instantly from props
    useEffect(() => {
        if (triggerCreate) {
            setEditingTable(null);
            setIsDialogOpen(true);
            onResetCreate();
        }
    }, [triggerCreate]);

    const handleCreate = () => {
        setEditingTable(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (table) => {
        setEditingTable(table);
        setIsDialogOpen(true);
    };

    const handleDelete = async (table) => {
        if (!window.confirm(`Are you sure you want to delete table ${table.tableNumber}?`)) return;

        try {
            await tableService.deleteTable(table._id);
            toast.success('Table deleted successfully');
            fetchData();
        } catch (error) {
            toast.error(error.message || 'Failed to delete table');
        }
    };

    const handleToggleActive = async (table) => {
        if (!hasEditPermission && !hasDeletePermission) {
            toast.error("You don't have permission to edit tables");
            return;
        }

        try {
            await tableService.updateTable(table._id, { isActive: !table.isActive });
            toast.success(`Table ${!table.isActive ? 'activated' : 'deactivated'} successfully`);
            fetchData();
        } catch (error) {
            toast.error('Failed to change table status');
        }
    };

    const columns = [
        {
            header: 'Table Number',
            key: 'tableNumber',
            render: (val, row) => (
                <div className="font-semibold">{val}</div>
            )
        },
        {
            header: 'Dining Category',
            key: 'diningCategoryId',
            render: (val, row) => {
                const category = val?.name ? val : categories.find(c => c._id === (val?._id || val));
                return (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 rounded-md">
                        {category?.name || 'Unknown'} ({(category?.environment || row.diningCategoryId?.environment) === 'AC' ? 'AC' : 'Non-AC'})
                    </span>
                );
            }
        },
        {
            header: 'Capacity',
            key: 'capacity',
        },
        {
            header: 'Status',
            key: 'status',
            render: (val) => {
                const colors = {
                    'AVAILABLE': 'bg-green-100 text-green-700',
                    'OCCUPIED': 'bg-red-100 text-red-700',
                    'RESERVED': 'bg-orange-100 text-orange-700',
                    'CLEANING': 'bg-blue-100 text-blue-700'
                };
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[val] || 'bg-gray-100'}`}>
                        {val || 'AVAILABLE'}
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
                            title="Edit Table"
                        >
                            <Edit2 size={16} />
                        </button>
                    )}
                    {(hasDeletePermission) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Table"
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
                data={tables}
                isLoading={isLoading}
                emptyMessage="No tables found. Create one to get started."
            />

            <TableDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={fetchData}
                table={editingTable}
                categories={categories}
                shopId={shopId}
                branchId={branchId}
            />
        </div>
    );
};

export default TableList;
