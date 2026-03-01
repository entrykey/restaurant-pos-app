import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Briefcase } from 'lucide-react';
import { planService } from '../../services/api/plans';
import { useTheme } from '../../context/ThemeContext';
import CommonTable from '../../components/CommonTable';

const PlanList = ({ onEdit, onAddNew }) => {
    const [plans, setPlans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { theme } = useTheme();

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        try {
            setIsLoading(true);
            const res = await planService.getPlans();
            setPlans(res.data);
        } catch (error) {
            console.error("Error fetching plans:", error);
            alert("Failed to load plans");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this plan? This action is irreversible.")) {
            try {
                await planService.deletePlan(id);
                fetchPlans();
            } catch (error) {
                console.error("Error deleting plan:", error);
                alert("Failed to delete plan");
            }
        }
    };

    const filteredPlans = plans.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.businessType?.displayString?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        {
            header: "Plan Name",
            key: "name",
            render: (_, plan) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <span className={`font-bold text-sm ${theme.textPrimary}`}>{plan.name}</span>
                    {plan.isCustom && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black uppercase rounded-lg">Custom</span>
                    )}
                </div>
            )
        },
        {
            header: "Target Industry",
            key: "businessType",
            render: (_, plan) => (
                <div className="flex items-center">
                    <span className={`px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold ${theme.textPrimary}`}>
                        {plan.businessType?.displayString || 'Standard'}
                        {plan.subType?.displayString && (
                            <span className={`ml-1 text-[11px] font-black uppercase tracking-widest text-indigo-500`}>
                                / {plan.subType.displayString}
                            </span>
                        )}
                    </span>
                </div>
            )
        },
        {
            header: "Duration",
            key: "durationDays",
            className: `font-bold text-sm ${theme.textSecondary}`,
            render: (_, plan) => (
                <>
                    {plan.durationDays} Days
                    {plan.hasTrial && (
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-black uppercase rounded-lg">Trial {plan.trialDurationDays}d</span>
                    )}
                </>
            )
        },
        {
            header: "Monthly Price",
            key: "pricing",
            className: `font-bold text-sm ${theme.textPrimary}`,
            render: (_, plan) => (
                `${plan.currency} ${plan.pricing?.find(p => p.cycle === 'monthly')?.price || 'N/A'}/mo`
            )
        },
        {
            header: "Actions",
            key: "actions",
            headerClassName: "text-right",
            className: "text-right",
            render: (_, plan) => (
                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit({
                                ...plan,
                                businessType: plan.businessType?._id,
                                subType: plan.subType?._id
                            });
                        }}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                        title="Edit Plan"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(plan._id);
                        }}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-all"
                        title="Delete Plan"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="w-full mx-auto space-y-8">
                {/* ── Page Header ── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none">
                                <Briefcase size={26} />
                            </div>
                            <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tight ${theme.textHeading}`}>Plan Management</h1>
                        </div>
                        <p className={`font-bold ml-1 text-sm ${theme.textSecondary}`}>Manage subscription plans and configurations</p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                            <input
                                type="text"
                                placeholder="Search plans..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-12 pr-4 py-4 border-2 border-transparent ${theme.surfaceBg} ${theme.textPrimary} rounded-2xl shadow-sm outline-none focus:border-indigo-500 transition-all font-bold placeholder:font-medium placeholder:text-gray-400`}
                            />
                        </div>
                        <button
                            onClick={onAddNew}
                            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-2xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 group whitespace-nowrap"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                            ADD PLAN
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <CommonTable
                    columns={columns}
                    data={filteredPlans}
                    rowKey="_id"
                    isLoading={isLoading}
                    loadingMessage="Loading Plans…"
                    emptyMessage="No plans found."
                />
            </div>
        </div>
    );
};

export default PlanList;
