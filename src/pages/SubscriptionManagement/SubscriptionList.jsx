import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { subscriptionService } from '../../services/api/subscriptions';
import { Search, Edit2, Wallet, AlertCircle, CheckCircle, Clock, Trash2, Sparkles } from 'lucide-react';
import CommonTable from '../../components/CommonTable';

const SubscriptionList = ({ setView, setSubscriptionToEdit }) => {
    const { theme } = useTheme();
    const [subscriptions, setSubscriptions] = useState([]);
    const [trialRunRequests, setTrialRunRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [trialRequestsLoading, setTrialRequestsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchSubscriptions();
        fetchTrialRunRequests();
    }, []);

    const fetchSubscriptions = async () => {
        try {
            setIsLoading(true);
            const res = await subscriptionService.getAllSubscriptions();
            setSubscriptions(res.data || []);
        } catch (error) {
            console.error("Failed to fetch subscriptions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTrialRunRequests = async () => {
        try {
            setTrialRequestsLoading(true);
            const res = await subscriptionService.getTrialRunRequests('all');
            setTrialRunRequests(res.data || []);
        } catch (error) {
            console.error('Failed to fetch trial run requests:', error);
        } finally {
            setTrialRequestsLoading(false);
        }
    };

    const handleApproveTrialRun = async (requestId) => {
        if (!window.confirm('Approve trial run access for this shop? They will receive full business-type capabilities.')) return;
        try {
            await subscriptionService.approveTrialRunRequest(requestId);
            await fetchTrialRunRequests();
        } catch (error) {
            console.error('Approve trial run failed:', error);
            alert(error?.response?.data?.message || 'Failed to approve trial run request');
        }
    };

    const handleRejectTrialRun = async (requestId) => {
        if (!window.confirm('Reject this trial run request?')) return;
        try {
            await subscriptionService.rejectTrialRunRequest(requestId);
            await fetchTrialRunRequests();
        } catch (error) {
            console.error('Reject trial run failed:', error);
            alert(error?.response?.data?.message || 'Failed to reject trial run request');
        }
    };

    const handleConfirmSubscriptionPayment = async (subscriptionId) => {
        if (!window.confirm('Confirm payment and activate this subscription now?')) return;
        try {
            await subscriptionService.confirmSubscriptionPayment(subscriptionId);
            await fetchSubscriptions();
            alert('Payment confirmed. Subscription is now active.');
        } catch (error) {
            console.error('Confirm payment failed:', error);
            alert(error?.response?.data?.message || 'Failed to confirm payment');
        }
    };

    const handleEdit = (sub) => {
        setSubscriptionToEdit(sub);
        setView('form');
    };

    const handleCancel = async (id) => {
        if (window.confirm("Are you sure you want to cancel this subscription? This action cannot be fully undone immediately without manual intervention.")) {
            try {
                await subscriptionService.cancelSubscription(id, { cancel_reason: "Admin cancelled from dashboard" });
                fetchSubscriptions();
            } catch (error) {
                console.error("Cancel failed:", error);
                alert("Failed to cancel subscription");
            }
        }
    };

    const filteredSubscriptions = subscriptions.filter(sub => {
        const matchesSearch =
            sub.shop_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.plan_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sub.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Calculate Analytics
    const activeCount = subscriptions.filter(s => s.status === 'active' || s.status === 'paid').length;
    const trialCount = subscriptions.filter(s => s.status === 'trial' || s.is_trial).length;
    const pendingCount = subscriptions.filter(s => s.payment_status === 'pending').length;
    const cancelledCount = subscriptions.filter(s => s.status === 'cancelled').length;

    // Date formatting helper
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'active':
            case 'paid':
                return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'trial':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'pending_payment':
            case 'pending':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    const columns = [
        {
            header: "Shop Name",
            key: "shopName",
            render: (_, sub) => (
                <>
                    <div className={`font-bold text-sm ${theme.textPrimary}`}>
                        {sub.shop_id?.name || 'Unknown Shop'}
                    </div>
                    <div className={`text-[10px] font-normal ${theme.textMuted}`}>
                        {sub.shop_id?._id}
                    </div>
                </>
            )
        },
        {
            header: "Plan",
            key: "plan",
            className: `text-sm font-bold ${theme.textPrimary}`,
            render: (_, sub) => sub.plan_id?.name || 'Unknown Plan'
        },
        {
            header: "Status",
            key: "status",
            render: (_, sub) => (
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusStyle(sub.status)}`}>
                    {sub.status.replace('_', ' ')}
                </span>
            )
        },
        {
            header: "Billing Cycle",
            key: "billing_cycle",
            className: `text-sm font-medium ${theme.textSecondary} capitalize`,
            render: (value) => value || 'N/A'
        },
        {
            header: "Next Billing",
            key: "next_billing_date",
            className: `text-sm font-medium ${theme.textSecondary}`,
            render: (value) => formatDate(value)
        },
        {
            header: "Amount",
            key: "amount",
            className: `text-sm font-bold ${theme.textPrimary}`,
            render: (_, sub) => `${sub.currency} ${sub.final_amount || sub.amount}`
        },
        {
            header: "Actions",
            key: "actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, sub) => (
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(sub);
                        }}
                        className={`p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors`}
                        title="Edit Subscription"
                    >
                        <Edit2 size={16} strokeWidth={2.5} />
                    </button>
                    {sub.status !== 'cancelled' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(sub._id);
                            }}
                            className={`p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors`}
                            title="Cancel Subscription"
                        >
                            <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                    )}
                    {(sub.status === 'pending_payment' || (sub.status === 'trial' && sub.payment_status === 'pending')) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmSubscriptionPayment(sub._id);
                            }}
                            className={`p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors`}
                            title="Confirm Payment"
                        >
                            <CheckCircle size={16} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar p-4 md:p-8 ${theme.pageBg}`}>
            <div className="w-full mx-auto space-y-8">
                {/* Header & Analytics */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                                <Wallet size={24} />
                            </div>
                            <h2 className={`text-2xl font-black tracking-tight ${theme.textHeading}`}>Subscriptions</h2>
                        </div>
                    </div>

                    {/* Analytics Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                        <div className={`${theme.surfaceBg} p-6 rounded-[24px] border ${theme.borderLight} shadow-sm overflow-hidden relative group`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <CheckCircle size={48} className="text-emerald-500" />
                            </div>
                            <h3 className={`text-sm font-bold uppercase tracking-widest ${theme.textSecondary}`}>Active</h3>
                            <p className="text-3xl font-black mt-2 text-emerald-500">{activeCount}</p>
                            <p className={`text-xs mt-2 ${theme.textMuted}`}>Currently paying</p>
                        </div>
                        <div className={`${theme.surfaceBg} p-6 rounded-[24px] border ${theme.borderLight} shadow-sm overflow-hidden relative group`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Clock size={48} className="text-blue-500" />
                            </div>
                            <h3 className={`text-sm font-bold uppercase tracking-widest ${theme.textSecondary}`}>Trialing</h3>
                            <p className="text-3xl font-black mt-2 text-blue-500">{trialCount}</p>
                            <p className={`text-xs mt-2 ${theme.textMuted}`}>Exploring platform</p>
                        </div>
                        <div className={`${theme.surfaceBg} p-6 rounded-[24px] border ${theme.borderLight} shadow-sm overflow-hidden relative group`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <AlertCircle size={48} className="text-amber-500" />
                            </div>
                            <h3 className={`text-sm font-bold uppercase tracking-widest ${theme.textSecondary}`}>Pending</h3>
                            <p className="text-3xl font-black mt-2 text-amber-500">{pendingCount}</p>
                            <p className={`text-xs mt-2 ${theme.textMuted}`}>Awaiting payment completion</p>
                        </div>
                        <div className={`${theme.surfaceBg} p-6 rounded-[24px] border ${theme.borderLight} shadow-sm overflow-hidden relative group`}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                                <Trash2 size={48} className="text-red-500" />
                            </div>
                            <h3 className={`text-sm font-bold uppercase tracking-widest ${theme.textSecondary}`}>Cancelled</h3>
                            <p className="text-3xl font-black mt-2 text-red-500">{cancelledCount}</p>
                            <p className={`text-xs mt-2 ${theme.textMuted}`}>Past accounts</p>
                        </div>
                    </div>
                </div>

                {/* Trial run requests */}
                <div className={`${theme.surfaceBg} p-6 rounded-[24px] border ${theme.borderLight} shadow-sm space-y-4`}>
                    <div className="flex items-center gap-3">
                        <Sparkles className="text-amber-500" size={22} />
                        <h3 className={`text-lg font-black ${theme.textHeading}`}>Trial run requests</h3>
                    </div>
                    <CommonTable
                        columns={[
                            {
                                header: 'Shop',
                                key: 'shop',
                                render: (_, row) => row.shopId?.name || 'Unknown',
                            },
                            {
                                header: 'Owner',
                                key: 'owner',
                                render: (_, row) => row.requestedBy?.name || row.requestedBy?.email || '—',
                            },
                            {
                                header: 'Requested',
                                key: 'createdAt',
                                render: (_, row) => formatDateTime(row.createdAt),
                            },
                            {
                                header: 'Status',
                                key: 'status',
                                render: (_, row) => (
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                        row.status === 'approved'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : row.status === 'rejected'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {row.status}
                                    </span>
                                ),
                            },
                            {
                                header: 'Reviewed',
                                key: 'reviewedAt',
                                render: (_, row) => row.reviewedAt ? formatDateTime(row.reviewedAt) : '—',
                            },
                            {
                                header: 'Actions',
                                key: 'actions',
                                className: 'text-right',
                                headerClassName: 'text-right',
                                render: (_, row) => (
                                    <div className="flex justify-end gap-2">
                                        {row.status === 'pending' ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleApproveTrialRun(row._id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRejectTrialRun(row._id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-500 font-medium">Reviewed</span>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                        data={trialRunRequests}
                        rowKey="_id"
                        isLoading={trialRequestsLoading}
                        loadingMessage="Loading trial run requests..."
                        emptyMessage="No trial run requests"
                    />
                </div>

                {/* Filters */}
                <div className={`${theme.surfaceBg} p-4 rounded-2xl border ${theme.borderLight} flex flex-col sm:flex-row gap-4 justify-between shadow-sm`}>
                    <div className={`flex items-center px-4 py-3 rounded-xl border ${theme.borderLight} bg-gray-50/50 dark:bg-gray-900/50 flex-1 sm:max-w-sm`}>
                        <Search className={`w-4 h-4 mr-3 ${theme.textSecondary}`} />
                        <input
                            type="text"
                            placeholder="Search by shop, plan, or transaction ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`bg-transparent outline-none flex-1 text-sm font-bold ${theme.textPrimary}`}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`px-4 py-3 rounded-xl border ${theme.borderLight} bg-transparent outline-none font-bold text-sm ${theme.textPrimary} min-w-[150px] cursor-pointer`}
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="trial">Trial</option>
                        <option value="pending_payment">Pending Payment</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {/* Main Table Content */}
                <CommonTable
                    columns={columns}
                    data={filteredSubscriptions}
                    rowKey="_id"
                    isLoading={isLoading}
                    loadingMessage="Loading subscriptions..."
                    emptyMessage="No subscriptions found"
                />
            </div>
        </div>
    );
};

export default SubscriptionList;
