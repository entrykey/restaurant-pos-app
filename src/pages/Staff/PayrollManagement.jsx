import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Plus, RefreshCw, Settings, Trash2, CheckCircle, Clock, X, ChevronDown, ChevronUp, Landmark, Coins, CreditCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import CommonTable from '../../components/CommonTable';
import CommonSelect from '../../components/ui/CommonSelect';
import { payrollService } from '../../services/api';
import { useApp } from '../../context/AppContext';


const PayrollManagement = ({ theme, shopId, canManageSalary }) => {
    const { formatCurrency } = useApp();
    const [payrollData, setPayrollData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [selectedIds, setSelectedIds] = useState([]);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedBreakdown, setExpandedBreakdown] = useState(null);
    
    // Settings state
    const [settings, setSettings] = useState({
        periodStartDay: 1,
        periodEndDay: 30,
        salaryBasis: 'monthly',
        workingDaysInMonth: 30
    });

    const fetchPayroll = React.useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await payrollService.getPayroll(selectedMonth, shopId);
            setPayrollData(data);
        } catch (err) {
            toast.error("Failed to fetch payroll");
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, shopId]);

    const fetchSettings = React.useCallback(async () => {
        try {
            const data = await payrollService.getSettings(shopId);
            if (data) setSettings(data);
        } catch (err) {
            console.error("Failed to fetch payroll settings");
        }
    }, [shopId]);

    useEffect(() => {
        fetchPayroll();
        fetchSettings();
    }, [fetchPayroll, fetchSettings]);

    const handleGenerate = async () => {
        try {
            setIsLoading(true);
            await payrollService.generatePayroll(selectedMonth, shopId);
            toast.success("Payroll generated successfully");
            fetchPayroll();
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || "Failed to generate payroll");
        } finally {
            setIsLoading(false);
        }
    };


    const handleBulkPay = async () => {
        try {
            setIsProcessing(true);
            for (const id of selectedIds) {
                await payrollService.updateStatus(id, 'PAID');
            }
            toast.success("Bulk payment processed successfully");
            setIsPayModalOpen(false);
            setSelectedIds([]);
            fetchPayroll();
        } catch (err) {
            toast.error("Some payments failed to process");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        try {
            await payrollService.deletePayroll(id);
            toast.success("Record deleted");
            fetchPayroll();
        } catch (err) {
            toast.error("Deletion failed");
        }
    };

    const handleSaveSettings = async () => {
        try {
            await payrollService.saveSettings(shopId, settings);
            toast.success("Settings saved");
            setIsSettingsOpen(false);
        } catch (err) {
            toast.error("Failed to save settings");
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header / Controls */}
            <div className={`p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4 ${theme.surfaceBg}`}>
                <div className="flex items-center gap-4">
                    <input 
                        type="month" 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className={`p-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl outline-none`}
                    />
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50`}
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        Generate Payroll
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <button 
                            onClick={() => setIsPayModalOpen(true)}
                            className={`px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold flex items-center gap-2 hover:bg-emerald-700 animate-in zoom-in-50 duration-200`}
                        >
                            <Coins size={18} />
                            Pay Selected ({selectedIds.length})
                        </button>
                    )}
                    
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className={`p-3 rounded-xl ${theme.inputBg} ${theme.textSecondary} hover:${theme.textPrimary} border ${theme.inputBorder}`}
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Payroll Table */}
            <div className={`overflow-hidden rounded-[2rem] border ${theme.borderLight} ${theme.surfaceBg} shadow-sm`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${theme.pageBg} ${theme.textSecondary} text-[10px] uppercase font-black border-b ${theme.borderLight} tracking-widest`}>
                                <th className="p-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                const draftIds = payrollData.filter(d => d.status === 'DRAFT').map(d => d._id);
                                                setSelectedIds(draftIds);
                                            } else {
                                                setSelectedIds([]);
                                            }
                                        }}
                                        checked={selectedIds.length > 0 && selectedIds.length === payrollData.filter(d => d.status === 'DRAFT').length}
                                    />
                                </th>
                                <th className="p-4">Employee</th>
                                <th className="p-4">Period</th>
                                <th className="p-4">Presence</th>
                                <th className="p-4 text-right">Base Salary</th>
                                <th className="p-4 text-right">Final Amount</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${theme.borderLight}`}>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <RefreshCw className="animate-spin text-indigo-600" size={32} />
                                            <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>Processing Payroll...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : payrollData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                                <Wallet size={32} />
                                            </div>
                                            <h3 className={`text-lg font-black ${theme.textHeading}`}>No Records</h3>
                                            <p className={`text-xs ${theme.textSecondary}`}>Generate payroll for the selected month to view items.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : payrollData.map((item) => {
                                const isExpanded = expandedBreakdown === item._id;
                                return (
                                    <React.Fragment key={item._id}>
                                        <tr 
                                            onClick={() => setExpandedBreakdown(isExpanded ? null : item._id)}
                                            className={`group hover:bg-gray-50/50 transition-colors cursor-pointer ${isExpanded ? 'bg-indigo-50/20' : ''}`}
                                        >
                                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                                {item.status === 'DRAFT' && (
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        checked={selectedIds.includes(item._id)}
                                                        onChange={() => {
                                                            setSelectedIds(prev => prev.includes(item._id) ? prev.filter(id => id !== item._id) : [...prev, item._id]);
                                                        }}
                                                    />
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'} flex items-center justify-center font-black transition-colors`}>
                                                        {item.employeeId?.userId?.name?.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold ${theme.textPrimary}`}>{item.employeeId?.userId?.name}</span>
                                                        <span className={`text-[10px] ${theme.textSecondary}`}>{item.employeeId?.designation || 'Staff'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textPrimary}`}>
                                                        {new Date(item.periodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(item.periodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                    <span className={`text-[10px] font-medium ${theme.textSecondary}`}>Cycle Period</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3 text-[10px] font-black uppercase">
                                                    <span className="text-emerald-500 flex flex-col"><span>Pres</span><span>{item.presentDays}</span></span>
                                                    <span className="text-indigo-400 flex flex-col"><span>Paid</span><span>{item.paidLeaves}</span></span>
                                                    <span className="text-red-500 flex flex-col"><span>Unpd</span><span>{item.unpaidLeaves}</span></span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`text-sm font-bold ${theme.textSecondary}`}>{formatCurrency(item.baseSalary)}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`text-lg font-black text-indigo-600`}>{formatCurrency(item.calculatedSalary)}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${
                                                    item.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                                                    item.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end items-center gap-2">
                                                    {item.status === 'DRAFT' && (
                                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedIds([item._id]);
                                                                    setIsPayModalOpen(true);
                                                                }} 
                                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" 
                                                                title="Process Payment"
                                                            >
                                                                <CheckCircle size={20} />
                                                            </button>
                                                            <button onClick={() => handleDelete(item._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                                <Trash2 size={20} />
                                                            </button>
                                                        </div>
                                                    )}
                                                    <div className={`p-2 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-600' : theme.textSecondary}`}>
                                                        <ChevronDown size={20} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={8} className="p-0 border-none bg-transparent">
                                                    <div className={`p-8 bg-gray-50/50 border-y ${theme.borderLight} animate-in slide-in-from-top-2 duration-300`}>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                                                            <div className="space-y-4">
                                                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Attendance Split-up</h4>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="p-4 rounded-2xl bg-white border border-emerald-100">
                                                                        <span className="text-[10px] font-black text-emerald-600 block mb-1">PRESENT DAYS</span>
                                                                        <span className="text-2xl font-black text-gray-800">{item.presentDays} <span className="text-xs opacity-40">/{item.totalWorkingDays}</span></span>
                                                                    </div>
                                                                    <div className="p-4 rounded-2xl bg-white border border-indigo-100">
                                                                        <span className="text-[10px] font-black text-indigo-600 block mb-1">PAID LEAVES</span>
                                                                        <span className="text-2xl font-black text-gray-800">{item.paidLeaves}</span>
                                                                    </div>
                                                                    <div className="p-4 rounded-2xl bg-white border border-red-100">
                                                                        <span className="text-[10px] font-black text-red-600 block mb-1">UNPAID LEAVES</span>
                                                                        <span className="text-2xl font-black text-gray-800">{item.unpaidLeaves}</span>
                                                                    </div>
                                                                    <div className="p-4 rounded-2xl bg-white border border-orange-100">
                                                                        <span className="text-[10px] font-black text-orange-600 block mb-1">MISS PUNCHES</span>
                                                                        <span className="text-2xl font-black text-gray-800">{item.missPunches}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-4 md:col-span-2">
                                                                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-2 border-l-2 border-indigo-400">Salary Calculation Logic</h4>
                                                                <div className="p-8 rounded-[2rem] bg-indigo-50/30 border border-indigo-100/50 space-y-6 shadow-sm">
                                                                    <div className="flex flex-wrap justify-between items-center gap-6">
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base/Scale</span>
                                                                            <div className={`text-2xl font-black ${theme.textPrimary}`}>{formatCurrency(item.baseSalary)}</div>
                                                                        </div>
                                                                        <div className="hidden sm:block text-indigo-200">|</div>
                                                                        <div className="space-y-1">
                                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Value</span>
                                                                            <div className={`text-xl font-black ${theme.textPrimary}`}>{formatCurrency(Math.round(item.baseSalary / item.totalWorkingDays))}</div>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {item.baseSalary > item.calculatedSalary && (
                                                                        <div className="p-6 rounded-2xl bg-red-100/50 border border-red-200 space-y-2">
                                                                            <div className="flex justify-between items-center text-sm">
                                                                                <span className="font-extrabold text-red-700 uppercase tracking-tighter italic flex items-center gap-1">
                                                                                    <AlertCircle size={14} /> Exceptions Applied (Lost)
                                                                                </span>
                                                                                <span className="font-black text-red-600 text-lg">- {formatCurrency(item.baseSalary - item.calculatedSalary)}</span>
                                                                            </div>
                                                                            <div className="text-[10px] font-bold text-red-500 leading-relaxed pl-5 border-l border-red-300">
                                                                                Reason: {item.unpaidLeaves > 0 ? `${item.unpaidLeaves} day(s) LOP × ${formatCurrency(Math.round(item.baseSalary / item.totalWorkingDays))} rate.` : 'Manual adjustment or miss punch penalty applied.'}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    <div className="pt-6 border-t border-indigo-100 flex justify-between items-end">
                                                                        <div>
                                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Final Disbursement</span>
                                                                            <div className="text-4xl font-black text-indigo-700 tracking-tight">{formatCurrency(item.calculatedSalary)}</div>
                                                                        </div>
                                                                        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-2xl text-[10px] font-black tracking-widest uppercase">
                                                                            Draft Verified
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Pay Confirmation Modal */}
            {isPayModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-[2.5rem] w-full max-w-2xl shadow-2xl border ${theme.borderLight} overflow-hidden flex flex-col max-h-[90vh]`}>
                        <div className={`p-6 border-b ${theme.borderLight} flex justify-between items-center bg-emerald-50/50`}>
                            <div className="flex items-center gap-3 text-emerald-600">
                                <Coins size={28} />
                                <h3 className={`text-2xl font-black ${theme.textHeading}`}>Confirm Payroll Payment</h3>
                            </div>
                            <button onClick={() => setIsPayModalOpen(false)} className={theme.textSecondary}><X size={28} /></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto space-y-8 no-scrollbar">
                            {/* Selected Employees Breakdown */}
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-[0.2em] ${theme.textSecondary}`}>Payment Breakdown ({selectedIds.length} Staff)</label>
                                <div className="space-y-3">
                                    {payrollData.filter(d => selectedIds.includes(d._id)).map((record) => (
                                        <div key={record._id} className={`border ${theme.borderLight} rounded-3xl overflow-hidden`}>
                                            <button 
                                                onClick={() => setExpandedBreakdown(expandedBreakdown === record._id ? null : record._id)}
                                                className={`w-full p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black`}>
                                                        {record.employeeId?.userId?.name?.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <div className={`font-black ${theme.textPrimary}`}>{record.employeeId?.userId?.name}</div>
                                                        <div className="text-xs font-bold text-indigo-600">{formatCurrency(record.calculatedSalary)}</div>
                                                    </div>
                                                </div>
                                                {expandedBreakdown === record._id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </button>
                                            
                                            {expandedBreakdown === record._id && (
                                                <div className={`p-5 bg-gray-50/50 space-y-3 border-t ${theme.borderLight} animate-in slide-in-from-top-2 duration-300`}>
                                                    <div className="flex justify-between text-sm uppercase tracking-wider">
                                                        <span className={`font-bold ${theme.textSecondary}`}>Base Monthly Salary</span>
                                                        <span className={`font-black ${theme.textPrimary}`}>{formatCurrency(record.baseSalary)}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-3 rounded-2xl bg-white border border-emerald-100">
                                                            <div className="text-[10px] font-black text-emerald-600 uppercase">Present Days</div>
                                                            <div className={`text-xl font-black ${theme.textPrimary}`}>{record.presentDays} <span className="text-xs opacity-50">/{record.totalWorkingDays}</span></div>
                                                        </div>
                                                        <div className="p-3 rounded-2xl bg-white border border-indigo-100">
                                                            <div className="text-[10px] font-black text-indigo-600 uppercase">Paid Leaves</div>
                                                            <div className={`text-xl font-black ${theme.textPrimary}`}>{record.paidLeaves}</div>
                                                        </div>
                                                        <div className="p-3 rounded-2xl bg-white border border-red-100">
                                                            <div className="text-[10px] font-black text-red-600 uppercase">Unpaid Leaves</div>
                                                            <div className={`text-xl font-black ${theme.textPrimary}`}>{record.unpaidLeaves}</div>
                                                        </div>
                                                        <div className="p-3 rounded-2xl bg-white border border-orange-100">
                                                            <div className="text-[10px] font-black text-orange-600 uppercase">Deduction Reason</div>
                                                            <div className="text-xs font-bold text-red-500 leading-tight">
                                                                {record.unpaidLeaves > 0 && `${record.unpaidLeaves} days LOP cut`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Method Section */}
                            <div className="space-y-4">
                                <label className={`block text-xs font-black uppercase tracking-[0.2em] ${theme.textSecondary}`}>Select Payment Method</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'CASH', label: 'Cash', icon: Coins },
                                        { id: 'BANK', label: 'Bank Transfer', icon: Landmark },
                                        { id: 'UPI', label: 'UPI / Digital', icon: CreditCard }
                                    ].map((method) => (
                                        <button
                                            key={method.id}
                                            onClick={() => setPaymentMethod(method.id)}
                                            className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-3 ${
                                                paymentMethod === method.id 
                                                ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-lg scale-105' 
                                                : `border-transparent ${theme.inputBg} ${theme.textSecondary} hover:border-gray-300`
                                            }`}
                                        >
                                            <method.icon size={32} />
                                            <span className="font-black text-sm uppercase tracking-wider">{method.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={`p-8 border-t ${theme.borderLight} bg-gray-50 flex items-center justify-between`}>
                            <div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Payable</div>
                                <div className="text-3xl font-black text-indigo-600 leading-tight">
                                    {formatCurrency(payrollData.filter(d => selectedIds.includes(d._id)).reduce((acc, curr) => acc + curr.calculatedSalary, 0))}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setIsPayModalOpen(false)} 
                                    className={`px-8 py-4 font-black uppercase tracking-widest text-xs ${theme.textSecondary} hover:scale-105 transition-all`}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleBulkPay}
                                    disabled={isProcessing}
                                    className={`px-10 py-4 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all disabled:opacity-50`}
                                >
                                    {isProcessing ? 'Processing...' : `Confirm & Pay`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className={`${theme.surfaceBg} rounded-2xl w-full max-w-md shadow-2xl border ${theme.borderLight}`}>
                        <div className={`p-4 border-b ${theme.borderLight} flex justify-between items-center`}>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Payroll Settings</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className={theme.textSecondary}><X size={24} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>Start Day of Month</label>
                                    <input 
                                        type="number" min="1" max="31"
                                        value={settings.periodStartDay}
                                        onChange={(e) => setSettings({...settings, periodStartDay: e.target.value})}
                                        className={`w-full p-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>End Day of Month</label>
                                    <input 
                                        type="number" min="1" max="31"
                                        value={settings.periodEndDay}
                                        onChange={(e) => setSettings({...settings, periodEndDay: e.target.value})}
                                        className={`w-full p-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>Calculation Basis</label>
                                <CommonSelect 
                                    options={[
                                        { label: 'Monthly Fixed', value: 'monthly' },
                                        { label: 'Daily Based', value: 'daily' }
                                    ]}
                                    value={settings.salaryBasis}
                                    onChange={(val) => setSettings({...settings, salaryBasis: val})}
                                    labelKey="label"
                                    valueKey="value"
                                />
                            </div>
                            <div>
                                <label className={`block text-xs font-bold ${theme.textSecondary} mb-1`}>Working Days in Month</label>
                                <input 
                                    type="number"
                                    value={settings.workingDaysInMonth}
                                    onChange={(e) => setSettings({...settings, workingDaysInMonth: e.target.value})}
                                    className={`w-full p-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-xl`}
                                />
                                <p className={`text-[10px] ${theme.textSecondary} mt-1`}>Used for calculating per-day deduction in monthly basis.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3">
                            <button onClick={() => setIsSettingsOpen(false)} className={`px-4 py-2 font-bold ${theme.textSecondary}`}>Cancel</button>
                            <button onClick={handleSaveSettings} className={`px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold`}>Save Settings</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollManagement;
