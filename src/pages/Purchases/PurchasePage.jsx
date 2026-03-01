import React, { useState, useEffect, useMemo } from "react";
import { X, Save, Plus, Trash2, Search, Calculator, Calendar, User, Building, FileText, ShoppingCart, Package, Info, Tag, ChevronDown, Check, ArrowLeft, ChevronRight, Phone, Mail, MapPin, Loader2, Printer } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PurchaseService } from "../../services/PurchaseService";
import { SupplierService } from "../Suppliers/SupplierService";
import api, { itemService, branchService, shopService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import ProductPage from "../Inventory/ProductPage";
import Modal from "../../components/ui/Modal";
import DatePicker from "../../components/ui/DatePicker";
import CommonSelect from "../../components/ui/CommonSelect";
import {
    TAX_SYSTEMS,
    BRANCH_STATUS,
    CURRENCIES,
    saveBranch,
    fetchLocationByPincode,
    fetchCurrentLocation,
} from "../Organization/OrganizationService";

const emptyBranch = (organizationId) => ({
    id: null,
    organizationId,
    name: "",
    address: { line1: "", city: "", state: "", country: "India", pincode: "" },
    taxConfig: {
        taxSystem: TAX_SYSTEMS.GST,
        gstin: "",
        isGstRegistered: false,
        allowInterState: true,
    },
    currency: "INR",
    isMainBranch: false,
    status: BRANCH_STATUS.ACTIVE,
});

const PurchasePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { activeBranchId, formatCurrency } = useApp();
    const { theme } = useTheme();
    const isEditing = !!id;

    // --- State ---
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [shopInfo, setShopInfo] = useState(null);

    const [formData, setFormData] = useState({
        supplierId: "",
        branchId: activeBranchId || "",
        supplierInvoiceNumber: "",
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        notes: "",
        items: [],
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceAmount: 0
    });

    const [itemSearch, setItemSearch] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState("");
    const [showSupplierResults, setShowSupplierResults] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [savingSupplier, setSavingSupplier] = useState(false);
    const [supplierFormData, setSupplierFormData] = useState({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        address: "",
        taxId: "",
        status: "ACTIVE"
    });

    const [branchSearch, setBranchSearch] = useState("");
    const [showBranchResults, setShowBranchResults] = useState(false);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [savingBranch, setSavingBranch] = useState(false);
    const [branchForm, setBranchForm] = useState(emptyBranch(null));
    const [isLocationLoading, setIsLocationLoading] = useState(false);

    const [barcodePrintDialog, setBarcodePrintDialog] = useState({
        isOpen: false,
        item: null,
        barcode: null,
        copies: 1,
        includeName: true,
        includeCode: true,
        includePrice: false,
        includeLogo: false,
        includeBatch: false,
        includeExpiry: false,
        customText: "",
        batchOverride: "",
        expiryOverride: "",
        layout: "ROWS",
        elementsOrder: ["logo", "barcode", "name", "code", "price", "batch", "expiry", "custom"]
    });

    const handlePrintBarcode = async (lineItem) => {
        try {
            if (!lineItem.itemId) return;
            const barcodes = await itemService.getItemBarcodes(lineItem.itemId);
            if (!barcodes || barcodes.length === 0) {
                alert("No barcode found for this item.");
                return;
            }
            const barcode = barcodes[0];
            if (!barcode.imageUrl) {
                alert("Barcode exists but no printable image is available.");
                return;
            }
            const base = api.defaults.baseURL || "";
            const root = base.replace(/\/api\/?$/, "");
            const fullUrl = `${root}${barcode.imageUrl}`;

            setBarcodePrintDialog({
                isOpen: true,
                item: lineItem,
                barcode: { ...barcode, fullUrl },
                copies: Math.max(1, Number(lineItem.quantity || 1)),
                includeName: true,
                includeCode: true,
                includePrice: false,
                includeLogo: !!shopInfo?.logoUrl,
                includeBatch: !!lineItem.batchNo,
                includeExpiry: !!lineItem.expiryDate,
                customText: "",
                batchOverride: "",
                expiryOverride: "",
                layout: "ROWS",
                elementsOrder: ["logo", "barcode", "name", "code", "price", "batch", "expiry", "custom"]
            });
        } catch (error) {
            console.error("Failed to prepare barcode for printing:", error);
            alert("Failed to load barcode for printing.");
        }
    };

    // --- Initialize Data ---
    useEffect(() => {
        if (user?.shop_id) {
            fetchInitialData();
        }
        if (isEditing) {
            loadPurchase();
        }
    }, [user?.shop_id, id]);

    const fetchInitialData = async () => {
        try {
            const [suppliersData, branchesData, shopData, itemsRes] = await Promise.all([
                SupplierService.getSuppliers(user.shop_id),
                branchService.getBranchesByShopId(user.shop_id),
                shopService.getShopById(user.shop_id),
                itemService.getItems({
                    filters: { shopid: user.shop_id, itemType: "STOCK" },
                    limit: 100
                })
            ]);
            setSuppliers(suppliersData);
            setBranches(branchesData);
            setShopInfo(shopData);
            setStockItems(itemsRes.data || []);
        } catch (error) {
            console.error("Error fetching form data:", error);
        }
    };

    const loadPurchase = async () => {
        setLoading(true);
        try {
            const data = await PurchaseService.getPurchaseById(id);
            const p = data.purchase;
            setFormData({
                ...p,
                supplierId: p.supplierId?._id || p.supplierId,
                branchId: p.branchId?._id || p.branchId,
                invoiceDate: new Date(p.invoiceDate).toISOString().split('T')[0],
                dueDate: p.dueDate ? new Date(p.dueDate).toISOString().split('T')[0] : "",
                items: data.items.map(it => ({
                    ...it,
                    itemId: it.itemId?._id || it.itemId,
                    name: it.itemId?.name || "Unknown Item",
                    itemCode: it.itemId?.itemCode || ""
                }))
            });
        } catch (error) {
            console.error("Error loading purchase:", error);
            alert("Failed to load purchase details");
        } finally {
            setLoading(false);
        }
    };

    // --- Calculations ---
    const totals = useMemo(() => {
        const sub = formData.items.reduce((acc, it) => acc + (it.quantity * it.purchasePrice), 0);
        const tax = formData.items.reduce((acc, it) => acc + (it.taxAmount || 0), 0);
        const disc = formData.items.reduce((acc, it) => acc + (it.discountAmount || 0), 0);
        const grand = sub + tax - disc;
        return { sub, tax, disc, grand };
    }, [formData.items]);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            subtotal: totals.sub,
            taxTotal: totals.tax,
            discountTotal: totals.disc,
            grandTotal: totals.grand,
            balanceAmount: totals.grand - (prev.paidAmount || 0)
        }));
    }, [totals]);

    // --- Handlers ---
    const handleAddItem = (item) => {
        const existing = formData.items.find(it => it.itemId === item._id);
        if (existing) {
            alert("Item already added. Adjust quantity in the list.");
            return;
        }

        const newItem = {
            itemId: item._id,
            name: item.name,
            itemCode: item.itemCode,
            quantity: 1,
            purchasePrice: item.pricing?.purchasePrice || 0,
            sellingPrice: item.pricing?.sellingPrice || 0,
            mrp: item.pricing?.mrp || 0,
            taxAmount: 0,
            discountAmount: 0,
            expiryDate: "",
            batchTracking: item.tracking?.batchTracking || false,
            expiryTracking: item.tracking?.expiryTracking || false,
            // For barcode handling in backend:
            // existingBarcode: manufacturer / scanned code if any, per line item
            existingBarcode: item.barcode || "",
            // For IMEI / serial-tracked items we may want per-unit barcode generation
            hasIndividualBarcode: item.tracking?.serialTracking || false,
        };

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
        setItemSearch("");
        setShowResults(false);
    };

    const handleProductDialogClose = (newItem) => {
        setIsProductModalOpen(false);
        if (newItem) {
            setStockItems(prev => [...prev, newItem]);
            handleAddItem(newItem);
        }
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;
        setFormData(prev => ({ ...prev, items: updatedItems }));
    };

    const handlePrintInvoice = () => {
        const supplier = suppliers.find(s => s._id === formData.supplierId);
        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Purchase Invoice</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #111; max-width: 800px; margin: 0 auto; }
      .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
      .title { font-size: 28px; font-weight: 900; letter-spacing: 1px; }
      .info-box { margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th, td { border-bottom: 1px solid #ddd; padding: 12px 8px; text-align: left; font-size: 14px; }
      th { font-weight: bold; background: #f8f9fa; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; }
      .totals { width: 300px; float: right; }
      .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
      .total-row.grand { font-weight: 900; font-size: 20px; border-top: 2px solid #000; margin-top: 10px; padding-top: 15px; }
      .footer { clear: both; margin-top: 60px; text-align: center; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
      @media print {
          body { padding: 0; }
          .no-print { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="title">PURCHASE INVOICE</div>
        <div style="margin-top: 10px; font-size: 14px;"><strong>Date:</strong> ${new Date(formData.invoiceDate).toLocaleDateString()}</div>
        <div style="font-size: 14px;"><strong>Invoice No:</strong> ${formData.supplierInvoiceNumber || '—'}</div>
      </div>
      <div style="text-align: right; font-size: 14px; line-height: 1.5;">
        <strong style="font-size: 11px; color:#666; text-transform:uppercase; letter-spacing:1px;">Billed By</strong><br/>
        <strong style="font-size: 18px;">${supplier ? supplier.name : 'Unknown Supplier'}</strong><br/>
        ${supplier && supplier.phone ? `Ph: ${supplier.phone}<br/>` : ''}
        ${supplier && supplier.taxNumber ? `Tax ID: ${supplier.taxNumber}` : ''}
      </div>
    </div>
    
    <table>
      <thead>
        <tr>
          <th style="width: 5%">#</th>
          <th style="width: 45%">Item Description</th>
          <th style="width: 10%">Qty</th>
          <th style="width: 20%">Price</th>
          <th style="width: 20%; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${formData.items.map((it, idx) => `
          <tr>
            <td style="color:#666">${idx + 1}</td>
            <td><strong>${it.name || 'Unknown'}</strong><br/><span style="font-size:11px; color:#666;">${it.itemCode || ''}</span></td>
            <td>${it.quantity}</td>
            <td>₹${Number(it.purchasePrice).toFixed(2)}</td>
            <td style="text-align:right; font-weight:bold;">₹${(it.quantity * it.purchasePrice).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Subtotal:</span> <span>₹${Number(formData.subtotal).toFixed(2)}</span></div>
      <div class="total-row"><span>Tax (+):</span> <span>₹${Number(formData.taxTotal).toFixed(2)}</span></div>
      <div class="total-row"><span>Discount (-):</span> <span>₹${Number(formData.discountTotal).toFixed(2)}</span></div>
      <div class="total-row grand"><span>GRAND TOTAL:</span> <span>₹${Number(formData.grandTotal).toFixed(2)}</span></div>
    </div>
    <div class="footer">
      Generated from Restaurant POS System
    </div>
  </body>
</html>
        `;
        const printWindow = window.open('', '', 'width=850,height=900');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    };

    const handleSubmit = async (e, shouldPrint = false) => {
        if (e && e.preventDefault) e.preventDefault();
        if (formData.items.length === 0) {
            alert("Please add at least one item.");
            return;
        }
        setLoading(true);
        try {
            const itemsWithTotal = formData.items.map(it => ({
                ...it,
                totalAmount: (Number(it.quantity) * Number(it.purchasePrice)) + (Number(it.taxAmount) || 0) - (Number(it.discountAmount) || 0)
            }));

            const payload = {
                ...formData,
                items: itemsWithTotal,
                shopId: user.shop_id,
            };
            let savedPurchase;
            if (isEditing) {
                savedPurchase = await PurchaseService.updatePurchase(id, payload);
            } else {
                savedPurchase = await PurchaseService.createPurchase(payload);
            }
            if (shouldPrint) {
                handlePrintInvoice();
            }
            navigate("/purchases");
        } catch (error) {
            console.error("Save error:", error);
            alert(error.message || "Failed to save purchase");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenSupplierModal = () => {
        setSupplierFormData({
            name: "",
            contactPerson: "",
            phone: "",
            email: "",
            address: "",
            taxId: "",
            status: "ACTIVE"
        });
        setIsSupplierModalOpen(true);
    };

    const handleSaveSupplier = async (e) => {
        e.preventDefault();
        if (!user?.shop_id) return;
        setSavingSupplier(true);
        try {
            const created = await SupplierService.addSupplier({
                ...supplierFormData,
                shopId: user.shop_id
            });

            // Refresh supplier list
            const suppliersData = await SupplierService.getSuppliers(user.shop_id);
            setSuppliers(suppliersData);

            // If API returns created supplier, preselect it
            if (created && (created._id || created.id)) {
                const createdId = created._id || created.id;
                setFormData(prev => ({
                    ...prev,
                    supplierId: createdId
                }));
            }

            setIsSupplierModalOpen(false);
            setSupplierSearch("");
        } catch (error) {
            console.error("Failed to save supplier:", error);
            alert(error.message || "Failed to save supplier");
        } finally {
            setSavingSupplier(false);
        }
    };

    const handleOpenBranchModal = () => {
        if (!user?.shop_id) {
            alert("Organization details are missing.");
            return;
        }
        setBranchForm(emptyBranch(user.shop_id));
        setIsBranchModalOpen(true);
    };

    const handleSaveBranch = async (e) => {
        e.preventDefault();
        if (!user?.shop_id) return;
        setSavingBranch(true);
        try {
            const created = await saveBranch(branchForm);
            const branchesData = await branchService.getBranchesByShopId(user.shop_id);
            setBranches(branchesData);

            const createdId = created._id || created.id || created.branchId || created.data?._id || created.data?.branchId || created.data?.id;
            if (createdId) {
                setFormData(prev => ({
                    ...prev,
                    branchId: createdId
                }));
            }

            setIsBranchModalOpen(false);
            setBranchSearch("");
        } catch (error) {
            console.error("Failed to save branch:", error);
            alert(error.message || "Failed to save branch");
        } finally {
            setSavingBranch(false);
        }
    };

    const handlePincodeBlur = async () => {
        const pincode = branchForm.address?.pincode;
        if (pincode && pincode.length === 6) {
            setIsLocationLoading(true);
            try {
                const countryCode = branchForm.address?.country?.toLowerCase() === 'india' ? 'in' : 'ae';
                const locationData = await fetchLocationByPincode(countryCode, pincode);

                if (locationData && locationData.places && locationData.places.length > 0) {
                    const place = locationData.places[0];
                    setBranchForm(prev => ({
                        ...prev,
                        address: {
                            ...prev.address,
                            city: place['place name'],
                            state: place['state'],
                        }
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch location from pincode", error);
            } finally {
                setIsLocationLoading(false);
            }
        }
    };

    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLocationLoading(true);
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const addressData = await fetchCurrentLocation(latitude, longitude);
                    if (addressData && addressData.address) {
                        const addr = addressData.address;
                        setBranchForm(prev => ({
                            ...prev,
                            address: {
                                ...prev.address,
                                line1: [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(", "),
                                city: addr.city || addr.town || addr.village || addr.county || "",
                                state: addr.state || "",
                                country: addr.country || "",
                                pincode: addr.postcode || prev.address.pincode
                            }
                        }));
                    }
                } catch (error) {
                    console.error("Failed to fetch current location address", error);
                    alert("Failed to fetch address from location.");
                } finally {
                    setIsLocationLoading(false);
                }
            }, (error) => {
                console.error("Geolocation error:", error);
                setIsLocationLoading(false);
                alert("Location access denied or unavailable.");
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    };

    const filteredSearchItems = stockItems.filter(it =>
        it.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        it.itemCode.toLowerCase().includes(itemSearch.toLowerCase())
    ).slice(0, 5);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (s.contactPerson || "").toLowerCase().includes(supplierSearch.toLowerCase()) ||
        (s.phone || "").includes(supplierSearch)
    ).slice(0, 5);

    const filteredBranches = branches.filter(b =>
        b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
        (b.address?.city || "").toLowerCase().includes(branchSearch.toLowerCase()) ||
        (b.address?.state || "").toLowerCase().includes(branchSearch.toLowerCase())
    ).slice(0, 5);

    const handleConfirmBarcodePrint = () => {
        const {
            barcode,
            item,
            copies,
            includeName,
            includeCode,
            includePrice,
            includeLogo,
            includeBatch,
            includeExpiry,
            customText,
            batchOverride,
            expiryOverride,
            layout,
            elementsOrder
        } = barcodePrintDialog;
        if (!barcode || !barcode.fullUrl) {
            alert("No barcode image available to print.");
            return;
        }
        const count = Math.max(1, Number(copies) || 1);

        const effectiveBatch = includeBatch ? (batchOverride || item?.batchNo || "") : "";
        const effectiveExpiry = includeExpiry ? (expiryOverride || item?.expiryDate || "") : "";
        if (includeBatch && !effectiveBatch) {
            alert("Please enter a batch number to print.");
            return;
        }
        if (includeExpiry && !effectiveExpiry) {
            alert("Please enter an expiry date to print.");
            return;
        }

        const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
        const logoUrl = includeLogo && shopInfo?.logoUrl
            ? (shopInfo.logoUrl.startsWith("http") ? shopInfo.logoUrl : `${root}${shopInfo.logoUrl}`)
            : null;

        const renderLabelInner = () => {
            const parts = [];
            elementsOrder.forEach((key) => {
                if (key === "logo" && logoUrl) {
                    parts.push(`<div class="slot logo"><img src="${logoUrl}" alt="Logo" /></div>`);
                }
                if (key === "barcode") {
                    parts.push(`<div class="slot barcode"><img src="${barcode.fullUrl}" alt="Barcode" /></div>`);
                }
                if (key === "name" && includeName && item?.name) {
                    parts.push(`<div class="slot line name">${item.name}</div>`);
                }
                if (key === "code" && includeCode && item?.itemCode) {
                    parts.push(`<div class="slot line code">${item.itemCode}</div>`);
                }
                if (key === "price" && includePrice && item?.purchasePrice != null) {
                    parts.push(`<div class="slot line price">₹${Number(item.purchasePrice).toFixed(2)}</div>`);
                }
                if (key === "batch" && includeBatch && effectiveBatch) {
                    parts.push(`<div class="slot line batch">Batch: ${effectiveBatch}</div>`);
                }
                if (key === "expiry" && includeExpiry && effectiveExpiry) {
                    parts.push(`<div class="slot line expiry">Expiry: ${effectiveExpiry}</div>`);
                }
                if (key === "custom" && customText) {
                    parts.push(`<div class="slot line custom">${customText}</div>`);
                }
            });
            return parts.join("");
        };

        const labelHtml = renderLabelInner();

        const labels = [];
        for (let i = 0; i < count; i++) {
            labels.push(`<div class="label">${labelHtml}</div>`);
        }

        const layoutClass = layout === "COLUMNS" ? "columns" : "rows";

        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Barcode Labels</title>
    <style>
      @page { margin: 5mm; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 10px;
        margin: 0;
        padding: 4mm;
      }
      .labels {
        display: flex;
        flex-wrap: wrap;
        gap: 4mm;
      }
      .labels.rows { flex-direction: row; }
      .labels.columns { flex-direction: column; }
      .label {
        width: 38mm;
        min-height: 20mm;
        border: 1px solid #ccc;
        padding: 2mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .label img {
        max-width: 100%;
        height: auto;
        margin-bottom: 1mm;
      }
      .slot {
        margin: 0;
        line-height: 1.2;
      }
      .line {
        margin: 0;
        line-height: 1.2;
      }
      .line.name { font-weight: 600; }
      .line.code { font-size: 9px; }
      .line.price { font-weight: 700; font-size: 9px; }
    </style>
  </head>
  <body>
    <div class="labels ${layoutClass}">
      ${labels.join("")}
    </div>
    <script>
      window.onload = function() {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>`;

        const win = window.open("", "_blank");
        if (!win) {
            alert("Popup blocked. Please allow popups for this site to print labels.");
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }));
    };

    if (loading && isEditing) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${theme.pageBg}`}>
                <div className={`animate-spin ${theme.primaryIconText}`}><ShoppingCart size={40} /></div>
            </div>
        );
    }

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            <div className="max-w-[1400px] mx-auto">
                {/* Breadcrumb Navigation / Header */}
                <div className={`flex items-center gap-2 mb-6 ${theme.textMuted} text-sm font-bold`}>
                    <Link to="/purchases" className={`hover:${theme.textPrimary} flex items-center gap-1 transition-colors uppercase tracking-widest text-[10px]`}>
                        <ArrowLeft size={14} />
                        Back to Invoices
                    </Link>
                    <ChevronRight size={14} />
                    <span className={`${theme.textPrimary} uppercase tracking-widest text-[10px]`}>{isEditing ? "Edit Purchase" : "New Purchase Entry"}</span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className={`text-2xl md:text-3xl font-black uppercase ${theme.textHeading}`}>
                            {isEditing ? "Edit Purchase" : "New Purchase Entry"}
                        </h1>
                        <p className={`font-bold text-xs uppercase tracking-widest mt-1 ${theme.textMuted}`}>Invoice Details & Stock Update</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                    {/* section: General Info */}
                    <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 md:p-12 border ${theme.borderLight}`}>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <User size={12} /> Supplier *
                                </label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            required
                                            value={supplierSearch}
                                            onChange={(e) => {
                                                setSupplierSearch(e.target.value);
                                                setShowSupplierResults(true);
                                            }}
                                            onFocus={() => setShowSupplierResults(true)}
                                            placeholder={
                                                formData.supplierId
                                                    ? (suppliers.find(s => s._id === formData.supplierId)?.name || "Search suppliers...")
                                                    : "Search suppliers..."
                                            }
                                            className={`w-full pl-12 pr-4 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary}`}
                                        />
                                    </div>
                                    {showSupplierResults && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50 animate-in slide-in-from-top-2 duration-200">
                                            {filteredSuppliers.map(supplier => (
                                                <button
                                                    key={supplier._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            supplierId: supplier._id
                                                        }));
                                                        setSupplierSearch(supplier.name);
                                                        setShowSupplierResults(false);
                                                    }}
                                                    className="w-full p-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-black text-gray-800">{supplier.name}</div>
                                                        {supplier.contactPerson && (
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase">
                                                                {supplier.contactPerson}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Check size={16} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                                                </button>
                                            ))}
                                            {filteredSuppliers.length === 0 && (
                                                <div className="p-4 text-center text-gray-400 font-bold text-xs uppercase">
                                                    No suppliers found
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowSupplierResults(false);
                                                    handleOpenSupplierModal();
                                                }}
                                                className="w-full p-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors border-t border-gray-100 mt-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <Plus size={18} />
                                                    </div>
                                                    <div className="font-black text-indigo-600">Add New Supplier</div>
                                                </div>
                                                <ChevronRight size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <Building size={12} /> Branch *
                                </label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            required
                                            value={branchSearch}
                                            onChange={(e) => {
                                                setBranchSearch(e.target.value);
                                                setShowBranchResults(true);
                                            }}
                                            onFocus={() => setShowBranchResults(true)}
                                            placeholder={
                                                formData.branchId
                                                    ? (branches.find(b => b._id === formData.branchId)?.name || "Search branches...")
                                                    : "Search branches..."
                                            }
                                            className={`w-full pl-12 pr-4 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary}`}
                                        />
                                    </div>
                                    {showBranchResults && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden divide-y divide-gray-50 animate-in slide-in-from-top-2 duration-200">
                                            {filteredBranches.map(branch => (
                                                <button
                                                    key={branch._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            branchId: branch._id
                                                        }));
                                                        setBranchSearch(branch.name);
                                                        setShowBranchResults(false);
                                                    }}
                                                    className="w-full p-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-black text-gray-800">{branch.name}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase">
                                                            {branch.address?.city || ""}{branch.address?.state ? `, ${branch.address.state}` : ""}
                                                        </div>
                                                    </div>
                                                    <Check size={16} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                                                </button>
                                            ))}
                                            {filteredBranches.length === 0 && (
                                                <div className="p-4 text-center text-gray-400 font-bold text-xs uppercase">
                                                    No branches found
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowBranchResults(false);
                                                    handleOpenBranchModal();
                                                }}
                                                className="w-full p-4 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors border-t border-gray-100 mt-2"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <Plus size={18} />
                                                    </div>
                                                    <div className="font-black text-indigo-600">Add New Branch</div>
                                                </div>
                                                <ChevronRight size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <FileText size={12} /> Invoice No *
                                </label>
                                <input
                                    required
                                    className={`w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-black ${theme.inputBg} ${theme.textPrimary}`}
                                    value={formData.supplierInvoiceNumber}
                                    onChange={e => setFormData({ ...formData, supplierInvoiceNumber: e.target.value })}
                                    placeholder="INV/2024/001"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <Calendar size={12} /> Date *
                                </label>
                                <DatePicker
                                    value={formData.invoiceDate}
                                    onChange={val => setFormData({ ...formData, invoiceDate: val })}
                                    className={`w-full px-4 py-3 border-2 border-transparent focus-within:border-indigo-500 rounded-2xl outline-none transition-all font-black ${theme.inputBg} ${theme.textPrimary}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* section: Item Entry */}
                    <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 md:p-12 border ${theme.borderLight} flex flex-col gap-8`}>
                        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-8 ${theme.borderLight}`}>
                            <h2 className={`text-xl font-black flex items-center gap-3 uppercase tracking-tight ${theme.textHeading}`}>
                                <Package className="text-indigo-600" /> Items List
                            </h2>

                            {/* Search for Adding Items */}
                            <div className="relative w-full md:w-96">
                                <CommonSelect
                                    options={stockItems}
                                    value={null}
                                    onChange={(id, item) => handleAddItem(item)}
                                    placeholder="Add items to invoice..."
                                    searchPlaceholder="Search by name or code..."
                                    labelKey="name"
                                    valueKey="_id"
                                    className="w-full bg-indigo-50/30 border-indigo-100"
                                    renderOption={(item) => (
                                        <div>
                                            <div className="font-black text-gray-800">{item.name}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">{item.itemCode}</div>
                                        </div>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="overflow-x-auto min-h-[200px]">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className={`text-[10px] font-black uppercase tracking-widest border-b ${theme.textMuted} ${theme.borderLight}`}>
                                        <th className="py-4 px-2">#</th>
                                        <th className="py-4 px-2">Item Description</th>
                                        <th className="py-4 px-2 w-24">Qty</th>
                                        <th className="py-4 px-2 w-28">Purchase Price</th>
                                        <th className="py-4 px-2 w-28">Selling Price</th>
                                        <th className="py-4 px-2 w-28">MRP</th>
                                        <th className="py-4 px-2 w-28">Margin (%)</th>
                                        <th className="py-4 px-2 w-28">Batch / Exp</th>
                                        <th className="py-4 px-2 w-48">Barcode / Print</th>
                                        <th className="py-4 px-2 text-right">Total</th>
                                        <th className="py-4 px-2 text-right w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme.borderLight.replace('border-', 'divide-')} ${theme.textPrimary}`}>
                                    {formData.items.map((it, idx) => (
                                        <tr key={it.itemId} className="group hover:opacity-80 transition-opacity">
                                            <td className={`py-5 px-2 font-bold ${theme.textMuted}`}>{idx + 1}</td>
                                            <td className="py-5 px-2">
                                                <div className={`font-black ${theme.textPrimary}`}>{it.name}</div>
                                                <div className={`text-[10px] font-bold ${theme.textSecondary}`}>{it.itemCode}</div>
                                            </td>
                                            <td className="py-5 px-2 text-sm">
                                                <input
                                                    type="number"
                                                    value={it.quantity}
                                                    onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value || 0))}
                                                    className={`w-full p-2 rounded-lg font-black text-indigo-600 border border-transparent focus:border-indigo-400 outline-none text-center ${theme.inputBg}`}
                                                />
                                            </td>
                                            <td className="py-5 px-2">
                                                <div className="relative">
                                                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${theme.textMuted}`}>₹</span>
                                                    <input
                                                        type="number"
                                                        value={it.purchasePrice}
                                                        onChange={e => handleItemChange(idx, 'purchasePrice', parseFloat(e.target.value || 0))}
                                                        className={`w-full pl-6 p-2 rounded-lg font-black border border-transparent focus:border-indigo-400 outline-none ${theme.inputBg} ${theme.textPrimary}`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-5 px-2">
                                                <div className="relative">
                                                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${theme.textMuted}`}>₹</span>
                                                    <input
                                                        type="number"
                                                        value={it.sellingPrice || ""}
                                                        onChange={e => handleItemChange(idx, 'sellingPrice', parseFloat(e.target.value || 0))}
                                                        className={`w-full pl-6 p-2 rounded-lg font-black border border-transparent focus:border-green-400 outline-none ${theme.inputBg} ${theme.textPrimary}`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-5 px-2">
                                                <div className="relative">
                                                    <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-xs ${theme.textMuted}`}>₹</span>
                                                    <input
                                                        type="number"
                                                        value={it.mrp || ""}
                                                        onChange={e => handleItemChange(idx, 'mrp', parseFloat(e.target.value || 0))}
                                                        className={`w-full pl-6 p-2 rounded-lg font-black border border-transparent focus:border-blue-400 outline-none ${theme.inputBg} ${theme.textPrimary}`}
                                                    />
                                                </div>
                                            </td>
                                            <td className="py-5 px-2">
                                                <div className={`flex flex-col text-xs font-black p-2 rounded bg-opacity-10 ${((it.sellingPrice || 0) - (it.purchasePrice || 0)) >= 0 ? 'text-green-500 bg-green-500' : 'text-red-500 bg-red-500'}`}>
                                                    <span>₹{((it.sellingPrice || 0) - (it.purchasePrice || 0)).toFixed(2)}</span>
                                                    <span className="opacity-70">
                                                        {it.sellingPrice > 0
                                                            ? `${(((it.sellingPrice - it.purchasePrice) / it.sellingPrice) * 100).toFixed(1)}%`
                                                            : '0%'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 space-y-1">
                                                {(!it.batchTracking && !it.expiryTracking) ? (
                                                    <div className="flex justify-center items-center h-full text-gray-400 font-bold opacity-50">—</div>
                                                ) : (
                                                    <div className="flex flex-col gap-1 w-full relative group/tracking cursor-pointer">
                                                        {it.batchTracking && (
                                                            <div className="relative">
                                                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-indigo-400`}>BAT</span>
                                                                <input
                                                                    placeholder="BATCH NO"
                                                                    value={it.batchNo}
                                                                    onChange={e => handleItemChange(idx, 'batchNo', e.target.value)}
                                                                    className={`w-full pl-8 p-1.5 text-[10px] rounded border-transparent focus:border-indigo-400 uppercase font-black placeholder:font-medium outline-none border ${theme.inputBg} ${theme.textPrimary}`}
                                                                />
                                                            </div>
                                                        )}
                                                        {it.expiryTracking && (
                                                            <div className="relative">
                                                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-pink-400 z-10 pointer-events-none`}>EXP</span>
                                                                <DatePicker
                                                                    value={it.expiryDate}
                                                                    onChange={val => handleItemChange(idx, 'expiryDate', val)}
                                                                    className={`w-full pl-8 py-1.5 text-[10px] rounded border-transparent focus-within:border-indigo-400 uppercase font-black outline-none border ${theme.inputBg} ${theme.textPrimary}`}
                                                                    placeholder="EXPIRY"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-5 px-2">
                                                <div className="space-y-2">
                                                    <input
                                                        placeholder="Scan / enter barcode"
                                                        value={it.existingBarcode || ""}
                                                        onChange={e => handleItemChange(idx, 'existingBarcode', e.target.value)}
                                                        className={`w-full p-1.5 text-[11px] rounded border-transparent focus:border-indigo-200 outline-none border ${theme.inputBg} ${theme.textPrimary}`}
                                                    />
                                                    <div className="flex items-center justify-between gap-2">
                                                        <label className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!it.hasIndividualBarcode}
                                                                onChange={e => handleItemChange(idx, 'hasIndividualBarcode', e.target.checked)}
                                                                className="rounded accent-indigo-600"
                                                            />
                                                            Per-unit barcode
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => handlePrintBarcode(it)}
                                                            className="px-2 py-1 text-[10px] font-black rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                                                        >
                                                            Print
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 text-right">
                                                <div className={`font-black ${theme.textPrimary}`}>
                                                    {formatCurrency ? formatCurrency(it.quantity * it.purchasePrice) : `₹${(it.quantity * it.purchasePrice).toFixed(2)}`}
                                                </div>
                                            </td>
                                            <td className="py-5 px-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(idx)}
                                                    className="p-2 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {formData.items.length === 0 && (
                                        <tr>
                                            <td colSpan="11" className={`py-12 text-center font-bold uppercase tracking-widest text-xs italic ${theme.textMuted}`}>
                                                Your invoice is empty. Add items from the search above.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* section: Footer Totals & Save */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Notes Area */}
                        <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 border ${theme.borderLight}`}>
                            <label className={`text-[10px] font-black uppercase tracking-widest px-1 block mb-3 ${theme.textMuted}`}>Optional Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any additional information about this purchase..."
                                className={`w-full min-h-[140px] p-6 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold resize-none ${theme.inputBg} ${theme.textPrimary}`}
                            />
                        </div>

                        {/* Summary Column */}
                        <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 border ${theme.borderLight} space-y-4`}>
                            <div className="flex justify-between items-center px-2">
                                <span className={`font-bold uppercase text-[10px] tracking-widest ${theme.textMuted}`}>Subtotal</span>
                                <span className={`font-black ${theme.textHeading}`}>{formatCurrency ? formatCurrency(formData.subtotal) : `₹${formData.subtotal.toFixed(2)}`}</span>
                            </div>
                            <div className="flex justify-between items-center px-2">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest font-black">Tax Total (+)</span>
                                <input
                                    type="number"
                                    value={formData.taxTotal}
                                    onChange={e => setFormData({ ...formData, taxTotal: parseFloat(e.target.value || 0) })}
                                    className="text-right font-black text-gray-800 bg-gray-50 min-w-[80px] p-2 rounded-lg outline-none"
                                />
                            </div>
                            <div className="flex justify-between items-center px-2 border-b border-gray-100 pb-4">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Discount (-)</span>
                                <input
                                    type="number"
                                    value={formData.discountTotal}
                                    onChange={e => setFormData({ ...formData, discountTotal: parseFloat(e.target.value || 0) })}
                                    className="text-right font-black text-indigo-600 bg-indigo-50 min-w-[80px] p-2 rounded-lg outline-none"
                                />
                            </div>
                            <div className="flex justify-between items-center bg-gray-900 rounded-3xl p-6 text-white shadow-2xl">
                                <div className="space-y-1">
                                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Grand Total</div>
                                    <div className="text-3xl font-black">{formatCurrency ? formatCurrency(formData.grandTotal) : `₹${formData.grandTotal.toFixed(2)}`}</div>
                                </div>
                                <Calculator size={32} className="opacity-20" />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, true)}
                                    disabled={loading}
                                    className={`flex-1 py-4 rounded-3xl font-black transition-all flex items-center justify-center gap-2 shadow-xl border-2 ${loading
                                        ? "border-gray-200 text-gray-400 cursor-not-allowed"
                                        : theme.mode === 'dark' ? "border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 active:scale-95" : "border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:scale-95"
                                        }`}
                                >
                                    <Printer size={20} />
                                    SAVE & PRINT
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e, false)}
                                    disabled={loading}
                                    className={`flex-[2] py-4 rounded-3xl font-black transition-all flex items-center justify-center gap-2 shadow-xl ${loading
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 active:scale-95"
                                        }`}
                                >
                                    {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    <Save size={24} />
                                    {isEditing ? "UPDATE INVOICE" : "SAVE PURCHASE"}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Barcode Print Dialog */}
            <Modal
                isOpen={barcodePrintDialog.isOpen}
                onClose={() => setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }))}
                title="Print Barcodes"
                className="max-w-md"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Item</label>
                            <div className={`text-sm font-black ${theme.textPrimary}`}>
                                {barcodePrintDialog.item?.name || "—"}
                            </div>
                            {barcodePrintDialog.item?.itemCode && (
                                <div className={`text-[10px] font-bold ${theme.textSecondary}`}>{barcodePrintDialog.item.itemCode}</div>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Copies</label>
                            <input
                                type="number"
                                min={1}
                                value={barcodePrintDialog.copies}
                                onChange={e => setBarcodePrintDialog(prev => ({ ...prev, copies: e.target.value }))}
                                className={`w-full p-2 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-sm`}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Include on label</label>
                        <div className="flex flex-wrap gap-3 text-[11px] font-bold">
                            <label className="inline-flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeLogo}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeLogo: e.target.checked }))}
                                    className="rounded accent-indigo-600"
                                />
                                Shop Logo
                            </label>
                            <label className="inline-flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeName}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeName: e.target.checked }))}
                                    className="rounded accent-indigo-600"
                                />
                                Name
                            </label>
                            <label className="inline-flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeCode}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeCode: e.target.checked }))}
                                    className="rounded accent-indigo-600"
                                />
                                Item Code
                            </label>
                            <label className="inline-flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includePrice}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includePrice: e.target.checked }))}
                                    className="rounded accent-indigo-600"
                                />
                                Purchase Price
                            </label>
                            <label className="inline-flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeBatch}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeBatch: e.target.checked }))}
                                    className="rounded accent-indigo-600"
                                />
                                Batch No
                            </label>
                            <label className="inline-flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeExpiry}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeExpiry: e.target.checked }))}
                                    className="rounded accent-indigo-600"
                                />
                                Expiry Date
                            </label>
                        </div>
                    </div>
                    {(barcodePrintDialog.includeBatch || barcodePrintDialog.includeExpiry) && (
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                            {barcodePrintDialog.includeBatch && (
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Batch Number</label>
                                    <input
                                        value={barcodePrintDialog.batchOverride ?? ""}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, batchOverride: e.target.value }))}
                                        placeholder={barcodePrintDialog.item?.batchNo || "Enter batch"}
                                        className={`w-full p-2 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary}`}
                                    />
                                </div>
                            )}
                            {barcodePrintDialog.includeExpiry && (
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Expiry</label>
                                    <DatePicker
                                        value={barcodePrintDialog.expiryOverride ?? ""}
                                        onChange={val => setBarcodePrintDialog(prev => ({ ...prev, expiryOverride: val }))}
                                        className={`w-full p-2 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-xs`}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Custom Text</label>
                        <input
                            value={barcodePrintDialog.customText}
                            onChange={e => setBarcodePrintDialog(prev => ({ ...prev, customText: e.target.value }))}
                            placeholder="Optional line (e.g. OFFER, location)"
                            className={`w-full p-2 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} text-[11px]`}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Label flow</label>
                        <div className="flex gap-3 text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => setBarcodePrintDialog(prev => ({ ...prev, layout: "ROWS" }))}
                                className={`flex-1 py-2 rounded-xl border text-center ${barcodePrintDialog.layout === "ROWS"
                                    ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                    : `${theme.borderLight} ${theme.textSecondary} bg-gray-50`
                                    }`}
                            >
                                Row-wise
                            </button>
                            <button
                                type="button"
                                onClick={() => setBarcodePrintDialog(prev => ({ ...prev, layout: "COLUMNS" }))}
                                className={`flex-1 py-2 rounded-xl border text-center ${barcodePrintDialog.layout === "COLUMNS"
                                    ? "border-indigo-500 text-indigo-600 bg-indigo-50"
                                    : `${theme.borderLight} ${theme.textSecondary} bg-gray-50`
                                    }`}
                            >
                                Column-wise
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Preview (drag to re-order)</label>
                        <div className="border rounded-2xl p-3 bg-gray-50">
                            <div className="border border-dashed border-gray-300 rounded-xl p-2 bg-white flex flex-col items-center gap-1 min-h-[80px]">
                                {barcodePrintDialog.elementsOrder.map((key, idx) => {
                                    const labelMap = {
                                        logo: "Shop Logo",
                                        barcode: "Barcode",
                                        name: "Item Name",
                                        code: "Item Code",
                                        price: "Price",
                                        batch: "Batch",
                                        expiry: "Expiry",
                                        custom: "Custom Text"
                                    };
                                    const enabled =
                                        key === "logo" ? barcodePrintDialog.includeLogo :
                                            key === "barcode" ? true :
                                                key === "name" ? barcodePrintDialog.includeName :
                                                    key === "code" ? barcodePrintDialog.includeCode :
                                                        key === "price" ? barcodePrintDialog.includePrice :
                                                            key === "batch" ? barcodePrintDialog.includeBatch :
                                                                key === "expiry" ? barcodePrintDialog.includeExpiry :
                                                                    key === "custom" ? !!barcodePrintDialog.customText : true;
                                    if (!enabled) return null;
                                    return (
                                        <div
                                            key={key}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData("text/plain", idx.toString());
                                            }}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                                                if (isNaN(from)) return;
                                                setBarcodePrintDialog(prev => {
                                                    const order = [...prev.elementsOrder];
                                                    const [moved] = order.splice(from, 1);
                                                    order.splice(idx, 0, moved);
                                                    return { ...prev, elementsOrder: order };
                                                });
                                            }}
                                            className="px-3 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-700 bg-gray-50 cursor-move flex items-center gap-2 w-full justify-center"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                            {labelMap[key] || key}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }))}
                            className="px-4 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-100 text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmBarcodePrint}
                            className="px-6 py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
                        >
                            Print Labels
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
                    <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl relative flex flex-col ${theme.surfaceBg}`}>
                        <button
                            onClick={() => setIsProductModalOpen(false)}
                            className="absolute top-6 right-6 z-10 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-600" />
                        </button>
                        <div className="flex-1 overflow-y-auto w-full relative">
                            <ProductPage asDialog={true} onClose={handleProductDialogClose} />
                        </div>
                    </div>
                </div>
            )}
            {/* Branch Modal Content */}
            <Modal
                isOpen={isBranchModalOpen}
                onClose={() => setIsBranchModalOpen(false)}
                title="Add New Branch"
                className="max-w-lg"
            >
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>Branch Name</label>
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isLocationLoading}
                            className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                        >
                            {isLocationLoading ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                            Use Current Location
                        </button>
                    </div>
                    <div>
                        <input
                            className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                            value={branchForm.name}
                            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                            placeholder="e.g. Food Plaza - Dubai"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>Pincode</label>
                            <div className="relative">
                                <input
                                    className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                    value={branchForm.address?.pincode ?? ""}
                                    onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, pincode: e.target.value } })}
                                    onBlur={handlePincodeBlur}
                                    placeholder="Enter to autofill"
                                />
                                {isLocationLoading && <div className="absolute right-3 top-3"><Loader2 size={16} className="animate-spin text-indigo-500" /></div>}
                            </div>
                        </div>
                        <div>
                            <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>Address Line 1</label>
                            <input
                                className={`w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                value={branchForm.address?.line1 ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, line1: e.target.value } })}
                                placeholder="Street / Area"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>City</label>
                            <input
                                className={`w-full p-3 border rounded-xl ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                value={branchForm.address?.city ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, city: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>State</label>
                            <input
                                className={`w-full p-3 border rounded-xl ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                value={branchForm.address?.state ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, state: e.target.value } })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>Country</label>
                            <input
                                className={`w-full p-3 border rounded-xl ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                value={branchForm.address?.country ?? ""}
                                onChange={(e) => setBranchForm({ ...branchForm, address: { ...branchForm.address, country: e.target.value } })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>Currency</label>
                        <select
                            className={`w-full p-3 border rounded-xl ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                            value={branchForm.currency}
                            onChange={(e) => setBranchForm({ ...branchForm, currency: e.target.value })}
                        >
                            {CURRENCIES.map((c) => (
                                <option key={c.code} value={c.code}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>Tax System</label>
                        <select
                            className={`w-full p-3 border rounded-xl ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                            value={branchForm.taxConfig?.taxSystem}
                            onChange={(e) => {
                                const newSystem = e.target.value;
                                setBranchForm({
                                    ...branchForm,
                                    taxConfig: {
                                        ...branchForm.taxConfig,
                                        taxSystem: newSystem,
                                    },
                                });
                            }}
                        >
                            {Object.values(TAX_SYSTEMS).map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    {(() => {
                        const taxSystem = branchForm.taxConfig?.taxSystem || TAX_SYSTEMS.GST;
                        const isRegistered = branchForm.taxConfig?.isGstRegistered ?? false;
                        const registeredLabel =
                            taxSystem === TAX_SYSTEMS.GST ? "GST Registered" :
                                taxSystem === TAX_SYSTEMS.VAT ? "VAT Registered" : "Tax Registered";
                        const regNumberLabel =
                            taxSystem === TAX_SYSTEMS.GST ? "GSTIN" :
                                taxSystem === TAX_SYSTEMS.VAT ? "VAT / TRN Number" : "Tax Registration No.";
                        const regNumberPlaceholder =
                            taxSystem === TAX_SYSTEMS.GST ? "e.g. 29ABCDE1234F1Z9" :
                                taxSystem === TAX_SYSTEMS.VAT ? "VAT or TRN" : "Optional";
                        return (
                            <>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="taxRegistered"
                                        checked={isRegistered}
                                        onChange={(e) => setBranchForm({
                                            ...branchForm,
                                            taxConfig: { ...branchForm.taxConfig, isGstRegistered: e.target.checked },
                                        })}
                                        className="rounded accent-indigo-600"
                                    />
                                    <label htmlFor="taxRegistered" className={`text-sm font-medium ${theme.textPrimary}`}>{registeredLabel}</label>
                                </div>
                                {isRegistered && (
                                    <div>
                                        <label className={`text-xs font-black uppercase block mb-1 ${theme.textMuted}`}>{regNumberLabel}</label>
                                        <input
                                            className={`w-full p-3 border rounded-xl ${theme.inputBg} ${theme.textPrimary} ${theme.borderLight}`}
                                            value={branchForm.taxConfig?.gstin ?? ""}
                                            onChange={(e) => setBranchForm({
                                                ...branchForm,
                                                taxConfig: { ...branchForm.taxConfig, gstin: e.target.value },
                                            })}
                                            placeholder={regNumberPlaceholder}
                                        />
                                    </div>
                                )}
                            </>
                        );
                    })()}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="mainBranch"
                            checked={branchForm.isMainBranch ?? false}
                            onChange={(e) => setBranchForm({ ...branchForm, isMainBranch: e.target.checked })}
                            className="rounded accent-indigo-600"
                        />
                        <label htmlFor="mainBranch" className={`text-sm font-medium ${theme.textPrimary}`}>Main Branch</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsBranchModalOpen(false)}
                            className="px-4 py-2 rounded-xl font-bold text-gray-600 hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveBranch}
                            disabled={!branchForm.name?.trim() || savingBranch}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {savingBranch ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save
                        </button>
                    </div>
                </div>
            </Modal>
            {/* Supplier Modal */}
            {isSupplierModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
                    <div className={`w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl relative flex flex-col ${theme.surfaceBg}`}>
                        <div className={`p-6 md:p-8 border-b sticky top-0 z-10 flex justify-between items-center ${theme.surfaceBg} ${theme.borderLight}`}>
                            <h3 className={`text-2xl font-black flex items-center gap-3 ${theme.textHeading}`}>
                                <Plus className="text-indigo-600" />
                                Add New Supplier
                            </h3>
                            <button
                                onClick={() => setIsSupplierModalOpen(false)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveSupplier} className="p-6 md:p-8 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Supplier Name *</label>
                                    <input
                                        required
                                        className={`w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={supplierFormData.name}
                                        onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                                        placeholder="Company Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Tax ID / GSTIN</label>
                                    <input
                                        className={`w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={supplierFormData.taxId}
                                        onChange={e => setSupplierFormData({ ...supplierFormData, taxId: e.target.value })}
                                        placeholder="Optional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Contact Person *</label>
                                    <input
                                        required
                                        className={`w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={supplierFormData.contactPerson}
                                        onChange={e => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Status</label>
                                    <select
                                        className={`w-full p-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={supplierFormData.status}
                                        onChange={e => setSupplierFormData({ ...supplierFormData, status: e.target.value })}
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Phone Number *</label>
                                    <div className="relative">
                                        <Phone className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input
                                            required
                                            className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                            value={supplierFormData.phone}
                                            onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                                            placeholder="+91..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Email Address</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                        <input
                                            type="email"
                                            className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                            value={supplierFormData.email}
                                            onChange={e => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                                            placeholder="supplier@example.com"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase ${theme.textMuted}`}>Address</label>
                                <div className="relative">
                                    <MapPin className={`absolute left-4 top-4 ${theme.textSecondary}`} size={20} />
                                    <textarea
                                        className={`w-full pl-12 pr-4 py-4 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold min-h-[100px] ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                        value={supplierFormData.address}
                                        onChange={e => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                                        placeholder="Full business address..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsSupplierModalOpen(false)}
                                    className={`flex-1 py-4 rounded-2xl font-bold transition-all ${theme.textSecondary} ${theme.inputBg} hover:opacity-80`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingSupplier}
                                    className={`flex-1 py-4 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-2 ${savingSupplier ? "opacity-70 cursor-not-allowed" : ""}`}
                                >
                                    {savingSupplier && (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    )}
                                    <Save size={20} />
                                    Save Supplier
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchasePage;
