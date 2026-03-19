import React, { useState, useEffect, useMemo } from "react";
import { X, Save, Plus, Trash2, Search, Calculator, Calendar, User, Building, FileText, ShoppingCart, Package, Info, Tag, ChevronDown, Check, ArrowLeft, ChevronRight, Phone, Mail, MapPin, Loader2, Printer, Camera } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PurchaseService } from "../../services/PurchaseService";
import { SupplierService } from "../Suppliers/SupplierService";
import api, { itemService, branchService, shopService, taxService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useTheme } from "../../context/ThemeContext";
import ProductPage from "../Inventory/ProductPage";
import Modal from "../../components/ui/Modal";
import DatePicker from "../../components/ui/DatePicker";
import CommonSelect from "../../components/ui/CommonSelect";
import InvoiceScannerModal from "../../components/modals/InvoiceScannerModal";
import { toast } from "react-hot-toast";
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
    const { activeBranchId, formatCurrency, businessTypeData } = useApp();
    const { theme } = useTheme();
    const isEditing = !!id;

    // --- State ---
    const [loading, setLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [shopInfo, setShopInfo] = useState(null);
    const [shopTaxes, setShopTaxes] = useState([]);

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
    const [isScannerOpen, setIsScannerOpen] = useState(false);
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
    const [productPrefillData, setProductPrefillData] = useState(null);

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
        labelWidth: 38,
        labelHeight: 20,
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

    useEffect(() => {
        if (user?.shop_id) {
            fetchInitialData();
        }
        if (isEditing) {
            loadPurchase();
        }
    }, [user?.shop_id, id, activeBranchId, formData.branchId]);

    const fetchInitialData = async (branchIdArg) => {
        try {
            const branchId = branchIdArg || formData.branchId || activeBranchId;
            const [suppliersData, branchesData, shopData, itemsRes, taxesRes] = await Promise.all([
                SupplierService.getSuppliers(user.shop_id),
                branchService.getBranchesByShopId(user.shop_id),
                shopService.getShopById(user.shop_id),
                itemService.getItems({
                    filters: {
                        shopId: user.shop_id,
                        itemType: { $in: ["STOCK", "TRADE"] },
                        branchId: branchId || undefined
                    },
                    limit: 100
                }),
                taxService.getTaxes(branchId)
            ]);
            setSuppliers(suppliersData);
            setBranches(branchesData);
            setShopInfo(shopData);
            setStockItems(itemsRes.data || []);
            setShopTaxes(taxesRes.filter(t => t.isActive !== false));
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
                    itemCode: it.itemId?.itemCode || "",
                    taxPercent: it.taxPercent || it.itemId?.taxPercent || 0
                }))
            });

            if (p.supplierId?.name) setSupplierSearch(p.supplierId.name);
            if (p.branchId?.name) setBranchSearch(p.branchId.name);
        } catch (error) {
            console.error("Error loading purchase:", error);
            toast.error("Failed to load purchase details");
        } finally {
            setLoading(false);
        }
    };

    // --- Calculations ---
    const { subtotal, taxTotal } = useMemo(() => {
        return formData.items.reduce((acc, it) => {
            acc.subtotal += (it.quantity * it.purchasePrice);
            acc.taxTotal += (it.taxAmount || 0);
            return acc;
        }, { subtotal: 0, taxTotal: 0 });
    }, [formData.items]);

    useEffect(() => {
        setFormData(prev => {
            const grand = subtotal + taxTotal - (Number(prev.discountTotal) || 0);
            return {
                ...prev,
                subtotal: subtotal,
                taxTotal: taxTotal,
                grandTotal: grand,
                balanceAmount: grand - (Number(prev.paidAmount) || 0)
            };
        });
    }, [subtotal, taxTotal, formData.discountTotal, formData.paidAmount]);

    // --- Handlers ---
    const handleAddItem = (item) => {
        const existing = formData.items.find(it => it.itemId === item._id);
        if (existing) {
            toast.error("Item already added. Adjust quantity in the list.");
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
            taxPercent: item.taxPercent || 0,
            taxAmount: (item.pricing?.purchasePrice || 0) * (item.taxPercent || 0) / 100
        };

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
        setItemSearch("");
        setShowResults(false);
    };

    const handleProductDialogClose = async (newProduct) => {
        setIsProductModalOpen(false);
        setProductPrefillData(null);
        
        if (newProduct && (newProduct._id || newProduct.id) && newProduct.name) {
            try {
                // Refresh stock items list to get the full item details
                const response = await itemService.getItems({
                    limit: 1000,
                    filters: {
                        shopId: user.shop_id,
                        branchId: formData.branchId || activeBranchId || undefined,
                        itemType: { $in: ["STOCK", "TRADE"] }
                    }
                });
                const updatedStockItems = response.data || response.items || response;
                setStockItems(updatedStockItems);

                // Try to find if there was an 'isNew' item with this name and remove it
                setFormData(prev => {
                    const existsAsNew = prev.items.findIndex(it => it.isNew && it.name.toLowerCase() === newProduct.name.toLowerCase());
                    if (existsAsNew !== -1) {
                        const newItems = [...prev.items];
                        newItems.splice(existsAsNew, 1);
                        return { ...prev, items: newItems };
                    }
                    return prev;
                });

                // Find the newly created product in the updated list
                const fullProduct = updatedStockItems.find(it => (it._id || it.id) === (newProduct._id || newProduct.id));
                if (fullProduct) {
                    handleAddItem(fullProduct);
                } else {
                    handleAddItem(newProduct);
                }
            } catch (error) {
                console.error("Failed to refresh items after adding product:", error);
                handleAddItem(newProduct);
            }
        }
    };


    const handleDataExtracted = (data) => {
        // Handle Supplier Missing
        if (!data.supplierId && data.supplierName) {
            setSupplierFormData(prev => ({
                ...prev,
                name: data.supplierName
            }));
            setIsSupplierModalOpen(true);
            toast.info(`Supplier "${data.supplierName}" not found. Please create it.`);
        }

        setFormData(prev => {
            const updatedItems = [...prev.items];
            
            // Try to match and add items
            data.items.forEach(extractedItem => {
                // Try to find matching stock item by name
                const match = stockItems.find(it => 
                    it.name.toLowerCase().includes(extractedItem.name.toLowerCase()) ||
                    extractedItem.name.toLowerCase().includes(it.name.toLowerCase())
                );

                if (match) {
                    // Avoid duplicate entry of same itemId
                    const alreadyExists = updatedItems.find(it => it.itemId === match._id);
                    if (!alreadyExists) {
                        updatedItems.push({
                            itemId: match._id,
                            name: match.name,
                            itemCode: match.itemCode,
                            quantity: extractedItem.quantity || 1,
                            purchasePrice: extractedItem.purchasePrice || match.pricing?.purchasePrice || 0,
                            sellingPrice: match.pricing?.sellingPrice || 0,
                            mrp: match.pricing?.mrp || 0,
                            taxPercent: match.taxPercent || 0,
                            taxAmount: (extractedItem.purchasePrice || match.pricing?.purchasePrice || 0) * (match.taxPercent || 0) / 100,
                            batchTracking: match.tracking?.batchTracking || false,
                            expiryTracking: match.tracking?.expiryTracking || false,
                            existingBarcode: match.barcode || "",
                            itemType: match.itemType || "STOCK"
                        });
                    } else {
                        alreadyExists.quantity += (extractedItem.quantity || 0);
                    }
                } else if (extractedItem.name) {
                    // Add as a "Pending/New" item that needs to be created
                    updatedItems.push({
                        itemId: `new_${Date.now()}_${Math.random()}`,
                        name: extractedItem.name,
                        itemCode: "PENDING",
                        quantity: extractedItem.quantity || 1,
                        purchasePrice: extractedItem.purchasePrice || 0,
                        isNew: true,
                        taxPercent: 0,
                        taxAmount: 0
                    });
                }
            });

            // Format date if it exists
            let validDate = prev.invoiceDate;
            if (data.date) {
                try {
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                        validDate = d.toISOString().split('T')[0];
                    }
                } catch (e) {}
            }

            return {
                ...prev,
                supplierInvoiceNumber: data.invoiceNumber || prev.supplierInvoiceNumber,
                invoiceDate: validDate,
                supplierId: data.supplierId || prev.supplierId,
                items: updatedItems
            };
        });
        
        if (data.supplierName) setSupplierSearch(data.supplierName);
        toast.success("Invoice scanned and synced! Please review the details.");
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = async (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;

        // Recalculate taxAmount if price or taxPercent changes
        if (field === 'purchasePrice' || field === 'taxPercent' || field === 'quantity') {
            const row = updatedItems[index];
            row.taxAmount = (row.quantity * row.purchasePrice * row.taxPercent) / 100;
        }

        setFormData(prev => ({ ...prev, items: updatedItems }));

        // If taxPercent is changed, update product master
        if (field === 'taxPercent') {
            try {
                const row = updatedItems[index];
                await itemService.updateItem(row.itemId, { taxPercent: value });
                toast.success(`Tax updated for ${row.name}`);
            } catch (error) {
                console.error("Failed to update product tax percentage:", error);
                toast.error("Failed to sync tax to product master");
            }
        }
    };

    const handlePrintInvoice = () => {
        const supplier = suppliers.find(s => s._id === formData.supplierId);
        const branchContext = branches.find(b => b._id === formData.branchId || b.id === formData.branchId);

        const formatAddress = (addr) => {
            if (!addr) return '';
            const parts = [
                addr.line1,
                addr.line2,
                addr.city,
                addr.state?.name || addr.state,
                addr.pincode
            ].filter(Boolean);
            return parts.join(', ');
        };

        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Purchase Invoice - ${formData.supplierInvoiceNumber || 'INV'}</title>
    <style>
      @page { size: A4; margin: 15mm; }
      body { 
        font-family: 'Inter', -apple-system, system-ui, sans-serif; 
        padding: 0; 
        color: #1a1a1a; 
        line-height: 1.6;
        background: #fff;
      }
      .container { max-width: 800px; margin: 0 auto; }
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-start;
        border-bottom: 2px solid #f0f0f0; 
        padding-bottom: 30px; 
        margin-bottom: 40px; 
      }
      .title-section h1 { 
        font-size: 32px; 
        font-weight: 900; 
        letter-spacing: -0.5px; 
        margin: 0;
        color: #000;
        text-transform: uppercase;
      }
      .meta-info { margin-top: 15px; font-size: 13px; color: #444; }
      .meta-info div { margin-bottom: 4px; }
      .meta-info strong { color: #000; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }

      .address-grid { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 40px; 
        margin-bottom: 50px; 
      }
      .address-box h3 { 
        font-size: 11px; 
        text-transform: uppercase; 
        letter-spacing: 1.5px; 
        color: #666; 
        margin-bottom: 15px;
        border-bottom: 1px solid #eee;
        padding-bottom: 8px;
      }
      .address-content { font-size: 14px; }
      .address-content strong { font-size: 18px; display: block; margin-bottom: 5px; color: #000; }
      .address-detail { color: #444; margin-bottom: 2px; }

      table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
      th { 
        text-align: left; 
        font-size: 11px; 
        text-transform: uppercase; 
        letter-spacing: 1px; 
        color: #666;
        padding: 15px 10px;
        border-bottom: 2px solid #1a1a1a;
        background: #fafafa;
      }
      td { 
        padding: 15px 10px; 
        border-bottom: 1px solid #f0f0f0; 
        font-size: 14px; 
        vertical-align: top;
      }
      .item-name { font-weight: 600; color: #000; }
      .item-code { font-size: 11px; color: #666; margin-top: 4px; }

      .summary-section { 
        display: flex; 
        justify-content: flex-end; 
      }
      .totals-table { width: 300px; }
      .total-row { 
        display: flex; 
        justify-content: space-between; 
        padding: 10px 0; 
        font-size: 14px; 
        color: #444;
      }
      .total-row.grand { 
        border-top: 2px solid #000; 
        margin-top: 15px; 
        padding-top: 20px; 
        font-weight: 900; 
        font-size: 22px; 
        color: #000; 
      }

      .footer { 
        margin-top: 100px; 
        padding-top: 30px;
        border-top: 1px solid #f0f0f0;
        text-align: center; 
        color: #999; 
        font-size: 10px; 
        text-transform: uppercase; 
        letter-spacing: 2px;
      }
      
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="title-section">
          <h1>Purchase Invoice</h1>
          <div class="meta-info">
            <div><strong>Date:</strong> ${new Date(formData.invoiceDate).toLocaleDateString()}</div>
            <div><strong>Ref No:</strong> ${formData.purchaseNumber || '—'}</div>
            <div><strong>Supplier Inv:</strong> ${formData.supplierInvoiceNumber || '—'}</div>
            ${formData.invoiceNumber ? `<div><strong>System Inv:</strong> ${formData.invoiceNumber}</div>` : ''}
          </div>
        </div>
        <div style="text-align: right;">
          ${shopInfo?.logoUrl ? `<img src="${shopInfo.logoUrl.startsWith('http') ? shopInfo.logoUrl : (api.defaults.baseURL.replace(/\/api\/?$/, '') + shopInfo.logoUrl)}" style="max-height: 60px; margin-bottom: 10px;" />` : ''}
          <div style="font-size: 18px; font-weight: 900;">${shopInfo?.name || 'Restaurant POS'}</div>
        </div>
      </div>

      <div class="address-grid">
        <div class="address-box">
          <h3>Supplier Details</h3>
          <div class="address-content">
            <strong>${supplier ? supplier.name : 'Unknown Supplier'}</strong>
            <div class="address-detail">${formatAddress(supplier?.address)}</div>
            ${supplier?.phone ? `<div class="address-detail">Ph: ${supplier.phone}</div>` : ''}
            ${supplier?.email ? `<div class="address-detail">Email: ${supplier.email}</div>` : ''}
            ${supplier?.taxNumber ? `<div class="address-detail">TAX ID: ${supplier.taxNumber}</div>` : ''}
          </div>
        </div>
        <div class="address-box">
          <h3>Billed To (Branch)</h3>
          <div class="address-content">
            <strong>${branchContext ? branchContext.name : (shopInfo?.name || 'Main Branch')}</strong>
            <div class="address-detail">${formatAddress(branchContext?.address)}</div>
            ${branchContext?.address?.city ? `<div class="address-detail">${branchContext.address.city}, ${branchContext.address.state?.name || branchContext.address.state || ''}</div>` : ''}
            ${branchContext?.taxProfile?.registrationNumber ? `<div class="address-detail">GST/TAX: ${branchContext.taxProfile.registrationNumber}</div>` : ''}
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 8%">#</th>
            <th style="width: 42%">Item Description</th>
            <th style="width: 12%; text-align: center;">Qty</th>
            <th style="width: 18%; text-align: right;">Price</th>
            <th style="width: 20%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${formData.items.map((it, idx) => `
            <tr>
              <td style="color:#888">${String(idx + 1).padStart(2, '0')}</td>
              <td>
                <div class="item-name">${it.name || 'Unknown'}</div>
                <div class="item-code">${it.itemCode || ''}</div>
              </td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${formatCurrency(it.purchasePrice)}</td>
              <td style="text-align: right; font-weight: 600;">${formatCurrency(it.quantity * it.purchasePrice)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="totals-table">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${formatCurrency(formData.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>Tax (+)</span>
            <span>${formatCurrency(formData.taxTotal)}</span>
          </div>
          <div class="total-row">
            <span>Discount (-)</span>
            <span>${formatCurrency(formData.discountTotal)}</span>
          </div>
          <div class="total-row grand">
            <span>GRAND TOTAL</span>
            <span>${formatCurrency(formData.grandTotal)}</span>
          </div>
        </div>
      </div>

      <div class="footer">
        Supplier Invoice generated from Restaurant POS system behalf of ${shopInfo?.name || 'Restaurant'}
      </div>
    </div>
    <script>
      window.onload = () => {
        window.print();
        setTimeout(() => window.close(), 500);
      };
    </script>
  </body>
</html>
        `;
        const printWindow = window.open('', '_blank', 'width=900,height=900');
        if (!printWindow) {
            toast.error("Popup blocked. Please allow popups to print.");
            return;
        }
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const handleSubmit = async (e, shouldPrint = false) => {
        if (e && e.preventDefault) e.preventDefault();
        if (formData.items.length === 0) {
            toast.error("Please add at least one item.");
            return;
        }

        // Validation for items requiring batch/expiry tracking
        for (const item of formData.items) {
            if (item.batchTracking && !item.batchNo) {
                toast.error(`Batch number is required for item: ${item.name}`);
                return;
            }
            if (item.expiryTracking && !item.expiryDate) {
                toast.error(`Expiry date is required for item: ${item.name}`);
                return;
            }
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
                toast.success("Purchase updated successfully");
            } else {
                savedPurchase = await PurchaseService.createPurchase(payload);
                toast.success("Purchase created successfully");
            }
            if (shouldPrint) {
                handlePrintInvoice();
            }
            navigate("/purchases");
        } catch (error) {
            console.error("Save error:", error);
            toast.error(error.message || "Failed to save purchase");
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
            toast.error(error.message || "Failed to save supplier");
        } finally {
            setSavingSupplier(false);
        }
    };

    const handleOpenBranchModal = () => {
        if (!user?.shop_id) {
            toast.error("Organization details are missing.");
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
            toast.error(error.message || "Failed to save branch");
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
                    toast.error("Failed to fetch address from location.");
                } finally {
                    setIsLocationLoading(false);
                }
            }, (error) => {
                console.error("Geolocation error:", error);
                setIsLocationLoading(false);
                toast.error("Location access denied or unavailable.");
            });
        } else {
            toast.error("Geolocation is not supported by this browser.");
        }
    };

    const filteredSearchItems = stockItems.filter(it => {
        const name = String(it.name || "").toLowerCase();
        const code = String(it.itemCode || "").toLowerCase();
        const search = (itemSearch || "").toLowerCase();
        return name.includes(search) || code.includes(search);
    }).slice(0, 5);

    const filteredSuppliers = suppliers.filter(s => {
        const name = String(s.name || "").toLowerCase();
        const contact = String(s.contactPerson || "").toLowerCase();
        const search = (supplierSearch || "").toLowerCase();
        return name.includes(search) || contact.includes(search) || (s.phone || "").includes(supplierSearch);
    }).slice(0, 5);

    const filteredBranches = branches.filter(b => {
        const name = String(b.name || "").toLowerCase();
        const city = String(b.address?.city || "").toLowerCase();
        const stateStr = b.address?.state?.name || b.address?.state || "";
        const state = String(stateStr).toLowerCase();
        const search = (branchSearch || "").toLowerCase();
        return name.includes(search) || city.includes(search) || state.includes(search);
    }).slice(0, 5);

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
            labelWidth,
            labelHeight,
            elementsOrder
        } = barcodePrintDialog;
        if (!barcode || !barcode.fullUrl) {
            toast.error("No barcode image available to print.");
            return;
        }
        const count = Math.max(1, Number(copies) || 1);

        const effectiveBatch = includeBatch ? (batchOverride || item?.batchNo || "") : "";
        const effectiveExpiry = includeExpiry ? (expiryOverride || item?.expiryDate || "") : "";
        if (includeBatch && !effectiveBatch) {
            toast.error("Please enter a batch number to print.");
            return;
        }
        if (includeExpiry && !effectiveExpiry) {
            toast.error("Please enter an expiry date to print.");
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
        width: ${labelWidth}mm;
        min-height: ${labelHeight}mm;
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
        max-height: ${labelHeight * 0.4}mm;
        height: auto;
        margin-bottom: 0.5mm;
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
            toast.error("Popup blocked. Please allow popups for this site to print labels.");
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

                    {!isEditing && (
                        <button
                            type="button"
                            onClick={() => setIsScannerOpen(true)}
                            className={`flex items-center gap-2 px-6 py-4 rounded-[20px] font-black transition-all shadow-xl active:scale-95 group overflow-hidden relative ${theme.mode === 'dark' 
                                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20' 
                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'}`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                            <Camera size={20} className="group-hover:rotate-12 transition-transform" />
                            <div className="flex flex-col items-start leading-none text-left">
                                <span className="text-[11px] tracking-tight">UPLOAD & SCAN</span>
                                <span className="text-[8px] opacity-60 tracking-widest font-bold">POWERED BY FIVEPE AI</span>
                            </div>
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 pb-12">
                    {/* section: General Info */}
                    <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 md:p-12 border ${theme.borderLight}`}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <User size={12} /> Supplier *
                                </label>
                                <div className="relative">
                                    {formData.supplierId ? (
                                        (() => {
                                            const supplier = suppliers.find(s => s._id === formData.supplierId);
                                            return (
                                                <div className={`p-6 rounded-3xl border-2 border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-900/10 relative group transition-all`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, supplierId: "" }));
                                                            setSupplierSearch("");
                                                        }}
                                                        className="absolute top-4 right-4 p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[8px] font-black uppercase"
                                                    >
                                                        <X size={14} /> Change
                                                    </button>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                                                                <User size={18} />
                                                            </div>
                                                            <div>
                                                                <h3 className={`text-lg font-black leading-none ${theme.textHeading}`}>{supplier?.name || "Unknown Supplier"}</h3>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${theme.textSecondary}`}>Bill From</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-indigo-500/10">
                                                            {supplier?.email && (
                                                                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                                    <Mail size={12} className="text-indigo-400" />
                                                                    {supplier.email}
                                                                </div>
                                                            )}
                                                            {supplier?.phone && (
                                                                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                                    <Phone size={12} className="text-indigo-400" />
                                                                    {supplier.phone}
                                                                </div>
                                                            )}
                                                            {supplier?.address && (
                                                                <div className="flex items-start gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                                    <MapPin size={12} className="mt-0.5 text-indigo-400 shrink-0" />
                                                                    <span className="leading-relaxed">{supplier.address}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <>
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
                                                    placeholder="Search suppliers..."
                                                    className={`w-full pl-12 pr-4 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary}`}
                                                />
                                            </div>
                                            {showSupplierResults && (
                                                <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border z-50 overflow-hidden divide-y animate-in slide-in-from-top-2 duration-200 ${theme.surfaceBg} ${theme.borderLight} ${theme.borderLight.replace('border-', 'divide-')}`}>
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
                                                            className={`w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors`}
                                                        >
                                                            <div>
                                                                <div className={`font-black ${theme.textPrimary}`}>{supplier.name}</div>
                                                                {supplier.contactPerson && (
                                                                    <div className={`text-[10px] font-bold uppercase ${theme.textSecondary}`}>
                                                                        {supplier.contactPerson}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Check size={16} className="text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                                                        </button>
                                                    ))}
                                                    {filteredSuppliers.length === 0 && (
                                                        <div className={`p-4 text-center font-bold text-xs uppercase ${theme.textMuted}`}>
                                                            No suppliers found
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowSupplierResults(false);
                                                            handleOpenSupplierModal();
                                                        }}
                                                        className={`w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors border-t mt-2 ${theme.borderLight}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                <Plus size={18} />
                                                            </div>
                                                            <div className="font-black text-indigo-600 dark:text-indigo-400">Add New Supplier</div>
                                                        </div>
                                                        <ChevronRight size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-1 ${theme.textMuted}`}>
                                    <Building size={12} /> Branch *
                                </label>
                                <div className="relative">
                                    {formData.branchId ? (
                                        (() => {
                                            const branch = branches.find(b => b._id === formData.branchId);
                                            return (
                                                <div className={`p-6 rounded-3xl border-2 border-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-900/10 relative group transition-all`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData(prev => ({ ...prev, branchId: "" }));
                                                            setBranchSearch("");
                                                        }}
                                                        className="absolute top-4 right-4 p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center gap-2 text-[8px] font-black uppercase"
                                                    >
                                                        <X size={14} /> Change
                                                    </button>
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                                                                <Building size={18} />
                                                            </div>
                                                            <div>
                                                                <h3 className={`text-lg font-black leading-none ${theme.textHeading}`}>{branch?.name || "Unknown Branch"}</h3>
                                                                <p className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${theme.textSecondary}`}>Bill To / Delivery</p>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 gap-2.5 pt-2 border-t border-indigo-500/10">
                                                            {branch?.address && (
                                                                <div className="flex items-start gap-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                                                                    <MapPin size={12} className="mt-0.5 text-indigo-400 shrink-0" />
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="leading-relaxed">{branch.address.line1}</span>
                                                                        <span className="text-[10px] opacity-70">
                                                                            {branch.address.city}{(branch.address.state?.name || branch.address.state) ? `, ${branch.address.state?.name || branch.address.state}` : ""}{branch.address.pincode ? ` - ${branch.address.pincode}` : ""}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <>
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
                                                    placeholder="Search branches..."
                                                    className={`w-full pl-12 pr-4 py-4 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold ${theme.inputBg} ${theme.textPrimary}`}
                                                />
                                            </div>
                                            {showBranchResults && (
                                                <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl border z-50 overflow-hidden divide-y animate-in slide-in-from-top-2 duration-200 ${theme.surfaceBg} ${theme.borderLight} ${theme.borderLight.replace('border-', 'divide-')}`}>
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
                                                            className={`w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors`}
                                                        >
                                                            <div>
                                                                <div className={`font-black ${theme.textPrimary}`}>{branch.name}</div>
                                                                <div className={`text-[10px] font-bold uppercase ${theme.textSecondary}`}>
                                                                    {branch.address?.city || ""}{(branch.address?.state?.name || branch.address?.state) ? `, ${branch.address.state.name || branch.address.state}` : ""}
                                                                </div>
                                                            </div>
                                                            <Check size={16} className="text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0" />
                                                        </button>
                                                    ))}
                                                    {filteredBranches.length === 0 && (
                                                        <div className={`p-4 text-center font-bold text-xs uppercase ${theme.textMuted}`}>
                                                            No branches found
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowBranchResults(false);
                                                            handleOpenBranchModal();
                                                        }}
                                                        className={`w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors border-t mt-2 ${theme.borderLight}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                <Plus size={18} />
                                                            </div>
                                                            <div className="font-black text-indigo-600 dark:text-indigo-400">Add New Branch</div>
                                                        </div>
                                                        <ChevronRight size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-6">
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
                    </div>

                    {/* section: Item Entry */}
                    <div className={`${theme.surfaceBg} rounded-[40px] shadow-2xl p-8 md:p-12 border ${theme.borderLight} flex flex-col gap-8`}>
                        <div className={`flex flex-col gap-6 border-b pb-8 ${theme.borderLight}`}>
                            <h2 className={`text-xl font-black flex items-center gap-3 uppercase tracking-tight ${theme.textHeading}`}>
                                <Package className="text-indigo-600" /> Items List
                            </h2>

                            {/* Search for Adding Items - Now Full Width */}
                            <div className="relative w-full">
                                <CommonSelect
                                    options={stockItems}
                                    value={null}
                                    onChange={(id, item) => handleAddItem(item)}
                                    placeholder="Add items to invoice..."
                                    searchPlaceholder="Search by name or code..."
                                    labelKey="name"
                                    valueKey="_id"
                                    className="w-full"
                                    renderOption={(item) => (
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <div className={`font-black ${theme.textPrimary}`}>{item.name}</div>
                                                {businessTypeData?.features?.sellTradeItems && (
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded font-black ${item.itemType === 'TRADE' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                                                        {item.itemType}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`text-[10px] font-bold uppercase ${theme.textSecondary}`}>{item.itemCode}</div>
                                        </div>
                                    )}
                                    extraAction={(
                                        <button
                                            type="button"
                                            onClick={() => setIsProductModalOpen(true)}
                                            className={`w-full p-3 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors rounded-xl`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                    <Plus size={18} />
                                                </div>
                                                <div className="font-black text-indigo-600 dark:text-indigo-400">Add New Product</div>
                                            </div>
                                            <ChevronRight size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                        </button>
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
                                        {businessTypeData?.features?.sellTradeItems && (
                                            <th className="py-4 px-2 w-24">Item Type</th>
                                        )}
                                        <th className="py-4 px-2 w-24">Qty</th>
                                        <th className="py-4 px-2 w-28">Purchase Price</th>
                                        <th className="py-4 px-2 w-28">Selling Price</th>
                                        <th className="py-4 px-2 w-28">MRP</th>
                                        <th className="py-4 px-2 w-28">Margin (%)</th>
                                        <th className="py-4 px-2 w-28">Batch / Exp</th>
                                        <th className="py-4 px-2 w-48">Barcode / Print</th>
                                        <th className="py-4 px-2 w-28">Tax (%)</th>
                                        <th className="py-4 px-2 text-right">Total</th>
                                        <th className="py-4 px-2 text-right w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${theme.borderLight.replace('border-', 'divide-')} ${theme.textPrimary}`}>
                                    {formData.items.map((it, idx) => (
                                        <tr key={it.itemId} className="group hover:opacity-80 transition-opacity">
                                            <td className={`py-5 px-2 font-bold ${theme.textMuted}`}>{idx + 1}</td>
                                            <td className="py-5 px-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`font-black ${theme.textPrimary}`}>{it.name}</div>
                                                    {it.isNew && (
                                                        <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full animate-pulse">NEW</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mt-1">
                                                    <div className={`text-[10px] font-bold ${theme.textSecondary}`}>{it.itemCode}</div>
                                                    {it.isNew && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                setProductPrefillData({
                                                                    name: it.name,
                                                                    purchasePrice: it.purchasePrice,
                                                                    itemType: businessTypeData?.features?.sellTradeItems ? "TRADE" : "STOCK"
                                                                });
                                                                setIsProductModalOpen(true);
                                                            }}
                                                            className="text-[9px] font-black text-indigo-600 hover:underline"
                                                        >
                                                            + CREATE PRODUCT
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            {businessTypeData?.features?.sellTradeItems && (
                                                <td className="py-5 px-2">
                                                    <select
                                                        value={it.itemType || "STOCK"}
                                                        onChange={e => handleItemChange(idx, 'itemType', e.target.value)}
                                                        disabled={it.isNew}
                                                        className={`p-1.5 text-[10px] font-black rounded-lg border border-transparent focus:border-indigo-400 outline-none ${theme.inputBg} ${it.itemType === 'TRADE' ? 'text-amber-600' : 'text-gray-600'}`}
                                                    >
                                                        <option value="STOCK">STOCK</option>
                                                        <option value="TRADE">TRADE</option>
                                                    </select>
                                                </td>
                                            )}
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
                                                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-indigo-400`}>
                                                                    BAT <span className="text-red-500">*</span>
                                                                </span>
                                                                <input
                                                                    placeholder="BATCH NO (REQUIRED)"
                                                                    value={it.batchNo}
                                                                    onChange={e => handleItemChange(idx, 'batchNo', e.target.value)}
                                                                    className={`w-full pl-12 p-1.5 text-[11px] rounded border-transparent focus:border-indigo-400 uppercase font-bold outline-none border ${theme.inputBg} ${theme.textPrimary}`}
                                                                />
                                                            </div>
                                                        )}
                                                        {it.expiryTracking && (
                                                            <div className="relative">
                                                                <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-pink-400 z-10 pointer-events-none`}>
                                                                    EXP <span className="text-red-500">*</span>
                                                                </span>
                                                                <DatePicker
                                                                    value={it.expiryDate}
                                                                    onChange={val => handleItemChange(idx, 'expiryDate', val)}
                                                                    className={`w-full pl-12 py-1.5 text-[11px] rounded border-transparent focus-within:border-indigo-400 uppercase font-bold outline-none border ${theme.inputBg} ${theme.textPrimary}`}
                                                                    placeholder="EXPIRY (REQUIRED)"
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
                                            <td className="py-5 px-2">
                                                <select
                                                    value={it.taxPercent || 0}
                                                    onChange={e => handleItemChange(idx, 'taxPercent', parseFloat(e.target.value))}
                                                    className={`w-full p-2 rounded-lg font-black border border-transparent focus:border-indigo-400 outline-none ${theme.inputBg} ${theme.textPrimary}`}
                                                >
                                                    <option value="0">0%</option>
                                                    {shopTaxes.map(t => (
                                                        <option key={t._id} value={t.percentage}>{t.name} ({t.percentage}%)</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-5 px-2 text-right font-black">
                                                {formatCurrency((it.quantity * it.purchasePrice) + (it.taxAmount || 0))}
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
                                    className={`text-right font-black ${theme.mode === 'dark' ? 'text-gray-200 bg-gray-800' : 'text-gray-800 bg-gray-50'} min-w-[80px] p-2 rounded-lg outline-none border ${theme.borderLight}`}
                                />
                            </div>
                            <div className="flex justify-between items-center px-2 border-b border-gray-100 pb-4">
                                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Discount (-)</span>
                                <input
                                    type="number"
                                    value={formData.discountTotal}
                                    onChange={e => setFormData({ ...formData, discountTotal: parseFloat(e.target.value || 0) })}
                                    className={`text-right font-black ${theme.mode === 'dark' ? 'text-indigo-400 bg-indigo-900/40' : 'text-indigo-600 bg-indigo-50'} min-w-[80px] p-2 rounded-lg outline-none border ${theme.mode === 'dark' ? 'border-indigo-800' : 'border-indigo-100'}`}
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
                className="max-w-4xl"
            >
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Left Panel: Settings */}
                    <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1 col-span-2">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Selected Item</label>
                                <div className={`text-sm font-black ${theme.textPrimary} p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border ${theme.borderLight} min-h-[44px] flex items-center`}>
                                    {barcodePrintDialog.item?.name || "—"}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Number of Copies</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={barcodePrintDialog.copies}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, copies: e.target.value }))}
                                    className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-sm`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Label Size (W×H mm)</label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min={1}
                                            value={barcodePrintDialog.labelWidth}
                                            onChange={e => setBarcodePrintDialog(prev => ({ ...prev, labelWidth: parseFloat(e.target.value || 0) }))}
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs text-center pr-6`}
                                        />
                                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>W</span>
                                    </div>
                                    <span className={theme.textMuted}>×</span>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            min={1}
                                            value={barcodePrintDialog.labelHeight}
                                            onChange={e => setBarcodePrintDialog(prev => ({ ...prev, labelHeight: parseFloat(e.target.value || 0) }))}
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs text-center pr-6`}
                                        />
                                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>H</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Include on label</label>
                            <div className="grid grid-cols-2 gap-3 text-[11px] font-bold">
                                <label className={`flex items-center gap-2 p-2 rounded-xl border ${theme.borderLight} cursor-pointer ${theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={barcodePrintDialog.includeLogo}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeLogo: e.target.checked }))}
                                        className="rounded accent-indigo-600"
                                    />
                                    Shop Logo
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded-xl border ${theme.borderLight} cursor-pointer ${theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={barcodePrintDialog.includeName}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeName: e.target.checked }))}
                                        className="rounded accent-indigo-600"
                                    />
                                    Name
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded-xl border ${theme.borderLight} cursor-pointer ${theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={barcodePrintDialog.includeCode}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeCode: e.target.checked }))}
                                        className="rounded accent-indigo-600"
                                    />
                                    Item Code
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded-xl border ${theme.borderLight} cursor-pointer ${theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={barcodePrintDialog.includePrice}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includePrice: e.target.checked }))}
                                        className="rounded accent-indigo-600"
                                    />
                                    Purchase Price
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded-xl border ${theme.borderLight} cursor-pointer ${theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
                                    <input
                                        type="checkbox"
                                        checked={barcodePrintDialog.includeBatch}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeBatch: e.target.checked }))}
                                        className="rounded accent-indigo-600"
                                    />
                                    Batch No
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded-xl border ${theme.borderLight} cursor-pointer ${theme.mode === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'} transition-colors`}>
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
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Order & Layout</label>
                            <div className={`border border-dashed ${theme.borderLight} rounded-2xl p-3 ${theme.inputBg} space-y-2`}>
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
                                            className={`px-3 py-1.5 rounded-lg border ${theme.borderLight} text-[10px] font-bold ${theme.textPrimary} ${theme.surfaceBg} cursor-move flex items-center gap-2 hover:border-indigo-300 hover:shadow-sm`}
                                        >
                                            <div className="flex flex-col gap-0.5 opacity-30">
                                                <div className="w-2.5 h-0.5 bg-gray-600" />
                                                <div className="w-2.5 h-0.5 bg-gray-600" />
                                            </div>
                                            {labelMap[key] || key}
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setBarcodePrintDialog(prev => ({ ...prev, layout: "ROWS" }))}
                                    className={`flex-1 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${barcodePrintDialog.layout === "ROWS"
                                        ? (theme.mode === 'dark' ? "border-indigo-400 text-indigo-300 bg-indigo-400/10" : "border-indigo-500 text-indigo-600 bg-indigo-50")
                                        : `${theme.borderLight} ${theme.textSecondary} ${theme.surfaceBg}`
                                        }`}
                                >
                                    Row-wise
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBarcodePrintDialog(prev => ({ ...prev, layout: "COLUMNS" }))}
                                    className={`flex-1 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${barcodePrintDialog.layout === "COLUMNS"
                                        ? (theme.mode === 'dark' ? "border-indigo-400 text-indigo-300 bg-indigo-400/10" : "border-indigo-500 text-indigo-600 bg-indigo-50")
                                        : `${theme.borderLight} ${theme.textSecondary} ${theme.surfaceBg}`
                                        }`}
                                >
                                    Column-wise
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className={`flex-1 flex flex-col items-center justify-center p-8 rounded-[32px] ${theme.mode === 'dark' ? 'bg-gray-900' : 'bg-gray-100/50'} border-2 border-dashed ${theme.borderLight} min-h-[440px] transition-all`}>
                        <div className="mb-6 text-center">
                            <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.textMuted}`}>Live Printing Preview</h4>
                            <p className="text-[9px] font-bold text-indigo-500 mt-1">Reflects actual print output (${barcodePrintDialog.labelWidth}mm × ${barcodePrintDialog.labelHeight}mm)</p>
                        </div>

                        {/* The Actual Label Mockup */}
                        <div 
                            style={{ width: `${barcodePrintDialog.labelWidth}mm`, minHeight: `${barcodePrintDialog.labelHeight}mm` }}
                            className={`bg-white text-black p-[2mm] shadow-2xl rounded-sm text-center flex flex-col items-center justify-center border border-gray-200 transition-all`}
                        >
                            {barcodePrintDialog.elementsOrder.map((key) => {
                                if (key === "logo" && barcodePrintDialog.includeLogo && (shopInfo?.logoUrl || shopInfo?.logo)) {
                                    const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
                                    const logoUrl = shopInfo.logoUrl?.startsWith("http") ? shopInfo.logoUrl : `${root}${shopInfo.logoUrl}`;
                                    return (
                                        <div key={key} className="mb-0.5">
                                            <img src={logoUrl} alt="Logo" className="max-h-[5mm] object-contain" />
                                        </div>
                                    );
                                }
                                if (key === "barcode" && barcodePrintDialog.barcode?.fullUrl) {
                                    return (
                                        <div key={key} className="mb-0.5 w-full">
                                            <img src={barcodePrintDialog.barcode.fullUrl} alt="Barcode" className="w-full h-auto" />
                                        </div>
                                    );
                                }
                                if (key === "name" && barcodePrintDialog.includeName && barcodePrintDialog.item?.name) {
                                    return <div key={key} className="text-[8px] font-bold leading-tight uppercase line-clamp-2">{barcodePrintDialog.item.name}</div>;
                                }
                                if (key === "code" && barcodePrintDialog.includeCode && barcodePrintDialog.item?.itemCode) {
                                    return <div key={key} className="text-[7px] text-gray-600">{barcodePrintDialog.item.itemCode}</div>;
                                }
                                if (key === "price" && barcodePrintDialog.includePrice && barcodePrintDialog.item?.purchasePrice != null) {
                                    return <div key={key} className="text-[8px] font-black mt-0.5">₹{Number(barcodePrintDialog.item.purchasePrice).toFixed(2)}</div>;
                                }
                                if (key === "batch" && barcodePrintDialog.includeBatch && (barcodePrintDialog.batchOverride || barcodePrintDialog.item?.batchNo)) {
                                    return <div key={key} className="text-[7px] font-medium">B: {barcodePrintDialog.batchOverride || barcodePrintDialog.item?.batchNo}</div>;
                                }
                                if (key === "expiry" && barcodePrintDialog.includeExpiry && (barcodePrintDialog.expiryOverride || barcodePrintDialog.item?.expiryDate)) {
                                    return <div key={key} className="text-[7px] font-medium">E: {barcodePrintDialog.expiryOverride || barcodePrintDialog.item?.expiryDate}</div>;
                                }
                                if (key === "custom" && barcodePrintDialog.customText) {
                                    return <div key={key} className="text-[7px] italic mt-0.5">{barcodePrintDialog.customText}</div>;
                                }
                                return null;
                            })}
                        </div>

                        <div className="mt-8 flex flex-col gap-4 w-full max-w-[200px]">
                            <button
                                type="button"
                                onClick={handleConfirmBarcodePrint}
                                className={`w-full py-3 rounded-2xl font-black bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl ${theme.mode === 'dark' ? 'shadow-indigo-500/20' : 'shadow-indigo-100'} transition-all flex items-center justify-center gap-2 group`}
                            >
                                <Printer size={18} className="group-hover:scale-110 transition-transform" />
                                PRINT {barcodePrintDialog.copies > 1 ? `${barcodePrintDialog.copies} LABELS` : "LABEL"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }))}
                                className={`w-full py-2 rounded-2xl font-bold text-[10px] uppercase tracking-widest ${theme.textMuted} hover:opacity-80 transition-colors`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* AI Scanner Modal */}
            <InvoiceScannerModal 
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onDataExtracted={handleDataExtracted}
                theme={theme}
                suppliers={suppliers}
                stockItems={stockItems}
            />

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
                    <div className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[40px] shadow-2xl relative flex flex-col ${theme.surfaceBg}`}>
                        <button
                            onClick={() => setIsProductModalOpen(false)}
                            className={`absolute top-6 right-6 z-10 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors ${theme.textMuted}`}
                        >
                            <X size={24} />
                        </button>
                        <div className="flex-1 overflow-y-auto w-full relative">
                            <ProductPage
                                asDialog={true}
                                onClose={handleProductDialogClose}
                                fixedBranchId={formData.branchId || activeBranchId}
                                prefillData={productPrefillData}
                            />
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
                                        onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value, contactPerson: supplierFormData.contactPerson || e.target.value })}
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
