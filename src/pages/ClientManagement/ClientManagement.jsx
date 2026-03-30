import React, { useState, useEffect } from 'react';
import { Search, Users, ExternalLink, Mail, Phone, Calendar, Store, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import { clientService } from '../../services/api/clients';
import { useTheme } from '../../context/ThemeContext';
import CommonTable from '../../components/CommonTable';

const ClientManagement = () => {
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedClient, setExpandedClient] = useState(null);
    const { theme } = useTheme();

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setIsLoading(true);
            const res = await clientService.getClients();
            setClients(res.data);
        } catch (error) {
            console.error("Error fetching clients:", error);
            alert("Failed to load clients");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleExpand = (clientId) => {
        if (expandedClient === clientId) {
            setExpandedClient(null);
        } else {
            setExpandedClient(clientId);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const columns = [
        {
            header: "Client (Owner)",
            key: "name",
            render: (value, client) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <span className={`font-bold text-sm block ${theme.textPrimary}`}>{client.name}</span>
                        <span className={`text-[10px] font-medium text-gray-400 dark:text-gray-500`}>Joined: {new Date(client.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Contact Info",
            key: "contact",
            render: (_, client) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <Mail size={12} className="text-indigo-400" /> {client.email}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <Phone size={12} className="text-indigo-400" /> {client.phone}
                    </div>
                </div>
            )
        },
        {
            header: "Shops",
            key: "shopCount",
            className: "text-center",
            render: (value) => (
                <span className={`px-3 py-1 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-full text-xs font-black`}>
                    {value} {value === 1 ? 'Shop' : 'Shops'}
                </span>
            )
        },
        {
            header: "Rev. (As of now)",
            key: "totalRevenue",
            headerClassName: "text-right",
            className: "text-right",
            render: (value) => (
                <span className={`font-black text-sm ${theme.textPrimary}`}>
                    ₹{value.toLocaleString()}
                </span>
            )
        },
        {
            header: "",
            key: "_id",
            headerClassName: "text-right",
            className: "text-right",
            render: (id) => (
                <button 
                    onClick={() => toggleExpand(id)}
                    className={`p-2 rounded-xl transition-all ${expandedClient === id ? 'bg-indigo-600 text-white' : `${theme.sidebarItemHoverBg} text-gray-400`}`}
                >
                    {expandedClient === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            )
        }
    ];

    const renderClientDetails = (client) => {
        if (expandedClient !== client._id) return null;

        return (
            <tr key={`${client._id}-details`} className={`${theme.sidebarBg} border-b ${theme.borderLight} animate-fadeIn`}>
                <td colSpan={5} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {client.shops.map(shop => (
                            <div key={shop._id} className={`p-6 rounded-[32px] border-2 ${theme.mode === 'dark' ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-100 bg-white'} shadow-xl space-y-5 relative overflow-hidden group hover:scale-[1.02] transition-all duration-300`}>
                                {/* Decorative background element */}
                                <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-colors" />
                                
                                <div className="flex justify-between items-start relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 ${theme.mode === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'} rounded-2xl`}>
                                            <Store size={18} />
                                        </div>
                                        <div>
                                            <span className={`font-black text-base block ${theme.textPrimary}`}>{shop.name}</span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary}`}>
                                                Shop ID: {shop._id.toString().slice(-6)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-3 py-1 rounded-full font-black tracking-wider ${shop.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} border border-current/20`}>
                                        {shop.status}
                                    </span>
                                </div>

                                <div className="space-y-3 relative z-10">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <CreditCard size={12} className="text-indigo-400" /> Plan
                                        </span>
                                        <span className={`font-black text-xs ${theme.textPrimary}`}>{shop.subscription?.plan || 'Free'}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                            <Calendar size={12} className="text-indigo-400" /> Expiry
                                        </span>
                                        <span className={`font-black text-xs ${theme.textPrimary}`}>
                                            {shop.subscription?.endDate ? new Date(shop.subscription.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Lifetime'}
                                        </span>
                                    </div>
                                    
                                    <div className={`mt-4 pt-4 border-t ${theme.mode === 'dark' ? 'border-indigo-500/20' : 'border-gray-100 flex justify-between items-center'}`}>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monthly Amount</span>
                                        <span className="font-black text-lg text-indigo-500">₹{shop.subscription?.amount?.toLocaleString() || 0}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="w-full mx-auto space-y-8">
                {/* ── Page Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                                <Users size={26} />
                            </div>
                            <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${theme.textHeading}`}>Client Management</h1>
                        </div>
                        <p className={`font-bold ml-1 text-sm ${theme.textSecondary}`}>Overview of all shop owners and their subscriptions</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                            <input
                                type="text"
                                placeholder="Search by name, email or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 border-2 border-transparent ${theme.surfaceBg} ${theme.textPrimary} rounded-2xl shadow-sm outline-none focus:border-indigo-500 transition-all font-bold placeholder:font-medium placeholder:text-gray-400`}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Client Totals Card ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all`}>
                        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Clients</p>
                                <h3 className={`text-3xl font-black ${theme.textHeading}`}>{clients.length}</h3>
                            </div>
                        </div>
                    </div>

                    <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all`}>
                        <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Store size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Active Shops</p>
                                <h3 className={`text-3xl font-black text-emerald-500`}>
                                    {clients.reduce((sum, c) => sum + c.shops.filter(s => s.status === 'ACTIVE').length, 0)}
                                </h3>
                            </div>
                        </div>
                    </div>

                    <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-all`}>
                        <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-indigo-500/20 transition-colors" />
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Running Monthly revenue</p>
                                <h3 className={`text-3xl font-black text-indigo-500`}>
                                    ₹{clients.reduce((sum, c) => sum + c.totalRevenue, 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="w-full">
                    <CommonTable
                        columns={columns}
                        data={filteredClients}
                        rowKey="_id"
                        isLoading={isLoading}
                        loadingMessage="Loading Clients…"
                        emptyMessage="No clients found."
                        onRowClick={(client) => toggleExpand(client._id)}
                        renderAdditionalRow={renderClientDetails}
                    />
                </div>
            </div>
        </div>
    );
};

export default ClientManagement;
