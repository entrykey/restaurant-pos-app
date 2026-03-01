import React, { useState } from "react";
import {
    Building2,
    Plus,
    Edit3,
    MapPin,
    Save,
    CreditCard,
    Check,
    Sparkles,
    Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import CommonTable from "../../components/CommonTable";
import AlertDialog from "../../components/ui/AlertDialog";

import Modal from "../../components/ui/Modal";
import { ROUTE_ACCESS, MODULES } from "../../config/permissionStructure";
import {
    TAX_SYSTEMS,
    BRANCH_STATUS,
    DEFAULT_COUNTRIES,
    CURRENCIES,
    SUBSCRIPTION_PLANS,
    fetchOrganizationData,
    startTrial,
    saveBranch,
    deleteBranch,
    fetchLocationByPincode,
    fetchCurrentLocation,
} from "./OrganizationService";
import { shopService } from "../../services/api";

const emptyBranch = (organizationId) => ({
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
    isMainBranch: false,
    status: BRANCH_STATUS.ACTIVE,
});

const Organization = ({
    hasPermissionFor,
}) => {
    const orgAccess = ROUTE_ACCESS.ORGANIZATION;
    const canView = hasPermissionFor?.(orgAccess.module, orgAccess.resource, orgAccess.action);
    const canEditOrg = hasPermissionFor?.(MODULES.ORGANIZATION, "organization", "edit");
    const canCreateBranch = hasPermissionFor?.(MODULES.ORGANIZATION, "branch", "create");
    const canEditBranch = hasPermissionFor?.(MODULES.ORGANIZATION, "branch", "edit");
    const canDeleteBranch = hasPermissionFor?.(MODULES.ORGANIZATION, "branch", "delete");
    const { theme, themeName } = useTheme();

    const [organization, setOrganization] = useState(null);
    const [branches, setBranches] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trialLoading, setTrialLoading] = useState(null);
    const [isLocationLoading, setIsLocationLoading] = useState(false);

    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [branchForm, setBranchForm] = useState(emptyBranch(null));

    const [alertConfig, setAlertConfig] = useState({ isOpen: false, type: "info", title: "", message: "" });
    const closeAlert = () => setAlertConfig(prev => ({ ...prev, isOpen: false }));
    const showAlert = (type, title, message) => setAlertConfig({ isOpen: true, type, title, message });
    // ... existing ...

    // ... loadData and useEffect ...

    // ... handleStartTrial ...

    const handlePincodeBlur = async () => {
        const pincode = branchForm.address?.pincode;
        if (pincode && pincode.length === 6) { // Assuming 6 digit pincode for India/UAE
            setIsLocationLoading(true);
            try {
                // Defaulting to "in" for India if country is India, else try to detect or default
                const countryCode = branchForm.address?.country?.toLowerCase() === 'india' ? 'in' : 'ae';
                const locationData = await fetchLocationByPincode(countryCode, pincode);

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
                    const addressData = await fetchCurrentLocation(latitude, longitude);
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
                    alert("Failed to fetch address from location.");
                    showAlert("error", "Location Error", "Failed to fetch address from location.");
                } finally {
                    setIsLocationLoading(false);
                }
            }, (error) => {
                console.error("Geolocation error:", error);
                setIsLocationLoading(false);
                showAlert("error", "Access Denied", "Location access denied or unavailable.");
            });
        } else {
            showAlert("error", "Not Supported", "Geolocation is not supported by this browser.");
        }
    };

    // Use auth context for logout and user data
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [logoUploading, setLogoUploading] = useState(false);

    const loadData = async () => {
        try {
            // Use user from context instead of localStorage to avoid race conditions
            if (!user || (!user._id && !user.id)) {
                console.log("No valid user in context, redirecting");
                logout();
                return;
            }

            const userId = user._id || user.id;
            console.log("Fetching organization data for userId:", userId);

            const data = await fetchOrganizationData(userId);

            setOrganization(data.organization);
            setBranches(data.branches);
            setPlans(data.plans);
            setLoading(false);

        } catch (err) {
            console.error("Error loading organization data:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadData();
    }, [user]);

    const handleStartTrial = async (plan) => {
        if (!organization?.id) return;
        setTrialLoading(plan.id);
        try {
            await startTrial(organization.id, plan.id);
            // Refresh data to show active subscription
            await loadData();
            await loadData();
            showAlert("success", "Trial Started", `Successfully started ${plan.trialDurationDays} day trial for ${plan.name}!`);
        } catch (error) {
            console.error("Failed to start trial:", error);
            showAlert("error", "Trial Failed", "Failed to start trial: " + (error.message || "Unknown error"));
        } finally {
            setTrialLoading(null);
        }
    };

    const openAddBranch = () => {
        setEditingBranch(null);
        setBranchForm(emptyBranch(organization?.id));
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
            setBranchForm(emptyBranch(organization?.id));
            showAlert("success", "Branch Saved", "Branch saved successfully.");
        } catch (error) {
            console.error("Failed to save branch:", error);
            // setError(error.message || "Failed to save branch"); // Optional: keep inline error or use alert? Alert is better for 403
            const errMsg = error.response?.data?.message || error.message || "Failed to save branch";
            showAlert("error", "Save Failed", errMsg);
        }
    };

    const handleDisableBranch = async (branch) => {
        const newStatus = branch.status === BRANCH_STATUS.ACTIVE ? BRANCH_STATUS.INACTIVE : BRANCH_STATUS.ACTIVE;
        if (!window.confirm(`Are you sure you want to ${branch.status === BRANCH_STATUS.ACTIVE ? "disable" : "enable"} this branch?`)) return;

        try {
            const updatedBranch = { ...branch, status: newStatus };
            await saveBranch(updatedBranch);
            await loadData();
        } catch (error) {
            console.error("Failed to update branch status:", error);
            setError(error.message);
        }
    };

    const branchColumns = [
        { header: "Branch Name", key: "name", render: (v) => <span className="font-bold text-gray-800 dark:text-gray-200">{v}</span> },
        { header: "City", key: "address", render: (addr) => addr?.city || "—" },
        { header: "State", key: "address", render: (addr) => addr?.state || "—" },
        { header: "Country", key: "address", render: (addr) => addr?.country || "—" },
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
            const res = await shopService.uploadLogo(organization.id, file);
            const logoUrl = res.logoUrl || res.shop?.logoUrl;
            if (logoUrl) {
                setOrganization(prev => ({ ...prev, logoUrl }));
            }
            showAlert("success", "Logo Updated", "Shop logo updated successfully.");
        } catch (error) {
            console.error("Failed to upload logo:", error);
            const msg = error.message || error?.response?.data?.message || "Failed to upload logo";
            showAlert("error", "Upload Failed", msg);
        } finally {
            setLogoUploading(false);
        }
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
                    <h3 className={`text-xl font-bold ${theme.textHeading || 'text-gray-800 dark:text-white'} mb-6 flex items-center gap-2`}>
                        <Building2 size={20} className="text-indigo-500 dark:text-indigo-400" /> Organization Details
                    </h3>
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        {/* Left Side: Logo */}
                        <div className="space-y-3 shrink-0">
                            <label className={`text-xs font-black uppercase block ${theme.textSecondary || 'text-gray-400'}`}>Shop Logo</label>
                            <div className="flex flex-col gap-2">
                                <div className={`relative w-32 h-32 rounded-[24px] border-2 border-dashed flex items-center justify-center overflow-hidden group hover:border-indigo-400 transition-colors ${theme.borderLight} ${theme.inputBg}`}>
                                    {logoUploading ? (
                                        <div className="flex flex-col items-center gap-2 text-[11px] text-gray-500 font-bold">
                                            <Loader2 size={24} className="animate-spin text-indigo-500" />
                                            Uploading…
                                        </div>
                                    ) : organization?.logoUrl ? (
                                        <>
                                            <img
                                                src={organization.logoUrl.startsWith("http") ? organization.logoUrl : `http://localhost:8000${organization.logoUrl}`}
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
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                    value={organization?.businessName ?? ""}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, businessName: e.target.value })}
                                    readOnly={!canEditOrg}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Owner Name</label>
                                <input
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                    value={organization?.ownerName ?? ""}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, ownerName: e.target.value })}
                                    readOnly={!canEditOrg}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Owner Email</label>
                                <input
                                    type="email"
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                    value={organization?.ownerEmail ?? ""}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, ownerEmail: e.target.value })}
                                    readOnly={!canEditOrg}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Default Country</label>
                                <select
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                    value={organization?.defaultCountry ?? "IN"}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, defaultCountry: e.target.value })}
                                    disabled={!canEditOrg}
                                >
                                    {DEFAULT_COUNTRIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Default Currency</label>
                                <select
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                    value={organization?.defaultCurrency ?? "INR"}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, defaultCurrency: e.target.value })}
                                    disabled={!canEditOrg}
                                >
                                    {CURRENCIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textSecondary || 'text-gray-400'}`}>Default Tax System</label>
                                <select
                                    className={`w-full p-4 rounded-2xl border focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                    value={organization?.defaultTaxSystem ?? TAX_SYSTEMS.GST}
                                    onChange={(e) => canEditOrg && setOrganization({ ...organization, defaultTaxSystem: e.target.value })}
                                    disabled={!canEditOrg}
                                >
                                    {Object.values(TAX_SYSTEMS).map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subscription & Plans */}
                <div className={`${theme.surfaceBg || 'bg-white dark:bg-slate-800'} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight || 'border-slate-100 dark:border-slate-700'}`}>
                    <h3 className={`text-xl font-bold ${theme.textHeading || 'text-gray-800 dark:text-white'} mb-6 flex items-center gap-2`}>
                        <CreditCard size={20} className="text-indigo-500 dark:text-indigo-400" /> Subscription & Plans
                    </h3>

                    <div className={`p-6 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border ${themeName === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-indigo-50/80 border-indigo-100/70'}`}>
                        <div>
                            <p className={`text-xs font-black uppercase mb-1 ${theme.primaryIconText}`}>Current Plan</p>
                            <h4 className={`text-2xl font-black ${theme.textHeading}`}>{organization?.planName}</h4>
                            <p className={`font-medium ${theme.textSecondary || 'text-gray-500'}`}>{organization?.planPriceLabel}</p>
                        </div>
                        {/* 
                           If no active plan, we don't show "Manage Subscription" typically, 
                           unless we want to let them add payment method etc. 
                           For now, keeping it simple.
                        */}
                    </div>

                    <p className={`font-medium mb-6 ${theme.textSecondary || 'text-gray-500'}`}>Upgrade your plan for more branches and features</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan) => {
                            const isCurrent = organization?.subscriptionPlanId === plan.id;
                            const isTrialLoading = trialLoading === plan.id;
                            const showStartTrial = !organization?.subscriptionPlanId && plan.hasTrial;

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

                                    {isCurrent ? (
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
                                            onClick={() => canEditOrg && setOrganization({ ...organization, subscriptionPlanId: plan.id })}
                                            disabled={!canEditOrg}
                                            className={`w-full py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${plan.highlighted
                                                ? `bg-indigo-600 text-white hover:bg-indigo-700 ${themeName === 'dark' ? '' : 'shadow-lg shadow-indigo-200'}`
                                                : `${themeName === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-800 hover:bg-gray-700'} text-white`
                                                }`}
                                        >
                                            Upgrade
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Branches */}
                <div className={`${theme.surfaceBg || 'bg-white dark:bg-slate-800'} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight || 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h3 className={`text-xl font-bold ${theme.textHeading || 'text-gray-800 dark:text-white'} flex items-center gap-2`}>
                            <MapPin size={20} className="text-indigo-500 dark:text-indigo-400" /> Branches
                        </h3>
                        {canCreateBranch && (
                            <button
                                onClick={openAddBranch}
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
                            {isLocationLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
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
                                    className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                    value={branchForm.address?.pincode ?? ""}
                                    onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, pincode: e.target.value } })}
                                    onBlur={handlePincodeBlur}
                                    placeholder="Enter to autofill"
                                />
                                {isLocationLoading && <div className="absolute right-3 top-3"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Address Line 1</label>
                            <input
                                className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
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
                                className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white"
                                value={branchForm.address?.city ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, city: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">State</label>
                            <input
                                className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white"
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
                        <select
                            className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white"
                            value={branchForm.currency}
                            onChange={(e) => setBranchForm({ ...branchForm, currency: e.target.value })}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase block mb-1">Tax System</label>
                        <select
                            className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white"
                            value={branchForm.taxConfig?.taxSystem}
                            onChange={(e) => {
                                const newSystem = e.target.value;
                                setBranchForm({
                                    ...branchForm,
                                    taxConfig: {
                                        ...branchForm.taxConfig,
                                        taxSystem: newSystem,
                                    },
                                });
                            }}
                        >
                            {Object.values(TAX_SYSTEMS).map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
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
                                            className="w-full p-3 bg-gray-50 dark:bg-slate-900/50 border dark:border-slate-700 rounded-xl dark:text-white"
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

            <AlertDialog
                isOpen={alertConfig.isOpen}
                onClose={closeAlert}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div>
    );
};

export default Organization;
