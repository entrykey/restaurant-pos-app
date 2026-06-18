import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    TrendingUp,
    Utensils,
    Package,
    CreditCard,
    ReceiptText,
    UserCheck,
    LayoutDashboard,
    Clock,
    Globe,
    Coins,
    Zap,
    Users,
    ChevronRight,
    Scale,
    Landmark
} from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";
import CommonTable from '../../components/CommonTable';
import DatePicker from "../../components/ui/DatePicker";
import CommonSelect from "../../components/ui/CommonSelect";

import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { usePermission } from "../../auth/usePermission";
import api, { reportsService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { printCustomHtml, escapeHtml } from "../../utils/print";
import ProfitLossAccordion from "./ProfitLossAccordion";

const toAbsoluteLogoUrl = (logoUrl) => {
    if (!logoUrl) return null;
    if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
    const base = (api?.defaults?.baseURL || "").replace(/\/api\/?$/, "");
    if (!base) return logoUrl;
    return `${base}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
};

const reportCategories = [
    { id: "sales", label: "Sales Reports", icon: <TrendingUp size={16} />, permission: "SALES_REPORTS" },
    { id: "items", label: "Item-wise Sales", icon: <Utensils size={16} />, permission: "ITEM_WISE_SALES" },
    { id: "category", label: "Category-wise", icon: <Package size={16} />, permission: "CATEGORY_WISE" },
    { id: "payments", label: "Payment Modes", icon: <CreditCard size={16} />, permission: "PAYMENT_MODES" },
    { id: "tax", label: "Tax / GST", icon: <ReceiptText size={16} />, permission: "TAX_GST" },
    { id: "staff_report", label: "Staff Performance", icon: <UserCheck size={16} />, permission: "STAFF_PERFORMANCE" },
    { id: "table_report", label: "Table Revenue", icon: <LayoutDashboard size={16} />, permission: "TABLE_REVENUE" },
    { id: "hourly", label: "Peak Hours", icon: <Clock size={16} />, permission: "PEAK_HOURS" },
    { id: "online_report", label: "Online Orders", icon: <Globe size={16} />, permission: "ONLINE_ORDERS" },
    { id: "expenses", label: "Expense Ledger", icon: <Coins size={16} />, permission: "EXPENSE_LEDGER" },
    { id: "profit_loss", label: "Profit & Loss", icon: <Scale size={16} />, permission: "PROFIT_LOSS" },
    { id: "balance_sheet", label: "Balance Sheet", icon: <Landmark size={16} />, permission: "BALANCE_SHEET" },
    { id: "parties", label: "Parties Report", icon: <Users size={16} />, permission: "PARTIES_REPORT" },
];

const Reports = ({
    staffList = [],
    tables = [],
    onlineOrders = [],
    settings = { defaultTaxPercent: 5 },
    shopId,
    branchId
}) => {
    const { theme, themeName } = useTheme();
    const { organization, branches, currentShopId, activeBranchId, formatCurrency } = useApp();
    const currencyRaw = organization?.defaultCurrency || 'USD';
    const currency = typeof currencyRaw === 'object' ? (currencyRaw.code || 'USD') : currencyRaw;
    const { can } = usePermission();
    const [reportCategory, setReportCategory] = useState("sales");
    const today = new Date().toISOString().split("T")[0];
    const [filterStartDate, setFilterStartDate] = useState(today);
    const [filterEndDate, setFilterEndDate] = useState(today);
    const [salesHistory, setSalesHistory] = useState([]);
    const [expensesHistory, setExpensesHistory] = useState([]);
    const [performanceReport, setPerformanceReport] = useState([]);
    const [customerReport, setCustomerReport] = useState([]);
    const [supplierReport, setSupplierReport] = useState([]);
    const [partyTab, setPartyTab] = useState("customers");
    const [selectedParty, setSelectedParty] = useState(null); // { id, name, type }
    const [partyStatement, setPartyStatement] = useState([]);
    const [partyItems, setPartyItems] = useState([]);
    const [profitLossReport, setProfitLossReport] = useState(null);
    const [balanceSheetReport, setBalanceSheetReport] = useState(null);
    const [expandedPlSections, setExpandedPlSections] = useState({});
    const [loading, setLoading] = useState(false);
    const [showExportPicker, setShowExportPicker] = useState(false);
    const resolvedShopId = shopId || currentShopId;
    
    const allowedCategories = React.useMemo(() => {
        return reportCategories.filter(item => can("reports", item.permission));
    }, [can]);

    useEffect(() => {
        if (allowedCategories.length > 0 && !allowedCategories.some(c => c.id === reportCategory)) {
            setReportCategory(allowedCategories[0].id);
        }
    }, [allowedCategories, reportCategory]);
    
    const { user } = useAuth();
    const isGlobalUser = user?.allBranches || user?.isOwner || user?.isSuperAdmin || user?.roles?.some(r => r.name === 'shop_user' || r.name === 'owner');
    const permittedBranchIds = user?.branchIds || [];
    const availableBranches = isGlobalUser 
        ? branches 
        : branches.filter(b => permittedBranchIds.includes(String(b._id || b.id)));

    const [reportBranchFilter, setReportBranchFilter] = useState("all");

    const unwrapApiData = (payload) => payload?.data || payload || [];

    // Sync filter when branch list is first loaded or changes:
    // - If single-branch user, auto-select that branch.
    // - If multi-branch, keep "all" unless user has manually changed it.
    // Only depends on availableBranches to avoid loop with reportBranchFilter.
    useEffect(() => {
        if (availableBranches.length === 1) {
            const onlyBranchId = String(availableBranches[0]._id || availableBranches[0].id);
            if (onlyBranchId) {
                setReportBranchFilter(prev => prev === onlyBranchId ? prev : onlyBranchId);
            }
        }
        // Do NOT auto-reset to 'all' if branches list grows â€” user may have chosen a branch
    }, [availableBranches.length]);

    const fetchData = React.useCallback(async () => {
        console.log("DEBUG_REPORTS_FETCH_DATA_START:", { resolvedShopId, reportBranchFilter, filterStartDate, filterEndDate });
        if (!resolvedShopId) {
            console.warn("DEBUG_REPORTS_FETCH_DATA_MISSING_SHOPID");
            return;
        }
        setLoading(true);
        try {
            const params = {
                shopId: resolvedShopId,
                branchId: reportBranchFilter,
                startDate: filterStartDate,
                endDate: filterEndDate
            };

            const [salesRes, expensesRes, perfRes, custRes, suppRes, plRes, bsRes] = await Promise.all([
                reportsService.getSalesReport(params),
                reportsService.getExpensesReport(params),
                reportsService.getPerformanceReport(params),
                reportsService.getCustomerReport(params),
                reportsService.getSupplierReport(params),
                reportsService.getProfitLossReport(params),
                reportsService.getBalanceSheetReport(params),
            ]);
            console.log("DEBUG_REPORTS_DATA_RESPONSES:", {
                sales: salesRes.data,
                expenses: expensesRes.data,
                customers: custRes.data,
                suppliers: suppRes.data
            });

            setSalesHistory(unwrapApiData(salesRes));
            setExpensesHistory(unwrapApiData(expensesRes));
            setPerformanceReport(unwrapApiData(perfRes));
            setCustomerReport(unwrapApiData(custRes));
            setSupplierReport(unwrapApiData(suppRes));
            setProfitLossReport(plRes?.data || plRes || null);
            setBalanceSheetReport(bsRes?.data || bsRes || null);
        } catch (error) {
            console.error("Failed to fetch report data:", error);
        } finally {
            setLoading(false);
        }
    }, [resolvedShopId, reportBranchFilter, filterStartDate, filterEndDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const fetchPartyDetails = async () => {
            if (!selectedParty) return;
            try {
                const params = {
                    partyId: selectedParty.id,
                    type: selectedParty.type,
                    startDate: filterStartDate,
                    endDate: filterEndDate
                };
                const [statRes, itemRes] = await Promise.all([
                    reportsService.getPartyStatement(params),
                    reportsService.getPartyItems(params)
                ]);
                setPartyStatement(unwrapApiData(statRes));
                setPartyItems(unwrapApiData(itemRes));
            } catch (err) {
                console.error("Failed to fetch party details:", err);
            }
        };
        fetchPartyDetails();
    }, [selectedParty, filterStartDate, filterEndDate]);

    const isWithinRange = (dateStr) => {
        if (!dateStr) return false;
        // YYYY-MM-DD strings can be safely compared lexicographically
        return dateStr >= filterStartDate && dateStr <= filterEndDate;
    };

    const salesInRange = React.useMemo(
        () => salesHistory.filter((s) => isWithinRange(s.date)),
        [salesHistory, filterStartDate, filterEndDate]
    );

    const togglePlSection = (sectionId) => {
        setExpandedPlSections((prev) => ({
            ...prev,
            [sectionId]: !prev[sectionId],
        }));
    };

    const rangeLabel = filterStartDate === filterEndDate
        ? filterStartDate
        : `${filterStartDate} → ${filterEndDate}`;

    const activeBranch = branches?.find(
        (b) => String(b._id || b.id) === String(branchId)
    ) || null;

    const headerShopName = organization?.businessName || settings?.shopName || "Shop";
    const headerBranchName = activeBranch?.name || "Branch";
    const headerLogoUrl = toAbsoluteLogoUrl(organization?.logoUrl);

    const address = activeBranch?.address || {};
    const addressLines = [
        address?.line1,
        address?.line2,
        [address?.city, address?.state?.name || address?.state].filter(Boolean).join(", "),
        [address?.country?.name || address?.country, address?.pincode].filter(Boolean).join(" - "),
    ].filter(Boolean);
    const headerContact = organization?.ownerContact || settings?.shopPhone || "";

    const buildReportData = () => {
        let columns = [];
        let rows = [];

        if (reportCategory === "sales") {
            columns = ["Sales Invoice", "Date", "Time", "Type", "Payment Mode", "Amount"];
            rows = salesHistory
                .filter((s) => isWithinRange(s.date))
                .map((s) => [
                    `#${s.invoiceNumber}`,
                    s.date,
                    new Date(s.timestamp).toLocaleTimeString(),
                    s.type,
                    s.method,
                    s.amount
                ]);
        } else if (reportCategory === "items") {
            const itemStats = {};
            salesHistory
                .filter((s) => isWithinRange(s.date))
                .forEach((sale) => {
                    if (sale.items) {
                        sale.items.forEach((item) => {
                            const itemName = item.name || item.itemName || item.title || item.itemId?.name || item.productId?.name || (item.category ? `[${item.category}]` : "â€”");
                            if (!itemStats[itemName])
                                itemStats[itemName] = { qty: 0, revenue: 0, profit: 0 };
                            itemStats[itemName].qty += (item.quantity || 0);
                            itemStats[itemName].revenue += (item.price || 0) * (item.quantity || 0);
                            itemStats[itemName].profit += ((item.price || 0) - (item.purchasePrice || 0)) * (item.quantity || 0);
                        });
                    }
                });
            columns = ["Item Name", "Qty Sold", "Revenue", "Profit"];
            rows = Object.entries(itemStats).map(([name, stats]) => [
                name,
                stats.qty,
                stats.revenue,
                stats.profit
            ]);
        } else if (reportCategory === "category") {
            const catStats = {};
            salesHistory
                .filter((s) => isWithinRange(s.date))
                .forEach((sale) => {
                    if (sale.items) {
                        sale.items.forEach((item) => {
                            const cat = item.category || "Others";
                            if (!catStats[cat]) catStats[cat] = 0;
                            catStats[cat] += item.price * item.quantity;
                        });
                    }
                });
            columns = ["Category", "Revenue"];
            rows = Object.entries(catStats).map(([cat, revenue]) => [cat, revenue]);
        } else if (reportCategory === "payments") {
            const methods = ["Cash", "UPI", "Card"];
            columns = ["Payment Method", "Transactions", "Total Amount"];
            rows = methods.map((method) => {
                const total = salesHistory
                    .filter((s) => isWithinRange(s.date) && s.method === method)
                    .reduce((a, b) => a + b.amount, 0);
                const count = salesHistory.filter(
                    (s) => isWithinRange(s.date) && s.method === method
                ).length;
                return [method, count, total];
            });
        } else if (reportCategory === "staff_report") {
            columns = ["Staff Name", "Orders", "Sales Collect", "KOTs", "Served", "Cash", "Purchases"];
            rows = performanceReport.map((p) => [
                p.employeeName,
                p.stats.orders,
                formatCurrency(p.stats.sales, currency),
                p.stats.kots,
                p.stats.served,
                formatCurrency(p.stats.cash, currency),
                p.stats.purchases
            ]);
        } else if (reportCategory === "table_report") {
            columns = ["Table", "Orders", "Revenue"];
            rows = tables.map((t) => {
                const tableSales = salesHistory.filter(
                    (s) => isWithinRange(s.date) && s.tableName === t.name
                );
                const totalRevenue = tableSales.reduce((sum, s) => sum + s.amount, 0);
                const orderCount = tableSales.length;
                return [t.name, orderCount, totalRevenue];
            });
        } else if (reportCategory === "hourly") {
            columns = ["Hour", "Orders", "Revenue"];
            const result = [];
            for (let i = 0; i < 14; i++) {
                const hour = 9 + i;
                const hourSales = salesHistory.filter(
                    (s) => isWithinRange(s.date) && new Date(s.timestamp).getHours() === hour
                );
                const revenue = hourSales.reduce((a, b) => a + b.amount, 0);
                const count = hourSales.length;
                result.push([
                    `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? "PM" : "AM"}`,
                    count,
                    revenue
                ]);
            }
            rows = result;
        } else if (reportCategory === "online_report") {
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
            columns = ["Platform", "Orders", "Sales"];
            rows = Object.entries(platformStats).map(([plat, stats]) => [
                plat,
                stats.count,
                stats.sales
            ]);
        } else if (reportCategory === "tax") {
            const aggregatedItems = {}; 
            
            salesHistory
                .filter((s) => isWithinRange(s.date))
                .forEach((sale) => {
                    const items = sale.items || [];
                    items.forEach((item) => {
                        const system = item.taxSystem || "GST";
                        if (system === "NONE" && (item.taxAmount || 0) === 0) return; // Skip non-taxable

                        const taxP = (item.taxPercent !== undefined && item.taxPercent !== null) 
                            ? Number(item.taxPercent) 
                            : (settings?.defaultTaxPercent || 0);
                        const taxType = item.taxType || (item.isExclusiveTax ? "EXCLUSIVE" : "INCLUSIVE");
                        const itemName = item.name || item.itemName || item.title || item.itemId?.name || item.productId?.name || (item.category ? `[${item.category}]` : "â€”");
                        
                        const aggKey = `${system}|${taxP}|${taxType}|${itemName}`;
                        
                        if (!aggregatedItems[aggKey]) {
                            aggregatedItems[aggKey] = {
                                system,
                                taxType,
                                percentage: taxP,
                                itemName,
                                qty: 0,
                                taxAmount: 0
                            };
                        }
                        
                        aggregatedItems[aggKey].qty += (item.quantity || 0);
                        aggregatedItems[aggKey].taxAmount += (item.taxAmount || 0);
                    });
                });
            
            columns = ["Tax Profile", "Tax Type", "Percentage", "Item Name", "Qty Sold", "Tax Collected"];
            rows = Object.values(aggregatedItems)
                .sort((a,b) => {
                    if (a.system !== b.system) return a.system.localeCompare(b.system);
                    if (a.percentage !== b.percentage) return b.percentage - a.percentage;
                    return a.itemName.localeCompare(b.itemName);
                })
                .map(row => [
                    row.system,
                    row.taxType,
                    `${row.percentage}%`,
                    row.itemName,
                    row.qty,
                    formatCurrency(row.taxAmount, currency)
                ]);
        } else if (reportCategory === "expenses") {
            columns = ["Date", "Category", "Term", "Type", "Amount"];
            rows = expensesHistory.map((e) => [
                e.date,
                e.category,
                String(e.term || "").toUpperCase(),
                e.type,
                formatCurrency(e.amount, currency)
            ]);
        } else if (reportCategory === "profit_loss" && profitLossReport?.sections) {
            columns = ["Section", "Detail", "Amount"];
            rows = (profitLossReport.sections || []).flatMap((sec) => [
                [sec.label, "Total", formatCurrency(sec.total, currency)],
                ...(sec.items || []).map((item) => [
                    sec.label,
                    item.label,
                    formatCurrency(item.amount, currency),
                ]),
            ]);
            rows.push(["Net Profit", "â€”", formatCurrency(profitLossReport.netProfit, currency)]);
        } else if (reportCategory === "balance_sheet" && balanceSheetReport) {
            columns = ["Section", "Account", "Amount"];
            const bs = balanceSheetReport;
            rows = [
                ["Assets", "Cash & Bank", formatCurrency(bs.assets?.cashAndBank, currency)],
                ["Assets", "Accounts Receivable", formatCurrency(bs.assets?.accountsReceivable, currency)],
                ["Assets", "Inventory", formatCurrency(bs.assets?.inventory, currency)],
                ["Assets", "Total Assets", formatCurrency(bs.assets?.total, currency)],
                ["Liabilities", "Accounts Payable", formatCurrency(bs.liabilities?.accountsPayable, currency)],
                ["Liabilities", "Total Liabilities", formatCurrency(bs.liabilities?.total, currency)],
                ["Equity", "Owner's Equity", formatCurrency(bs.equity?.total, currency)],
            ];
        }

        return { columns, rows };
    };

    const handleExportPDF = () => {
        const { columns, rows } = buildReportData();
        if (!columns.length) return;

        const headerLines = [
            escapeHtml(headerShopName),
            escapeHtml(headerBranchName),
        ];

        const html = `
          <div style="font-family: Inter, -apple-system, system-ui, sans-serif; padding: 24px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; border-bottom:1px solid #eee; padding-bottom:10px;">
              <div style="display: flex; gap: 16px; align-items: flex-start;">
                ${headerLogoUrl ? `<img src="${headerLogoUrl}" style="max-height: 60px; max-width: 120px; object-fit: contain;" />` : ""}
                <div>
                  <div style="font-size:20px; font-weight:900; margin-bottom:4px;">${escapeHtml(headerShopName)}</div>
                  <div style="font-size:12px; font-weight:600; color:#111;">${escapeHtml(headerBranchName)}</div>
                  ${headerContact ? `<div style="font-size:11px; color:#555; margin-top:2px;">Ph: ${escapeHtml(headerContact)}</div>` : ""}
                  ${addressLines.length > 0 ? `<div style="font-size:10px; color:#777; margin-top:2px; line-height:1.4;">${addressLines.map(escapeHtml).join("<br/>")}</div>` : ""}
                  <div style="font-size:11px; color:#777; margin-top:8px; font-weight: 600;">${escapeHtml(rangeLabel)}</div>
                </div>
              </div>
              <div style="text-align:right; font-size:11px; color:#777;">
                <div style="font-weight:700; text-transform:uppercase; letter-spacing:1px; color: #111;">${escapeHtml(reportCategories.find(r => r.id === reportCategory)?.label || "Report")}</div>
                <div>Generated at ${escapeHtml(new Date().toLocaleString())}</div>
              </div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              <thead>
                <tr>
                  ${columns.map(h => `<th style="text-align:left; padding:8px 6px; border-bottom:2px solid #111; background:#fafafa; font-size:11px; text-transform:uppercase; letter-spacing:0.8px;">${escapeHtml(h)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `
                  <tr>
                    ${row.map(cell => `<td style="padding:6px; border-bottom:1px solid #eee;">${escapeHtml(String(cell ?? ""))}</td>`).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `;

        printCustomHtml({
            title: `${headerShopName} - ${reportCategories.find(r => r.id === reportCategory)?.label || "Report"}`,
            bodyHtml: html,
        });
    };

    const handleExportXLSX = () => {
        const { columns, rows } = buildReportData();
        if (!columns.length) return;

        const reportLabel = reportCategories.find(r => r.id === reportCategory)?.label || "Report";

        // Build CSV content (Excel opens .csv natively)
        const escape = (val) => {
            const s = String(val ?? "");
            return s.includes(",") || s.includes('"') || s.includes("\n")
                ? `"${s.replace(/"/g, '""')}"` : s;
        };

        const metaRows = [
            [headerShopName],
            [headerBranchName],
            [rangeLabel],
            [reportLabel],
            [`Generated: ${new Date().toLocaleString()}`],
            [],
        ];

        const csvLines = [
            ...metaRows.map(r => r.map(escape).join(",")),
            columns.map(escape).join(","),
            ...rows.map(row => row.map(escape).join(",")),
        ];

        const csvContent = "\uFEFF" + csvLines.join("\r\n"); // BOM for Excel UTF-8
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${headerShopName}_${reportLabel}_${filterStartDate}_${filterEndDate}.xlsx`.replace(/\s+/g, "_");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExport = (format) => {
        setShowExportPicker(false);
        if (format === "pdf") handleExportPDF();
        else handleExportXLSX();
    };

    const canView = allowedCategories.length > 0;
    if (!canView) {
        return <div className={`p-8 text-center ${theme.textMuted} font-bold`}>You don't have permission to view reports.</div>;
    }

    const renderBalanceSection = (title, section, accentClass) => (
        <div className="space-y-3">
            <h4 className={`text-xs font-black uppercase tracking-widest ${accentClass}`}>{title}</h4>
            <div className="space-y-2">
                {(section?.items || []).map((item) => (
                    <div key={item.label} className={`flex justify-between py-2 px-3 rounded-lg ${theme.pageBg}`}>
                        <span className={`text-sm font-bold ${theme.textSecondary}`}>{item.label}</span>
                        <span className={`text-sm font-black tabular-nums ${theme.textPrimary}`}>
                            {formatCurrency(item.amount, currency)}
                        </span>
                    </div>
                ))}
                <div className={`flex justify-between py-3 px-4 rounded-xl border-2 ${theme.borderLight} font-black`}>
                    <span className={theme.textHeading}>Total {title}</span>
                    <span className={`tabular-nums ${accentClass}`}>{formatCurrency(section?.total, currency)}</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
        <div className={`p-4 md:p-8 h-full overflow-y-auto ${theme.pageBg}`}>
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8">
                <h2 className={`text-2xl md:text-4xl font-black flex items-center ${theme.textHeading}`}>
                    <FileText className="mr-3 text-indigo-600 shrink-0" /> Reports & Analytics
                </h2>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full xl:w-auto">
                    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 ${theme.surfaceBg} border-2 ${theme.borderLight} rounded-2xl px-3 py-2 shadow-sm`}>
                        <DatePicker
                            value={filterStartDate}
                            onChange={val => setFilterStartDate(val || today)}
                            className="w-full sm:w-36 md:w-40"
                            placeholder="From date"
                        />
                        <span className={`text-xs font-bold ${theme.textMuted} hidden sm:inline`}>to</span>
                        <DatePicker
                            value={filterEndDate}
                            onChange={val => setFilterEndDate(val || today)}
                            className="w-full sm:w-36 md:w-40"
                            placeholder="To date"
                        />
                    </div>
                    {availableBranches.length > 1 && (
                        <div className="w-full sm:w-44 md:w-48 z-50 flex-shrink-0">
                            <CommonSelect
                                options={[
                                    { label: "All Branches", value: "all" },
                                    ...availableBranches.map(b => ({ label: b.name, value: b._id || b.id }))
                                ]}
                                value={reportBranchFilter}
                                onChange={(val) => setReportBranchFilter(val)}
                                placeholder="Select Branch"
                            />
                        </div>
                    )}
                    <button
                        onClick={() => setShowExportPicker(true)}
                        className={`w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3 ${theme.buttonBg} ${theme.buttonText} rounded-2xl shadow-sm text-sm font-bold ${theme.buttonHoverBg}`}
                    >
                        <Download size={18} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Global Summary Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className={`p-5 ${theme.infoBg} rounded-2xl border ${theme.infoBorder} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-2">
                        <TrendingUp size={20} className={theme.infoText} />
                        <p className={`text-xs font-bold ${theme.infoText} opacity-70 uppercase`}>Total Revenue</p>
                    </div>
                    <p className={`text-2xl font-black ${theme.infoText}`}>
                        {formatCurrency(
                            salesHistory
                                .filter((s) => isWithinRange(s.date))
                                .reduce((a, b) => a + b.amount, 0),
                            currency
                        )}
                    </p>
                </div>
                <div className={`p-5 ${theme.successBg} rounded-2xl border ${theme.successBorder || 'border-green-100'} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-2">
                        <ReceiptText size={20} className={theme.successText} />
                        <p className={`text-xs font-bold ${theme.successText} opacity-70 uppercase`}>Total Orders</p>
                    </div>
                    <p className={`text-2xl font-black ${theme.successText}`}>
                        {salesHistory.filter((s) => isWithinRange(s.date)).length}
                    </p>
                </div>
                <div className={`p-5 ${theme.warningBg} rounded-2xl border ${theme.warningBorder} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-2">
                        <Coins size={20} className={theme.warningText} />
                        <p className={`text-xs font-bold ${theme.warningText} opacity-70 uppercase`}>Total Expenses</p>
                    </div>
                    <p className={`text-2xl font-black ${theme.warningText}`}>
                        {formatCurrency(
                            expensesHistory
                                .filter((e) => isWithinRange(e.date))
                                .reduce((a, b) => a + b.amount, 0),
                            currency
                        )}
                    </p>
                </div>
                <div className={`p-5 ${theme.surfaceBg} rounded-2xl border ${theme.borderLight} shadow-sm`}>
                    <div className="flex items-center gap-3 mb-2">
                        <Scale size={20} className="text-indigo-600" />
                        <p className={`text-xs font-bold text-indigo-600 opacity-70 uppercase`}>Net Profit</p>
                    </div>
                    <p className={`text-2xl font-black text-indigo-600`}>
                        {formatCurrency(
                            salesHistory
                                .filter((s) => isWithinRange(s.date))
                                .reduce((a, b) => a + b.amount, 0) -
                            expensesHistory
                                .filter((e) => isWithinRange(e.date))
                                .reduce((a, b) => a + b.amount, 0),
                            currency
                        )}
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full lg:h-[calc(100vh-200px)] overflow-hidden">
                {/* Sidebar for Reports */}
                <div className={`w-full lg:w-64 ${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} p-2 lg:p-4 flex flex-row lg:flex-col gap-2 shrink-0 overflow-x-auto lg:overflow-y-auto no-scrollbar`}>
                    {allowedCategories.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setReportCategory(item.id)}
                            className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0 ${reportCategory === item.id
                                ? `${theme.buttonBg} ${theme.buttonText} shadow-md`
                                : `${theme.textMuted} ${theme.sidebarItemHoverBg}`
                                }`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>

                {/* Report Content Area */}
                <div className={`flex-1 ${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} p-4 lg:p-6 overflow-y-auto relative`}>
                    {loading && (
                        <div className={`absolute inset-0 ${theme.surfaceBg}/50 backdrop-blur-sm z-10 flex items-center justify-center`}>
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm font-bold text-indigo-600">Loading Report...</p>
                            </div>
                        </div>
                    )}
                    {/* 1. SALES REPORT */}
                    {reportCategory === "sales" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Sales Summary ({rangeLabel})
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-6 ${theme.infoBg} rounded-2xl border ${theme.infoBorder}`}>
                                    <p className={`text-xs font-bold ${theme.infoText} opacity-70 uppercase`}>Total Revenue</p>
                                    <p className={`text-3xl font-black ${theme.infoText} mt-2`}>
                                        {formatCurrency(
                                            salesHistory
                                                .filter((s) => isWithinRange(s.date))
                                                .reduce((a, b) => a + b.amount, 0),
                                            currency
                                        )}
                                    </p>
                                </div>
                                <div className={`p-6 ${theme.successBg} rounded-2xl border ${theme.successBorder || 'border-green-100'}`}>
                                    <p className={`text-xs font-bold ${theme.successText} opacity-70 uppercase`}>Total Orders</p>
                                    <p className={`text-3xl font-black ${theme.successText} mt-2`}>
                                        {salesHistory.filter((s) => isWithinRange(s.date)).length}
                                    </p>
                                </div>
                                <div className={`p-6 ${theme.warningBg} rounded-2xl border ${theme.warningBorder}`}>
                                    <p className={`text-xs font-bold ${theme.warningText} opacity-70 uppercase`}>Avg Bill Value</p>
                                    <p className={`text-3xl font-black ${theme.warningText} mt-2`}>
                                        {formatCurrency(
                                            salesHistory.filter((s) => isWithinRange(s.date)).length
                                                ? salesHistory
                                                    .filter((s) => isWithinRange(s.date))
                                                    .reduce((a, b) => a + b.amount, 0) /
                                                salesHistory.filter((s) => isWithinRange(s.date)).length
                                                : 0,
                                            currency
                                        )}
                                    </p>
                                </div>
                            </div>
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    ...(reportBranchFilter === "all" ? [{
                                        header: "Branch",
                                        key: "branchName",
                                        className: `text-xs font-bold ${theme.textSecondary}`
                                    }] : []),
                                    {
                                        header: "Sales Invoice",
                                        key: "invoiceNumber",
                                        render: (value) => <span className="font-mono text-xs font-bold">#{value}</span>
                                    },
                                    {
                                        header: "Time",
                                        key: "timestamp",
                                        headerClassName: "text-center",
                                        className: "text-center",
                                        render: (value) => (
                                            <span className="text-sm font-medium">
                                                {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )
                                    },
                                    {
                                        header: "Type",
                                        key: "type",
                                        headerClassName: "text-center",
                                        className: "text-center",
                                        render: (value) => (
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${value === "Dine-in"
                                                    ? (themeName === 'dark' ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-100 text-indigo-600")
                                                    : (themeName === 'dark' ? "bg-orange-900/40 text-orange-400" : "bg-orange-100 text-orange-600")
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
                                        className: "text-right font-black text-indigo-600",
                                        render: (value) => formatCurrency(value, currency)
                                    }
                                ]}
                                data={salesHistory.filter((s) => isWithinRange(s.date))}
                                className="mt-4"
                            />
                        </div>
                    )}

                    {/* 2. ITEM-WISE REPORT */}
                    {reportCategory === "items" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Item-wise Sales
                            </h3>
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    { 
                                        header: "Item Name", 
                                        key: "name", 
                                        width: "40%",
                                        className: `font-bold ${theme.textPrimary}` 
                                    },
                                    { 
                                        header: "Qty Sold", 
                                        key: "qty", 
                                        headerClassName: "text-center",
                                        className: "text-center font-bold" 
                                    },
                                    {
                                        header: "Revenue",
                                        key: "revenue",
                                        headerClassName: "text-right",
                                        className: "text-right font-bold text-indigo-600",
                                        render: (value) => formatCurrency(value, currency)
                                    },
                                    {
                                        header: "Profit",
                                        key: "profit",
                                        headerClassName: "text-right",
                                        className: "text-right font-bold text-emerald-600",
                                        render: (value) => formatCurrency(value, currency)
                                    }
                                ]}
                                data={(() => {
                                    const itemStats = {};
                                    salesHistory
                                        .filter((s) => isWithinRange(s.date))
                                        .forEach((sale) => {
                                            if (sale.items) {
                                                sale.items.forEach((item) => {
                                                    const itemName = item.name || item.itemName || item.title || item.itemId?.name || item.productId?.name || (item.category ? `[${item.category}]` : "â€”");
                                                    if (!itemStats[itemName])
                                                        itemStats[itemName] = { qty: 0, revenue: 0, profit: 0 };
                                                    itemStats[itemName].qty += (item.quantity || 0);
                                                    itemStats[itemName].revenue += (item.price || 0) * (item.quantity || 0);
                                                    itemStats[itemName].profit += ((item.price || 0) - (item.purchasePrice || 0)) * (item.quantity || 0);
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
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Category Performance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(() => {
                                    const catStats = {};
                                    salesHistory
                                        .filter((s) => isWithinRange(s.date))
                                        .forEach((sale) => {
                                            if (sale.items) {
                                                sale.items.forEach((item) => {
                                                    const cat = item.category || "Others";
                                                    if (!catStats[cat]) catStats[cat] = 0;
                                                    catStats[cat] += item.price * item.quantity;
                                                });
                                            }
                                        });
                                    return Object.entries(catStats).map(([cat, revenue]) => (
                                        <div key={cat} className={`p-4 border ${theme.borderLight} rounded-2xl flex justify-between items-center hover:shadow-md transition-all`}>
                                            <span className={`font-bold ${theme.textSecondary}`}>{cat}</span>
                                            <span className="font-black text-indigo-600 text-lg">{formatCurrency(revenue, currency)}</span>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* 4. PAYMENT MODES */}
                    {reportCategory === "payments" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Payment Methods
                            </h3>
                            <div className="space-y-4">
                                {["Cash", "UPI", "Card"].map((method) => {
                                    const total = salesHistory
                                        .filter((s) => isWithinRange(s.date) && s.method === method)
                                        .reduce((a, b) => a + b.amount, 0);
                                    const count = salesHistory.filter(
                                        (s) => isWithinRange(s.date) && s.method === method
                                    ).length;
                                    return (
                                        <div key={method} className={`flex justify-between items-center p-5 ${theme.pageBg} rounded-2xl border ${theme.borderLight}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    method === "Cash" 
                                                        ? (themeName === 'dark' ? "bg-green-900/40 text-green-400" : "bg-green-100 text-green-600")
                                                        : method === "UPI" 
                                                            ? (themeName === 'dark' ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-100 text-indigo-600")
                                                            : (themeName === 'dark' ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-600")
                                                }`}>
                                                    {method === "Cash" ? <Coins size={20} /> : method === "UPI" ? <Zap size={20} /> : <CreditCard size={20} />}
                                                </div>
                                                <div>
                                                    <p className={`font-bold ${theme.textPrimary}`}>{method}</p>
                                                    <p className={`text-xs ${theme.textMuted}`}>{count} Transactions</p>
                                                </div>
                                            </div>
                                            <p className={`text-xl font-black ${theme.textPrimary}`}>{formatCurrency(total, currency)}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 5. TAX REPORT */}
                    {reportCategory === "tax" && (
                        <div className="space-y-12">
                            {(() => {
                                // 1. Calculate all stats in one pass to ensure consistency
                                const profileStats = {};
                                const aggregatedItems = {};
                                let totalTax = 0;

                                salesHistory
                                    .filter((s) => isWithinRange(s.date))
                                    .forEach((sale) => {
                                        const branch = sale.branchName || "Main Branch";
                                        const items = sale.items || [];
                                        items.forEach((item) => {
                                            const system = item.taxSystem || "GST";
                                            const taxP = (item.taxPercent !== undefined && item.taxPercent !== null) 
                                                ? Number(item.taxPercent) 
                                                : (settings?.defaultTaxPercent || 0);
                                            const taxType = item.taxType || (item.isExclusiveTax ? "EXCLUSIVE" : "INCLUSIVE");
                                            const itemName = item.name || item.itemName || item.title || item.itemId?.name || item.productId?.name || (item.category ? `[${item.category}]` : "â€”");
                                            const taxAmount = (item.taxAmount || 0);

                                            // Skip zero-amount NONE profiles
                                            if (system === "NONE" && taxAmount === 0) return;

                                            // Accumulate Profile Stats (Cards)
                                            const profileKey = `${branch}|${system}`;
                                            if (!profileStats[profileKey]) {
                                                profileStats[profileKey] = { branch, system, amount: 0 };
                                            }
                                            profileStats[profileKey].amount += taxAmount;

                                            // Accumulate Aggregated Items (Table)
                                            const aggKey = `${system}|${taxP}|${taxType}|${itemName}`;
                                            if (!aggregatedItems[aggKey]) {
                                                aggregatedItems[aggKey] = {
                                                    system,
                                                    percentage: taxP,
                                                    taxType,
                                                    itemName,
                                                    qty: 0,
                                                    taxAmount: 0
                                                };
                                            }
                                            aggregatedItems[aggKey].qty += (item.quantity || 0);
                                            aggregatedItems[aggKey].taxAmount += taxAmount;

                                            // Total Tax
                                            totalTax += taxAmount;
                                        });
                                    });

                                const sortedProfileStats = Object.values(profileStats).sort((a,b) => b.amount - a.amount);
                                const sortedTableData = Object.values(aggregatedItems).sort((a,b) => {
                                    if (a.system !== b.system) return a.system.localeCompare(b.system);
                                    if (a.percentage !== b.percentage) return b.percentage - a.percentage;
                                    return a.itemName.localeCompare(b.itemName);
                                });

                                return (
                                    <>
                                        {/* TOTAL TAX BANNER */}
                                        <div className={`p-8 ${theme.infoBg} rounded-[32px] border ${theme.infoBorder} text-center shadow-lg shadow-indigo-100/50`}>
                                            <p className={`text-sm font-bold ${theme.infoText} opacity-70 uppercase tracking-[0.2em]`}>Total Tax Collected</p>
                                            <p className={`text-5xl font-black ${theme.infoText} mt-2`}>
                                                {formatCurrency(totalTax, currency)}
                                            </p>
                                        </div>

                                        {/* SUMMARY CARDS BY BRANCH/PROFILE */}
                                        <div className="space-y-6">
                                            <h4 className={`text-sm font-black ${theme.textSecondary} uppercase tracking-widest`}>Tax Summary by Branch & Profile</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {sortedProfileStats.length === 0 ? (
                                                    <div className={`col-span-full p-4 ${theme.inputBg} rounded-2xl text-center ${theme.textMuted} font-bold`}>
                                                        No tax data found for this period
                                                    </div>
                                                ) : (
                                                    sortedProfileStats.map((stat, idx) => (
                                                        <div key={idx} className={`${theme.pageBg} rounded-[32px] border ${theme.borderLight} p-6 shadow-sm`}>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                                    {stat.system}
                                                                </span>
                                                                <span className={`text-[10px] font-black ${theme.textMuted} uppercase`}>
                                                                    {stat.branch}
                                                                </span>
                                                            </div>
                                                            <p className={`text-3xl font-black ${theme.textHeading}`}>
                                                                {formatCurrency(stat.amount, currency)}
                                                            </p>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* PERCENTAGE BREAKDOWN TABLE */}
                                        <div className="space-y-6">
                                            <h4 className={`text-sm font-black ${theme.textSecondary} uppercase tracking-widest`}>Tax Percentage Breakdown</h4>
                                            {sortedTableData.length === 0 ? (
                                                <div className={`p-8 text-center ${theme.textMuted} font-bold italic`}>No items with tax data found</div>
                                            ) : (
                                                <div className={`${theme.pageBg} rounded-[32px] border ${theme.borderLight} overflow-hidden shadow-sm`}>
                                                    <CommonTable
                                                        selectable={false}
                                                        showExport={false}
                                                        columns={[
                                                            { header: "Tax Profile", key: "system", className: "font-black text-[10px] text-indigo-500 uppercase tracking-wider" },
                                                            { 
                                                                header: "Tax Type", 
                                                                key: "taxType", 
                                                                headerClassName: "text-center", 
                                                                className: "text-center text-[10px] font-bold uppercase",
                                                                render: (v) => (
                                                                    <span className={`px-2 py-0.5 rounded-lg ${v === "EXCLUSIVE" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                                                        {v}
                                                                    </span>
                                                                )
                                                            },
                                                            { 
                                                                header: "Percentage", 
                                                                key: "percentage", 
                                                                headerClassName: "text-center", 
                                                                className: "text-center font-black",
                                                                render: (v) => `${v}%`
                                                            },
                                                            { header: "Item Name", key: "itemName", className: `font-bold ${theme.textPrimary}` },
                                                            { header: "Quantity", key: "qty", headerClassName: "text-center", className: "text-center font-bold" },
                                                            { 
                                                                header: "Tax Collected", 
                                                                key: "taxAmount", 
                                                                headerClassName: "text-right", 
                                                                className: "text-right font-black text-emerald-600",
                                                                render: (v) => formatCurrency(v, currency)
                                                            }
                                                        ]}
                                                        data={sortedTableData}
                                                        className="border-none shadow-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}

                    {/* 6. STAFF PERFORMANCE REPORT */}
                    {reportCategory === "staff_report" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Staff Performance ({rangeLabel})
                            </h3>
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    { header: "Staff Name", key: "employeeName", className: `font-bold ${theme.textPrimary}` },
                                    { 
                                        header: "Orders", 
                                        key: "stats.orders", 
                                        headerClassName: "text-center",
                                        className: "text-center font-bold",
                                        render: (_, row) => row.stats.orders
                                    },
                                    {
                                        header: "Orders Value",
                                        key: "stats.sales",
                                        headerClassName: "text-right",
                                        className: `text-right font-bold text-indigo-600`,
                                        render: (_, row) => formatCurrency(row.stats.sales, currency)
                                    },
                                    { 
                                        header: "KOTs", 
                                        key: "stats.kots", 
                                        headerClassName: "text-center",
                                        className: "text-center font-bold",
                                        render: (_, row) => row.stats.kots
                                    },
                                    { 
                                        header: "Served", 
                                        key: "stats.served", 
                                        headerClassName: "text-center",
                                        className: "text-center font-bold",
                                        render: (_, row) => row.stats.served
                                    },
                                    {
                                        header: "Cash Coll.",
                                        key: "stats.cash",
                                        headerClassName: "text-right",
                                        className: `text-right font-bold text-emerald-600`,
                                        render: (_, row) => formatCurrency(row.stats.cash)
                                    },
                                    { 
                                        header: "Purchases", 
                                        key: "stats.purchases", 
                                        headerClassName: "text-center",
                                        className: "text-center font-bold",
                                        render: (_, row) => row.stats.purchases
                                    }
                                ]}
                                data={performanceReport}
                            />
                        </div>
                    )}

                    {/* ... other categories (Table, Hourly, Online) ... */}
                    {/* 7. TABLE REVENUE REPORT */}
                    {reportCategory === "table_report" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Table Revenue Analysis ({rangeLabel})
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {tables.map((t) => {
                                    const tableSales = salesHistory.filter(
                                        (s) => isWithinRange(s.date) && s.tableName === t.name
                                    );
                                    const totalRevenue = tableSales.reduce((sum, s) => sum + s.amount, 0);
                                    const orderCount = tableSales.length;
                                    return (
                                        <div key={t.id} className={`p-4 border ${theme.borderLight} rounded-2xl flex flex-col justify-between hover:shadow-md transition-all ${theme.pageBg}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`font-bold ${theme.textPrimary} text-lg`}>{t.name}</span>
                                                <span className={`text-xs ${theme.surfaceBg} px-2 py-1 rounded border ${theme.borderLight} ${theme.textMuted}`}>{orderCount} Orders</span>
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
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Hourly Sales & Activity ({rangeLabel})
                            </h3>
                            <div className={`h-64 flex items-end justify-between gap-1 px-2 pb-2 border-b border-dashed ${theme.borderLight} min-w-[600px] overflow-x-auto`}>
                                {(() => {
                                    const hourlyData = [...Array(14)].map((_, i) => {
                                        const hour = 9 + i;
                                        const hourSales = salesHistory.filter(
                                            (s) => isWithinRange(s.date) && new Date(s.timestamp).getHours() === hour
                                        );
                                        const revenue = hourSales.reduce((a, b) => a + Number(b.amount || 0), 0);
                                        const count = hourSales.length;
                                        return { hour, revenue, count, i };
                                    });

                                    let maxRevInRange = Math.max(...hourlyData.map(d => d.revenue), 0);
                                    if (isNaN(maxRevInRange) || maxRevInRange <= 0) maxRevInRange = 1000;

                                    return hourlyData.map(({ hour, revenue, count, i }) => {
                                        const scaleFactor = (revenue / maxRevInRange);
                                        const height = revenue > 0 
                                            ? Math.max(12, (isNaN(scaleFactor) ? 0 : scaleFactor) * 100) 
                                            : 5;
                                        const isActive = revenue > 0;

                                        return (
                                            <div key={i} className="flex flex-col items-center gap-1 group flex-1 min-w-[40px] h-full">
                                                <div className="flex-1 w-full flex items-end justify-center relative">
                                                    <div
                                                        className={`w-full rounded-t-lg relative transition-all flex items-end justify-center ${
                                                            isActive 
                                                                ? "bg-indigo-500 group-hover:bg-indigo-600 shadow-sm" 
                                                                : `${theme.borderLight} bg-opacity-20 group-hover:bg-opacity-40`
                                                        } ${!isActive && themeName === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}
                                                        style={{ height: `${height}%` }}
                                                    >
                                                        {isActive && (
                                                            <span className="absolute -top-6 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-md font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                {count} Orders
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-bold ${isActive ? "text-indigo-600" : theme.textMuted} pb-1`}>
                                                    {hour > 12 ? hour - 12 : hour} {hour >= 12 ? "PM" : "AM"}
                                                </span>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}

                    {/* 9. ONLINE ORDERS REPORT */}
                    {reportCategory === "online_report" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
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
                                        <div key={plat} className={`p-6 rounded-3xl border flex flex-col ${plat === "Zomato" ? (themeName === 'dark' ? "bg-red-900/20 border-red-800/50" : "bg-red-50 border-red-100") : plat === "Swiggy" ? (themeName === 'dark' ? "bg-orange-900/20 border-orange-800/50" : "bg-orange-50 border-orange-100") : `${theme.pageBg} ${theme.borderLight}`}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <h4 className={`text-lg font-black ${plat === "Zomato" ? "text-red-500" : plat === "Swiggy" ? "text-orange-500" : theme.textSecondary}`}>{plat}</h4>
                                                <span className={`${theme.surfaceBg} px-3 py-1 rounded-full text-xs font-bold shadow-sm ${theme.textPrimary}`}>{stats.count} Orders</span>
                                            </div>
                                            <p className={`text-3xl font-black ${theme.textHeading}`}>{formatCurrency(stats.sales)}</p>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* PROFIT & LOSS */}
                    {reportCategory === "profit_loss" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Profit & Loss Statement ({rangeLabel})
                            </h3>
                            {profitLossReport ? (
                                <ProfitLossAccordion
                                    profitLossReport={profitLossReport}
                                    salesInRange={salesInRange}
                                    expandedPlSections={expandedPlSections}
                                    togglePlSection={togglePlSection}
                                    formatCurrency={formatCurrency}
                                    currency={currency}
                                    theme={theme}
                                />
                            ) : (
                                <p className={`text-sm font-bold ${theme.textMuted}`}>No profit & loss data for this period.</p>
                            )}
                        </div>
                    )}

                    {/* BALANCE SHEET */}
                    {reportCategory === "balance_sheet" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Balance Sheet (as of {balanceSheetReport?.asOfDate || filterEndDate})
                            </h3>
                            {balanceSheetReport ? (
                                <>
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {renderBalanceSection('Assets', balanceSheetReport.assets, 'text-indigo-600')}
                                        {renderBalanceSection('Liabilities', balanceSheetReport.liabilities, 'text-red-600')}
                                        {renderBalanceSection('Equity', balanceSheetReport.equity, 'text-emerald-600')}
                                    </div>
                                    <div className={`p-4 rounded-2xl border-2 ${theme.borderLight} flex flex-wrap justify-between gap-4 font-black`}>
                                        <span className={theme.textHeading}>
                                            Total Assets: {formatCurrency(balanceSheetReport.totalAssets, currency)}
                                        </span>
                                        <span className={theme.textMuted}>
                                            Liabilities + Equity: {formatCurrency(balanceSheetReport.totalLiabilitiesAndEquity, currency)}
                                        </span>
                                    </div>
                                    <p className={`text-xs ${theme.textMuted} font-medium`}>
                                        Snapshot as of the end date. Cash is estimated from cumulative customer receipts minus supplier payments. Inventory uses current on-hand quantity at average cost.
                                    </p>
                                </>
                            ) : (
                                <p className={`text-sm font-bold ${theme.textMuted}`}>No balance sheet data available.</p>
                            )}
                        </div>
                    )}

                    {/* 10. EXPENSE LEDGER */}
                    {reportCategory === "expenses" && (
                        <div className="space-y-6">
                            <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-4`}>
                                <h3 className={`text-xl font-black ${theme.textHeading}`}>
                                    Expense Ledger ({rangeLabel})
                                </h3>
                                <div className={`px-4 py-2 opacity-90 rounded-xl font-black text-sm ${expensesHistory.reduce((a, b) => a + Number(b.amount || 0), 0) < 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                    Total: {formatCurrency(expensesHistory.reduce((a, b) => a + Number(b.amount || 0), 0))}
                                </div>
                            </div>
                            
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    ...(reportBranchFilter === "all" ? [{
                                        header: "Branch",
                                        key: "branchName",
                                        className: `text-xs font-bold ${theme.textSecondary}`
                                    }] : []),
                                    {
                                        header: "Date/Type",
                                        key: "date",
                                        render: (val, row) => (
                                            <div className="flex flex-col">
                                                <span className="font-bold text-xs">{val}</span>
                                                <span className={`text-[9px] uppercase font-black tracking-widest ${
                                                    row.type === 'Fixed' ? 'text-indigo-500' :
                                                    row.type === 'Purchase' ? 'text-blue-500' :
                                                    row.type === 'Payroll' ? 'text-rose-500' :
                                                    row.type === 'Stock Add' ? 'text-cyan-500' :
                                                    row.type === 'Stock Reduce' ? 'text-emerald-500' :
                                                    'text-orange-500'
                                                }`}>
                                                    {row.type}
                                                </span>
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Category",
                                        key: "category",
                                        className: "font-bold",
                                        width: "40%"
                                    },
                                    {
                                        header: "Billing Term",
                                        key: "term",
                                        className: "uppercase text-[10px] font-black tracking-widest opacity-60",
                                        headerClassName: "text-center",
                                        render: (v) => v?.toUpperCase()
                                    },
                                    {
                                        header: "Amount",
                                        key: "amount",
                                        headerClassName: "text-right",
                                        render: (value) => (
                                            <div className={`text-right font-black ${value < 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {formatCurrency(value)}
                                            </div>
                                        )
                                    }
                                ]}
                                data={expensesHistory}
                            />
                        </div>
                    )}

                    {/* 11. PARTIES REPORT */}
                    {reportCategory === "parties" && (
                        <div className="space-y-6">
                            {!selectedParty ? (
                                <>
                                    <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-4`}>
                                        <h3 className={`text-xl font-black ${theme.textHeading}`}>Parties Reports</h3>
                                        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl">
                                            <button 
                                                onClick={() => setPartyTab("customers")}
                                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${partyTab === "customers" ? `${theme.buttonBg} ${theme.buttonText} shadow-lg` : theme.textMuted}`}
                                            >
                                                Customers
                                            </button>
                                            <button 
                                                onClick={() => setPartyTab("suppliers")}
                                                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${partyTab === "suppliers" ? `${theme.buttonBg} ${theme.buttonText} shadow-lg` : theme.textMuted}`}
                                            >
                                                Suppliers
                                            </button>
                                        </div>
                                    </div>

                                    {partyTab === "customers" ? (
                                        <CommonTable
                                            selectable={false}
                                            showExport={false}
                                            columns={[
                                                { header: "Customer", key: "name", className: `font-bold ${theme.textPrimary}` },
                                                { header: "Orders", key: "stats.orders", className: "text-center font-bold", render: (_, r) => r.stats.orders },
                                                { header: "Revenue", key: "stats.revenue", className: "text-right font-black text-indigo-600", render: (_, r) => formatCurrency(r.stats.revenue) },
                                                { header: "Profit", key: "stats.profit", className: "text-right font-black text-emerald-600", render: (_, r) => formatCurrency(r.stats.profit) },
                                                {
                                                    header: "Action",
                                                    key: "id",
                                                    className: "text-right",
                                                    render: (id, r) => (
                                                        <button 
                                                            onClick={() => setSelectedParty({ id: r.id, name: r.name, type: 'customer' })}
                                                            className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-tighter text-indigo-600 hover:underline`}
                                                        >
                                                            View <ChevronRight size={14} />
                                                        </button>
                                                    )
                                                }
                                            ]}
                                            data={customerReport}
                                        />
                                    ) : (
                                        <CommonTable
                                            selectable={false}
                                            showExport={false}
                                            columns={[
                                                { header: "Supplier", key: "name", className: `font-bold ${theme.textPrimary}` },
                                                { header: "Last Invoice", key: "stats.lastInvoiceNumber", className: "font-mono text-xs font-bold text-center", render: (_, r) => r?.stats?.lastInvoiceNumber || "N/A" },
                                                { header: "Bills", key: "stats.invoices", className: "text-center font-bold", render: (_, r) => r.stats.invoices },
                                                { header: "Purchases", key: "stats.totalPurchases", className: "text-right font-black text-blue-600", render: (_, r) => formatCurrency(r.stats.totalPurchases) },
                                                { header: "Balance", key: "stats.balance", className: "text-right font-black text-red-600", render: (_, r) => formatCurrency(r.stats.balance) },
                                                {
                                                    header: "Action",
                                                    key: "id",
                                                    className: "text-right",
                                                    render: (id, r) => (
                                                        <button 
                                                            onClick={() => setSelectedParty({ id: r.id, name: r.name, type: 'supplier' })}
                                                            className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-tighter text-indigo-600 hover:underline`}
                                                        >
                                                            View <ChevronRight size={14} />
                                                        </button>
                                                    )
                                                }
                                            ]}
                                            data={supplierReport}
                                        />
                                    )}
                                </>
                            ) : (
                                <div className="space-y-6">
                                    <div className={`flex items-center justify-between border-b ${theme.borderLight} pb-4`}>
                                        <button 
                                            onClick={() => setSelectedParty(null)}
                                            className={`text-xs font-black uppercase tracking-widest ${theme.textMuted} hover:${theme.textPrimary} flex items-center gap-1`}
                                        >
                                            <ChevronRight size={16} className="rotate-180" /> Summary
                                        </button>
                                        <h3 className={`text-xl font-black ${theme.textHeading}`}>{selectedParty.name}</h3>
                                        <div className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${selectedParty.type === 'customer' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>{selectedParty.type}</div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 space-y-4">
                                            <h4 className={`text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>Ledger</h4>
                                            <CommonTable
                                                selectable={false}
                                                showExport={false}
                                                columns={[
                                                    { header: "Date", key: "date", render: (v) => new Date(v).toLocaleDateString() },
                                                    { header: "Reference", key: "reference", className: "font-mono text-xs" },
                                                    { header: "Type", key: "type", className: "text-[10px] font-black" },
                                                    { header: "Total", key: "total", className: "text-right font-bold", render: (v) => formatCurrency(v) },
                                                    { header: "Paid", key: "paid", className: "text-right font-bold text-green-600", render: (v) => formatCurrency(v) },
                                                    { header: "Balance", key: "balance", className: "text-right font-black text-red-600", render: (v) => formatCurrency(v) },
                                                ]}
                                                data={partyStatement}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className={`text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>Products</h4>
                                            <div className={`p-4 rounded-3xl border ${theme.borderLight} divide-y ${theme.borderLight}`}>
                                                {partyItems.length > 0 ? partyItems.map(item => (
                                                    <div key={item._id || item.id} className="py-3 first:pt-0 last:pb-0">
                                                        <div className="flex justify-between items-start">
                                                            <span className={`text-sm font-bold ${theme.textPrimary}`}>{item.name}</span>
                                                            <span className={`text-xs font-black text-indigo-600`}>{item.totalQty}</span>
                                                        </div>
                                                        <div className={`text-[10px] font-medium ${theme.textMuted} mt-1`}>Val: {formatCurrency(item.totalValue)}</div>
                                                    </div>
                                                )) : (
                                                    <p className={`text-xs font-bold ${theme.textMuted} text-center py-6`}>No data</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Export Format Picker Modal */}
        {showExportPicker && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                <div className={`${theme.surfaceBg} border ${theme.borderLight} rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-150`}>
                    <h3 className={`text-lg font-black ${theme.textHeading} mb-1`}>Export Report</h3>
                    <p className={`text-sm ${theme.textMuted} mb-6`}>Choose a format to download the current report.</p>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {/* PDF */}
                        <button
                            onClick={() => handleExport("pdf")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ${theme.borderLight} ${theme.sectionBg} group`}
                        >
                            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileText size={24} className="text-red-600 dark:text-red-400" />
                            </div>
                            <div className="text-center">
                                <p className={`font-black text-sm ${theme.textHeading}`}>PDF</p>
                                <p className={`text-[10px] font-bold ${theme.textMuted}`}>Print / Save as PDF</p>
                            </div>
                        </button>

                        {/* XLSX */}
                        <button
                            onClick={() => handleExport("xlsx")}
                            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 ${theme.borderLight} ${theme.sectionBg} group`}
                        >
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Download size={24} className="text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="text-center">
                                <p className={`font-black text-sm ${theme.textHeading}`}>Excel</p>
                                <p className={`text-[10px] font-bold ${theme.textMuted}`}>Download .xlsx file</p>
                            </div>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowExportPicker(false)}
                        className={`w-full py-3 rounded-2xl font-bold text-sm ${theme.sectionBg} ${theme.textMuted} hover:${theme.textPrimary} transition-colors border ${theme.borderLight}`}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

export default Reports;

