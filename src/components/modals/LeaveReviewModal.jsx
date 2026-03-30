import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, User, Calendar, MessageSquare, Briefcase } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const LeaveReviewModal = ({ 
    isOpen, 
    onClose, 
    leave, 
    onApprove, 
    onReject 
}) => {
    const { theme } = useTheme();
    const [managerResponse, setManagerResponse] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen || !leave) return null;

    const employee = leave.employeeId;
    const name = typeof employee === 'object' ? (employee.userId?.name || "Employee") : "Employee";
    const code = typeof employee === 'object' ? (employee.employeeCode || "") : "";

    const handleAction = async (status) => {
        if (status === 'REJECTED' && !managerResponse.trim()) {
            return;
        }
        setIsProcessing(true);
        try {
            if (status === 'APPROVED') {
                await onApprove(leave._id, managerResponse);
            } else {
                await onReject(leave._id, managerResponse);
            }
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />
            
            <div className={`relative w-full max-w-xl ${theme.surfaceBg} rounded-[40px] shadow-2xl border ${theme.borderLight} overflow-hidden animate-in fade-in zoom-in duration-300`}>
                {/* Header Section */}
                <div className={`p-8 border-b ${theme.borderLight} bg-gradient-to-r from-emerald-500/5 to-teal-500/5`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3">
                                Review Leave Request
                            </div>
                            <h3 className={`text-2xl font-black ${theme.textHeading} leading-tight`}>
                                Time-Off Approval
                            </h3>
                        </div>
                        <button 
                            onClick={onClose}
                            className={`p-2 rounded-2xl ${theme.sectionBg} ${theme.textSecondary} hover:text-red-500 transition-colors`}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                    {/* Employee Profile Preview */}
                    <div className={`flex items-center gap-4 p-5 rounded-3xl ${theme.sectionBg} border ${theme.sectionBorder}`}>
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                            <User size={28} />
                        </div>
                        <div>
                            <p className={`text-lg font-black ${theme.textHeading}`}>{name}</p>
                            <p className={`text-xs font-bold ${theme.textMuted}`}>{code} • Request Details</p>
                        </div>
                    </div>

                    {/* Leave Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-5 rounded-3xl border ${theme.sectionBorder} ${theme.surfaceBg} space-y-2`}>
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                <Calendar size={12} className="text-gray-400" /> Duration
                            </div>
                            <div className="space-y-1">
                                <div className="text-sm font-black text-emerald-600">
                                    {leave.totalDays} {leave.totalDays > 1 ? 'Days' : 'Day'}
                                </div>
                                <div className={`text-[11px] font-bold ${theme.textMuted}`}>
                                    {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div className={`p-5 rounded-3xl border ${theme.sectionBorder} ${theme.surfaceBg} space-y-2`}>
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                                <Briefcase size={12} /> Leave Type
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded text-[10px] font-black w-fit uppercase bg-emerald-100/50 text-emerald-700`}>
                                    {leave.leaveType}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400">
                                    Pending Review
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reason Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">
                            <MessageSquare size={12} /> Employee Reason
                        </div>
                        <div className={`p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 italic text-sm ${theme.textPrimary} leading-relaxed`}>
                           &quot;{leave.reason}&quot;
                        </div>
                    </div>

                    {/* Review Response Section */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1 font-sans">
                            Manager Response / Reason (required for rejection)
                        </div>
                        <textarea
                            value={managerResponse}
                            onChange={(e) => setManagerResponse(e.target.value)}
                            placeholder="Add any internal comments or specific reasons for your decision..."
                            className={`w-full p-4 rounded-3xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} text-sm font-bold focus:border-emerald-400 outline-none transition-all placeholder:text-gray-400 min-h-[100px] resize-none`}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={`p-8 border-t ${theme.borderLight} ${theme.sectionBg} flex gap-4`}>
                    <button
                        onClick={() => handleAction('REJECTED')}
                        disabled={isProcessing || !managerResponse.trim()}
                        className={`flex-1 py-5 px-6 rounded-3xl font-black text-xs uppercase tracking-[0.1em] text-red-500 border-2 border-red-100 hover:bg-red-50 transition-all disabled:opacity-30 disabled:grayscale`}
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => handleAction('APPROVED')}
                        disabled={isProcessing}
                        className={`flex-1 py-5 px-6 rounded-3xl font-black text-xs uppercase tracking-[0.1em] text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-50`}
                    >
                        {isProcessing ? "Processing..." : "Approve Leave"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeaveReviewModal;
