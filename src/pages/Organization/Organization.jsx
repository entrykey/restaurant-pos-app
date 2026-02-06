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
} from "lucide-react";
import CommonTable from "../../components/CommonTable";
import Modal from "../../components/ui/Modal";
import { ROUTE_ACCESS, MODULES } from "../../config/permissionStructure";
import {
    TAX_SYSTEMS,
    BRANCH_STATUS,
    DEFAULT_COUNTRIES,
    CURRENCIES,
    SUBSCRIPTION_PLANS,
} from "./OrganizationService";

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

    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [branchForm, setBranchForm] = useState(emptyBranch(organization?.id));

    if (!canView) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <div className="text-center p-12 bg-white rounded-[40px] shadow-xl border max-w-md">
                    <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 font-medium">You don&apos;t have permission to view Organization.</p>
                </div>
            </div>
        );
    }

    const openAddBranch = () => {
        setEditingBranch(null);
        setBranchForm(emptyBranch(organization.id));
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

    const handleSaveBranch = () => {
        const now = new Date().toISOString();
        if (editingBranch) {
            setBranches(branches.map((b) =>
                b.id === editingBranch.id
                    ? { ...branchForm, updatedAt: now }
                    : b
            ));
        } else {
            const nextId = branches.length > 0 ? Math.max(...branches.map((b) => b.id)) + 1 : 1;
            setBranches([
                ...branches,
                { ...branchForm, id: nextId, organizationId: organization.id, createdAt: now, updatedAt: now },
            ]);
        }
        setIsBranchModalOpen(false);
    };

    const handleDisableBranch = (branch) => {
        setBranches(branches.map((b) =>
            b.id === branch.id
                ? { ...b, status: b.status === BRANCH_STATUS.ACTIVE ? BRANCH_STATUS.DISABLED : BRANCH_STATUS.ACTIVE, updatedAt: new Date().toISOString() }
                : b
        ));
    };

    const branchColumns = [
        { header: "Branch Name", key: "name", render: (v) => <span className="font-bold text-gray-800">{v}</span> },
        { header: "City", key: "address", render: (addr) => addr?.city || "—" },
        { header: "State", key: "address", render: (addr) => addr?.state || "—" },
        { header: "Country", key: "address", render: (addr) => addr?.country || "—" },
        {
            header: "Status",
            key: "status",
            render: (status) => (
                <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        status === BRANCH_STATUS.ACTIVE ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                    }`}
                >
                    {status}
                </span>
            ),
        },
        ...(canEditBranch || canDeleteBranch
            ? [{
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
            }]
            : []),
    ];

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50/30">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                            <Building2 size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight">Organization</h2>
                            <p className="text-gray-500 font-bold">Business details & branches</p>
                        </div>
                    </div>
                </div>

                {/* Organization Details */}
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Building2 size={20} /> Organization Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">Business Name</label>
                            <input
                                className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                value={organization?.businessName ?? ""}
                                onChange={(e) => canEditOrg && setOrganization({ ...organization, businessName: e.target.value })}
                                readOnly={!canEditOrg}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">Owner Name</label>
                            <input
                                className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500"
                                value={organization?.ownerName ?? ""}
                                onChange={(e) => canEditOrg && setOrganization({ ...organization, ownerName: e.target.value })}
                                readOnly={!canEditOrg}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">Owner Email</label>
                            <input
                                type="email"
                                className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500"
                                value={organization?.ownerEmail ?? ""}
                                onChange={(e) => canEditOrg && setOrganization({ ...organization, ownerEmail: e.target.value })}
                                readOnly={!canEditOrg}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">Default Country</label>
                            <select
                                className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500"
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
                            <label className="text-xs font-black text-gray-400 uppercase">Default Currency</label>
                            <select
                                className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500"
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
                            <label className="text-xs font-black text-gray-400 uppercase">Default Tax System</label>
                            <select
                                className="w-full p-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-indigo-500"
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

                {/* Subscription & Upgrade */}
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <CreditCard size={20} /> Subscription & Plans
                    </h3>
                    <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <p className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-1">Current plan</p>
                        <p className="text-lg font-bold text-gray-800">
                            {SUBSCRIPTION_PLANS.find((p) => p.id === (organization?.subscriptionPlanId || "starter"))?.name ?? "Starter"}
                        </p>
                        <p className="text-sm text-gray-500">
                            {SUBSCRIPTION_PLANS.find((p) => p.id === (organization?.subscriptionPlanId || "starter"))?.priceLabel ?? "Free"}
                        </p>
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-4">Upgrade your plan for more branches and features</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {SUBSCRIPTION_PLANS.map((plan) => {
                            const isCurrent = (organization?.subscriptionPlanId || "starter") === plan.id;
                            const currentOrder = SUBSCRIPTION_PLANS.findIndex((p) => p.id === (organization?.subscriptionPlanId || "starter"));
                            const planOrder = SUBSCRIPTION_PLANS.findIndex((p) => p.id === plan.id);
                            const canUpgrade = planOrder > currentOrder;
                            return (
                                <div
                                    key={plan.id}
                                    className={`relative rounded-2xl border-2 p-5 transition-all ${
                                        plan.highlighted
                                            ? "border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100"
                                            : "border-gray-200 bg-gray-50/30 hover:border-gray-300"
                                    } ${isCurrent ? "ring-2 ring-green-400 ring-offset-2" : ""}`}
                                >
                                    {isCurrent && (
                                        <span className="absolute top-3 right-3 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                            <Check size={12} /> Current
                                        </span>
                                    )}
                                    {plan.highlighted && !isCurrent && (
                                        <span className="absolute top-3 right-3 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center gap-1">
                                            <Sparkles size={12} /> Popular
                                        </span>
                                    )}
                                    <div className="mb-3">
                                        <h4 className="text-lg font-black text-gray-800">{plan.name}</h4>
                                        <p className="text-2xl font-black text-indigo-600 mt-1">{plan.priceLabel}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {plan.branchesLimit === -1 ? plan.branchesLabel || "Unlimited" : `Up to ${plan.branchesLimit} branches`}
                                        </p>
                                    </div>
                                    <ul className="space-y-2 mb-5">
                                        {plan.features.map((f, i) => (
                                            <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                                                <Check size={14} className="text-green-500 shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    {isCurrent ? (
                                        <button
                                            disabled
                                            className="w-full py-2.5 rounded-xl font-bold text-gray-500 bg-gray-200 cursor-default"
                                        >
                                            Current plan
                                        </button>
                                    ) : canUpgrade ? (
                                        <button
                                            onClick={() => canEditOrg && setOrganization({ ...organization, subscriptionPlanId: plan.id })}
                                            disabled={!canEditOrg}
                                            className={`w-full py-2.5 rounded-xl font-bold transition-all ${
                                                plan.highlighted
                                                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                                    : "bg-gray-800 text-white hover:bg-gray-700"
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            Upgrade to {plan.name}
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-2.5 rounded-xl font-bold text-gray-400 bg-gray-100 cursor-default"
                                        >
                                            Downgrade
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Branches */}
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <MapPin size={20} /> Branches
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

            {/* Add / Edit Branch Modal */}
            <Modal
                isOpen={isBranchModalOpen}
                onClose={() => setIsBranchModalOpen(false)}
                title={editingBranch ? "Edit Branch" : "Add New Branch"}
                className="max-w-lg"
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase block mb-1">Branch Name</label>
                        <input
                            className="w-full p-3 bg-gray-50 border rounded-xl"
                            value={branchForm.name}
                            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                            placeholder="e.g. Food Plaza - Dubai"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase block mb-1">Address Line 1</label>
                        <input
                            className="w-full p-3 bg-gray-50 border rounded-xl"
                            value={branchForm.address?.line1 ?? ""}
                            onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, line1: e.target.value } })}
                            placeholder="Street / Area"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase block mb-1">City</label>
                            <input
                                className="w-full p-3 bg-gray-50 border rounded-xl"
                                value={branchForm.address?.city ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, city: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase block mb-1">State</label>
                            <input
                                className="w-full p-3 bg-gray-50 border rounded-xl"
                                value={branchForm.address?.state ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, state: e.target.value } })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase block mb-1">Country</label>
                            <input
                                className="w-full p-3 bg-gray-50 border rounded-xl"
                                value={branchForm.address?.country ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, country: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-gray-400 uppercase block mb-1">Pincode</label>
                            <input
                                className="w-full p-3 bg-gray-50 border rounded-xl"
                                value={branchForm.address?.pincode ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, pincode: e.target.value } })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase block mb-1">Currency</label>
                        <select
                            className="w-full p-3 bg-gray-50 border rounded-xl"
                            value={branchForm.currency}
                            onChange={(e) => setBranchForm({ ...branchForm, currency: e.target.value })}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-black text-gray-400 uppercase block mb-1">Tax System</label>
                        <select
                            className="w-full p-3 bg-gray-50 border rounded-xl"
                            value={branchForm.taxConfig?.taxSystem}
                            onChange={(e) => {
                                const newSystem = e.target.value;
                                setBranchForm({
                                    ...branchForm,
                                    taxConfig: {
                                        ...branchForm.taxConfig,
                                        taxSystem: newSystem,
                                        // When switching away from GST, clear GST-specific label; keep isGstRegistered as "is tax registered" for all systems
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
                                        className="rounded accent-indigo-600"
                                    />
                                    <label htmlFor="taxRegistered" className="text-sm font-medium">{registeredLabel}</label>
                                </div>
                                {isRegistered && (
                                    <div>
                                        <label className="text-xs font-black text-gray-400 uppercase block mb-1">{regNumberLabel}</label>
                                        <input
                                            className="w-full p-3 bg-gray-50 border rounded-xl"
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
                            className="rounded accent-indigo-600"
                        />
                        <label htmlFor="mainBranch" className="text-sm font-medium">Main Branch</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsBranchModalOpen(false)}
                            className="px-4 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-100"
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
        </div>
    );
};

export default Organization;
