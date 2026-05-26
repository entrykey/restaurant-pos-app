import React, { useState, useEffect } from 'react';
import { Users, Truck, Plus, Search, Edit3, Trash2, X, Save, Phone, Mail, MapPin } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { MODULES } from '../../constants/modules';
import { branchService, customerService } from '../../services/api';
import CommonTable from '../../components/CommonTable';
import Supplier from '../Suppliers/Supplier';
import { SupplierService } from '../Suppliers/SupplierService';

const PARTIES_MODULE = MODULES.PARTIES;

// hasPermissionFor prop signature comes from AppContent: (module, resource, action) => boolean
const Parties = ({ hasPermissionFor }) => {
    const { theme } = useTheme();
    const { activeBranchId } = useApp();
    const [tab, setTab] = useState('suppliers'); // 'suppliers' | 'customers'
    const [customers, setCustomers] = useState([]);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        taxNumber: '',
        status: 'ACTIVE',
        discountPercentage: 0
    });

    // Permissions logic
    const canSupplierView = hasPermissionFor?.(PARTIES_MODULE, 'supplier', 'view');
    const canSupplierCreate = hasPermissionFor?.(PARTIES_MODULE, 'supplier', 'create');
    const canSupplierEdit = hasPermissionFor?.(PARTIES_MODULE, 'supplier', 'edit');
    const canSupplierDelete = hasPermissionFor?.(PARTIES_MODULE, 'supplier', 'delete');
    const canCustomerView = hasPermissionFor?.(PARTIES_MODULE, 'customer', 'view');
    const canCustomerCreate = hasPermissionFor?.(PARTIES_MODULE, 'customer', 'create');
    const canCustomerEdit = hasPermissionFor?.(PARTIES_MODULE, 'customer', 'edit');
    const canCustomerDelete = hasPermissionFor?.(PARTIES_MODULE, 'customer', 'delete');

    useEffect(() => {
        if (tab !== 'customers' || !activeBranchId) return;
        const load = async () => {
            setCustomerLoading(true);
            try {
                const data = await customerService.getCustomers({ branchId: activeBranchId, search: customerSearch });
                setCustomers(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Failed to load customers:', e);
                setCustomers([]);
            } finally {
                setCustomerLoading(false);
            }
        };

        const timeoutId = setTimeout(load, 500);
        return () => clearTimeout(timeoutId);
    }, [tab, activeBranchId, customerSearch]);

    const openCustomerModal = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setCustomerForm({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: typeof customer.address === 'object' ? [customer.address?.street, customer.address?.city, customer.address?.state].filter(Boolean).join(', ') : (customer.address || ''),
                taxNumber: customer.taxNumber || '',
                status: customer.status || 'ACTIVE',
                discountPercentage: customer.discountPercentage || 0
            });
        } else {
            setEditingCustomer(null);
            setCustomerForm({ name: '', phone: '', email: '', address: '', taxNumber: '', status: 'ACTIVE', discountPercentage: 0 });
        }
        setCustomerModalOpen(true);
    };

    const saveCustomer = async (e) => {
        e.preventDefault();
        if (!activeBranchId && !editingCustomer) {
            alert('Please select a branch first.');
            return;
        }
        setCustomerLoading(true);
        try {
            const payload = {
                name: customerForm.name,
                phone: customerForm.phone,
                email: customerForm.email || undefined,
                taxNumber: customerForm.taxNumber || undefined,
                status: customerForm.status,
                discountPercentage: Number(customerForm.discountPercentage) || 0
            };
            if (customerForm.address) payload.address = { street: customerForm.address };
            if (editingCustomer) {
                await customerService.updateCustomer(editingCustomer._id || editingCustomer.id, payload);
            } else {
                payload.branchId = activeBranchId;
                await customerService.createCustomer(payload);
            }
            setCustomerModalOpen(false);
            const data = await customerService.getCustomers({ branchId: activeBranchId, search: customerSearch });
            setCustomers(Array.isArray(data) ? data : []);
        } catch (err) {
            alert('Failed to save customer: ' + (err?.message || 'Unknown error'));
        } finally {
            setCustomerLoading(false);
        }
    };

    const toggleCustomerStatus = async (item) => {
        if (!canCustomerEdit) return;
        setCustomerLoading(true);
        try {
            const newStatus = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            await customerService.updateCustomer(item._id || item.id, { ...item, status: newStatus });
            const data = await customerService.getCustomers({ branchId: activeBranchId, search: customerSearch });
            setCustomers(Array.isArray(data) ? data : []);
        } catch (err) {
            alert('Failed to update status: ' + (err?.message || 'Unknown error'));
        } finally {
            setCustomerLoading(false);
        }
    };

    const deleteCustomer = async (id) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;
        setCustomerLoading(true);
        try {
            await customerService.deleteCustomer(id);
            const data = await customerService.getCustomers({ branchId: activeBranchId, search: customerSearch });
            setCustomers(Array.isArray(data) ? data : []);
        } catch (err) {
            alert('Failed to delete customer: ' + (err?.message || 'Unknown error'));
        } finally {
            setCustomerLoading(false);
        }
    };

    const customerColumns = [
        { header: 'Code', key: 'customerCode', className: `text-sm font-mono ${theme.textSecondary}` },
        { header: 'Name', key: 'name', render: (v, row) => <div className={`font-bold ${theme.textHeading}`}>{v}</div> },
        {
            header: 'Contact',
            key: 'phone',
            render: (_, row) => (
                <div className="space-y-1">
                    {row.phone && <div className={`flex items-center gap-2 text-xs font-bold ${theme.textSecondary}`}><Phone size={12} /> {row.phone}</div>}
                    {row.email && <div className={`flex items-center gap-2 text-xs ${theme.textMuted}`}><Mail size={12} /> {row.email}</div>}
                </div>
            )
        },
        {
            header: 'Status',
            key: 'status',
            render: (v, row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); toggleCustomerStatus(row); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${v === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${v === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            )
        }
    ];
    if (canCustomerEdit || canCustomerDelete) {
        customerColumns.push({
            header: 'Actions',
            key: 'actions',
            headerClassName: 'text-right',
            className: 'text-right',
            render: (_, row) => (
                <div className="flex justify-end gap-2">
                    {canCustomerEdit && <button type="button" onClick={() => openCustomerModal(row)} className={`p-2 rounded-xl ${theme.inputBg} ${theme.primaryIconText} hover:bg-indigo-600 hover:text-white`}><Edit3 size={16} /></button>}
                    {canCustomerDelete && <button type="button" onClick={() => deleteCustomer(row._id || row.id)} className={`p-2 rounded-xl ${theme.inputBg} text-red-400 hover:bg-red-500 hover:text-white`}><Trash2 size={16} /></button>}
                </div>
            )
        });
    }

    const canAccessParties = canSupplierView || canCustomerView;
    if (!canAccessParties) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme.pageBg}`}>
                <div className={`text-center p-12 rounded-[40px] shadow-xl border max-w-md ${theme.surfaceBg} ${theme.borderLight}`}>
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Users size={40} /></div>
                    <h2 className={`text-2xl font-black mb-2 ${theme.textHeading}`}>Access Restricted</h2>
                    <p className={`font-medium ${theme.textMuted}`}>You don&apos;t have permission to view Parties.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100 dark:shadow-indigo-900/20">
                    <Users size={22} />
                </div>
                <div>
                    <h2 className={`text-xl md:text-3xl font-black tracking-tight ${theme.textHeading}`}>Parties</h2>
                    <p className={`font-bold text-sm ${theme.textMuted}`}>Manage suppliers and customers</p>
                </div>
            </div>

            {/* Tabs — full width on mobile/tablet, fit-content on desktop */}
            <div className={`flex flex-row flex-wrap gap-1 p-1.5 rounded-2xl shadow-sm w-full lg:w-fit mt-6 mb-4 ${theme.surfaceBg}`}>
                {canSupplierView && (
                    <button
                        type="button"
                        onClick={() => setTab('suppliers')}
                        className={`flex-1 lg:flex-none px-3 md:px-6 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${tab === 'suppliers' ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                    >
                        <Truck size={16} /> Suppliers
                    </button>
                )}
                {canCustomerView && (
                    <button
                        type="button"
                        onClick={() => setTab('customers')}
                        className={`flex-1 lg:flex-none px-3 md:px-6 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all flex items-center justify-center gap-2 ${tab === 'customers' ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                    >
                        <Users size={16} /> Customers
                    </button>
                )}
            </div>

            {tab === 'suppliers' && canSupplierView && (
                <Supplier
                    isEmbedded
                    permissionModule={PARTIES_MODULE}
                    permissionResource="supplier"
                    hasPermissionFor={(module, resource, action) =>
                        hasPermissionFor?.(module, resource, action)
                    }
                />
            )}

            {tab === 'customers' && canCustomerView && (
                <>
                    <div className="flex flex-row gap-3 mb-6">
                        <div className="relative flex-1">
                            <Search className={`absolute left-3 top-3.5 ${theme.textSecondary}`} size={18} />
                            <input
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                placeholder="Search customers..."
                                className={`w-full pl-10 pr-4 py-3 border-2 border-transparent rounded-2xl shadow-sm outline-none focus:border-indigo-500 font-medium text-sm ${theme.surfaceBg} ${theme.textPrimary}`}
                            />
                        </div>
                        {canCustomerCreate && (
                            <button
                                type="button"
                                onClick={() => openCustomerModal()}
                                className="flex-shrink-0 bg-indigo-600 text-white px-4 md:px-6 py-3 rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <Plus size={18} />
                                <span className="hidden sm:inline">Add Customer</span>
                            </button>
                        )}
                    </div>

                    {customerLoading ? (
                        <div className="flex justify-center h-64 items-center"><div className="animate-spin text-indigo-600"><Users size={32} /></div></div>
                    ) : (
                        <CommonTable columns={customerColumns} data={customers} />
                    )}
                </>
            )}

            {/* Customer modal */}
            {customerModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
                        <div className={`p-6 md:p-8 border-b sticky top-0 z-10 flex justify-between items-center ${theme.surfaceBg} ${theme.borderLight}`}>
                            <h3 className={`text-2xl font-black flex items-center gap-3 ${theme.textHeading}`}>
                                {editingCustomer ? <Edit3 className="text-indigo-600" /> : <Plus className="text-indigo-600" />}
                                {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                            </h3>
                            <button type="button" onClick={() => setCustomerModalOpen(false)} className={`p-2 rounded-full ${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-800`}><X size={24} /></button>
                        </div>
                        <form onSubmit={saveCustomer} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Name *</label>
                                    <input required className={`w-full p-4 border rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`} value={customerForm.name} onChange={e => setCustomerForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Phone *</label>
                                    <div className="relative">
                                        <Phone className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input required className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`} value={customerForm.phone} onChange={e => setCustomerForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91..." />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Email</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input type="email" className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`} value={customerForm.email} onChange={e => setCustomerForm(f => ({ ...f, email: e.target.value }))} placeholder="customer@example.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Tax number / GSTIN</label>
                                    <input className={`w-full p-4 border rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`} value={customerForm.taxNumber} onChange={e => setCustomerForm(f => ({ ...f, taxNumber: e.target.value }))} placeholder="Optional" />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Discount Percentage (%)</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        className={`w-full p-4 border rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`} 
                                        value={customerForm.discountPercentage} 
                                        onChange={e => setCustomerForm(f => ({ ...f, discountPercentage: e.target.value }))} 
                                        placeholder="0" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Address</label>
                                <div className="relative">
                                    <MapPin className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                    <textarea className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none font-bold min-h-[80px] ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`} value={customerForm.address} onChange={e => setCustomerForm(f => ({ ...f, address: e.target.value }))} placeholder="Address..." />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setCustomerModalOpen(false)} className={`flex-1 py-4 rounded-2xl font-bold ${theme.textSecondary} ${theme.inputBg} hover:opacity-80`}>Cancel</button>
                                <button type="submit" className="flex-1 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl flex items-center justify-center gap-2"><Save size={20} />{editingCustomer ? 'Save Changes' : 'Create Customer'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Parties;
