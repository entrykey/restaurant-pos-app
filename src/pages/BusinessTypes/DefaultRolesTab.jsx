import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Shield, Crown, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { businessTypesService } from '../../services/api/businessTypes';
import CommonSelect from '../../components/ui/CommonSelect';
import CommonDialog from '../../components/modals/CommonDialog';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const emptyForm = () => ({
    name: '',
    code: '',
    description: '',
    scope: 'SHOP',
    assignToOwner: false,
    sortOrder: 0,
    permissions: {},
});

const DefaultRolesTab = () => {
    const { theme } = useTheme();
    const [types, setTypes] = useState([]);
    const [subTypes, setSubTypes] = useState([]);
    const [selectedType, setSelectedType] = useState('');
    const [scopeMode, setScopeMode] = useState('type'); // 'type' | 'subtype'
    const [selectedSubType, setSelectedSubType] = useState('');
    const [roles, setRoles] = useState([]);
    const [mergedPreview, setMergedPreview] = useState([]);
    const [capabilityModules, setCapabilityModules] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [tRes, sRes] = await Promise.all([
                    businessTypesService.getBusinessTypes(),
                    businessTypesService.getBusinessSubTypes(),
                ]);
                setTypes(tRes.data || []);
                setSubTypes(sRes.data || []);
            } catch (err) {
                console.error(err);
            }
        };
        load();
    }, []);

    const availableSubTypes = useMemo(
        () => subTypes.filter((s) => String(s.businessTypeId?._id || s.businessTypeId) === String(selectedType)),
        [subTypes, selectedType],
    );

    useEffect(() => {
        if (availableSubTypes.length > 0 && !availableSubTypes.find((s) => s._id === selectedSubType)) {
            setSelectedSubType(availableSubTypes[0]._id);
        }
    }, [availableSubTypes, selectedSubType]);

    const loadRoles = useCallback(async () => {
        if (!selectedType) return;
        setIsLoading(true);
        try {
            const subTypeParam = scopeMode === 'type' ? 'none' : selectedSubType;
            const [rolesRes, mergedRes, capsRes] = await Promise.all([
                businessTypesService.getDefaultRoles({
                    businessType: selectedType,
                    subType: subTypeParam,
                }),
                scopeMode === 'subtype' && selectedSubType
                    ? businessTypesService.getMergedDefaultRoles(selectedType, selectedSubType)
                    : Promise.resolve({ data: [] }),
                businessTypesService.getDefaultRoleAllowedPermissions({
                    businessType: selectedType,
                    subType: scopeMode === 'type' ? 'none' : selectedSubType,
                }),
            ]);

            const rolesPayload = rolesRes?.data?.data ?? rolesRes?.data ?? [];
            const mergedPayload = mergedRes?.data?.data ?? mergedRes?.data ?? [];
            const capsPayload = capsRes?.data?.data ?? capsRes?.data ?? [];

            setRoles(Array.isArray(rolesPayload) ? rolesPayload : []);
            setMergedPreview(Array.isArray(mergedPayload) ? mergedPayload : []);
            const cap = Array.isArray(capsPayload) ? capsPayload[0] : null;
            setCapabilityModules(cap?.modules || []);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load default roles');
        } finally {
            setIsLoading(false);
        }
    }, [selectedType, scopeMode, selectedSubType]);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    const permissionOptions = useMemo(() => {
        const grouped = {};
        capabilityModules.forEach((modEntry) => {
            const mod = modEntry.module || {};
            const modId = String(mod._id || modEntry.module);
            if (!modId) return;
            grouped[modId] = {
                moduleId: modId,
                moduleName: mod.name || mod.key || 'Module',
                permissions: (modEntry.allowedPermissions || []).map((p) => ({
                    id: String(p._id || p),
                    name: p.name || p.key,
                })),
            };
        });
        return Object.values(grouped);
    }, [capabilityModules]);

    const openCreate = () => {
        setEditingRole(null);
        setForm(emptyForm());
        setEditorOpen(true);
    };

    const openEdit = (role) => {
        const permsMap = (role.permissions || []).reduce((acc, entry) => {
            const moduleId = String(entry.moduleId?._id || entry.moduleId);
            acc[moduleId] = (entry.actions || []).map((a) => String(a._id || a));
            return acc;
        }, {});
        setEditingRole(role);
        setForm({
            name: role.name || '',
            code: role.code || '',
            description: role.description || '',
            scope: role.scope || 'SHOP',
            assignToOwner: !!role.assignToOwner,
            sortOrder: role.sortOrder || 0,
            permissions: permsMap,
        });
        setEditorOpen(true);
    };

    const togglePermission = (moduleId, permissionId) => {
        setForm((prev) => {
            const current = prev.permissions[moduleId] || [];
            const next = current.includes(permissionId)
                ? current.filter((id) => id !== permissionId)
                : [...current, permissionId];
            return { ...prev, permissions: { ...prev.permissions, [moduleId]: next } };
        });
    };

    const buildPermissionsPayload = () => Object.entries(form.permissions)
        .map(([moduleId, actions]) => ({
            moduleId,
            actions: (actions || []).filter(Boolean),
        }))
        .filter((entry) => entry.actions.length > 0);

    const handleSave = async () => {
        if (!form.name.trim() || !form.code.trim()) {
            toast.error('Name and code are required');
            return;
        }
        setIsSaving(true);
        try {
            const payload = {
                businessType: selectedType,
                subType: scopeMode === 'type' ? null : selectedSubType,
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                description: form.description,
                scope: form.scope,
                assignToOwner: form.assignToOwner,
                sortOrder: Number(form.sortOrder) || 0,
                permissions: buildPermissionsPayload(),
            };

            if (editingRole?._id) {
                await businessTypesService.updateDefaultRole(editingRole._id, payload);
                toast.success('Default role updated');
            } else {
                await businessTypesService.createDefaultRole(payload);
                toast.success('Default role created');
            }
            setEditorOpen(false);
            loadRoles();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Save failed');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget?._id) return;
        try {
            await businessTypesService.deleteDefaultRole(deleteTarget._id);
            toast.success('Default role deleted');
            setDeleteTarget(null);
            loadRoles();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Delete failed');
        }
    };

    return (
        <div className="space-y-6">
            <div className={`rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} p-4 md:p-6 space-y-4`}>
                <div>
                    <h2 className={`text-lg font-black ${theme.textHeading}`}>Default Shop Roles</h2>
                    <p className={`text-sm ${theme.textMuted} mt-1`}>
                        Define roles that are copied into every new shop for the selected business type.
                        Shops can edit their own copies under Staff → Roles.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <CommonSelect
                        label="Business Type"
                        value={selectedType}
                        onChange={setSelectedType}
                        options={types.map((t) => ({ value: t._id, label: t.displayString || t.name }))}
                        placeholder="Select type"
                    />
                    <CommonSelect
                        label="Scope"
                        value={scopeMode}
                        onChange={setScopeMode}
                        options={[
                            { value: 'type', label: 'Type-wide (all subtypes)' },
                            { value: 'subtype', label: 'Subtype-specific' },
                        ]}
                    />
                    {scopeMode === 'subtype' && (
                        <CommonSelect
                            label="Sub Type"
                            value={selectedSubType}
                            onChange={setSelectedSubType}
                            options={availableSubTypes.map((s) => ({ value: s._id, label: s.displayString }))}
                            placeholder="Select subtype"
                        />
                    )}
                </div>

                {scopeMode === 'subtype' && mergedPreview.length > 0 && (
                    <div className={`rounded-xl border ${theme.borderLight} p-3 text-sm ${theme.textSecondary}`}>
                        <div className="flex items-center gap-2 font-bold mb-2">
                            <AlertCircle size={16} />
                            Effective roles for new shops (type + subtype merged)
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {mergedPreview.map((r) => (
                                <span key={r._id || r.code} className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
                                    {r.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center">
                <h3 className={`font-black ${theme.textHeading}`}>
                    {scopeMode === 'type' ? 'Type-wide default roles' : 'Subtype-specific roles'}
                </h3>
                <button
                    type="button"
                    onClick={openCreate}
                    disabled={!selectedType || (scopeMode === 'subtype' && !selectedSubType)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black ${theme.buttonBg} ${theme.buttonText} disabled:opacity-50`}
                >
                    <Plus size={16} /> Add Role
                </button>
            </div>

            {isLoading ? (
                <p className={theme.textMuted}>Loading roles...</p>
            ) : roles.length === 0 ? (
                <div className={`rounded-2xl border-2 border-dashed ${theme.borderLight} p-10 text-center ${theme.textMuted}`}>
                    No default roles defined for this scope yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roles.map((role) => (
                        <div key={role._id} className={`rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} p-4`}>
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Shield size={16} className="text-indigo-500" />
                                        <h4 className={`font-black ${theme.textHeading}`}>{role.name}</h4>
                                        {role.assignToOwner && (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                <Crown size={10} /> Owner
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs font-bold mt-1 ${theme.textMuted}`}>{role.code} · {role.scope}</p>
                                    {role.description && <p className={`text-sm mt-2 ${theme.textSecondary}`}>{role.description}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => openEdit(role)} className={`p-2 rounded-lg ${theme.sidebarItemHoverBg}`}>
                                        <Pencil size={16} />
                                    </button>
                                    <button type="button" onClick={() => setDeleteTarget(role)} className="p-2 rounded-lg hover:bg-red-50 text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className={`text-[11px] mt-3 font-bold ${theme.textMuted}`}>
                                {(role.permissions || []).length} module permission group(s)
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={editorOpen}
                onClose={() => !isSaving && setEditorOpen(false)}
                title={editingRole ? 'Edit Default Role' : 'Add Default Role'}
                className="max-w-3xl"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                            className={`w-full px-3 py-2 rounded-xl border ${theme.borderLight} ${theme.inputBg}`}
                            placeholder="Role name"
                            value={form.name}
                            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        />
                        <input
                            className={`w-full px-3 py-2 rounded-xl border ${theme.borderLight} ${theme.inputBg}`}
                            placeholder="CODE"
                            value={form.code}
                            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                        />
                    </div>
                    <textarea
                        className={`w-full px-3 py-2 rounded-xl border ${theme.borderLight} ${theme.inputBg}`}
                        placeholder="Description"
                        rows={2}
                        value={form.description}
                        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <CommonSelect
                            label="Scope"
                            value={form.scope}
                            onChange={(val) => setForm((p) => ({ ...p, scope: val }))}
                            options={[
                                { value: 'SHOP', label: 'Shop-wide' },
                                { value: 'BRANCH', label: 'Branch' },
                            ]}
                        />
                        <input
                            type="number"
                            className={`w-full px-3 py-2 rounded-xl border ${theme.borderLight} ${theme.inputBg}`}
                            placeholder="Sort order"
                            value={form.sortOrder}
                            onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
                        />
                        <label className={`flex items-center gap-2 text-sm font-bold ${theme.textPrimary} mt-6`}>
                            <input
                                type="checkbox"
                                checked={form.assignToOwner}
                                onChange={(e) => setForm((p) => ({ ...p, assignToOwner: e.target.checked }))}
                            />
                            Assign to shop owner on create
                        </label>
                    </div>

                    <div>
                        <p className={`text-sm font-black mb-2 ${theme.textHeading}`}>Permissions</p>
                        {permissionOptions.length === 0 ? (
                            <p className={`text-sm ${theme.textMuted}`}>Configure capabilities for this type/subtype first.</p>
                        ) : (
                            <div className="space-y-3">
                                {permissionOptions.map((mod) => (
                                    <div key={mod.moduleId} className={`rounded-xl border ${theme.borderLight} p-3`}>
                                        <p className={`font-bold text-sm mb-2 ${theme.textPrimary}`}>{mod.moduleName}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {mod.permissions.map((perm) => {
                                                const checked = (form.permissions[mod.moduleId] || []).includes(perm.id);
                                                return (
                                                    <button
                                                        key={perm.id}
                                                        type="button"
                                                        onClick={() => togglePermission(mod.moduleId, perm.id)}
                                                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                                                            checked
                                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                                : `${theme.surfaceBg} ${theme.borderLight} ${theme.textMuted}`
                                                        }`}
                                                    >
                                                        {perm.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => setEditorOpen(false)}
                        disabled={isSaving}
                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest ${theme.sectionBg} ${theme.textSecondary}`}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-indigo-600 disabled:opacity-50`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </Modal>

            <CommonDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete default role?"
                message={`Remove "${deleteTarget?.name}" from templates? Existing shops keep their copies.`}
                type="confirm"
                confirmText="Delete"
                onConfirm={handleDelete}
            />
        </div>
    );
};

export default DefaultRolesTab;
