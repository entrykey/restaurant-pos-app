import React, { useState, useEffect } from "react";
import { Calendar, ArrowLeft, RefreshCw, Plus, X, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { leaveService } from "../../services/api";
import CommonTable from "../../components/CommonTable";
import CommonSelect from "../../components/ui/CommonSelect";

const MyLeaves = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        leaveType: 'CASUAL',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const fetchMyLeaves = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await leaveService.getMyLeaves();
            setLeaves(data || []);
        } catch (err) {
            console.error("Failed to fetch leaves:", err);
            setError(err?.message || "Failed to load leave history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyLeaves();
    }, []);

    const handleApplyLeave = async (e) => {
        e.preventDefault();
        try {
            await leaveService.applyLeave(formData);
            toast.success("Leave application submitted!");
            setIsApplyModalOpen(false);
            setFormData({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });
            fetchMyLeaves();
        } catch (err) {
            toast.error(err?.message || "Failed to submit leave application");
        }
    };

    const handleDeleteLeave = async (id) => {
        if (!window.confirm("Delete this pending leave request?")) return;
        try {
            await leaveService.deleteLeave(id);
            toast.success("Request deleted");
            fetchMyLeaves();
        } catch (err) {
            toast.error(err?.message || "Failed to delete request");
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
                        <Calendar className={theme.primaryIconText} /> My Leave Requests
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsApplyModalOpen(true)}
                        className={`px-6 py-3 rounded-2xl ${theme.buttonBg} ${theme.buttonText} hover:opacity-90 font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-500/20`}
                    >
                        <Plus size={18} /> Apply Leave
                    </button>
                    <button 
                        onClick={fetchMyLeaves}
                        className={`p-3 rounded-2xl ${theme.surfaceBg} ${theme.textSecondary} border ${theme.borderLight} hover:opacity-90 transition-all`}
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
                        { 
                            header: "Duration", 
                            key: "startDate",
                            render: (_, l) => (
                                <div className="flex flex-col gap-0.5">
                                    <span className={`text-xs font-black ${theme.textPrimary}`}>
                                        {new Date(l.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span className={`text-[10px] font-bold ${theme.textMuted}`}>
                                        to {new Date(l.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            )
                        },
                        { 
                            header: "Type", 
                            key: "leaveType",
                            render: (val) => (
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400`}>
                                    {val}
                                </span>
                            )
                        },
                        { 
                            header: "Status", 
                            key: "status",
                            render: (val) => (
                                <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        val === 'APPROVED' ? 'bg-green-100 text-green-700 border border-green-200' :
                                        val === 'PENDING' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                        val === 'REJECTED' ? 'bg-red-100 text-red-700 border border-red-200' :
                                        'bg-gray-100 text-gray-700 border border-gray-200'
                                    }`}>
                                        {val}
                                    </span>
                                </div>
                            )
                        },
                        { 
                            header: "Days", 
                            key: "totalDays",
                            render: (v) => <span className="font-bold">{v} {v > 1 ? 'Days' : 'Day'}</span>
                        },
                        {
                            header: "Reason",
                            key: "reason",
                            render: (v) => <p className={`text-[11px] italic ${theme.textSecondary} max-w-[200px] line-clamp-1 truncate`} title={v}>{v}</p>
                        },
                        {
                            header: "Action",
                            key: "_id",
                            className: "text-right",
                            render: (_, l) => (
                                l.status === 'PENDING' && (
                                    <button 
                                        onClick={() => handleDeleteLeave(l._id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="Cancel Request"
                                    >
                                        <X size={18} />
                                    </button>
                                )
                            )
                        }
                    ]}
                    data={leaves}
                />
                
                {leaves.length === 0 && !loading && (
                    <div className="p-16 text-center">
                        <div className={`w-20 h-20 rounded-[2rem] ${theme.sectionBg} flex items-center justify-center mx-auto mb-6 shadow-inner`}>
                            <Calendar size={40} className="text-gray-300" />
                        </div>
                        <h3 className={`text-xl font-black ${theme.textHeading} mb-2`}>Plan Your Time Off</h3>
                        <p className={`text-sm ${theme.textSecondary} max-w-xs mx-auto`}>You haven't submitted any leave requests yet. Use the button above to apply.</p>
                    </div>
                )}
            </div>

            {/* Apply Leave Modal */}
            {isApplyModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsApplyModalOpen(false)} />
                    <div className={`relative w-full max-w-xl ${theme.surfaceBg} rounded-[40px] shadow-2xl border ${theme.borderLight} overflow-hidden animate-in fade-in zoom-in duration-300`}>
                        <div className={`p-8 border-b ${theme.borderLight} flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10`}>
                            <div>
                                <h3 className={`text-2xl font-black ${theme.textHeading}`}>Apply for Leave</h3>
                                <p className={`text-xs font-bold ${theme.textMuted} uppercase tracking-widest mt-1`}>Submit a new time-off request</p>
                            </div>
                            <button onClick={() => setIsApplyModalOpen(false)} className={`p-3 rounded-2xl ${theme.sectionBg} ${theme.textSecondary} hover:text-red-500 transition-all`}>
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleApplyLeave} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2 pl-1`}>Leave Type</label>
                                    <CommonSelect 
                                        options={[
                                            { label: 'Sick Leave', value: 'SICK' },
                                            { label: 'Casual Leave', value: 'CASUAL' },
                                            { label: 'Annual Leave', value: 'ANNUAL' },
                                            { label: 'Maternity Leave', value: 'MATERNITY' },
                                            { label: 'Other', value: 'OTHER' }
                                        ]}
                                        value={formData.leaveType}
                                        onChange={(val) => setFormData(prev => ({ ...prev, leaveType: val }))}
                                        placeholder="Select Type"
                                        labelKey="label"
                                        valueKey="value"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2 pl-1`}>Start Date</label>
                                    <input 
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                        className={`w-full p-4 rounded-[20px] border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} font-bold focus:border-indigo-500 outline-none transition-all`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2 pl-1`}>End Date</label>
                                    <input 
                                        type="date"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                        className={`w-full p-4 rounded-[20px] border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} font-bold focus:border-indigo-500 outline-none transition-all`}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className={`block text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2 pl-1`}>Reason</label>
                                    <textarea 
                                        required
                                        rows={4}
                                        value={formData.reason}
                                        onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                                        placeholder="Briefly explain why you need this leave..."
                                        className={`w-full p-5 rounded-[30px] border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} font-bold focus:border-indigo-500 outline-none transition-all resize-none placeholder:text-gray-400`}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsApplyModalOpen(false)}
                                    className={`flex-1 py-5 rounded-[25px] font-black uppercase text-xs tracking-[0.2em] ${theme.textSecondary} border-2 ${theme.borderLight} hover:bg-gray-50 transition-all`}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className={`flex-1 py-5 rounded-[25px] font-black uppercase text-xs tracking-[0.2em] text-white bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-500/30 transition-all`}
                                >
                                    Submit Application
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyLeaves;
