import React, { useState, useEffect } from 'react';
import {
    FileText,
    FileSpreadsheet,
    Download,
    TrendingUp,
    TrendingDown,
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
    Landmark,
    ShoppingBag,
    ArrowUpRight,
    ArrowDownRight,
    Factory,
    Boxes,
    GitFork,
    Building2,
    Percent,
    SlidersHorizontal,
    X,
    RotateCcw,
    Filter,
    Calendar,
    Sparkles,
    Check,
    ChevronDown
} from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";
import CommonTable from '../../components/CommonTable';
import DatePicker from "../../components/ui/DatePicker";
import CommonSelect from "../../components/ui/CommonSelect";

import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { usePermission } from "../../auth/usePermission";
import api, { reportsService, itemService, categoryService, taxService } from "../../services/api";
import { PurchaseService } from "../../services/PurchaseService";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { printCustomHtml, escapeHtml } from "../../utils/print";
import { exportProfitLoss } from "../../utils/exportProfitLoss";
import * as XLSX from 'xlsx';

const toAbsoluteLogoUrl = (logoUrl) => {
    if (!logoUrl) return null;
    if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
    const base = (api?.defaults?.baseURL || "").replace(/\/api\/?$/, "");
    if (!base) return logoUrl;
    return `${base}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
};

const baseReportCategories = [
    { id: "sales", label: "Sales Reports", icon: <TrendingUp size={16} />, permission: "SALES_REPORTS" },
    { id: "purchases", label: "Purchase Report", icon: <ShoppingBag size={16} />, permission: "PURCHASE.REPORT" },
    { id: "stock_wise", label: "Stock-wise Report", icon: <Boxes size={16} />, permission: "STOCK_WISE_REPORT" },
    { id: "manufacturing", label: "Manufacturing Report", icon: <Factory size={16} />, permission: "MANUFACTURING_REPORT", manufacturedOnly: true },
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
    const isDark = themeName === 'dark' || themeName === 'ocean';
    const { organization, branches, currentShopId, activeBranchId, formatCurrency } = useApp();
    const currencyRaw = organization?.defaultCurrency || 'INR';
    const currency = typeof currencyRaw === 'object' ? (currencyRaw.code || 'INR') : currencyRaw;
    const { can } = usePermission();
    const [reportCategory, setReportCategory] = useState("sales");
    const today = new Date().toISOString().split("T")[0];
    const [filterStartDate, setFilterStartDate] = useState(today);
    const [filterEndDate, setFilterEndDate] = useState(today);
    const [salesHistory, setSalesHistory] = useState([]);
    const [purchasesHistory, setPurchasesHistory] = useState([]);
    const [expensesHistory, setExpensesHistory] = useState([]);
    const [paymentFilter, setPaymentFilter] = useState("all"); // 'all' | 'sales' | 'purchases'
    
    // Dedicated isolated report filters (do NOT affect other reports)
    const [salesViewMode, setSalesViewMode] = useState("summary"); // 'summary' | 'itemized'
    const [purchaseViewMode, setPurchaseViewMode] = useState("summary"); // 'summary' | 'itemized'
    const [salesTaxFilter, setSalesTaxFilter] = useState("all"); // 'all' | 'taxable' | 'non_taxable'
    const [salesTaxPercentFilter, setSalesTaxPercentFilter] = useState("all"); // 'all' | percentage
    const [purchaseSupplierFilter, setPurchaseSupplierFilter] = useState("all"); // 'all' | supplierId
    const [purchaseTaxFilter, setPurchaseTaxFilter] = useState("all"); // 'all' | 'taxable' | 'non_taxable'
    const [purchaseTaxPercentFilter, setPurchaseTaxPercentFilter] = useState("all"); // 'all' | percentage
    const [showMoreFilters, setShowMoreFilters] = useState(false);
    const [showDatePresetsPopover, setShowDatePresetsPopover] = useState(false);
    const [taxesList, setTaxesList] = useState([]);
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
    const [manufacturingReport, setManufacturingReport] = useState({ summary: {}, data: [] });
    const [stockWiseReport, setStockWiseReport] = useState({ summary: {}, data: [] });
    const [stockSearchQuery, setStockSearchQuery] = useState("");
    const [stockStatusFilter, setStockStatusFilter] = useState("all");
    const [itemList, setItemList] = useState([]);
    const [categoryList, setCategoryList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showExportPicker, setShowExportPicker] = useState(false);
    const resolvedShopId = shopId || currentShopId;

    const { user } = useAuth();

    const isManufacturedEnabled = Boolean(
        organization?.sellManufacturedItems ||
        organization?.businessType?.sellManufacturedItems ||
        settings?.sellManufacturedItems ||
        ['restaurant', 'cafe', 'fine_dining', 'casual', 'bakery'].includes(String(organization?.businessType?.code || organization?.businessType?.name || organization?.businessType || '').toLowerCase())
    );

    const isTableEnabled = Boolean(
        (tables && tables.length > 0) ||
        organization?.enableDining === true ||
        organization?.businessType?.enableTables === true ||
        ['restaurant', 'cafe', 'fine_dining', 'casual', 'bar', 'hotel', 'resort'].includes(String(organization?.businessType?.code || organization?.businessType?.name || organization?.businessType || '').toLowerCase())
    );

    const isOnlineOrdersEnabled = Boolean(
        (onlineOrders && onlineOrders.length > 0) ||
        organization?.enableOnlineOrders === true ||
        organization?.businessType?.enableOnlineOrders === true
    );

    const hasReportPermission = React.useCallback((permKey, catId) => {
        if (!permKey) return true;

        // SuperAdmin bypasses permission checks
        if (user?.isSuperAdmin) {
            return true;
        }

        // If user has no permissions object attached at all, default to allowed
        if (!user?.permissions || typeof user.permissions !== 'object') {
            return true;
        }

        // Standard RBAC check via usePermission hook
        if (can("reports", permKey)) return true;

        const lowerKey = String(permKey).toLowerCase();
        const upperKey = String(permKey).toUpperCase();
        const categoryId = String(catId || '').toLowerCase();
        const categoryUpper = String(catId || '').toUpperCase();

        if (can("reports", lowerKey)) return true;
        if (can("reports", `reports.${lowerKey}`)) return true;
        if (can("reports", `reports.${lowerKey.replace(/_/g, '.')}`)) return true;
        if (can("reports", lowerKey.replace(/_/g, '.'))) return true;

        if (categoryId) {
            if (can("reports", categoryId)) return true;
            if (can("reports", `reports.${categoryId}`)) return true;
            if (can("reports", `REPORTS.${categoryUpper}`)) return true;
        }

        // Check user.permissions.reports array with exact normalized candidate matching
        const reportsPerms = user?.permissions?.reports || user?.permissions?.REPORTS;
        if (Array.isArray(reportsPerms)) {
            const candidates = new Set([
                permKey,
                lowerKey,
                upperKey,
                `reports.${lowerKey}`,
                `REPORTS.${upperKey}`,
                lowerKey.replace(/_/g, '.'),
                upperKey.replace(/_/g, '.'),
                categoryId,
                categoryUpper,
                `reports.${categoryId}`,
                `REPORTS.${categoryUpper}`
            ].filter(Boolean));

            const found = reportsPerms.some(p => {
                const str = String(p).trim();
                const strLower = str.toLowerCase();
                const strUpper = str.toUpperCase();
                return (
                    candidates.has(str) ||
                    candidates.has(strLower) ||
                    candidates.has(strUpper) ||
                    candidates.has(strUpper.replace('REPORTS.', '')) ||
                    candidates.has(strLower.replace('reports.', ''))
                );
            });
            if (found) return true;
        }

        return false;
    }, [user, can]);

    const allowedCategories = React.useMemo(() => {
        return baseReportCategories.filter(item => {
            const hasPerm = hasReportPermission(item.permission, item.id);

            // 1. Manufacturing Report: show if user HAS permission OR if sellManufacturedItems is enabled
            if (item.id === "manufacturing") {
                return hasPerm || isManufacturedEnabled;
            }

            // 2. Table Revenue Report: show ONLY if table/dining enabled AND permitted
            if (item.id === "table_report") {
                return isTableEnabled && hasPerm;
            }

            // 3. Online Orders Report: show ONLY if online orders enabled AND permitted
            if (item.id === "online_report") {
                return isOnlineOrdersEnabled && hasPerm;
            }

            // 4. Standard Reports: check permission
            return hasPerm;
        });
    }, [hasReportPermission, isManufacturedEnabled, isTableEnabled, isOnlineOrdersEnabled]);

    useEffect(() => {
        if (allowedCategories.length > 0 && !allowedCategories.some(c => c.id === reportCategory)) {
            setReportCategory(allowedCategories[0].id);
        }
    }, [allowedCategories, reportCategory]);
    
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
        // Do NOT auto-reset to 'all' if branches list grows — user may have chosen a branch
    }, [availableBranches.length]);

    const fetchData = React.useCallback(async () => {
        console.log("DEBUG_REPORTS_FETCH_DATA_START:", { resolvedShopId, reportBranchFilter, filterStartDate, filterEndDate, salesTaxFilter, salesTaxPercentFilter, purchaseSupplierFilter, purchaseTaxFilter, purchaseTaxPercentFilter });
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

            const [salesRes, expensesRes, perfRes, custRes, suppRes, plRes, bsRes, purchasesRes, mfgRes, itemsRes, catRes, stockWiseRes, taxesRes] = await Promise.all([
                reportsService.getSalesReport({ ...params, taxFilter: salesTaxFilter, taxPercent: salesTaxPercentFilter }),
                reportsService.getExpensesReport(params),
                reportsService.getPerformanceReport(params),
                reportsService.getCustomerReport(params),
                reportsService.getSupplierReport(params),
                reportsService.getProfitLossReport(params),
                reportsService.getBalanceSheetReport(params),
                reportsService.getPurchaseReport({ ...params, supplierId: purchaseSupplierFilter, taxFilter: purchaseTaxFilter, taxPercent: purchaseTaxPercentFilter }).catch(() => PurchaseService.getPurchases({ ...params, supplierId: purchaseSupplierFilter, taxFilter: purchaseTaxFilter, taxPercent: purchaseTaxPercentFilter }).catch(() => [])),
                reportsService.getManufacturingReport(params).catch(() => ({ summary: {}, data: [] })),
                itemService.getItems({ page: 1, limit: 1000, search: "", filters: { shopId: resolvedShopId, branchId: reportBranchFilter } }).catch(() => ({ data: [] })),
                categoryService.getCategories({ shopId: resolvedShopId }).catch(() => ([])),
                reportsService.getStockWiseReport(params).catch(() => ({ summary: {}, data: [] })),
                taxService.getTaxes({ shopId: resolvedShopId }).catch(() => ([]))
            ]);

            setSalesHistory(unwrapApiData(salesRes));
            setExpensesHistory(unwrapApiData(expensesRes));
            setPerformanceReport(unwrapApiData(perfRes));
            setCustomerReport(unwrapApiData(custRes));
            setSupplierReport(unwrapApiData(suppRes));
            setProfitLossReport(plRes?.data || plRes || null);
            setBalanceSheetReport(bsRes?.data || bsRes || null);
            setPurchasesHistory(unwrapApiData(purchasesRes));
            setManufacturingReport(mfgRes?.data ? mfgRes : { summary: mfgRes?.summary || {}, data: unwrapApiData(mfgRes) });
            setStockWiseReport(stockWiseRes?.data ? stockWiseRes : { summary: stockWiseRes?.summary || {}, data: unwrapApiData(stockWiseRes) });
            setItemList(unwrapApiData(itemsRes));
            setCategoryList(unwrapApiData(catRes));
            setTaxesList(unwrapApiData(taxesRes));
        } catch (error) {
            console.error("Failed to fetch report data:", error);
        } finally {
            setLoading(false);
        }
    }, [resolvedShopId, reportBranchFilter, filterStartDate, filterEndDate, salesTaxFilter, salesTaxPercentFilter, purchaseSupplierFilter, purchaseTaxFilter, purchaseTaxPercentFilter]);

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

    const presetsList = React.useMemo(() => {
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];

        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yesterdayStr = y.toISOString().split("T")[0];

        const d7 = new Date();
        d7.setDate(d7.getDate() - 6);
        const last7Str = d7.toISOString().split("T")[0];

        const d30 = new Date();
        d30.setDate(d30.getDate() - 29);
        const last30Str = d30.toISOString().split("T")[0];

        const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        
        const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
        const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

        const firstDayYear = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

        return [
            { id: "today", label: "Today", startDate: todayStr, endDate: todayStr },
            { id: "yesterday", label: "Yesterday", startDate: yesterdayStr, endDate: yesterdayStr },
            { id: "last7", label: "Last 7 Days", startDate: last7Str, endDate: todayStr },
            { id: "last30", label: "Last 30 Days", startDate: last30Str, endDate: todayStr },
            { id: "thisMonth", label: "This Month", startDate: firstDayMonth, endDate: todayStr },
            { id: "lastMonth", label: "Last Month", startDate: lastMonthFirst, endDate: lastMonthLast },
            { id: "thisYear", label: "This Year", startDate: firstDayYear, endDate: todayStr }
        ];
    }, [today]);

    const activePreset = React.useMemo(() => {
        return presetsList.find(p => p.startDate === filterStartDate && p.endDate === filterEndDate);
    }, [presetsList, filterStartDate, filterEndDate]);

    const activePresetLabel = activePreset ? activePreset.label : "Custom Range";
    const activePresetId = activePreset ? activePreset.id : "custom";

    const taxRateOptions = React.useMemo(() => {
        const rates = new Set([0, 5, 12, 18, 28]);
        (taxesList || []).forEach(t => {
            if (t.percentage !== undefined && t.percentage !== null) {
                rates.add(Number(t.percentage));
            }
        });
        const sorted = Array.from(rates).sort((a, b) => a - b);
        return [
            { label: "All Tax Rates (%)", value: "all" },
            ...sorted.map(r => ({ label: `${r}% Tax`, value: String(r) }))
        ];
    }, [taxesList]);

    const filteredSalesHistory = React.useMemo(() => {
        return salesHistory.filter((s) => {
            const sDate = s.date || (s.createdAt ? new Date(s.createdAt).toISOString().split("T")[0] : null);
            if (sDate && !isWithinRange(sDate)) return false;

            // Tax status filter
            if (salesTaxFilter === "taxable") {
                const taxVal = Number(s.taxTotal || s.taxAmount || 0);
                const itemTax = Array.isArray(s.items) && s.items.some(i => Number(i.taxAmount || 0) > 0 || Number(i.taxPercent || 0) > 0);
                if (taxVal <= 0 && !itemTax) return false;
            } else if (salesTaxFilter === "non_taxable") {
                const taxVal = Number(s.taxTotal || s.taxAmount || 0);
                const itemTax = Array.isArray(s.items) && s.items.some(i => Number(i.taxAmount || 0) > 0 || Number(i.taxPercent || 0) > 0);
                if (taxVal > 0 || itemTax) return false;
            }

            // Tax % Rate filter (isolated to Sales Report)
            if (salesTaxPercentFilter !== "all") {
                const targetP = Number(salesTaxPercentFilter);
                const hasPercent = Array.isArray(s.items)
                    ? s.items.some(i => Number(i.taxPercent) === targetP)
                    : Number(s.taxPercent || s.taxRate || 0) === targetP;
                if (!hasPercent) return false;
            }

            return true;
        });
    }, [salesHistory, salesTaxFilter, salesTaxPercentFilter, filterStartDate, filterEndDate]);

    const filteredPurchasesHistory = React.useMemo(() => {
        return purchasesHistory.filter((pur) => {
            if (pur.status === 'CANCELLED') return false;

            const purDate = pur.invoiceDate ? new Date(pur.invoiceDate).toISOString().split("T")[0] : (pur.date || (pur.createdAt ? new Date(pur.createdAt).toISOString().split("T")[0] : null));
            if (purDate && !isWithinRange(purDate)) return false;

            // Supplier filter (isolated ONLY to Purchase Report)
            if (purchaseSupplierFilter !== "all") {
                const suppId = String(pur.supplierId?._id || pur.supplierId?.id || pur.supplierId || "");
                if (suppId !== String(purchaseSupplierFilter)) return false;
            }

            // Tax status filter (isolated ONLY to Purchase Report)
            const taxVal = Number(pur.taxTotal || pur.totalTax || pur.taxAmount || 0);
            if (purchaseTaxFilter === "taxable") {
                if (taxVal <= 0) return false;
            } else if (purchaseTaxFilter === "non_taxable") {
                if (taxVal > 0) return false;
            }

            // Tax % Rate filter (isolated ONLY to Purchase Report)
            if (purchaseTaxPercentFilter !== "all") {
                const targetP = Number(purchaseTaxPercentFilter);
                const hasPercent = Array.isArray(pur.items)
                    ? pur.items.some(i => Number(i.taxPercent) === targetP)
                    : (Number(pur.taxPercent || pur.taxRate || 0) === targetP || (targetP > 0 && taxVal > 0));
                if (!hasPercent) return false;
            }

            return true;
        });
    }, [purchasesHistory, purchaseSupplierFilter, purchaseTaxFilter, purchaseTaxPercentFilter, filterStartDate, filterEndDate]);

    const filteredSalesItemBreakdown = React.useMemo(() => {
        const rows = [];
        filteredSalesHistory.forEach((s) => {
            const items = Array.isArray(s.items) && s.items.length > 0
                ? s.items
                : [{
                    id: s.id || s.invoiceNumber,
                    name: 'Sale Order',
                    quantity: 1,
                    price: s.amount || s.grandTotal || 0,
                    taxPercent: s.taxPercent || 0,
                    taxAmount: s.taxAmount || s.taxTotal || 0,
                    totalAmount: s.amount || s.grandTotal || 0
                  }];

            items.forEach((item) => {
                const taxP = Number(item.taxPercent !== undefined ? item.taxPercent : (s.taxPercent || 0));
                
                // Tax status filter check at item level
                if (salesTaxFilter === "taxable") {
                    const lineTax = Number(item.taxAmount || 0);
                    if (lineTax <= 0 && taxP <= 0) return;
                } else if (salesTaxFilter === "non_taxable") {
                    const lineTax = Number(item.taxAmount || 0);
                    if (lineTax > 0 || taxP > 0) return;
                }

                // Tax percentage filter check at item level
                if (salesTaxPercentFilter !== "all") {
                    if (taxP !== Number(salesTaxPercentFilter)) return;
                }

                rows.push({
                    id: item.id || `${s.invoiceNumber}-${rows.length}`,
                    invoiceNumber: s.invoiceNumber,
                    date: s.date,
                    time: s.time || (s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
                    customerName: s.customerName || 'Walk-in Customer',
                    customerPhone: s.customerPhone || '',
                    staffName: s.staffName || 'Admin / Staff',
                    itemName: item.name || item.itemName || 'Unnamed Item',
                    itemCode: item.itemCode || item.sku || '',
                    quantity: item.quantity || 1,
                    unitPrice: item.price || item.originalPrice || 0,
                    taxPercent: taxP,
                    taxAmount: item.taxAmount || 0,
                    totalAmount: item.totalAmount || ((item.quantity || 1) * (item.price || 0)),
                    paymentStatus: s.paymentStatus || 'FULLY PAID',
                    method: s.method || 'Cash',
                    type: s.type || 'Direct',
                    branchName: s.branchName || 'Main Branch'
                });
            });
        });
        return rows;
    }, [filteredSalesHistory, salesTaxFilter, salesTaxPercentFilter]);

    const filteredPurchasesItemBreakdown = React.useMemo(() => {
        const rows = [];
        filteredPurchasesHistory.forEach((pur) => {
            const items = Array.isArray(pur.items) && pur.items.length > 0
                ? pur.items
                : [{
                    id: pur._id,
                    itemName: 'Purchase Order',
                    quantity: 1,
                    purchasePrice: pur.grandTotal || pur.totalAmount || 0,
                    taxPercent: pur.taxPercent || pur.taxRate || 0,
                    taxAmount: pur.taxTotal || pur.totalTax || 0,
                    totalAmount: pur.grandTotal || pur.totalAmount || 0
                  }];

            items.forEach((item) => {
                const taxP = Number(item.taxPercent !== undefined ? item.taxPercent : (item.taxRate !== undefined ? item.taxRate : (pur.taxPercent || pur.taxRate || 0)));
                const lineTax = Number(item.taxAmount || 0);

                // Tax status filter check at item level
                if (purchaseTaxFilter === "taxable") {
                    if (lineTax <= 0 && taxP <= 0) return;
                } else if (purchaseTaxFilter === "non_taxable") {
                    if (lineTax > 0 || taxP > 0) return;
                }

                // Tax percentage filter check at item level
                if (purchaseTaxPercentFilter !== "all") {
                    if (taxP !== Number(purchaseTaxPercentFilter)) return;
                }

                const purNum = pur.purchaseNumber || pur.invoiceNumber || pur.supplierInvoiceNumber || '—';
                const purDate = pur.invoiceDate ? new Date(pur.invoiceDate).toLocaleDateString() : (pur.date || (pur.createdAt ? new Date(pur.createdAt).toLocaleDateString() : ''));
                const suppName = pur.supplierId?.name || pur.supplierName || '—';
                const suppPhone = pur.supplierId?.phone || '';

                rows.push({
                    id: item.id || `${purNum}-${rows.length}`,
                    purchaseNumber: purNum,
                    date: purDate,
                    supplierName: suppName,
                    supplierPhone: suppPhone,
                    itemName: item.itemName || item.name || 'Unnamed Item',
                    itemCode: item.itemCode || '',
                    quantity: item.quantity || 1,
                    unitPrice: item.purchasePrice || 0,
                    unitName: item.unitName || 'Pcs',
                    taxPercent: taxP,
                    taxAmount: lineTax,
                    totalAmount: item.totalAmount || ((item.quantity || 1) * (item.purchasePrice || 0)),
                    status: pur.status || pur.paymentStatus || 'CONFIRMED',
                    branchName: pur.branchId?.name || pur.branchName || 'Main Branch'
                });
            });
        });
        return rows;
    }, [filteredPurchasesHistory, purchaseTaxFilter, purchaseTaxPercentFilter]);

    const salesInRange = filteredSalesHistory;

    const normalizePaymentMethod = React.useCallback((rawMethod) => {
        if (!rawMethod) return "Cash";
        const str = String(rawMethod).trim().toUpperCase();
        if (str.includes("CASH")) return "Cash";
        if (str.includes("UPI") || str.includes("GPAY") || str.includes("PAYTM") || str.includes("PHONEPE")) return "UPI";
        if (str.includes("CARD") || str.includes("CREDIT") || str.includes("DEBIT")) return "Card";
        if (str.includes("BANK") || str.includes("TRANSFER") || str.includes("NET")) return "Bank Transfer";
        if (str.includes("CHEQUE") || str.includes("CHECK")) return "Cheque";
        return rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1).toLowerCase();
    }, []);

    const paymentMethodStats = React.useMemo(() => {
        const statsMap = {};

        const ensureMethod = (m) => {
            const key = normalizePaymentMethod(m);
            if (!statsMap[key]) {
                statsMap[key] = {
                    name: key,
                    salesAmount: 0,
                    salesCount: 0,
                    purchaseAmount: 0,
                    purchaseCount: 0,
                    splitSalesBreakdown: {},
                    splitPurchaseBreakdown: {},
                };
            }
            return statsMap[key];
        };

        // Standard payment modes initialized
        ["Cash", "UPI", "Card", "Bank Transfer", "Split"].forEach(ensureMethod);

        // Process Sales Payments
        salesHistory
            .filter((s) => isWithinRange(s.date || s.createdAt))
            .forEach((sale) => {
                const mainMethod = String(sale.method || sale.paymentMethod || sale.paymentMode || "").trim();
                const rawPayments = sale.payments || sale.paymentBreakdown || sale.splitDetails || sale.splitPayments;
                const isSplit = mainMethod.toUpperCase() === "SPLIT" || (Array.isArray(rawPayments) && rawPayments.length > 1);

                if (isSplit && Array.isArray(rawPayments) && rawPayments.length > 0) {
                    const splitObj = ensureMethod("Split");
                    splitObj.salesCount += 1;

                    rawPayments.forEach((p) => {
                        const subMethod = normalizePaymentMethod(p.method || p.paymentMethod || p.paymentMode || p.type || "Cash");
                        const amt = Number(p.amount || p.value || 0);

                        splitObj.salesAmount += amt;
                        splitObj.splitSalesBreakdown[subMethod] = (splitObj.splitSalesBreakdown[subMethod] || 0) + amt;

                        const individualObj = ensureMethod(subMethod);
                        individualObj.salesAmount += amt;
                        individualObj.salesCount += 1;
                    });
                } else if (isSplit) {
                    const splitObj = ensureMethod("Split");
                    const amt = Number(sale.amount || sale.totalAmount || sale.grandTotal || 0);
                    splitObj.salesCount += 1;
                    splitObj.salesAmount += amt;
                    splitObj.splitSalesBreakdown["Cash"] = (splitObj.splitSalesBreakdown["Cash"] || 0) + amt;

                    const cashObj = ensureMethod("Cash");
                    cashObj.salesAmount += amt;
                    cashObj.salesCount += 1;
                } else {
                    const method = mainMethod || "Cash";
                    const amount = Number(sale.amount || sale.totalAmount || sale.grandTotal || 0);
                    const obj = ensureMethod(method);
                    obj.salesAmount += amount;
                    obj.salesCount += 1;
                }
            });

        // Process Purchases Payments
        purchasesHistory
            .filter((p) => isWithinRange(p.date || p.purchaseDate || p.createdAt) && p.status !== 'CANCELLED')
            .forEach((pur) => {
                const mainMethod = String(pur.paymentMethod || pur.paymentMode || pur.method || "").trim();
                const rawPayments = pur.payments || pur.paymentBreakdown || pur.splitDetails || pur.splitPayments;
                const isSplit = mainMethod.toUpperCase() === "SPLIT" || (Array.isArray(rawPayments) && rawPayments.length > 1);
                const purAmount = Number(pur.paidAmount !== undefined ? pur.paidAmount : (pur.grandTotal || pur.totalAmount || pur.total || 0));

                if (isSplit && Array.isArray(rawPayments) && rawPayments.length > 0) {
                    const splitObj = ensureMethod("Split");
                    splitObj.purchaseCount += 1;

                    rawPayments.forEach((p) => {
                        const subMethod = normalizePaymentMethod(p.paymentMethod || p.paymentMode || p.method || p.type || "Cash");
                        const amt = Number(p.amount || p.value || 0);

                        splitObj.purchaseAmount += amt;
                        splitObj.splitPurchaseBreakdown[subMethod] = (splitObj.splitPurchaseBreakdown[subMethod] || 0) + amt;

                        const individualObj = ensureMethod(subMethod);
                        individualObj.purchaseAmount += amt;
                        individualObj.purchaseCount += 1;
                    });
                } else if (isSplit) {
                    const splitObj = ensureMethod("Split");
                    splitObj.purchaseCount += 1;
                    splitObj.purchaseAmount += purAmount;
                    splitObj.splitPurchaseBreakdown["Cash"] = (splitObj.splitPurchaseBreakdown["Cash"] || 0) + purAmount;

                    const cashObj = ensureMethod("Cash");
                    cashObj.purchaseAmount += purAmount;
                    cashObj.purchaseCount += 1;
                } else {
                    const method = mainMethod || "Cash";
                    const obj = ensureMethod(method);
                    obj.purchaseAmount += purAmount;
                    obj.purchaseCount += 1;
                }
            });

        return Object.values(statsMap).map((item) => ({
            ...item,
            netAmount: item.salesAmount - item.purchaseAmount,
            totalCount: item.salesCount + item.purchaseCount,
        }));
    }, [salesHistory, purchasesHistory, isWithinRange, normalizePaymentMethod]);

    const totalSalesPayments = React.useMemo(() => {
        return salesHistory
            .filter((s) => isWithinRange(s.date || s.createdAt))
            .reduce((sum, s) => sum + Number(s.amount || s.totalAmount || s.grandTotal || 0), 0);
    }, [salesHistory, isWithinRange]);

    const totalSalesCount = React.useMemo(() => {
        return salesHistory
            .filter((s) => isWithinRange(s.date || s.createdAt)).length;
    }, [salesHistory, isWithinRange]);

    const totalPurchasePayments = React.useMemo(() => {
        return purchasesHistory
            .filter((p) => isWithinRange(p.date || p.purchaseDate || p.createdAt) && p.status !== 'CANCELLED')
            .reduce((sum, p) => sum + Number(p.paidAmount !== undefined ? p.paidAmount : (p.grandTotal || p.totalAmount || p.total || 0)), 0);
    }, [purchasesHistory, isWithinRange]);

    const totalPurchaseCount = React.useMemo(() => {
        return purchasesHistory
            .filter((p) => isWithinRange(p.date || p.purchaseDate || p.createdAt) && p.status !== 'CANCELLED').length;
    }, [purchasesHistory, isWithinRange]);

    const netPaymentFlow = totalSalesPayments - totalPurchasePayments;

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
            if (salesViewMode === "itemized" || salesTaxPercentFilter !== "all") {
                columns = [
                    "Invoice #",
                    "Date",
                    "Time",
                    "Customer Name",
                    "Customer Phone",
                    "Item Name",
                    "Item Code",
                    "Qty",
                    "Unit Price",
                    "Tax %",
                    "Tax Amount",
                    "Line Total",
                    "Payment Status",
                    "Order Type",
                    "Billed By"
                ];
                rows = filteredSalesItemBreakdown.map((r) => [
                    `#${r.invoiceNumber || ''}`,
                    r.date || '',
                    r.time || '',
                    r.customerName || 'Walk-in Customer',
                    r.customerPhone || 'N/A',
                    r.itemName || 'Item',
                    r.itemCode || '—',
                    r.quantity,
                    formatCurrency(r.unitPrice, currency),
                    `${r.taxPercent}%`,
                    formatCurrency(r.taxAmount, currency),
                    formatCurrency(r.totalAmount, currency),
                    r.paymentStatus || 'FULLY PAID',
                    r.type || 'Direct',
                    r.staffName || 'Admin / Staff'
                ]);
            } else {
                columns = [
                    "Invoice #",
                    "Date",
                    "Time",
                    "Customer Name",
                    "Customer Phone",
                    "Table / Location",
                    "Order Type",
                    "Billed By",
                    "Payment Method",
                    "Payment Status",
                    "Subtotal",
                    "Tax Amount",
                    "Discount Amount",
                    "Paid Amount",
                    "Due Amount",
                    "Grand Total"
                ];
                rows = filteredSalesHistory.map((s) => {
                    const subtotal = s.subtotal !== undefined ? s.subtotal : ((s.amount || 0) - (s.taxAmount || 0) + (s.discountAmount || 0));
                    return [
                        `#${s.invoiceNumber || ''}`,
                        s.date || '',
                        s.time || (s.timestamp ? new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
                        s.customerName || 'Walk-in Customer',
                        s.customerPhone || 'N/A',
                        s.tableName || 'Counter',
                        s.type || 'Direct',
                        s.staffName || 'Admin / Staff',
                        s.method || 'Cash',
                        s.paymentStatus || 'FULLY PAID',
                        formatCurrency(subtotal, currency),
                        formatCurrency(s.taxAmount || 0, currency),
                        formatCurrency(s.discountAmount || 0, currency),
                        formatCurrency(s.paidAmount !== undefined ? s.paidAmount : s.amount, currency),
                        formatCurrency(s.dueAmount || 0, currency),
                        formatCurrency(s.amount, currency)
                    ];
                });
            }
        } else if (reportCategory === "purchases") {
            if (purchaseViewMode === "itemized" || purchaseTaxPercentFilter !== "all") {
                columns = [
                    "Invoice / Bill #",
                    "Date",
                    "Supplier Name",
                    "Supplier Phone",
                    "Item Name",
                    "Item Code",
                    "Qty",
                    "Unit Price",
                    "Tax %",
                    "Tax Amount",
                    "Line Total",
                    "Status"
                ];
                rows = filteredPurchasesItemBreakdown.map((r) => [
                    r.purchaseNumber || '—',
                    r.date || '',
                    r.supplierName || '—',
                    r.supplierPhone || 'N/A',
                    r.itemName || 'Item',
                    r.itemCode || '—',
                    `${r.quantity} ${r.unitName || 'Pcs'}`,
                    formatCurrency(r.unitPrice, currency),
                    `${r.taxPercent}%`,
                    formatCurrency(r.taxAmount, currency),
                    formatCurrency(r.totalAmount, currency),
                    r.status || 'CONFIRMED'
                ]);
            } else {
                columns = [
                    "Invoice / Bill #",
                    "Date",
                    "Supplier Name",
                    "Supplier Phone",
                    "Tax Paid",
                    "Total Amount",
                    "Status"
                ];
                rows = filteredPurchasesHistory.map((pur) => [
                    pur.purchaseNumber || pur.invoiceNumber || pur.supplierInvoiceNumber || '—',
                    pur.invoiceDate ? new Date(pur.invoiceDate).toLocaleDateString() : (pur.date || (pur.createdAt ? new Date(pur.createdAt).toLocaleDateString() : '')),
                    pur.supplierId?.name || pur.supplierName || '—',
                    pur.supplierId?.phone || 'N/A',
                    formatCurrency(pur.taxTotal || pur.totalTax || pur.taxAmount || 0, currency),
                    formatCurrency(pur.grandTotal || pur.totalAmount || pur.total || 0, currency),
                    pur.status || pur.paymentStatus || 'CONFIRMED'
                ]);
            }
        } else if (reportCategory === "stock_wise") {
            const stockData = stockWiseReport?.data || [];
            columns = [
                "Item SKU",
                "Barcode",
                "Item Name",
                "Category",
                "Brand",
                "Supplier",
                "Unit",
                "Item Type",
                "Cost Price",
                "Selling Price",
                "Min Alert Level",
                "Purchased Qty",
                "Produced Qty",
                "Sold Qty",
                "Returned Qty",
                "Adjusted Qty",
                "Current Stock Qty",
                "Stock Status",
                "Stock Cost Valuation",
                "Stock Retail Valuation",
                "Potential Profit"
            ];
            rows = stockData.map(s => [
                s.itemCode || 'ITM-N/A',
                s.barcode || 'N/A',
                s.name || 'Unnamed Item',
                s.category || 'General',
                s.brand || 'N/A',
                s.supplier || 'N/A',
                s.unit || 'Pcs',
                s.itemType || 'STOCK',
                formatCurrency(s.purchasePrice || 0, currency),
                formatCurrency(s.sellingPrice || 0, currency),
                s.minStockAlert || 0,
                s.totalPurchased || 0,
                s.totalProduced || 0,
                s.totalSold || 0,
                s.totalReturned || 0,
                s.totalAdjusted || 0,
                s.quantityOnHand || 0,
                s.stockStatus || 'In Stock',
                formatCurrency(s.stockCostValue || 0, currency),
                formatCurrency(s.stockRetailValue || 0, currency),
                formatCurrency(s.potentialProfit || 0, currency)
            ]);
        } else if (reportCategory === "manufacturing") {
            columns = ["Production No.", "Date", "Batch No.", "Finished Product", "Qty Produced", "RM Cost", "Labour Cost", "Other Cost", "Wastage Cost", "Total Cost", "Cost/Unit", "Status"];
            rows = (manufacturingReport?.data || []).map(r => [
                r.productionNo || 'N/A',
                r.date || '',
                r.batchNo || 'N/A',
                r.finishedProduct || 'Item',
                r.qtyProduced || 0,
                formatCurrency(r.rawMaterialCost || 0, currency),
                formatCurrency(r.labourCost || 0, currency),
                formatCurrency(r.otherCost || 0, currency),
                formatCurrency(r.wastageCost || 0, currency),
                formatCurrency(r.totalProductionCost || 0, currency),
                formatCurrency(r.costPerUnit || 0, currency),
                r.status || 'Completed'
            ]);
        } else if (reportCategory === "items") {
            const itemMap = new Map();
            itemList.forEach(i => {
                itemMap.set(String(i.name || '').toLowerCase(), i);
                if (i.itemCode) itemMap.set(String(i.itemCode).toLowerCase(), i);
            });

            const itemStats = {};
            salesHistory
                .filter((s) => isWithinRange(s.date))
                .forEach((sale) => {
                    if (sale.items) {
                        sale.items.forEach((item) => {
                            const itemName = item.name || item.itemName || item.title || item.itemId?.name || item.productId?.name || "Uncategorized Item";
                            const key = itemName.toLowerCase();
                            if (!itemStats[key]) {
                                const masterItem = itemMap.get(key);
                                itemStats[key] = {
                                    sku: masterItem?.itemCode || item.itemCode || 'ITM-N/A',
                                    name: itemName,
                                    category: masterItem?.categoryId?.name || item.category || 'General',
                                    taxPercent: item.taxPercent !== undefined ? item.taxPercent : (masterItem?.taxPercent || settings?.defaultTaxPercent || 0),
                                    stock: masterItem?.quantityOnHand !== undefined ? masterItem.quantityOnHand : (item.quantityOnHand || 0),
                                    qty: 0,
                                    discount: 0,
                                    offers: new Set(),
                                    revenue: 0,
                                    cost: 0,
                                    profit: 0
                                };
                            }
                            const q = item.quantity || 0;
                            itemStats[key].qty += q;
                            const lineRevenue = item.totalAmount || ((item.price || 0) * q);
                            const lineCost = (item.purchasePrice || 0) * q;
                            const itemDiscount = Number(item.discountAmount || item.discount || 0);
                            itemStats[key].discount += itemDiscount;
                            itemStats[key].revenue += lineRevenue;
                            itemStats[key].cost += lineCost;
                            itemStats[key].profit += (lineRevenue - lineCost);

                            const offerText = item.offerName || item.bogoOfferName || item.offerDetails || (typeof item.appliedOfferId === 'object' ? item.appliedOfferId?.name : null) || item.offerTitle;
                            if (offerText) {
                                itemStats[key].offers.add(offerText);
                            }
                            if (item.isFreeItem) {
                                itemStats[key].offers.add("Free Item");
                            }
                            if (item.freeQuantity && item.freeQuantity > 0) {
                                itemStats[key].offers.add(`${item.freeQuantity} Free`);
                            }
                            if (Array.isArray(sale.appliedOffers)) {
                                sale.appliedOffers.forEach(off => {
                                    if (off.name || off.title) itemStats[key].offers.add(off.name || off.title);
                                });
                            }
                        });
                    }
                });
            columns = ["Item SKU", "Item Name", "Category", "Tax %", "Balance Stock", "Qty Sold", "Avg Price", "Discount Amount", "Offer Details", "Revenue", "Cost Value", "Net Profit", "Margin %"];
            rows = Object.values(itemStats).map(s => {
                const avgPrice = s.qty > 0 ? s.revenue / s.qty : 0;
                const margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
                const offerStr = s.offers.size > 0 ? Array.from(s.offers).join(", ") : "—";
                return [
                    s.sku,
                    s.name,
                    s.category,
                    `${s.taxPercent}%`,
                    `${s.stock} Qty`,
                    s.qty,
                    formatCurrency(avgPrice, currency),
                    formatCurrency(s.discount, currency),
                    offerStr,
                    formatCurrency(s.revenue, currency),
                    formatCurrency(s.cost, currency),
                    formatCurrency(s.profit, currency),
                    `${margin.toFixed(1)}%`
                ];
            });
        } else if (reportCategory === "category") {
            const catStats = {};
            const catProductsMap = {};
            itemList.forEach(i => {
                const cName = i.categoryId?.name || "Others";
                if (!catProductsMap[cName]) catProductsMap[cName] = 0;
                catProductsMap[cName] += 1;
            });

            salesHistory
                .filter((s) => isWithinRange(s.date))
                .forEach((sale) => {
                    if (sale.items) {
                        sale.items.forEach((item) => {
                            const cat = item.category || "Others";
                            if (!catStats[cat]) {
                                catStats[cat] = { category: cat, productsCount: catProductsMap[cat] || 0, qtySold: 0, revenue: 0, cost: 0, profit: 0 };
                            }
                            const q = item.quantity || 0;
                            const lineRev = item.totalAmount || ((item.price || 0) * q);
                            const lineCost = (item.purchasePrice || 0) * q;
                            catStats[cat].qtySold += q;
                            catStats[cat].revenue += lineRev;
                            catStats[cat].cost += lineCost;
                            catStats[cat].profit += (lineRev - lineCost);
                        });
                    }
                });
            columns = ["Category Name", "Products Count", "Qty Sold", "Total Revenue", "Total Cost", "Net Profit", "Margin %"];
            rows = Object.values(catStats).map(s => {
                const margin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
                return [
                    s.category,
                    s.productsCount,
                    s.qtySold,
                    formatCurrency(s.revenue, currency),
                    formatCurrency(s.cost, currency),
                    formatCurrency(s.profit, currency),
                    `${margin.toFixed(1)}%`
                ];
            });
        } else if (reportCategory === "payments") {
            const methods = ["Cash", "UPI", "Card", "Bank Transfer", "Split"];
            columns = ["Payment Method", "Sales Count", "Sales Amount", "Purchases Count", "Purchases Amount", "Net Cash Flow"];
            const sales = salesHistory.filter((s) => isWithinRange(s.date));
            const purchases = purchasesHistory ? purchasesHistory.filter((p) => isWithinRange(p.date)) : [];

            rows = methods.map((method) => {
                const methodSales = sales.filter((s) => normalizePaymentMethod(s.method) === method);
                const salesTot = methodSales.reduce((a, b) => a + (b.amount || 0), 0);
                const salesCnt = methodSales.length;

                const methodPurchases = purchases.filter((p) => normalizePaymentMethod(p.paymentMethod) === method);
                const purchTot = methodPurchases.reduce((a, b) => a + (b.totalAmount || b.amount || 0), 0);
                const purchCnt = methodPurchases.length;

                return [
                    method,
                    salesCnt,
                    formatCurrency(salesTot, currency),
                    purchCnt,
                    formatCurrency(purchTot, currency),
                    formatCurrency(salesTot - purchTot, currency)
                ];
            }).filter(r => r[1] > 0 || r[3] > 0);
        } else if (reportCategory === "staff_report") {
            columns = ["Staff Name", "Role", "Sales Orders", "Sales Value", "Cash Collected", "Purchases Entered", "Purchase Value"];
            rows = performanceReport.map((p) => [
                p.employeeName || 'Staff',
                p.role || 'Staff',
                p.stats.orders || 0,
                formatCurrency(p.stats.sales || 0, currency),
                formatCurrency(p.stats.cash || 0, currency),
                p.stats.purchases || 0,
                formatCurrency(p.stats.purchaseValue || 0, currency)
            ]);
        } else if (reportCategory === "table_report") {
            columns = ["Table / Area", "Orders Count", "Average Bill Value", "Total Revenue"];
            rows = tables.map((t) => {
                const tableSales = salesHistory.filter(
                    (s) => isWithinRange(s.date) && s.tableName === t.name
                );
                const totalRevenue = tableSales.reduce((sum, s) => sum + (s.amount || 0), 0);
                const orderCount = tableSales.length;
                const avgBill = orderCount > 0 ? totalRevenue / orderCount : 0;
                return [t.name, orderCount, formatCurrency(avgBill, currency), formatCurrency(totalRevenue, currency)];
            });
        } else if (reportCategory === "hourly") {
            columns = ["Hour Interval", "Orders Count", "Average Bill Value", "Total Sales Revenue"];
            const result = [];
            for (let i = 0; i < 14; i++) {
                const hour = 9 + i;
                const hourSales = salesHistory.filter(
                    (s) => isWithinRange(s.date) && new Date(s.timestamp).getHours() === hour
                );
                const revenue = hourSales.reduce((a, b) => a + (b.amount || 0), 0);
                const count = hourSales.length;
                const avgBill = count > 0 ? revenue / count : 0;
                result.push([
                    `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`,
                    count,
                    formatCurrency(avgBill, currency),
                    formatCurrency(revenue, currency)
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
                platformStats[p].sales += (o.total || 0);
            });
            columns = ["Platform / Channel", "Orders Count", "Average Order Value", "Total Sales Value"];
            rows = Object.entries(platformStats).map(([plat, stats]) => {
                const avg = stats.count > 0 ? stats.sales / stats.count : 0;
                return [
                    plat,
                    stats.count,
                    formatCurrency(avg, currency),
                    formatCurrency(stats.sales, currency)
                ];
            });
        } else if (reportCategory === "party") {
            if (selectedParty) {
                columns = ["Date", "Reference #", "Type / Mode", "Subtotal", "Tax", "Grand Total", "Paid Amount", "Balance Due"];
                rows = (partyStatement || []).map(p => [
                    p.date ? new Date(p.date).toLocaleDateString() : '',
                    p.reference || '—',
                    String(p.type || '').toUpperCase(),
                    formatCurrency(p.subtotal || 0, currency),
                    formatCurrency(p.taxTotal || p.tax || 0, currency),
                    formatCurrency(p.total || 0, currency),
                    formatCurrency(p.paid || 0, currency),
                    formatCurrency(p.balance || 0, currency)
                ]);
            } else if (partyTab === "customers") {
                columns = ["Customer Name", "Total Orders", "Total Revenue", "Total Net Profit"];
                rows = (customerReport || []).map(c => [
                    c.name || 'Walk-in Customer',
                    c.stats?.orders || 0,
                    formatCurrency(c.stats?.revenue || 0, currency),
                    formatCurrency(c.stats?.profit || 0, currency)
                ]);
            } else {
                columns = ["Supplier Name", "Last Invoice #", "Total Bills / Invoices", "Total Purchases Value", "Outstanding Balance"];
                rows = (supplierReport || []).map(s => [
                    s.name || 'Unknown Supplier',
                    s.stats?.lastInvoiceNumber || 'N/A',
                    s.stats?.invoices || 0,
                    formatCurrency(s.stats?.totalPurchases || 0, currency),
                    formatCurrency(s.stats?.balance || 0, currency)
                ]);
            }
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
                        const itemName = item.name || item.itemName || item.title || item.itemId?.name || item.productId?.name || (item.category ? `[${item.category}]` : "—");
                        
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
            columns = ["Voucher / ID", "Date", "Category", "Frequency / Term", "Expense Description", "Payment Method", "Recorded By", "Amount"];
            rows = expensesHistory.map((e) => [
                e.voucherNo || e.id || (e._id ? String(e._id).slice(-6).toUpperCase() : 'EXP-N/A'),
                e.date || '',
                e.category || 'General',
                String(e.term || "One-time").toUpperCase(),
                e.type || e.title || e.description || 'Expense',
                e.paymentMethod || e.method || 'Cash',
                e.staffName || e.paidBy || 'Admin',
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
            rows.push(["Net Profit", "—", formatCurrency(profitLossReport.netProfit, currency)]);
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
        // Special handling for Profit & Loss report
        if (reportCategory === "profit_loss" && profitLossReport) {
            exportProfitLoss(
                profitLossReport, 
                'pdf', 
                `P&L_${filterStartDate}_${filterEndDate}`, 
                organization?.businessName || headerShopName || 'Shop', 
                branches.find(b => String(b._id) === String(reportBranchFilter))?.name || headerBranchName
            );
            return;
        }

        // Default handling for other reports
        const { columns, rows } = buildReportData();
        if (!columns.length) return;

        const reportTitle = baseReportCategories.find(r => r.id === reportCategory)?.label || "Analytics Report";
        const totalRecords = rows.length;

        const html = `
          <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; color: #1e293b; background: #ffffff;">
            <!-- Top Branding Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #ffffff; font-weight: 900; font-size: 14px; padding: 4px 10px; border-radius: 8px; letter-spacing: -0.5px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                  file<span style="color: #c084fc;">pe</span>
                </div>
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; tracking-wider; color: #64748b;">Modern POS Reports</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #64748b;">
                Date Range: <strong style="color: #1e293b;">${escapeHtml(rangeLabel)}</strong>
              </div>
            </div>

            <!-- Shop Info & Report Title Block -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
              <div style="display: flex; gap: 16px; align-items: flex-start; max-width: 65%;">
                ${headerLogoUrl ? `<img src="${headerLogoUrl}" style="max-height: 65px; max-width: 140px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 4px;" />` : ""}
                <div>
                  <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; tracking: -0.5px;">${escapeHtml(headerShopName)}</h1>
                  <div style="font-size: 13px; font-weight: 700; color: #4f46e5; margin-bottom: 4px;">${escapeHtml(headerBranchName)}</div>
                  ${headerContact ? `<div style="font-size: 11px; color: #475569; font-weight: 500;">Phone: <strong>${escapeHtml(headerContact)}</strong></div>` : ""}
                  ${addressLines.length > 0 ? `<div style="font-size: 10px; color: #64748b; margin-top: 3px; line-height: 1.4;">${addressLines.map(escapeHtml).join("<br/>")}</div>` : ""}
                </div>
              </div>

              <!-- Report Metadata Box -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 12px; text-align: right; min-w: 180px;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #4f46e5; letter-spacing: 0.8px;">${escapeHtml(reportTitle)}</div>
                <div style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 4px 0;">${totalRecords} <span style="font-size: 11px; font-weight: 600; color: #64748b;">Entries</span></div>
                <div style="font-size: 10px; color: #94a3b8; font-weight: 500;">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
              </div>
            </div>

            <!-- Styled Table -->
            <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
              <thead>
                <tr style="background: #0f172a; color: #ffffff;">
                  ${columns.map((h, i) => `
                    <th style="padding: 10px 12px; text-align: ${i >= columns.length - 3 ? 'right' : 'left'}; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #334155;">
                      ${escapeHtml(h)}
                    </th>
                  `).join("")}
                </tr>
              </thead>
              <tbody>
                ${rows.map((row, idx) => `
                  <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                    ${row.map((cell, cIdx) => {
                      const cellStr = String(cell ?? "");
                      const isStatus = cellStr === 'FULLY PAID' || cellStr === 'PARTIALLY PAID' || cellStr.includes('UNPAID');
                      let statusBadge = cellStr;
                      if (isStatus) {
                        const bg = cellStr === 'FULLY PAID' ? '#dcfce7' : cellStr === 'PARTIALLY PAID' ? '#fef3c7' : '#fee2e2';
                        const fg = cellStr === 'FULLY PAID' ? '#15803d' : cellStr === 'PARTIALLY PAID' ? '#b45309' : '#b91c1c';
                        statusBadge = `<span style="background:${bg}; color:${fg}; padding:2px 8px; border-radius:10px; font-size:9px; font-weight:800; display:inline-block;">${escapeHtml(cellStr)}</span>`;
                      } else {
                        statusBadge = escapeHtml(cellStr);
                      }

                      return `
                        <td style="padding: 9px 12px; border-bottom: 1px solid #f1f5f9; text-align: ${cIdx >= columns.length - 3 && !isStatus ? 'right' : 'left'}; font-weight: ${cIdx === 0 || cIdx === columns.length - 1 ? '700' : '500'}; color: ${cIdx === columns.length - 1 ? '#4f46e5' : '#334155'};">
                          ${statusBadge}
                        </td>
                      `;
                    }).join("")}
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <!-- Professional Footer -->
            <div style="margin-top: 28px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
              <div>This report is computer generated by <strong>${escapeHtml(headerShopName)}</strong>.</div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <span>Powered by</span>
                <strong style="color: #4f46e5;">FilePe Modern POS</strong>
              </div>
            </div>
          </div>
        `;

        printCustomHtml({
            title: `${headerShopName} - ${reportTitle}`,
            bodyHtml: html,
        });
    };

    const handleExportXLSX = () => {
        // Special handling for Profit & Loss report
        if (reportCategory === "profit_loss" && profitLossReport) {
            exportProfitLoss(
                profitLossReport, 
                'xlsx', 
                `P&L_${filterStartDate}_${filterEndDate}`, 
                organization?.businessName || headerShopName || 'Shop', 
                branches.find(b => String(b._id) === String(reportBranchFilter))?.name || headerBranchName
            );
            return;
        }

        // Default handling for other reports
        const { columns, rows } = buildReportData();
        if (!columns.length) return;

        const reportLabel = baseReportCategories.find(r => r.id === reportCategory)?.label || "Report";

        // Build Excel worksheet with professional heading block
        const metaRows = [
            [headerShopName || "Shop Name"],
            [headerBranchName ? `Branch: ${headerBranchName}` : "All Branches"],
            [`Report: ${reportLabel}`],
            [`Date Range: ${rangeLabel}`],
            [`Generated On: ${new Date().toLocaleString()}`],
            [`Total Records: ${rows.length}`],
            [] // Blank separator line
        ];

        const wsData = [
            ...metaRows,
            columns,
            ...rows
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Auto-calculate column widths
        const colWidths = columns.map((col, colIdx) => {
            let maxLen = String(col || '').length;
            rows.forEach(r => {
                const valStr = String(r[colIdx] ?? '');
                if (valStr.length > maxLen) maxLen = valStr.length;
            });
            return { wch: Math.max(maxLen + 4, 12) };
        });
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        const cleanSheetName = reportLabel.replace(/[\/\\?*\[\]]/g, "").slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, cleanSheetName || "Report");

        const fileName = `${headerShopName}_${reportLabel}_${filterStartDate}_${filterEndDate}.xlsx`
            .replace(/[\/\s]+/g, "_");

        XLSX.writeFile(wb, fileName);
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
        <div className={`p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden ${theme.pageBg}`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 w-full max-w-full">
                <h2 className={`text-xl sm:text-2xl md:text-3xl font-black flex items-center ${theme.textHeading} shrink-0`}>
                    <FileText className="mr-3 text-indigo-600 shrink-0" /> Reports & Analytics
                </h2>
                <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full lg:w-auto">
                    {/* Combined Date Range & Quick Presets Control Bar */}
                    <div className={`relative flex flex-wrap sm:flex-nowrap items-center gap-2 ${theme.surfaceBg} border ${theme.borderLight} rounded-2xl p-1.5 shadow-sm w-full sm:w-auto`}>
                        {/* Quick Presets Dropdown Trigger */}
                        <div className="relative w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setShowDatePresetsPopover(!showDatePresetsPopover)}
                                className={`w-full sm:w-auto h-10 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-between sm:justify-start gap-2 ${
                                    showDatePresetsPopover
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : `${theme.buttonBg} ${theme.buttonText} hover:bg-indigo-700`
                                }`}
                                title="Quick date range presets"
                            >
                                <div className="flex items-center gap-1.5">
                                    <Sparkles size={14} className={showDatePresetsPopover ? 'text-white' : 'text-indigo-400'} />
                                    <span>{activePresetLabel}</span>
                                </div>
                                <ChevronDown size={14} className={`transition-transform duration-200 ${showDatePresetsPopover ? 'rotate-180 text-white' : 'text-indigo-300'}`} />
                            </button>

                            {/* Quick Presets Popover Drawer */}
                            {showDatePresetsPopover && (
                                <div className={`absolute left-0 sm:left-0 top-12 w-full sm:w-72 p-4 rounded-2xl shadow-2xl border z-50 animate-in fade-in slide-in-from-top-2 duration-150 ${theme.surfaceBg} ${theme.borderLight}`}>
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <Sparkles size={15} className="text-indigo-500" />
                                            <span className={`text-xs font-black uppercase tracking-wider ${theme.textHeading}`}>Quick Presets</span>
                                        </div>
                                        <button onClick={() => setShowDatePresetsPopover(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                                        {presetsList.map(preset => {
                                            const isSelected = activePresetId === preset.id;
                                            return (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFilterStartDate(preset.startDate);
                                                        setFilterEndDate(preset.endDate);
                                                        setShowDatePresetsPopover(false);
                                                    }}
                                                    className={`px-3 py-2 text-xs rounded-xl font-bold text-left transition-all flex items-center justify-between ${
                                                        isSelected
                                                            ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-xs'
                                                            : `${theme.inputBg} ${theme.textPrimary} hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 border border-transparent`
                                                    }`}
                                                >
                                                    <span>{preset.label}</span>
                                                    {isSelected && <Check size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold">
                                        <span className={theme.textMuted}>Period:</span>
                                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{rangeLabel}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date Inputs Range */}
                        <div className="flex items-center gap-2 w-full sm:w-auto px-1">
                            <DatePicker
                                value={filterStartDate}
                                onChange={val => setFilterStartDate(val || today)}
                                className="w-full sm:w-32 md:w-36 text-xs h-10"
                                placeholder="From date"
                            />
                            <span className={`text-xs font-bold ${theme.textMuted} shrink-0`}>to</span>
                            <DatePicker
                                value={filterEndDate}
                                onChange={val => setFilterEndDate(val || today)}
                                className="w-full sm:w-32 md:w-36 text-xs h-10"
                                placeholder="To date"
                            />
                        </div>
                    </div>

                    {availableBranches.length > 1 && (
                        <div className="w-full sm:w-44 md:w-48 z-40 flex-shrink-0">
                            <CommonSelect
                                size="sm"
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
                        className={`w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 h-11 px-4 ${theme.buttonBg} ${theme.buttonText} rounded-2xl shadow-sm text-xs font-extrabold ${theme.buttonHoverBg} transition-all`}
                    >
                        <Download size={16} />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Global Summary Widgets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 w-full max-w-full">
                <div className={`p-4 md:p-5 rounded-2xl border transition-all min-w-0 overflow-hidden ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                }`}>
                    <div className="flex items-center gap-3 mb-2 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isDark ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-600'
                        }`}>
                            <TrendingUp size={18} />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider truncate ${
                            isDark ? 'text-slate-400' : 'text-gray-600'
                        }`}>Total Revenue</p>
                    </div>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-black truncate ${
                        isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                        {formatCurrency(
                            salesHistory
                                .filter((s) => isWithinRange(s.date))
                                .reduce((a, b) => a + b.amount, 0),
                            currency
                        )}
                    </p>
                </div>
                <div className={`p-4 md:p-5 rounded-2xl border transition-all min-w-0 overflow-hidden ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                }`}>
                    <div className="flex items-center gap-3 mb-2 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                            <ReceiptText size={18} />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider truncate ${
                            isDark ? 'text-slate-400' : 'text-gray-600'
                        }`}>Total Orders</p>
                    </div>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-black truncate ${
                        isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                        {salesHistory.filter((s) => isWithinRange(s.date)).length}
                    </p>
                </div>
                <div className={`p-4 md:p-5 rounded-2xl border transition-all min-w-0 overflow-hidden ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                }`}>
                    <div className="flex items-center gap-3 mb-2 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600'
                        }`}>
                            <Coins size={18} />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider truncate ${
                            isDark ? 'text-slate-400' : 'text-gray-600'
                        }`}>Total Expenses</p>
                    </div>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-black truncate ${
                        isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                        {formatCurrency(
                            (() => {
                                if (profitLossReport?.operatingExpenses?.total !== undefined) {
                                    return profitLossReport.operatingExpenses.total;
                                }
                                if (profitLossReport?.summary?.totalExpenses !== undefined) {
                                    return profitLossReport.summary.totalExpenses;
                                }
                                if (profitLossReport?.expenses?.total !== undefined) {
                                    return profitLossReport.expenses.total;
                                }
                                return expensesHistory
                                    .filter((e) => isWithinRange(e.date))
                                    .reduce((a, b) => a + (Number(b.amount) || 0), 0);
                            })(),
                            currency
                        )}
                    </p>
                </div>
                <div className={`p-4 md:p-5 rounded-2xl border transition-all min-w-0 overflow-hidden ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                }`}>
                    <div className="flex items-center gap-3 mb-2 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isDark ? 'bg-indigo-950/60 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                        }`}>
                            <Scale size={18} />
                        </div>
                        <p className={`text-xs font-bold uppercase tracking-wider truncate ${
                            isDark ? 'text-slate-400' : 'text-gray-600'
                        }`}>Net Profit</p>
                    </div>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-black truncate ${
                        isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                        {formatCurrency(
                            (() => {
                                if (profitLossReport) {
                                    if (typeof profitLossReport.netProfit === 'object' && profitLossReport.netProfit?.amount !== undefined) {
                                        return profitLossReport.netProfit.amount;
                                    }
                                    if (typeof profitLossReport.netProfit === 'number') {
                                        return profitLossReport.netProfit;
                                    }
                                    if (profitLossReport.summary?.netProfit !== undefined) {
                                        return profitLossReport.summary.netProfit;
                                    }
                                    if (profitLossReport.netProfitAmount !== undefined) {
                                        return profitLossReport.netProfitAmount;
                                    }
                                }
                                const rangeSales = salesHistory.filter((s) => isWithinRange(s.date));
                                let totalRev = 0;
                                let totalCogs = 0;
                                rangeSales.forEach((s) => {
                                    totalRev += (s.amount || 0);
                                    if (s.items && Array.isArray(s.items)) {
                                        s.items.forEach((item) => {
                                            const q = item.quantity || 0;
                                            totalCogs += ((item.purchasePrice || 0) * q);
                                        });
                                    }
                                });
                                const totalExp = expensesHistory
                                    .filter((e) => isWithinRange(e.date))
                                    .reduce((a, b) => a + (b.amount || 0), 0);
                                return totalRev - totalCogs - totalExp;
                            })(),
                            currency
                        )}
                    </p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 w-full max-w-full min-w-0 items-start">
                {/* Sidebar for Reports */}
                <div className={`w-full lg:w-60 xl:w-64 ${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} p-2 lg:p-2.5 flex flex-row lg:flex-col gap-1 lg:gap-1.5 shrink-0 lg:sticky lg:top-20 self-start overflow-x-auto lg:overflow-visible no-scrollbar`}>
                    {allowedCategories.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setReportCategory(item.id)}
                            className={`flex items-center gap-2.5 py-2 px-3 rounded-xl font-bold text-xs transition-all whitespace-nowrap flex-shrink-0 ${reportCategory === item.id
                                ? `${theme.buttonBg} ${theme.buttonText} shadow-md`
                                : `${theme.textMuted} ${theme.sidebarItemHoverBg}`
                                }`}
                        >
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>

                {/* Report Content Area */}
                <div className={`flex-1 min-w-0 w-full ${theme.surfaceBg} rounded-3xl shadow-lg border ${theme.borderLight} p-4 lg:p-6 relative overflow-hidden`}>
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
                            <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b ${theme.borderLight} pb-4`}>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                                    <h3 className={`text-xl font-black ${theme.textHeading}`}>
                                        Sales Summary ({rangeLabel})
                                    </h3>
                                    {/* View Mode Toggle: Summary vs Item-wise */}
                                    <div className={`inline-flex rounded-xl p-1 ${theme.pageBg} border ${theme.borderLight}`}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSalesViewMode("summary");
                                                setSalesTaxPercentFilter("all");
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                                                salesViewMode === "summary"
                                                    ? `${theme.buttonBg} ${theme.buttonText} shadow-xs font-black`
                                                    : `${theme.textMuted} ${theme.sidebarItemHoverBg} font-bold`
                                            }`}
                                        >
                                            Invoice Summary
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSalesViewMode("itemized")}
                                            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                                                salesViewMode === "itemized"
                                                    ? `${theme.buttonBg} ${theme.buttonText} shadow-xs font-black`
                                                    : `${theme.textMuted} ${theme.sidebarItemHoverBg} font-bold`
                                            }`}
                                        >
                                            Item-wise Breakdown
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
                                    <div className="w-[150px] sm:w-[160px]">
                                        <CommonSelect
                                            size="sm"
                                            icon={TrendingUp}
                                            options={[
                                                { label: "All Sales", value: "all" },
                                                { label: "With Tax Only", value: "taxable" },
                                                { label: "Without Tax Only", value: "non_taxable" }
                                            ]}
                                            value={salesTaxFilter}
                                            onChange={(val) => setSalesTaxFilter(val)}
                                            placeholder="Tax Status"
                                        />
                                    </div>
                                    {salesViewMode === "itemized" && (
                                        <div className="w-[140px] sm:w-[150px]">
                                            <CommonSelect
                                                size="sm"
                                                icon={Percent}
                                                options={taxRateOptions.map(opt => opt.value === 'all' ? { ...opt, label: "All Tax Rates" } : opt)}
                                                value={salesTaxPercentFilter}
                                                onChange={(val) => setSalesTaxPercentFilter(val)}
                                                placeholder="Tax Rate %"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className={`p-5 rounded-2xl border transition-all ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                                }`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                                            isDark ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            <TrendingUp size={16} />
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${
                                            isDark ? 'text-slate-400' : 'text-gray-600'
                                        }`}>Total Revenue</p>
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {formatCurrency(
                                            salesViewMode === "itemized"
                                                ? filteredSalesItemBreakdown.reduce((a, b) => a + Number(b.totalAmount || 0), 0)
                                                : filteredSalesHistory.reduce((a, b) => a + Number(b.amount || b.grandTotal || 0), 0),
                                            currency
                                        )}
                                    </p>
                                </div>
                                <div className={`p-5 rounded-2xl border transition-all ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                                }`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                                            isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                        }`}>
                                            <ReceiptText size={16} />
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${
                                            isDark ? 'text-slate-400' : 'text-gray-600'
                                        }`}>
                                            {salesViewMode === "itemized" ? "Filtered Line Items" : "Total Orders"}
                                        </p>
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {salesViewMode === "itemized" ? filteredSalesItemBreakdown.length : filteredSalesHistory.length}
                                    </p>
                                </div>
                                <div className={`p-5 rounded-2xl border transition-all ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                                }`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                                            isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600'
                                        }`}>
                                            <Coins size={16} />
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${
                                            isDark ? 'text-slate-400' : 'text-gray-600'
                                        }`}>
                                            {salesViewMode === "itemized" ? "Tax Collected" : "Avg Bill Value"}
                                        </p>
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${
                                        isDark ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {formatCurrency(
                                            salesViewMode === "itemized"
                                                ? filteredSalesItemBreakdown.reduce((a, b) => a + Number(b.taxAmount || 0), 0)
                                                : (filteredSalesHistory.length ? filteredSalesHistory.reduce((a, b) => a + Number(b.amount || b.grandTotal || 0), 0) / filteredSalesHistory.length : 0),
                                            currency
                                        )}
                                    </p>
                                </div>
                            </div>
                            
                            {salesViewMode === "itemized" ? (
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
                                            header: "Invoice #",
                                            key: "invoiceNumber",
                                            render: (value, row) => (
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">#{value}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{row.date} • {row.time}</span>
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Customer",
                                            key: "customerName",
                                            render: (value, row) => (
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textHeading}`}>{value}</span>
                                                    {row.customerPhone && <span className="text-[10px] text-gray-400 font-medium">{row.customerPhone}</span>}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Item Name",
                                            key: "itemName",
                                            render: (value, row) => (
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textHeading}`}>{value}</span>
                                                    {row.itemCode && <span className="font-mono text-[10px] text-indigo-500 font-semibold">{row.itemCode}</span>}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Qty",
                                            key: "quantity",
                                            headerClassName: "text-center",
                                            className: "text-center font-black text-xs"
                                        },
                                        {
                                            header: "Unit Price",
                                            key: "unitPrice",
                                            headerClassName: "text-right",
                                            className: "text-right font-medium text-xs",
                                            render: (val) => formatCurrency(val, currency)
                                        },
                                        {
                                            header: "Tax %",
                                            key: "taxPercent",
                                            headerClassName: "text-center",
                                            className: "text-center",
                                            render: (val) => (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                                    {val}% Tax
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Tax Amount",
                                            key: "taxAmount",
                                            headerClassName: "text-right",
                                            className: "text-right font-bold text-purple-600 dark:text-purple-400 text-xs",
                                            render: (val) => formatCurrency(val, currency)
                                        },
                                        {
                                            header: "Line Total",
                                            key: "totalAmount",
                                            headerClassName: "text-right",
                                            className: "text-right font-black text-indigo-600 dark:text-indigo-400 text-sm",
                                            render: (val) => formatCurrency(val, currency)
                                        }
                                    ]}
                                    data={filteredSalesItemBreakdown}
                                    className="mt-4"
                                />
                            ) : (
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
                                            render: (value, row) => (
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">#{value}</span>
                                                    <span className="text-[10px] text-gray-400 font-medium">{row.date} • {row.time || (row.timestamp ? new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</span>
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Customer",
                                            key: "customerName",
                                            render: (value, row) => (
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textHeading}`}>{value || 'Walk-in Customer'}</span>
                                                    {row.customerPhone && <span className="text-[10px] text-gray-400 font-medium">{row.customerPhone}</span>}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Billed By",
                                            key: "staffName",
                                            render: (value) => (
                                                <span className={`text-xs font-semibold ${theme.textSecondary}`}>{value || 'Admin / Staff'}</span>
                                            )
                                        },
                                        {
                                            header: "Type",
                                            key: "type",
                                            headerClassName: "text-center whitespace-nowrap min-w-[100px]",
                                            className: "text-center whitespace-nowrap min-w-[100px]",
                                            render: (value) => (
                                                <span
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase whitespace-nowrap inline-flex items-center justify-center shrink-0 w-max ${value === "Dine-in"
                                                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200"
                                                        : value === "Online"
                                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200"
                                                            : value === "Takeaway"
                                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                                                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                                                        }`}
                                                >
                                                    {value || 'Direct'}
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Payment Method",
                                            key: "method",
                                            headerClassName: "text-center whitespace-nowrap min-w-[120px]",
                                            className: "text-center whitespace-nowrap min-w-[120px]",
                                            render: (value) => (
                                                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap inline-flex items-center justify-center shrink-0">
                                                    {value || 'Cash'}
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Status",
                                            key: "paymentStatus",
                                            headerClassName: "text-center whitespace-nowrap min-w-[130px]",
                                            className: "text-center whitespace-nowrap min-w-[130px]",
                                            render: (value, row) => {
                                                const status = value || (row.dueAmount > 0 ? (row.paidAmount > 0 ? "PARTIALLY PAID" : "UNPAID / CREDIT") : "FULLY PAID");
                                                const isFull = status === "FULLY PAID";
                                                const isPartial = status === "PARTIALLY PAID";
                                                return (
                                                    <div className="flex flex-col items-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap inline-flex items-center justify-center shrink-0 w-max ${
                                                            isFull
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                                                                : isPartial
                                                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                                                                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200"
                                                        }`}>
                                                            {status}
                                                        </span>
                                                        {!isFull && row.dueAmount > 0 && (
                                                            <span className="text-[9px] font-bold text-red-500 mt-0.5 whitespace-nowrap">Due: {formatCurrency(row.dueAmount, currency)}</span>
                                                        )}
                                                    </div>
                                                );
                                            }
                                        },
                                        {
                                            header: "Amount",
                                            key: "amount",
                                            headerClassName: "text-right",
                                            className: "text-right font-black text-indigo-600 dark:text-indigo-400 text-sm",
                                            render: (value) => formatCurrency(value, currency)
                                        }
                                    ]}
                                    data={filteredSalesHistory}
                                    className="mt-4"
                                />
                            )}
                        </div>
                    )}

                    {/* 2. PURCHASE REPORT */}
                    {reportCategory === "purchases" && (() => {
                        const isPurchaseFilterActive = purchaseSupplierFilter !== "all" || purchaseTaxFilter !== "all" || purchaseTaxPercentFilter !== "all";
                        const getSupplierName = (id) => {
                            const supp = (supplierReport || []).find(s => String(s.id || s._id) === String(id));
                            return supp ? (supp.name || supp.supplierName) : id;
                        };

                        return (
                            <div className="space-y-5">
                                <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b ${theme.borderLight} pb-4`}>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
                                        <h3 className={`text-xl font-black ${theme.textHeading}`}>
                                            Purchase Report ({rangeLabel})
                                        </h3>
                                        {/* View Mode Toggle: Summary vs Item-wise */}
                                        <div className={`inline-flex rounded-xl p-1 ${theme.pageBg} border ${theme.borderLight}`}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPurchaseViewMode("summary");
                                                    setPurchaseTaxPercentFilter("all");
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                                                    purchaseViewMode === "summary"
                                                        ? `${theme.buttonBg} ${theme.buttonText} shadow-xs font-black`
                                                        : `${theme.textMuted} ${theme.sidebarItemHoverBg} font-bold`
                                                }`}
                                            >
                                                Bill Summary
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setPurchaseViewMode("itemized")}
                                                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                                                    purchaseViewMode === "itemized"
                                                        ? `${theme.buttonBg} ${theme.buttonText} shadow-xs font-black`
                                                        : `${theme.textMuted} ${theme.sidebarItemHoverBg} font-bold`
                                                }`}
                                            >
                                                Item-wise Breakdown
                                            </button>
                                        </div>
                                    </div>

                                    {/* Compact Single Line Filters Bar */}
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full xl:w-auto shrink-0">
                                        {/* Supplier Filter */}
                                        <div className="w-[160px] sm:w-[170px]">
                                            <CommonSelect
                                                size="sm"
                                                icon={Building2}
                                                options={[
                                                    { label: "All Suppliers", value: "all" },
                                                    ...(supplierReport || []).map(s => ({
                                                        label: s.name || s.supplierName,
                                                        value: String(s.id || s._id)
                                                    }))
                                                ]}
                                                value={purchaseSupplierFilter}
                                                onChange={(val) => setPurchaseSupplierFilter(val)}
                                                placeholder="All Suppliers"
                                            />
                                        </div>

                                        {/* Purchase Type / Tax Status Filter */}
                                        <div className="w-[150px] sm:w-[160px]">
                                            <CommonSelect
                                                size="sm"
                                                icon={ShoppingBag}
                                                options={[
                                                    { label: "All Purchases", value: "all" },
                                                    { label: "With Tax Only", value: "taxable" },
                                                    { label: "Without Tax Only", value: "non_taxable" }
                                                ]}
                                                value={purchaseTaxFilter}
                                                onChange={(val) => setPurchaseTaxFilter(val)}
                                                placeholder="All Purchases"
                                            />
                                        </div>

                                        {/* Tax Percent Filter */}
                                        {purchaseViewMode === "itemized" && (
                                            <div className="w-[140px] sm:w-[150px]">
                                                <CommonSelect
                                                    size="sm"
                                                    icon={Percent}
                                                    options={taxRateOptions.map(opt => opt.value === 'all' ? { ...opt, label: "All Tax Rates" } : opt)}
                                                    value={purchaseTaxPercentFilter}
                                                    onChange={(val) => setPurchaseTaxPercentFilter(val)}
                                                    placeholder="All Tax Rates"
                                                />
                                            </div>
                                        )}



                                        {/* Clear inline button */}
                                        {isPurchaseFilterActive && (
                                            <button
                                                onClick={() => {
                                                    setPurchaseSupplierFilter("all");
                                                    setPurchaseTaxFilter("all");
                                                    setPurchaseTaxPercentFilter("all");
                                                }}
                                                className="h-10 px-2.5 py-1 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all flex items-center gap-1 shrink-0"
                                                title="Clear all filters"
                                            >
                                                <RotateCcw size={13} />
                                                <span className="hidden sm:inline">Clear</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Active Filter Chips */}
                                {isPurchaseFilterActive && (
                                    <div className="flex items-center flex-wrap gap-2 text-xs -mt-1 animate-in fade-in duration-200">
                                        <span className={`font-bold text-[11px] uppercase tracking-wider ${theme.textMuted} mr-1`}>
                                            Active Filters:
                                        </span>

                                        {purchaseSupplierFilter !== "all" && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                                                <Building2 size={12} className="text-indigo-500" />
                                                <span>Supplier: {getSupplierName(purchaseSupplierFilter)}</span>
                                                <button
                                                    onClick={() => setPurchaseSupplierFilter("all")}
                                                    className="hover:bg-indigo-200/50 dark:hover:bg-indigo-800/80 rounded p-0.5 transition-colors ml-0.5"
                                                    title="Remove filter"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        )}

                                        {purchaseTaxFilter !== "all" && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                                                <ShoppingBag size={12} className="text-indigo-500" />
                                                <span>Type: {purchaseTaxFilter === 'taxable' ? 'With Tax' : 'Without Tax'}</span>
                                                <button
                                                    onClick={() => setPurchaseTaxFilter("all")}
                                                    className="hover:bg-indigo-200/50 dark:hover:bg-indigo-800/80 rounded p-0.5 transition-colors ml-0.5"
                                                    title="Remove filter"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        )}

                                        {purchaseTaxPercentFilter !== "all" && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60">
                                                <Percent size={12} className="text-indigo-500" />
                                                <span>Tax Rate: {purchaseTaxPercentFilter}%</span>
                                                <button
                                                    onClick={() => setPurchaseTaxPercentFilter("all")}
                                                    className="hover:bg-indigo-200/50 dark:hover:bg-indigo-800/80 rounded p-0.5 transition-colors ml-0.5"
                                                    title="Remove filter"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        )}

                                        <button
                                            onClick={() => {
                                                setPurchaseSupplierFilter("all");
                                                setPurchaseTaxFilter("all");
                                                setPurchaseTaxPercentFilter("all");
                                            }}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 hover:underline px-2 py-0.5 transition-all flex items-center gap-1"
                                        >
                                            <span>Clear all</span>
                                        </button>
                                    </div>
                                )}

                            {/* Purchase Summary KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${isDark ? 'bg-blue-950/60 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                            <ShoppingBag size={16} />
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Total Purchases</p>
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {formatCurrency(
                                            purchaseViewMode === "itemized"
                                                ? filteredPurchasesItemBreakdown.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0)
                                                : filteredPurchasesHistory.reduce((acc, p) => acc + Number(p.grandTotal || p.totalAmount || p.total || 0), 0),
                                            currency
                                        )}
                                    </p>
                                </div>
                                <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                                            <ReceiptText size={16} />
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                            {purchaseViewMode === "itemized" ? "Filtered Line Items" : "Total Bills"}
                                        </p>
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {purchaseViewMode === "itemized" ? filteredPurchasesItemBreakdown.length : filteredPurchasesHistory.length}
                                    </p>
                                </div>
                                <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${isDark ? 'bg-purple-950/60 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
                                            <ReceiptText size={16} />
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Tax Paid</p>
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {formatCurrency(
                                            purchaseViewMode === "itemized"
                                                ? filteredPurchasesItemBreakdown.reduce((acc, p) => acc + Number(p.taxAmount || 0), 0)
                                                : filteredPurchasesHistory.reduce((acc, p) => acc + Number(p.taxTotal || p.totalTax || p.taxAmount || 0), 0),
                                            currency
                                        )}
                                    </p>
                                </div>
                                <div className={`p-5 rounded-2xl border transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                                            <Coins size={16} />
                                        </div>
                                        <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Avg Bill / Line Value</p>
                                    </div>
                                    <p className={`text-2xl md:text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {formatCurrency(
                                            purchaseViewMode === "itemized"
                                                ? (filteredPurchasesItemBreakdown.length ? filteredPurchasesItemBreakdown.reduce((acc, p) => acc + Number(p.totalAmount || 0), 0) / filteredPurchasesItemBreakdown.length : 0)
                                                : (filteredPurchasesHistory.length ? (filteredPurchasesHistory.reduce((acc, p) => acc + Number(p.grandTotal || p.totalAmount || p.total || 0), 0) / filteredPurchasesHistory.length) : 0),
                                            currency
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Purchase CommonTable */}
                            {purchaseViewMode === "itemized" ? (
                                <CommonTable
                                    selectable={false}
                                    showExport={false}
                                    columns={[
                                        ...(reportBranchFilter === "all" ? [{
                                            header: "Branch",
                                            key: "branchName",
                                            className: `text-xs font-bold ${theme.textSecondary}`,
                                            render: (v, r) => r.branchName || "Main Branch"
                                        }] : []),
                                        {
                                            header: "Invoice / Bill #",
                                            key: "purchaseNumber",
                                            render: (val, row) => (
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                        {val}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {row.date}
                                                    </span>
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Supplier",
                                            key: "supplierName",
                                            render: (val, row) => (
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textHeading}`}>
                                                        {val}
                                                    </span>
                                                    {row.supplierPhone && <span className="text-[10px] text-gray-400 font-medium">{row.supplierPhone}</span>}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Item Name",
                                            key: "itemName",
                                            render: (val, row) => (
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textHeading}`}>{val}</span>
                                                    {row.itemCode && <span className="font-mono text-[10px] text-indigo-500 font-semibold">{row.itemCode}</span>}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Qty",
                                            key: "quantity",
                                            headerClassName: "text-center",
                                            className: "text-center font-black text-xs",
                                            render: (v, r) => `${v} ${r.unitName || 'Pcs'}`
                                        },
                                        {
                                            header: "Unit Price",
                                            key: "unitPrice",
                                            headerClassName: "text-right",
                                            className: "text-right font-medium text-xs",
                                            render: (v) => formatCurrency(v, currency)
                                        },
                                        {
                                            header: "Tax %",
                                            key: "taxPercent",
                                            headerClassName: "text-center",
                                            className: "text-center",
                                            render: (val) => (
                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200">
                                                    {val}% Tax
                                                </span>
                                            )
                                        },
                                        {
                                            header: "Tax Paid",
                                            key: "taxAmount",
                                            headerClassName: "text-right",
                                            className: "text-right font-bold text-purple-600 dark:text-purple-400 text-xs",
                                            render: (v) => formatCurrency(v, currency)
                                        },
                                        {
                                            header: "Line Total",
                                            key: "totalAmount",
                                            headerClassName: "text-right",
                                            className: "text-right font-black text-indigo-600 dark:text-indigo-400 text-sm",
                                            render: (v) => formatCurrency(v, currency)
                                        }
                                    ]}
                                    data={filteredPurchasesItemBreakdown}
                                />
                            ) : (
                                <CommonTable
                                    selectable={false}
                                    showExport={false}
                                    columns={[
                                        ...(reportBranchFilter === "all" ? [{
                                            header: "Branch",
                                            key: "branchName",
                                            className: `text-xs font-bold ${theme.textSecondary}`,
                                            render: (v, r) => r.branchId?.name || r.branchName || "Main Branch"
                                        }] : []),
                                        {
                                            header: "Invoice / Bill #",
                                            key: "purchaseNumber",
                                            render: (val, row) => (
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                        {val || row.invoiceNumber || row.supplierInvoiceNumber || "—"}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {new Date(row.invoiceDate || row.date || row.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Supplier",
                                            key: "supplierName",
                                            render: (val, row) => (
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-bold ${theme.textHeading}`}>
                                                        {row.supplierId?.name || val || '—'}
                                                    </span>
                                                    {row.supplierId?.phone && <span className="text-[10px] text-gray-400 font-medium">{row.supplierId.phone}</span>}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Tax Paid",
                                            key: "taxTotal",
                                            headerClassName: "text-right",
                                            render: (v, r) => (
                                                <div className="text-right font-bold text-purple-600 dark:text-purple-400">
                                                    {formatCurrency(r.taxTotal || r.totalTax || r.taxAmount || 0)}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Total Amount",
                                            key: "grandTotal",
                                            headerClassName: "text-right",
                                            render: (v, r) => (
                                                <div className="text-right font-black text-indigo-600 dark:text-indigo-400">
                                                    {formatCurrency(r.grandTotal || r.totalAmount || r.total || 0)}
                                                </div>
                                            )
                                        },
                                        {
                                            header: "Status",
                                            key: "status",
                                            headerClassName: "text-center",
                                            className: "text-center",
                                            render: (v, r) => {
                                                const st = (v || r.paymentStatus || "CONFIRMED").toUpperCase();
                                                const isPaid = st === "PAID" || st === "CONFIRMED" || st === "APPROVED";
                                                return (
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                                                        isPaid ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" :
                                                        st === "PARTIAL" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" :
                                                        "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                                    }`}>
                                                        {st}
                                                    </span>
                                                );
                                            }
                                        }
                                    ]}
                                    data={filteredPurchasesHistory}
                                />
                            )}
                        </div>
                    );
                })()}

                    {/* STOCK-WISE REPORT */}
                    {reportCategory === "stock_wise" && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-2">
                                <div>
                                    <h3 className={`text-2xl font-black tracking-tight ${theme.textHeading}`}>
                                        STOCK-WISE REPORT
                                    </h3>
                                    <p className={`text-xs font-bold ${theme.textMuted} mt-1`}>
                                        Comprehensive stock valuation, item quantities & inventory breakdown
                                    </p>
                                </div>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-xs rounded-full">
                                    Inventory Live Track
                                </span>
                            </div>

                            {/* 5 Summary Metric Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 w-full max-w-full">
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-[11px] font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Total SKUs / Items</p>
                                    <p className={`text-base sm:text-lg xl:text-xl font-black truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                                        {Number(stockWiseReport?.summary?.totalItems || (stockWiseReport?.data?.length || 0)).toLocaleString()} Items
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-[11px] font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Total Stock Qty</p>
                                    <p className={`text-base sm:text-lg xl:text-xl font-black truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-1`} title={`${Number(stockWiseReport?.summary?.totalStockQuantity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} Qty`}>
                                        {Number(stockWiseReport?.summary?.totalStockQuantity || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} Qty
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-[11px] font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Stock Cost Value</p>
                                    <p className="text-base sm:text-lg xl:text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 truncate" title={formatCurrency(stockWiseReport?.summary?.totalStockCostValuation || 0, currency)}>
                                        {formatCurrency(stockWiseReport?.summary?.totalStockCostValuation || 0, currency)}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-[11px] font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Retail Value</p>
                                    <p className="text-base sm:text-lg xl:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 truncate" title={formatCurrency(stockWiseReport?.summary?.totalStockRetailValuation || 0, currency)}>
                                        {formatCurrency(stockWiseReport?.summary?.totalStockRetailValuation || 0, currency)}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-[11px] font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Low / Out of Stock</p>
                                    <p className="text-base sm:text-lg xl:text-xl font-black text-amber-500 mt-1 truncate">
                                        {stockWiseReport?.summary?.lowStockItems || 0} Low / <span className="text-red-500">{stockWiseReport?.summary?.outOfStockItems || 0} Out</span>
                                    </p>
                                </div>
                            </div>

                            {/* Search & Status Filters */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 w-full max-w-full">
                                <div className="relative w-full sm:w-72">
                                    <input
                                        type="text"
                                        placeholder="Search SKU, item name, barcode..."
                                        value={stockSearchQuery}
                                        onChange={(e) => setStockSearchQuery(e.target.value)}
                                        className={`w-full px-4 py-2 text-xs font-bold rounded-xl border ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary} focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                                    {["all", "In Stock", "Low Stock", "Out of Stock"].map((statusKey) => (
                                        <button
                                            key={statusKey}
                                            onClick={() => setStockStatusFilter(statusKey)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                                stockStatusFilter === statusKey
                                                    ? "bg-indigo-600 text-white shadow-md"
                                                    : `${theme.surfaceBg} ${theme.textSecondary} border ${theme.borderLight} hover:opacity-80`
                                            }`}
                                        >
                                            {statusKey === "all" ? "All Status" : statusKey}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Stock Table */}
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    {
                                        header: "Item Info",
                                        key: "name",
                                        render: (val, r) => (
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-black ${theme.textHeading}`}>{val}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                                    <span className="font-mono text-indigo-500 font-bold">{r.itemCode}</span>
                                                    {r.barcode && r.barcode !== 'N/A' && <span>• Barcode: {r.barcode}</span>}
                                                </div>
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Category",
                                        key: "category",
                                        className: `text-xs font-bold ${theme.textSecondary}`
                                    },
                                    {
                                        header: "Unit / Type",
                                        key: "unit",
                                        headerClassName: "text-center",
                                        className: "text-center",
                                        render: (val, r) => (
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs font-bold">{val}</span>
                                                <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">{r.itemType}</span>
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Cost Price",
                                        key: "purchasePrice",
                                        headerClassName: "text-right",
                                        className: "text-right text-xs font-bold",
                                        render: (val) => formatCurrency(val, currency)
                                    },
                                    {
                                        header: "Selling Price",
                                        key: "sellingPrice",
                                        headerClassName: "text-right",
                                        className: "text-right text-xs font-black text-indigo-600 dark:text-indigo-400",
                                        render: (val) => formatCurrency(val, currency)
                                    },
                                    {
                                        header: "Movements (In/Out)",
                                        key: "totalPurchased",
                                        headerClassName: "text-center",
                                        className: "text-center",
                                        render: (_, r) => (
                                            <div className="text-[10px] font-bold space-x-1">
                                                <span className="text-emerald-600" title="Purchased">+P:{r.totalPurchased}</span>
                                                <span className="text-blue-600" title="Produced">+M:{r.totalProduced}</span>
                                                <span className="text-red-500" title="Sold">-S:{r.totalSold}</span>
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Current Stock",
                                        key: "quantityOnHand",
                                        headerClassName: "text-center",
                                        className: "text-center font-black text-sm",
                                        render: (val, r) => (
                                            <div className="flex flex-col items-center">
                                                <span className={val <= 0 ? 'text-red-600 font-extrabold' : (val <= r.minStockAlert ? 'text-amber-500 font-bold' : theme.textHeading)}>
                                                    {val} {r.unit}
                                                </span>
                                                {r.minStockAlert > 0 && (
                                                    <span className="text-[9px] text-gray-400 font-medium">Min Alert: {r.minStockAlert}</span>
                                                )}
                                            </div>
                                        )
                                    },
                                    {
                                        header: "Stock Status",
                                        key: "stockStatus",
                                        headerClassName: "text-center whitespace-nowrap min-w-[130px]",
                                        className: "text-center whitespace-nowrap min-w-[130px]",
                                        render: (val) => {
                                            const isOut = val === "Out of Stock";
                                            const isLow = val === "Low Stock";
                                            return (
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap inline-flex items-center justify-center shrink-0 w-max ${
                                                    isOut
                                                        ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200"
                                                        : isLow
                                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                                                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"
                                                }`}>
                                                    {val}
                                                </span>
                                            );
                                        }
                                    },
                                    {
                                        header: "Cost Valuation",
                                        key: "stockCostValue",
                                        headerClassName: "text-right",
                                        className: "text-right font-black text-indigo-600 dark:text-indigo-400 text-xs",
                                        render: (val) => formatCurrency(val, currency)
                                    },
                                    {
                                        header: "Potential Profit",
                                        key: "potentialProfit",
                                        headerClassName: "text-right",
                                        className: "text-right font-black text-emerald-600 dark:text-emerald-400 text-xs",
                                        render: (val) => formatCurrency(val, currency)
                                    }
                                ]}
                                data={(stockWiseReport?.data || []).filter(item => {
                                    if (stockStatusFilter !== "all" && item.stockStatus !== stockStatusFilter) return false;
                                    if (stockSearchQuery) {
                                        const q = stockSearchQuery.toLowerCase();
                                        return String(item.name || '').toLowerCase().includes(q) ||
                                               String(item.itemCode || '').toLowerCase().includes(q) ||
                                               String(item.barcode || '').toLowerCase().includes(q) ||
                                               String(item.category || '').toLowerCase().includes(q);
                                    }
                                    return true;
                                })}
                                className="mt-4"
                            />
                        </div>
                    )}

                    {/* MANUFACTURING REPORT */}
                    {reportCategory === "manufacturing" && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-2">
                                <div>
                                    <h3 className={`text-2xl font-black tracking-tight ${theme.textHeading}`}>
                                        MANUFACTURING REPORT
                                    </h3>
                                    <p className={`text-xs font-bold ${theme.textMuted} mt-1`}>
                                        Period: {filterStartDate} to {filterEndDate}
                                    </p>
                                </div>
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-xs rounded-full">
                                    BOM Enabled
                                </span>
                            </div>

                            {/* 4 Summary Cards matching Attached Image 1 */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full">
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-xs font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Total Production</p>
                                    <p className={`text-lg sm:text-xl font-black truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                                        {Number(manufacturingReport?.summary?.totalProductionQty || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} PCS
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-xs font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Raw Material Consumed</p>
                                    <p className={`text-lg sm:text-xl font-black truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                                        {formatCurrency(manufacturingReport?.summary?.totalRawMaterialCost || 0, currency)}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-xs font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Wastage</p>
                                    <p className={`text-lg sm:text-xl font-black truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                                        {formatCurrency(manufacturingReport?.summary?.totalWastageCost || 0, currency)}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-xl border-2 text-center min-w-0 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                                    <p className={`text-xs font-bold uppercase truncate ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Production Cost</p>
                                    <p className={`text-lg sm:text-xl font-black truncate ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                                        {formatCurrency(manufacturingReport?.summary?.totalProductionCost || 0, currency)}
                                    </p>
                                </div>
                            </div>

                            {/* Table 1: Production Batches */}
                            <div className="space-y-3">
                                <h4 className={`text-sm font-black uppercase tracking-wider ${theme.textSecondary}`}>
                                    Production Runs & Cost Breakdown
                                </h4>
                                <CommonTable
                                    selectable={false}
                                    showExport={false}
                                    columns={[
                                        { header: "Production No.", key: "productionNo", className: "font-mono font-bold text-xs text-indigo-600" },
                                        { header: "Date", key: "date", className: "text-xs font-medium" },
                                        { header: "Batch No.", key: "batchNo", className: "font-mono text-xs" },
                                        { header: "Finished Product", key: "finishedProduct", className: "font-bold text-xs" },
                                        { header: "Qty Produced", key: "qtyProduced", headerClassName: "text-center", className: "text-center font-bold" },
                                        { header: "Raw Material Cost", key: "rawMaterialCost", headerClassName: "text-right", className: "text-right font-semibold", render: (v) => formatCurrency(v, currency) },
                                        { header: "Labour Cost", key: "labourCost", headerClassName: "text-right", className: "text-right font-semibold", render: (v) => formatCurrency(v, currency) },
                                        { header: "Travel Expense", key: "travelExpense", headerClassName: "text-right", className: "text-right font-semibold", render: (v) => formatCurrency(v, currency) },
                                        { header: "Other Cost", key: "otherCost", headerClassName: "text-right", className: "text-right font-semibold", render: (v) => formatCurrency(v, currency) },
                                        { header: "Wastage Cost", key: "wastageCost", headerClassName: "text-right", className: "text-right font-semibold text-amber-600", render: (v) => formatCurrency(v, currency) },
                                        { header: "Total Cost", key: "totalProductionCost", headerClassName: "text-right", className: "text-right font-black text-indigo-600", render: (v) => formatCurrency(v, currency) },
                                        { header: "Cost / Unit", key: "costPerUnit", headerClassName: "text-right", className: "text-right font-bold text-emerald-600", render: (v) => formatCurrency(v, currency) },
                                        { header: "Status", key: "status", headerClassName: "text-center whitespace-nowrap min-w-[100px]", className: "text-center whitespace-nowrap min-w-[100px]", render: (v) => <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 uppercase whitespace-nowrap inline-flex items-center justify-center shrink-0 border border-emerald-200">{v || 'Completed'}</span> }
                                    ]}
                                    data={manufacturingReport?.data || []}
                                />
                            </div>

                            {/* Table 2: Material Consumption Breakdown (BOM Table matching Image 1) */}
                            <div className="space-y-3 pt-4 border-t border-dashed">
                                <h4 className={`text-base font-black ${theme.textHeading}`}>
                                    Material Consumption – Production Breakdown (Bill of Materials)
                                </h4>
                                <CommonTable
                                    selectable={false}
                                    showExport={false}
                                    columns={[
                                        { header: "Production No.", key: "productionNo", className: "font-mono font-bold text-xs text-indigo-600" },
                                        { header: "Finished Product", key: "finishedProduct", className: "font-bold text-xs" },
                                        { header: "Raw Material", key: "rawMaterial", className: "font-bold text-xs text-slate-800 dark:text-slate-200" },
                                        { header: "Required Qty", key: "requiredQty", headerClassName: "text-center", className: "text-center font-semibold" },
                                        { header: "Actual Qty", key: "actualQty", headerClassName: "text-center", className: "text-center font-bold text-indigo-600" },
                                        { header: "Unit", key: "unit", headerClassName: "text-center", className: "text-center text-xs font-mono" },
                                        { header: "Rate", key: "rate", headerClassName: "text-right", className: "text-right font-medium", render: (v) => formatCurrency(v, currency) },
                                        { header: "Amount", key: "amount", headerClassName: "text-right", className: "text-right font-black text-emerald-600", render: (v) => formatCurrency(v, currency) }
                                    ]}
                                    data={(manufacturingReport?.data || []).flatMap(run => run.bomMaterials || [])}
                                />
                            </div>
                        </div>
                    )}

                    {/* 2. ITEM-WISE REPORT */}
                    {reportCategory === "items" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Detailed Item-wise Sales ({rangeLabel})
                            </h3>
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    { 
                                        header: "Item SKU", 
                                        key: "sku", 
                                        className: "font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400" 
                                    },
                                    { 
                                        header: "Item Name", 
                                        key: "name", 
                                        className: `font-bold ${theme.textPrimary}` 
                                    },
                                    { 
                                        header: "Category", 
                                        key: "category",
                                        render: (v) => (
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 whitespace-nowrap inline-flex items-center">
                                                {v}
                                            </span>
                                        )
                                    },
                                    { 
                                        header: "Tax %", 
                                        key: "taxPercent", 
                                        headerClassName: "text-center",
                                        className: "text-center text-xs font-semibold",
                                        render: (v) => `${v}%`
                                    },
                                    { 
                                        header: "Balance Stock", 
                                        key: "stock", 
                                        headerClassName: "text-center whitespace-nowrap min-w-[120px]",
                                        className: "text-center whitespace-nowrap min-w-[120px]",
                                        render: (v) => (
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center justify-center shrink-0 ${v <= 5 ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200"}`}>
                                                {v} Qty
                                            </span>
                                        )
                                    },
                                    { 
                                        header: "Qty Sold", 
                                        key: "qty", 
                                        headerClassName: "text-center",
                                        className: "text-center font-black text-indigo-600" 
                                    },
                                    { 
                                        header: "Avg Price", 
                                        key: "avgPrice", 
                                        headerClassName: "text-right",
                                        className: "text-right font-medium text-xs",
                                        render: (v) => formatCurrency(v, currency)
                                    },
                                    { 
                                        header: "Discount", 
                                        key: "discount", 
                                        headerClassName: "text-right",
                                        className: "text-right font-bold text-amber-600 dark:text-amber-400 text-xs",
                                        render: (v) => formatCurrency(v, currency)
                                    },
                                    { 
                                        header: "Offer Details", 
                                        key: "offers", 
                                        headerClassName: "text-center",
                                        className: "text-center text-xs font-semibold",
                                        render: (offersSet) => {
                                            const list = offersSet ? Array.from(offersSet) : [];
                                            if (list.length === 0) return <span className="text-gray-400 text-[10px]">—</span>;
                                            return (
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {list.map((off, idx) => (
                                                        <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
                                                            {off}
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        }
                                    },
                                    {
                                        header: "Revenue",
                                        key: "revenue",
                                        headerClassName: "text-right",
                                        className: "text-right font-black text-indigo-600",
                                        render: (v) => formatCurrency(v, currency)
                                    },
                                    {
                                        header: "Cost Value",
                                        key: "cost",
                                        headerClassName: "text-right",
                                        className: "text-right font-semibold text-slate-500",
                                        render: (v) => formatCurrency(v, currency)
                                    },
                                    {
                                        header: "Net Profit",
                                        key: "profit",
                                        headerClassName: "text-right",
                                        className: "text-right font-black text-emerald-600",
                                        render: (v) => formatCurrency(v, currency)
                                    },
                                    {
                                        header: "Margin %",
                                        key: "margin",
                                        headerClassName: "text-right",
                                        className: "text-right font-bold text-emerald-600",
                                        render: (v) => `${v.toFixed(1)}%`
                                    }
                                ]}
                                data={(() => {
                                    const itemMap = new Map();
                                    itemList.forEach(i => {
                                        itemMap.set(String(i.name || '').toLowerCase(), i);
                                        if (i.itemCode) itemMap.set(String(i.itemCode).toLowerCase(), i);
                                    });

                                    const itemStats = {};
                                    salesHistory
                                        .filter((s) => isWithinRange(s.date))
                                        .forEach((sale) => {
                                            if (sale.items) {
                                                sale.items.forEach((item) => {
                                                    const itemName = item.name || item.itemName || item.title || item.itemId?.name || item.productId?.name || "Uncategorized Item";
                                                    const key = itemName.toLowerCase();
                                                    if (!itemStats[key]) {
                                                        const masterItem = itemMap.get(key);
                                                        itemStats[key] = {
                                                            sku: masterItem?.itemCode || item.itemCode || 'ITM-N/A',
                                                            name: itemName,
                                                            category: masterItem?.categoryId?.name || item.category || 'General',
                                                            taxPercent: item.taxPercent !== undefined ? item.taxPercent : (masterItem?.taxPercent || settings?.defaultTaxPercent || 0),
                                                            stock: masterItem?.quantityOnHand !== undefined ? masterItem.quantityOnHand : (item.quantityOnHand || 0),
                                                            qty: 0,
                                                            discount: 0,
                                                            offers: new Set(),
                                                            revenue: 0,
                                                            cost: 0,
                                                            profit: 0
                                                        };
                                                    }
                                                    const q = item.quantity || 0;
                                                    itemStats[key].qty += q;
                                                    const lineRevenue = item.totalAmount || ((item.price || 0) * q);
                                                    const lineCost = (item.purchasePrice || 0) * q;
                                                    const itemDiscount = Number(item.discountAmount || item.discount || 0);
                                                    itemStats[key].discount += itemDiscount;
                                                    itemStats[key].revenue += lineRevenue;
                                                    itemStats[key].cost += lineCost;
                                                    itemStats[key].profit += (lineRevenue - lineCost);

                                                    const offerText = item.offerName || item.bogoOfferName || item.offerDetails || (typeof item.appliedOfferId === 'object' ? item.appliedOfferId?.name : null) || item.offerTitle;
                                                    if (offerText) {
                                                        itemStats[key].offers.add(offerText);
                                                    }
                                                    if (item.isFreeItem) {
                                                        itemStats[key].offers.add("Free Item");
                                                    }
                                                    if (item.freeQuantity && item.freeQuantity > 0) {
                                                        itemStats[key].offers.add(`${item.freeQuantity} Free`);
                                                    }
                                                    if (Array.isArray(sale.appliedOffers)) {
                                                        sale.appliedOffers.forEach(off => {
                                                            if (off.name || off.title) itemStats[key].offers.add(off.name || off.title);
                                                        });
                                                    }
                                                });
                                            }
                                        });

                                    return Object.values(itemStats).map(stat => ({
                                        ...stat,
                                        avgPrice: stat.qty > 0 ? stat.revenue / stat.qty : 0,
                                        margin: stat.revenue > 0 ? (stat.profit / stat.revenue) * 100 : 0
                                    }));
                                })()}
                            />
                        </div>
                    )}

                    {/* 3. CATEGORY REPORT */}
                    {reportCategory === "category" && (
                        <div className="space-y-6">
                            <h3 className={`text-xl font-black ${theme.textHeading} border-b ${theme.borderLight} pb-4`}>
                                Category Performance & Profitability ({rangeLabel})
                            </h3>
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    { header: "Category Name", key: "category", className: `font-bold text-sm ${theme.textPrimary}` },
                                    { header: "Products Count", key: "productsCount", headerClassName: "text-center", className: "text-center font-bold text-xs" },
                                    { header: "Qty Sold", key: "qtySold", headerClassName: "text-center", className: "text-center font-black text-indigo-600" },
                                    { header: "Total Revenue", key: "revenue", headerClassName: "text-right", className: "text-right font-black text-indigo-600", render: (v) => formatCurrency(v, currency) },
                                    { header: "Total Cost", key: "cost", headerClassName: "text-right", className: "text-right font-semibold text-slate-500", render: (v) => formatCurrency(v, currency) },
                                    { header: "Net Profit", key: "profit", headerClassName: "text-right", className: "text-right font-black text-emerald-600", render: (v) => formatCurrency(v, currency) },
                                    { header: "Margin %", key: "margin", headerClassName: "text-right", className: "text-right font-bold text-emerald-600", render: (v) => `${v.toFixed(1)}%` }
                                ]}
                                data={(() => {
                                    const catStats = {};
                                    const catProductsMap = {};
                                    itemList.forEach(i => {
                                        const cName = i.categoryId?.name || "Others";
                                        if (!catProductsMap[cName]) catProductsMap[cName] = 0;
                                        catProductsMap[cName] += 1;
                                    });

                                    salesHistory
                                        .filter((s) => isWithinRange(s.date))
                                        .forEach((sale) => {
                                            if (sale.items) {
                                                sale.items.forEach((item) => {
                                                    const cat = item.category || "Others";
                                                    if (!catStats[cat]) {
                                                        catStats[cat] = { category: cat, productsCount: catProductsMap[cat] || 0, qtySold: 0, revenue: 0, cost: 0, profit: 0 };
                                                    }
                                                    const q = item.quantity || 0;
                                                    const lineRev = item.totalAmount || ((item.price || 0) * q);
                                                    const lineCost = (item.purchasePrice || 0) * q;
                                                    catStats[cat].qtySold += q;
                                                    catStats[cat].revenue += lineRev;
                                                    catStats[cat].cost += lineCost;
                                                    catStats[cat].profit += (lineRev - lineCost);
                                                });
                                            }
                                        });

                                    return Object.values(catStats).map(stat => ({
                                        ...stat,
                                        margin: stat.revenue > 0 ? (stat.profit / stat.revenue) * 100 : 0
                                    }));
                                })()}
                            />
                        </div>
                    )}

                    {/* 4. PAYMENT MODES */}
                    {reportCategory === "payments" && (
                        <div className="space-y-6">
                            {/* Header & Filter Controls */}
                            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5 ${
                                isDark ? 'border-slate-800' : 'border-gray-200'
                            }`}>
                                <div>
                                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        Payment Methods & Cashflow
                                    </h3>
                                    <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                        Breakdown of sales collections (Inflow) and purchase payments (Outflow).
                                    </p>
                                </div>
                                {/* Filter Toggle Tabs: All / Sales Only / Purchases Only */}
                                <div className={`flex items-center p-1 rounded-xl border ${
                                    isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-gray-100 border-gray-300'
                                }`}>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentFilter("all")}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            paymentFilter === "all"
                                                ? isDark ? "bg-slate-900 text-indigo-400 shadow-xs" : "bg-white text-indigo-600 border border-gray-200 shadow-xs"
                                                : isDark ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                                        }`}
                                    >
                                        <span>All Transactions</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentFilter("sales")}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            paymentFilter === "sales"
                                                ? isDark ? "bg-slate-900 text-emerald-400 shadow-xs" : "bg-white text-emerald-600 border border-gray-200 shadow-xs"
                                                : isDark ? "text-slate-400 hover:text-emerald-400" : "text-gray-600 hover:text-emerald-600"
                                        }`}
                                    >
                                        <TrendingUp size={14} />
                                        <span>Sales Only</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentFilter("purchases")}
                                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                            paymentFilter === "purchases"
                                                ? isDark ? "bg-slate-900 text-amber-400 shadow-xs" : "bg-white text-amber-600 border border-gray-200 shadow-xs"
                                                : isDark ? "text-slate-400 hover:text-amber-400" : "text-gray-600 hover:text-amber-600"
                                        }`}
                                    >
                                        <ShoppingBag size={14} />
                                        <span>Purchases Only</span>
                                    </button>
                                </div>
                            </div>

                            {/* Summary Metric Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className={`p-5 rounded-2xl border transition-all space-y-2 ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                                            isDark ? 'text-slate-400' : 'text-gray-600'
                                        }`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                                                isDark ? 'bg-emerald-950/60 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                                            }`}>
                                                <TrendingUp size={14} />
                                            </div>
                                            Sales Collected (Inflow)
                                        </span>
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                            isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                        }`}>
                                            {totalSalesCount} Sales
                                        </span>
                                    </div>
                                    <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                                        {formatCurrency(totalSalesPayments, currency)}
                                    </p>
                                </div>

                                <div className={`p-5 rounded-2xl border transition-all space-y-2 ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                                            isDark ? 'text-slate-400' : 'text-gray-600'
                                        }`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                                                isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                                <ShoppingBag size={14} />
                                            </div>
                                            Purchases Paid (Outflow)
                                        </span>
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                            isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/50' : 'bg-amber-50 text-amber-800 border-amber-300'
                                        }`}>
                                            {totalPurchaseCount} Purchases
                                        </span>
                                    </div>
                                    <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'} mt-1`}>
                                        {formatCurrency(totalPurchasePayments, currency)}
                                    </p>
                                </div>

                                <div className={`p-5 rounded-2xl border transition-all space-y-2 ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                                }`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                                            isDark ? 'text-slate-400' : 'text-gray-600'
                                        }`}>
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                                                isDark ? 'bg-indigo-950/60 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                <Scale size={14} />
                                            </div>
                                            Net Payment Flow
                                        </span>
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                            netPaymentFlow >= 0 
                                                ? isDark ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50' : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                                : isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800/50' : 'bg-rose-50 text-rose-800 border-rose-300'
                                        }`}>
                                            {netPaymentFlow >= 0 ? 'Positive Cashflow' : 'Negative Cashflow'}
                                        </span>
                                    </div>
                                    <p className={`text-2xl font-black ${
                                        netPaymentFlow >= 0 ? isDark ? 'text-white' : 'text-gray-900' : 'text-rose-600'
                                    } mt-1`}>
                                        {formatCurrency(netPaymentFlow, currency)}
                                    </p>
                                </div>
                            </div>

                            {/* Payment Methods Cards */}
                            <div className="space-y-4">
                                {paymentMethodStats.map((item) => {
                                    const { name, salesAmount, salesCount, purchaseAmount, purchaseCount, netAmount, totalCount } = item;
                                    
                                    if (paymentFilter === "sales" && salesAmount === 0 && salesCount === 0) return null;
                                    if (paymentFilter === "purchases" && purchaseAmount === 0 && purchaseCount === 0) return null;
                                    if (paymentFilter === "all" && totalCount === 0 && salesAmount === 0 && purchaseAmount === 0) return null;

                                    const displayAmount = paymentFilter === "sales" 
                                        ? salesAmount 
                                        : paymentFilter === "purchases" 
                                            ? purchaseAmount 
                                            : netAmount;

                                    const displayCount = paymentFilter === "sales"
                                        ? salesCount
                                        : paymentFilter === "purchases"
                                            ? purchaseCount
                                            : totalCount;

                                    return (
                                        <div key={name} className={`p-5 rounded-2xl border space-y-4 ${
                                            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-gray-300 shadow-xs'
                                        }`}>
                                            {/* Top Header Row */}
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                                                        name === "Cash" 
                                                            ? "bg-emerald-600 text-white"
                                                            : name === "UPI" 
                                                                ? "bg-indigo-600 text-white"
                                                                : name === "Card"
                                                                    ? "bg-blue-600 text-white"
                                                                    : name === "Split"
                                                                        ? "bg-purple-600 text-white"
                                                                        : "bg-sky-600 text-white"
                                                    }`}>
                                                        {name === "Cash" ? <Coins size={20} /> : name === "UPI" ? <Zap size={20} /> : name === "Card" ? <CreditCard size={20} /> : name === "Split" ? <GitFork size={20} /> : <Landmark size={20} />}
                                                    </div>
                                                    <div>
                                                        <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{name}</h4>
                                                        <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                                            {displayCount} {displayCount === 1 ? 'Transaction' : 'Transactions'} Total
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-left sm:text-right">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                                        {paymentFilter === "sales" ? "Sales Collected" : paymentFilter === "purchases" ? "Purchases Paid" : "Net Payment Balance"}
                                                    </span>
                                                    <span className={`text-2xl font-black mt-0.5 block ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                        {formatCurrency(displayAmount, currency)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Inflow vs Outflow Breakdown Grid */}
                                            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t ${
                                                isDark ? 'border-slate-800' : 'border-gray-200'
                                            }`}>
                                                {(paymentFilter === "all" || paymentFilter === "sales") && (
                                                    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                                        isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-gray-50 border-gray-200'
                                                    }`}>
                                                        <div>
                                                            <span className={`text-[11px] font-bold uppercase tracking-wider block flex items-center gap-1 ${
                                                                isDark ? 'text-slate-400' : 'text-gray-600'
                                                            }`}>
                                                                <ArrowUpRight size={13} className="text-emerald-600" /> Sales (Inflow)
                                                            </span>
                                                            <span className={`text-sm font-black mt-0.5 block ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                {formatCurrency(salesAmount, currency)}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                                            isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                                        }`}>
                                                            {salesCount} Txns
                                                        </span>
                                                    </div>
                                                )}

                                                {(paymentFilter === "all" || paymentFilter === "purchases") && (
                                                    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                                        isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-gray-50 border-gray-200'
                                                    }`}>
                                                        <div>
                                                            <span className={`text-[11px] font-bold uppercase tracking-wider block flex items-center gap-1 ${
                                                                isDark ? 'text-slate-400' : 'text-gray-600'
                                                            }`}>
                                                                <ArrowDownRight size={13} className="text-amber-600" /> Purchases (Outflow)
                                                            </span>
                                                            <span className={`text-sm font-black mt-0.5 block ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                {formatCurrency(purchaseAmount, currency)}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                                            isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/50' : 'bg-amber-50 text-amber-800 border-amber-300'
                                                        }`}>
                                                            {purchaseCount} Txns
                                                        </span>
                                                    </div>
                                                )}

                                                {paymentFilter === "all" && (
                                                    <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                                        isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-gray-50 border-gray-200'
                                                    }`}>
                                                        <div>
                                                            <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                                                                isDark ? 'text-slate-400' : 'text-gray-600'
                                                            }`}>
                                                                Net Flow
                                                            </span>
                                                            <span className={`text-sm font-black mt-0.5 block ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                {formatCurrency(netAmount, currency)}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                                                            netAmount >= 0 
                                                                ? isDark ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50' : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                                                                : isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800/50' : 'bg-rose-50 text-rose-800 border-rose-300'
                                                        }`}>
                                                            {netAmount >= 0 ? '+Net In' : '-Net Out'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Differentiated Payment Mode Breakdown (ONLY FOR SPLIT PAYMENT) */}
                                            {name === "Split" && (
                                                <div className={`p-4 rounded-xl border space-y-3 mt-3 ${
                                                    isDark ? 'bg-purple-950/30 border-purple-800/60' : 'bg-purple-50/70 border-purple-200'
                                                }`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                                                            <GitFork size={15} className="text-purple-600 dark:text-purple-400" />
                                                            Split Payment Differentiated Breakdown
                                                        </span>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200 uppercase">
                                                            Split Breakdown
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                        {/* Sales Split Sub-Methods */}
                                                        {(paymentFilter === "all" || paymentFilter === "sales") &&
                                                            Object.entries(item.splitSalesBreakdown || {}).map(([subMethod, amt]) => (
                                                                <div key={`sales-${subMethod}`} className={`p-3 rounded-xl border ${
                                                                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-purple-100 shadow-2xs'
                                                                }`}>
                                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                                                        Split {subMethod} (Sales)
                                                                    </span>
                                                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                                                                        {formatCurrency(amt, currency)}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        }

                                                        {/* Purchases Split Sub-Methods */}
                                                        {(paymentFilter === "all" || paymentFilter === "purchases") &&
                                                            Object.entries(item.splitPurchaseBreakdown || {}).map(([subMethod, amt]) => (
                                                                <div key={`purchases-${subMethod}`} className={`p-3 rounded-xl border ${
                                                                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-purple-100 shadow-2xs'
                                                                }`}>
                                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                                                        Split {subMethod} (Purchases)
                                                                    </span>
                                                                    <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
                                                                        {formatCurrency(amt, currency)}
                                                                    </span>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            )}
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
                                Staff & Performing Users Performance ({rangeLabel})
                            </h3>
                            <CommonTable
                                selectable={false}
                                showExport={false}
                                columns={[
                                    { 
                                        header: "Staff Name", 
                                        key: "employeeName", 
                                        className: `font-bold ${theme.textPrimary}`,
                                        render: (val, row) => (
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs">{val}</span>
                                                {row.role === 'Owner' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                                        OWNER
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    },
                                    { 
                                        header: "Role / Designation", 
                                        key: "role", 
                                        headerClassName: "text-center",
                                        className: "text-center text-xs font-semibold text-slate-500",
                                        render: (v) => v || 'Staff'
                                    },
                                    { 
                                        header: "Sales Orders", 
                                        key: "stats.orders", 
                                        headerClassName: "text-center",
                                        className: "text-center font-bold",
                                        render: (_, row) => row.stats.orders || 0
                                    },
                                    {
                                        header: "Sales Value",
                                        key: "stats.sales",
                                        headerClassName: "text-right",
                                        className: "text-right font-black text-indigo-600",
                                        render: (_, row) => formatCurrency(row.stats.sales || 0, currency)
                                    },
                                    {
                                        header: "Cash Collected",
                                        key: "stats.cash",
                                        headerClassName: "text-right",
                                        className: "text-right font-bold text-emerald-600",
                                        render: (_, row) => formatCurrency(row.stats.cash || 0, currency)
                                    },
                                    { 
                                        header: "Purchases Entered", 
                                        key: "stats.purchases", 
                                        headerClassName: "text-center",
                                        className: "text-center font-bold",
                                        render: (_, row) => row.stats.purchases || 0
                                    },
                                    {
                                        header: "Purchase Value",
                                        key: "stats.purchaseValue",
                                        headerClassName: "text-right",
                                        className: "text-right font-bold text-amber-600",
                                        render: (_, row) => formatCurrency(row.stats.purchaseValue || 0, currency)
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
                            
                            {profitLossReport && profitLossReport.sections ? (
                                <div className={`${theme.pageBg} rounded-3xl border ${theme.borderLight} p-8 space-y-8`}>
                                    {/* Render each section */}
                                    {profitLossReport.sections.map((section, idx) => (
                                        <div key={idx} className="space-y-4">
                                            {/* Section Header with underline */}
                                            <div className="border-b-2 border-gray-400 dark:border-gray-600 pb-2">
                                                <h4 className={`text-sm font-black uppercase tracking-widest ${theme.textSecondary}`}>
                                                    {section.label}
                                                </h4>
                                            </div>
                                            
                                            {/* Section Items */}
                                            {section.items && section.items.length > 0 ? (
                                                <div className="space-y-2 pl-4">
                                                    {section.items.map((item, itemIdx) => (
                                                        <div key={itemIdx} className="flex justify-between items-center py-1">
                                                            <span className={`text-sm font-medium ${theme.textPrimary}`}>
                                                                {item.label || item.name || 'Unknown'}
                                                            </span>
                                                            <span className={`text-sm font-bold tabular-nums ${
                                                                section.type === 'credit' 
                                                                    ? 'text-green-600 dark:text-green-400' 
                                                                    : 'text-red-600 dark:text-red-400'
                                                            }`}>
                                                                {formatCurrency(item.amount, currency)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className={`text-sm ${theme.textMuted} italic pl-4`}>No items</p>
                                            )}
                                            
                                            {/* Section Total */}
                                            <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-3 flex justify-between items-center">
                                                <span className={`text-sm font-black uppercase ${theme.textPrimary}`}>
                                                    Total {section.label}
                                                </span>
                                                <span className={`text-base font-black tabular-nums ${
                                                    section.type === 'credit' 
                                                        ? 'text-green-700 dark:text-green-300' 
                                                        : 'text-red-700 dark:text-red-300'
                                                }`}>
                                                    {formatCurrency(section.total, currency)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Gross Profit */}
                                    {(() => {
                                        const gpVal = typeof profitLossReport.grossProfit === 'object'
                                            ? profitLossReport.grossProfit?.amount
                                            : (profitLossReport.grossProfit ?? profitLossReport.grossProfitAmount ?? profitLossReport.summary?.grossProfit);
                                        const gpMargin = profitLossReport.grossMarginPercent ?? profitLossReport.grossProfit?.percentage ?? profitLossReport.summary?.grossMargin;
                                        if (gpVal === undefined || gpVal === null) return null;
                                        return (
                                            <div className="border-t-4 border-double border-gray-400 dark:border-gray-600 pt-4">
                                                <div className="flex justify-between items-center py-2">
                                                    <span className={`text-base font-black uppercase ${theme.textHeading}`}>
                                                        Gross Profit
                                                    </span>
                                                    <span className={`text-xl font-black tabular-nums ${
                                                        gpVal >= 0 
                                                            ? 'text-blue-600 dark:text-blue-400' 
                                                            : 'text-orange-600 dark:text-orange-400'
                                                    }`}>
                                                        {formatCurrency(gpVal, currency)}
                                                    </span>
                                                </div>
                                                {gpMargin !== undefined && (
                                                    <p className={`text-xs font-bold ${theme.textMuted} text-right`}>
                                                        {Number(gpMargin).toFixed(2)}% margin
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    
                                    {/* Net Profit */}
                                    {(() => {
                                        const npVal = typeof profitLossReport.netProfit === 'object'
                                            ? profitLossReport.netProfit?.amount
                                            : (profitLossReport.netProfit ?? profitLossReport.netProfitAmount ?? profitLossReport.summary?.netProfit);
                                        const npMargin = profitLossReport.netMarginPercent ?? profitLossReport.netProfit?.percentage ?? profitLossReport.summary?.netMargin;
                                        if (npVal === undefined || npVal === null) return null;
                                        return (
                                            <div className="border-t-4 border-double border-black dark:border-white pt-4 mt-6">
                                                <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                                                    <span className={`text-xl font-black uppercase tracking-wide ${theme.textHeading}`}>
                                                        Net Profit
                                                    </span>
                                                    <div className="text-right">
                                                        <span className={`text-3xl font-black tabular-nums ${
                                                            npVal >= 0 
                                                                ? 'text-emerald-600 dark:text-emerald-400' 
                                                                : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {formatCurrency(npVal, currency)}
                                                        </span>
                                                        {npMargin !== undefined && (
                                                            <p className={`text-xs font-bold mt-1 ${
                                                                npVal >= 0 
                                                                    ? 'text-emerald-700 dark:text-emerald-500' 
                                                                    : 'text-red-700 dark:text-red-500'
                                                            }`}>
                                                                {Number(npMargin).toFixed(2)}% margin
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
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

