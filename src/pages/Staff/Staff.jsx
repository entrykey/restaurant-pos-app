import React, { useState, useEffect } from "react";
import { ShieldCheck, Loader2, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { PERMISSIONS } from "./StaffService";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { useAuth } from "../../context/AuthContext";
import { roleService, shopService, branchService, subscriptionService, employeeService, attendanceService } from "../../services/api";
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

    // Attendance State (inside Staff page)
    const [attendancePolicies, setAttendancePolicies] = useState([]);
    const [attendanceAssignments, setAttendanceAssignments] = useState([]);
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
    const [attendanceError, setAttendanceError] = useState("");

    const [attendanceBranchId, setAttendanceBranchId] = useState("");
    const [attendanceEmployeeId, setAttendanceEmployeeId] = useState("");
    const [attendanceStartDate, setAttendanceStartDate] = useState("");
    const [attendanceEndDate, setAttendanceEndDate] = useState("");

    const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
    const [policyForm, setPolicyForm] = useState({
        branchId: "",
        name: "",
        description: "",
        status: "ACTIVE",
        isDefault: false,
        policyType: "SHIFT",
        rules: {
            shiftStartLocal: "09:00",
            shiftEndLocal: "18:00",
            graceMinutes: 10,
            halfDayMinutes: 240,
            fullDayMinutes: 480,
            weeklyOffDays: [0],
            overtimeAfterMinutes: 480,
            overtimeRequiresApproval: false
        }
    });
    const [rulesJsonText, setRulesJsonText] = useState("");

    const [isAssignPolicyOpen, setIsAssignPolicyOpen] = useState(false);
    const [assignForm, setAssignForm] = useState({
        employeeId: "",
        policyId: "",
        branchId: "",
        effectiveFrom: new Date().toISOString().split("T")[0],
        priority: 0
    });

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

    // Safely check if the user has STAFF.VIEW.ALL
    // Depending on how permissions are structured in the user object (array vs object)
    const hasViewAllStaff = user?.isSuperAdmin || (Array.isArray(user?.permissions)
        ? user.permissions.includes("STAFF.VIEW.ALL")
        : Object.values(user?.permissions || {}).flat().includes("STAFF.VIEW.ALL"));

    const [ownerShops, setOwnerShops] = useState([]);
    const [formShopId, setFormShopId] = useState(null);
    const [filterShopId, setFilterShopId] = useState(""); // Default to empty string for "All Shops"

    useEffect(() => {
        if (hasViewAllStaff && user) {
            const fetchShops = async () => {
                try {
                    const shops = await shopService.getShopsByOwner(user.id || user._id);
                    setOwnerShops(shops);
                } catch (error) {
                    console.error("Error fetching owner shops:", error);
                }
            };
            fetchShops();
        }
    }, [hasViewAllStaff, user]);

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

    // Edit Employee Dialog State
    const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editEmpData, setEditEmpData] = useState({
        name: "",
        email: "",
        phone: "",
        roleId: "",
        designation: "",
        address: { line1: "", city: "", state: "", pincode: "" },
        status: "ACTIVE"
    });
    const [editUserSelectedBranches, setEditUserSelectedBranches] = useState([]);
    const [editRoleIsBranchUser, setEditRoleIsBranchUser] = useState(false);

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
            const needsEmployees =
                activeStaffTab === "staff" ||
                activeStaffTab === "attendance_policies" ||
                activeStaffTab === "attendance_logs";

            if (needsEmployees && shopId) {
                setIsEmployeesLoading(true);
                try {
                    const userId = user?.id || user?._id;
                    const data = await employeeService.getEmployeesByShopId(shopId, hasViewAllStaff, userId, filterShopId);
                    setEmployees(data);
                } catch (error) {
                    console.error("Failed to fetch employees:", error);
                } finally {
                    setIsEmployeesLoading(false);
                }
            }
        };
        fetchEmployees();
    }, [activeStaffTab, shopId, hasViewAllStaff, isCreateEmployeeOpen, filterShopId]);

    // Fetch Roles
    useEffect(() => {
        const fetchRoles = async () => {
            if (activeStaffTab === "roles" && !isCreateEmployeeOpen && shopId) {
                setIsRolesLoading(true);
                try {
                    const userId = user?.id || user?._id;
                    const fetchedRoles = await roleService.getRolesByShopId(shopId, hasViewAllStaff, userId, filterShopId);
                    setRoles(fetchedRoles);
                    if (setRolesList) setRolesList(fetchedRoles);
                } catch (error) {
                    console.error("Failed to fetch roles:", error);
                } finally {
                    setIsRolesLoading(false);
                }
            } else if (isCreateEmployeeOpen && (formShopId || shopId)) {
                setIsRolesLoading(true);
                try {
                    const targetShop = formShopId || shopId;
                    const fetchedRoles = await roleService.getRolesByShopId(targetShop, false);
                    setRoles(fetchedRoles);
                } catch (error) {
                    console.error("Failed to fetch roles:", error);
                } finally {
                    setIsRolesLoading(false);
                }
            }
        };
        fetchRoles();
    }, [activeStaffTab, isCreateEmployeeOpen, shopId, formShopId, setRolesList, hasViewAllStaff, filterShopId]);

    // Fetch Branches (Shared for both dialogs)
    useEffect(() => {
        const targetShop = formShopId || shopId;
        if ((isCreateRoleOpen || isEditRoleOpen || isCreateEmployeeOpen || isCreatePolicyOpen || isAssignPolicyOpen || activeStaffTab === "attendance_logs" || activeStaffTab === "attendance_policies") && targetShop) {
            const fetchBranches = async () => {
                try {
                    const data = await branchService.getBranchesByShopId(targetShop);
                    setBranches(data);
                } catch (error) {
                    console.error("Error fetching branches:", error);
                }
            };
            fetchBranches();
        }
    }, [isCreateRoleOpen, isEditRoleOpen, isCreateEmployeeOpen, isCreatePolicyOpen, isAssignPolicyOpen, activeStaffTab, formShopId, shopId]);

    const refreshAttendanceData = async () => {
        if (!shopId) return;
        setIsAttendanceLoading(true);
        setAttendanceError("");
        try {
            const [policies, assignments] = await Promise.all([
                attendanceService.getPolicies({ branchId: attendanceBranchId || undefined }),
                attendanceService.getAssignments({
                    employeeId: attendanceEmployeeId || undefined,
                    branchId: attendanceBranchId || undefined
                })
            ]);
            setAttendancePolicies(policies || []);
            setAttendanceAssignments(assignments || []);
        } catch (err) {
            console.error("Failed to refresh attendance data:", err);
            setAttendanceError(err?.message || "Failed to load attendance data");
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    const refreshAttendanceLogs = async () => {
        setIsAttendanceLoading(true);
        setAttendanceError("");
        try {
            const logs = await attendanceService.getLogs({
                branchId: attendanceBranchId || undefined,
                employeeId: attendanceEmployeeId || undefined,
                startDate: attendanceStartDate || undefined,
                endDate: attendanceEndDate || undefined
            });
            setAttendanceLogs(logs || []);
        } catch (err) {
            console.error("Failed to fetch attendance logs:", err);
            setAttendanceError(err?.message || "Failed to load attendance logs");
        } finally {
            setIsAttendanceLoading(false);
        }
    };

    useEffect(() => {
        if (activeStaffTab === "attendance_policies") {
            refreshAttendanceData();
        }
        if (activeStaffTab === "attendance_logs") {
            refreshAttendanceLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStaffTab, shopId]);

    useEffect(() => {
        if (!isCreatePolicyOpen) return;
        setRulesJsonText(JSON.stringify(policyForm.rules || {}, null, 2));
    }, [isCreatePolicyOpen]);

    // Fetch Permissions only for Role Dialog
    useEffect(() => {
        const targetShop = formShopId || shopId;
        if ((isCreateRoleOpen || isEditRoleOpen) && targetShop) {
            const fetchPermissions = async () => {
                setIsLoadingData(true);
                // Clear existing permissions to avoid showing stale data from another shop
                setAvailablePermissions([]);

                try {
                    const permissionsData = await subscriptionService.getShopPermissions(targetShop);
                    setAvailablePermissions(permissionsData.allowedModules || []);
                } catch (error) {
                    console.error("Error fetching permissions:", error);
                    setAvailablePermissions([]);
                } finally {
                    setIsLoadingData(false);
                }
            };
            fetchPermissions();
        } else {
            // Clear if modals are closed
            if (!isCreateRoleOpen && !isEditRoleOpen) {
                setAvailablePermissions([]);
                setExpandedModules({});
                // Don't clear selectedPermissions here if they are needed for something else, 
                // but usually they should be reset when closing.
            }
        }
    }, [isCreateRoleOpen, isEditRoleOpen, formShopId, shopId]);


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

        // Filter selected permissions against available permissions to ensure only allowed ones are sent
        const allowedModuleIds = new Set(availablePermissions.map(am => String(am.moduleId)));

        const permissionsPayload = Object.entries(selectedPermissions)
            .filter(([module, perms]) => allowedModuleIds.has(String(module)) && perms.length > 0)
            .map(([module, perms]) => {
                // Also filter permissions within the module
                const allowedPermIds = new Set(availablePermissions.find(am => String(am.moduleId) === String(module))?.permissions.map(p => String(p.permissionId)) || []);
                return {
                    module,
                    permissions: perms.filter(p => allowedPermIds.has(String(p)))
                };
            })
            .filter(entry => entry.permissions.length > 0);

        const targetShop = formShopId || shopId;
        const payload = {
            name: newRoleName,
            shopId: targetShop,
            isBranchUser,
            allowedBranches: isBranchUser ? selectedBranches : [],
            permissions: permissionsPayload,
            isSystemRole: false
        };

        try {
            await roleService.createRole(payload);
            setIsCreateRoleOpen(false);
            setNewRoleName(""); setIsBranchUser(false); setSelectedBranches([]); setSelectedPermissions({});
            const userId = user?.id || user?._id;
            const fetchedRoles = await roleService.getRolesByShopId(shopId, hasViewAllStaff, userId);
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
        setAvailablePermissions([]); // Clear before fetching new ones
        setFormShopId(role.shopId?._id || role.shopId || shopId);
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

        // Filter selected permissions against available permissions to ensure only allowed ones are sent
        const allowedModuleIds = new Set(availablePermissions.map(am => String(am.moduleId)));

        const permissionsPayload = Object.entries(editSelectedPermissions)
            .filter(([module, perms]) => allowedModuleIds.has(String(module)) && Array.isArray(perms) && perms.length > 0)
            .map(([module, perms]) => {
                // Also filter permissions within the module
                const allowedPermIds = new Set(availablePermissions.find(am => String(am.moduleId) === String(module))?.permissions.map(p => String(p.permissionId)) || []);
                return {
                    module,
                    permissions: perms.filter(p => allowedPermIds.has(String(p)))
                };
            })
            .filter(entry => entry.permissions.length > 0);

        const payload = {
            name: editRoleName,
            shopId: editingRole.shopId?._id || editingRole.shopId,
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
            const userId = user?.id || user?._id;
            const fetchedRoles = await roleService.getRolesByShopId(shopId, hasViewAllStaff, userId);
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

        if (field === 'roleId') {
            const role = roles.find(r => r._id === value || r.id === value);
            const isBranchRole = !!role?.isBranchUser;
            setSelectedRoleIsBranchUser(isBranchRole);

            if (!isBranchRole) {
                setUserSelectedBranches([]);
                return;
            }

            // If role is branch user, preselect branches based on role.allowedBranches:
            const roleAllowed = (role?.allowedBranches || []).map(b => b?._id || b);
            if (roleAllowed.length === 1) {
                setUserSelectedBranches([roleAllowed[0]]);
            } else if (roleAllowed.length > 1) {
                // default: no branches pre-selected; user must pick subset
                setUserSelectedBranches([]);
            } else {
                // role has no restriction; user must choose from all shop branches
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

        const targetShop = formShopId || shopId;
        const payload = {
            ...newEmpData,
            shopId: targetShop,
            allowedBranches: selectedRoleIsBranchUser ? userSelectedBranches : []
        };

        try {
            await employeeService.create(payload);
            setIsCreateEmployeeOpen(false);
            setNewEmpData({ name: "", email: "", phone: "", password: "", roleId: "", designation: "", address: { line1: "", city: "", state: "", pincode: "" } });
            setUserSelectedBranches([]);
            // Refresh employees
            const userId = user?.id || user?._id;
            const data = await employeeService.getEmployeesByShopId(shopId, hasViewAllStaff, userId);
            setEmployees(data);
            alert("Employee created successfully!");
        } catch (error) {
            console.error("Error creating employee:", error);
            alert("Failed to create employee: " + (error.message || "Unknown error"));
        }
    };

    // --- Employee Edit Handlers ---
    const openEditEmployee = (employee) => {
        if (!employee) return;
        setEditingEmployee(employee);
        const u = employee.userId || {};
        setEditEmpData({
            name: u.name || "",
            email: u.email || "",
            phone: u.phone || "",
            roleId: employee.roleId?._id || employee.roleId || "",
            designation: employee.designation || "",
            address: employee.address || { line1: "", city: "", state: "", pincode: "" },
            status: employee.status || "ACTIVE"
        });
        setEditUserSelectedBranches(employee.allowedBranches || []);
        setEditRoleIsBranchUser(employee.roleId?.isBranchUser || false);
        setFormShopId(employee.shopId?._id || employee.shopId || shopId);
        setIsEditEmployeeOpen(true);
    };

    const handleEditEmpDataChange = (field, value) => {
        setEditEmpData(prev => ({ ...prev, [field]: value }));
        if (field === 'roleId') {
            const role = roles.find(r => r._id === value || r.id === value);
            setEditRoleIsBranchUser(role?.isBranchUser || false);
            if (!role?.isBranchUser) setEditUserSelectedBranches([]);
        }
    };

    const handleEditUserBranchSelection = (branchId) => {
        setEditUserSelectedBranches(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const handleUpdateEmployee = async () => {
        if (!editingEmployee) return;
        if (!editEmpData.name || !editEmpData.email || !editEmpData.phone || !editEmpData.roleId) {
            alert("Please fill in all required fields (Name, Email, Phone, Role)");
            return;
        }
        if (editRoleIsBranchUser && editUserSelectedBranches.length === 0) {
            alert("This role requires selecting at least one branch.");
            return;
        }

        const payload = {
            ...editEmpData,
            allowedBranches: editRoleIsBranchUser ? editUserSelectedBranches : []
        };

        try {
            const empId = editingEmployee._id || editingEmployee.id;
            await employeeService.update(empId, payload);
            setIsEditEmployeeOpen(false);
            setEditingEmployee(null);
            // Refresh employees
            const userId = user?.id || user?._id;
            const data = await employeeService.getEmployeesByShopId(shopId, hasViewAllStaff, userId, filterShopId);
            setEmployees(data);
            alert("Employee updated successfully!");
        } catch (error) {
            console.error("Error updating employee:", error);
            alert("Failed to update employee: " + (error.message || "Unknown error"));
        }
    };


    const staffAccess = ROUTE_ACCESS.STAFF;
    const canView = hasPermissionFor?.(staffAccess.module, staffAccess.resource, staffAccess.action);

    const attendancePoliciesAccess = ROUTE_ACCESS.ATTENDANCE_POLICIES;
    const canViewPolicies = hasPermissionFor?.(attendancePoliciesAccess.module, attendancePoliciesAccess.resource, attendancePoliciesAccess.action);

    const attendanceLogsAccess = ROUTE_ACCESS.ATTENDANCE_LOGS;
    const canViewLogs = hasPermissionFor?.(attendanceLogsAccess.module, attendanceLogsAccess.resource, attendanceLogsAccess.action);

    useEffect(() => {
        if (activeStaffTab === "attendance_policies" && !canViewPolicies) {
            setActiveStaffTab("staff");
        }
        if (activeStaffTab === "attendance_logs" && !canViewLogs) {
            setActiveStaffTab("staff");
        }
    }, [canViewPolicies, canViewLogs]);

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
                            onClick={() => { setIsCreateEmployeeOpen(true); setFormShopId(shopId); }}
                            className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg ${theme.buttonHoverBg} transition-all`}
                        >
                            <Plus size={20} /> Add Employee
                        </button>
                    ) : activeStaffTab === "roles" ? (
                        <button
                            onClick={() => {
                                setSelectedPermissions({});
                                setExpandedModules({});
                                setFormShopId(shopId);
                                setIsCreateRoleOpen(true);
                            }}
                            className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg ${theme.buttonHoverBg} transition-all`}
                        >
                            <Plus size={20} /> Add Role
                        </button>
                    ) : activeStaffTab === "attendance_policies" ? (
                        <button
                            onClick={() => {
                                setPolicyForm((prev) => ({
                                    ...prev,
                                    branchId: attendanceBranchId || "",
                                    name: "",
                                    description: "",
                                    status: "ACTIVE",
                                    isDefault: false,
                                    policyType: "SHIFT",
                                }));
                                setIsCreatePolicyOpen(true);
                            }}
                            className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg ${theme.buttonHoverBg} transition-all`}
                        >
                            <Plus size={20} /> Add Policy
                        </button>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div className={`flex gap-4 p-2 rounded-2xl shadow-sm w-fit ${theme.surfaceBg}`}>
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
                    {canViewPolicies && (
                        <button
                            onClick={() => setActiveStaffTab("attendance_policies")}
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeStaffTab === "attendance_policies" ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                        >
                            <ShieldCheck size={18} /> Attendance Policies
                        </button>
                    )}
                    {canViewLogs && (
                        <button
                            onClick={() => setActiveStaffTab("attendance_logs")}
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 ${activeStaffTab === "attendance_logs" ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                        >
                            <ShieldCheck size={18} /> Attendance Logs
                        </button>
                    )}
                </div>

                {hasViewAllStaff && ownerShops.length > 0 && (
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${theme.textSecondary}`}>Filter by Shop:</span>
                        <select
                            value={filterShopId}
                            onChange={(e) => setFilterShopId(e.target.value)}
                            className={`p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold shadow-sm min-w-[200px]`}
                        >
                            <option value="">All Shops</option>
                            {ownerShops.map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {activeStaffTab === "staff" ? (
                <>
                    {isEmployeesLoading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : (
                        <CommonTable
                            columns={[
                                ...(hasViewAllStaff ? [{ header: "Shop", key: "shopId.name", className: `font-bold text-xs ${theme.textSecondary}`, render: (_, item) => item.shopId?.name || "N/A" }] : []),
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
                                {
                                    header: "Action",
                                    key: "_id",
                                    className: "text-right",
                                    render: (_, employee) => (
                                        <button
                                            type="button"
                                            className={`font-bold text-sm hover:underline ${theme.primaryIconText.replace('text-', 'text-')}`}
                                            onClick={() => openEditEmployee(employee)}
                                            title="Edit employee"
                                        >
                                            Edit
                                        </button>
                                    )
                                }
                            ]}
                            data={employees}
                        />
                    )}
                </>
            ) : activeStaffTab === "roles" ? (
                <>
                    {isRolesLoading ? (
                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                    ) : (
                        <CommonTable
                            columns={[
                                ...(hasViewAllStaff ? [{ header: "Shop", key: "shopId.name", className: `font-bold text-xs ${theme.textSecondary}`, render: (_, item) => item.shopId?.name || "N/A" }] : []),
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
            ) : activeStaffTab === "attendance_policies" ? (
                <div className={`${theme.surfaceBg} rounded-2xl p-4 md:p-6 shadow-sm border ${theme.borderLight}`}>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
                        <div className="flex flex-col gap-2">
                            <label className={`text-sm font-bold ${theme.textSecondary}`}>Branch</label>
                            <select
                                value={attendanceBranchId}
                                onChange={(e) => setAttendanceBranchId(e.target.value)}
                                className={`p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold min-w-[220px]`}
                            >
                                <option value="">All Branches</option>
                                {branches.map((b) => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={refreshAttendanceData}
                                className={`${theme.buttonBg} ${theme.buttonText} px-5 py-3 rounded-xl font-bold ${theme.buttonHoverBg}`}
                                disabled={isAttendanceLoading}
                            >
                                {isAttendanceLoading ? "Loading..." : "Refresh"}
                            </button>
                        </div>
                    </div>

                    {attendanceError && (
                        <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-sm">
                            {attendanceError}
                        </div>
                    )}

                    <div className="mt-6">
                        <CommonTable
                            columns={[
                                { header: "Name", key: "name", className: `font-bold ${theme.textPrimary}` },
                                { header: "Type", key: "policyType", className: theme.textSecondary },
                                { header: "Status", key: "status", className: theme.textSecondary },
                                {
                                    header: "Default",
                                    key: "isDefault",
                                    render: (v) => (
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${v ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300"}`}>
                                            {v ? "YES" : "NO"}
                                        </span>
                                    )
                                },
                                {
                                    header: "Action",
                                    key: "_id",
                                    className: "text-right",
                                    render: (_, p) => (
                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAssignForm((prev) => ({
                                                        ...prev,
                                                        policyId: p._id,
                                                        branchId: p.branchId || attendanceBranchId || "",
                                                        employeeId: ""
                                                    }));
                                                    setIsAssignPolicyOpen(true);
                                                }}
                                                className={`font-bold text-sm ${theme.primaryIconText} hover:underline`}
                                            >
                                                Assign
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        const nextStatus = p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
                                                        await attendanceService.updatePolicyStatus(p._id, nextStatus);
                                                        await refreshAttendanceData();
                                                    } catch (err) {
                                                        alert("Failed to update status");
                                                    }
                                                }}
                                                className="font-bold text-sm text-gray-500 hover:underline"
                                            >
                                                {p.status === "ACTIVE" ? "Disable" : "Enable"}
                                            </button>
                                        </div>
                                    )
                                }
                            ]}
                            data={attendancePolicies}
                        />
                    </div>

                    <div className="mt-8">
                        <div className={`text-sm font-black ${theme.textHeading} mb-3`}>Assignments</div>
                        <CommonTable
                            columns={[
                                {
                                    header: "Employee",
                                    key: "employeeId",
                                    render: (_, a) => {
                                        const emp = a.employeeId;
                                        if (typeof emp === 'object' && emp !== null) {
                                            return `${emp.userId?.name || "N/A"} (${emp.employeeCode || "N/A"})`;
                                        }
                                        const found = employees.find(e => e._id === emp || e.id === emp);
                                        if (found) {
                                            return `${found.userId?.name || "N/A"} (${found.employeeCode || "N/A"})`;
                                        }
                                        return emp || "N/A";
                                    }
                                },
                                { header: "Policy", key: "policyId.name", render: (_, a) => a.policyId?.name || "N/A" },
                                { header: "From", key: "effectiveFrom", className: theme.textSecondary, render: (v) => (v ? String(v).split("T")[0] : "N/A") },
                                { header: "Priority", key: "priority", className: theme.textSecondary },
                                {
                                    header: "Action",
                                    key: "_id",
                                    className: "text-right",
                                    render: (_, a) => (
                                        <button
                                            type="button"
                                            className="font-bold text-sm text-red-500 hover:underline"
                                            onClick={async () => {
                                                if (!window.confirm("Remove assignment?")) return;
                                                try {
                                                    await attendanceService.deleteAssignment(a._id);
                                                    await refreshAttendanceData();
                                                } catch (err) {
                                                    alert("Failed to delete assignment");
                                                }
                                            }}
                                        >
                                            Remove
                                        </button>
                                    )
                                }
                            ]}
                            data={attendanceAssignments}
                        />
                    </div>
                </div>
            ) : (
                <div className={`${theme.surfaceBg} rounded-2xl p-4 md:p-6 shadow-sm border ${theme.borderLight}`}>
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex flex-col gap-2">
                                <label className={`text-sm font-bold ${theme.textSecondary}`}>Branch</label>
                                <select
                                    value={attendanceBranchId}
                                    onChange={(e) => setAttendanceBranchId(e.target.value)}
                                    className={`p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold min-w-[220px]`}
                                >
                                    <option value="">All Branches</option>
                                    {branches.map((b) => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={`text-sm font-bold ${theme.textSecondary}`}>Employee</label>
                                <select
                                    value={attendanceEmployeeId}
                                    onChange={(e) => setAttendanceEmployeeId(e.target.value)}
                                    className={`p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold min-w-[260px]`}
                                >
                                    <option value="">All Employees</option>
                                    {employees.map((e) => (
                                        <option key={e._id || e.id} value={e._id || e.id}>
                                            {e.userId?.name || "Employee"} ({e.employeeCode || e._id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={`text-sm font-bold ${theme.textSecondary}`}>Start</label>
                                <input
                                    type="date"
                                    value={attendanceStartDate}
                                    onChange={(e) => setAttendanceStartDate(e.target.value)}
                                    className={`p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold`}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={`text-sm font-bold ${theme.textSecondary}`}>End</label>
                                <input
                                    type="date"
                                    value={attendanceEndDate}
                                    onChange={(e) => setAttendanceEndDate(e.target.value)}
                                    className={`p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold`}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={refreshAttendanceLogs}
                                className={`${theme.buttonBg} ${theme.buttonText} px-5 py-3 rounded-xl font-bold ${theme.buttonHoverBg}`}
                                disabled={isAttendanceLoading}
                            >
                                {isAttendanceLoading ? "Loading..." : "Refresh"}
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await attendanceService.checkIn({ employeeId: attendanceEmployeeId, branchId: attendanceBranchId, source: "MANUAL" });
                                    await refreshAttendanceLogs();
                                }}
                                className="px-5 py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700"
                            >
                                Manual Punch-in
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await attendanceService.checkOut({ employeeId: attendanceEmployeeId, branchId: attendanceBranchId, source: "MANUAL" });
                                    await refreshAttendanceLogs();
                                }}
                                className="px-5 py-3 rounded-xl font-bold bg-orange-600 text-white hover:bg-orange-700"
                            >
                                Manual Punch-out
                            </button>
                        </div>
                    </div>

                    {attendanceError && (
                        <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-sm">
                            {attendanceError}
                        </div>
                    )}

                    <div className="mt-6">
                        <CommonTable
                            columns={[
                                { header: "Date", key: "attendanceDate", className: `font-mono text-xs ${theme.textSecondary}` },
                                {
                                    header: "Employee",
                                    key: "employeeId",
                                    render: (_, l) => {
                                        const emp = l.employeeId;
                                        if (typeof emp === 'object' && emp !== null) {
                                            return `${emp.userId?.name || "N/A"} (${emp.employeeCode || "N/A"})`;
                                        }
                                        const found = employees.find(e => e._id === emp || e.id === emp);
                                        if (found) {
                                            return `${found.userId?.name || "N/A"} (${found.employeeCode || "N/A"})`;
                                        }
                                        return emp || "N/A";
                                    }
                                },
                                {
                                    header: "Status",
                                    key: "status",
                                    render: (val) => (
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${val === 'PRESENT' ? 'bg-green-100 text-green-700' :
                                            val === 'MISS_PUNCH' ? 'bg-red-100 text-red-700' :
                                                val === 'HALF_DAY' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {val}
                                        </span>
                                    )
                                },
                                { header: "Work (min)", key: "workMinutes", className: theme.textSecondary },
                                { header: "Late (min)", key: "lateMinutes", className: theme.textSecondary },
                                { header: "OT (min)", key: "overtimeMinutes", className: theme.textSecondary },
                                { header: "Policy", key: "policyId.name", render: (_, l) => l.policyId?.name || "N/A" },
                                {
                                    header: "Location",
                                    key: "location",
                                    render: (_, l) => (
                                        <div className="flex flex-col gap-1 text-[10px]">
                                            {l.checkInAddress && (
                                                <div className="flex items-start gap-1">
                                                    <span className="font-bold text-green-600">PUNCH-IN:</span>
                                                    <span className="line-clamp-1 italic">{l.checkInAddress}</span>
                                                </div>
                                            )}
                                            {l.checkOutAddress && (
                                                <div className="flex items-start gap-1">
                                                    <span className="font-bold text-orange-600">PUNCH-OUT:</span>
                                                    <span className="line-clamp-1 italic">{l.checkOutAddress}</span>
                                                </div>
                                            )}
                                            {!l.checkInAddress && !l.checkOutAddress && l.checkInGeo?.lat && (
                                                <div className="text-gray-400">
                                                    GPS: {l.checkInGeo.lat.toFixed(4)}, {l.checkInGeo.lng.toFixed(4)}
                                                </div>
                                            )}
                                        </div>
                                    )
                                }
                            ]}
                            data={attendanceLogs}
                        />
                    </div>
                </div>
            )}

            {/* Create Policy Modal */}
            {isCreatePolicyOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Create Attendance Policy</h3>
                            <button onClick={() => setIsCreatePolicyOpen(false)} className={`${theme.textSecondary} hover:text-red-500`}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Branch</label>
                                    <select
                                        value={policyForm.branchId}
                                        onChange={(e) => setPolicyForm((p) => ({ ...p, branchId: e.target.value }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        <option value="">Shop-wide</option>
                                        {branches.map((b) => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Policy Type</label>
                                    <select
                                        value={policyForm.policyType}
                                        onChange={(e) => setPolicyForm((p) => ({ ...p, policyType: e.target.value }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        <option value="SHIFT">SHIFT</option>
                                        <option value="HOURLY">HOURLY</option>
                                        <option value="FLEXIBLE">FLEXIBLE</option>
                                        <option value="REMOTE">REMOTE</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Name *</label>
                                    <input
                                        value={policyForm.name}
                                        onChange={(e) => setPolicyForm((p) => ({ ...p, name: e.target.value }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="e.g. Office Shift 9-6"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Description</label>
                                    <input
                                        value={policyForm.description}
                                        onChange={(e) => setPolicyForm((p) => ({ ...p, description: e.target.value }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>

                            <div className={`p-4 rounded-xl border ${theme.inputBorder} ${theme.inputBg}`}>
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={policyForm.isDefault}
                                        onChange={(e) => setPolicyForm((p) => ({ ...p, isDefault: e.target.checked }))}
                                        className={`w-5 h-5 mt-0.5 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                    />
                                    <div>
                                        <div className={`font-bold ${theme.textPrimary}`}>Make Default</div>
                                        <div className={`text-xs ${theme.textSecondary}`}>Default policy is used when no assignment matches an employee.</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Rules JSON</label>
                                <textarea
                                    value={rulesJsonText}
                                    onChange={(e) => setRulesJsonText(e.target.value)}
                                    className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-mono text-xs`}
                                    rows={10}
                                />
                                <div className={`text-xs ${theme.textSecondary} mt-2`}>
                                    Keys supported: `shiftStartLocal`, `shiftEndLocal`, `graceMinutes`, `weeklyOffDays`, `overtimeAfterMinutes`, `gpsRequired`, `geoFenceMeters`, `minVisits`, `minTasks`, etc.
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 border-t ${theme.borderLight} flex justify-end gap-3 ${theme.inputBg}`}>
                            <button onClick={() => setIsCreatePolicyOpen(false)} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary}`}>Cancel</button>
                            <button
                                onClick={async () => {
                                    try {
                                        const parsedRules = rulesJsonText ? JSON.parse(rulesJsonText) : {};
                                        const payload = {
                                            branchId: policyForm.branchId || null,
                                            name: policyForm.name,
                                            description: policyForm.description,
                                            status: policyForm.status,
                                            isDefault: policyForm.isDefault,
                                            policyType: policyForm.policyType,
                                            rules: parsedRules
                                        };
                                        if (!payload.name?.trim()) {
                                            alert("Policy name is required");
                                            return;
                                        }
                                        await attendanceService.createPolicy(payload);
                                        setIsCreatePolicyOpen(false);
                                        await refreshAttendanceData();
                                    } catch (err) {
                                        alert("Failed to create policy. Ensure Rules JSON is valid.");
                                    }
                                }}
                                className={`px-6 py-2 rounded-lg font-bold ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow`}
                            >
                                Create Policy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Policy Modal */}
            {isAssignPolicyOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Assign Policy</h3>
                            <button onClick={() => setIsAssignPolicyOpen(false)} className={`${theme.textSecondary} hover:text-red-500`}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Employee *</label>
                                <select
                                    value={assignForm.employeeId}
                                    onChange={(e) => setAssignForm((p) => ({ ...p, employeeId: e.target.value }))}
                                    className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map((e) => (
                                        <option key={e._id || e.id} value={e._id || e.id}>
                                            {e.userId?.name || "Employee"} ({e.employeeCode || e._id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Effective From *</label>
                                <input
                                    type="date"
                                    value={assignForm.effectiveFrom}
                                    onChange={(e) => setAssignForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                                    className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold`}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Branch (optional)</label>
                                    <select
                                        value={assignForm.branchId}
                                        onChange={(e) => setAssignForm((p) => ({ ...p, branchId: e.target.value }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        <option value="">Any</option>
                                        {branches.map((b) => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Priority</label>
                                    <input
                                        type="number"
                                        value={assignForm.priority}
                                        onChange={(e) => setAssignForm((p) => ({ ...p, priority: Number(e.target.value) }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-bold`}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 border-t ${theme.borderLight} flex justify-end gap-3 ${theme.inputBg}`}>
                            <button onClick={() => setIsAssignPolicyOpen(false)} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary}`}>Cancel</button>
                            <button
                                onClick={async () => {
                                    if (!assignForm.employeeId || !assignForm.policyId || !assignForm.effectiveFrom) {
                                        alert("Employee and Effective From are required.");
                                        return;
                                    }
                                    try {
                                        await attendanceService.createAssignment({
                                            employeeId: assignForm.employeeId,
                                            policyId: assignForm.policyId,
                                            branchId: assignForm.branchId || null,
                                            effectiveFrom: assignForm.effectiveFrom,
                                            priority: assignForm.priority
                                        });
                                        setIsAssignPolicyOpen(false);
                                        await refreshAttendanceData();
                                    } catch (err) {
                                        alert("Failed to assign policy");
                                    }
                                }}
                                className={`px-6 py-2 rounded-lg font-bold ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow`}
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {isEditRoleOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Edit Role</h3>
                            <button onClick={() => {
                                setIsEditRoleOpen(false);
                                setEditingRole(null);
                                setEditSelectedPermissions({});
                                setEditExpandedModules({});
                            }} className={`${theme.textSecondary} hover:text-red-500`}>
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
                                            <label className={`block text-sm font-bold ${theme.textPrimary}`}>Select Allowed Branches</label>
                                            <div className={`border ${theme.borderLight} rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 ${theme.pageBg}`}>
                                                {branches.length > 0 ? branches.map(branch => (
                                                    <div key={branch._id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={editSelectedBranches.includes(branch._id)}
                                                            onChange={() => handleEditBranchSelection(branch._id)}
                                                            className={`w-4 h-4 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                        />
                                                        <span className={`text-sm ${theme.textPrimary}`}>{branch.name}</span>
                                                    </div>
                                                )) : <p className={`text-sm ${theme.textSecondary}`}>No branches found.</p>}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className={`block text-sm font-bold ${theme.textPrimary} mb-2`}>Assign Permissions</label>
                                        <div className={`border ${theme.borderLight} rounded-xl divide-y ${theme.borderLight} overflow-hidden`}>
                                            {availablePermissions.map(moduleData => {
                                                const moduleId = String(moduleData.moduleId);
                                                const isExpanded = editExpandedModules[moduleId];
                                                const modulePermIds = moduleData.permissions.map(p => String(p.permissionId));
                                                const selectedModulePerms = editSelectedPermissions[moduleId] || [];
                                                const isAllSelected = modulePermIds.length > 0 && modulePermIds.every(id => selectedModulePerms.includes(id));

                                                return (
                                                    <div key={moduleId} className={theme.surfaceBg}>
                                                        <div 
                                                            className={`p-3 flex items-center justify-between transition-colors ${theme.sectionBg} hover:opacity-80 cursor-pointer select-none`}
                                                            onClick={() => toggleEditModuleExpand(moduleId)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <button type="button" className={`${theme.primaryIconText}`}>
                                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                </button>
                                                                <span className={`font-bold uppercase tracking-tight text-sm ${theme.textHeading}`}>{moduleData.moduleName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllSelected}
                                                                    onChange={(e) => handleEditSelectAllModulePermissions(moduleId, modulePermIds, e.target.checked)}
                                                                    className={`w-4 h-4 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Select All</span>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className={`p-4 pl-10 space-y-3 ${theme.surfaceBg} border-t ${theme.borderLight}`}>
                                                                {moduleData.permissions.map(perm => (
                                                                    <div key={perm.permissionId} className="flex items-start gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" onClick={() => handleEditPermissionToggle(moduleId, String(perm.permissionId))}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(editSelectedPermissions[moduleId] || []).includes(String(perm.permissionId))}
                                                                            onChange={() => {}}
                                                                            className={`w-4 h-4 mt-1 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                                        />
                                                                        <div>
                                                                            <p className={`text-sm font-bold leading-tight ${theme.textPrimary}`}>{perm.permissionName}</p>
                                                                            <p className={`text-xs ${theme.textMuted}`}>{perm.description}</p>
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
                            <button onClick={() => {
                                setIsEditRoleOpen(false);
                                setEditingRole(null);
                                setEditSelectedPermissions({});
                                setEditExpandedModules({});
                            }} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary} hover:${theme.textPrimary} hover:${theme.inputBorder.replace('border-', 'bg-')}`}>Cancel</button>
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
                            <button onClick={() => {
                                setIsCreateRoleOpen(false);
                                setSelectedPermissions({});
                                setExpandedModules({});
                            }} className={`${theme.textSecondary} hover:text-red-500`}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {hasViewAllStaff && ownerShops.length > 0 && (
                                <div className="mb-2">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Assigned Shop</label>
                                    <select
                                        value={formShopId || shopId || ""}
                                        onChange={(e) => setFormShopId(e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        {ownerShops.map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

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
                                            <label className={`block text-sm font-bold ${theme.textPrimary}`}>Select Allowed Branches</label>
                                            <div className={`border ${theme.borderLight} rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 ${theme.pageBg}`}>
                                                {branches.length > 0 ? branches.map(branch => (
                                                    <div key={branch._id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBranches.includes(branch._id)}
                                                            onChange={() => handleBranchSelection(branch._id)}
                                                            className={`w-4 h-4 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                        />
                                                        <span className={`text-sm ${theme.textPrimary}`}>{branch.name}</span>
                                                    </div>
                                                )) : <p className={`text-sm ${theme.textSecondary}`}>No branches found.</p>}
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <label className={`block text-sm font-bold ${theme.textPrimary} mb-2`}>Assign Permissions</label>
                                        <div className={`border ${theme.borderLight} rounded-xl divide-y ${theme.borderLight} overflow-hidden`}>
                                            {availablePermissions.map(moduleData => {
                                                const moduleId = moduleData.moduleId;
                                                const isExpanded = expandedModules[moduleId];
                                                const modulePermIds = moduleData.permissions.map(p => p.permissionId);
                                                const selectedModulePerms = selectedPermissions[moduleId] || [];
                                                const isAllSelected = modulePermIds.length > 0 && modulePermIds.every(id => selectedModulePerms.includes(id));

                                                return (
                                                    <div key={moduleId} className={theme.surfaceBg}>
                                                        <div 
                                                            className={`p-3 flex items-center justify-between transition-colors ${theme.sectionBg} hover:opacity-80 cursor-pointer select-none`}
                                                            onClick={() => toggleModuleExpand(moduleId)}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <button className={`${theme.primaryIconText}`}>
                                                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                                </button>
                                                                <span className={`font-bold uppercase tracking-tight text-sm ${theme.textHeading}`}>{moduleData.moduleName}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllSelected}
                                                                    onChange={(e) => handleSelectAllModulePermissions(moduleId, modulePermIds, e.target.checked)}
                                                                    className={`w-4 h-4 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                <span className={`text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Select All</span>
                                                            </div>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className={`p-4 pl-10 space-y-3 ${theme.surfaceBg} border-t ${theme.borderLight}`}>
                                                                {moduleData.permissions.map(perm => (
                                                                    <div key={perm.permissionId} className="flex items-start gap-3 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer" onClick={() => handlePermissionToggle(moduleId, perm.permissionId)}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={(selectedPermissions[moduleId] || []).includes(perm.permissionId)}
                                                                            onChange={() => {}}
                                                                            className={`w-4 h-4 mt-1 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                                        />
                                                                        <div>
                                                                            <p className={`text-sm font-bold leading-tight ${theme.textPrimary}`}>{perm.permissionName}</p>
                                                                            <p className={`text-xs ${theme.textMuted}`}>{perm.description}</p>
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
                            <button onClick={() => {
                                setIsCreateRoleOpen(false);
                                setSelectedPermissions({});
                                setExpandedModules({});
                            }} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary} hover:${theme.textPrimary} hover:${theme.inputBorder.replace('border-', 'bg-')}`}>Cancel</button>
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
                            {hasViewAllStaff && ownerShops.length > 0 && (
                                <div className="mb-2">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Assigned Shop</label>
                                    <select
                                        value={formShopId || shopId || ""}
                                        onChange={(e) => setFormShopId(e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        {ownerShops.map(s => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

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

                            {selectedRoleIsBranchUser && (() => {
                                const role = roles.find(r => r._id === newEmpData.roleId || r.id === newEmpData.roleId);
                                const roleAllowed = (role?.allowedBranches || []).map(b => b?._id || b);
                                const hasSingleRoleBranch = roleAllowed.length === 1;

                                // Branch options are either restricted to role.allowedBranches, or all shop branches when none set on role
                                const branchOptions = roleAllowed.length > 0
                                    ? branches.filter(b => roleAllowed.includes(b._id))
                                    : branches;

                                if (hasSingleRoleBranch) {
                                    const onlyBranch = branches.find(b => String(b._id) === String(roleAllowed[0]));
                                    return (
                                        <div className={`space-y-2 animate-fadeIn ${theme.warningBg} p-4 rounded-xl border ${theme.warningBorder}`}>
                                            <label className={`block text-sm font-bold ${theme.textPrimary}`}>Branch Access</label>
                                            <p className={`text-xs ${theme.warningText}`}>
                                                This role is restricted to a single branch:&nbsp;
                                                <span className="font-bold">
                                                    {onlyBranch?.name || "Selected Branch"}
                                                </span>.
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className={`space-y-2 animate-fadeIn ${theme.warningBg} p-4 rounded-xl border ${theme.warningBorder}`}>
                                        <label className={`block text-sm font-bold ${theme.textPrimary}`}>Select Allowed Branches (Required)</label>
                                        <p className={`text-xs ${theme.warningText} mb-2`}>
                                            This role is restricted to specific branches. Please select which branches this employee can access.
                                        </p>
                                        <div className={`border ${theme.inputBorder} rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 ${theme.surfaceBg}`}>
                                            {branchOptions.length > 0 ? branchOptions.map(branch => (
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
                                );
                            })()}

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

            {/* Edit Employee Modal */}
            {isEditEmployeeOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center ${theme.inputBg}`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Edit Employee</h3>
                            <button onClick={() => { setIsEditEmployeeOpen(false); setEditingEmployee(null); }} className={`${theme.textSecondary} hover:text-red-500`}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Full Name *</label>
                                    <input
                                        value={editEmpData.name}
                                        onChange={(e) => handleEditEmpDataChange("name", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Mobile Number *</label>
                                    <input
                                        value={editEmpData.phone}
                                        onChange={(e) => handleEditEmpDataChange("phone", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="Phone"
                                    />
                                </div>
                                <div className="opacity-70 pointer-events-none">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Email Address (Read Only)</label>
                                    <input
                                        value={editEmpData.email}
                                        readOnly
                                        className={`w-full p-3 border ${theme.inputBorder} bg-gray-100 dark:bg-gray-800 ${theme.inputText} rounded-xl outline-none cursor-not-allowed`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Designation</label>
                                    <input
                                        value={editEmpData.designation}
                                        onChange={(e) => handleEditEmpDataChange("designation", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="e.g. Cashier"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role *</label>
                                    <select
                                        value={editEmpData.roleId}
                                        onChange={(e) => handleEditEmpDataChange("roleId", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        <option value="">Select Role</option>
                                        {roles.map(r => (
                                            <option key={r._id || r.id} value={r._id || r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Status</label>
                                    <select
                                        value={editEmpData.status}
                                        onChange={(e) => handleEditEmpDataChange("status", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="INACTIVE">INACTIVE</option>
                                    </select>
                                </div>
                            </div>

                            {editRoleIsBranchUser && (
                                <div className={`space-y-2 animate-fadeIn ${theme.warningBg} p-4 rounded-xl border ${theme.warningBorder}`}>
                                    <label className={`block text-sm font-bold ${theme.textPrimary}`}>Select Allowed Branches (Required)</label>
                                    <div className={`border ${theme.inputBorder} rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 ${theme.surfaceBg}`}>
                                        {branches.length > 0 ? branches.map(branch => (
                                            <div key={branch._id} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editUserSelectedBranches.includes(branch._id)}
                                                    onChange={() => handleEditUserBranchSelection(branch._id)}
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
                                    value={editEmpData.address.line1}
                                    onChange={(e) => setEditEmpData(prev => ({ ...prev, address: { ...prev.address, line1: e.target.value } }))}
                                    className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                    placeholder="Address Line 1"
                                />
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <input
                                        value={editEmpData.address.city}
                                        onChange={(e) => setEditEmpData(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="City"
                                    />
                                    <input
                                        value={editEmpData.address.state}
                                        onChange={(e) => setEditEmpData(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="State"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={`p-4 border-t ${theme.borderLight} flex justify-end gap-3 ${theme.inputBg}`}>
                            <button onClick={() => { setIsEditEmployeeOpen(false); setEditingEmployee(null); }} className={`px-4 py-2 rounded-lg font-bold ${theme.textSecondary}`}>Cancel</button>
                            <button onClick={handleUpdateEmployee} className={`px-6 py-2 rounded-lg font-bold ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow`}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Staff;
