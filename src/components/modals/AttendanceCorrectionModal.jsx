import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Clock, User, Calendar, MessageSquare, MapPin } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const AttendanceCorrectionModal = ({ 
    isOpen, 
    onClose, 
    log, 
    onApprove, 
    onReject 
}) => {
    const { theme } = useTheme();
    const [rejectionReason, setRejectionReason] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    if (!isOpen || !log) return null;

    const req = log.correctionRequest;
    const employee = log.employeeId;
    const name = typeof employee === 'object' ? (employee.userId?.name || "Employee") : "Employee";
    const code = typeof employee === 'object' ? (employee.employeeCode || "") : "";

    const handleAction = async (status) => {
        if (status === 'REJECTED' && !rejectionReason.trim()) {
            return; // Maybe show a small validation or just block
        }
        setIsProcessing(true);
        try {
            await (status === 'APPROVED' ? onApprove(log._id) : onReject(log._id, rejectionReason));
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
                <div className={`p-8 border-b ${theme.borderLight} bg-gradient-to-r from-indigo-500/5 to-purple-500/5`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-3">
                                Review Correction
                            </div>
                            <h3 className={`text-2xl font-black ${theme.textHeading} leading-tight`}>
                                Attendance Fix Request
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
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                            <User size={28} />
                        </div>
                        <div>
                            <p className={`text-lg font-black ${theme.textHeading}`}>{name}</p>
                            <p className={`text-xs font-bold ${theme.textMuted}`}>{code} • {log.attendanceDate}</p>
                        </div>
                    </div>

                    {/* Request Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-5 rounded-3xl border ${theme.sectionBorder} ${theme.surfaceBg} space-y-2`}>
                            <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                <Clock size={12} className="text-gray-400" /> Current Record
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-green-600 font-bold uppercase">In:</span>
                                    <span className={theme.textPrimary}>{log.checkInAt ? new Date(log.checkInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-orange-600 font-bold uppercase">Out:</span>
                                    <span className={theme.textPrimary}>{log.checkOutAt ? new Date(log.checkOutAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`p-5 rounded-3xl border ${theme.sectionBorder} ${theme.surfaceBg} space-y-2`}>
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-wider">
                                <AlertCircle size={12} /> Status
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 rounded text-[10px] font-black w-fit uppercase ${
                                    log.status === 'MISS_PUNCH' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                    {log.status}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400">
                                    {log.workMinutes || 0} min tracked
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reason Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1">
                            <MessageSquare size={12} /> Reason for request
                        </div>
                        <div className={`p-6 rounded-3xl border-2 border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 italic text-sm ${theme.textPrimary} leading-relaxed`}>
                            &quot;{req?.reason}&quot;
                        </div>
                    </div>

                    {/* Rejection Reason Input (Optional) */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-wider pl-1 font-sans">
                            Rejection Reason (if rejecting)
                        </div>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Why are you rejecting this request? (Required for rejection)"
                            className={`w-full p-4 rounded-3xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} text-sm font-bold focus:border-red-400 outline-none transition-all placeholder:text-gray-400 min-h-[100px] resize-none`}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={`p-8 border-t ${theme.borderLight} ${theme.sectionBg} flex gap-4`}>
                    <button
                        onClick={() => handleAction('REJECTED')}
                        disabled={isProcessing || !rejectionReason.trim()}
                        className={`flex-1 py-5 px-6 rounded-3xl font-black text-xs uppercase tracking-[0.1em] text-red-500 border-2 border-red-100 hover:bg-red-50 transition-all disabled:opacity-30 disabled:grayscale`}
                    >
                        Reject Request
                    </button>
                    <button
                        onClick={() => handleAction('APPROVED')}
                        disabled={isProcessing}
                        className={`flex-1 py-5 px-6 rounded-3xl font-black text-xs uppercase tracking-[0.1em] text-white bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/30 transition-all disabled:opacity-50`}
                    >
                        {isProcessing ? "Processing..." : "Approve Fix"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCorrectionModal;
