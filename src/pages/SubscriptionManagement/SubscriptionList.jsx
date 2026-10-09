import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';
import { subscriptionService } from '../../services/api/subscriptions';
import { Search, Edit2, Wallet, AlertCircle, CheckCircle, Clock, Trash2, Sparkles, Check, ArrowUpDown, Filter, X, RefreshCw } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import Modal from '../../components/ui/Modal';
import CommonSelect from '../../components/ui/CommonSelect';
import { getErrorMessage } from '../../utils/errorUtils';

const SubscriptionList = ({ setView, setSubscriptionToEdit }) => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' (1st tab) | 'trial_requests' (2nd tab)
    const [subscriptions, setSubscriptions] = useState([]);
    const [trialRunRequests, setTrialRunRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [trialRequestsLoading, setTrialRequestsLoading] = useState(true);
    
    // Subscriptions filters & sorting
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortFilter, setSortFilter] = useState('pending_first');

    // Trial requests filters & sorting
    const [trialSearchQuery, setTrialSearchQuery] = useState('');
    const [trialStatusFilter, setTrialStatusFilter] = useState('all');
    const [trialSortFilter, setTrialSortFilter] = useState('pending_first');

    // Approval Modal State
    const [approvalModalSub, setApprovalModalSub] = useState(null);
    const [approveCycle, setApproveCycle] = useState('monthly');
    const [approveAmount, setApproveAmount] = useState(0);
    const [approvePaymentMethod, setApprovePaymentMethod] = useState('CASH');
    const [approveTransactionId, setApproveTransactionId] = useState('');
    const [isApproving, setIsApproving] = useState(false);

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
            toast.error(getErrorMessage(error, 'Failed to fetch subscriptions'));
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
            toast.success('Trial run request approved successfully!');
        } catch (error) {
            console.error('Approve trial run failed:', error);
            toast.error(getErrorMessage(error, 'Failed to approve trial run request'));
        }
    };

    const handleRejectTrialRun = async (requestId) => {
        if (!window.confirm('Reject this trial run request?')) return;
        try {
            await subscriptionService.rejectTrialRunRequest(requestId);
            await fetchTrialRunRequests();
            toast.success('Trial run request rejected.');
        } catch (error) {
            console.error('Reject trial run failed:', error);
            toast.error(getErrorMessage(error, 'Failed to reject trial run request'));
        }
    };

    const openApprovalModal = (sub) => {
        const cycle = (sub.billing_cycle || 'monthly').toLowerCase();
        const normCycle = (cycle === 'annual' || cycle === 'yearly') ? 'yearly' : 'monthly';
        const planPricing = sub.plan_id?.pricing || [];
        const matchedPricing = planPricing.find(p => p.cycle === normCycle) || planPricing[0];
        const initialPrice = sub.final_amount || sub.amount || (matchedPricing ? matchedPricing.price : 0);

        setApprovalModalSub(sub);
        setApproveCycle(normCycle);
        setApproveAmount(initialPrice);
        setApprovePaymentMethod(sub.payment_method || 'CASH');
        setApproveTransactionId(sub.transaction_id || '');
    };

    const handleCycleChangeInModal = (newCycle) => {
        setApproveCycle(newCycle);
        const planPricing = approvalModalSub?.plan_id?.pricing || [];
        const matchedPricing = planPricing.find(p => p.cycle === newCycle) || planPricing[0];
        if (matchedPricing) {
            setApproveAmount(matchedPricing.price);
        }
    };

    const handleConfirmApprovalSubmit = async (e) => {
        e?.preventDefault?.();
        if (!approvalModalSub) return;
        setIsApproving(true);
        try {
            await subscriptionService.confirmSubscriptionPayment(approvalModalSub._id, {
                billing_cycle: approveCycle,
                amount: Number(approveAmount) || 0,
                final_amount: Number(approveAmount) || 0,
                payment_method: approvePaymentMethod,
                transaction_id: approveTransactionId,
            });
            toast.success(`Subscription request accepted for ${approvalModalSub.shop_id?.name || 'Shop'}. Plan activated!`);
            setApprovalModalSub(null);
            await fetchSubscriptions();
        } catch (error) {
            console.error('Confirm payment failed:', error);
            toast.error(getErrorMessage(error, 'Failed to accept subscription request'));
        } finally {
            setIsApproving(false);
        }
    };

    const handleRejectSubscriptionRequest = async (subscriptionId) => {
        if (!window.confirm('Reject this plan subscription request?')) return;
        try {
            await subscriptionService.rejectSubscriptionRequest(subscriptionId);
            await fetchSubscriptions();
            toast.success('Subscription request rejected.');
        } catch (error) {
            console.error('Reject subscription request failed:', error);
            toast.error(getErrorMessage(error, 'Failed to reject subscription request'));
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

    // --- Helper predicates for Subscription Statuses ---
    const isPendingSub = (s) => s.status === 'pending_payment' || s.status === 'pending' || (s.status === 'trial' && s.payment_status === 'pending');
    const isActiveSub = (s) => (s.status === 'active' || s.status === 'paid') && !isPendingSub(s);
    const isTrialSub = (s) => (s.status === 'trial' || s.is_trial) && !isPendingSub(s);
    const isCancelledSub = (s) => s.status === 'cancelled';

    // Calculate Analytics Counts
    const activeCount = useMemo(() => subscriptions.filter(isActiveSub).length, [subscriptions]);
    const trialCount = useMemo(() => subscriptions.filter(isTrialSub).length, [subscriptions]);
    const pendingCount = useMemo(() => subscriptions.filter(isPendingSub).length, [subscriptions]);
    const cancelledCount = useMemo(() => subscriptions.filter(isCancelledSub).length, [subscriptions]);

    const pendingTrialRequestsCount = useMemo(() => trialRunRequests.filter(r => r.status === 'pending').length, [trialRunRequests]);

    // Handle Stat Card Click -> Filter Subscriptions Table
    const handleCardFilterClick = (targetStatus) => {
        setActiveTab('subscriptions');
        if (statusFilter === targetStatus) {
            setStatusFilter('all');
        } else {
            setStatusFilter(targetStatus);
        }
    };

    // Filter & Sort Subscriptions
    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter(sub => {
            const matchesSearch =
                !searchQuery ||
                sub.shop_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sub.plan_id?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sub.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                sub.shop_id?._id?.toLowerCase().includes(searchQuery.toLowerCase());

            let matchesStatus = true;
            if (statusFilter === 'active') matchesStatus = isActiveSub(sub);
            else if (statusFilter === 'trial') matchesStatus = isTrialSub(sub);
            else if (statusFilter === 'pending' || statusFilter === 'pending_payment') matchesStatus = isPendingSub(sub);
            else if (statusFilter === 'cancelled') matchesStatus = isCancelledSub(sub);

            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            if (sortFilter === 'pending_first') {
                const pA = isPendingSub(a);
                const pB = isPendingSub(b);
                if (pA && !pB) return -1;
                if (!pA && pB) return 1;
                const dA = new Date(a.createdAt || a.created_at || a.next_billing_date || 0).getTime();
                const dB = new Date(b.createdAt || b.created_at || b.next_billing_date || 0).getTime();
                return dB - dA;
            }
            if (sortFilter === 'date_desc') {
                const dA = new Date(a.createdAt || a.created_at || a.start_date || 0).getTime();
                const dB = new Date(b.createdAt || b.created_at || b.start_date || 0).getTime();
                return dB - dA;
            }
            if (sortFilter === 'date_asc') {
                const dA = new Date(a.createdAt || a.created_at || a.start_date || 0).getTime();
                const dB = new Date(b.createdAt || b.created_at || b.start_date || 0).getTime();
                return dA - dB;
            }
            if (sortFilter === 'name_asc') {
                const nA = (a.shop_id?.name || '').toLowerCase();
                const nB = (b.shop_id?.name || '').toLowerCase();
                return nA.localeCompare(nB);
            }
            if (sortFilter === 'name_desc') {
                const nA = (a.shop_id?.name || '').toLowerCase();
                const nB = (b.shop_id?.name || '').toLowerCase();
                return nB.localeCompare(nA);
            }
            if (sortFilter === 'amount_desc') {
                const amtA = Number(a.final_amount || a.amount || 0);
                const amtB = Number(b.final_amount || b.amount || 0);
                return amtB - amtA;
            }
            if (sortFilter === 'amount_asc') {
                const amtA = Number(a.final_amount || a.amount || 0);
                const amtB = Number(b.final_amount || b.amount || 0);
                return amtA - amtB;
            }
            return 0;
        });
    }, [subscriptions, searchQuery, statusFilter, sortFilter]);

    // Filter & Sort Trial Run Requests
    const filteredTrialRunRequests = useMemo(() => {
        return trialRunRequests.filter(req => {
            const matchesSearch =
                !trialSearchQuery ||
                req.shopId?.name?.toLowerCase().includes(trialSearchQuery.toLowerCase()) ||
                req.requestedBy?.name?.toLowerCase().includes(trialSearchQuery.toLowerCase()) ||
                req.requestedBy?.email?.toLowerCase().includes(trialSearchQuery.toLowerCase());

            const matchesStatus = trialStatusFilter === 'all' || req.status === trialStatusFilter;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => {
            if (trialSortFilter === 'pending_first') {
                const pA = a.status === 'pending';
                const pB = b.status === 'pending';
                if (pA && !pB) return -1;
                if (!pA && pB) return 1;
                const dA = new Date(a.createdAt || 0).getTime();
                const dB = new Date(b.createdAt || 0).getTime();
                return dB - dA;
            }
            if (trialSortFilter === 'date_desc') {
                const dA = new Date(a.createdAt || 0).getTime();
                const dB = new Date(b.createdAt || 0).getTime();
                return dB - dA;
            }
            if (trialSortFilter === 'date_asc') {
                const dA = new Date(a.createdAt || 0).getTime();
                const dB = new Date(b.createdAt || 0).getTime();
                return dA - dB;
            }
            if (trialSortFilter === 'name_asc') {
                const nA = (a.shopId?.name || '').toLowerCase();
                const nB = (b.shopId?.name || '').toLowerCase();
                return nA.localeCompare(nB);
            }
            if (trialSortFilter === 'name_desc') {
                const nA = (a.shopId?.name || '').toLowerCase();
                const nB = (b.shopId?.name || '').toLowerCase();
                return nB.localeCompare(nA);
            }
            return 0;
        });
    }, [trialRunRequests, trialSearchQuery, trialStatusFilter, trialSortFilter]);

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
                return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800/50';
            case 'trial':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/50';
            case 'pending_payment':
            case 'pending':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700';
        }
    };

    const subColumns = [
        {
            header: "Shop Name",
            key: "shopName",
            render: (_, sub) => (
                <>
                    <div className={`font-extrabold text-sm ${theme.textPrimary}`}>
                        {sub.shop_id?.name || 'Unknown Shop'}
                    </div>
                    <div className={`text-[10px] font-medium ${theme.textMuted}`}>
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyle(sub.status)}`}>
                    {sub.status === 'pending_payment' ? 'Pending Approval' : sub.status.replace('_', ' ')}
                </span>
            )
        },
        {
            header: "Billing Cycle",
            key: "billing_cycle",
            className: `text-sm font-medium ${theme.textSecondary} capitalize`,
            render: (value) => {
                const norm = (String(value || '').toLowerCase());
                if (norm === 'yearly' || norm === 'annual') return 'Annual (Yearly)';
                if (norm === 'monthly') return 'Monthly';
                return value || 'N/A';
            }
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
            className: `text-sm font-black ${theme.textPrimary}`,
            render: (_, sub) => {
                const normCycle = (sub.billing_cycle || '').toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
                const pricing = sub.plan_id?.pricing?.find(p => p.cycle === normCycle) || sub.plan_id?.pricing?.[0];
                const amt = sub.final_amount || sub.amount || (pricing ? pricing.price : 0);
                return `${sub.currency || 'INR'} ${amt}`;
            }
        },
        {
            header: "Actions",
            key: "actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, sub) => {
                const isPending = isPendingSub(sub);
                return (
                    <div className="flex justify-end items-center gap-2">
                        {isPending && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openApprovalModal(sub);
                                    }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-md shadow-emerald-600/20 active:scale-95"
                                    title="Accept & Select Plan Billing Cycle / Price"
                                >
                                    <Check size={14} /> Accept
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRejectSubscriptionRequest(sub._id);
                                    }}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm active:scale-95"
                                    title="Reject Subscription Request"
                                >
                                    Reject
                                </button>
                            </>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(sub);
                            }}
                            className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            title="Edit Subscription"
                        >
                            <Edit2 size={16} strokeWidth={2.5} />
                        </button>
                        {sub.status !== 'cancelled' && !isPending && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel(sub._id);
                                }}
                                className="p-2 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                title="Cancel Subscription"
                            >
                                <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className={`flex flex-col h-full overflow-y-auto custom-scrollbar p-4 md:p-8 ${theme.pageBg}`}>
            <div className="w-full mx-auto space-y-6">
                
                {/* Modern Header & Tab Switcher */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200/80 dark:border-gray-800">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
                            <Wallet size={26} />
                        </div>
                        <div>
                            <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${theme.textHeading}`}>
                                Subscription Management
                            </h1>
                            <p className={`text-xs font-semibold ${theme.textMuted} mt-0.5`}>
                                View, filter, and process plan subscriptions and trial requests
                            </p>
                        </div>
                    </div>

                    {/* Tab Switching Navigation */}
                    <div className="flex items-center p-1.5 bg-gray-100/90 dark:bg-gray-800/90 rounded-2xl border border-gray-200/80 dark:border-gray-700/70 self-start md:self-auto shadow-inner">
                        <button
                            type="button"
                            onClick={() => setActiveTab('subscriptions')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                                activeTab === 'subscriptions'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                                    : `${theme.textMuted} hover:${theme.textPrimary}`
                            }`}
                        >
                            <Wallet size={16} />
                            <span>Subscription Requests</span>
                            {pendingCount > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                                    activeTab === 'subscriptions'
                                        ? 'bg-amber-400 text-amber-950'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                }`}>
                                    {pendingCount}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('trial_requests')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer ${
                                activeTab === 'trial_requests'
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                                    : `${theme.textMuted} hover:${theme.textPrimary}`
                            }`}
                        >
                            <Sparkles size={16} />
                            <span>Trial Run Requests</span>
                            {pendingTrialRequestsCount > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${
                                    activeTab === 'trial_requests'
                                        ? 'bg-amber-400 text-amber-950'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                }`}>
                                    {pendingTrialRequestsCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Interactive Analytics Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Active Card */}
                    <div
                        onClick={() => handleCardFilterClick('active')}
                        className={`${theme.surfaceBg} p-5 rounded-[22px] border transition-all duration-300 relative overflow-hidden cursor-pointer group ${
                            statusFilter === 'active'
                                ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg scale-[1.02]'
                                : `${theme.borderLight} hover:border-emerald-300 hover:shadow-md`
                        }`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <CheckCircle size={48} className="text-emerald-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className={`text-xs font-extrabold uppercase tracking-widest ${theme.textSecondary}`}>Active</h3>
                            {statusFilter === 'active' && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-500 text-white">
                                    Filtered
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black mt-2 text-emerald-500">{activeCount}</p>
                        <p className={`text-xs mt-1.5 font-medium ${theme.textMuted} flex items-center justify-between`}>
                            <span>Currently paying</span>
                            <span className="text-[10px] opacity-75 group-hover:underline">Click to filter</span>
                        </p>
                    </div>

                    {/* Trialing Card */}
                    <div
                        onClick={() => handleCardFilterClick('trial')}
                        className={`${theme.surfaceBg} p-5 rounded-[22px] border transition-all duration-300 relative overflow-hidden cursor-pointer group ${
                            statusFilter === 'trial'
                                ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg scale-[1.02]'
                                : `${theme.borderLight} hover:border-blue-300 hover:shadow-md`
                        }`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Clock size={48} className="text-blue-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className={`text-xs font-extrabold uppercase tracking-widest ${theme.textSecondary}`}>Trialing</h3>
                            {statusFilter === 'trial' && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-500 text-white">
                                    Filtered
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black mt-2 text-blue-500">{trialCount}</p>
                        <p className={`text-xs mt-1.5 font-medium ${theme.textMuted} flex items-center justify-between`}>
                            <span>Exploring platform</span>
                            <span className="text-[10px] opacity-75 group-hover:underline">Click to filter</span>
                        </p>
                    </div>

                    {/* Pending Card */}
                    <div
                        onClick={() => handleCardFilterClick('pending')}
                        className={`${theme.surfaceBg} p-5 rounded-[22px] border transition-all duration-300 relative overflow-hidden cursor-pointer group ${
                            statusFilter === 'pending' || statusFilter === 'pending_payment'
                                ? 'border-amber-500 ring-2 ring-amber-500/40 shadow-lg scale-[1.02]'
                                : `${theme.borderLight} hover:border-amber-300 hover:shadow-md`
                        }`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <AlertCircle size={48} className="text-amber-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className={`text-xs font-extrabold uppercase tracking-widest ${theme.textSecondary}`}>Pending</h3>
                            {(statusFilter === 'pending' || statusFilter === 'pending_payment') && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white">
                                    Filtered
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black mt-2 text-amber-500">{pendingCount}</p>
                        <p className={`text-xs mt-1.5 font-medium ${theme.textMuted} flex items-center justify-between`}>
                            <span>Awaiting payment completion</span>
                            <span className="text-[10px] opacity-75 group-hover:underline">Click to filter</span>
                        </p>
                    </div>

                    {/* Cancelled Card */}
                    <div
                        onClick={() => handleCardFilterClick('cancelled')}
                        className={`${theme.surfaceBg} p-5 rounded-[22px] border transition-all duration-300 relative overflow-hidden cursor-pointer group ${
                            statusFilter === 'cancelled'
                                ? 'border-red-500 ring-2 ring-red-500/40 shadow-lg scale-[1.02]'
                                : `${theme.borderLight} hover:border-red-300 hover:shadow-md`
                        }`}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                            <Trash2 size={48} className="text-red-500" />
                        </div>
                        <div className="flex items-center justify-between">
                            <h3 className={`text-xs font-extrabold uppercase tracking-widest ${theme.textSecondary}`}>Cancelled</h3>
                            {statusFilter === 'cancelled' && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-red-500 text-white">
                                    Filtered
                                </span>
                            )}
                        </div>
                        <p className="text-3xl font-black mt-2 text-red-500">{cancelledCount}</p>
                        <p className={`text-xs mt-1.5 font-medium ${theme.textMuted} flex items-center justify-between`}>
                            <span>Past accounts</span>
                            <span className="text-[10px] opacity-75 group-hover:underline">Click to filter</span>
                        </p>
                    </div>
                </div>

                {/* TAB 1 CONTENT: SUBSCRIPTION REQUESTS */}
                {activeTab === 'subscriptions' && (
                    <div className="space-y-4">
                        {/* Filters & Sorting Bar */}
                        <div className={`${theme.surfaceBg} p-4 rounded-2xl border ${theme.borderLight} flex flex-col md:flex-row gap-3 justify-between items-center shadow-sm`}>
                            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                                <div className={`flex items-center px-4 py-2.5 rounded-xl border ${theme.borderLight} bg-gray-50/70 dark:bg-gray-900/50 w-full sm:max-w-md focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all`}>
                                    <Search className={`w-4 h-4 mr-2.5 ${theme.textMuted}`} />
                                    <input
                                        type="text"
                                        placeholder="Search shop name, plan, or TXN ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className={`bg-transparent outline-none flex-1 text-sm font-bold ${theme.textPrimary}`}
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap justify-end">
                                {/* Status Filter Dropdown */}
                                <div className="flex items-center gap-1.5">
                                    <CommonSelect
                                        size="sm"
                                        icon={Filter}
                                        value={statusFilter}
                                        onChange={(val) => setStatusFilter(val)}
                                        options={[
                                            { label: 'All Statuses', value: 'all' },
                                            { label: `Pending Approval (${pendingCount})`, value: 'pending' },
                                            { label: `Active (${activeCount})`, value: 'active' },
                                            { label: `Trial (${trialCount})`, value: 'trial' },
                                            { label: `Cancelled (${cancelledCount})`, value: 'cancelled' }
                                        ]}
                                        className="min-w-[170px]"
                                    />
                                </div>

                                {/* Sort Options Dropdown */}
                                <div className="flex items-center gap-1.5">
                                    <CommonSelect
                                        size="sm"
                                        icon={ArrowUpDown}
                                        value={sortFilter}
                                        onChange={(val) => setSortFilter(val)}
                                        options={[
                                            { label: 'Sort: Pending First (Default)', value: 'pending_first' },
                                            { label: 'Sort: Date (Newest First)', value: 'date_desc' },
                                            { label: 'Sort: Date (Oldest First)', value: 'date_asc' },
                                            { label: 'Sort: Shop Name (A - Z)', value: 'name_asc' },
                                            { label: 'Sort: Shop Name (Z - A)', value: 'name_desc' },
                                            { label: 'Sort: Amount (High → Low)', value: 'amount_desc' },
                                            { label: 'Sort: Amount (Low → High)', value: 'amount_asc' }
                                        ]}
                                        className="min-w-[210px]"
                                    />
                                </div>

                                <button
                                    onClick={fetchSubscriptions}
                                    className={`p-2.5 rounded-xl border ${theme.borderLight} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${theme.textSecondary}`}
                                    title="Refresh List"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Active Filter Badge indicator */}
                        {statusFilter !== 'all' && (
                            <div className="flex items-center gap-2 text-xs font-bold px-2">
                                <span className={theme.textMuted}>Active Filter:</span>
                                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 font-extrabold capitalize flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800">
                                    Status: {statusFilter.replace('_', ' ')}
                                    <button onClick={() => setStatusFilter('all')} className="hover:text-indigo-900 dark:hover:text-white">
                                        <X size={12} />
                                    </button>
                                </span>
                            </div>
                        )}

                        {/* Subscriptions Table */}
                        <CommonTable
                            columns={subColumns}
                            data={filteredSubscriptions}
                            rowKey="_id"
                            isLoading={isLoading}
                            loadingMessage="Loading subscriptions..."
                            emptyMessage="No subscriptions found matching your filters"
                        />
                    </div>
                )}

                {/* TAB 2 CONTENT: TRIAL RUN REQUESTS */}
                {activeTab === 'trial_requests' && (
                    <div className="space-y-4">
                        {/* Trial Requests Header Card */}
                        <div className={`${theme.surfaceBg} p-6 rounded-[24px] border ${theme.borderLight} shadow-sm space-y-4`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-50 dark:bg-amber-900/40 rounded-xl text-amber-500 border border-amber-200/60 dark:border-amber-800/50">
                                        <Sparkles size={22} />
                                    </div>
                                    <div>
                                        <h3 className={`text-lg font-black ${theme.textHeading}`}>Trial Run Requests</h3>
                                        <p className={`text-xs font-semibold ${theme.textMuted}`}>
                                            Approve or reject trial feature access requests from shop owners
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                        {pendingTrialRequestsCount} Pending Approval
                                    </span>
                                </div>
                            </div>

                            {/* Trial Filters & Sorting */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-2">
                                <div className={`flex items-center px-4 py-2.5 rounded-xl border ${theme.borderLight} bg-gray-50/70 dark:bg-gray-900/50 w-full sm:max-w-md focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all`}>
                                    <Search className={`w-4 h-4 mr-2.5 ${theme.textMuted}`} />
                                    <input
                                        type="text"
                                        placeholder="Search by shop or owner name..."
                                        value={trialSearchQuery}
                                        onChange={(e) => setTrialSearchQuery(e.target.value)}
                                        className={`bg-transparent outline-none flex-1 text-sm font-bold ${theme.textPrimary}`}
                                    />
                                    {trialSearchQuery && (
                                        <button onClick={() => setTrialSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                    {/* Trial Status Filter */}
                                    <div className="flex items-center gap-1.5">
                                        <CommonSelect
                                            size="sm"
                                            icon={Filter}
                                            value={trialStatusFilter}
                                            onChange={(val) => setTrialStatusFilter(val)}
                                            options={[
                                                { label: 'All Statuses', value: 'all' },
                                                { label: `Pending (${pendingTrialRequestsCount})`, value: 'pending' },
                                                { label: 'Approved', value: 'approved' },
                                                { label: 'Rejected', value: 'rejected' }
                                            ]}
                                            className="min-w-[150px]"
                                        />
                                    </div>

                                    {/* Trial Sort Options */}
                                    <div className="flex items-center gap-1.5">
                                        <CommonSelect
                                            size="sm"
                                            icon={ArrowUpDown}
                                            value={trialSortFilter}
                                            onChange={(val) => setTrialSortFilter(val)}
                                            options={[
                                                { label: 'Sort: Pending First (Default)', value: 'pending_first' },
                                                { label: 'Sort: Date (Newest First)', value: 'date_desc' },
                                                { label: 'Sort: Date (Oldest First)', value: 'date_asc' },
                                                { label: 'Sort: Shop Name (A - Z)', value: 'name_asc' },
                                                { label: 'Sort: Shop Name (Z - A)', value: 'name_desc' }
                                            ]}
                                            className="min-w-[210px]"
                                        />
                                    </div>

                                    <button
                                        onClick={fetchTrialRunRequests}
                                        className={`p-2.5 rounded-xl border ${theme.borderLight} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${theme.textSecondary}`}
                                        title="Refresh Trial Requests"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Trial Run Requests Table */}
                            <CommonTable
                                columns={[
                                    {
                                        header: 'Shop Name',
                                        key: 'shop',
                                        render: (_, row) => (
                                            <div>
                                                <div className={`font-extrabold text-sm ${theme.textPrimary}`}>
                                                    {row.shopId?.name || 'Unknown Shop'}
                                                </div>
                                                <div className={`text-[10px] font-medium ${theme.textMuted}`}>
                                                    {row.shopId?._id}
                                                </div>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Owner / Requested By',
                                        key: 'owner',
                                        render: (_, row) => (
                                            <div>
                                                <div className={`font-bold text-xs ${theme.textPrimary}`}>
                                                    {row.requestedBy?.name || '—'}
                                                </div>
                                                <div className={`text-[10px] ${theme.textMuted}`}>
                                                    {row.requestedBy?.email || '—'}
                                                </div>
                                            </div>
                                        ),
                                    },
                                    {
                                        header: 'Requested Date',
                                        key: 'createdAt',
                                        className: `text-xs font-semibold ${theme.textSecondary}`,
                                        render: (_, row) => formatDateTime(row.createdAt),
                                    },
                                    {
                                        header: 'Status',
                                        key: 'status',
                                        render: (_, row) => (
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                row.status === 'approved'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                                    : row.status === 'rejected'
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                            }`}>
                                                {row.status}
                                            </span>
                                        ),
                                    },
                                    {
                                        header: 'Reviewed Date',
                                        key: 'reviewedAt',
                                        className: `text-xs font-medium ${theme.textMuted}`,
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
                                                            className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 active:scale-95 flex items-center gap-1"
                                                        >
                                                            <Check size={14} /> Accept
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRejectTrialRun(row._id)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm active:scale-95"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">Reviewed</span>
                                                )}
                                            </div>
                                        ),
                                    },
                                ]}
                                data={filteredTrialRunRequests}
                                rowKey="_id"
                                isLoading={trialRequestsLoading}
                                loadingMessage="Loading trial run requests..."
                                emptyMessage="No trial run requests found"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Approval Modal */}
            {approvalModalSub && (
                <Modal
                    isOpen={Boolean(approvalModalSub)}
                    onClose={() => setApprovalModalSub(null)}
                    title="Approve Subscription Request"
                    className="max-w-md"
                >
                    <form onSubmit={handleConfirmApprovalSubmit} className="space-y-4">
                        <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                            <div className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                {approvalModalSub.shop_id?.name || 'Shop'}
                            </div>
                            <div className={`text-lg font-black ${theme.textHeading} mt-1`}>
                                {approvalModalSub.plan_id?.name || 'Selected Plan'}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>
                                Billing Cycle (Monthly / Annual)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleCycleChangeInModal('monthly')}
                                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                                        approveCycle === 'monthly'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                            : `${theme.inputBg} ${theme.textMuted} ${theme.borderLight}`
                                    }`}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleCycleChangeInModal('yearly')}
                                    className={`py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
                                        approveCycle === 'yearly'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                            : `${theme.inputBg} ${theme.textMuted} ${theme.borderLight}`
                                    }`}
                                >
                                    Annual (Yearly)
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>
                                Confirmed Paid Amount ({approvalModalSub.currency || 'INR'})
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                required
                                value={approveAmount}
                                onChange={(e) => setApproveAmount(e.target.value)}
                                placeholder="Enter paid plan amount"
                                className={`w-full p-3.5 rounded-2xl border font-black text-base outline-none focus:border-indigo-500 ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                            />
                            {approvalModalSub.plan_id?.pricing && (
                                <div className="text-[10px] font-bold text-gray-500 flex justify-between">
                                    <span>Monthly: {approvalModalSub.currency || 'INR'} {approvalModalSub.plan_id.pricing.find(p => p.cycle === 'monthly')?.price ?? 0}</span>
                                    <span>Yearly: {approvalModalSub.currency || 'INR'} {approvalModalSub.plan_id.pricing.find(p => p.cycle === 'yearly')?.price ?? 0}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className={`text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>
                                Payment Method
                            </label>
                            <CommonSelect
                                value={approvePaymentMethod}
                                onChange={(val) => setApprovePaymentMethod(val)}
                                options={[
                                    { label: 'Cash', value: 'CASH' },
                                    { label: 'UPI', value: 'UPI' },
                                    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
                                    { label: 'Credit/Debit Card', value: 'CARD' },
                                    { label: 'Online Payment', value: 'ONLINE' },
                                    { label: 'Manual Confirmation', value: 'MANUAL' }
                                ]}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>
                                Transaction ID / Reference (Optional)
                            </label>
                            <input
                                type="text"
                                value={approveTransactionId}
                                onChange={(e) => setApproveTransactionId(e.target.value)}
                                placeholder="e.g. TXN123456789"
                                className={`w-full p-3.5 rounded-2xl border font-bold text-sm outline-none focus:border-indigo-500 ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                            />
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <button
                                type="button"
                                onClick={() => setApprovalModalSub(null)}
                                className={`flex-1 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider ${theme.mode === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isApproving}
                                className="flex-1 py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                            >
                                {isApproving ? "Activating…" : "Confirm & Activate Plan"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default SubscriptionList;

