import React, { useState } from 'react';
import {
    FileText,
    Download,
    TrendingUp,
    Utensils,
    Package,
    CreditCard,
    Receipt,
    UserCheck,
    LayoutDashboard,
    Clock,
    Globe,
    DollarSign,
    Zap
} from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import { formatCurrency } from '../../utils/format';

const Reports = ({
    salesHistory = [],
    staffList = [],
    tables = [],
    onlineOrders = [],
    settings = { defaultTaxPercent: 5 },
    hasPermission
}) => {
    const [reportCategory, setReportCategory] = useState("sales");
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);

    if (!hasPermission("VIEW_REPORTS")) {
        return <div className="p-8 text-center text-gray-500 font-bold">You don't have permission to view reports.</div>;
    }

    const reportCategories = [
        { id: "sales", label: "Sales Reports", icon: <TrendingUp size={16} /> },
        { id: "items", label: "Item-wise Sales", icon: <Utensils size={16} /> },
        { id: "category", label: "Category-wise", icon: <Package size={16} /> },
        { id: "payments", label: "Payment Modes", icon: <CreditCard size={16} /> },
        { id: "tax", label: "Tax / GST", icon: <Receipt size={16} /> },
        { id: "staff_report", label: "Staff Performance", icon: <UserCheck size={16} /> },
        { id: "table_report", label: "Table Revenue", icon: <LayoutDashboard size={16} /> },
        { id: "hourly", label: "Peak Hours", icon: <Clock size={16} /> },
        { id: "online_report", label: "Online Orders", icon: <Globe size={16} /> },
    ];

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-4xl font-black flex items-center text-gray-800">
                    <FileText className="mr-3 text-indigo-600" /> Reports & Analytics
                </h2>
                <div className="flex gap-3 items-center">
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-white p-3 rounded-xl border-2 shadow-sm"
                    />
                    <button className="p-3 bg-white border-2 rounded-xl shadow-sm text-gray-600 hover:text-indigo-600">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full lg:h-[calc(100vh-200px)] overflow-hidden">
                {/* Sidebar for Reports */}
                <div className="w-full lg:w-64 bg-white rounded-3xl shadow-lg border p-2 lg:p-4 flex flex-row lg:flex-col gap-2 shrink-0 overflow-x-auto lg:overflow-y-auto no-scrollbar">
                    {reportCategories.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setReportCategory(item.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0 ${reportCategory === item.id
                                ? "bg-indigo-600 text-white shadow-md"
                                : "text-gray-500 hover:bg-gray-100"
                                }`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>

                {/* Report Content Area */}
                <div className="flex-1 bg-white rounded-3xl shadow-lg border p-4 lg:p-6 overflow-y-auto">
                    {/* 1. SALES REPORT */}
                    {reportCategory === "sales" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Sales Summary ({filterDate})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                                    <p className="text-xs font-bold text-indigo-400 uppercase">Total Revenue</p>
                                    <p className="text-3xl font-black text-indigo-900 mt-2">
                                        {formatCurrency(
                                            salesHistory
                                                .filter((s) => s.date === filterDate)
                                                .reduce((a, b) => a + b.amount, 0)
                                        )}
                                    </p>
                                </div>
                                <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                                    <p className="text-xs font-bold text-green-400 uppercase">Total Orders</p>
                                    <p className="text-3xl font-black text-green-900 mt-2">
                                        {salesHistory.filter((s) => s.date === filterDate).length}
                                    </p>
                                </div>
                                <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                                    <p className="text-xs font-bold text-orange-400 uppercase">Avg Bill Value</p>
                                    <p className="text-3xl font-black text-orange-900 mt-2">
                                        {formatCurrency(
                                            salesHistory.filter((s) => s.date === filterDate).length
                                                ? salesHistory
                                                    .filter((s) => s.date === filterDate)
                                                    .reduce((a, b) => a + b.amount, 0) /
                                                salesHistory.filter((s) => s.date === filterDate).length
                                                : 0
                                        )}
                                    </p>
                                </div>
                            </div>
                            <CommonTable
                                columns={[
                                    {
                                        header: "Bill ID",
                                        key: "id",
                                        render: (value) => <span className="font-mono text-xs">#{value.toString().slice(-6)}</span>
                                    },
                                    {
                                        header: "Time",
                                        key: "timestamp",
                                        render: (value) => (
                                            <span className="text-sm">
                                                {new Date(value).toLocaleTimeString()}
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Type",
                                        key: "type",
                                        render: (value) => (
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-bold ${value === "Dine-in"
                                                    ? "bg-blue-100 text-blue-600"
                                                    : "bg-orange-100 text-orange-600"
                                                    }`}
                                            >
                                                {value}
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Amount",
                                        key: "amount",
                                        headerClassName: "text-right",
                                        className: "text-right font-bold",
                                        render: (value) => formatCurrency(value)
                                    }
                                ]}
                                data={salesHistory.filter((s) => s.date === filterDate)}
                                className="mt-4"
                            />
                        </div>
                    )}

                    {/* 2. ITEM-WISE REPORT */}
                    {reportCategory === "items" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Item-wise Sales
                            </h3>
                            <CommonTable
                                columns={[
                                    { header: "Item Name", key: "name", className: "font-bold text-gray-700" },
                                    { header: "Qty Sold", key: "qty", className: "text-center font-bold" },
                                    {
                                        header: "Revenue",
                                        key: "revenue",
                                        className: "text-right font-bold text-indigo-600",
                                        render: (value) => formatCurrency(value)
                                    }
                                ]}
                                data={(() => {
                                    const itemStats = {};
                                    salesHistory
                                        .filter((s) => s.date === filterDate)
                                        .forEach((sale) => {
                                            if (sale.items) {
                                                sale.items.forEach((item) => {
                                                    if (!itemStats[item.name])
                                                        itemStats[item.name] = { qty: 0, revenue: 0 };
                                                    itemStats[item.name].qty += item.quantity;
                                                    itemStats[item.name].revenue += item.price * item.quantity;
                                                });
                                            }
                                        });
                                    return Object.entries(itemStats).map(([name, stats]) => ({ name, ...stats }));
                                })()}
                            />
                        </div>
                    )}

                    {/* 3. CATEGORY REPORT */}
                    {reportCategory === "category" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Category Performance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(() => {
                                    const catStats = {};
                                    salesHistory
                                        .filter((s) => s.date === filterDate)
                                        .forEach((sale) => {
                                            if (sale.items) {
                                                sale.items.forEach((item) => {
                                                    const cat = item.category || "Uncategorized";
                                                    if (!catStats[cat]) catStats[cat] = 0;
                                                    catStats[cat] += item.price * item.quantity;
                                                });
                                            }
                                        });
                                    return Object.entries(catStats).map(([cat, revenue]) => (
                                        <div key={cat} className="p-4 border rounded-2xl flex justify-between items-center hover:shadow-md transition-all">
                                            <span className="font-bold text-gray-600">{cat}</span>
                                            <span className="font-black text-indigo-600 text-lg">{formatCurrency(revenue)}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* 4. PAYMENT MODES */}
                    {reportCategory === "payments" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Payment Methods
                            </h3>
                            <div className="space-y-4">
                                {["Cash", "UPI", "Card"].map((method) => {
                                    const total = salesHistory
                                        .filter((s) => s.date === filterDate && s.method === method)
                                        .reduce((a, b) => a + b.amount, 0);
                                    const count = salesHistory.filter(
                                        (s) => s.date === filterDate && s.method === method
                                    ).length;
                                    return (
                                        <div key={method} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${method === "Cash" ? "bg-green-100 text-green-600" : method === "UPI" ? "bg-indigo-100 text-indigo-600" : "bg-blue-100 text-blue-600"}`}>
                                                    {method === "Cash" ? <DollarSign size={20} /> : method === "UPI" ? <Zap size={20} /> : <CreditCard size={20} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{method}</p>
                                                    <p className="text-xs text-gray-500">{count} Transactions</p>
                                                </div>
                                            </div>
                                            <p className="text-xl font-black text-gray-900">{formatCurrency(total)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 5. TAX REPORT */}
                    {reportCategory === "tax" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Tax / GST Report
                            </h3>
                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 text-center">
                                <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">Total Tax Collected</p>
                                <p className="text-4xl font-black text-blue-900 mt-2">
                                    {formatCurrency(
                                        salesHistory
                                            .filter((s) => s.date === filterDate)
                                            .reduce((sum, s) => sum + (s.taxAmount || 0), 0)
                                    )}
                                </p>
                                <p className="text-xs text-blue-400 mt-2">Based on {settings.defaultTaxPercent}% Rate</p>
                            </div>
                        </div>
                    )}

                    {/* 6. STAFF PERFORMANCE REPORT */}
                    {reportCategory === "staff_report" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Staff Performance ({filterDate})
                            </h3>
                            <CommonTable
                                columns={[
                                    { header: "Staff Name", key: "name", className: "font-bold text-gray-700" },
                                    { header: "Orders", key: "orders", className: "text-center font-bold text-indigo-600" },
                                    {
                                        header: "Total Sales",
                                        key: "sales",
                                        className: "text-right font-black",
                                        render: (value) => formatCurrency(value)
                                    }
                                ]}
                                data={staffList
                                    .filter((s) => s.role !== "Admin")
                                    .map((s) => {
                                        const staffSales = salesHistory.filter(
                                            (sale) => sale.date === filterDate && sale.waiterName === s.name
                                        );
                                        return {
                                            id: s.id,
                                            name: s.name,
                                            orders: staffSales.length,
                                            sales: staffSales.reduce((sum, sale) => sum + sale.amount, 0)
                                        };
                                    })}
                            />
                        </div>
                    )}

                    {/* ... other categories (Table, Hourly, Online) ... */}
                    {/* 7. TABLE REVENUE REPORT */}
                    {reportCategory === "table_report" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Table Revenue Analysis ({filterDate})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tables.map((t) => {
                                    const tableSales = salesHistory.filter(
                                        (s) => s.date === filterDate && s.tableName === t.name
                                    );
                                    const totalRevenue = tableSales.reduce((sum, s) => sum + s.amount, 0);
                                    const orderCount = tableSales.length;
                                    return (
                                        <div key={t.id} className="p-4 border rounded-2xl flex flex-col justify-between hover:shadow-md transition-all bg-gray-50">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-gray-700 text-lg">{t.name}</span>
                                                <span className="text-xs bg-white px-2 py-1 rounded border text-gray-500">{orderCount} Orders</span>
                                            </div>
                                            <span className="font-black text-indigo-600 text-2xl">{formatCurrency(totalRevenue)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 8. PEAK HOURS REPORT */}
                    {reportCategory === "hourly" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Hourly Sales & Activity ({filterDate})
                            </h3>
                            <div className="h-64 flex items-end justify-between gap-1 px-2 pb-2 border-b border-dashed min-w-[600px] overflow-x-auto">
                                {[...Array(14)].map((_, i) => {
                                    const hour = 9 + i;
                                    const hourSales = salesHistory.filter(
                                        (s) => s.date === filterDate && new Date(s.timestamp).getHours() === hour
                                    );
                                    const revenue = hourSales.reduce((a, b) => a + b.amount, 0);
                                    const count = hourSales.length;
                                    const maxRev = 5000;
                                    const height = Math.min(100, (revenue / maxRev) * 100) || 5;
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-1 group flex-1 min-w-[40px]">
                                            <div
                                                className="w-full bg-indigo-100 rounded-t-lg relative transition-all group-hover:bg-indigo-300 flex items-end justify-center"
                                                style={{ height: `${height}%` }}
                                            >
                                                <span className="text-[10px] font-bold text-indigo-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 9. ONLINE ORDERS REPORT */}
                    {reportCategory === "online_report" && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                                Online Orders Performance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(() => {
                                    const platformStats = {
                                        Zomato: { count: 0, sales: 0 },
                                        Swiggy: { count: 0, sales: 0 },
                                        Others: { count: 0, sales: 0 },
                                    };
                                    onlineOrders.forEach((o) => {
                                        const p = o.platform || "Others";
                                        if (!platformStats[p]) platformStats[p] = { count: 0, sales: 0 };
                                        platformStats[p].count++;
                                        platformStats[p].sales += o.total;
                                    });
                                    return Object.entries(platformStats).map(([plat, stats]) => (
                                        <div key={plat} className={`p-6 rounded-3xl border flex flex-col ${plat === "Zomato" ? "bg-red-50 border-red-100" : plat === "Swiggy" ? "bg-orange-50 border-orange-100" : "bg-gray-50 border-gray-200"}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className={`text-lg font-black ${plat === "Zomato" ? "text-red-600" : plat === "Swiggy" ? "text-orange-600" : "text-gray-600"}`}>{plat}</h4>
                                                <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">{stats.count} Orders</span>
                                            </div>
                                            <p className="text-3xl font-black text-gray-800">{formatCurrency(stats.sales)}</p>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Reports;
