import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit3, Trash2, X, Save, Phone, Mail, MapPin } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import { SupplierService } from './SupplierService';
import { ROUTE_ACCESS } from '../../config/permissionStructure';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';

const PAGE_LIMIT = 10;

const Supplier = ({ hasPermissionFor, permissionModule, permissionResource, isEmbedded }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const { theme } = useTheme();
    const { currentShopId } = useApp();

    const [formData, setFormData] = useState({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        taxId: "",
        status: "ACTIVE"
    });

    // Check permissions (when used under Parties, permissionModule/permissionResource override)
    const supplierAccess = permissionModule != null && permissionResource != null
        ? { module: permissionModule, resource: permissionResource }
        : ROUTE_ACCESS.SUPPLIERS;
    const canView = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "view") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");
    const canCreate = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "create") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");
    const canEdit = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "edit") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");
    const canDelete = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "delete") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");

    const loadSuppliers = React.useCallback(async (search = "", page = 1) => {
        if (!currentShopId) return;
        setLoading(true);
        try {
            const result = await SupplierService.getSuppliers(currentShopId, search, page, PAGE_LIMIT);
            setSuppliers(result.data || []);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotalCount(result.pagination?.total || 0);
            setCurrentPage(result.pagination?.page || 1);
        } catch (error) {
            console.error("Failed to load suppliers", error);
        } finally {
            setLoading(false);
        }
    }, [currentShopId]);

    useEffect(() => {
        if (currentShopId) {
            loadSuppliers("", 1);
        }
    }, [currentShopId, loadSuppliers]);

    // Debounced search — reset to page 1
    useEffect(() => {
        if (!currentShopId) return;
        const timer = setTimeout(() => {
            setCurrentPage(1);
            loadSuppliers(searchTerm, 1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]); // eslint-disable-line

    // Page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
        loadSuppliers(searchTerm, page);
    };

    const handleOpenModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData(supplier);
        } else {
            setEditingSupplier(null);
            setFormData({
                name: "",
                contactPerson: "",
                phone: "",
                email: "",
                address: "",
                taxId: "",
                status: "ACTIVE"
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingSupplier) {
                await SupplierService.updateSupplier(editingSupplier._id || editingSupplier.id, formData);
            } else {
                await SupplierService.addSupplier({ ...formData, shopId: currentShopId });
            }
            setIsModalOpen(false);
            await loadSuppliers(searchTerm, currentPage);
        } catch (error) {
            alert("Failed to save supplier: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        if (!canEdit) return;
        const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        try {
            await SupplierService.updateSupplier(item._id || item.id, { ...item, status: newStatus });
            await loadSuppliers(searchTerm, currentPage);
        } catch (error) {
            alert("Failed to update status: " + (error.message || "Unknown error"));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this supplier?")) {
            setLoading(true);
            await SupplierService.deleteSupplier(id);
            // If last item on page, go back one page
            const newPage = suppliers.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
            await loadSuppliers(searchTerm, newPage);
            setLoading(false);
        }
    };

    const columns = [
        {
            header: "#",
            key: "_serial",
            className: `text-xs font-black ${theme.textMuted} w-10`,
            render: (_, __, idx) => (
                <span className={`text-xs font-black ${theme.textMuted}`}>
                    {(currentPage - 1) * PAGE_LIMIT + idx + 1}
                </span>
            )
        },
        {
            header: "Supplier Name",
            key: "name",
            render: (value, item) => (
                <div>
                    <div className={`font-bold ${theme.textHeading}`}>{value}</div>
                    <div className={`text-xs ${theme.textMuted}`}>{item.taxId}</div>
                </div>
            )
        },
        {
            header: "Contact Person",
            key: "contactPerson",
            className: `text-sm font-medium ${theme.textSecondary}`
        },
        {
            header: "Contact Info",
            key: "phone",
            render: (_, item) => (
                <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-xs font-bold ${theme.textSecondary}`}>
                        <Phone size={12} /> {item.phone}
                    </div>
                    {item.email && (
                        <div className={`flex items-center gap-2 text-xs ${theme.textMuted}`}>
                            <Mail size={12} /> {item.email}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Status",
            key: "status",
            render: (value, item) => (
                <button
                    onClick={(e) => { e.stopPropagation(); handleToggleStatus(item); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            )
        }
    ];

    if (canEdit || canDelete) {
        columns.push({
            header: "Actions",
            key: "actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, item) => (
                <div className="flex justify-end gap-2">
                    {canEdit && (
                        <button
                            onClick={() => handleOpenModal(item)}
                            className={`p-2 transition-colors rounded-xl ${theme.inputBg} ${theme.primaryIconText} hover:bg-indigo-600 hover:text-white`}
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(item._id || item.id)}
                            className={`p-2 transition-colors rounded-xl ${theme.inputBg} text-red-400 hover:bg-red-500 hover:text-white`}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            )
        });
    }

    if (!canView) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme.pageBg}`}>
                <div className={`text-center p-12 rounded-[40px] shadow-xl border max-w-md ${theme.surfaceBg} ${theme.borderLight}`}>
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Truck size={40} />
                    </div>
                    <h2 className={`text-2xl font-black mb-2 ${theme.textHeading}`}>Access Restricted</h2>
                    <p className={`font-medium ${theme.textMuted}`}>You don&apos;t have permission to view Suppliers.</p>
                </div>
            </div>
        );
    }

    const content = (
        <>
            {/* Header */}
            <div className={`${isEmbedded ? 'mb-4' : 'mb-6'}`}>
                {!isEmbedded && (
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20">
                                <Truck size={28} />
                            </div>
                            <h2 className={`text-2xl md:text-4xl font-black tracking-tight ${theme.textHeading}`}>
                                Suppliers
                            </h2>
                        </div>
                        <p className={`font-bold ml-1 ${theme.textMuted}`}>Manage your supply chain partners</p>
                    </div>
                )}

                <div className={`flex flex-row gap-3 w-full ${!isEmbedded ? 'mt-4' : ''}`}>
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-3.5 ${theme.textSecondary}`} size={18} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search suppliers..."
                            className={`w-full pl-10 pr-4 py-3 border-2 border-transparent rounded-2xl shadow-sm outline-none focus:border-indigo-500 transition-all font-medium text-sm ${theme.surfaceBg} ${theme.textPrimary}`}
                        />
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex-shrink-0 bg-indigo-600 text-white px-4 md:px-6 py-3 rounded-2xl font-black shadow-xl shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus size={18} />
                            <span className="hidden sm:inline">Add Supplier</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin text-indigo-600">
                        <Truck size={32} />
                    </div>
                </div>
            ) : (
                <>
                    <CommonTable
                        columns={columns}
                        data={suppliers}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                    {/* Total count below table */}
                    <div className={`flex items-center justify-between px-2 pt-3 pb-1`}>
                        <span className={`text-xs font-bold ${theme.textMuted}`}>
                            Showing {suppliers.length > 0 ? (currentPage - 1) * PAGE_LIMIT + 1 : 0}–{Math.min(currentPage * PAGE_LIMIT, totalCount)} of {totalCount} supplier{totalCount !== 1 ? 's' : ''}
                        </span>
                        {totalCount > PAGE_LIMIT && (
                            <span className={`text-xs font-bold ${theme.textMuted}`}>
                                Page {currentPage} of {totalPages}
                            </span>
                        )}
                    </div>
                </>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className={`${theme.surfaceBg} rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
                        <div className={`p-6 md:p-8 border-b sticky top-0 z-10 flex justify-between items-center ${theme.surfaceBg} ${theme.borderLight}`}>
                            <h3 className={`text-2xl font-black flex items-center gap-3 ${theme.textHeading}`}>
                                {editingSupplier ? <Edit3 className="text-indigo-600" /> : <Plus className="text-indigo-600" />}
                                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className={`p-2 rounded-full transition-colors ${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-800`}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Supplier Name *</label>
                                    <input
                                        required
                                        className={`w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Tax ID / GSTIN</label>
                                    <input
                                        className={`w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={formData.taxId}
                                        onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Contact Person</label>
                                    <input
                                        className={`w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={formData.contactPerson}
                                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                        placeholder="Full Name (Optional)"
                                    />
                                </div>
                                {/* Status removed as requested - handled in table toggle */}
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Phone Number *</label>
                                    <div className="relative">
                                        <Phone className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input
                                            required
                                            className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+91..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Email Address</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input
                                            type="email"
                                            className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="supplier@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Address</label>
                                <div className="relative">
                                    <MapPin className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                    <textarea
                                        className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold min-h-[100px] ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Full business address..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className={`flex-1 py-4 rounded-2xl font-bold transition-all ${theme.textSecondary} ${theme.inputBg} hover:opacity-80`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    {editingSupplier ? "Save Changes" : "Create Supplier"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );

    if (isEmbedded) {
        return content;
    }

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            {content}
        </div>
    );
};

export default Supplier;
