import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, MapPin, CheckCircle2, LogIn, LogOut, Calendar, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { usePermission } from "../../auth/usePermission";
import { attendanceService, branchService, employeeService, shopService } from "../../services/api";
import CommonSelect from "../../components/ui/CommonSelect";
import CommonDialog from "../../components/modals/CommonDialog";

const StaffDashboard = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [shopId, setShopId] = useState(null);
    const [branches, setBranches] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [loading, setLoading] = useState(false);
    const [lastLog, setLastLog] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
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
    // For self-service dashboard, we lock the employee to the current user and the branch to their primary branch.
    useEffect(() => {

        const loadEmployeeAndBranch = async () => {
            if (!shopId || !currentUserId) return;
            try {
                const staff = await employeeService.getEmployeesByShopId(shopId, false);
                const ownEmp = (staff || []).find((e) => {
                    const u = e.userId || {};
                    return (u._id || u.id) === currentUserId;
                });

                setEmployees(staff || []);

                if (ownEmp) {
                    setSelectedEmployeeId(ownEmp._id || ownEmp.id);
                    // If the employee has a primary branch, use it. Otherwise, rely on the first loaded branch.
                    if (ownEmp.branchId) {
                        setSelectedBranchId(ownEmp.branchId);
                    }
                } else {
                    console.warn("Current user does not have an employee record in this shop.");
                    setError("No employee record found for your user. Please contact support.");
                }
            } catch (err) {
                console.error("Failed to load employee data for staff dashboard:", err);
                setError("Failed to load your employee data. Please try again.");
            }
        };
        loadEmployeeAndBranch();
    }, [shopId, currentUserId]); // Dependencies are shopId and currentUserId to ensure it runs when these are available.

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

    // Fetch recent 3 attendance records
    useEffect(() => {
        const fetchRecentLogs = async () => {
            if (!selectedEmployeeId) return;
            try {
                // Fetch for a wider range but limit display
                const logs = await attendanceService.getLogs({
                    employeeId: selectedEmployeeId,
                    limit: 10 // Request enough to pick 3
                });
                setRecentLogs(logs?.slice(0, 4).filter(l => l._id !== lastLog?._id) || []);
            } catch (err) {
                console.error("Failed to fetch recent logs:", err);
            }
        };
        fetchRecentLogs();
    }, [selectedEmployeeId, lastLog]);

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

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState(null);

    const handleRequestCorrection = (logId) => {
        setSelectedLogId(logId);
        setIsDialogOpen(true);
    };

    const confirmCorrectionRequest = async (reason) => {
        if (!reason || !selectedLogId) return;
        setLoading(true);
        try {
            await attendanceService.requestCorrection(selectedLogId, reason);
            const today = new Date().toLocaleDateString('en-CA');
            const logs = await attendanceService.getLogs({
                employeeId: selectedEmployeeId,
                branchId: selectedBranchId,
                startDate: today,
                endDate: today
            });
            if (logs && logs.length > 0) setLastLog(logs[0]);
            toast.success("Correction request submitted!");
        } catch (err) {
            console.error("Correction request failed:", err);
            toast.error(err?.message || "Failed to submit request");
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

            <div className="grid gap-6 w-full">
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
                        {/* Selectors removed as per user request: attendance is global and self-service only */}
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

                <div className={`${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} p-6 md:p-8`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`text-xs font-black uppercase tracking-widest ${theme.textSecondary} flex items-center gap-2`}>
                            <Clock size={14} className={theme.primaryIconText} /> Recent Attendance History
                        </div>
                        <button 
                            onClick={() => navigate('/my-attendance')}
                            className={`text-xs font-bold ${theme.primaryIconText} hover:underline`}
                        >
                            View Full History
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentLogs.length > 0 ? recentLogs.slice(0, 3).map((log, idx) => (
                            <div 
                                key={log._id || idx}
                                className={`flex items-center justify-between p-4 rounded-2xl border ${theme.sectionBorder} ${theme.sectionBg} hover:shadow-md transition-shadow`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${theme.primaryIconBg} ${theme.primaryIconText}`}>
                                        <CheckCircle2 size={20} />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-black ${theme.textPrimary}`}>
                                            {new Date(log.checkInAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className={`text-[11px] font-bold ${theme.textSecondary} uppercase tracking-tight`}>
                                            {log.branchId?.name || "Main Branch"}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-sm font-bold ${theme.textPrimary}`}>
                                        {new Date(log.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {log.checkOutAt ? new Date(log.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </div>
                                    {(() => {
                                        const hasRequest = !!log.correctionRequest?.status;
                                        const reqStatus = log.correctionRequest?.status;
                                        const isMispunch = (log.status === 'MISPUNCH' || (!log.checkOutAt && new Date(log.checkInAt).toLocaleDateString() !== new Date().toLocaleDateString())) && reqStatus !== 'APPROVED';
                                        
                                        const isInProgress = !log.checkOutAt && !isMispunch && !hasRequest;
                                        const durationText = log.workMinutes ? `${Math.floor(log.workMinutes / 60)}h ${log.workMinutes % 60}m` : (isInProgress ? 'In Progress' : (reqStatus === 'APPROVED' ? 'Fixed' : 'Mispunch'));
                                        const statusColor = (log.workMinutes > 0 || reqStatus === 'APPROVED') ? 'text-green-500' : (isMispunch ? 'text-red-500' : 'text-amber-500');

                                        return (
                                            <>
                                                <div className={`text-[11px] font-black ${statusColor}`}>
                                                    {durationText}
                                                </div>
                                                
                                                {hasRequest ? (
                                                    <div className="flex flex-col items-end gap-1 mt-1">
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                            reqStatus === 'PENDING' ? 'bg-indigo-100 text-indigo-700' :
                                                            reqStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {reqStatus}
                                                        </span>
                                                        {reqStatus === 'APPROVED' && (
                                                            <div className="text-[9px] font-bold text-gray-400 italic">
                                                                Fixed by Manager
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : isMispunch && (
                                                    <div className="flex flex-col items-end gap-1 mt-1">
                                                        <div className="text-[9px] bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-black mt-1 inline-block uppercase tracking-wider">
                                                            Mispunched
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRequestCorrection(log._id)}
                                                            className="text-[10px] font-black text-blue-600 hover:underline"
                                                        >
                                                            Request Correction
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                    <div className="flex flex-col items-end gap-0.5 mt-1">
                                        {log.checkInAddress && (
                                            <div className={`text-[9px] ${theme.textSecondary} italic max-w-[220px] line-clamp-1`}>
                                                In: {log.checkInAddress}
                                            </div>
                                        )}
                                        {log.checkOutAddress && (
                                            <div className={`text-[9px] ${theme.textSecondary} italic max-w-[220px] line-clamp-1`}>
                                                Out: {log.checkOutAddress}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className={`text-center py-6 text-sm ${theme.textSecondary} italic font-bold`}>
                                No recent logs found.
                            </div>
                        )}
                    </div>
                </div>
                {/* My Leaves Quick Link */}
                <div className={`${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} p-6 md:p-8 flex items-center justify-between group cursor-pointer hover:shadow-xl transition-all active:scale-95 mb-4`}
                    onClick={() => navigate('/my-leaves')}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform`}>
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className={`text-sm font-black ${theme.textPrimary}`}>My Leaves</div>
                            <div className={`text-[11px] font-bold ${theme.textSecondary} uppercase tracking-widest`}>Apply and Track Leaves</div>
                        </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${theme.primaryIconBg} ${theme.primaryIconText} opacity-100 transition-opacity`}>
                        <ChevronRight size={18} />
                    </div>
                </div>
            </div>

            <CommonDialog 
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onConfirm={confirmCorrectionRequest}
                title="Correction Request"
                message="Tell us why your attendance needs fixing (e.g., forgot to punch out). Your manager will review this request."
                type="prompt"
                placeholder="Reason for correction request..."
                confirmText="Submit Request"
            />
        </div>
    );
};

export default StaffDashboard;

