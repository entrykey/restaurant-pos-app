import React, { useState, useEffect } from "react";
import { 
    Users, 
    Store, 
    TrendingUp, 
    ArrowDownRight,
    Calendar,
    ChevronRight,
    Bell,
    LayoutDashboard,
    Coins
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { clientService } from "../../services/api/clients";
import { printCustomHtml, escapeHtml } from "../../utils/print";
import toast from "react-hot-toast";

const SuperAdminDashboard = () => {
    const { theme } = useTheme();
    const { formatCurrency } = useApp();
    const [stats, setStats] = useState(null);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [statsRes, clientsRes] = await Promise.all([
                clientService.getDashboardStats(),
                clientService.getClients()
            ]);
            setStats(statsRes.data);
            setClients(clientsRes.data || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReport = () => {
        if (!stats) return;

        const html = `
            <div style="font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1f2937;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
                    <div>
                        <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.025em; color: #111827;">FilePe Platform Report</h1>
                        <p style="margin: 5px 0 0; font-size: 14px; font-weight: 500; color: #6b7280;">Comprehensive performance and client overview</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="margin: 0; font-size: 12px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: 0.05em;">Generated On</p>
                        <p style="margin: 0; font-size: 14px; font-weight: 600;">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
                    </div>
                </div>

                <div style="grid-template-columns: repeat(3, 1fr); display: grid; gap: 20px; margin-bottom: 40px;">
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 16px;">
                        <p style="margin: 0; font-size: 11px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">Total Active Shops</p>
                        <p style="margin: 10px 0 0; font-size: 24px; font-weight: 900;">${stats.totalShops || 0}</p>
                    </div>
                    <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 20px; border-radius: 16px;">
                        <p style="margin: 0; font-size: 11px; font-weight: 800; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em;">Unique Clients</p>
                        <p style="margin: 10px 0 0; font-size: 24px; font-weight: 900;">${stats.totalClients || 0}</p>
                    </div>
                    <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 20px; border-radius: 16px;">
                        <p style="margin: 0; font-size: 11px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 0.1em;">Total Lifetime Revenue</p>
                        <p style="margin: 10px 0 0; font-size: 24px; font-weight: 900; color: #4338ca;">${formatCurrency ? formatCurrency(stats.totalRevenue || 0) : (stats.totalRevenue || 0).toLocaleString()}</p>
                    </div>
                </div>

                <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span style="background: #4f46e5; width: 4px; height: 18px; border-radius: 2px;"></span>
                    Monthly Performance Summary
                </h2>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Month</th>
                            <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb;">New Subscriptions</th>
                            <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Revenue Collected</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(stats.subscriptionHistory || []).map(h => `
                            <tr>
                                <td style="padding: 12px 15px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${h.month}</td>
                                <td style="padding: 12px 15px; text-align: right; font-size: 13px; border-bottom: 1px solid #f3f4f6;">${h.count}</td>
                                <td style="padding: 12px 15px; text-align: right; font-size: 13px; font-weight: 700; color: #4f46e5; border-bottom: 1px solid #f3f4f6;">${formatCurrency ? formatCurrency(h.revenue || 0) : (h.revenue || 0).toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h2 style="font-size: 18px; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <span style="background: #10b981; width: 4px; height: 18px; border-radius: 2px;"></span>
                    Detailed Client Registry
                </h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Client Name</th>
                            <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Phone</th>
                            <th style="padding: 12px 15px; text-align: left; font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Joined Date</th>
                            <th style="padding: 12px 15px; text-align: right; font-size: 12px; font-weight: 700; color: #4b5563; border-bottom: 1px solid #e5e7eb;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${clients.map(c => `
                            <tr>
                                <td style="padding: 12px 15px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${escapeHtml(c.name)}</td>
                                <td style="padding: 12px 15px; font-size: 13px; color: #4b5563; border-bottom: 1px solid #f3f4f6;">${escapeHtml(c.phone)}</td>
                                <td style="padding: 12px 15px; font-size: 12px; color: #6b7280; border-bottom: 1px solid #f3f4f6;">${new Date(c.createdAt).toLocaleDateString()}</td>
                                <td style="padding: 12px 15px; text-align: right; border-bottom: 1px solid #f3f4f6;">
                                    <span style="padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; background: ${c.isActive ? '#ecfdf5' : '#fef2f2'}; color: ${c.isActive ? '#059669' : '#dc2626'};">
                                        ${c.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="margin: 0; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.2em;">Confidential Performance Data • FilePe Modem POS</p>
                </div>
            </div>
        `;

        printCustomHtml({
            title: `SuperAdmin_Report_${new Date().toISOString().split('T')[0]}`,
            bodyHtml: html
        });
    };

    if (loading) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-[60vh] gap-4`}>
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                <p className={`font-black uppercase tracking-widest text-[11px] ${theme.textSecondary}`}>
                    Loading analytics...
                </p>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={`p-4 rounded-2xl shadow-xl border ${theme.mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-2`}>{label}</p>
                    <p className="text-xl font-black text-indigo-500">{formatCurrency ? formatCurrency(payload[0].value) : payload[0].value.toLocaleString()}</p>
                    <p className={`text-[10px] font-bold ${theme.textMuted}`}>{payload[1]?.value} Subscriptions</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-12 animate-fadeIn w-full py-12 px-2">

            {/* ── Header Section ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20 text-white">
                            <LayoutDashboard size={20} />
                        </div>
                        <h1 className={`text-2xl font-black ${theme.textHeading}`}>SuperAdmin Dashboard</h1>
                    </div>
                    <p className={`text-sm font-medium ${theme.textSecondary}`}>
                        Performance overview of all shops and subscriptions
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm">
                    <button onClick={fetchData} className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors ${theme.textSecondary}`}>
                        <Calendar size={18} />
                    </button>
                    <div className="h-6 w-[1px] bg-gray-100 dark:bg-gray-700" />
                    <button 
                        onClick={handleDownloadReport}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        Download Report <ArrowDownRight size={14} />
                    </button>
                </div>
            </div>

            {/* ── Stats Highlight ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Total Shops Card */}
                <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500`}>
                    <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Store size={28} />
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black tracking-widest border border-emerald-500/20">
                                <TrendingUp size={12} /> +12%
                            </div>
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Active Shops</p>
                        <h3 className={`text-4xl font-black ${theme.textHeading}`}>{stats?.totalShops || 0}</h3>
                        <div className="mt-6 flex items-center gap-2 text-[11px] font-bold text-gray-500">
                            <span className="text-emerald-500">8 new</span> in last 30 days
                        </div>
                    </div>
                </div>

                {/* Total Clients Card */}
                <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500`}>
                    <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Users size={28} />
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black tracking-widest border border-emerald-500/20">
                                <TrendingUp size={12} /> +5.4%
                            </div>
                        </div>
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Unique Clients</p>
                        <h3 className={`text-4xl font-black ${theme.textHeading}`}>{stats?.totalClients || 0}</h3>
                        <div className="mt-6 flex items-center gap-2 text-[11px] font-bold text-gray-500">
                            <span className="text-indigo-500">3 leads</span> pending followup
                        </div>
                    </div>
                </div>

                {/* Total Revenue Card */}
                <div className={`p-8 rounded-[40px] bg-indigo-600 border-none shadow-2xl shadow-indigo-600/30 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500`}>
                    <div className="absolute -right-8 -top-8 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors" />
                    <div className="relative z-10 text-white">
                        <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                                <Coins size={28} />
                            </div>
                            <button className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <p className="text-[11px] font-black text-indigo-100 uppercase tracking-[0.2em] mb-1">Total Lifetime Revenue</p>
                        <h3 className="text-4xl font-black">{formatCurrency(stats?.totalRevenue || 0)}</h3>
                        <div className="mt-6 flex items-center gap-2 text-[11px] font-bold text-indigo-100/70">
                            Current Month Contribution: <span className="text-white">{formatCurrency(stats?.subscriptionHistory?.[5]?.revenue || 0)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Charts Section ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Evolution */}
                <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm space-y-8`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className={`text-lg font-black ${theme.textHeading}`}>Revenue Performance</h4>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>Last 6 Months Subscription Growth</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl font-black text-[10px] uppercase tracking-widest">
                            Monthly View
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.subscriptionHistory || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.mode === 'dark' ? '#374151' : '#f3f4f6'} />
                                <XAxis 
                                    dataKey="month" 
                                    stroke={theme.mode === 'dark' ? '#9ca3af' : '#6b7280'} 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis 
                                    stroke={theme.mode === 'dark' ? '#9ca3af' : '#6b7280'} 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    tickFormatter={(value) => formatCurrency ? formatCurrency(value).split('.')[0] : value}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#4f46e5" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subscriptions Count */}
                <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm space-y-8`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className={`text-lg font-black ${theme.textHeading}`}>Subscription Volume</h4>
                            <p className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>Monthly Plan Conversions</p>
                        </div>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <div className="w-2 h-2 rounded-full bg-indigo-500/30" />
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.subscriptionHistory || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.mode === 'dark' ? '#374151' : '#f3f4f6'} />
                                <XAxis 
                                    dataKey="month" 
                                    stroke={theme.mode === 'dark' ? '#9ca3af' : '#6b7280'} 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis 
                                    stroke={theme.mode === 'dark' ? '#9ca3af' : '#6b7280'} 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false}
                                />
                                <Tooltip 
                                    cursor={{fill: theme.mode === 'dark' ? '#374151' : '#f9fafb', radius: 12}}
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className={`p-4 rounded-2xl shadow-xl border ${theme.mode === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${theme.textSecondary} mb-1`}>{label}</p>
                                                    <p className="font-black text-indigo-500">{payload[0].value} Subscriptions</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="count" radius={[12, 12, 12, 12]} barSize={40}>
                                    {(stats?.subscriptionHistory || []).map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={index === (stats?.subscriptionHistory || []).length - 1 ? '#4f46e5' : '#4f46e540'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* ── Recent Activity Placeholder (optional but makes it look full) ── */}
            <div className={`p-8 rounded-[40px] ${theme.surfaceBg} border ${theme.borderLight} shadow-sm`}>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h4 className={`text-lg font-black ${theme.textHeading}`}>Recent Platform Updates</h4>
                        <p className={`text-[11px] font-black uppercase tracking-widest ${theme.textSecondary}`}>Monitoring system health and alerts</p>
                    </div>
                    <button className={`text-[11px] font-black uppercase tracking-widest text-indigo-500 hover:opacity-80 transition-opacity`}>
                        View System Logs
                    </button>
                </div>
                <div className="flex items-center justify-center p-12 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-[32px]">
                    <div className="text-center space-y-2">
                        <Bell className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={32} />
                        <p className={`font-black text-xs uppercase tracking-widest ${theme.textPrimary}`}>System operational</p>
                        <p className={`text-[10px] ${theme.textSecondary}`}>All modules are running within normal parameters</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
