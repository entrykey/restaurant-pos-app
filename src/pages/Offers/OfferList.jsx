import React, { useState, useEffect } from "react";
import {
    Tag,
    Plus,
    Search,
    Edit2,
    Trash2,
    Power,
    Filter,
    Calendar,
    ArrowRight,
    Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { offerService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import CommonTable from "../../components/CommonTable";

const OfferList = ({ hasPermissionFor, formatCurrency }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const canManage = hasPermissionFor?.('OFFER_MANAGEMENT', 'OFFER', 'manage') || true;

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        setIsLoading(true);
        try {
            const shopId = user?.shop_id;
            const branchId = activeBranchId || (user?.branchIds?.length ? user.branchIds[0] : null);
            const data = await offerService.getOffers({ shopId, branchId });
            setOffers(data || []);
        } catch (error) {
            console.error("Failed to fetch offers:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleStatus = async (offer) => {
        try {
            await offerService.updateOffer(offer._id, { isActive: !offer.isActive });
            fetchOffers();
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to deactivate this offer?")) {
            try {
                await offerService.deleteOffer(id);
                fetchOffers();
            } catch (error) {
                console.error("Failed to delete offer:", error);
            }
        }
    };

    const filteredOffers = offers.filter(offer => {
        const matchesSearch = offer.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? offer.isActive : !offer.isActive);
        return matchesSearch && matchesStatus;
    });

    const columns = [
        {
            header: "Offer Name",
            key: "name",
            render: (val, row) => (
                <div className="flex flex-col">
                    <span className={`font-black ${theme.textHeading}`}>{val}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full w-max mt-1 ${row.offerType === 'BUY_X_GET_Y' ? 'bg-indigo-100 text-indigo-600' :
                        row.offerType === 'PERCENT_DISCOUNT' ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
                        {row.offerType.replace(/_/g, ' ')}
                    </span>
                </div>
            )
        },
        {
            header: "Conditions",
            key: "condition",
            render: (val) => {
                if (!val) return <span className="text-gray-400 italic">No conditions</span>;
                return (
                    <div className="text-xs space-y-1">
                        {val.applyOn === 'BILL' && <div className={`font-bold ${theme.textPrimary}`}>Min Bill: {formatCurrency(val.minBillAmount || 0)}</div>}
                        {val.applyOn === 'ITEM' && <div className={`font-bold ${theme.textPrimary}`}>Min Qty: {val.minQuantity}</div>}
                        <div className={theme.textSecondary}>Applies on {val.applyOn}</div>
                    </div>
                );
            }
        },
        {
            header: "Validity",
            key: "validity",
            render: (_, row) => (
                <div className="flex items-center gap-2 text-xs">
                    <div className="flex flex-col">
                        <span className={theme.textSecondary}>Start</span>
                        <span className={`font-bold ${theme.textPrimary}`}>{row.startDate ? new Date(row.startDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <ArrowRight size={12} className={theme.textMuted} />
                    <div className="flex flex-col">
                        <span className={theme.textSecondary}>End</span>
                        <span className={`font-bold ${theme.textPrimary}`}>{row.endDate ? new Date(row.endDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                </div>
            )
        },
        {
            header: "Status",
            key: "isActive",
            render: (val) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${val ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    }`}>
                    {val ? "Active" : "Inactive"}
                </span>
            )
        },
        {
            header: "Actions",
            key: "actions",
            render: (_, row) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate(`/offers/edit/${row._id}`)}
                        className={`p-2 rounded-xl ${theme.inputBg} ${theme.textSecondary} hover:${theme.textPrimary} transition-all`}
                        title="Edit Offer"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => handleToggleStatus(row)}
                        className={`p-2 rounded-xl ${theme.inputBg} ${row.isActive ? 'text-orange-500' : 'text-green-500'} hover:scale-110 transition-all`}
                        title={row.isActive ? "Deactivate" : "Activate"}
                    >
                        <Power size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row._id)}
                        className={`p-2 rounded-xl ${theme.inputBg} text-red-500 hover:scale-110 transition-all`}
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={`p-4 md:p-8 h-full flex flex-col ${theme.pageBg} animate-in fade-in duration-500`}>
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className={`text-2xl md:text-4xl font-black flex items-center gap-3 ${theme.textHeading}`}>
                        <div className={`p-3 rounded-2xl ${theme.primaryIconBg} ${theme.primaryIconText} shadow-lg`}>
                            <Tag size={24} />
                        </div>
                        Offer Management
                    </h2>
                    <p className={`mt-1 text-sm ${theme.textSecondary}`}>Create and manage promotional offers for your store</p>
                </div>

                {canManage && (
                    <button
                        onClick={() => navigate('/offers/new')}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all
                            ${theme.buttonBg} ${theme.buttonText} font-black text-sm
                        `}
                    >
                        <Plus size={20} />
                        Create New Offer
                    </button>
                )}
            </div>

            {/* Filters Area */}
            <div className={`${theme.surfaceBg} p-4 rounded-3xl border ${theme.borderLight} shadow-sm mb-6 flex flex-col md:flex-row gap-4`}>
                <div className="relative flex-1">
                    <Search className={`absolute left-4 top-3.5 ${theme.textSecondary}`} size={18} />
                    <input
                        type="text"
                        placeholder="Search offers by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-12 pr-4 py-3.5 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                    />
                </div>

                <div className="flex gap-2">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-4 py-3.5 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText} min-w-[150px]`}
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                    <button className={`p-3.5 rounded-2xl ${theme.inputBg} ${theme.textSecondary} border ${theme.inputBorder}`}>
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className={`flex-1 overflow-hidden ${theme.surfaceBg} rounded-[40px] border ${theme.borderLight} shadow-xl relative`}>
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
                        <p className={`font-black uppercase tracking-widest text-sm ${theme.textSecondary}`}>Loading Offers...</p>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <CommonTable
                            columns={columns}
                            data={filteredOffers}
                        />
                        {filteredOffers.length === 0 && (
                            <div className="py-20 text-center">
                                <Tag size={64} className="mx-auto text-gray-200 mb-4" />
                                <h3 className={`text-xl font-bold ${theme.textHeading}`}>No Offers Found</h3>
                                <p className={theme.textSecondary}>Try changing your filters or create a new offer.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OfferList;
