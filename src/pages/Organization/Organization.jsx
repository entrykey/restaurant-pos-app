import React, { useEffect, useMemo, useState } from "react";
import {
    Building2,
    Edit3, Trash2, Plus, MapPin, CreditCard, ChevronDown, CheckCircle, Smartphone, Globe, AlertTriangle, ArrowRight, Save, X, Search, LogOut,
    Sparkles, Check
} from "lucide-react";
import ThemeLoader from "../../components/ui/ThemeLoader";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import CommonTable from "../../components/CommonTable";
import SubscriptionNoticeModal from "../../components/modals/SubscriptionNoticeModal";

import Modal from "../../components/ui/Modal";
import CommonSelect from "../../components/ui/CommonSelect";
import { ROUTE_ACCESS, MODULES } from "../../config/permissionStructure";
import {
    TAX_SYSTEMS,
    BRANCH_STATUS,
    DEFAULT_COUNTRIES,
    CURRENCIES,
    SUBSCRIPTION_PLANS,
    fetchOrganizationData,
    saveBranch,
    deleteBranch,
    fetchLocationByPincode,
    fetchCurrentLocation,
} from "./OrganizationService";
import * as organizationService from './OrganizationService';
import { shopService, api } from "../../services/api";
import { subscriptionService } from '../../services/api/subscriptions';
import { toast } from 'react-hot-toast';


const emptyBranch = (organizationId, defaultUpiId = null) => ({
    id: null,
    organizationId,
    name: "",
    address: { line1: "", city: "", state: "", country: "India", pincode: "" },
    taxConfig: {
        taxSystem: TAX_SYSTEMS.GST,
        gstin: "",
        isGstRegistered: false,
        allowInterState: true,
    },
    currency: "INR",
    upiId: defaultUpiId,
    isMainBranch: false,
    status: BRANCH_STATUS.ACTIVE,
});

const getProfileChecklist = (organization, branch) => ([
    { key: "businessName", label: "Business Info", value: organization?.businessName },
    { key: "ownerName", label: "Owner Details", value: organization?.ownerName },
    { key: "ownerEmail", label: "Owner Email", value: organization?.ownerEmail },
    { key: "defaultCountry", label: "Default Country", value: organization?.defaultCountry },
    { key: "defaultCurrency", label: "Default Currency", value: organization?.defaultCurrency },
    { key: "defaultTaxSystem", label: "Default Tax System", value: organization?.defaultTaxSystem },
    { key: "line1", label: "Address Line 1", value: branch?.address?.line1 },
    { key: "city", label: "City", value: branch?.address?.city },
    { key: "state", label: "State", value: branch?.address?.state },
    { key: "pincode", label: "Pincode", value: branch?.address?.pincode },
    { key: "tax", label: "Tax Info (GST/VAT)", value: branch?.taxConfig?.gstin || (organization?.defaultTaxSystem && branch?.id) }
]);

const Organization = ({
    organization,
    setOrganization,
    branches,
    setBranches,
    hasPermissionFor,
}) => {
    const orgAccess = ROUTE_ACCESS.ORGANIZATION;
    const canView = hasPermissionFor?.(orgAccess.module, orgAccess.resource, orgAccess.action);
    const canEditOrg = hasPermissionFor?.(MODULES.ORGANIZATION, "organization", "edit");
    const canCreateBranch = hasPermissionFor?.(MODULES.ORGANIZATION, "branch", "create");
    const canEditBranch = hasPermissionFor?.(MODULES.ORGANIZATION, "branch", "edit");
    const canDeleteBranch = hasPermissionFor?.(MODULES.ORGANIZATION, "branch", "delete");
    const { theme, themeName } = useTheme();

    // Use props for organization and branches, but keep local for others
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trialLoading, setTrialLoading] = useState(null);
    const [trialRunRequestLoading, setTrialRunRequestLoading] = useState(false);
    const [planLoading, setPlanLoading] = useState(false);
    const [isLocationLoading, setIsLocationLoading] = useState(false);

    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [branchForm, setBranchForm] = useState(emptyBranch(null));

    const [isSaving, setIsSaving] = useState(false);
    const [originalOrg, setOriginalOrg] = useState(null);
    const [isDirty, setIsDirty] = useState(false);

    const [isSubscriptionNoticeOpen, setIsSubscriptionNoticeOpen] = useState(false);
    
    const confirmToast = (message, onConfirm, onCancel = () => { }) => {
        toast.custom((t) => (
            <div className={`
                ${themeName === 'dark' ? 'bg-slate-900 border-indigo-500/10' : 'bg-white border-slate-100'} 
                p-8 rounded-[40px] shadow-2xl border-4 max-w-md w-full 
                transition-all duration-500 transform 
                ${t.visible ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-12'}
            `}>
                <div className="flex flex-col gap-8">
                    <div className="flex items-start gap-5">
                        <div className={`p-4 rounded-[24px] shrink-0 ${themeName === 'dark' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            <Sparkles size={28} className="animate-pulse" />
                        </div>
                        <div className="space-y-1.5">
                            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${themeName === 'dark' ? 'text-indigo-400/60' : 'text-indigo-600/60'}`}>
                                Action Required
                            </p>
                            <h3 className={`text-xl font-black tracking-tight leading-tight ${themeName === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {message}
                            </h3>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            className={`flex-1 py-5 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all active:scale-90 ${themeName === 'dark'
                                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                                }`}
                            onClick={() => { toast.dismiss(t.id); onCancel(); }}
                        >
                            Cancel
                        </button>
                        <button
                            className="flex-1 py-5 rounded-[22px] bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all text-center"
                            onClick={() => { toast.dismiss(t.id); onConfirm(); }}
                        >
                            Yes, proceed
                        </button>
                    </div>
                </div>
            </div>
        ), { duration: Infinity, position: 'top-center' });
    };


    // ... loadData and useEffect ...

    // ... handleStartTrial ...

    const handlePincodeBlur = async () => {
        const pincode = branchForm.address?.pincode;
        if (pincode && pincode.length === 6) { // Assuming 6 digit pincode for India/UAE
            setIsLocationLoading(true);
            try {
                // Defaulting to "in" for India if country is India, else try to detect or default
                const countryCode = branchForm.address?.country?.toLowerCase() === 'india' ? 'in' : 'ae';
                const locationData = await organizationService.fetchLocationByPincode(countryCode, pincode);

                if (locationData && locationData.places && locationData.places.length > 0) {
                    const place = locationData.places[0];
                    setBranchForm(prev => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            city: place['place name'],
                            state: place['state'],
                            // country: locationData.country // API returns country name
                        }
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch location from pincode", error);
            } finally {
                setIsLocationLoading(false);
            }
        }
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLocationLoading(true);
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const addressData = await organizationService.fetchCurrentLocation(latitude, longitude);
                    if (addressData && addressData.address) {
                        const addr = addressData.address;
                        setBranchForm(prev => ({
                            ...prev,
                            address: {
                                ...prev.address,
                                line1: [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(", "),
                                city: addr.city || addr.town || addr.village || addr.county || "",
                                state: addr.state || "",
                                country: addr.country || "",
                                pincode: addr.postcode || prev.address.pincode
                            }
                        }));
                    }
                } catch (error) {
                    console.error("Failed to fetch current location address", error);
                    toast.error("Failed to fetch address from location.");
                } finally {
                    setIsLocationLoading(false);
                }
            }, (error) => {
                console.error("Geolocation error:", error);
                setIsLocationLoading(false);
                toast.error("Location access denied or unavailable.");
            });
        } else {
            toast.error("Geolocation is not supported by this browser.");
        }
    };

    // Use auth context for logout and user data
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [highlightSubscriptionSection, setHighlightSubscriptionSection] = useState(false);

    const canSelectOrganization = hasPermissionFor?.(MODULES.ORGANIZATION, "organization", "select") || user?.permissions?.ORGANIZATION?.includes("ORGANIZATION.SELECT");

    const [logoUploading, setLogoUploading] = useState(false);
    const mainBranch = useMemo(() => {
        const existing = branches?.find((b) => b.isMainBranch) || branches?.[0] || null;
        if (isBranchModalOpen && (branchForm?.isMainBranch || editingBranch?.isMainBranch)) {
            return branchForm;
        }
        return existing;
    }, [branches, isBranchModalOpen, branchForm, editingBranch]);

    const profileChecklist = useMemo(() => getProfileChecklist(organization, mainBranch), [organization, mainBranch]);
    const completedCount = profileChecklist.filter((item) => Boolean(item.value)).length;
    const profileCompletion = profileChecklist.length ? Math.round((completedCount / profileChecklist.length) * 100) : 0;
    const missingProfileKeys = new Set(profileChecklist.filter((item) => !item.value).map((item) => item.key));

    const loadData = async () => {
        try {
            if (!user) {
                console.log("Organization: User not yet loaded, skipping loadData");
                return;
            }

            const userId = user._id || user.id;
            console.log("Organization: Starting loadData...", { userId, shopId: user.shop_id });
            setLoading(true);

            // We no longer pass targetShopId, because getShopDataByUserId in the backend 
            // has been fixed to automatically prioritize the user's active shop_id from the context.
            const data = await organizationService.fetchOrganizationData(userId);
            console.log("Organization: Data fetched successfully:", data);

            if (data.organization) {
                setOrganization(data.organization);
                setOriginalOrg(data.organization);
            }
            if (data.branches) {
                setBranches(data.branches);
            }
            if (data.plans) {
                setPlans(data.plans);
            }

            // Fetch user's shops logic removed, now handled globally in AppContext/Navbar


            setLoading(false);
            console.log("Organization: Data state updated.");

        } catch (err) {
            console.error("Organization: Error loading organization data:", err);
            setError(err.message || "Failed to load data");
            setLoading(false);
        }
    };

    React.useEffect(() => {
        if (user?._id || user?.id) {
            loadData();
        }
    }, [user?._id, user?.id, user?.shopId, user?.shop_id]);

    React.useEffect(() => {
        if (organization && originalOrg) {
            const hasChanges =
                organization.businessName !== originalOrg.businessName ||
                organization.ownerName !== originalOrg.ownerName ||
                organization.ownerEmail !== originalOrg.ownerEmail ||
                organization.defaultCountry !== originalOrg.defaultCountry ||
                organization.defaultCurrency !== originalOrg.defaultCurrency ||
                organization.defaultTaxSystem !== originalOrg.defaultTaxSystem ||
                organization.defaultUpiId !== originalOrg.defaultUpiId;
            setIsDirty(hasChanges);
        }
    }, [organization, originalOrg]);

    // Deep-link from SubscriptionNoticeModal: ?highlight=subscription (wait until page loaded)
    useEffect(() => {
        if (searchParams.get('highlight') !== 'subscription') return;
        if (loading) return;

        setHighlightSubscriptionSection(true);
        const scrollTimer = window.setTimeout(() => {
            document.getElementById('organization-subscription-plans')?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 100);

        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('highlight');
            return next;
        }, { replace: true });

        const clearTimer = window.setTimeout(() => setHighlightSubscriptionSection(false), 10000);
        return () => {
            window.clearTimeout(scrollTimer);
            window.clearTimeout(clearTimer);
        };
    }, [searchParams, loading, setSearchParams]);



    const handleSaveChanges = async () => {
        if (!organization?.id || !canEditOrg) return;
        setIsSaving(true);
        try {
            const updatePayload = {
                name: organization.businessName,
                ownerName: organization.ownerName,
                ownerEmail: organization.ownerEmail,
                defaultCountryCode: organization.defaultCountry || null,
                defaultCurrencyCode: organization.defaultCurrency || null,
                defaultTaxSystem: organization.defaultTaxSystem || null,
                defaultUpiId: organization.defaultUpiId || null,
            };
            await shopService.updateShop(organization.id, updatePayload);
            toast.success("Organization details updated successfully.");
            setOriginalOrg(organization);
            setIsDirty(false);
        } catch (error) {
            console.error("Failed to update organization:", error);
            toast.error(error.message || "Failed to update organization");
        } finally {
            setIsSaving(false);
        }
    };

    const isTrialRunMode = organization?.subscriptionMethod === 'trial_run';
    const trialRunStatus = organization?.trialRunStatus || 'none';

    const handleRequestTrialRun = () => {
        confirmToast('Send a trial run access request to the system administrator?', async () => {
            setTrialRunRequestLoading(true);
            try {
                await subscriptionService.createTrialRunRequest();
                toast.success('Trial run request submitted. You will be notified once approved.');
                await loadData();
            } catch (error) {
                toast.error(error?.response?.data?.message || error?.message || 'Failed to submit trial run request');
            } finally {
                setTrialRunRequestLoading(false);
            }
        });
    };

    const handleStartTrial = (plan) => {
        confirmToast(`Start your ${plan.trialDurationDays} day trial for the ${plan.name} plan?`, async () => {
            setTrialLoading(plan.id);
            try {
                await shopService.updateShop(organization.id, { 
                    startTrial: true, 
                    plan_id: plan.id 
                });
                toast.success(`Trial started! Enjoy ${plan.name} for ${plan.trialDurationDays} days.`);
                localStorage.removeItem("subscription_notified");
                localStorage.removeItem("pos_subscription_modal_dismissed");
                await loadData();
            } catch (error) {
                console.error("Failed to start trial:", error);
                toast.error("Failed to start trial: " + (error.message || "Unknown error"));
            } finally {
                setTrialLoading(null);
            }
        });
    };

    const handlePlanChange = (plan) => {
        const isCurrent = organization?.subscriptionPlanId === plan.id;
        const isExpired = organization?.subscriptionStatus === 'expired' || organization?.subscriptionStatus === 'inactive';
        const actionText = isCurrent ? (isExpired ? "renew" : "subscribe to") : "subscribe to";

        confirmToast(`Subscribe to ${plan.name}? We will send a payment confirmation request to super admin.`, async () => {
            setPlanLoading(true);
            try {
                await subscriptionService.createSubscription({
                    shop_id: organization.id,
                    plan_id: plan.id,
                    billing_cycle: 'monthly',
                    subscription_intent: 'subscribe',
                });
                toast.success("Payment request sent. Subscription will activate after super admin confirmation.");
                localStorage.removeItem("subscription_notified");
                localStorage.removeItem("pos_subscription_modal_dismissed");
                await loadData();
                try {
                    const refreshed = await shopService.switchShop(organization.id);
                    if (refreshed?.user) login(refreshed.user);
                } catch (_) { /* session refresh optional */ }
            } catch (error) {
                console.error("Failed to change plan:", error);
                toast.error(error.message || "Failed to change plan");
            } finally {
                setPlanLoading(false);
            }
        });
    };

    const checkSubscriptionAndOpen = (openModalFn) => {
        const isOwner = user?.isOwner || user?.roles?.some(r => r.name === 'Owner' || r.name === 'Admin');
        const hasWriteAccess = organization?.canWrite || organization?.trialRunStatus === 'approved' || user?.subscription?.active;
        if (!user?.isSuperAdmin && !isOwner && !hasWriteAccess) {
            setIsSubscriptionNoticeOpen(true);
            return;
        }
        openModalFn();
    };

    const openAddBranch = () => {
        setEditingBranch(null);
        setBranchForm(emptyBranch(organization?.id, organization?.defaultUpiId));
        setIsBranchModalOpen(true);
    };

    const openEditBranch = (branch) => {
        setEditingBranch(branch);
        setBranchForm({
            ...branch,
            address: { ...branch.address },
            taxConfig: { ...branch.taxConfig },
        });
        setIsBranchModalOpen(true);
    };

    const handleSaveBranch = async (e) => {
        e.preventDefault();
        try {
            await saveBranch(branchForm);
            await loadData();
            setIsBranchModalOpen(false);
            setBranchForm(emptyBranch(organization?.id, organization?.defaultUpiId));
            toast.success("Branch saved successfully.");
        } catch (error) {
            console.error("Failed to save branch:", error);
            // setError(error.message || "Failed to save branch"); // Optional: keep inline error or use alert? Alert is better for 403
            const errMsg = error.response?.data?.message || error.message || "Failed to save branch";
            toast.error(errMsg);
        }
    };

    const handleDisableBranch = (branch) => {
        const newStatus = branch.status === BRANCH_STATUS.ACTIVE ? BRANCH_STATUS.INACTIVE : BRANCH_STATUS.ACTIVE;
        const actionText = branch.status === BRANCH_STATUS.ACTIVE ? "disable" : "enable";

        confirmToast(`Are you sure you want to ${actionText} this branch?`, async () => {
            try {
                const updatedBranch = { ...branch, status: newStatus };
                await saveBranch(updatedBranch);
                await loadData();
                toast.success(`Branch ${actionText}d successfully.`);
            } catch (error) {
                console.error("Failed to update branch status:", error);
                toast.error(error.message || `Failed to ${actionText} branch`);
            }
        });
    };

    const branchColumns = [
        { header: "Branch Name", key: "name", render: (v) => <span className="font-bold text-gray-800 dark:text-gray-200">{v}</span> },
        { header: "City", key: "address", render: (addr) => addr?.city || "—" },
        { header: "State", key: "address", render: (addr) => (typeof addr?.state === 'object' ? addr.state?.name : addr?.state) || "—" },
        { header: "Country", key: "address", render: (addr) => (typeof addr?.country === 'object' ? addr.country?.name : addr?.country) || "—" },
        {
            header: "Status",
            key: "status",
            render: (status) => (
                <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${status === BRANCH_STATUS.ACTIVE ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                        }`}
                >
                    {status}
                </span>
            ),
        }
    ];

    if (canEditBranch || canDeleteBranch) {
        branchColumns.push({
            header: "Action",
            key: "id",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, row) => (
                <div className="flex justify-end gap-2">
                    {canEditBranch && (
                        <button
                            onClick={(e) => { e.stopPropagation(); openEditBranch(row); }}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"
                            title="Edit"
                        >
                            <Edit3 size={16} />
                        </button>
                    )}
                    {canDeleteBranch && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDisableBranch(row); }}
                            className="p-2 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                            title={row.status === BRANCH_STATUS.ACTIVE ? "Disable" : "Enable"}
                        >
                            {row.status === BRANCH_STATUS.ACTIVE ? "Disable" : "Enable"}
                        </button>
                    )}
                </div>
            ),
        });
    }

    if (loading) return <div className="h-full flex items-center justify-center dark:text-white">Loading...</div>;
    if (error) return <div className="h-full flex items-center justify-center text-red-500">Error: {error}</div>;

    if (!canView) {
        return (
            <div className={`h-full flex items-center justify-center ${theme.pageBg || 'bg-gray-50'}`}>
                <div className={`text-center p-12 ${theme.surfaceBg || 'bg-white'} rounded-[40px] shadow-xl border ${theme.borderLight || 'border-gray-200'} max-w-md`}>
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 size={40} />
                    </div>
                    <h2 className={`text-2xl font-black ${theme.textHeading || 'text-gray-800'} mb-2`}>Access Restricted</h2>
                    <p className={`font-medium ${theme.textSecondary || 'text-gray-500'}`}>You don&apos;t have permission to view Organization.</p>
                </div>
            </div>
        );
    }

    const handleLogoChange = async (e) => {
        if (!canEditOrg || !organization?.id) return;
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const formData = new FormData();
            formData.append('logo', file);
            
            const res = await shopService.uploadLogo(organization.id, formData);
            const logoUrl = res.logoUrl || res.data?.logoUrl || res.data?.shop?.logoUrl || res.shop?.logoUrl;
            if (logoUrl) {
                setOrganization(prev => ({ ...prev, logoUrl }));
            }
            toast.success("Shop logo updated successfully.");
        } catch (error) {
            console.error("Failed to upload logo:", error);
            const msg = error.message || error?.response?.data?.message || "Failed to upload logo";
            toast.error(msg);
        } finally {
            setLogoUploading(false);
        }
    };

    const handleCountryChange = (countryCode) => {
        if (!canEditOrg) return;

        let taxSystem = organization.defaultTaxSystem;
        let currency = organization.defaultCurrency;

        // Auto-select tax system based on country
        if (countryCode === 'IN') taxSystem = TAX_SYSTEMS.GST;
        else if (['AE', 'SA', 'GB'].includes(countryCode)) taxSystem = TAX_SYSTEMS.VAT;
        else if (countryCode === 'US') taxSystem = TAX_SYSTEMS.SALES_TAX;

        // Auto-select currency based on country
        const countryToCurrency = {
            'IN': 'INR',
            'AE': 'AED',
            'SA': 'SAR',
            'US': 'USD',
            'GB': 'GBP'
        };
        if (countryToCurrency[countryCode]) {
            currency = countryToCurrency[countryCode];
        }

        setOrganization({
            ...organization,
            defaultCountry: countryCode,
            defaultTaxSystem: taxSystem,
            defaultCurrency: currency
        });
    };

    return (
        <div className={`p-4 md:p-8 h-full overflow-y-auto ${theme.pageBg || 'bg-slate-50 dark:bg-slate-900'}`}>
            <div className="w-full mx-auto space-y-8">
                {/* Header */}
                <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-500 p-[1px] shadow-sm">
                    <div className={`relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-6 md:px-10 py-6 md:py-7 ${themeName === 'dark' ? 'bg-slate-900/90' : 'bg-slate-950/5'} backdrop-blur-sm rounded-[31px]`}>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 text-white rounded-2xl shadow-lg shadow-black/10">
                                <Building2 size={26} />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Organization</h2>
                                <p className="text-indigo-100/90 font-semibold text-xs md:text-sm">
                                    Central control for your brand, branches & subscription.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 md:gap-4 text-[10px] md:text-[11px] font-black">
                            <div className="px-3 py-1.5 rounded-full bg-white/10 text-white flex items-center gap-2 backdrop-blur">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                                {organization?.businessName || "Unnamed Business"}
                            </div>
                            <div className="px-3 py-1.5 rounded-full bg-black/10 text-indigo-100 flex items-center gap-1.5 backdrop-blur">
                                <Sparkles size={12} />
                                <span>{organization?.planName || "No Active Plan"}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-full bg-black/10 text-indigo-100 flex items-center gap-1.5 backdrop-blur">
                                <MapPin size={12} />
                                <span>{branches.length} {branches.length === 1 ? "Branch" : "Branches"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Details */}
                <div className={`${theme.surfaceBg || 'bg-white dark:bg-slate-800'} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight || 'border-slate-100 dark:border-slate-700'}`}>
                    <div className={`mb-6 p-5 rounded-3xl border ${profileCompletion >= 100 ? 'border-green-200 bg-green-50/70 dark:bg-green-900/20' : 'border-amber-200 bg-amber-50/80 dark:bg-amber-900/20'}`}>
                        <div className="flex items-center justify-between gap-4 mb-3">
                            <h4 className={`text-lg font-black ${theme.textHeading}`}>Profile Completion</h4>
                            <span className={`text-sm font-black ${profileCompletion >= 100 ? 'text-green-600' : 'text-amber-600'}`}>{profileCompletion}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-slate-700 mb-4">
                            <div className={`h-2 rounded-full transition-all ${profileCompletion >= 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${profileCompletion}%` }} />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {profileChecklist.map((item) => (
                                <div key={item.key} className={`text-xs px-2 py-1 rounded-lg font-bold ${item.value ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                                    {item.value ? '✔' : '✖'} {item.label}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h3 className={`text-xl font-bold ${theme.textHeading || 'text-gray-800 dark:text-white'} flex items-center gap-2`}>
                            <Building2 size={20} className="text-indigo-500 dark:text-indigo-400" /> Organization Details
                        </h3>
                        {isDirty && canEditOrg && (
                            <button
                                onClick={handleSaveChanges}
                                disabled={isSaving}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? <ThemeLoader size="xs" /> : <Save size={20} />}
                                Save Changes
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left Side: Logo */}
                        <div className="space-y-3 shrink-0">
                            <label className={`text-xs font-black uppercase block ${theme.textSecondary || 'text-gray-400'}`}>Shop Logo</label>
                            <div className="flex flex-col gap-2">
                                <div className={`relative w-32 h-32 rounded-[24px] border-2 border-dashed flex items-center justify-center overflow-hidden group hover:border-indigo-400 transition-colors ${theme.borderLight} ${theme.inputBg}`}>
                                    {logoUploading ? (
                                        <div className="flex flex-col items-center gap-2 text-[11px] text-gray-500 font-bold">
                                            <ThemeLoader size="sm" />
                                            Uploading…
                                        </div>
                                    ) : organization?.logoUrl ? (
                                        <>
                                            <img
                                                src={organization.logoUrl.startsWith("http") ? organization.logoUrl : `${(api.defaults.baseURL || '').replace(/\/api\/?$/, "")}${organization.logoUrl}`}
                                                alt="Shop Logo"
                                                className="w-full h-full object-contain p-2"
                                            />
                                            <label className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all opacity-90 group-hover:opacity-100 z-10">
                                                <Edit3 size={14} />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleLogoChange}
                                                    disabled={!canEditOrg || logoUploading}
                                                />
                                            </label>
                                        </>
                                    ) : (
                                        <label className={`flex flex-col items-center justify-center w-full h-full cursor-pointer transition-colors ${themeName === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-gray-100/50'}`}>
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-2 group-hover:bg-indigo-100 transition-colors">
                                                <Plus size={20} />
                                            </div>
                                            <span className={`text-[10px] font-bold text-center px-2 ${theme.textSecondary || 'text-gray-500'}`}>Upload Logo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleLogoChange}
                                                disabled={!canEditOrg || logoUploading}
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium">PNG/JPG up to 2MB.<br />Shown on barcodes & receipts.</p>
                            </div>
                        </div>

                        {/* Right Side: 6 Inputs in a 3-column / 2-row grid */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Business Name</label>
                                <input
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary} ${missingProfileKeys.has('businessName') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                    value={organization?.businessName ?? ""}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, businessName: e.target.value })}
                                    readOnly={!canEditOrg}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Owner Name</label>
                                <input
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary} ${missingProfileKeys.has('ownerName') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                    value={organization?.ownerName ?? ""}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, ownerName: e.target.value })}
                                    readOnly={!canEditOrg}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Owner Email</label>
                                <input
                                    type="email"
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary} ${missingProfileKeys.has('ownerEmail') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                    value={organization?.ownerEmail ?? ""}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, ownerEmail: e.target.value })}
                                    readOnly={!canEditOrg}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Default Country</label>
                                <CommonSelect
                                    options={DEFAULT_COUNTRIES}
                                    value={organization?.defaultCountry ?? ""}
                                    onChange={handleCountryChange}
                                    placeholder="Select country"
                                    labelKey="name"
                                    valueKey="code"
                                    disabled={!canEditOrg}
                                    triggerClassName={missingProfileKeys.has('defaultCountry') ? 'border-amber-400 ring-1 ring-amber-300' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Default Currency</label>
                                <CommonSelect
                                    options={CURRENCIES}
                                    value={organization?.defaultCurrency ?? ""}
                                    onChange={(val) => canEditOrg && setOrganization({ ...organization, defaultCurrency: val })}
                                    placeholder="Select currency"
                                    labelKey="name"
                                    valueKey="code"
                                    disabled={!canEditOrg}
                                    triggerClassName={missingProfileKeys.has('defaultCurrency') ? 'border-amber-400 ring-1 ring-amber-300' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Default Tax System</label>
                                <CommonSelect
                                    options={Object.values(TAX_SYSTEMS).map(t => ({ label: t, value: t }))}
                                    value={organization?.defaultTaxSystem ?? ""}
                                    onChange={(val) => canEditOrg && setOrganization({ ...organization, defaultTaxSystem: val })}
                                    placeholder="Select tax system"
                                    labelKey="label"
                                    valueKey="value"
                                    disabled={!canEditOrg}
                                    triggerClassName={missingProfileKeys.has('defaultTaxSystem') ? 'border-amber-400 ring-1 ring-amber-300' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Default UPI ID</label>
                                <input
                                    type="text"
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                    value={organization?.defaultUpiId ?? ""}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, defaultUpiId: e.target.value })}
                                    readOnly={!canEditOrg}
                                    placeholder="e.g. mobile@upi"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription & Plans — id used by SubscriptionNoticeModal deep-link */}
                <div
                    id="organization-subscription-plans"
                    className={`${theme.surfaceBg || 'bg-white dark:bg-slate-800'} p-6 md:p-8 rounded-[40px] shadow-xl border transition-[box-shadow,ring] duration-500 ${theme.borderLight || 'border-slate-100 dark:border-slate-700'} ${
                        highlightSubscriptionSection
                            ? 'ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-950/0 dark:ring-offset-slate-900 shadow-2xl shadow-indigo-500/20'
                            : ''
                    }`}
                >
                    <h3 className={`text-xl font-bold ${theme.textHeading || 'text-gray-800 dark:text-white'} mb-6 flex items-center gap-2`}>
                        <CreditCard size={20} className="text-indigo-500 dark:text-indigo-400" /> Subscription & Plans
                    </h3>

                    <div className={`p-6 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border ${themeName === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-indigo-50/80 border-indigo-100/70'}`}>
                        <div>
                            <p className={`text-xs font-black uppercase mb-1 ${theme.primaryIconText}`}>
                                {isTrialRunMode ? 'Access status' : 'Current Plan'}
                            </p>
                            <h4 className={`text-2xl font-black ${theme.textHeading}`}>{organization?.planName}</h4>
                            <p className={`font-medium ${theme.textSecondary || 'text-gray-500'}`}>{organization?.planPriceLabel}</p>
                        </div>
                        {/* 
                           If no active plan, we don't show "Manage Subscription" typically, 
                           unless we want to let them add payment method etc. 
                           For now, keeping it simple.
                        */}
                    </div>

                    {isTrialRunMode && trialRunStatus !== 'approved' && (
                        <div className={`p-6 rounded-3xl mb-8 border ${themeName === 'dark' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex items-start gap-3 mb-4">
                                <Sparkles className="text-amber-600 shrink-0" size={22} />
                                <div>
                                    <h4 className={`font-black ${theme.textHeading}`}>Trial run access</h4>
                                    <p className={`text-sm mt-1 ${theme.textSecondary}`}>
                                        Request full platform access for your business type. A super admin must approve before you can create sales, purchases, and other records.
                                    </p>
                                </div>
                            </div>
                            {trialRunStatus === 'pending' ? (
                                <p className={`text-sm font-bold ${theme.primaryIconText}`}>Your trial run request is pending approval.</p>
                            ) : trialRunStatus === 'rejected' ? (
                                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                    <p className="text-sm font-bold text-red-600">Your previous request was not approved.</p>
                                    <button
                                        type="button"
                                        onClick={() => canEditOrg && handleRequestTrialRun()}
                                        disabled={!canEditOrg || trialRunRequestLoading}
                                        className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {trialRunRequestLoading ? 'Submitting…' : 'Request again'}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => canEditOrg && handleRequestTrialRun()}
                                    disabled={!canEditOrg || trialRunRequestLoading}
                                    className="px-5 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {trialRunRequestLoading ? 'Submitting…' : 'Request trial run access'}
                                </button>
                            )}
                        </div>
                    )}

                    {!isTrialRunMode && plans.length > 0 && (
                        <>
                            <p className={`font-medium mb-6 ${theme.textSecondary || 'text-gray-500'}`}>Upgrade your plan for more branches and features</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {plans.map((plan) => {
                            const isCurrent = organization?.subscriptionPlanId === plan.id;
                            const isExpired = organization?.subscriptionStatus === 'expired' || organization?.subscriptionStatus === 'inactive';
                            const isTrialPlan = organization?.isTrial;
                            const isTrialLoading = trialLoading === plan.id;
                            const showStartTrial = !organization?.subscriptionPlanId && plan.hasTrial;
                            
                            // Let users upgrade/renew if current plan is expired or is just a trial
                            const canUpgradeNow = !isCurrent || isExpired || isTrialPlan;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative p-6 rounded-3xl border-2 transition-all ${plan.highlighted
                                        ? `border-indigo-600 shadow-lg scale-105 z-10 ${themeName === 'dark' ? 'bg-slate-900/80' : 'bg-indigo-50/50'}`
                                        : `${theme.borderLight} hover:border-indigo-500 hover:shadow-lg ${themeName === 'dark' ? 'bg-slate-800/50' : 'hover:border-indigo-200'}`
                                        }`}
                                >
                                    {plan.highlighted && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                            Most Popular
                                        </div>
                                    )}
                                    <h4 className={`text-xl font-bold mb-2 ${theme.textHeading}`}>{plan.name}</h4>
                                    <div className="flex items-baseline gap-1 mb-1">
                                        <span className={`text-3xl font-black ${theme.primaryIconText}`}>
                                            {plan.priceLabel.split(" ")[0]} {plan.price}
                                        </span>
                                        <span className={`font-medium ${theme.textSecondary || 'text-gray-400'}`}>/mo</span>
                                    </div>
                                    <p className={`text-xs font-medium mb-6 ${theme.textSecondary || 'text-gray-500'}`}>Up to {plan.branchesLimit === -1 ? "Unlimited" : plan.branchesLimit} branches</p>

                                    <ul className="space-y-3 mb-8">
                                        {plan.features.map((feature, i) => (
                                            <li key={i} className={`flex items-start gap-2 text-sm font-medium ${themeName === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                                <Check size={16} className="text-green-500 shrink-0 mt-0.5" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {isCurrent && !isExpired && !isTrialPlan ? (
                                        <button
                                            disabled
                                            className={`w-full py-2.5 rounded-xl font-bold cursor-default ${themeName === 'dark' ? 'bg-slate-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}
                                        >
                                            Current plan
                                        </button>
                                    ) : showStartTrial ? (
                                        <button
                                            onClick={() => canEditOrg && handleStartTrial(plan)}
                                            disabled={!canEditOrg || isTrialLoading}
                                            className={`w-full py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.highlighted
                                                ? `bg-indigo-600 text-white hover:bg-indigo-700 ${themeName === 'dark' ? '' : 'shadow-lg shadow-indigo-200'}`
                                                : `${themeName === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-800 hover:bg-gray-700'} text-white`
                                                }`}
                                        >
                                            {isTrialLoading ? "Starting…" : `Start ${plan.trialDurationDays ?? 0} day trial`}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => canEditOrg && handlePlanChange(plan)}
                                            disabled={!canEditOrg}
                                            className={`w-full py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.highlighted
                                                ? `bg-indigo-600 text-white hover:bg-indigo-700 ${themeName === 'dark' ? '' : 'shadow-lg shadow-indigo-200'}`
                                                : `${themeName === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-800 hover:bg-gray-700'} text-white`
                                                }`}
                                        >
                                            {isCurrent ? (isExpired ? "Subscribe" : "Subscribe") : "Subscribe"}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                            </div>
                        </>
                    )}
                </div>

                {/* Branches */}
                <div className={`${theme.surfaceBg || 'bg-white dark:bg-slate-800'} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight || 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h3 className={`text-xl font-bold ${theme.textHeading || 'text-gray-800 dark:text-white'} flex items-center gap-2`}>
                            <MapPin size={20} className="text-indigo-500 dark:text-indigo-400" /> Branches
                        </h3>
                        {canCreateBranch && (
                            <button
                                onClick={() => checkSubscriptionAndOpen(openAddBranch)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2"
                            >
                                <Plus size={20} /> Add Branch
                            </button>
                        )}
                    </div>
                    <CommonTable
                        columns={branchColumns}
                        data={branches}
                        rowKey="id"
                    />
                </div>
            </div>

            {/* Modal Content */}
            <Modal
                isOpen={isBranchModalOpen}
                onClose={() => setIsBranchModalOpen(false)}
                title={editingBranch ? "Edit Branch" : "Add New Branch"}
                className="max-w-lg dark:bg-slate-800 dark:border-slate-700"
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Branch Name</label>
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isLocationLoading}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                            {isLocationLoading ? <ThemeLoader size="xs" /> : <MapPin size={12} />}
                            Use Current Location
                        </button>
                    </div>
                    <div>
                        <input
                            className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                            value={branchForm.name}
                            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                            placeholder="e.g. Food Plaza - Dubai"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Pincode</label>
                            <div className="relative">
                                <input
                                    className={`w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white ${missingProfileKeys.has('pincode') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                    value={branchForm.address?.pincode ?? ""}
                                    onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, pincode: e.target.value } })}
                                    onBlur={handlePincodeBlur}
                                    placeholder="Enter to autofill"
                                />
                                {isLocationLoading && <div className="absolute right-3 top-3"><ThemeLoader size="xs" /></div>}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Address Line 1</label>
                            <input
                                className={`w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white ${missingProfileKeys.has('line1') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                value={branchForm.address?.line1 ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, line1: e.target.value } })}
                                placeholder="Street / Area"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">City</label>
                            <input
                                className={`w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white ${missingProfileKeys.has('city') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                value={branchForm.address?.city ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, city: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">State</label>
                            <input
                                className={`w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white ${missingProfileKeys.has('state') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                value={branchForm.address?.state ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, state: e.target.value } })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Country</label>
                            <input
                                className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white"
                                value={branchForm.address?.country ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, country: e.target.value } })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Currency</label>
                        <CommonSelect
                            options={CURRENCIES}
                            value={branchForm.currency}
                            onChange={(val) => setBranchForm({ ...branchForm, currency: val })}
                            placeholder="Select currency"
                            labelKey="name"
                            valueKey="code"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Tax System</label>
                        <CommonSelect
                            options={Object.values(TAX_SYSTEMS).map(t => ({ label: t, value: t }))}
                            value={branchForm.taxConfig?.taxSystem}
                            onChange={(val) => setBranchForm({
                                ...branchForm,
                                taxConfig: {
                                    ...branchForm.taxConfig,
                                    taxSystem: val,
                                },
                            })}
                            placeholder="Select tax system"
                            labelKey="label"
                            valueKey="value"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Branch UPI ID</label>
                        <input
                            className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white"
                            value={branchForm.upiId ?? ""}
                            onChange={(e) => setBranchForm({ ...branchForm, upiId: e.target.value })}
                            placeholder="e.g. branch@upi"
                        />
                    </div>
                    {(() => {
                        const taxSystem = branchForm.taxConfig?.taxSystem || TAX_SYSTEMS.GST;
                        const isRegistered = branchForm.taxConfig?.isGstRegistered ?? false;
                        const registeredLabel =
                            taxSystem === TAX_SYSTEMS.GST ? "GST Registered" :
                                taxSystem === TAX_SYSTEMS.VAT ? "VAT Registered" : "Tax Registered";
                        const regNumberLabel =
                            taxSystem === TAX_SYSTEMS.GST ? "GSTIN" :
                                taxSystem === TAX_SYSTEMS.VAT ? "VAT / TRN Number" : "Tax Registration No.";
                        const regNumberPlaceholder =
                            taxSystem === TAX_SYSTEMS.GST ? "e.g. 29ABCDE1234F1Z9" :
                                taxSystem === TAX_SYSTEMS.VAT ? "VAT or TRN" : "Optional";
                        return (
                            <>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="taxRegistered"
                                        checked={isRegistered}
                                        onChange={(e) => setBranchForm({
                                            ...branchForm,
                                            taxConfig: { ...branchForm.taxConfig, isGstRegistered: e.target.checked },
                                        })}
                                        className="rounded accent-indigo-600 dark:bg-slate-900 border-slate-700"
                                    />
                                    <label htmlFor="taxRegistered" className="text-sm font-medium dark:text-white">{registeredLabel}</label>
                                </div>
                                {isRegistered && (
                                    <div>
                                        <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">{regNumberLabel}</label>
                                        <input
                                            className={`w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white ${missingProfileKeys.has('tax') ? 'border-amber-400 ring-1 ring-amber-300' : ''}`}
                                            value={branchForm.taxConfig?.gstin ?? ""}
                                            onChange={(e) => setBranchForm({
                                                ...branchForm,
                                                taxConfig: { ...branchForm.taxConfig, gstin: e.target.value },
                                            })}
                                            placeholder={regNumberPlaceholder}
                                        />
                                    </div>
                                )}
                            </>
                        );
                    })()}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="mainBranch"
                            checked={branchForm.isMainBranch ?? false}
                            onChange={(e) => setBranchForm({ ...branchForm, isMainBranch: e.target.checked })}
                            className="rounded accent-indigo-600 dark:bg-slate-900 border-slate-700"
                        />
                        <label htmlFor="mainBranch" className="text-sm font-medium dark:text-white">Main Branch</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => setIsBranchModalOpen(false)}
                            className="px-4 py-2 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveBranch}
                            disabled={!branchForm.name?.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Save size={18} /> Save
                        </button>
                    </div>
                </div>
            </Modal>

            <SubscriptionNoticeModal
                isOpen={isSubscriptionNoticeOpen}
                onClose={() => setIsSubscriptionNoticeOpen(false)}
                user={user}
                isStaff={!(user?.isOwner || user?.roles?.some(r => r.name === 'Owner' || r.name === 'Admin'))}
            />
        </div>
    );
};

export default Organization;
