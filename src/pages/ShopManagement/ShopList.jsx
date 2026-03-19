import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Building2, Store } from 'lucide-react';
import { shopService } from '../../services/api/shops';
import { useTheme } from '../../context/ThemeContext';
import CommonTable from '../../components/CommonTable';

const ShopList = ({ onEdit, onAddNew }) => {
    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { theme } = useTheme();

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        try {
            setIsLoading(true);
            const res = await shopService.getAllShops();
            setShops(res.data);
        } catch (error) {
            console.error("Error fetching shops:", error);
            alert("Failed to load shops");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this shop? This action is irreversible.")) {
            try {
                await shopService.deleteShop(id);
                fetchShops();
            } catch (error) {
                console.error("Error deleting shop:", error);
                alert("Failed to delete shop");
            }
        }
    };

    const filteredShops = shops.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.ownerName || s.user_id?.name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.ownerContact || s.user_id?.phone)?.includes(searchTerm)
    );

    const columns = [
        {
            header: "Shop Name",
            key: "name",
            render: (value, shop) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <span className={`font-bold text-sm ${theme.textPrimary}`}>{shop.name}</span>
                </div>
            )
        },
        {
            header: "Owner",
            key: "ownerName",
            className: `font-bold text-sm ${theme.textSecondary}`,
            render: (value, shop) => value || shop.user_id?.name || '—'
        },
        {
            header: "Contact",
            key: "ownerContact",
            className: `font-bold text-sm ${theme.textSecondary}`,
            render: (value, shop) => value || shop.user_id?.phone || '—'
        },
        {
            header: "Industry",
            key: "industry",
            render: (_, shop) => (
                <div className="flex items-center">
                    <span className={`px-3 py-1.5 ${theme.sectionBg} border ${theme.sectionBorder} rounded-lg text-xs font-bold ${theme.textPrimary}`}>
                        {shop.businessType?.displayString || 'Standard'}
                        {shop.subType?.displayString && (
                            <span className={`ml-1 text-[11px] font-black uppercase tracking-widest text-indigo-500`}>
                                / {shop.subType.displayString}
                            </span>
                        )}
                    </span>
                </div>
            )
        },
        {
            header: "Actions",
            key: "actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, shop) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit({
                                ...shop,
                                businessType: shop.businessType?._id,
                                subType: shop.subType?._id
                            });
                        }}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                        title="Edit Shop"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(shop._id);
                        }}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-all"
                        title="Delete Shop"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="w-full mx-auto space-y-8">
                {/* ── Page Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                                <Store size={26} />
                            </div>
                            <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${theme.textHeading}`}>Shop Management</h1>
                        </div>
                        <p className={`font-bold ml-1 text-sm ${theme.textSecondary}`}>Manage organizations and system shops</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                            <input
                                type="text"
                                placeholder="Search shops..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 border-2 border-transparent ${theme.surfaceBg} ${theme.textPrimary} rounded-2xl shadow-sm outline-none focus:border-indigo-500 transition-all font-bold placeholder:font-medium placeholder:text-gray-400`}
                            />
                        </div>
                        <button
                            onClick={onAddNew}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 group whitespace-nowrap"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            ADD SHOP
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <CommonTable
                    columns={columns}
                    data={filteredShops}
                    rowKey="_id"
                    isLoading={isLoading}
                    loadingMessage="Loading Shops…"
                    emptyMessage="No shops found."
                />
            </div>
        </div>
    );
};

export default ShopList;
