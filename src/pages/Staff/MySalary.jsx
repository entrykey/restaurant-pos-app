import React, { useState, useEffect } from 'react';
import { Wallet, Info, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { payrollService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const MySalary = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [salaryRecords, setSalaryRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedRecord, setExpandedRecord] = useState(null);

    useEffect(() => {
        const fetchMySalary = async () => {
            try {
                const data = await payrollService.getMySalary();
                setSalaryRecords(data);
            } catch (err) {
                console.error("Failed to fetch salary records", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMySalary();
    }, []);

    if (isLoading) {
        return (
            <div className={`min-h-screen ${theme.bg} p-8 flex justify-center items-center`}>
                <Wallet className="animate-bounce text-indigo-600" size={48} />
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${theme.bg} p-4 md:p-10 space-y-10 animate-fadeIn w-full`}>
            {/* Header Section */}
            <div className="w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20`}>
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h1 className={`text-4xl font-black ${theme.textHeading} tracking-tight`}>My Earnings</h1>
                            <p className={`${theme.textSecondary} mt-1 font-bold text-lg opacity-70 uppercase tracking-[0.1em]`}>Payroll & Compensation History</p>
                        </div>
                    </div>
                </div>

                {salaryRecords.length === 0 ? (
                    <div className={`p-24 rounded-[3rem] border-4 border-dashed ${theme.borderLight} flex flex-col items-center justify-center text-center space-y-6 w-full`}>
                        <div className={`w-24 h-24 rounded-[2rem] ${theme.inputBg} flex items-center justify-center shadow-inner`}>
                            <Wallet className={theme.textSecondary} size={48} />
                        </div>
                        <div className="space-y-2">
                            <p className={`text-2xl font-black ${theme.textPrimary}`}>No salary records found yet.</p>
                            <p className={`${theme.textSecondary} max-w-sm font-medium`}>Your payroll information will appear here once processed by your manager for the current cycle.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {salaryRecords.map((record) => {
                            const perDay = Math.round(record.baseSalary / record.totalWorkingDays);
                            const deduction = record.baseSalary - record.calculatedSalary;
                            const isDeducted = deduction > 0;

                            return (
                                <div 
                                    key={record._id}
                                    className={`rounded-[2.5rem] border ${theme.borderLight} ${theme.surfaceBg} shadow-xl shadow-black/5 overflow-hidden transition-all duration-500 hover:shadow-2xl ${expandedRecord === record._id ? 'ring-4 ring-indigo-500/30 scale-[1.01]' : ''}`}
                                >
                                    <div 
                                        className="p-8 flex flex-wrap items-center justify-between gap-6 cursor-pointer"
                                        onClick={() => setExpandedRecord(expandedRecord === record._id ? null : record._id)}
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className={`w-16 h-16 rounded-3xl ${
                                                record.status === 'PAID' ? 'bg-emerald-500 text-white' : 
                                                record.status === 'PENDING' ? 'bg-orange-500 text-white' : 
                                                'bg-indigo-600 text-white'
                                            } flex items-center justify-center shrink-0 shadow-lg`}>
                                                <FileText size={32} />
                                            </div>
                                            <div>
                                                <div className={`font-black text-2xl ${theme.textPrimary} tracking-tight`}>{record.month}</div>
                                                <div className={`flex items-center gap-2 mt-1`}>
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                        record.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                                                        record.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 
                                                        'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                        {record.status}
                                                    </span>
                                                    <span className={`text-xs font-bold ${theme.textSecondary}`}>Net Disbursement</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10">
                                            <div className="text-right">
                                                <div className={`text-4xl font-black ${theme.textPrimary}`}>₹{record.calculatedSalary.toLocaleString()}</div>
                                                {isDeducted && (
                                                    <div className="text-xs font-black text-red-500 uppercase tracking-wider flex items-center justify-end gap-1">
                                                        <AlertCircle size={12} /> -₹{deduction.toLocaleString()} Deduction
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`w-12 h-12 rounded-full ${theme.inputBg} flex items-center justify-center shadow-inner transition-transform duration-300 ${expandedRecord === record._id ? 'rotate-180' : ''}`}>
                                                <ChevronDown className={theme.textSecondary} />
                                            </div>
                                        </div>
                                    </div>

                                    {expandedRecord === record._id && (
                                        <div className={`p-10 border-t ${theme.borderLight} bg-gray-50/50 flex flex-col gap-10 animate-in slide-in-from-top-4 duration-500`}>
                                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                                {/* Stats Card */}
                                                <div className="space-y-6">
                                                    <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textSecondary} flex items-center gap-2`}>
                                                        <Info size={16} className="text-indigo-600" /> Attendance Summary
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-5 rounded-3xl bg-white border border-indigo-100 shadow-sm">
                                                            <div className="text-[10px] font-black text-indigo-600 uppercase">Work Days</div>
                                                            <div className={`text-2xl font-black ${theme.textPrimary}`}>{record.totalWorkingDays}</div>
                                                        </div>
                                                        <div className="p-5 rounded-3xl bg-white border border-emerald-100 shadow-sm">
                                                            <div className="text-[10px] font-black text-emerald-600 uppercase">Present</div>
                                                            <div className={`text-2xl font-black ${theme.textPrimary}`}>{record.presentDays}</div>
                                                        </div>
                                                        <div className="p-5 rounded-3xl bg-white border border-indigo-100 shadow-sm">
                                                            <div className="text-[10px] font-black text-indigo-600 uppercase">Paid Leave</div>
                                                            <div className={`text-2xl font-black ${theme.textPrimary}`}>{record.paidLeaves}</div>
                                                        </div>
                                                        <div className="p-5 rounded-3xl bg-white border border-red-100 shadow-sm">
                                                            <div className="text-[10px] font-black text-red-600 uppercase">Unpaid/LOP</div>
                                                            <div className={`text-2xl font-black ${theme.textPrimary}`}>{record.unpaidLeaves}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Calculation Logic Card */}
                                                <div className="lg:col-span-2 space-y-6">
                                                    <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.textSecondary} flex items-center gap-2`}>
                                                        <CheckCircle2 size={16} className="text-emerald-600" /> Disbursement Logic
                                                    </h4>
                                                    <div className="p-8 rounded-[2rem] bg-white border border-gray-200 shadow-xl space-y-6">
                                                        <div className="flex flex-wrap justify-between items-center gap-6">
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Monthly Salary</span>
                                                                <div className="text-3xl font-black text-gray-900">₹{record.baseSalary.toLocaleString()}</div>
                                                            </div>
                                                            <div className="hidden sm:block text-gray-200">|</div>
                                                            <div className="space-y-1">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Per Day Value</span>
                                                                <div className="text-2xl font-black text-gray-800">₹{perDay.toLocaleString()}</div>
                                                            </div>
                                                        </div>

                                                        {isDeducted && (
                                                            <div className="p-6 rounded-[1.5rem] bg-red-50 border border-red-100 space-y-3">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-sm font-black text-red-700 uppercase">Deduction Split-up (Lost)</span>
                                                                    <span className="font-black text-red-600 text-lg">- ₹{deduction.toLocaleString()}</span>
                                                                </div>
                                                                <div className="text-xs font-bold text-red-500/70 leading-relaxed">
                                                                    Reason: {record.unpaidLeaves > 0 ? `${record.unpaidLeaves} Unpaid Leave(s) deducted based on LOP policy.` : 'Attendance mismatch or partial day deductions.'}
                                                                    <br />
                                                                    Formula: ({record.unpaidLeaves} days) × ₹{perDay} daily rate.
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between pt-6 border-t-2 border-indigo-50">
                                                            <div>
                                                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Final Net Payable</span>
                                                                <div className="text-4xl font-black text-indigo-700">₹{record.calculatedSalary.toLocaleString()}</div>
                                                            </div>
                                                            <div className="text-[10px] font-black tracking-widest uppercase py-2 px-4 bg-emerald-100 text-emerald-700 rounded-2xl shadow-sm">
                                                                Payment Processed
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Note from admin */}
                                            {record.remarks && (
                                                <div className="p-6 rounded-[1.5rem] bg-amber-50 border border-amber-100 flex gap-4 items-start">
                                                    <AlertCircle className="text-amber-600 shrink-0 mt-1" size={20} />
                                                    <div>
                                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-1 block">Staff Note</span>
                                                        <p className={`text-sm font-bold text-amber-800 leading-relaxed`}>{record.remarks}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Footer Info */}
                                            <div className="flex flex-wrap gap-10 pt-4 border-t border-gray-200 font-bold text-xs uppercase tracking-widest text-gray-400">
                                                <div className="flex items-center gap-2"><Calendar size={14} /> Cycle: {new Date(record.periodStart).toLocaleDateString()} - {new Date(record.periodEnd).toLocaleDateString()}</div>
                                                <div className="flex items-center gap-2"><CheckCircle2 size={14} /> Paid On: {record.paymentDate ? new Date(record.paymentDate).toLocaleDateString() : 'Pending'}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MySalary;
