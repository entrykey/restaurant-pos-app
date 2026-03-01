import React, { useState, useEffect } from "react";
import { ShieldCheck, Loader2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { PERMISSIONS } from "./StaffService";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { useAuth } from "../../context/AuthContext";
import { roleService, shopService, branchService, subscriptionService, employeeService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const Staff = ({
    staffList, // Legacy prop, can be ignored or removed later
    setStaffList,
    rolesList, // Legacy prop
    setRolesList,
    hasPermissionFor,
}) => {
    const { theme } = useTheme();
    const [activeStaffTab, setActiveStaffTab] = useState("staff");

    // Employee State
    const [employees, setEmployees] = useState([]);
    const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);

    // Roles State
    const [roles, setRoles] = useState([]);
    const [isRolesLoading, setIsRolesLoading] = useState(false);

    const { user } = useAuth();
    const [shopId, setShopId] = useState(null);

    // Create Role Dialog State
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [isBranchUser, setIsBranchUser] = useState(false); // For Role Creation
    const [branches, setBranches] = useState([]);
    const [selectedBranches, setSelectedBranches] = useState([]); // For Role Creation
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState({});
    const [expandedModules, setExpandedModules] = useState({});
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Edit Role Dialog State
    const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [editRoleName, setEditRoleName] = useState("");
    const [editIsBranchUser, setEditIsBranchUser] = useState(false);
    const [editSelectedBranches, setEditSelectedBranches] = useState([]);
    const [editSelectedPermissions, setEditSelectedPermissions] = useState({});
    const [editExpandedModules, setEditExpandedModules] = useState({});

    // Create Employee Dialog State
    const [isCreateEmployeeOpen, setIsCreateEmployeeOpen] = useState(false);
    const [newEmpData, setNewEmpData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        roleId: "",
        designation: "",
        address: { line1: "", city: "", state: "", pincode: "" }
    });
    const [userSelectedBranches, setUserSelectedBranches] = useState([]); // For Employee Creation (if role is branch user)
    const [selectedRoleIsBranchUser, setSelectedRoleIsBranchUser] = useState(false);

    useEffect(() => {
        const fetchShopId = async () => {
            if (user) {
                try {
                    const userId = user.id || user._id;
                    const shopData = await shopService.getShopDataByUserId(userId);
                    const id = shopData.shop?._id || shopData.organization?._id || shopData._id;
                    setShopId(id);
                } catch (error) {
                    console.error("Error fetching shop ID:", error);
                }
            }
        };
        fetchShopId();
    }, [user]);

    // Fetch Employees
    useEffect(() => {
        const fetchEmployees = async () => {
            if (activeStaffTab === "staff" && shopId) {
                setIsEmployeesLoading(true);
                try {
                    const data = await employeeService.getEmployeesByShopId(shopId);
                    setEmployees(data);
                } catch (error) {
                    console.error("Failed to fetch employees:", error);
                } finally {
                    setIsEmployeesLoading(false);
                }
            }
        };
        fetchEmployees();
    }, [activeStaffTab, shopId]);

    // Fetch Roles
    useEffect(() => {
        const fetchRoles = async () => {
            if ((activeStaffTab === "roles" || isCreateEmployeeOpen) && shopId) {
                setIsRolesLoading(true);
                try {
                    const fetchedRoles = await roleService.getRolesByShopId(shopId);
                    setRoles(fetchedRoles);
                    if (setRolesList) setRolesList(fetchedRoles);
                } catch (error) {
                    console.error("Failed to fetch roles:", error);
                } finally {
                    setIsRolesLoading(false);
                }
            }
        };
        fetchRoles();
    }, [activeStaffTab, isCreateEmployeeOpen, shopId, setRolesList]);

    // Fetch Branches (Shared for both dialogs)
    useEffect(() => {
        if ((isCreateRoleOpen || isCreateEmployeeOpen) && shopId) {
            const fetchBranches = async () => {
                try {
                    const data = await branchService.getBranchesByShopId(shopId);
                    setBranches(data);
                } catch (error) {
                    console.error("Error fetching branches:", error);
                }
            };
            fetchBranches();
        }
    }, [isCreateRoleOpen, isEditRoleOpen, isCreateEmployeeOpen, shopId]);

    // Fetch Permissions only for Role Dialog
    useEffect(() => {
        if ((isCreateRoleOpen || isEditRoleOpen) && shopId) {
            const fetchPermissions = async () => {
                setIsLoadingData(true);
                try {
                    const permissionsData = await subscriptionService.getShopPermissions(shopId);
                    setAvailablePermissions(permissionsData.allowedModules || []);
                } catch (error) {
                    console.error("Error fetching permissions:", error);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchPermissions();
        }
    }, [isCreateRoleOpen, isEditRoleOpen, shopId]);


    // --- Role Creation Handlers ---
    const handleBranchSelection = (branchId) => {
        setSelectedBranches(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
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

    const handleCreateRole = async () => {
        if (!newRoleName.trim()) { alert("Please enter a role name"); return; }
        if (isBranchUser && selectedBranches.length === 0) { alert("Please select at least one branch for a branch user"); return; }

        const permissionsPayload = Object.entries(selectedPermissions)
            .filter(([_, perms]) => perms.length > 0)
            .map(([module, perms]) => ({ module, permissions: perms }));

        const payload = {
            name: newRoleName,
            shopId,
            isBranchUser,
            allowedBranches: isBranchUser ? selectedBranches : [],
            permissions: permissionsPayload,
            isSystemRole: false
        };

        try {
            await roleService.createRole(payload);
            setIsCreateRoleOpen(false);
            setNewRoleName(""); setIsBranchUser(false); setSelectedBranches([]); setSelectedPermissions({});
            const fetchedRoles = await roleService.getRolesByShopId(shopId);
            setRoles(fetchedRoles);
            alert("Role created successfully!");
        } catch (error) {
            console.error("Error creating role:", error);
            alert("Failed to create role: " + (error.message || "Unknown error"));
        }
    };

    // --- Role Edit Handlers ---
    const openEditRole = (role) => {
        if (!role) return;
        setEditingRole(role);
        setEditRoleName(role.name || "");
        setEditIsBranchUser(Boolean(role.isBranchUser));
        setEditSelectedBranches(Array.isArray(role.allowedBranches) ? role.allowedBranches.map(b => b?._id || b) : []);

        // role.permissions is array of { module, permissions: [...] }
        const permsMap = (role.permissions || []).reduce((acc, entry) => {
            const moduleId = entry?.module?._id || entry?.module;
            if (!moduleId) return acc;
            const permIds = (entry.permissions || []).map(p => p?._id || p).filter(Boolean);
            acc[String(moduleId)] = permIds.map(String);
            return acc;
        }, {});
        setEditSelectedPermissions(permsMap);
        setEditExpandedModules({});
        setIsEditRoleOpen(true);
    };

    const toggleEditModuleExpand = (moduleId) => {
        setEditExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
    };

    const handleEditPermissionToggle = (moduleId, permissionId) => {
        setEditSelectedPermissions(prev => {
            const modulePerms = prev[moduleId] || [];
            if (modulePerms.includes(permissionId)) {
                return { ...prev, [moduleId]: modulePerms.filter(id => id !== permissionId) };
            } else {
                return { ...prev, [moduleId]: [...modulePerms, permissionId] };
            }
        });
    };

    const handleEditSelectAllModulePermissions = (moduleId, allPermissionIds, isChecked) => {
        setEditSelectedPermissions(prev => ({ ...prev, [moduleId]: isChecked ? allPermissionIds : [] }));
    };

    const handleEditBranchSelection = (branchId) => {
        setEditSelectedBranches(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const handleUpdateRole = async () => {
        if (!editingRole) return;
        if (!editRoleName.trim()) { alert("Please enter a role name"); return; }
        if (editIsBranchUser && editSelectedBranches.length === 0) { alert("Please select at least one branch for a branch user"); return; }

        const permissionsPayload = Object.entries(editSelectedPermissions)
            .filter(([_, perms]) => Array.isArray(perms) && perms.length > 0)
            .map(([module, perms]) => ({ module, permissions: perms }));

        const payload = {
            name: editRoleName,
            shopId,
            isBranchUser: editIsBranchUser,
            allowedBranches: editIsBranchUser ? editSelectedBranches : [],
            permissions: permissionsPayload,
        };

        try {
            const roleId = editingRole._id || editingRole.id;
            await roleService.updateRole(roleId, payload);
            setIsEditRoleOpen(false);
            setEditingRole(null);
            // Refresh roles list
            const fetchedRoles = await roleService.getRolesByShopId(shopId);
            setRoles(fetchedRoles);
            if (setRolesList) setRolesList(fetchedRoles);
            alert("Role updated successfully!");
        } catch (error) {
            console.error("Error updating role:", error);
            alert("Failed to update role: " + (error.message || "Unknown error"));
        }
    };


    // --- Employee Creation Handlers ---
    const handleEmpDataChange = (field, value) => {
        setNewEmpData(prev => ({ ...prev, [field]: value }));

        // Check if selected role is branch user
        if (field === 'roleId') {
            const role = roles.find(r => r._id === value || r.id === value);
            setSelectedRoleIsBranchUser(role?.isBranchUser || false);
            if (!role?.isBranchUser) {
                setUserSelectedBranches([]);
            }
        }
    };

    const handleUserBranchSelection = (branchId) => {
        setUserSelectedBranches(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const handleCreateEmployee = async () => {
        if (!newEmpData.name || !newEmpData.email || !newEmpData.phone || !newEmpData.roleId) {
            alert("Please fill in all required fields (Name, Email, Phone, Role)");
            return;
        }
        if (selectedRoleIsBranchUser && userSelectedBranches.length === 0) {
            alert("This role requires selecting at least one branch.");
            return;
        }

        const payload = {
            ...newEmpData,
            shopId,
            allowedBranches: selectedRoleIsBranchUser ? userSelectedBranches : []
        };

        try {
            await employeeService.create(payload);
            setIsCreateEmployeeOpen(false);
            setNewEmpData({ name: "", email: "", phone: "", password: "", roleId: "", designation: "", address: { line1: "", city: "", state: "", pincode: "" } });
            setUserSelectedBranches([]);
            // Refresh employees
            const data = await employeeService.getEmployeesByShopId(shopId);
            setEmployees(data);
            alert("Employee created successfully!");
        } catch (error) {
            console.error("Error creating employee:", error);
            alert("Failed to create employee: " + (error.message || "Unknown error"));
        }
    };


    const staffAccess = ROUTE_ACCESS.STAFF;
    const canView = hasPermissionFor?.(staffAccess.module, staffAccess.resource, staffAccess.action);
    if (!canView) {
        return (
            <div className="p-8 text-center text-gray-500 font-bold">
                You do not have permission to access Staff Management.
            </div>
        );
    }

    return (
        <div className={`p-4 md:p-8 min-h-[calc(100vh-64px)] flex flex-col relative ${theme.pageBg}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
                <h2 className={`text-2xl md:text-4xl font-black flex items-center ${theme.textHeading}`}>
                    <ShieldCheck className={`mr-3 ${theme.primaryIconText}`} /> Staff & Roles
                </h2>
                <div className="flex gap-3">
                    {activeStaffTab === "staff" ? (
                        <button
                            onClick={() => setIsCreateEmployeeOpen(true)}
                            className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg ${theme.buttonHoverBg} transition-all`}
                        >
                            <Plus size={20} /> Add Employee
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsCreateRoleOpen(true)}
                            className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg ${theme.buttonHoverBg} transition-all`}
                        >
                            <Plus size={20} /> Add Role
                        </button>
                    )}
                </div>
            </div>

            <div className={`flex gap-4 mb-8 p-2 rounded-2xl shadow-sm w-fit ${theme.surfaceBg}`}>
                <button
                    onClick={() => setActiveStaffTab("staff")}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeStaffTab === "staff" ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                >
                    <ShieldCheck size={18} /> Staff Members
                </button>
                <button
                    onClick={() => setActiveStaffTab("roles")}
                    className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeStaffTab === "roles" ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                >
                    <ShieldCheck size={18} /> Roles
                </button>
            </div>

            {activeStaffTab === "staff" ? (
                <>

                    {isEmployeesLoading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : (
                        <CommonTable
                            columns={[
                                { header: "Emp Code", key: "employeeCode", className: `font-mono text-xs ${theme.textSecondary}` },
                                {
                                    header: "Name",
                                    key: "userId.name",
                                    className: `font-bold ${theme.textPrimary}`,
                                    render: (_, item) => item.userId?.name || "N/A"
                                },
                                { header: "Designation", key: "designation", className: theme.textSecondary },
                                {
                                    header: "Role",
                                    key: "roleId.name",
                                    render: (val, item) => (
                                        <span className={`${theme.buttonBg} ${theme.buttonText} px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                                            {item.roleId?.name || val}
                                        </span>
                                    )
                                },
                                {
                                    header: "Phone",
                                    key: "userId.phone",
                                    className: theme.textSecondary,
                                    render: (_, item) => item.userId?.phone || "N/A"
                                },
                                {
                                    header: "Email",
                                    key: "userId.email",
                                    className: `${theme.textSecondary} text-sm`,
                                    render: (_, item) => item.userId?.email || "N/A"
                                },
                                {
                                    header: "Status",
                                    key: "status",
                                    render: (value) => (
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${value === 'ACTIVE' ? "text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400" : "text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400"}`}>
                                            {value}
                                        </span>
                                    ),
                                },
                            ]}
                            data={employees}
                        />
                    )}
                </>
            ) : (
                <>

                    {isRolesLoading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : (
                        <CommonTable
                            columns={[
                                { header: "Role Name", key: "name", className: `font-bold ${theme.textPrimary}` },
                                {
                                    header: "Type",
                                    key: "isSystemRole",
                                    render: (isSystem) => (
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${isSystem ? "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"}`}>
                                            {isSystem ? "SYSTEM" : "CUSTOM"}
                                        </span>
                                    )
                                },
                                {
                                    header: "Permissions",
                                    key: "permissions",
                                    render: (perms) => (
                                        <span className={`${theme.textSecondary} font-medium`}>
                                            {perms?.length || 0} Access Points
                                        </span>
                                    )
                                },
                                {
                                    header: "Action",
                                    key: "id",
                                    className: "text-right",
                                    render: (_, role) => (
                                        <button
                                            type="button"
                                            className={`font-bold text-sm hover:underline ${role?.isSystemRole ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : theme.primaryIconText.replace('text-', 'text-')}`}
                                            onClick={() => {
                                                if (role?.isSystemRole) return;
                                                openEditRole(role);
                                            }}
                                            disabled={role?.isSystemRole}
                                            title={role?.isSystemRole ? "System roles cannot be edited" : "Edit role"}
                                        >
                                            Edit
                                        </button>
                                    )
                                }
                            ]}
                            data={roles}
                        />
                    )}
                </>
            )}

            {/* Edit Role Modal */}
            {isEditRoleOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Edit Role</h3>
                            <button onClick={() => { setIsEditRoleOpen(false); setEditingRole(null); }} className={`${theme.textSecondary} hover:text-red-500`}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {isLoadingData ? (
                                <div className="flex justify-center p-10"><Loader2 className={`animate-spin ${theme.primaryIconText}`} size={32} /></div>
                            ) : (
                                <>
                                    <div>
                                        <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role Name</label>
                                        <input
                                            value={editRoleName}
                                            onChange={(e) => setEditRoleName(e.target.value)}
                                            className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                            placeholder="e.g. Senior Shift Manager"
                                        />
                                    </div>
                                    <div className={`flex items-start gap-3 ${theme.inputBg} p-3 rounded-xl border ${theme.inputBorder}`}>
                                        <input
                                            type="checkbox"
                                            id="editBranchUser"
                                            checked={editIsBranchUser}
                                            onChange={(e) => setEditIsBranchUser(e.target.checked)}
                                            className={`w-5 h-5 mt-0.5 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                        />
                                        <div>
                                            <label htmlFor="editBranchUser" className={`block text-sm font-bold ${theme.textPrimary} cursor-pointer`}>Restrict to Specific Branches</label>
                                            <p className={`text-xs ${theme.textSecondary} mt-1`}>If checked, this role will only be available in selected branches. Uncheck to make it available in all branches.</p>
                                        </div>
                                    </div>
                                    {editIsBranchUser && (
                                        <div className="space-y-2 animate-fadeIn">
                                            <label className="block text-sm font-bold text-gray-700">Select Allowed Branches</label>
                                            <div className="border rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                                                {branches.length > 0 ? branches.map(branch => (
                                                    <div key={branch._id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={editSelectedBranches.includes(branch._id)}
                                                            onChange={() => handleEditBranchSelection(branch._id)}
                                                            className="w-4 h-4 text-indigo-600 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">{branch.name}</span>
                                                    </div>
                                                )) : <p className="text-sm text-gray-500">No branches found.</p>}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Assign Permissions</label>
                                        <div className="border rounded-xl divide-y">
                                            {availablePermissions.map(moduleData => {
                                                const moduleId = String(moduleData.moduleId);
                                                const isExpanded = editExpandedModules[moduleId];
                                                const modulePermIds = moduleData.permissions.map(p => String(p.permissionId));
                                                const selectedModulePerms = editSelectedPermissions[moduleId] || [];
                                                const isAllSelected = modulePermIds.length > 0 && modulePermIds.every(id => selectedModulePerms.includes(id));

                                                return (
                                                    <div key={moduleId} className="bg-white">
                                                        <div className="p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 cursor-pointer select-none">
                                                            <div className="flex items-center gap-3">
                                                                <button type="button" onClick={() => toggleEditModuleExpand(moduleId)}>
                                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                </button>
                                                                <span className="font-bold text-gray-700 capitalize">{moduleData.moduleName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllSelected}
                                                                    onChange={(e) => handleEditSelectAllModulePermissions(moduleId, modulePermIds, e.target.checked)}
                                                                    className="w-4 h-4 text-indigo-600 rounded"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <span className="text-xs text-gray-500">Select All</span>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="p-3 pl-10 space-y-2 border-t">
                                                                {moduleData.permissions.map(perm => (
                                                                    <div key={perm.permissionId} className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(editSelectedPermissions[moduleId] || []).includes(String(perm.permissionId))}
                                                                            onChange={() => handleEditPermissionToggle(moduleId, String(perm.permissionId))}
                                                                            className="w-4 h-4 text-indigo-600 rounded"
                                                                        />
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-800">{perm.permissionName}</p>
                                                                            <p className="text-xs text-gray-500">{perm.description}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={`p-4 border-t ${theme.borderLight} flex justify-end gap-3 ${theme.inputBg}`}>
                            <button onClick={() => { setIsEditRoleOpen(false); setEditingRole(null); }} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary} hover:${theme.textPrimary} hover:${theme.inputBorder.replace('border-', 'bg-')}`}>Cancel</button>
                            <button onClick={handleUpdateRole} disabled={isLoadingData} className={`px-6 py-2 rounded-lg font-bold ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow disabled:opacity-50`}>{isLoadingData ? "Loading..." : "Update Role"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Role Modal */}
            {isCreateRoleOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Create New Role</h3>
                            <button onClick={() => setIsCreateRoleOpen(false)} className={`${theme.textSecondary} hover:text-red-500`}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {isLoadingData ? (
                                <div className="flex justify-center p-10"><Loader2 className={`animate-spin ${theme.primaryIconText}`} size={32} /></div>
                            ) : (
                                <>
                                    <div>
                                        <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role Name</label>
                                        <input
                                            value={newRoleName}
                                            onChange={(e) => setNewRoleName(e.target.value)}
                                            className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                            placeholder="e.g. Senior Shift Manager"
                                        />
                                    </div>
                                    <div className={`flex items-start gap-3 ${theme.inputBg} p-3 rounded-xl border ${theme.inputBorder}`}>
                                        <input
                                            type="checkbox"
                                            id="branchUser"
                                            checked={isBranchUser}
                                            onChange={(e) => setIsBranchUser(e.target.checked)}
                                            className={`w-5 h-5 mt-0.5 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                        />
                                        <div>
                                            <label htmlFor="branchUser" className={`block text-sm font-bold ${theme.textPrimary} cursor-pointer`}>Restrict to Specific Branches</label>
                                            <p className={`text-xs ${theme.textSecondary} mt-1`}>If checked, this role will only be available in selected branches. Uncheck to make it available in all branches.</p>
                                        </div>
                                    </div>
                                    {isBranchUser && (
                                        <div className="space-y-2 animate-fadeIn">
                                            <label className="block text-sm font-bold text-gray-700">Select Allowed Branches</label>
                                            <div className="border rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                                                {branches.length > 0 ? branches.map(branch => (
                                                    <div key={branch._id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBranches.includes(branch._id)}
                                                            onChange={() => handleBranchSelection(branch._id)}
                                                            className="w-4 h-4 text-indigo-600 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">{branch.name}</span>
                                                    </div>
                                                )) : <p className="text-sm text-gray-500">No branches found.</p>}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Assign Permissions</label>
                                        <div className="border rounded-xl divide-y">
                                            {availablePermissions.map(moduleData => {
                                                const moduleId = moduleData.moduleId;
                                                const isExpanded = expandedModules[moduleId];
                                                const modulePermIds = moduleData.permissions.map(p => p.permissionId);
                                                const selectedModulePerms = selectedPermissions[moduleId] || [];
                                                const isAllSelected = modulePermIds.length > 0 && modulePermIds.every(id => selectedModulePerms.includes(id));

                                                return (
                                                    <div key={moduleId} className="bg-white">
                                                        <div className="p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 cursor-pointer select-none">
                                                            <div className="flex items-center gap-3">
                                                                <button onClick={() => toggleModuleExpand(moduleId)}>
                                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                </button>
                                                                <span className="font-bold text-gray-700 capitalize">{moduleData.moduleName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllSelected}
                                                                    onChange={(e) => handleSelectAllModulePermissions(moduleId, modulePermIds, e.target.checked)}
                                                                    className="w-4 h-4 text-indigo-600 rounded"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <span className="text-xs text-gray-500">Select All</span>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="p-3 pl-10 space-y-2 border-t">
                                                                {moduleData.permissions.map(perm => (
                                                                    <div key={perm.permissionId} className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(selectedPermissions[moduleId] || []).includes(perm.permissionId)}
                                                                            onChange={() => handlePermissionToggle(moduleId, perm.permissionId)}
                                                                            className="w-4 h-4 text-indigo-600 rounded"
                                                                        />
                                                                        <div>
                                                                            <p className="text-sm font-medium text-gray-800">{perm.permissionName}</p>
                                                                            <p className="text-xs text-gray-500">{perm.description}</p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className={`p-4 border-t ${theme.borderLight} flex justify-end gap-3 ${theme.inputBg}`}>
                            <button onClick={() => setIsCreateRoleOpen(false)} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary} hover:${theme.textPrimary} hover:${theme.inputBorder.replace('border-', 'bg-')}`}>Cancel</button>
                            <button onClick={handleCreateRole} disabled={isLoadingData} className={`px-6 py-2 rounded-lg font-bold ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow disabled:opacity-50`}>{isLoadingData ? "Loading..." : "Create Role"}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Employee Modal */}
            {isCreateEmployeeOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Add New Employee</h3>
                            <button onClick={() => setIsCreateEmployeeOpen(false)} className={`${theme.textSecondary} hover:text-red-500`}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Full Name *</label>
                                    <input
                                        value={newEmpData.name}
                                        onChange={(e) => handleEmpDataChange("name", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Mobile Number *</label>
                                    <input
                                        value={newEmpData.phone}
                                        onChange={(e) => handleEmpDataChange("phone", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="9876543210"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Email Address *</label>
                                    <input
                                        value={newEmpData.email}
                                        onChange={(e) => handleEmpDataChange("email", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Designation</label>
                                    <input
                                        value={newEmpData.designation}
                                        onChange={(e) => handleEmpDataChange("designation", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="e.g. Cashier"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role *</label>
                                    <select
                                        value={newEmpData.roleId}
                                        onChange={(e) => handleEmpDataChange("roleId", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        <option value="">Select Role</option>
                                        {roles.map(r => (
                                            <option key={r._id || r.id} value={r._id || r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Password</label>
                                    <input
                                        type="password"
                                        value={newEmpData.password}
                                        onChange={(e) => handleEmpDataChange("password", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="Default: 123456"
                                    />
                                </div>
                            </div>

                            {selectedRoleIsBranchUser && (
                                <div className={`space-y-2 animate-fadeIn ${theme.warningBg} p-4 rounded-xl border ${theme.warningBorder}`}>
                                    <label className={`block text-sm font-bold ${theme.textPrimary}`}>Select Allowed Branches (Required)</label>
                                    <p className={`text-xs ${theme.warningText} mb-2`}>This role is restricted to specific branches. Please select which branches this employee can access.</p>
                                    <div className={`border ${theme.inputBorder} rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 ${theme.surfaceBg}`}>
                                        {branches.length > 0 ? branches.map(branch => (
                                            <div key={branch._id} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={userSelectedBranches.includes(branch._id)}
                                                    onChange={() => handleUserBranchSelection(branch._id)}
                                                    className={`w-4 h-4 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                />
                                                <span className={`text-sm ${theme.textPrimary}`}>{branch.name}</span>
                                            </div>
                                        )) : <p className={`text-sm ${theme.textSecondary}`}>No branches found.</p>}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Address</label>
                                <input
                                    value={newEmpData.address.line1}
                                    onChange={(e) => setNewEmpData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                                    className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    placeholder="Address Line 1"
                                />
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <input
                                        value={newEmpData.address.city}
                                        onChange={(e) => setNewEmpData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="City"
                                    />
                                    <input
                                        value={newEmpData.address.state}
                                        onChange={(e) => setNewEmpData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="State"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 border-t ${theme.borderLight} flex justify-end gap-3 ${theme.inputBg}`}>
                            <button onClick={() => setIsCreateEmployeeOpen(false)} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary} hover:${theme.textPrimary} hover:${theme.inputBorder.replace('border-', 'bg-')}`}>Cancel</button>
                            <button onClick={handleCreateEmployee} className={`px-6 py-2 rounded-lg font-bold ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow`}>Create Employee</button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Staff;
