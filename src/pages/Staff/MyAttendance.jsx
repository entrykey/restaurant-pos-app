import React, { useState, useEffect } from "react";
import { Clock, Calendar, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { attendanceService } from "../../services/api";
import CommonTable from "../../components/CommonTable";
import CommonDialog from "../../components/modals/CommonDialog";
import DatePicker from "../../components/ui/DatePicker";

const MyAttendance = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchMyLogs = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await attendanceService.getMyLogs({
                startDate,
                endDate
            });
            setLogs(data || []);
        } catch (err) {
            console.error("Failed to fetch my attendance:", err);
            setError(err?.message || "Failed to load attendance logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyLogs();
    }, [startDate, endDate]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedLogId, setSelectedLogId] = useState(null);

    const handleRequestCorrection = (logId) => {
        setSelectedLogId(logId);
        setIsDialogOpen(true);
    };

    const confirmCorrectionRequest = async (reason) => {
        if (!reason || !selectedLogId) return;
        try {
            await attendanceService.requestCorrection(selectedLogId, reason);
            await fetchMyLogs();
            toast.success("Correction request submitted!");
        } catch (err) {
            console.error("Correction request failed:", err);
            toast.error(err?.message || "Failed to submit request");
        }
    };

    return (
        <div className={`p-4 md:p-8 min-h-[calc(100vh-64px)] flex flex-col ${theme.pageBg}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className={`flex items-center gap-2 text-sm font-bold ${theme.textSecondary} hover:${theme.primaryIconText} transition-colors mb-2`}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h2 className={`text-2xl md:text-3xl font-black flex items-center gap-3 ${theme.textHeading}`}>
                        <Calendar className={theme.primaryIconText} /> My Attendance Logs
                    </h2>
                </div>

                <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary}`}>From</label>
                        <DatePicker 
                            value={startDate}
                            onChange={(val) => setStartDate(val)}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold outline-none h-[38px] w-[140px]"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary}`}>To</label>
                        <DatePicker 
                            value={endDate}
                            onChange={(val) => setEndDate(val)}
                            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold outline-none h-[38px] w-[140px]"
                        />
                    </div>
                    <button 
                        onClick={fetchMyLogs}
                        className={`p-2.5 rounded-xl ${theme.buttonBg} ${theme.buttonText} hover:opacity-90`}
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 font-bold">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className={`${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} overflow-hidden`}>
                <CommonTable 
                    columns={[
                        { header: "Date", key: "attendanceDate", className: "font-mono font-bold" },
                        { 
                            header: "Times", 
                            key: "times",
                            render: (_, l) => (
                                <div className="text-xs">
                                    <div className="flex items-center gap-1">
                                        <span className="text-green-600 font-bold w-8">IN:</span>
                                        <span>{l.checkInAt ? new Date(l.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                        <span className="text-orange-600 font-bold w-8">OUT:</span>
                                        <span>{l.checkOutAt ? new Date(l.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                    </div>
                                </div>
                            )
                        },
                        { 
                            header: "Status", 
                            key: "status",
                            render: (val) => (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    val === 'PRESENT' ? 'bg-green-100 text-green-700 border border-green-200' :
                                    val === 'MISS_PUNCH' || val === 'MISPUNCH' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}>
                                    {val}
                                </span>
                            )
                        },
                        { 
                            header: "Work Time", 
                            key: "workMinutes",
                            render: (v) => v ? `${Math.floor(v/60)}h ${v%60}m` : '0h 0m',
                            className: "font-bold text-gray-500"
                        },
                        {
                            header: "Correction",
                            key: "correctionRequest",
                            render: (_, l) => {
                                const req = l.correctionRequest;
                                if (req && req.status) {
                                    return (
                                        <div className="flex flex-col gap-1">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black w-fit uppercase ${
                                                req.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                                req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                                {req.status}
                                            </span>
                                            <p className="text-[10px] italic text-gray-400 max-w-[100px] line-clamp-1" title={req.reason}>
                                                {req.reason}
                                            </p>
                                        </div>
                                    );
                                }
                                if (l.status === 'MISS_PUNCH' || l.status === 'MISPUNCH' || (!l.checkOutAt && l.attendanceDate < new Date().toLocaleDateString('en-CA'))) {
                                    return (
                                        <button 
                                            onClick={() => handleRequestCorrection(l._id)}
                                            className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <AlertCircle size={12} /> Request Fix
                                        </button>
                                    );
                                }
                                return null;
                            }
                        }
                    ]}
                    data={logs}
                />
                
                {logs.length === 0 && !loading && (
                    <div className="p-12 text-center">
                        <div className={`w-16 h-16 rounded-full ${theme.sectionBg} flex items-center justify-center mx-auto mb-4`}>
                            <Clock size={32} className="text-gray-300" />
                        </div>
                        <h3 className={`font-black ${theme.textHeading}`}>No Attendance Records</h3>
                        <p className={`text-sm ${theme.textSecondary}`}>Your attendance history for the selected period will appear here.</p>
                    </div>
                )}
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

export default MyAttendance;
