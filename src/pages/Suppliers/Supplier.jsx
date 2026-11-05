import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit3, Trash2, X, Save, Phone, Mail, MapPin, Coins, ShoppingBag, CheckCircle2, Clock } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import CommonDialog from '../../components/modals/CommonDialog';
import SupplierPaymentModal from '../../components/modals/SupplierPaymentModal';
import { SupplierService } from './SupplierService';
import { ROUTE_ACCESS } from '../../config/permissionStructure';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import { toast } from 'react-hot-toast';
import { formatCurrency as defaultFormatCurrency } from '../../utils/format';
import { validateEmail, sanitizeEmailInput, sanitizeNameInput, sanitizePhoneInput } from '../../utils/validation';

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
    const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, id: null, name: '' });
    const [validationErrors, setValidationErrors] = useState({});
    const { theme } = useTheme();
    const { currentShopId, formatCurrency } = useApp();

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

    const [summary, setSummary] = useState({ totalSuppliers: 0, totalPurchases: 0, totalPaid: 0, totalDue: 0 });
    const [paySupplierModal, setPaySupplierModal] = useState({ isOpen: false, supplier: null });

    const openSupplierPaymentModal = (supp = null) => {
        setPaySupplierModal({ isOpen: true, supplier: supp });
    };
    const fmt = formatCurrency || defaultFormatCurrency || ((val) => '₹' + Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }));

    const loadSuppliers = React.useCallback(async (search = "", page = 1) => {
        if (!currentShopId) return;
        setLoading(true);
        try {
            const result = await SupplierService.getSuppliers(currentShopId, search, page, PAGE_LIMIT);
            setSuppliers(result.data || []);
            setTotalPages(result.pagination?.totalPages || 1);
            setTotalCount(result.pagination?.total || 0);
            setCurrentPage(result.pagination?.page || 1);
            if (result.summary) {
                setSummary(result.summary);
            } else {
                let totalDue = 0;
                let totalPurchases = 0;
                let totalPaid = 0;
                (result.data || []).forEach(s => {
                    totalDue += Number(s.totalDue !== undefined ? s.totalDue : (s.balanceAmount || s.currentBalance || 0));
                    totalPurchases += Number(s.totalPurchases || 0);
                    totalPaid += Number(s.totalPaid || 0);
                });
                setSummary({ totalSuppliers: result.pagination?.total || (result.data || []).length, totalPurchases, totalPaid, totalDue });
            }
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

    const formatAddressToString = (addr) => {
        if (!addr) return '';
        if (typeof addr === 'string') {
            return addr.trim() === '[object Object]' ? '' : addr.trim();
        }
        if (typeof addr === 'object') {
            const parts = [
                addr.line1 || addr.street || addr.addressLine1,
                addr.line2 || addr.addressLine2,
                addr.city,
                typeof addr.state === 'object' ? (addr.state?.name || addr.state?.code) : addr.state,
                addr.pincode || addr.postalCode || addr.zipCode,
                typeof addr.country === 'object' ? (addr.country?.name || addr.country?.code) : addr.country
            ].filter(Boolean);
            return parts.join(', ');
        }
        return '';
    };

    const handleOpenModal = (supplier = null) => {
        setValidationErrors({});
        if (supplier) {
            setEditingSupplier(supplier);
            const rawTax = supplier.taxId || supplier.taxNumber || supplier.gstNumber || supplier.gstin || '';
            setFormData({
                name: supplier.name || '',
                contactPerson: supplier.contactPerson || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: formatAddressToString(supplier.address),
                taxId: rawTax,
                status: supplier.status || 'ACTIVE'
            });
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

    const validateSupplierForm = () => {
        const errors = {};
        if (!formData.name || !/[a-zA-Z]/.test(formData.name) || formData.name.trim().length < 2) {
            errors.name = "Supplier name must contain at least 2 valid letters";
        }
        const cleanPhone = (formData.phone || '').replace(/[^0-9]/g, '');
        if (!cleanPhone || cleanPhone.length < 10 || cleanPhone.length > 15) {
            errors.phone = "Please enter a valid 10-15 digit phone number";
        }
        if (formData.email && !validateEmail(formData.email)) {
            errors.email = "Please enter a valid email address (e.g. name@domain.com)";
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!validateSupplierForm()) {
            return;
        }

        setLoading(true);
        try {
            const cleanGst = (formData.taxId || '').trim();
            const payload = {
                ...formData,
                taxId: cleanGst,
                taxNumber: cleanGst,
                gstNumber: cleanGst,
                gstin: cleanGst,
                address: formData.address || ''
            };

            if (editingSupplier) {
                await SupplierService.updateSupplier(editingSupplier._id || editingSupplier.id, payload);
                toast.success('Supplier updated successfully');
            } else {
                await SupplierService.addSupplier({ ...payload, shopId: currentShopId });
                toast.success('Supplier created successfully');
            }
            setIsModalOpen(false);
            await loadSuppliers(searchTerm, currentPage);
        } catch (error) {
            toast.error("Failed to save supplier: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (item) => {
        if (!canEdit) return;
        const newStatus = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
        try {
            await SupplierService.updateSupplier(item._id || item.id, { ...item, status: newStatus });
            toast.success(`Supplier status updated to ${newStatus}`);
            await loadSuppliers(searchTerm, currentPage);
        } catch (error) {
            toast.error("Failed to update status: " + (error.message || "Unknown error"));
        }
    };

    const openDeleteDialog = (item) => {
        const id = item?._id || item?.id || item;
        const name = typeof item === 'object' ? (item.name || '') : '';
        setDeleteConfirmModal({ isOpen: true, id, name });
    };

    const handleConfirmDeleteSupplier = async () => {
        if (!deleteConfirmModal.id) return;
        setLoading(true);
        try {
            await SupplierService.deleteSupplier(deleteConfirmModal.id);
            toast.success(`Supplier ${deleteConfirmModal.name ? `"${deleteConfirmModal.name}"` : ''} deleted successfully`);
            const newPage = suppliers.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
            await loadSuppliers(searchTerm, newPage);
        } catch (error) {
            toast.error("Failed to delete supplier: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
            setDeleteConfirmModal({ isOpen: false, id: null, name: '' });
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
            required: true,
            render: (value, item) => {
                const tax = item.taxId || item.taxNumber || item.gstNumber || item.gstin;
                return (
                    <div>
                        <div className={`font-bold ${theme.textHeading}`}>{value}</div>
                        {tax && <div className={`text-[10px] font-mono font-bold text-indigo-500`}>GST: {tax}</div>}
                    </div>
                );
            }
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
            header: "Payment Due",
            key: "totalDue",
            defaultVisible: true,
            required: true,
            headerClassName: "text-right",
            className: "text-right",
            exportValue: (_, item) => fmt(item.totalDue !== undefined ? item.totalDue : (item.balanceAmount || item.currentBalance || 0)),
            render: (_, item) => {
                const due = Number(item.totalDue !== undefined ? item.totalDue : (item.balanceAmount !== undefined ? item.balanceAmount : (item.currentBalance || 0)));
                return (
                    <div
                        onClick={(e) => { e.stopPropagation(); openSupplierPaymentModal(item); }}
                        className="text-right cursor-pointer group"
                        title="Click to Pay Supplier"
                    >
                        <span className={`text-sm font-black group-hover:underline ${due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {fmt(due)}
                        </span>
                        {due > 0 && (
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-500 group-hover:text-emerald-600 transition-colors">
                                To Pay • Pay Now
                            </span>
                        )}
                    </div>
                );
            }
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
        },
        // Optional / Adjustable Columns (hidden by default)
        {
            header: "GSTIN / Tax ID",
            key: "taxId",
            defaultVisible: false,
            exportValue: (_, item) => item.taxId || item.taxNumber || item.gstNumber || item.gstin || "—",
            render: (_, item) => {
                const tax = item.taxId || item.taxNumber || item.gstNumber || item.gstin;
                return (
                    <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                        {tax || "—"}
                    </span>
                );
            }
        },
        {
            header: "Address",
            key: "address",
            defaultVisible: false,
            exportValue: (_, item) => formatAddressToString(item.address) || "—",
            render: (_, item) => {
                const addrStr = formatAddressToString(item.address);
                return (
                    <span className={`text-xs ${theme.textSecondary} truncate max-w-[150px] inline-block`} title={addrStr}>
                        {addrStr || "—"}
                    </span>
                );
            }
        },
        {
            header: "State",
            key: "state",
            defaultVisible: false,
            exportValue: (_, item) => item.state || "—",
            render: (_, item) => (
                <span className={`text-xs font-medium ${theme.textSecondary}`}>
                    {item.state || "—"}
                </span>
            )
        },
        {
            header: "Payment Terms",
            key: "paymentTerms",
            defaultVisible: false,
            exportValue: (_, item) => item.paymentTerms || "—",
            render: (_, item) => (
                <span className={`text-xs font-bold ${theme.textPrimary}`}>
                    {item.paymentTerms || "—"}
                </span>
            )
        }
    ];

    if (canEdit || canDelete) {
        columns.push({
            header: "Actions",
            key: "actions",
            required: true,
            defaultVisible: true,
            headerClassName: "text-right",
            className: "text-right",
            render: (_, item) => (
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openSupplierPaymentModal(item); }}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-600 dark:hover:text-white transition-all shadow-xs"
                        title="Pay Supplier / Record Payment"
                    >
                        <Coins size={16} />
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => handleOpenModal(item)}
                            className={`p-2 transition-colors rounded-xl ${theme.inputBg} ${theme.primaryIconText} hover:bg-indigo-600 hover:text-white`}
                            title="Edit Supplier"
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => openDeleteDialog(item)}
                            className={`p-2 transition-colors rounded-xl ${theme.inputBg} text-red-400 hover:bg-red-500 hover:text-white`}
                            title="Delete Supplier"
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

                {/* Supplier Summary KPI Widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
                    {/* Total Suppliers */}
                    <div className={`rounded-2xl p-4 border ${theme.borderLight} ${theme.surfaceBg} flex items-center gap-4 shadow-xs`}>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                            <Truck size={20} className="text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-0.5`}>
                                Total Suppliers
                            </p>
                            <p className={`text-xl font-black ${theme.textHeading}`}>{totalCount}</p>
                            <p className={`text-[11px] font-bold ${theme.textMuted}`}>Registered partners</p>
                        </div>
                    </div>

                    {/* Total Billed */}
                    <div className={`rounded-2xl p-4 border ${theme.borderLight} ${theme.surfaceBg} flex items-center gap-4 shadow-xs`}>
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag size={20} className="text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-0.5`}>
                                Total Purchases
                            </p>
                            <p className={`text-xl font-black ${theme.textHeading}`}>
                                {fmt(summary.totalPurchases || 0)}
                            </p>
                            <p className={`text-[11px] font-bold ${theme.textMuted}`}>Gross supplier bills</p>
                        </div>
                    </div>

                    {/* Total Paid */}
                    <div className={`rounded-2xl p-4 border ${theme.borderLight} ${theme.surfaceBg} flex items-center gap-4 shadow-xs`}>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={20} className="text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-0.5`}>
                                Total Amount Paid
                            </p>
                            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                                {fmt(summary.totalPaid || 0)}
                            </p>
                            <p className={`text-[11px] font-bold ${theme.textMuted}`}>Paid to suppliers</p>
                        </div>
                    </div>

                    {/* Payment Due (To Pay) */}
                    <div className={`rounded-2xl p-4 border ${theme.borderLight} ${theme.surfaceBg} flex items-center gap-4 shadow-xs`}>
                        <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                            <Clock size={20} className="text-rose-500" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-0.5`}>
                                Payment Due (To Pay)
                            </p>
                            <p className={`text-xl font-black ${(summary.totalDue || 0) > 0 ? 'text-rose-600 dark:text-rose-400' : theme.textHeading}`}>
                                {fmt(summary.totalDue || 0)}
                            </p>
                            <p className={`text-[11px] font-bold ${(summary.totalDue || 0) > 0 ? 'text-rose-500 dark:text-rose-400 font-bold' : theme.textMuted}`}>
                                {(summary.totalDue || 0) > 0 ? 'Amount we need to pay' : 'Zero balance due'}
                            </p>
                        </div>
                    </div>
                </div>

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
                    <button
                        type="button"
                        onClick={() => openSupplierPaymentModal()}
                        className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-4 md:px-5 py-3 rounded-2xl font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                        title="Pay Supplier / Record Payment"
                    >
                        <Coins size={18} />
                        <span className="hidden sm:inline">Pay Supplier</span>
                    </button>
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
                        tableId="parties-suppliers-list"
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center md:p-4 animate-in fade-in duration-200">
                    <div className={`${theme.surfaceBg} md:rounded-[32px] shadow-2xl w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] overflow-y-auto`}>
                        <div className={`p-6 md:p-8 border-b sticky top-0 z-10 flex justify-between items-center ${theme.surfaceBg} ${theme.borderLight}`}>
                            <h3 className={`text-lg md:text-2xl font-black flex items-center gap-3 ${theme.textHeading}`}>
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
                                        value={formData.name}
                                        onChange={e => {
                                            setFormData({ ...formData, name: sanitizeNameInput(e.target.value) });
                                            setValidationErrors(prev => ({ ...prev, name: '' }));
                                        }}
                                        className={`w-full p-4 border rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary} ${
                                            validationErrors.name ? 'border-rose-500 focus:border-rose-500' : `${theme.borderLight} focus:border-indigo-500`
                                        }`}
                                        placeholder="Enter supplier name"
                                    />
                                    {validationErrors.name && (
                                        <p className="text-rose-500 text-xs font-bold mt-1.5">{validationErrors.name}</p>
                                    )}
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
                                        onChange={e => setFormData({ ...formData, contactPerson: sanitizeNameInput(e.target.value) })}
                                        placeholder="Enter contact person name (Optional)"
                                    />
                                </div>
                                {/* Status removed as requested - handled in table toggle */}
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Phone Number *</label>
                                    <div className="relative">
                                        <Phone className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input
                                            className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary} ${
                                                validationErrors.phone ? 'border-rose-500 focus:border-rose-500' : `${theme.borderLight} focus:border-indigo-500`
                                            }`}
                                            value={formData.phone}
                                            onChange={e => {
                                                setFormData({ ...formData, phone: sanitizePhoneInput(e.target.value) });
                                                setValidationErrors(prev => ({ ...prev, phone: '' }));
                                            }}
                                            placeholder="Enter 10-digit mobile number"
                                        />
                                    </div>
                                    {validationErrors.phone && (
                                        <p className="text-rose-500 text-xs font-bold mt-1.5">{validationErrors.phone}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Email Address</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input
                                            type="email"
                                            className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary} ${
                                                validationErrors.email ? 'border-rose-500 focus:border-rose-500' : `${theme.borderLight} focus:border-indigo-500`
                                            }`}
                                            value={formData.email}
                                            onChange={e => {
                                                setFormData({ ...formData, email: sanitizeEmailInput(e.target.value) });
                                                setValidationErrors(prev => ({ ...prev, email: '' }));
                                            }}
                                            placeholder="name@domain.com"
                                        />
                                    </div>
                                    {validationErrors.email && (
                                        <p className="text-rose-500 text-xs font-bold mt-1.5">{validationErrors.email}</p>
                                    )}
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

                            <div className="flex flex-row gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className={`flex-1 py-2.5 md:py-4 text-sm md:text-base rounded-2xl font-bold transition-all ${theme.textSecondary} ${theme.inputBg} hover:opacity-80`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-2.5 md:py-4 text-sm md:text-base rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={16} className="md:w-5 md:h-5" />
                                    {editingSupplier ? "Save Changes" : "Create Supplier"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
                        <SupplierPaymentModal
                isOpen={paySupplierModal.isOpen}
                onClose={() => setPaySupplierModal({ isOpen: false, supplier: null })}
                supplier={paySupplierModal.supplier}
                allSuppliers={suppliers}
                onSuccess={() => loadSuppliers(searchTerm, currentPage)}
            />

            {/* Delete Supplier Confirmation Modal */}
            <CommonDialog
                isOpen={deleteConfirmModal.isOpen}
                onClose={() => setDeleteConfirmModal({ isOpen: false, id: null, name: '' })}
                onConfirm={handleConfirmDeleteSupplier}
                title="Delete Supplier"
                message={`Are you sure you want to delete ${deleteConfirmModal.name ? `supplier "${deleteConfirmModal.name}"` : 'this supplier'}? This action cannot be undone.`}
                type="error"
                confirmText="Delete Supplier"
                cancelText="Cancel"
            />
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
