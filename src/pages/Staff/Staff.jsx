import React, { useState, useEffect } from "react";
import { ShieldCheck, Plus, X, ChevronDown, ChevronUp, Clock, AlertCircle, Calendar, RefreshCw, Wallet } from "lucide-react";
import ThemeLoader from "../../components/ui/ThemeLoader";
import toast from "react-hot-toast";
import CommonTable from "../../components/CommonTable";
import { PERMISSIONS } from "./StaffService";
import PayrollManagement from "./PayrollManagement";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import CommonSelect from "../../components/ui/CommonSelect";
import { useAuth } from "../../context/AuthContext";
import { roleService, shopService, branchService, subscriptionService, employeeService, attendanceService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import SubscriptionNoticeModal from "../../components/modals/SubscriptionNoticeModal";
import AttendanceCorrectionModal from "../../components/modals/AttendanceCorrectionModal";
import LeaveReviewModal from "../../components/modals/LeaveReviewModal";
import { leaveService } from "../../services/api";
import { useApp } from "../../context/AppContext";

const Staff = ({
    setStaffList,
    setRolesList,
    hasPermissionFor,
}) => {
    const { theme } = useTheme();
    const { activeBranchId } = useApp();
    const [activeStaffTab, setActiveStaffTab] = useState("staff");

    // Employee State
    const [employees, setEmployees] = useState([]);
    const [isEmployeesLoading, setIsEmployeesLoading] = useState(false);

    // Roles State
    const [roles, setRoles] = useState([]);
    const [isRolesLoading, setIsRolesLoading] = useState(false);

    const { user } = useAuth();


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

    const [allLeaves, setAllLeaves] = useState([]);
    const [isLeavesLoading, setIsLeavesLoading] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [pendingLeavesCount, setPendingLeavesCount] = useState(0);

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

    const [availablePolicies, setAvailablePolicies] = useState([]);

    // Create Role Dialog State
    const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleCode, setNewRoleCode] = useState("");
    const [newRoleScope, setNewRoleScope] = useState("SHOP");
    const [newRoleDescription, setNewRoleDescription] = useState("");
    const [branches, setBranches] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState({});
    const [expandedModules, setExpandedModules] = useState({});
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Safely check if the user has STAFF.VIEW.ALL or is an owner/superadmin
    const hasViewAllStaff = user?.isSuperAdmin || user?.isOwner || (Array.isArray(user?.permissions)
        ? user.permissions.includes("STAFF.VIEW.ALL")
        : Object.values(user?.permissions || {}).flat().includes("STAFF.VIEW.ALL"));

    const canManageLeaves = user?.isSuperAdmin || user?.isOwner || (Array.isArray(user?.permissions)
        ? user.permissions.includes("MANAGE.EMPLOYEELEAVES")
        : Object.values(user?.permissions || {}).flat().includes("MANAGE.EMPLOYEELEAVES"));

    const canManageSalary = user?.isSuperAdmin || user?.isOwner || (Array.isArray(user?.permissions)
        ? user.permissions.includes("MANAGE.EMPLOYEESALARY")
        : Object.values(user?.permissions || {}).flat().includes("MANAGE.EMPLOYEESALARY"));

    // Shop fetching logic removed - now handled globally in AppContext/Navbar

    // Edit Role Dialog State
    const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [editRoleName, setEditRoleName] = useState("");
    const [editRoleCode, setEditRoleCode] = useState("");
    const [editRoleScope, setEditRoleScope] = useState("SHOP");
    const [editRoleDescription, setEditRoleDescription] = useState("");
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
        reportingTo: "",
        attendancePolicyId: "",
        salary: { amount: "", period: "monthly" },
        address: { line1: "", city: "", state: "", pincode: "" }
    });
    const [userSelectedBranchIds, setUserSelectedBranchIds] = useState([]);
    const [userAllBranches, setUserAllBranches] = useState(true);

    // Edit Employee Dialog State
    const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editEmpData, setEditEmpData] = useState({
        name: "",
        email: "",
        phone: "",
        roleId: "",
        designation: "",
        reportingTo: "",
        attendancePolicyId: "",
        address: { line1: "", city: "", state: "", pincode: "" },
        salary: { amount: "", period: "monthly" },
        status: "ACTIVE"
    });
    const [editUserSelectedBranchIds, setEditUserSelectedBranchIds] = useState([]);
    const [editUserAllBranches, setEditUserAllBranches] = useState(false);
    const [isSubscriptionNoticeOpen, setIsSubscriptionNoticeOpen] = useState(false);
    const [potentialManagers, setPotentialManagers] = useState([]);
    const [isManagersLoading, setIsManagersLoading] = useState(false);

    const checkSubscriptionAndOpen = (openModalFn) => {
        // Only block staff members. Let owners pass as they might need to manage other subscribed shops
        // or take action to restore their subscription.
        const isOwnerByRole = user?.roles?.some(r => {
            const roleName = (r?.name || "").toLowerCase();
            return roleName === 'owner' || roleName === 'admin';
        });
        const isOwner = user?.isOwner || isOwnerByRole || user?.isSuperAdmin;

        if (!user?.isSuperAdmin && !isOwner && !user?.subscription?.active) {
            setIsSubscriptionNoticeOpen(true);
            return;
        }
        openModalFn();
    };

    const { currentShopId: shopId } = useApp();

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
                    const data = await employeeService.getEmployeesByShopId(shopId, hasViewAllStaff, userId);
                    setEmployees(data);
                } catch (error) {
                    console.error("Failed to fetch employees:", error);
                } finally {
                    setIsEmployeesLoading(false);
                }
            }
        };
        fetchEmployees();
    }, [activeStaffTab, shopId, hasViewAllStaff, isCreateEmployeeOpen]);

    // Fetch Roles
    useEffect(() => {
        const fetchRoles = async () => {
            if (activeStaffTab === "roles" && !isCreateEmployeeOpen && shopId) {
                setIsRolesLoading(true);
                try {
                    const userId = user?.id || user?._id;
                    const fetchedRoles = await roleService.getRolesByShopId(shopId, hasViewAllStaff, userId);
                    setRoles(fetchedRoles);
                    if (setRolesList) setRolesList(fetchedRoles);
                } catch (error) {
                    console.error("Failed to fetch roles:", error);
                } finally {
                    setIsRolesLoading(false);
                }
            } else if (isCreateEmployeeOpen && shopId) {
                setIsRolesLoading(true);
                try {
                    const targetShop = shopId;
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
    }, [activeStaffTab, isCreateEmployeeOpen, shopId, setRolesList, hasViewAllStaff]);

    // Fetch Branches (Shared for both dialogs)
    useEffect(() => {
        const targetShop = shopId;
        if ((isCreateRoleOpen || isEditRoleOpen || isCreateEmployeeOpen || isCreatePolicyOpen || isAssignPolicyOpen || activeStaffTab === "attendance_logs" || activeStaffTab === "attendance_policies") && targetShop) {
            const fetchBranches = async () => {
                try {
                    const data = await branchService.getAllowedBranches();
                    setBranches(data || []);
                } catch (error) {
                    console.error("Error fetching branches:", error);
                }
            };
            fetchBranches();
        }
    }, [isCreateRoleOpen, isEditRoleOpen, isCreateEmployeeOpen, isCreatePolicyOpen, isAssignPolicyOpen, activeStaffTab, shopId]);

    // Fetch Potential Managers for Reporting To
    useEffect(() => {
        const targetShop = shopId;
        if ((isCreateEmployeeOpen || isEditEmployeeOpen) && targetShop) {
            const fetchManagers = async () => {
                setIsManagersLoading(true);
                try {
                    const data = await employeeService.getPotentialManagers(targetShop);
                    setPotentialManagers(data);
                } catch (error) {
                    console.error("Error fetching potential managers:", error);
                } finally {
                    setIsManagersLoading(false);
                }
            };
            fetchManagers();
        }
    }, [isCreateEmployeeOpen, isEditEmployeeOpen, shopId]);

    // Fetch Attendance Policies for Employee Dialogs
    useEffect(() => {
        const targetShop = shopId;
        if ((isCreateEmployeeOpen || isEditEmployeeOpen) && targetShop) {
            const fetchPolicies = async () => {
                try {
                    const data = await attendanceService.getPolicies({ shopId: targetShop });
                    setAvailablePolicies(data || []);
                } catch (error) {
                    console.error("Error fetching available policies:", error);
                }
            };
            fetchPolicies();
        }
    }, [isCreateEmployeeOpen, isEditEmployeeOpen, shopId]);


    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

    const refreshAttendanceData = React.useCallback(async () => {
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
    }, [shopId, attendanceBranchId, attendanceEmployeeId]);

    const refreshAttendanceLogs = React.useCallback(async () => {
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
            const pending = (logs || []).filter(l => l.correctionRequest?.status === 'PENDING').length;
            setPendingRequestsCount(pending);
        } catch (err) {
            console.error("Failed to fetch attendance logs:", err);
            setAttendanceError(err?.message || "Failed to load attendance logs");
        } finally {
            setIsAttendanceLoading(false);
        }
    }, [attendanceBranchId, attendanceEmployeeId, attendanceStartDate, attendanceEndDate]);

    const fetchAllLeaves = React.useCallback(async () => {
        if (!shopId) return;
        setIsLeavesLoading(true);
        try {
            const data = await leaveService.getAllLeaves();
            setAllLeaves(data || []);
            setPendingLeavesCount((data || []).filter(l => l.status === 'PENDING').length);
        } catch (err) {
            console.error("Failed to fetch all leaves:", err);
            toast.error("Failed to load leaves");
        } finally {
            setIsLeavesLoading(false);
        }
    }, [shopId]);

    const handleApproveLeave = async (id, response) => {
        try {
            await leaveService.reviewLeave(id, { status: 'APPROVED', managerResponse: response });
            toast.success("Leave approved");
            fetchAllLeaves();
        } catch (err) {
            toast.error(err?.message || "Failed to approve leave");
            throw err;
        }
    };

    const handleRejectLeave = async (id, response) => {
        try {
            await leaveService.reviewLeave(id, { status: 'REJECTED', managerResponse: response });
            toast.success("Leave rejected");
            fetchAllLeaves();
        } catch (err) {
            toast.error(err?.message || "Failed to reject leave");
            throw err;
        }
    };

    useEffect(() => {
        if (activeStaffTab === "employee_leaves") {
            fetchAllLeaves();
        }
    }, [activeStaffTab, fetchAllLeaves]);


    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [selectedLogForCorrection, setSelectedLogForCorrection] = useState(null);

    const handleCorrectionAction = async (logId, status, rejectionReason = "") => {
        try {
            await attendanceService.approveCorrection(logId, { status, rejectionReason });
            await refreshAttendanceLogs();
            toast.success(`Correction ${status.toLowerCase()} successful`);
        } catch (err) {
            console.error("Failed to process correction:", err);
            toast.error(err?.message || "Failed to process correction");
        }
    };

    useEffect(() => {
        if (activeStaffTab === "attendance_policies") {
            refreshAttendanceData();
        }
        if (activeStaffTab === "attendance_logs") {
            refreshAttendanceLogs();
        }
    }, [activeStaffTab, refreshAttendanceData, refreshAttendanceLogs]);

    useEffect(() => {
        if (!isCreatePolicyOpen) return;
        setRulesJsonText(JSON.stringify(policyForm.rules || {}, null, 2));
    }, [isCreatePolicyOpen]);

    // Fetch Permissions only for Role Dialog
    useEffect(() => {
        const targetShop = shopId;
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
    }, [isCreateRoleOpen, isEditRoleOpen, shopId]);


    // --- Role Creation Handlers ---
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
        if (!newRoleCode.trim()) { alert("Please enter a unique role code"); return; }

        // Filter selected permissions against available permissions
        const allowedModuleIds = new Set(availablePermissions.map(am => String(am.moduleId)));

        const permissionsPayload = Object.entries(selectedPermissions)
            .filter(([module, perms]) => allowedModuleIds.has(String(module)) && perms.length > 0)
            .map(([module, perms]) => {
                const allowedPermIds = new Set(availablePermissions.find(am => String(am.moduleId) === String(module))?.permissions.map(p => String(p.permissionId)) || []);
                return {
                    moduleId: module,
                    actions: perms.filter(p => allowedPermIds.has(String(p)))
                };
            })
            .filter(entry => entry.actions.length > 0);

        const targetShop = shopId;
        const payload = {
            name: newRoleName,
            code: newRoleCode.toUpperCase(),
            shopId: targetShop,
            scope: newRoleScope,
            description: newRoleDescription,
            permissions: permissionsPayload,
            isSystemRole: false
        };

        try {
            await roleService.createRole(payload);
            setIsCreateRoleOpen(false);
            setNewRoleName(""); setNewRoleCode(""); setNewRoleScope("SHOP"); setNewRoleDescription(""); setSelectedPermissions({});
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
        setEditRoleCode(role.code || "");
        setEditRoleScope(role.scope || "SHOP");
        setEditRoleDescription(role.description || "");

        // role.permissions is array of { moduleId, actions: [...] }
        const permsMap = (role.permissions || []).reduce((acc, entry) => {
            const moduleId = entry?.moduleId?._id || entry?.moduleId;
            if (!moduleId) return acc;
            const actionIds = (entry.actions || []).map(p => p?._id || p).filter(Boolean);
            acc[String(moduleId)] = actionIds.map(String);
            return acc;
        }, {});
        setEditSelectedPermissions(permsMap);
        setEditExpandedModules({});
        setAvailablePermissions([]);
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

    const handleUpdateRole = async () => {
        if (!editingRole) return;
        if (!editRoleName.trim()) { alert("Please enter a role name"); return; }
        if (!editRoleCode.trim()) { alert("Please enter a role code"); return; }

        // Filter selected permissions against available permissions
        const allowedModuleIds = new Set(availablePermissions.map(am => String(am.moduleId)));

        const permissionsPayload = Object.entries(editSelectedPermissions)
            .filter(([module, perms]) => allowedModuleIds.has(String(module)) && Array.isArray(perms) && perms.length > 0)
            .map(([module, perms]) => {
                const allowedPermIds = new Set(availablePermissions.find(am => String(am.moduleId) === String(module))?.permissions.map(p => String(p.permissionId)) || []);
                return {
                    moduleId: module,
                    actions: perms.filter(p => allowedPermIds.has(String(p)))
                };
            })
            .filter(entry => entry.actions.length > 0);

        const payload = {
            name: editRoleName,
            code: editRoleCode.toUpperCase(),
            shopId: editingRole.shopId?._id || editingRole.shopId,
            scope: editRoleScope,
            description: editRoleDescription,
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
        setNewEmpData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === "roleId") {
                const selectedRole = roles.find(r => (r._id || r.id) === value);
                if (selectedRole) {
                    updated.designation = selectedRole.name;
                }
            }
            return updated;
        });
    };

    const handleUserBranchSelection = (branchId) => {
        setUserSelectedBranchIds(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const handleCreateEmployee = async () => {
        if (!newEmpData.name || (!newEmpData.email && !newEmpData.phone) || !newEmpData.roleId) {
            alert("Please fill in required fields (Name, Email/Phone, and Role)");
            return;
        }
        if (!userAllBranches && userSelectedBranchIds.length === 0) {
            alert("Please select at least one branch or enable 'Full Shop Access'.");
            return;
        }

        const targetShop = shopId;
        const payload = {
            ...newEmpData,
            shopId: targetShop,
            branchIds: userSelectedBranchIds,
            allBranches: userAllBranches
        };

        try {
            const res = await employeeService.create(payload);
            const createdEmployee = res.data?.employee || res.employee || res;
            const newEmployeeId = createdEmployee._id || createdEmployee.id;

            // Handle Attendance Policy Assignment
            if (newEmpData.attendancePolicyId && newEmployeeId) {
                try {
                    await attendanceService.createAssignment({
                        employeeId: newEmployeeId,
                        policyId: newEmpData.attendancePolicyId,
                        effectiveFrom: new Date().toISOString().split("T")[0],
                        priority: 0
                    });
                } catch (assignError) {
                    console.error("Failed to assign policy to new employee:", assignError);
                }
            }

            setIsCreateEmployeeOpen(false);
            setNewEmpData({ name: "", email: "", phone: "", password: "", roleId: "", designation: "", reportingTo: "", attendancePolicyId: "", address: { line1: "", city: "", state: "", pincode: "" } });
            setUserSelectedBranchIds([]);
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
            roleId: (employee.mapping?.roleId?._id || employee.mapping?.roleId || employee.roleId?._id || employee.roleId || ""),
            designation: employee.designation || "",
            reportingTo: (employee.reportingTo?._id || employee.reportingTo || ""),
            address: employee.address || { line1: "", city: "", state: "", pincode: "" },
            status: u.status || employee.status || "ACTIVE",
            attendancePolicyId: "", // Default to empty, will fetch below
            salary: { 
                amount: employee.salary?.amount || "", 
                period: employee.salary?.period || "monthly" 
            }
        });

        // Try to fetch existing assignment
        const fetchCurrentAssignment = async () => {
            try {
                const employeeId = employee._id || employee.id;
                const assignments = await attendanceService.getAssignments({ employeeId });
                if (assignments && assignments.length > 0) {
                    const latest = assignments[0];
                    setEditEmpData(prev => ({ ...prev, attendancePolicyId: latest.policyId?._id || latest.policyId || "" }));
                }
            } catch (error) {
                console.error("Error fetching assignment for employee:", error);
            }
        };
        fetchCurrentAssignment();


        const branchIds = (employee.mapping?.branchIds || employee.allowedBranches || []).map(b => b?._id || b);
        setEditUserSelectedBranchIds(branchIds);
        setEditUserAllBranches(!!employee.mapping?.allBranches);
        setIsEditEmployeeOpen(true);
    };

    const handleEditEmpDataChange = (field, value) => {
        setEditEmpData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === "roleId") {
                const selectedRole = roles.find(r => (r._id || r.id) === value);
                if (selectedRole) {
                    updated.designation = selectedRole.name;
                }
            }
            return updated;
        });
    };

    const handleEditUserBranchSelection = (branchId) => {
        setEditUserSelectedBranchIds(prev =>
            prev.includes(branchId) ? prev.filter(id => id !== branchId) : [...prev, branchId]
        );
    };

    const handleUpdateEmployee = async () => {
        if (!editingEmployee) return;
        if (!editEmpData.name || (!editEmpData.email && !editEmpData.phone) || !editEmpData.roleId) {
            alert("Please fill in required fields (Name, Email/Phone, and Role)");
            return;
        }
        if (!editUserAllBranches && editUserSelectedBranchIds.length === 0) {
            alert("Please select at least one branch or enable 'Full Shop Access'.");
            return;
        }

        const payload = {
            ...editEmpData,
            branchIds: editUserSelectedBranchIds,
            allBranches: editUserAllBranches
        };

        try {
            const employeeId = editingEmployee._id || editingEmployee.id;
            await employeeService.update(employeeId, payload);

            // Handle Attendance Policy Assignment (Update or Create)
            if (editEmpData.attendancePolicyId) {
                try {
                    const existing = await attendanceService.getAssignments({ employeeId });
                    if (existing && existing.length > 0) {
                        const latest = existing[0];
                        if (latest.policyId?._id !== editEmpData.attendancePolicyId && latest.policyId !== editEmpData.attendancePolicyId) {
                            await attendanceService.deleteAssignment(latest._id);
                            await attendanceService.createAssignment({
                                employeeId,
                                policyId: editEmpData.attendancePolicyId,
                                effectiveFrom: new Date().toISOString().split("T")[0],
                                priority: 0
                            });
                        }
                    } else {
                        await attendanceService.createAssignment({
                            employeeId,
                            policyId: editEmpData.attendancePolicyId,
                            effectiveFrom: new Date().toISOString().split("T")[0],
                            priority: 0
                        });
                    }
                } catch (assignError) {
                    console.error("Failed to update policy assignment:", assignError);
                }
            }

            setIsEditEmployeeOpen(false);
            setEditingEmployee(null);
            // Refresh employees
            const userId = user?.id || user?._id;
            const data = await employeeService.getEmployeesByShopId(shopId, hasViewAllStaff, userId);
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
                            onClick={() => checkSubscriptionAndOpen(() => { setIsCreateEmployeeOpen(true); })}
                            className={`${theme.buttonBg} ${theme.buttonText} px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg ${theme.buttonHoverBg} transition-all`}
                        >
                            <Plus size={20} /> Add Employee
                        </button>
                    ) : activeStaffTab === "roles" ? (
                        <button
                            onClick={() => checkSubscriptionAndOpen(() => {
                                setSelectedPermissions({});
                                setExpandedModules({});
                                setIsCreateRoleOpen(true);
                            })}
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
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 relative ${activeStaffTab === "attendance_logs" ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                        >
                            <ShieldCheck size={18} /> Attendance Logs
                            {pendingRequestsCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 animate-bounce">
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>
                    )}
                    {canManageLeaves && (
                        <button
                            onClick={() => setActiveStaffTab("employee_leaves")}
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 relative ${activeStaffTab === "employee_leaves" ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                        >
                            <Calendar size={18} /> Employee Leaves
                            {pendingLeavesCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800 animate-pulse">
                                    {pendingLeavesCount}
                                </span>
                            )}
                        </button>
                    )}
                    {canManageSalary && (
                        <button
                            onClick={() => setActiveStaffTab("payroll")}
                            className={`px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2 relative ${activeStaffTab === "payroll" ? `${theme.primaryIconBg} ${theme.primaryIconText}` : `${theme.textSecondary} hover:opacity-80`}`}
                        >
                            <Wallet size={18} /> Payroll
                        </button>
                    )}
                </div>


            </div>

            {activeStaffTab === "staff" ? (
                <>
                    {isEmployeesLoading ? (
                        <div className="p-8 flex justify-center"><ThemeLoader size="lg" /></div>
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

                                {
                                    header: "Role",
                                    key: "roleId.name",
                                    render: (_, item) => (
                                        <span className={`${theme.buttonBg} ${theme.buttonText} px-3 py-1 rounded-full text-xs font-bold uppercase`}>
                                            {item.mapping?.roleId?.name || item.roleId?.name || "N/A"}
                                        </span>
                                    )
                                },
                                {
                                    header: "Reports To",
                                    key: "reportingTo.name",
                                    className: theme.textSecondary,
                                    render: (_, item) => item.reportingTo?.name || "None"
                                },

                                {
                                    header: "Branch Access",
                                    key: "mapping.branchIds",
                                    render: (_, item) => (
                                        <span className={`text-xs font-bold ${theme.textSecondary}`}>
                                            {item.mapping?.allBranches ? "FULL SHOP" : `${item.mapping?.branchIds?.length || 0} BRANCHES`}
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
                        <div className="p-8 flex justify-center"><ThemeLoader size="md" /></div>
                    ) : (
                        <CommonTable
                            columns={[
                                ...(hasViewAllStaff ? [{ header: "Shop", key: "shopId.name", className: `font-bold text-xs ${theme.textSecondary}`, render: (_, item) => item.shopId?.name || "N/A" }] : []),
                                {
                                    header: "Role Name",
                                    key: "name",
                                    className: `font-bold ${theme.textPrimary}`,
                                    render: (val, item) => (
                                        <div className="flex flex-col">
                                            <span>{val}</span>
                                            <span className="text-[10px] font-mono opacity-50">{item.code}</span>
                                        </div>
                                    )
                                },
                                {
                                    header: "Scope",
                                    key: "scope",
                                    render: (scope) => (
                                        <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest ${scope === 'GLOBAL' ? 'bg-amber-100 text-amber-700' :
                                                scope === 'SHOP' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-sky-100 text-sky-700'
                                            }`}>
                                            {scope || 'SHOP'}
                                        </span>
                                    )
                                },
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
                            <CommonSelect
                                options={branches}
                                value={attendanceBranchId}
                                onChange={(val) => setAttendanceBranchId(val)}
                                placeholder="All Branches"
                                labelKey="name"
                                valueKey="_id"
                                className="min-w-[220px]"
                            />
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
            ) : activeStaffTab === "attendance_logs" ? (
                <div className={`${theme.surfaceBg} rounded-2xl p-4 md:p-6 shadow-sm border ${theme.borderLight}`}>
                    <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end justify-between">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex flex-col gap-2">
                                <label className={`text-sm font-bold ${theme.textSecondary}`}>Branch</label>
                                <CommonSelect
                                    options={branches}
                                    value={attendanceBranchId}
                                    onChange={(val) => setAttendanceBranchId(val)}
                                    placeholder="All Branches"
                                    labelKey="name"
                                    valueKey="_id"
                                    className="min-w-[220px]"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className={`text-sm font-bold ${theme.textSecondary}`}>Employee</label>
                                <CommonSelect
                                    options={employees.map(e => ({ ...e, displayName: `${e.userId?.name || "Employee"} (${e.employeeCode || e._id})` }))}
                                    value={attendanceEmployeeId}
                                    onChange={(val) => setAttendanceEmployeeId(val)}
                                    placeholder="All Employees"
                                    labelKey="displayName"
                                    valueKey="_id"
                                    className="min-w-[260px]"
                                />
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
                                },
                                 {
                                    header: "Correction",
                                    key: "correctionRequest",
                                    render: (_, l) => {
                                        if (!l.correctionRequest || !l.correctionRequest.status) return null;
                                        const req = l.correctionRequest;
                                        return (
                                            <div className="flex flex-col gap-1.5 py-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                        req.status === 'PENDING' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm' :
                                                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                        'bg-red-100 text-red-700 border border-red-200'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                    {req.status === 'PENDING' && (
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedLogForCorrection(l);
                                                                setIsCorrectionModalOpen(true);
                                                            }}
                                                            className={`text-[9px] font-black ${theme.primaryIconText} hover:scale-105 transition-transform uppercase tracking-wider flex items-center gap-1 bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-lg border border-indigo-500/20`}
                                                        >
                                                            <Clock size={10} /> Review Fix
                                                        </button>
                                                    )}
                                                </div>
                                                <p className={`text-[10px] italic ${theme.textSecondary} max-w-[140px] line-clamp-2 leading-tight`} title={req.reason}>
                                                    &quot;{req.reason}&quot;
                                                </p>
                                            </div>
                                        );
                                    }
                                }
                            ]}
                            data={attendanceLogs}
                        />
                    </div>
                </div>
            ) : activeStaffTab === "employee_leaves" ? (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className={`text-4xl font-black tracking-tight ${theme.textHeading} mb-2`}>Employee Leaves</h2>
                            <p className={`${theme.textSecondary} font-bold flex items-center gap-2 uppercase tracking-widest text-[10px]`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Review and manage time-off requests
                            </p>
                        </div>
                        <button 
                            onClick={fetchAllLeaves}
                            className={`p-4 rounded-[2rem] ${theme.surfaceBg} ${theme.textSecondary} border ${theme.borderLight} hover:shadow-xl transition-all active:scale-95 group`}
                        >
                            <RefreshCw size={22} className={isLeavesLoading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                        </button>
                    </div>

                    <div className={`${theme.surfaceBg} rounded-[3rem] shadow-2xl shadow-indigo-500/5 border ${theme.borderLight} overflow-hidden`}>
                        <CommonTable 
                            columns={[
                                { 
                                    header: "Employee", 
                                    key: "employeeId",
                                    render: (emp) => (
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${theme.textPrimary}`}>{emp?.userId?.name || "N/A"}</span>
                                            <span className={`text-[10px] uppercase font-black text-gray-400`}>{emp?.employeeCode}</span>
                                        </div>
                                    )
                                },
                                { 
                                    header: "Duration", 
                                    key: "startDate",
                                    render: (_, l) => (
                                        <div className="flex flex-col gap-0.5">
                                            <span className={`text-xs font-black ${theme.textPrimary}`}>
                                                {new Date(l.startDate).toLocaleDateString()} to {new Date(l.endDate).toLocaleDateString()}
                                            </span>
                                            <span className={`text-[11px] font-bold text-indigo-500`}>
                                                {l.totalDays} {l.totalDays > 1 ? 'Days' : 'Day'}
                                            </span>
                                        </div>
                                    )
                                },
                                { 
                                    header: "Type", 
                                    key: "leaveType",
                                    render: (val) => (
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-100/50 text-indigo-700`}>
                                            {val}
                                        </span>
                                    )
                                },
                                { 
                                    header: "Status", 
                                    key: "status",
                                    render: (val) => (
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            val === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            val === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {val}
                                        </span>
                                    )
                                },
                                {
                                    header: "Action",
                                    key: "_id",
                                    render: (_, l) => (
                                        l.status === 'PENDING' ? (
                                            <button 
                                                onClick={() => {
                                                    setSelectedLeave(l);
                                                    setIsLeaveModalOpen(true);
                                                }}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white bg-indigo-500 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20`}
                                            >
                                                Review
                                            </button>
                                        ) : (
                                            <div className="text-[10px] italic text-gray-400 font-bold max-w-[150px] truncate" title={l.managerResponse}>
                                                {l.managerResponse || "Processed"}
                                            </div>
                                        )
                                    )
                                }
                            ]}
                            data={allLeaves}
                        />
                    </div>

                    <LeaveReviewModal 
                        isOpen={isLeaveModalOpen}
                        onClose={() => setIsLeaveModalOpen(false)}
                        leave={selectedLeave}
                        onApprove={handleApproveLeave}
                        onReject={handleRejectLeave}
                    />
                </div>
            ) : null}

            {activeStaffTab === "payroll" ? (
                <PayrollManagement 
                    theme={theme} 
                    shopId={shopId} 
                    canManageSalary={canManageSalary} 
                />
            ) : null}


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
                                    <CommonSelect
                                        options={branches}
                                        value={policyForm.branchId}
                                        onChange={(val) => setPolicyForm((p) => ({ ...p, branchId: val }))}
                                        placeholder="Shop-wide"
                                        labelKey="name"
                                        valueKey="_id"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Policy Type</label>
                                    <CommonSelect
                                        options={[
                                            { label: 'SHIFT', value: 'SHIFT' },
                                            { label: 'HOURLY', value: 'HOURLY' },
                                            { label: 'FLEXIBLE', value: 'FLEXIBLE' },
                                            { label: 'REMOTE', value: 'REMOTE' }
                                        ]}
                                        value={policyForm.policyType}
                                        onChange={(val) => setPolicyForm((p) => ({ ...p, policyType: val }))}
                                        placeholder="Select Type"
                                        labelKey="label"
                                        valueKey="value"
                                    />
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
                                <CommonSelect
                                    options={employees.map(e => ({ ...e, displayName: `${e.userId?.name || "Employee"} (${e.employeeCode || e._id})` }))}
                                    value={assignForm.employeeId}
                                    onChange={(val) => setAssignForm((p) => ({ ...p, employeeId: val }))}
                                    placeholder="Select Employee"
                                    labelKey="displayName"
                                    valueKey="_id"
                                    required={true}
                                />
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
                                    <CommonSelect
                                        options={branches}
                                        value={assignForm.branchId}
                                        onChange={(val) => setAssignForm((p) => ({ ...p, branchId: val }))}
                                        placeholder="Any Branch"
                                        labelKey="name"
                                        valueKey="_id"
                                    />

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
                                <div className="flex justify-center p-10"><ThemeLoader size="lg" /></div>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role Code (Unique)</label>
                                            <input
                                                value={editRoleCode}
                                                onChange={(e) => setEditRoleCode(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                                                className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-mono`}
                                                placeholder="e.g. MANAGER_ADMIN"
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Scope</label>
                                            <CommonSelect
                                                options={[
                                                    { label: 'FULL SHOP', value: 'SHOP' },
                                                    { label: 'BRANCH LEVEL', value: 'BRANCH' }
                                                ]}
                                                value={editRoleScope}
                                                onChange={(val) => setEditRoleScope(val)}
                                                placeholder="Select Scope"
                                                labelKey="label"
                                                valueKey="value"
                                            />

                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Description</label>
                                        <input
                                            value={editRoleDescription}
                                            onChange={(e) => setEditRoleDescription(e.target.value)}
                                            className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                            placeholder="Optional description"
                                        />
                                    </div>
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
                                                                            onChange={() => { }}
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


                            {isLoadingData ? (
                                <div className="flex justify-center p-10"><ThemeLoader size="lg" /></div>
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
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role Code (Unique)</label>
                                            <input
                                                value={newRoleCode}
                                                onChange={(e) => setNewRoleCode(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                                                className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus} font-mono`}
                                                placeholder="e.g. MANAGER_ADMIN"
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Scope</label>
                                            <CommonSelect
                                                options={[
                                                    { label: 'FULL SHOP', value: 'SHOP' },
                                                    { label: 'BRANCH LEVEL', value: 'BRANCH' }
                                                ]}
                                                value={newRoleScope}
                                                onChange={(val) => setNewRoleScope(val)}
                                                placeholder="Select Scope"
                                                labelKey="label"
                                                valueKey="value"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Description</label>
                                        <input
                                            value={newRoleDescription}
                                            onChange={(e) => setNewRoleDescription(e.target.value)}
                                            className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                            placeholder="Optional description"
                                        />
                                    </div>
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
                                                                            onChange={() => { }}
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
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Mobile Number (Either Phone or Email Required)</label>
                                    <input
                                        value={newEmpData.phone}
                                        onChange={(e) => handleEmpDataChange("phone", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="9876543210"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Email Address</label>
                                    <input
                                        value={newEmpData.email}
                                        onChange={(e) => handleEmpDataChange("email", e.target.value)}
                                        className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role *</label>
                                    <CommonSelect
                                        options={roles}
                                        value={newEmpData.roleId}
                                        onChange={(val) => handleEmpDataChange("roleId", val)}
                                        placeholder="Select Role"
                                        labelKey="name"
                                        valueKey="_id"
                                        required={true}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Reporting To</label>
                                    <CommonSelect
                                        options={potentialManagers}
                                        value={newEmpData.reportingTo}
                                        onChange={(val) => handleEmpDataChange("reportingTo", val)}
                                        placeholder="Select Manager"
                                        labelKey="name"
                                        valueKey="_id"
                                        renderOption={(opt) => (
                                            <div className="flex flex-col">
                                                <div className={`font-black ${theme.textPrimary}`}>{opt.name}</div>
                                                <div className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-widest`}>
                                                    {opt.isOwner ? 'Owner' : (opt.roleName || 'Staff')}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Salary Info *</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={newEmpData.salary.amount}
                                                onChange={(e) => handleEmpDataChange("salary", { ...newEmpData.salary, amount: e.target.value })}
                                                className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <CommonSelect
                                                options={[
                                                    { label: 'Monthly', value: 'monthly' },
                                                    { label: 'Daily', value: 'daily' }
                                                ]}
                                                value={newEmpData.salary.period}
                                                onChange={(val) => handleEmpDataChange("salary", { ...newEmpData.salary, period: val })}
                                                labelKey="label"
                                                valueKey="value"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Attendance Policy</label>
                                    <CommonSelect
                                        options={availablePolicies}
                                        value={newEmpData.attendancePolicyId}
                                        onChange={(val) => handleEmpDataChange("attendancePolicyId", val)}
                                        placeholder="Assign Policy"
                                        labelKey="name"
                                        valueKey="_id"
                                    />
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


                            <div className={`space-y-4 p-4 rounded-xl border ${theme.inputBorder} ${theme.inputBg}`}>
                                <h4 className={`text-sm font-black uppercase tracking-wider ${theme.textHeading} flex items-center gap-2`}>
                                    <ShieldCheck size={16} className={theme.primaryIconText} /> Branch Access
                                </h4>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="allBranchesToggle"
                                        checked={userAllBranches}
                                        onChange={(e) => {
                                            setUserAllBranches(e.target.checked);
                                            if (e.target.checked) setUserSelectedBranchIds([]);
                                        }}
                                        className={`w-5 h-5 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                    />
                                    <label htmlFor="allBranchesToggle" className={`text-sm font-bold ${theme.textPrimary} cursor-pointer`}>
                                        Full Shop Access (All Branches)
                                    </label>
                                </div>

                                {!userAllBranches && (
                                    <div className="animate-fadeIn space-y-2">
                                        <label className={`block text-xs font-bold ${theme.textSecondary}`}>Select Accessible Branches</label>
                                        <div className={`border ${theme.inputBorder} rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 ${theme.surfaceBg}`}>
                                            {branches.length > 0 ? branches.map(branch => (
                                                <div key={branch._id} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={userSelectedBranchIds.includes(branch._id)}
                                                        onChange={() => handleUserBranchSelection(branch._id)}
                                                        className={`w-4 h-4 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                    />
                                                    <span className={`text-sm ${theme.textPrimary}`}>{branch.name}</span>
                                                </div>
                                            )) : <p className={`text-sm ${theme.textSecondary}`}>No branches found.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Mobile Number (Either Phone or Email Required)</label>
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
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Role *</label>
                                    <CommonSelect
                                        options={roles}
                                        value={editEmpData.roleId}
                                        onChange={(val) => handleEditEmpDataChange("roleId", val)}
                                        placeholder="Select Role"
                                        labelKey="name"
                                        valueKey="_id"
                                        required={true}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Reporting To</label>
                                    <CommonSelect
                                        options={potentialManagers}
                                        value={editEmpData.reportingTo}
                                        onChange={(val) => handleEditEmpDataChange("reportingTo", val)}
                                        placeholder="Select Manager"
                                        labelKey="name"
                                        valueKey="_id"
                                        renderOption={(opt) => (
                                            <div className="flex flex-col">
                                                <div className={`font-black ${theme.textPrimary}`}>{opt.name}</div>
                                                <div className={`text-[10px] font-bold ${theme.textSecondary} uppercase tracking-widest`}>
                                                    {opt.isOwner ? 'Owner' : (opt.roleName || 'Staff')}
                                                </div>
                                            </div>
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Status</label>
                                    <CommonSelect
                                        options={[
                                            { label: 'Active', value: 'ACTIVE' },
                                            { label: 'Inactive', value: 'INACTIVE' },
                                            { label: 'On Leave', value: 'ON_LEAVE' }
                                        ]}
                                        value={editEmpData.status}
                                        onChange={(val) => handleEditEmpDataChange("status", val)}
                                        placeholder="Select Status"
                                        labelKey="label"
                                        valueKey="value"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Salary Info *</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="number"
                                                value={editEmpData.salary.amount}
                                                onChange={(e) => handleEditEmpDataChange("salary", { ...editEmpData.salary, amount: e.target.value })}
                                                className={`w-full p-3 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none ${theme.inputFocus}`}
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                        <div className="w-1/3">
                                            <CommonSelect
                                                options={[
                                                    { label: 'Monthly', value: 'monthly' },
                                                    { label: 'Daily', value: 'daily' }
                                                ]}
                                                value={editEmpData.salary.period}
                                                onChange={(val) => handleEditEmpDataChange("salary", { ...editEmpData.salary, period: val })}
                                                labelKey="label"
                                                valueKey="value"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-sm font-bold ${theme.textSecondary} mb-1`}>Attendance Policy</label>
                                    <CommonSelect
                                        options={availablePolicies}
                                        value={editEmpData.attendancePolicyId}
                                        onChange={(val) => handleEditEmpDataChange("attendancePolicyId", val)}
                                        placeholder="Assign Policy"
                                        labelKey="name"
                                        valueKey="_id"
                                    />
                                </div>
                            </div>


                            <div className={`space-y-4 p-4 rounded-xl border ${theme.inputBorder} ${theme.inputBg}`}>
                                <h4 className={`text-sm font-black uppercase tracking-wider ${theme.textHeading} flex items-center gap-2`}>
                                    <ShieldCheck size={16} className={theme.primaryIconText} /> Branch Access
                                </h4>

                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="editAllBranchesToggle"
                                        checked={editUserAllBranches}
                                        onChange={(e) => {
                                            setEditUserAllBranches(e.target.checked);
                                            if (e.target.checked) setEditUserSelectedBranchIds([]);
                                        }}
                                        className={`w-5 h-5 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                    />
                                    <label htmlFor="editAllBranchesToggle" className={`text-sm font-bold ${theme.textPrimary} cursor-pointer`}>
                                        Full Shop Access (All Branches)
                                    </label>
                                </div>

                                {!editUserAllBranches && (
                                    <div className="animate-fadeIn space-y-2">
                                        <label className={`block text-xs font-bold ${theme.textSecondary}`}>Select Accessible Branches</label>
                                        <div className={`border ${theme.inputBorder} rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 ${theme.surfaceBg}`}>
                                            {branches.length > 0 ? branches.map(branch => (
                                                <div key={branch._id} className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={editUserSelectedBranchIds.includes(branch._id)}
                                                        onChange={() => handleEditUserBranchSelection(branch._id)}
                                                        className={`w-4 h-4 ${theme.primaryIconText.replace('text-', 'text-')} rounded ${theme.inputFocus}`}
                                                    />
                                                    <span className={`text-sm ${theme.textPrimary}`}>{branch.name}</span>
                                                </div>
                                            )) : <p className={`text-sm ${theme.textSecondary}`}>No branches found.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

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
            <SubscriptionNoticeModal
                isOpen={isSubscriptionNoticeOpen}
                onClose={() => setIsSubscriptionNoticeOpen(false)}
                user={user}
                isStaff={!(user?.isOwner || user?.isSuperAdmin || user?.roles?.some(r => ['owner', 'admin'].includes((r?.name || "").toLowerCase())))}
            />
            <AttendanceCorrectionModal 
                isOpen={isCorrectionModalOpen}
                onClose={() => setIsCorrectionModalOpen(false)}
                log={selectedLogForCorrection}
                onApprove={(id) => handleCorrectionAction(id, 'APPROVED')}
                onReject={(id, reason) => handleCorrectionAction(id, 'REJECTED', reason)}
            />
        </div>
    );
};

export default Staff;
