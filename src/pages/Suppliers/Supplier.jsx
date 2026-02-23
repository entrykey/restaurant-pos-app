import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Edit3, Trash2, X, Save, Phone, Mail, MapPin } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import { SupplierService } from './SupplierService';
import { ROUTE_ACCESS } from '../../config/permissionStructure';

import { shopService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Supplier = ({ hasPermissionFor }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const { user } = useAuth();
    const [shopId, setShopId] = useState(null);

    const [formData, setFormData] = useState({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        taxId: "",
        status: "ACTIVE"
    });

    // Check permissions
    const supplierAccess = ROUTE_ACCESS.SUPPLIERS;
    const canView = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "view") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");
    const canCreate = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "create") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");
    const canEdit = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "edit") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");
    const canDelete = hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "delete") || hasPermissionFor?.(supplierAccess.module, supplierAccess.resource, "manage");

    useEffect(() => {
        const fetchShopId = async () => {
            if (user) {
                try {
                    const userId = user.id || user._id;
                    const shopData = await shopService.getShopDataByUserId(userId);
                    const id = shopData.shop?._id || shopData.organization?._id || shopData._id;
                    setShopId(id);
                } catch (error) {
                    console.error("Error fetching shop ID:", error);
                }
            }
        };
        fetchShopId();
    }, [user]);

    useEffect(() => {
        if (shopId) {
            loadSuppliers();
        }
    }, [shopId]);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const data = await SupplierService.getSuppliers(shopId);
            setSuppliers(data);
        } catch (error) {
            console.error("Failed to load suppliers", error);
        } finally {
            setLoading(false);
        }
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
                await SupplierService.addSupplier({ ...formData, shopId });
            }
            setIsModalOpen(false);
            await loadSuppliers();
        } catch (error) {
            alert("Failed to save supplier: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this supplier?")) {
            setLoading(true);
            await SupplierService.deleteSupplier(id);
            await loadSuppliers();
            setLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm)
    );

    const columns = [
        {
            header: "Supplier Name",
            key: "name",
            render: (value, item) => (
                <div>
                    <div className="font-bold text-gray-800">{value}</div>
                    <div className="text-xs text-gray-500">{item.taxId}</div>
                </div>
            )
        },
        {
            header: "Contact Person",
            key: "contactPerson",
            className: "text-sm text-gray-600 font-medium"
        },
        {
            header: "Contact Info",
            key: "phone",
            render: (_, item) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                        <Phone size={12} /> {item.phone}
                    </div>
                    {item.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail size={12} /> {item.email}
                        </div>
                    )}
                </div>
            )
        },
        {
            header: "Status",
            key: "status",
            render: (value) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${value === "ACTIVE" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"
                    }`}>
                    {value}
                </span>
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
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
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
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-12 bg-white rounded-[40px] shadow-xl border max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Truck size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 font-medium">You don&apos;t have permission to view Suppliers.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50/30">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                            <Truck size={28} />
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">
                            Suppliers
                        </h2>
                    </div>
                    <p className="text-gray-500 font-bold ml-1">Manage your supply chain partners</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search suppliers..."
                            className="w-full pl-12 pr-4 py-4 border-2 border-transparent bg-white rounded-2xl shadow-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                        />
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={20} /> Add Supplier
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
                <CommonTable columns={columns} data={filteredSuppliers} />
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 md:p-8 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                {editingSupplier ? <Edit3 className="text-indigo-600" /> : <Plus className="text-indigo-600" />}
                                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Supplier Name *</label>
                                    <input
                                        required
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Tax ID / GSTIN</label>
                                    <input
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={formData.taxId}
                                        onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Contact Person *</label>
                                    <input
                                        required
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={formData.contactPerson}
                                        onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Status</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Phone Number *</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-4 text-gray-400" size={20} />
                                        <input
                                            required
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+91..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-400 uppercase">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                                        <input
                                            type="email"
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
                                            value={formData.email}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="supplier@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase">Address</label>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-4 text-gray-400" size={20} />
                                    <textarea
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold min-h-[100px]"
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
                                    className="flex-1 py-4 rounded-2xl font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all"
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
        </div>
    );
};

export default Supplier;
