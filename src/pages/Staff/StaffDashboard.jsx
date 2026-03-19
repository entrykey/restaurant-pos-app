import React, { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, CheckCircle2, LogIn, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePermission } from "../../auth/usePermission";
import { attendanceService, branchService, employeeService, shopService } from "../../services/api";

const StaffDashboard = () => {
    const { user } = useAuth();
    const { theme } = useTheme();

    const [shopId, setShopId] = useState(null);
    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [loading, setLoading] = useState(false);
    const [lastLog, setLastLog] = useState(null);
    const [error, setError] = useState("");

    const { can } = usePermission();
    const isManager = can("staff", "staff.edit") || can("DASHBOARD", "OWNER.DASHBOARD");

    const currentUserId = user?._id || user?.id;

    // Resolve shopId for current user
    useEffect(() => {
        const fetchShop = async () => {
            if (!currentUserId) return;
            try {
                const shopData = await shopService.getShopDataByUserId(currentUserId);
                const id = shopData.shop?._id || shopData.organization?._id || shopData._id;
                setShopId(id || null);
            } catch (err) {
                console.error("Failed to resolve shop for staff dashboard:", err);
            }
        };
        fetchShop();
    }, [currentUserId]);

    // Load branches allowed for current user
    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await branchService.getAllowedBranches();
                setBranches(data || []);
                if (!selectedBranchId && data && data.length > 0) {
                    setSelectedBranchId(data[0]._id);
                }
            } catch (err) {
                console.error("Failed to load branches for staff dashboard:", err);
            }
        };
        loadBranches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load employees for the shop and try to auto-pick current user's employee record
    useEffect(() => {
        const loadEmployees = async () => {
            if (!shopId) return;
            try {
                const staff = await employeeService.getEmployeesByShopId(shopId, false);
                setEmployees(staff || []);

                // If not a manager, keep it locked to current user
                if ((!selectedEmployeeId || !isManager) && currentUserId) {
                    const ownEmp = (staff || []).find((e) => {
                        const u = e.userId || {};
                        return (u._id || u.id) === currentUserId;
                    });
                    if (ownEmp) {
                        setSelectedEmployeeId(ownEmp._id || ownEmp.id);
                    }
                }
            } catch (err) {
                console.error("Failed to load employees for staff dashboard:", err);
            }
        };
        loadEmployees();
    }, [shopId, currentUserId, selectedEmployeeId, isManager]);

    const selectedEmployee = useMemo(
        () => employees.find((e) => (e._id || e.id) === selectedEmployeeId),
        [employees, selectedEmployeeId]
    );

    const getCurrentPosition = () => {
        return new Promise((resolve, reject) => {
            if (!("geolocation" in navigator)) {
                reject(new Error("Geolocation is not supported on this device."));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    resolve({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    });
                },
                (err) => reject(err),
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    };

    const [elapsedTime, setElapsedTime] = useState(0);

    // Resolve working time in seconds
    useEffect(() => {
        let interval;
        if (lastLog?.checkInAt && !lastLog?.checkOutAt) {
            interval = setInterval(() => {
                const start = new Date(lastLog.checkInAt).getTime();
                const now = Date.now();
                setElapsedTime(Math.floor((now - start) / 1000));
            }, 1000);
        } else if (lastLog?.workMinutes) {
            setElapsedTime(lastLog.workMinutes * 60);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [lastLog]);

    const formatElapsedTime = (totalSeconds) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
    };

    // Fetch today's log for the selected employee/branch to restore state
    useEffect(() => {
        const fetchTodayLog = async () => {
            if (!selectedEmployeeId || !selectedBranchId) return;
            try {
                // Use a stable YYYY-MM-DD that matches server-side branch logic
                const today = new Date().toLocaleDateString('en-CA');
                const logs = await attendanceService.getLogs({
                    employeeId: selectedEmployeeId,
                    branchId: selectedBranchId,
                    startDate: today,
                    endDate: today
                });
                if (logs && logs.length > 0) {
                    setLastLog(logs[0]);
                } else {
                    setLastLog(null);
                }
            } catch (err) {
                console.error("Failed to fetch today's log:", err);
            }
        };
        fetchTodayLog();
    }, [selectedEmployeeId, selectedBranchId]);

    const performPunch = async (type) => {
        if (!selectedBranchId || !selectedEmployeeId) {
            alert("Please select Branch and Employee first.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            let geoPayload = null;

            // Capture live location coordinates
            try {
                const coords = await getCurrentPosition();
                geoPayload = {
                    lat: coords.lat,
                    lng: coords.lng,
                    accuracy: coords.accuracy
                };
            } catch (geoErr) {
                console.warn("Failed to capture location for attendance:", geoErr);
                setError("Unable to read current location. Attendance saved without GPS.");
            }

            const payload = {
                employeeId: selectedEmployeeId,
                branchId: selectedBranchId,
                source: "POS",
                ...(geoPayload ? { geo: geoPayload } : {}),
            };
            let result;
            if (type === "IN") {
                result = await attendanceService.checkIn(payload);
            } else {
                result = await attendanceService.checkOut(payload);
            }
            setLastLog(result || null);
        } catch (err) {
            console.error("Staff dashboard punch failed:", err);
            setError(err?.message || "Failed to update attendance. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const friendlyDate = (iso) => {
        if (!iso) return "-";
        const d = new Date(iso);
        return d.toLocaleString();
    };

    const currentStatus = lastLog?.status || "—";

    return (
        <div className={`p-4 md:p-8 min-h-[calc(100vh-64px)] flex flex-col ${theme.pageBg}`}>
            <div className="mb-6">
                <h1 className={`text-2xl md:text-3xl font-black flex items-center gap-2 ${theme.textHeading}`}>
                    <Clock className={theme.primaryIconText} /> Staff Dashboard
                </h1>
                <p className={`mt-1 text-sm ${theme.textSecondary}`}>
                    Quick self-punch-in and punch-out. More staff insights will appear here later.
                </p>
            </div>

            <div className="grid gap-6 max-w-4xl">
                <div className={`${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} p-6 md:p-8`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <div className={`text-xs font-black uppercase tracking-widest ${theme.textSecondary}`}>
                                Today&apos;s Attendance
                            </div>
                            <div className={`text-xl md:text-2xl font-black mt-1 ${theme.textHeading}`}>
                                {selectedEmployee?.userId?.name || user?.name || "Select Employee"}
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold ${theme.textSecondary}`}>Branch</span>
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => setSelectedBranchId(e.target.value)}
                                    disabled={!isManager && branches.length <= 1}
                                    className={`mt-1 p-2.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} outline-none ${theme.inputFocus} text-sm font-bold min-w-[180px] disabled:opacity-70 disabled:cursor-not-allowed`}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map((b) => (
                                        <option key={b._id} value={b._id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-xs font-bold ${theme.textSecondary}`}>Employee</span>
                                <select
                                    value={selectedEmployeeId}
                                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                    disabled={!isManager}
                                    className={`mt-1 p-2.5 rounded-xl border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} outline-none ${theme.inputFocus} text-sm font-bold min-w-[200px] disabled:opacity-70 disabled:cursor-not-allowed`}
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map((e) => (
                                        <option key={e._id || e.id} value={e._id || e.id}>
                                            {e.userId?.name || "Employee"} ({e.employeeCode || e._id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                        <div className={`${theme.sectionBg} border ${theme.sectionBorder} rounded-2xl p-4 flex flex-col gap-1`}>
                            <div className={`text-xs font-bold ${theme.textSecondary}`}>Status</div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className={theme.primaryIconText} size={18} />
                                <span className={`text-base font-bold ${theme.textPrimary}`}>{currentStatus}</span>
                            </div>
                        </div>
                        <div className={`${theme.sectionBg} border ${theme.sectionBorder} rounded-2xl p-4 flex flex-col gap-1`}>
                            <div className={`text-xs font-bold ${theme.textSecondary}`}>Working Hours</div>
                            <div className="flex items-center gap-2">
                                <Clock className="text-blue-500" size={18} />
                                <span className={`text-base font-bold ${theme.textPrimary}`}>
                                    {formatElapsedTime(elapsedTime)}
                                </span>
                            </div>
                        </div>
                        <div className={`${theme.sectionBg} border ${theme.sectionBorder} rounded-2xl p-4 flex flex-col gap-1`}>
                            <div className={`text-xs font-bold ${theme.textSecondary}`}>Punch-in</div>
                            <div className={`text-sm font-semibold ${theme.textPrimary}`}>
                                {friendlyDate(lastLog?.checkInAt)}
                            </div>
                            {lastLog?.checkInAddress && (
                                <div className={`text-[11px] mt-1 ${theme.textSecondary} leading-tight line-clamp-2 italic`}>
                                    {lastLog.checkInAddress}
                                </div>
                            )}
                            {lastLog?.checkInGeo?.lat && !lastLog?.checkInAddress && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 font-mono">
                                    <MapPin size={10} />
                                    {lastLog.checkInGeo.lat.toFixed(4)}, {lastLog.checkInGeo.lng.toFixed(4)}
                                </div>
                            )}
                        </div>
                        <div className={`${theme.sectionBg} border ${theme.sectionBorder} rounded-2xl p-4 flex flex-col gap-1`}>
                            <div className={`text-xs font-bold ${theme.textSecondary}`}>Punch-out</div>
                            <div className={`text-sm font-semibold ${theme.textPrimary}`}>
                                {friendlyDate(lastLog?.checkOutAt)}
                            </div>
                            {lastLog?.checkOutAddress && (
                                <div className={`text-[11px] mt-1 ${theme.textSecondary} leading-tight line-clamp-2 italic`}>
                                    {lastLog.checkOutAddress}
                                </div>
                            )}
                            {lastLog?.checkOutGeo?.lat && !lastLog?.checkOutAddress && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 font-mono">
                                    <MapPin size={10} />
                                    {lastLog.checkOutGeo.lat.toFixed(4)}, {lastLog.checkOutGeo.lng.toFixed(4)}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className={`mb-4 p-3 rounded-xl ${theme.errorBg} ${theme.errorText} text-sm font-bold`}>
                            {error}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-4">
                        <button
                            type="button"
                            disabled={loading || !!lastLog?.checkInAt}
                            onClick={() => performPunch("IN")}
                            className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm ${theme.buttonBg} ${theme.buttonText} ${theme.buttonHoverBg} shadow disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <LogIn size={18} /> {loading ? "Working..." : "Punch In"}
                        </button>
                        <button
                            type="button"
                            disabled={loading || !lastLog?.checkInAt || !!lastLog?.checkOutAt}
                            onClick={() => performPunch("OUT")}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-orange-500 text-white hover:bg-orange-600 shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LogOut size={18} /> {loading ? "Working..." : "Punch Out"}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                            <MapPin size={14} />
                            <span>GPS rules can be added later if needed.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffDashboard;

