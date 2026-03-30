import React, { useState, useEffect } from "react";
import { X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import api, { roleService, subscriptionService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const RolePermissionEditor = ({ isOpen, onClose, roleId }) => {
    const { theme } = useTheme();
    const [role, setRole] = useState(null);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState({});
    const [expandedModules, setExpandedModules] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && roleId) {
            setAvailablePermissions([]);
            setSelectedPermissions({});
            setExpandedModules({});
            fetchData();
        }
    }, [isOpen, roleId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch Role
            const fetchedRole = await roleService.getRoleById(roleId);
            setRole(fetchedRole);

            // Set initial selected permissions
            const permsMap = (fetchedRole.permissions || []).reduce((acc, entry) => {
                const moduleId = entry?.moduleId?._id || entry?.moduleId;
                if (!moduleId) return acc;
                const actionIds = (entry.actions || []).map(p => p?._id || p).filter(Boolean);
                acc[String(moduleId)] = actionIds.map(String);
                return acc;
            }, {});
            setSelectedPermissions(permsMap);

            // We need a complete list of modules and permissions in the system.
            // Using the centralized api instance ensures we hit the correct backend port (8000).
            let allPerms = [];
            try {
                const response = await api.get('/permissions');
                allPerms = response.data || response; // Handle different axios response wrapper cases
            } catch (err) {
                console.warn("Could not fetch global permissions using /permissions endpoint. Checking /v1/permissions or failing gracefully.", err);
                try {
                    const fallbackResponse = await api.get('/v1/permissions');
                    allPerms = fallbackResponse.data || fallbackResponse;
                } catch (fallbackErr) {
                    console.error("Fallback permissions fetch also failed.", fallbackErr);
                }
            }

            if (allPerms.length > 0) {
                // Group flat permissions array by module
                const grouped = allPerms.reduce((acc, perm) => {
                    const modId = perm.module?._id || perm.module;
                    const modName = perm.module?.name || 'Unknown Module';

                    if (!acc[modId]) {
                        acc[modId] = {
                            moduleId: modId,
                            moduleName: modName,
                            permissions: []
                        };
                    }

                    acc[modId].permissions.push({
                        permissionId: perm._id,
                        permissionName: perm.name,
                        description: perm.description || perm.key
                    });

                    return acc;
                }, {});

                setAvailablePermissions(Object.values(grouped));
            }
        } catch (error) {
            console.error("Failed to load role or permissions:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleModuleExpand = (moduleId) => {
        setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    const handlePermissionToggle = (moduleId, permissionId) => {
        setSelectedPermissions(prev => {
            const modulePerms = prev[moduleId] || [];
            if (modulePerms.includes(permissionId)) {
                return { ...prev, [moduleId]: modulePerms.filter(id => id !== permissionId) };
            } else {
                return { ...prev, [moduleId]: [...modulePerms, permissionId] };
            }
        });
    };

    const handleSelectAllModulePermissions = (moduleId, allPermissionIds, isChecked) => {
        setSelectedPermissions(prev => ({ ...prev, [moduleId]: isChecked ? allPermissionIds : [] }));
    };

    const handleSave = async () => {
        if (!role) return;
        setIsSaving(true);

        try {
            const permissionsPayload = Object.entries(selectedPermissions)
                .filter(([_, perms]) => Array.isArray(perms) && perms.length > 0)
                .map(([module, perms]) => ({ moduleId: module, actions: perms }));

            const payload = { permissions: permissionsPayload };
            await roleService.updateRole(role._id, payload);
            alert("System Role permissions updated successfully.");
            onClose();
        } catch (error) {
            console.error("Error saving role permissions:", error);
            alert("Failed to update role permissions.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                    <h3 className={`text-xl font-bold ${theme.textHeading}`}>Configure Role: {role?.name}</h3>
                    <button onClick={onClose} className={`${theme.textSecondary} hover:text-red-500`}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {isLoading ? (
                        <div className="flex justify-center p-10"><Loader2 className={`animate-spin ${theme.primaryIconText}`} size={32} /></div>
                    ) : (
                        <div>
                            <label className={`block text-sm font-bold ${theme.textPrimary} mb-2`}>Assign Permissions</label>

                            {availablePermissions.length === 0 ? (
                                <p className={`text-sm ${theme.textMuted} italic border border-dashed rounded-xl p-6 text-center`}>No configurable modules found. Ensure backend serves global permissions.</p>
                            ) : (
                                <div className={`border-2 ${theme.borderLight} rounded-2xl overflow-hidden divide-y ${theme.borderLight}`}>
                                    {availablePermissions.map(moduleData => {
                                        const moduleId = String(moduleData.moduleId);
                                        const isExpanded = expandedModules[moduleId];
                                        const modulePermIds = moduleData.permissions.map(p => String(p.permissionId));
                                        const selectedModulePerms = selectedPermissions[moduleId] || [];
                                        const isAllSelected = modulePermIds.length > 0 && modulePermIds.every(id => selectedModulePerms.includes(id));

                                        return (
                                            <div key={moduleId} className={`${theme.surfaceBg}`}>
                                                <div
                                                    className={`p-4 flex items-center justify-between transition-colors ${theme.sectionBg} hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer select-none`}
                                                    onClick={() => toggleModuleExpand(moduleId)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isExpanded ? 'bg-indigo-600 text-white' : `${theme.primaryIconBg} ${theme.primaryIconText}`}`}>
                                                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                        </div>
                                                        <span className={`font-black text-sm uppercase tracking-tight ${theme.textHeading}`}>{moduleData.moduleName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllSelected}
                                                                onChange={(e) => handleSelectAllModulePermissions(moduleId, modulePermIds, e.target.checked)}
                                                                className={`w-4 h-4 text-indigo-600 border ${theme.borderLight} rounded focus:ring-indigo-500 cursor-pointer`}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Select All</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {isExpanded && (
                                                    <div className={`p-4 pl-12 space-y-3 ${theme.surfaceBg} border-t ${theme.borderLight}`}>
                                                        {moduleData.permissions.map(perm => {
                                                            const isChecked = (selectedPermissions[moduleId] || []).includes(String(perm.permissionId));
                                                            return (
                                                                <div
                                                                    key={perm.permissionId}
                                                                    className={`group flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${isChecked
                                                                        ? 'border-indigo-500/50 bg-indigo-50/30 dark:bg-indigo-900/10'
                                                                        : `border-transparent hover:${theme.sectionBg}`
                                                                        }`}
                                                                    onClick={() => handlePermissionToggle(moduleId, String(perm.permissionId))}
                                                                >
                                                                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked
                                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                        : `border-gray-200 ${theme.surfaceBg}`
                                                                        }`}>
                                                                        {isChecked && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className={`text-sm font-bold leading-tight ${isChecked ? 'text-indigo-700 dark:text-indigo-400' : theme.textPrimary}`}>
                                                                            {(() => {
                                                                                let name = perm.permissionName || "";
                                                                                const modName = moduleData.moduleName?.toLowerCase();
                                                                                // Remove module name if it's the first word
                                                                                if (modName && name.toLowerCase().startsWith(modName)) {
                                                                                    name = name.substring(modName.length);
                                                                                }
                                                                                // Remove leading dots/underscores
                                                                                name = name.replace(/^[._]+/, "");
                                                                                // Replace dots/underscores with spaces
                                                                                name = name.replace(/[._]/g, " ").trim();
                                                                                // Capitalize
                                                                                return name.charAt(0).toUpperCase() + name.slice(1);
                                                                            })()}
                                                                        </p>
                                                                        <p className={`text-xs ${theme.textMuted}`}>{perm.description}</p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={`p-4 border-t ${theme.borderLight} flex justify-end gap-3 ${theme.inputBg}`}>
                    <button onClick={onClose} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary} hover:${theme.textPrimary} hover:${theme.inputBorder.replace('border-', 'bg-')}`}>Cancel</button>
                    <button onClick={handleSave} disabled={isSaving || isLoading} className={`px-6 py-2 rounded-lg font-bold ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow disabled:opacity-50`}>{isSaving ? "Saving..." : "Save Config"}</button>
                </div>
            </div>
        </div>
    );
};

export default RolePermissionEditor;
