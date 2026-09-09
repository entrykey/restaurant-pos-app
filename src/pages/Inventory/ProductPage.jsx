import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ALL_FIELDS } from '../../config/itemFields';
import { ChevronRight, Save, X, Plus, Trash2, ArrowLeft, ClipboardList, ChevronDown, Package, FilePlus, Barcode, Scan, Printer, Tag, Layers, Settings, Building2, AlertTriangle, ArrowRight } from 'lucide-react';
import { api, attributeService, unitService, shopService, categoryService, itemService, branchService, taxService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useText } from '../../context/TextContext';
import { SupplierService } from '../Suppliers/SupplierService';
import { toast } from 'react-hot-toast';
import DatePicker from '../../components/ui/DatePicker';
import CommonSelect from '../../components/ui/CommonSelect';
import Modal from '../../components/ui/Modal';
import BarcodePrintDialog from '../../components/modals/BarcodePrintDialog';
import { getErrorMessage } from '../../utils/errorUtils';

const ProductPage = ({ menu, setMenu, inventoryItems, setInventoryItems, asDialog, onClose, fixedBranchId, prefillData, activeTabOverride, id: propId, sourcePage: propSourcePage, returnState: propReturnState, returnUrl: propReturnUrl, canViewMenu, canViewItems, canViewTradeItems }) => {
    const { user } = useAuth();
    const { activeBranchId, branches, organization, currentShopId, businessTypeData, formatCurrency, settings } = useApp();
    const { theme } = useTheme();
    const { t } = useText();
    const navigate = useNavigate();
    const { id: paramId } = useParams();
    const location = useLocation();
    const id = propId || paramId;

    const isEditing = id ? Boolean(id) : false;
    const searchParams = new URLSearchParams(location.search);
    const initialTab = activeTabOverride || (asDialog ? 'raw' : (searchParams.get('tab') || 'menu')); 
    const [currentTab, setCurrentTab] = useState(location.state?.currentTab || initialTab);
    const sourcePage = propSourcePage || location.state?.sourcePage;
    const returnUrl = propReturnUrl || location.state?.returnUrl || (asDialog ? location.pathname : null);
    const returnState = propReturnState || location.state?.returnState || null;
    
    const activeTab = currentTab;
    const showRecipe = activeTab === 'menu';

    const [isLoading, setIsLoading] = useState(isEditing && !location.state?.formData);
    const [formData, setFormData] = useState(location.state?.formData || {});
    const [errors, setErrors] = useState({});
    const [isGSTApplicable, setIsGSTApplicable] = useState(true);
    const [branchTaxSystem, setBranchTaxSystem] = useState('');
    const [currentBranchData, setCurrentBranchData] = useState(null);

    // Dynamic Attributes & Units
    const [dynamicAttributes, setDynamicAttributes] = useState([]);
    const [units, setUnits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [itemAttributes, setItemAttributes] = useState(location.state?.itemAttributes || {});
    const [ingredients, setIngredients] = useState(location.state?.ingredients || []);
    const [shopTaxes, setShopTaxes] = useState([]);
    const [selectedTaxType, setSelectedTaxType] = useState(""); // For tax type selection (INCLUSIVE/EXCLUSIVE)
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [isCategorySaving, setIsCategorySaving] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(location.state?.showAdvanced || false);

    const [currentBusinessType, setCurrentBusinessType] = useState(null);
    const [currentBusinessSubType, setCurrentBusinessSubType] = useState(null);
    const [barcodePrintDialog, setBarcodePrintDialog] = useState({
        isOpen: false,
        item: null,
        barcode: null,
        copies: 1,
        includeName: true,
        includeCode: true,
        includePrice: false,
        includeLogo: false,
        includeShopName: false,
        includeBatch: false,
        includeExpiry: false,
        includeUnit: false,
        customText: "",
        batchOverride: "",
        expiryOverride: "",
        unitValueOverride: "",
        layout: "ROWS",
        labelWidth: 50,
        labelHeight: 25,
        labelGapX: 2,
        labelGapY: 2,
        includeMRP: false,
        showNameLabel: false,
        showCodeLabel: false,
        showPriceLabel: false,
        showMRPLabel: false,
        showBatchLabel: false,
        showExpiryLabel: false,
        showUnitLabel: false,
        barcodeHeight: 30,
        baseFontSize: 10,
        printMode: 'ROLL',
        labelsPerRow: 1,
        elementsOrder: ["shopName", "logo", "barcode", "name", "code", "unit", "price", "mrp", "batch", "expiry", "custom"]
    });

    const [newPortion, setNewPortion] = useState({
        name: "",
        code: "",
        quantityFactor: 1,
        price: "",
        mrp: "",
        openingStock: "",
        barcode: "",
        ingredients: [],
        isDefault: false
    });
    const [hasVariants, setHasVariants] = useState(Boolean(location.state?.formData?.portionPricing?.length));
    const [showMaterialUsage, setShowMaterialUsage] = useState(false);
    const [variantBomDraft, setVariantBomDraft] = useState({});

    const inventoryMode = formData.inventoryMode || "shared";
    const isSeparateStock = hasVariants && inventoryMode === "separate";
    const isSharedPortions = hasVariants && inventoryMode !== "separate";

    const isPortionActive = Boolean(newPortion.name?.trim() || newPortion.price !== "" || newPortion.mrp !== "");

    const baseCoreFields = ["barcode", "name", "category_id", "purchase_price", "selling_price", "mrp", "tax_percent", "item_type", "is_sellable", "weight_based", "opening_stock"];
    const CORE_FIELD_KEYS = showAdvanced ? baseCoreFields : ["unit_id", ...baseCoreFields];

    // Determine visible fields based on activeTab
    const getVisibleFields = () => {
        let fields = [];
        if (activeTab === "menu") {
            fields = [
                "barcode", "item_code", "name", "description", "category_id",
                "unit_id", "secondary_unit_id", "conversion_factor", "selling_price", "mrp", "tax_percent", "hsn_sac_code", "stock_applicable",
                "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking"
            ];
        } else if (activeTab === "raw") {
            fields = [
                "barcode", "item_code", "name", "description", "category_id",
                "unit_id", "secondary_unit_id", "conversion_factor", "purchase_price", "selling_price", "mrp", "tax_percent", "hsn_sac_code",
                "stock_applicable", "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking"
            ];
        } else {
            // Trade tab
            fields = [
                "barcode", "item_code", "name", "description", "category_id",
                "unit_id", "secondary_unit_id", "conversion_factor", "purchase_price", "selling_price", "mrp", "tax_percent", "hsn_sac_code",
                "stock_applicable", "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking", "status"
            ];
        }

        // Add default unit preferences and opening stock to all tabs
        fields.push("default_purchase_unit", "default_sales_unit", "opening_stock");

        const inventoryMode = formData.inventoryMode || "shared";
        if (hasVariants && inventoryMode === "separate") {
            fields = fields.filter(f => f !== "opening_stock");
        }

        if (!isGSTApplicable) {
            fields = fields.filter(f => f !== 'hsn_sac_code');
        }
        // Include stock_applicable as the user now needs manual control for manufactured items
        return fields;
    };
    const visibleFields = getVisibleFields();
    
    // Sync state from location.state if it exists (for transition from modal to page)
    useEffect(() => {
        if (location.state?.formData) {
            setFormData(prev => ({ ...prev, ...location.state.formData }));
            if (location.state.ingredients) setIngredients(location.state.ingredients);
            if (location.state.itemAttributes) setItemAttributes(location.state.itemAttributes);
        }
        if (location.state?.currentTab) {
            setCurrentTab(location.state.currentTab);
        }
    }, [location.state]);

    const generateItemBarcode = () => {
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `ITM${timestamp}${random}`;
        setFormData(prev => ({ ...prev, barcode: code }));
        toast.success("Barcode generated!");
    };

    const handlePrintBarcode = async () => {
        const code = formData.barcode;
        if (!code) {
            toast.error("Please enter or generate a barcode first.");
            return;
        }

        try {
            let barcodeData = null;
            
            // If editing and we have an ID, try fetching official saved barcodes first
            if (isEditing && id) {
                try {
                    const barcodes = await itemService.getItemBarcodes(id);
                    if (barcodes && barcodes.length > 0) {
                        barcodeData = barcodes[0];
                    }
                } catch (e) {
                    console.warn("Could not fetch saved barcode, falling back to preview", e);
                }
            }

            // If no official barcode or new item, use preview endpoint
            if (!barcodeData) {
                barcodeData = await itemService.getPreviewBarcode(code);
            }

            if (!barcodeData || !barcodeData.imageUrl) {
                toast.error("No barcode image available for this code.");
                return;
            }

            const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
            const fullUrl = barcodeData.imageUrl.startsWith("http") ? barcodeData.imageUrl : `${root}${barcodeData.imageUrl}`;

            setBarcodePrintDialog(prev => ({
                ...prev,
                isOpen: true,
                item: {
                    name: formData.name || "New Item",
                    itemCode: formData.itemCode || code,
                    sellingPrice: formData.sellingPrice || 0,
                    mrp: formData.mrp || 0
                },
                barcode: { ...barcodeData, fullUrl },
                copies: 1,
                includeName: true,
                includeCode: true,
                includePrice: true,
                includeMRP: !!formData.mrp,
                includeLogo: !!organization?.logoUrl,
                includeShopName: true,
                includeBatch: false,
                includeExpiry: false,
                includeUnit: false
            }));
        } catch (error) {
            console.error("Failed to prepare barcode for printing:", error);
            toast.error("Failed to load barcode for printing.");
        }
    };

    const handleConfirmBarcodePrint = () => {
        const {
            copies,
            item,
            barcode,
            includeName,
            includeCode,
            includePrice,
            includeMRP,
            includeLogo,
            includeShopName,
            includeBatch,
            includeExpiry,
            includeUnit,
            showNameLabel,
            showCodeLabel,
            showPriceLabel,
            showMRPLabel,
            showBatchLabel,
            showExpiryLabel,
            showUnitLabel,
            batchOverride,
            expiryOverride,
            unitValueOverride,
            customText,
            layout,
            labelWidth,
            labelHeight,
            labelGapX,
            labelGapY,
            barcodeHeight,
            baseFontSize,
            printMode,
            labelsPerRow,
            elementsOrder
        } = barcodePrintDialog;

        if (!barcode || !barcode.fullUrl) {
            toast.error("No barcode image available to print.");
            return;
        }
        const count = Math.max(1, Number(copies) || 1);

        const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
        const logoUrl = includeLogo && organization?.logoUrl
            ? (organization.logoUrl.startsWith("http") ? organization.logoUrl : `${root}${organization.logoUrl}`)
            : null;

        const renderLabelInner = () => {
            const parts = [];
            elementsOrder.forEach((key) => {
                const actualShopName = organization?.name || organization?.businessName;
                if (key === "shopName" && includeShopName && actualShopName) {
                    parts.push(`<div class="slot line shop-name">${actualShopName}</div>`);
                }
                if (key === "logo" && logoUrl) {
                    parts.push(`<div class="slot logo"><img class="logo-img" src="${logoUrl}" alt="Logo" /></div>`);
                }
                if (key === "barcode") {
                    parts.push(`<div class="slot barcode"><img class="barcode-img" src="${barcode.fullUrl}" alt="Barcode" /></div>`);
                }
                if (key === "price" && includePrice && item?.sellingPrice != null) {
                    parts.push(`<div class="slot line price">${showPriceLabel ? 'Price: ' : ''}${formatCurrency ? formatCurrency(item.sellingPrice) : Number(item.sellingPrice).toFixed(2)}</div>`);
                }
                if (key === "mrp" && includeMRP && item?.mrp != null) {
                    parts.push(`<div class="slot line mrp">${showMRPLabel ? 'MRP: ' : ''}${formatCurrency ? formatCurrency(item.mrp) : Number(item.mrp).toFixed(2)}</div>`);
                }
                if (key === "name" && includeName && item?.name) {
                    parts.push(`<div class="slot line name">${showNameLabel ? 'Item: ' : ''}${item.name}</div>`);
                }
                if (key === "code" && includeCode && item?.itemCode) {
                    parts.push(`<div class="slot line code">${showCodeLabel ? 'Code: ' : ''}${item.itemCode}</div>`);
                }
                if (key === "unit" && includeUnit && unitValueOverride) {
                    parts.push(`<div class="slot line unit">${showUnitLabel ? 'Qty: ' : ''}${unitValueOverride}</div>`);
                }
                if (key === "batch" && includeBatch && batchOverride) {
                    parts.push(`<div class="slot line batch">${showBatchLabel ? 'Batch: ' : ''}${batchOverride}</div>`);
                }
                if (key === "expiry" && includeExpiry && expiryOverride) {
                    parts.push(`<div class="slot line expiry">${showExpiryLabel ? 'Exp: ' : ''}${expiryOverride}</div>`);
                }
                if (key === "custom" && customText) {
                    parts.push(`<div class="slot line custom">${customText}</div>`);
                }
            });
            return parts.join("");
        };

        const labelHtml = renderLabelInner();
        const labels = Array(count).fill(`<div class="label">${labelHtml}</div>`);
        const layoutClass = layout === "COLUMNS" ? "columns" : "rows";

        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Barcode Labels</title>
    <style>
      @page { 
        ${printMode === 'ROLL' ? `size: ${(labelWidth * (labelsPerRow || 1)) + (labelGapX * ((labelsPerRow || 1) - 1))}mm ${labelHeight}mm;` : 'size: auto;'}
        margin: ${printMode === 'ROLL' ? '0' : '10mm'}; 
      }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: ${baseFontSize}px;
        margin: 0;
        padding: 0;
      }
      .labels {
        display: flex;
        flex-wrap: wrap;
        margin: 0;
        padding: 0;
        gap: ${labelGapY}mm ${labelGapX}mm;
        width: 100%;
      }
      .label {
        width: ${labelWidth}mm;
        height: ${labelHeight}mm;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 1mm;
        overflow: hidden;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .label img.barcode-img {
        display: block;
        width: auto;
        max-width: 95%;
        max-height: ${barcodeHeight}%;
        margin: 0 auto;
        padding-bottom: 0.5mm;
      }
      .label img.logo-img {
        display: block;
        width: auto;
        max-width: 80%;
        max-height: 12mm;
        margin: 0 auto;
        padding-bottom: 0.5mm;
        object-fit: contain;
      }
      .slot { margin: 0; padding: 0.2mm 0; line-height: 1.1; width: 100%; display: flex; justify-content: center; align-items: center; flex-shrink: 0; }
      .line { margin: 0; padding: 0; line-height: 1.1; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
      .line.shop-name { font-weight: 800; font-size: ${baseFontSize * 1.05}px; text-transform: uppercase; margin-bottom: 0.5mm; }
      .line.name { font-weight: 600; margin-top: 0.2mm; }
      .line.code { font-size: ${baseFontSize * 0.9}px; }
      .line.unit { font-weight: 600; font-size: ${baseFontSize * 0.85}px; }
      .line.price { font-weight: 700; font-size: ${baseFontSize * 0.9}px; }
      .line.mrp { font-weight: 700; font-size: ${baseFontSize * 0.9}px; }
    </style>
  </head>
  <body>
    <div class="labels ${layoutClass}">${labels.join("")}</div>
    <script>
      window.onload = function() {
        window.focus();
        window.print();
        setTimeout(() => window.close(), 500);
      };
    </script>
  </body>
</html>`;

        const win = window.open("", "_blank");
        if (!win) {
            toast.error("Popup blocked. Please allow popups to print labels.");
            return;
        }
        win.document.open();
        win.document.write(html);
        win.document.close();
        setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }));
    };

    const handleBarcodeScan = (isAdv = false) => {
        const fieldId = isAdv ? 'field-input-barcode-adv' : 'field-input-barcode';
        const barcodeInput = document.getElementById(fieldId);
        if (barcodeInput) {
            barcodeInput.focus();
            barcodeInput.select();
            toast("Scanner ready. Please scan your item.");
        }
    };

    useEffect(() => {
        const fetchItemData = async () => {
            if (!isEditing || !id) return;
            
            // If we have data in state from modal navigation, skip fetching
            if (location.state?.formData && (String(location.state.formData._id) === String(id) || String(location.state.formData.id) === String(id))) {
                return;
            }
            try {
                const full = await itemService.getItemById(id);
                if (full) {
                    const normalizedAttributes = full.attributes
                        ? Object.fromEntries(
                            Object.entries(full.attributes).map(([code, v]) => [
                                code,
                                {
                                    value: v?.value ?? '',
                                    unitId: v?.unitId?._id ?? v?.unitId ?? '',
                                },
                            ])
                        )
                        : {};

                    const flat = {
                        ...full,
                        id: String(full._id),
                        _id: String(full._id),
                        openingStock: full.openingStock ?? full.quantityOnHand ?? 0,
                        categoryId: full.categoryId?._id || full.categoryId,
                        unitId: full.unitId?._id || full.unitId,
                        secondaryUnitId: full.secondaryUnitId?._id || full.secondaryUnitId || "",
                        conversionFactor: full.conversionFactor ?? 1,
                        defaultPurchaseUnit: full.defaultPurchaseUnit || "PRIMARY",
                        defaultSalesUnit: full.defaultSalesUnit || "PRIMARY",
                        supplierId: full.supplierId?._id || full.supplierId,
                        brandId: full.brandId?._id || full.brandId,
                        purchasePrice: full.pricing?.purchasePrice ?? full.purchasePrice ?? 0,
                        sellingPrice: full.pricing?.sellingPrice ?? full.sellingPrice ?? 0,
                        mrp: full.pricing?.mrp ?? full.mrp ?? 0,
                        stockApplicable: full.stockSettings?.stockApplicable ?? full.stockApplicable ?? true,
                        minStockAlert: full.stockSettings?.minStockAlert ?? full.minStockAlert ?? 0,
                        batchTracking: full.tracking?.batchTracking ?? full.batchTracking ?? false,
                        expiryTracking: full.tracking?.expiryTracking ?? full.expiryTracking ?? false,
                        serialTracking: full.tracking?.serialTracking ?? full.serialTracking ?? false,
                        weightBased: full.weightBased ?? false,
                        taxPercent: full.taxPercent ?? 0,
                        taxId: full.taxId || "",
                        isSellable: full.isSellable ?? true,
                        portionPricing: full.portionPricing || [],
                        inventoryMode: full.inventoryMode || "shared"
                    };
                    setFormData(flat);
                    setHasVariants((full.portionPricing || []).length > 0);
                    setItemAttributes(normalizedAttributes);
                    setIngredients((full.ingredients || []).map(ing => ({
                        ...ing,
                        itemId: ing.itemId || ing.rawItemId,
                        rawItemId: ing.rawItemId || ing.itemId
                    })));
                }
            } catch (err) {
                console.error('Failed to load item for editing:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchItemData();
    }, [id, isEditing, location.state]);

    useEffect(() => {
        if (!isLoading && id && formData._id) {
            const searchParams = new URLSearchParams(location.search);
            if (searchParams.get('printBarcode') === 'true') {
                handlePrintBarcode();
                navigate(location.pathname, { replace: true, state: location.state });
            }
        }
    }, [isLoading, id, formData._id, location.search, navigate, handlePrintBarcode]);

    useEffect(() => {
        if (!isEditing && !formData.barcode && !isLoading) {
            generateItemBarcode();
        }
    }, [isEditing, isLoading, formData.barcode]);

    useEffect(() => {
        if (shopTaxes.length > 0 && (formData.taxId || (formData.taxPercent !== undefined && formData.taxPercent > 0))) {
            const matchedTax = shopTaxes.find(t => 
                (formData.taxId && String(t._id || t.id) === String(formData.taxId)) ||
                (formData.taxPercent !== undefined && formData.taxPercent !== null && Number(t.percentage) === Number(formData.taxPercent))
            );
            if (matchedTax && matchedTax.taxType && !selectedTaxType) {
                setSelectedTaxType(matchedTax.taxType.toUpperCase());
            }
        }
    }, [formData.taxId, formData.taxPercent, shopTaxes, selectedTaxType]);
    useEffect(() => {
        if (!isEditing && !isLoading && settings) {
            const defaultIsSellable = activeTab === 'raw' 
                ? settings.ENABLE_STOCK_ITEMS !== false 
                : (activeTab === 'menu' ? settings.ENABLE_MANUFACTURED_ITEMS !== false : settings.ENABLE_TRADE_ITEMS !== false);
            
            setFormData(prev => ({
                ...prev,
                isSellable: prev.isSellable !== undefined ? prev.isSellable : defaultIsSellable
            }));
        }
    }, [isEditing, isLoading, activeTab, settings]);

    useEffect(() => {
        if (!isEditing && prefillData) {
            const pp = prefillData.purchasePrice ?? 0;
            const mrp = prefillData.mrp ?? pp;
            const sp = prefillData.sellingPrice ?? pp;
            const tp = prefillData.taxPercent;
            setFormData(prev => ({
                ...prev,
                name: prefillData.name || "",
                description: prefillData.description || prefillData.name || "",
                purchasePrice: pp,
                sellingPrice: sp,
                mrp,
                hsnSacCode: prefillData.hsnSacCode || "",
                ...(tp !== undefined && tp !== null && tp !== "" ? { taxPercent: Number(tp) } : {}),
                itemType: prefillData.itemType || "STOCK",
                isSellable: prefillData.itemType === 'MANUFACTURED' ? settings?.ENABLE_MANUFACTURED_ITEMS !== false : (prefillData.itemType === 'TRADE' ? settings?.ENABLE_TRADE_ITEMS !== false : settings?.ENABLE_STOCK_ITEMS !== false),
                status: "ACTIVE"
            }));
        }
    }, [prefillData, isEditing]);


    useEffect(() => {
        const fetchAttributesAndUnits = async () => {
            try {
                let businessTypeId = null;
                let businessSubTypeId = null;

                if (currentShopId) {
                    try {
                        const shop = await shopService.getShopById(currentShopId);
                        businessTypeId = shop?.businessType?._id || shop?.businessType;
                        businessSubTypeId = shop?.subType?._id || shop?.subType;
                        setCurrentBusinessType(businessTypeId);
                        setCurrentBusinessSubType(businessSubTypeId);
                    } catch (error) {
                        console.error("Failed to fetch shop data:", error);
                    }
                }

                const params = {};
                if (businessTypeId) params.businessTypeId = businessTypeId;
                if (businessSubTypeId) params.businessSubTypeId = businessSubTypeId;
                if (currentShopId) params.shopId = currentShopId;

                const branchIdToUse = activeBranchId || (user?.branchIds && user.branchIds.length > 0 ? user.branchIds[0] : null);

                const promises = [
                    attributeService.getAttributes(params),
                    unitService.getUnits(),
                    categoryService.getCategories({ shopId: currentShopId }),
                    SupplierService.getSuppliers(currentShopId),
                    taxService.getTaxes({ branchId: branchIdToUse || activeBranchId })
                ];

                const results = await Promise.allSettled(promises);
                const attrsRes = results[0].status === 'fulfilled' ? results[0].value : [];
                const unitsRes = results[1].status === 'fulfilled' ? results[1].value : [];
                const categoriesRes = results[2].status === 'fulfilled' ? results[2].value : [];
                const suppliersRes = results[3].status === 'fulfilled' ? results[3].value : [];
                const taxesRes = results[4].status === 'fulfilled' ? results[4].value : [];

                if (branchIdToUse && currentShopId) {
                    try {
                        const branchesData = await branchService.getBranchesByShopId(currentShopId);
                        const currBranch = branchesData.find(b => String(b._id) === String(branchIdToUse));
                        if (currBranch) {
                            setCurrentBranchData(currBranch);
                            if (currBranch.taxProfile && currBranch.taxProfile.taxSystem) {
                                const system = currBranch.taxProfile.taxSystem;
                                setIsGSTApplicable(system === 'GST');
                                setBranchTaxSystem(system);
                                setFormData(prev => ({
                                    ...prev,
                                    taxId: prev.taxId || system
                                }));
                            }
                        }
                    } catch (err) {
                        console.error("Failed to load branch tax rules:", err);
                    }
                }

                const unitsData = Array.isArray(unitsRes) ? unitsRes : (unitsRes?.data || []);
                const categoriesData = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data || []);
                setDynamicAttributes(Array.isArray(attrsRes) ? attrsRes.filter(a => a.isActive !== false) : []);
                setUnits(unitsData);
                setCategories(categoriesData.filter(c => c.isActive !== false));
                if (!isEditing && unitsData.length > 0) {
                    const defaultUnit = unitsData.find(u => u.isDefault || u.name === 'Pcs' || u.name === 'Pieces') || unitsData[0];
                    if (defaultUnit) {
                        const dId = defaultUnit._id || defaultUnit.id;
                        setFormData(prev => ({ ...prev, unitId: prev.unitId || dId }));
                    }
                }

                const suppliersData = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.data || []);
                setSuppliers(suppliersData);
                setShopTaxes(taxesRes.filter(t => t.isActive !== false));
            } catch (error) {
                console.error("Failed to load attributes/units", error);
                toast.error("Failed to load item configuration (units/categories). Please try refreshing.");
            }
        };

        const fetchStockItems = async () => {
            if ((showRecipe || hasVariants || isSeparateStock) && currentShopId) {
                try {
                    const effectiveBranchId = activeBranchId || user?.branchId || user?.branch_id || (user?.branchIds && user.branchIds.length > 0 ? (typeof user.branchIds[0] === 'object' ? user.branchIds[0]._id : user.branchIds[0]) : undefined);
                    const response = await itemService.getItems({
                        limit: 1000,
                        filters: {
                            shopId: currentShopId,
                            branchId: effectiveBranchId,
                            itemType: "STOCK"
                        }
                    });
                    setStockItems(response.data || response);
                } catch (error) {
                    console.error("Failed to fetch stock items for recipe:", error);
                }
            }
        };

        fetchAttributesAndUnits();
        fetchStockItems();
    }, [currentShopId, activeBranchId, showRecipe, hasVariants, isSeparateStock]);


    // Recipe / Ingredients State
    const [selectedRawItem, setSelectedRawItem] = useState("");
    const [ingredientQty, setIngredientQty] = useState("");
    const [ingredientUnitId, setIngredientUnitId] = useState("");

    const getAvailableUnitsForItem = (itemId, stockItemsList = [], allUnits = []) => {
        if (!itemId) return [];
        const item = (stockItemsList || []).find(i => String(i._id || i.id) === String(itemId));
        if (!item) return [];

        const unitOptions = [];

        // Primary Unit
        const pUnitId = item.unitId?._id || item.unitId;
        if (pUnitId) {
            const pName = item.unitId?.name || (allUnits || []).find(u => String(u._id || u.id) === String(pUnitId))?.name || 'Primary Unit';
            unitOptions.push({
                label: `${pName} (Primary)`,
                value: String(pUnitId),
                selectedUnit: 'PRIMARY',
                unitName: pName,
                conversionFactor: 1
            });
        }

        // Secondary Unit (ONLY if secondaryUnitId exists on selected item)
        const sUnitId = item.secondaryUnitId?._id || item.secondaryUnitId;
        if (sUnitId && String(sUnitId) !== String(pUnitId)) {
            const sName = item.secondaryUnitId?.name || (allUnits || []).find(u => String(u._id || u.id) === String(sUnitId))?.name || 'Secondary Unit';
            const factor = Number(item.conversionFactor) || 1;
            unitOptions.push({
                label: `${sName} (Secondary - 1 Pri = ${factor} ${sName})`,
                value: String(sUnitId),
                selectedUnit: 'SECONDARY',
                unitName: sName,
                conversionFactor: factor
            });
        }

        return unitOptions;
    };

    const groupedFields = visibleFields.reduce((acc, fieldKey) => {
        const fieldDef = ALL_FIELDS[fieldKey];
        if (!fieldDef) return acc;

        const section = fieldDef.section || "Other";
        if (!acc[section]) acc[section] = [];

        let options = fieldDef.options || [];
        if (fieldKey === "category_id") {
            options = [
                { label: "Other Category", value: "" },
                ...categories.map(c => ({ label: c.name, value: c._id }))
            ];
        } else if (fieldKey === "supplier_id") {
            options = suppliers.map(s => ({ label: s.name, value: s._id }));
        } else if (fieldKey === "unit_id" || fieldKey === "secondary_unit_id") {
            options = units.map(u => ({ label: u.name || u.code, value: u._id }));
        } else if (fieldKey === "tax_percent") {
            // Filter taxes based on selected tax type
            const filteredTaxes = selectedTaxType 
                ? shopTaxes.filter(t => (t.taxType || 'INCLUSIVE').toUpperCase() === selectedTaxType)
                : [];
            
            options = filteredTaxes.map(t => ({
                label: `${t.name} (${t.percentage}%)`,
                value: t._id
            }));
        }

        acc[section].push({ 
            ...fieldDef, 
            originalKey: fieldKey, 
            options,
            type: fieldKey === 'tax_percent' ? 'select' : fieldDef.type 
        });
        return acc;
    }, {});

    const handleChange = (fieldKey, value) => {
        if (fieldKey === "tax_percent") {
            const selectedTax = shopTaxes.find(t => t._id === value);
            setFormData(prev => ({
                ...prev,
                taxId: value || "",
                taxPercent: selectedTax ? selectedTax.percentage : 0
            }));
            return;
        }
        setFormData(prev => ({
            ...prev,
            [ALL_FIELDS[fieldKey].key]: value
        }));

        if (errors[fieldKey]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldKey];
                return newErrors;
            });
        }
    };

    const handleAttributeChange = (attrCode, field, value) => {
        setItemAttributes(prev => ({
            ...prev,
            [attrCode]: {
                ...prev[attrCode],
                [field]: value
            }
        }));
    };

    const handleAddIngredient = () => {
        if (!selectedRawItem || !ingredientQty || !ingredientUnitId) return;

        const rawItem = stockItems.find(i => String(i._id || i.id) === String(selectedRawItem));
        if (!rawItem) return;

        const availUnits = getAvailableUnitsForItem(selectedRawItem, stockItems, units);
        const selectedUnitObj = availUnits.find(u => String(u.value) === String(ingredientUnitId));

        const selectedUnitType = selectedUnitObj ? selectedUnitObj.selectedUnit : 'PRIMARY';
        const conversionFactor = selectedUnitObj ? selectedUnitObj.conversionFactor : (rawItem?.conversionFactor || 1);
        const unitName = selectedUnitObj ? selectedUnitObj.unitName : '';
        const itemId = rawItem._id || rawItem.id;

        const newIngredient = {
            rawItemId: itemId,
            itemId: itemId,
            name: rawItem.name,
            quantity: parseFloat(ingredientQty),
            unitId: ingredientUnitId,
            unitName: unitName,
            selectedUnit: selectedUnitType,
            conversionFactor: conversionFactor
        };

        setIngredients([...ingredients, newIngredient]);
        setSelectedRawItem("");
        setIngredientQty("");
        setIngredientUnitId("");
    };

    const handleRemoveIngredient = (index) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const generateVariantBarcodeCode = () => {
        const timestamp = Date.now().toString().slice(-7);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `VAR${timestamp}${random}`;
    };

    const handleAddPortion = () => {
        if (!newPortion.name || newPortion.price === "" || newPortion.price === null || newPortion.price === undefined) {
            toast.error("Variant name and price are required");
            return;
        }

        const portions = [...(formData.portionPricing || [])];
        
        if (newPortion.isDefault) {
            portions.forEach(p => p.isDefault = false);
        } else if (portions.length === 0) {
            newPortion.isDefault = true;
        }

        setFormData(prev => ({
            ...prev,
            portionPricing: [...portions, {
                ...newPortion,
                price: parseFloat(newPortion.price),
                mrp: parseFloat(newPortion.mrp || 0),
                quantityFactor: parseFloat(newPortion.quantityFactor || 1),
                openingStock: parseFloat(newPortion.openingStock || 0),
                barcode: (newPortion.barcode || '').trim(),
                ingredients: newPortion.ingredients || []
            }]
        }));

        setNewPortion({
            name: "",
            code: "",
            quantityFactor: 1,
            price: "",
            mrp: "",
            openingStock: "",
            barcode: "",
            ingredients: [],
            isDefault: false
        });
    };

    const handleUpdatePortion = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            portionPricing: (prev.portionPricing || []).map((p, i) => i === index ? { ...p, [field]: value } : p)
        }));
    };

    const handleGenerateAllVariantBarcodes = () => {
        const portions = formData.portionPricing || [];
        if (portions.length === 0) {
            toast.error("Add variants first");
            return;
        }
        setFormData(prev => ({
            ...prev,
            portionPricing: (prev.portionPricing || []).map((p) => ({
                ...p,
                barcode: p.barcode || generateVariantBarcodeCode()
            }))
        }));
        toast.success("Variant barcodes generated");
    };

    const handleAddVariantIngredient = (index) => {
        const draft = variantBomDraft[index] || {};
        if (!draft.itemId || !draft.quantity || !draft.unitId) {
            toast.error("Select a stock item, quantity, and unit");
            return;
        }
        const rawItem = stockItems.find(i => String(i._id || i.id) === String(draft.itemId));
        const availUnits = getAvailableUnitsForItem(draft.itemId, stockItems, units);
        const selectedUnitObj = availUnits.find(u => String(u.value) === String(draft.unitId));

        const selectedUnitType = selectedUnitObj ? selectedUnitObj.selectedUnit : 'PRIMARY';
        const conversionFactor = selectedUnitObj ? selectedUnitObj.conversionFactor : (rawItem?.conversionFactor || 1);
        const unitName = selectedUnitObj ? selectedUnitObj.unitName : '';

        const nextIng = {
            rawItemId: draft.itemId,
            itemId: draft.itemId,
            name: rawItem?.name || 'Item',
            quantity: parseFloat(draft.quantity),
            unitId: draft.unitId,
            unitName: unitName,
            selectedUnit: selectedUnitType,
            conversionFactor: conversionFactor
        };
        handleUpdatePortion(index, 'ingredients', [...(formData.portionPricing?.[index]?.ingredients || []), nextIng]);
        setVariantBomDraft(prev => ({ ...prev, [index]: { itemId: '', quantity: '', unitId: '' } }));
    };

    const handleRemovePortion = (index) => {
        setFormData(prev => ({
            ...prev,
            portionPricing: prev.portionPricing.filter((_, i) => i !== index)
        }));
    };

    const toIdString = (val) => {
        if (!val) return null;
        if (typeof val === 'object') return val._id || val.id || null;
        return String(val);
    };

    const validate = () => {
        const newErrors = {};
        visibleFields.forEach(fieldKey => {
            const field = ALL_FIELDS[fieldKey];
            if (!field) return;

            const value = formData[field.key];
            if (field.required) {
                const idVal = typeof value === 'object' && value !== null ? (value._id || value.id) : value;
                if (idVal === undefined || idVal === "" || idVal === null) {
                    newErrors[fieldKey] = `${field.label} is required`;
                }
            }
        });
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) {
            const firstError = Object.values(newErrors)[0];
            toast.error(firstError);
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        let finalIngredients = [...ingredients];
        // Auto-add current ingredient if fields are filled but "Plus" wasn't clicked
        if (selectedRawItem && ingredientQty && ingredientUnitId) {
            const rawItem = stockItems.find(i => String(i._id || i.id) === String(selectedRawItem));
            if (rawItem) {
                const availUnits = getAvailableUnitsForItem(selectedRawItem, stockItems, units);
                const selectedUnitObj = availUnits.find(u => String(u.value) === String(ingredientUnitId));

                const selectedUnitType = selectedUnitObj ? selectedUnitObj.selectedUnit : 'PRIMARY';
                const conversionFactor = selectedUnitObj ? selectedUnitObj.conversionFactor : (rawItem?.conversionFactor || 1);
                const unitName = selectedUnitObj ? selectedUnitObj.unitName : '';
                const itemId = rawItem._id || rawItem.id;

                finalIngredients.push({
                    rawItemId: itemId,
                    itemId: itemId,
                    name: rawItem.name,
                    quantity: parseFloat(ingredientQty),
                    unitId: ingredientUnitId,
                    unitName: unitName,
                    selectedUnit: selectedUnitType,
                    conversionFactor: conversionFactor
                });
            }
        }

        // Auto-add current portion if both fields are filled out, or validate if only one field is filled out
        if (newPortion.name?.trim() && newPortion.price !== "" && newPortion.price !== null && newPortion.price !== undefined) {
            const portions = [...(formData.portionPricing || [])];
            if (newPortion.isDefault) {
                portions.forEach(p => p.isDefault = false);
            } else if (portions.length === 0) {
                newPortion.isDefault = true;
            }
            formData.portionPricing = [
                ...portions,
                {
                    ...newPortion,
                    price: parseFloat(newPortion.price),
                    mrp: parseFloat(newPortion.mrp || 0),
                    quantityFactor: parseFloat(newPortion.quantityFactor || 1),
                    openingStock: parseFloat(newPortion.openingStock || 0),
                    barcode: (newPortion.barcode || '').trim(),
                    ingredients: newPortion.ingredients || []
                }
            ];
        } else if (newPortion.name?.trim() || (newPortion.price !== "" && newPortion.price !== null && newPortion.price !== undefined) || (newPortion.mrp !== "" && newPortion.mrp !== null && newPortion.mrp !== undefined)) {
            toast.error("Please enter both variant name and price, or clear the fields.");
            return;
        }

        const { ingredients: _, ...cleanFormData } = formData;

        const userBranch = user?.branchId || user?.branch_id || (user?.branchIds && user.branchIds.length > 0 ? (typeof user.branchIds[0] === 'object' ? user.branchIds[0]._id : user.branchIds[0]) : null);
        const currentBranchId = fixedBranchId || activeBranchId || userBranch || formData.branchId || (branches && branches.length > 0 ? (branches[0]._id || branches[0].id) : null);
        const minStock = parseFloat(formData.minStockAlert) || 0;

        const sanitizedIngredients = (isSeparateStock ? [] : finalIngredients).map(ing => ({
            ...ing,
            rawItemId: toIdString(ing.rawItemId || ing.itemId),
            itemId: toIdString(ing.itemId || ing.rawItemId),
            unitId: toIdString(ing.unitId)
        }));

        const sanitizedPortionPricing = (hasVariants ? (formData.portionPricing || []) : []).map((p) => ({
            ...p,
            price: parseFloat(p.price) || 0,
            mrp: parseFloat(p.mrp) || 0,
            quantityFactor: parseFloat(p.quantityFactor) || 1,
            openingStock: parseFloat(p.openingStock) || 0,
            barcode: (p.barcode || '').trim(),
            ingredients: (p.ingredients || []).map(ing => ({
                ...ing,
                rawItemId: toIdString(ing.rawItemId || ing.itemId),
                itemId: toIdString(ing.itemId || ing.rawItemId),
                unitId: toIdString(ing.unitId)
            }))
        }));

        let resolvedUnitId = toIdString(formData.unitId);
        if (!resolvedUnitId && units && units.length > 0) {
            const defaultUnit = units.find(u => u.isDefault || u.name === 'Pcs' || u.name === 'Pieces') || units[0];
            if (defaultUnit) {
                resolvedUnitId = toIdString(defaultUnit._id || defaultUnit.id);
            }
        }

        const payload = {
            ...cleanFormData,
            unitId: resolvedUnitId,
            secondaryUnitId: toIdString(formData.secondaryUnitId),
            categoryId: toIdString(formData.categoryId),
            brandId: toIdString(formData.brandId),
            supplierId: toIdString(formData.supplierId),
            taxId: toIdString(formData.taxId),
            openingStock: (formData.openingStock !== undefined && formData.openingStock !== null && formData.openingStock !== "") ? parseFloat(formData.openingStock) : undefined,
            shopId: toIdString(currentShopId),
            branchId: toIdString(currentBranchId),
            itemType: activeTab === "menu" ? "MANUFACTURED" : (activeTab === "raw" ? "STOCK" : "TRADE"),
            pricing: {
                purchasePrice: parseFloat(formData.purchasePrice || 0),
                sellingPrice: parseFloat(formData.sellingPrice || 0),
                mrp: parseFloat(formData.mrp || 0)
            },
            stockSettings: {
                stockApplicable: formData.stockApplicable ?? true, 
                minStockAlert: minStock,
                allowNegativeStock: formData.allowNegativeStock ?? false
            },
            tracking: {
                batchTracking: formData.batchTracking ?? false,
                expiryTracking: formData.expiryTracking ?? false,
                serialTracking: formData.serialTracking ?? false
            },
            weightBased: formData.weightBased ?? false,
            isSellable: formData.isSellable ?? true,
            status: formData.status || "ACTIVE",
            ingredients: sanitizedIngredients,
            attributes: itemAttributes,
            inventoryMode: hasVariants ? (formData.inventoryMode || "shared") : "shared",
            portionPricing: sanitizedPortionPricing,
            conversionFactor: parseFloat(formData.conversionFactor) || 1,
            defaultPurchaseUnit: formData.defaultPurchaseUnit || "PRIMARY",
            defaultSalesUnit: formData.defaultSalesUnit || "PRIMARY"
        };

        try {
            let savedItem;
            if (isEditing) {
                savedItem = await itemService.updateItem(id, payload);
            } else {
                savedItem = await itemService.createItem(payload);
            }

            const newItem = { ...savedItem, id: savedItem._id || savedItem.id };
            toast.success(`${newItem.name} saved successfully!`);

            // Update in-memory collections if passed via props, otherwise they will refresh on list page mount
            if (activeTab === "menu" && setMenu && menu) {
                if (isEditing) {
                    setMenu(prev => prev.map((m) => (m.id === id ? newItem : m)));
                } else {
                    setMenu(prev => [newItem, ...prev]);
                }
            } else if ((activeTab === "raw" || activeTab === "trade") && setInventoryItems && inventoryItems) {
                if (isEditing) {
                    setInventoryItems(prev => prev.map((m) => (m.id === id ? newItem : m)));
                } else {
                    setInventoryItems(prev => [newItem, ...prev]);
                }
            }

            if (asDialog && onClose) {
                onClose(newItem);
            } else if (sourcePage === 'purchase' || returnUrl) {
                // Return to source page with the new product and original state
                navigate(returnUrl || '/purchases/new', { 
                    state: { 
                        returnState: returnState,
                        newProduct: newItem 
                    } 
                });
            } else {
                navigate('/inventory', { state: { activeTab: currentTab } });
            }
        } catch (error) {
            console.error("Failed to save product:", error);
            toast.error(getErrorMessage(error, "Failed to save product."));
        }
    };

    const handleReset = () => {
        const defaultIsSellable = activeTab === 'raw' 
            ? settings?.ENABLE_STOCK_ITEMS !== false 
            : (activeTab === 'menu' ? settings?.ENABLE_MANUFACTURED_ITEMS !== false : settings?.ENABLE_TRADE_ITEMS !== false);

        setFormData({
            itemType: activeTab === 'menu' ? 'MANUFACTURED' : (activeTab === 'raw' ? 'STOCK' : 'TRADE'),
            isSellable: defaultIsSellable,
            status: 'ACTIVE',
            stockApplicable: true,
            conversionFactor: 1,
            taxPercent: 0,
            purchasePrice: 0,
            sellingPrice: 0,
            mrp: 0
        });
        setIngredients([]);
        setItemAttributes({});
        setHasVariants(false);
        setShowMaterialUsage(false);
        setErrors({});
        // Barcode will be regenerated by useEffect since formData.barcode is now missing
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setIsCategorySaving(true);
        try {
            const effectiveShopId = currentShopId || user?.shopId || user?.shop_id;
            const res = await categoryService.createCategory({
                name: newCategoryName.trim(),
                shopId: effectiveShopId,
                isActive: true
            });
            const created = res.data || res;
            setCategories(prev => [...prev, created]);
            setFormData(prev => ({ ...prev, categoryId: created._id || created.id }));
            setIsCategoryModalOpen(false);
            setNewCategoryName("");
            toast.success("Category created successfully!");
        } catch (error) {
            console.error("Failed to create category:", error);
            const errMsg = error.response?.data?.message || error.message || "Failed to create category";
            toast.error(errMsg);
        } finally {
            setIsCategorySaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`flex justify-center items-center h-full ${theme.pageBg}`}>
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent flex rounded-full animate-spin"></div>
            </div>
        );
    }

    const manufacturedText = t('INVENTORY', 'add_menu_btn', 'Manufactured Item');
    const title = isEditing
        ? `Edit ${activeTab === 'menu' ? manufacturedText : (activeTab === 'raw' ? 'Stock Item' : 'Trade Item')}`
        : `Add New ${activeTab === 'menu' ? manufacturedText : (activeTab === 'raw' ? 'Stock Item' : 'Trade Item')}`;

    const handleKeyDown = (e) => {
        // If the event was already handled (e.g. by a select toggle), don't move focus
        if (e.defaultPrevented) return;

        // Handle Enter key for navigation
        if (e.key === 'Enter') {
            const active = document.activeElement;
            const tagName = active.tagName.toLowerCase();
            
            // Don't intercept Enter on buttons or textareas
            if (['button', 'textarea'].includes(tagName)) return;
            
            // If it's a search input inside a select, allow default behavior (the select's handleSearchKeyDown will handle Enter/navigation)
            if (active.placeholder === 'Search...') return;

            // Find all eligible focusable elements
            const selector = 'input:not([type="hidden"]), select, [tabindex="0"]';
            const focusables = Array.from(document.querySelectorAll(selector)).filter(el => {
                const style = window.getComputedStyle(el);
                return !el.disabled && el.tabIndex !== -1 && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
            });
            
            const index = focusables.indexOf(active);
            if (index > -1 && index < focusables.length - 1) {
                e.preventDefault();
                const next = focusables[index + 1];
                next.focus();

                // If next is a select, open it
                if (next.classList.contains('common-select-trigger')) {
                    next.click();
                }
            }
        }
    };

    return (
        <div 
            className={`flex flex-col flex-1 min-h-0 ${asDialog ? "" : "h-full"} ${theme.pageBg} overflow-hidden`}
            onKeyDown={handleKeyDown}
        >
            {/* Header Section */}
            <div className={`p-6 md:px-8 border-b ${theme.borderLight} ${theme.surfaceBg} z-10 sticky top-0`}>
                {/* Breadcrumb Navigation - Only for full page */}
                {!asDialog && (
                    <div className={`flex items-center gap-2 mb-6 ${theme.textMuted} text-sm font-bold`}>
                        <Link to="/inventory" className={`hover:${theme.textPrimary} flex items-center gap-1 transition-colors`}>
                            <ArrowLeft size={16} />
                            Inventory
                        </Link>
                        <ChevronRight size={16} />
                        <span className={theme.textPrimary}>{title}</span>
                    </div>
                )}

                <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center ${theme.borderLight} gap-3`}>
                    <div>
                        <h3 className={`text-lg sm:text-2xl font-black ${theme.textHeading}`}>{title}</h3>
                        <p className={`text-xs mt-1 ${theme.textMuted}`}>
                            Fill in the details below to {isEditing ? 'update' : 'create'} this {activeTab === 'menu' ? manufacturedText.toLowerCase() : (activeTab === 'raw' ? 'stock item' : 'trade item')}.
                        </p>
                    </div>

                    {/* ITEM TYPE SWITCHER */}
                    {!isEditing && (asDialog || sourcePage === 'purchase') && (
                        <div className={`flex flex-wrap gap-1 p-1 rounded-2xl shadow-sm border ${theme.borderLight} ${theme.surfaceBg} w-full sm:w-auto`}>
                            {businessTypeData?.features?.sellManufacturedItems !== false && sourcePage !== 'purchase' && canViewMenu !== false && (
                                <button
                                    onClick={() => setCurrentTab('menu')}
                                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${currentTab === 'menu' 
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                                        : `${theme.textMuted} hover:opacity-70`}`}
                                >
                                    <Layers size={13} /> {t('INVENTORY', 'menu_items_tab', 'Manufactured')}
                                </button>
                            )}
                            {canViewItems !== false && (
                                <button
                                    onClick={() => setCurrentTab('raw')}
                                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${currentTab === 'raw' 
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                                        : `${theme.textMuted} hover:opacity-70`}`}
                                >
                                    <Plus size={13} /> Stock
                                </button>
                            )}
                            {businessTypeData?.features?.sellTradeItems !== false && canViewTradeItems !== false && (
                                <button
                                    onClick={() => setCurrentTab('trade')}
                                    className={`flex-1 sm:flex-none px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${currentTab === 'trade' 
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                                        : `${theme.textMuted} hover:opacity-70`}`}
                                >
                                    <Package size={13} /> Trade
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar min-h-0">
                <div className="space-y-12">
                    {/* CORE FIELDS SECTION */}
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Core Details</h4>
                            <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {visibleFields.filter(fk => CORE_FIELD_KEYS.includes(fk)).map(fieldKey => {
                                const field = ALL_FIELDS[fieldKey];
                                if (!field) return null;
                                
                                const isRequired = field.required;

                                // Helper to get options for standard selects
                                let options = field.options || [];
                                if (fieldKey === 'category_id') {
                                    options = categories.map(c => ({ label: c.name, value: c._id }));
                                } else if (fieldKey === 'unit_id' || fieldKey === 'secondary_unit_id') {
                                    options = units.map(u => ({ label: u.name, value: u._id }));
                                } else if (fieldKey === 'tax_percent') {
                                    // Filter taxes based on selected tax type
                                    const filteredTaxes = selectedTaxType 
                                        ? shopTaxes.filter(t => (t.taxType || 'INCLUSIVE').toUpperCase() === selectedTaxType)
                                        : [];
                                    
                                    options = filteredTaxes.map(t => ({
                                        label: `${t.name} (${t.percentage}%)`,
                                        value: t._id
                                    }));
                                } else if (fieldKey === 'item_type') {
                                    options = field.options || ["STOCK", "SERVICE", "MANUFACTURED"];
                                }

                                // Special rendering for tax_percent - show tax type selector first
                                if (fieldKey === 'tax_percent') {
                                    const effectiveBranch = currentBranchData || branches?.find(b => String(b._id || b.id) === String(activeBranchId || fixedBranchId));
                                    const branchCountry = effectiveBranch?.address?.country || organization?.defaultCountry;
                                    const countryVal = typeof branchCountry === 'object' ? (branchCountry?.code || branchCountry?.name) : branchCountry;
                                    const effectiveTaxSystem = branchTaxSystem || effectiveBranch?.taxProfile?.taxSystem || effectiveBranch?.taxConfig?.taxSystem || organization?.defaultTaxSystem;
                                    const isTaxProfileComplete = Boolean(effectiveTaxSystem && countryVal);

                                    if (!isTaxProfileComplete) {
                                        return (
                                            <div key={fieldKey} className="col-span-1 md:col-span-2 lg:col-span-2 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 mt-0.5 shrink-0">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <h5 className={`text-sm font-black ${theme.textHeading}`}>
                                                            Complete profile to add tax data
                                                        </h5>
                                                        <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                                                            Country tax profile is not configured yet. Complete your profile in Organization settings to select your country and tax system before assigning taxes to items.
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (asDialog && onClose) onClose();
                                                        navigate('/organization');
                                                    }}
                                                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm hover:shadow active:scale-95 cursor-pointer shrink-0"
                                                >
                                                    <span>Complete Profile</span>
                                                    <ArrowRight size={14} />
                                                </button>
                                            </div>
                                        );
                                    }

                                    return (
                                        <React.Fragment key={fieldKey}>
                                            {/* Tax Type Selector */}
                                            <div>
                                                <div className="flex items-center justify-between mb-2 ml-1">
                                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest block`}>
                                                        Tax Type <span className="text-red-500">*</span>
                                                    </label>
                                                    {effectiveTaxSystem && (
                                                        <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                                                            {effectiveTaxSystem} {countryVal ? `(${countryVal})` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <CommonSelect
                                                    options={[
                                                        { label: "Inclusive", value: "INCLUSIVE" },
                                                        { label: "Exclusive", value: "EXCLUSIVE" }
                                                    ]}
                                                    value={selectedTaxType}
                                                    onChange={(val) => {
                                                        if (val !== selectedTaxType) {
                                                            setSelectedTaxType(val);
                                                            // Reset tax selection when type changes
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                taxId: "",
                                                                taxPercent: 0
                                                            }));
                                                        }
                                                    }}
                                                    placeholder="Select Tax Type..."
                                                    className="w-full"
                                                />
                                            </div>
                                            
                                            {/* Tax Percentage Selector - only show if tax type is selected */}
                                            {selectedTaxType && (
                                                <div>
                                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                                        {field.label} {isRequired && <span className="text-red-500">*</span>}
                                                    </label>
                                                    <CommonSelect
                                                        options={options}
                                                        value={formData.taxId || ""}
                                                        onChange={(val) => handleChange(fieldKey, val)}
                                                        placeholder={options.length === 0 ? `No ${selectedTaxType.toLowerCase()} taxes available` : `Select ${field.label}...`}
                                                        className="w-full"
                                                        disabled={options.length === 0}
                                                    />
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                }

                                return (
                                    <div key={fieldKey}>
                                        <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                            {field.label} {isRequired && <span className="text-red-500">*</span>}
                                        </label>
                                        
                                        {field.type === 'select' ? (
                                            <CommonSelect
                                                options={options}
                                                value={fieldKey === 'tax_percent' ? (formData.taxId || (formData.taxPercent ? shopTaxes.find(t => t.percentage === formData.taxPercent)?._id : "")) : (formData[field.key] || field.defaultValue || "")}
                                                onChange={(val) => handleChange(fieldKey, val)}
                                                placeholder={`Select ${field.label}...`}
                                                className="w-full"
                                                extraAction={fieldKey === 'category_id' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCategoryModalOpen(true)}
                                                        className={`w-full p-4 text-left ${theme.mode === 'dark' ? 'hover:bg-indigo-900/20' : 'hover:bg-indigo-50'} flex items-center justify-between group transition-colors border-t ${theme.borderLight}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`${theme.mode === 'dark' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-100 text-indigo-600'} p-2 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors`}>
                                                                <Plus size={18} />
                                                            </div>
                                                            <div className={`font-black ${theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Add New Category</div>
                                                        </div>
                                                        <ChevronRight size={18} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all -translate-x-4 group-hover:translate-x-0" />
                                                    </button>
                                                ) : null}
                                            />
                                        ) : fieldKey === 'barcode' ? (
                                            <div className="relative group">
                                                <input
                                                    id="field-input-barcode"
                                                    type="text"
                                                    value={formData[field.key] !== undefined ? formData[field.key] : ""}
                                                    onChange={(e) => handleChange(fieldKey, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className={`w-full p-4 pr-24 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[fieldKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                    placeholder="Scan or enter barcode..."
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBarcodeScan(false)}
                                                        className={`p-2 text-indigo-500 rounded-xl transition-all ${theme.mode === 'dark' ? 'hover:bg-indigo-900/40' : 'hover:bg-indigo-50'}`}
                                                        title="Scan with Scanner"
                                                    >
                                                        <Scan size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={generateItemBarcode}
                                                        className={`p-2 text-emerald-600 rounded-xl transition-all ${theme.mode === 'dark' ? 'hover:bg-emerald-900/40' : 'hover:bg-emerald-50'}`}
                                                        title="Generate Internal Barcode"
                                                    >
                                                        <Barcode size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handlePrintBarcode}
                                                        className={`p-2 text-orange-500 rounded-xl transition-all ${theme.mode === 'dark' ? 'hover:bg-orange-900/40' : 'hover:bg-orange-50'}`}
                                                        title="Print Barcode"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : field.type === 'boolean' ? (
                                            <div className={`w-full p-4 border-2 rounded-2xl flex items-center justify-between transition-all ${errors[fieldKey] ? 'border-red-400 focus:border-red-500' : theme.inputBorder} ${theme.inputBg}`}>
                                                <span className={`text-sm font-bold ${formData[field.key] ? 'text-indigo-600' : theme.textSecondary}`}>
                                                    {formData[field.key] ? 'Yes' : 'No'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); handleChange(fieldKey, !formData[field.key]); }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData[field.key] ? 'bg-indigo-600' : (theme.mode === 'dark' ? 'bg-slate-700' : 'bg-gray-300')}`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData[field.key] ? 'translate-x-6' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                            </div>
                                        ) : (
                                            <input
                                                type={field.type}
                                                onWheel={(e) => field.type === 'number' ? e.target.blur() : null}
                                                value={formData[field.key] !== undefined ? formData[field.key] : ""}
                                                onChange={(e) => handleChange(fieldKey, e.target.value)}
                                                className={`w-full p-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[fieldKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                placeholder={field.placeholder || field.label}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ADVANCED FIELDS TOGGLE */}
                    <div className="flex flex-col gap-8">
                        <button
                            type="button"
                            onClick={() => {
                                if (asDialog) {
                                    // If asDialog is true, navigate to full edit page instead of expanding inline
                                    const path = isEditing ? `/inventory/edit/${id}` : '/inventory/new';
                                    navigate(`${path}?tab=${activeTab}`, { 
                                        state: { 
                                            formData, 
                                            ingredients, 
                                            itemAttributes,
                                            showAdvanced: true,
                                            sourcePage,
                                            returnUrl,
                                            returnState,
                                            currentTab
                                        } 
                                    });
                                    // if(onClose) onClose(); // Removed to allow clean navigation state transfer
                                } else {
                                    setShowAdvanced(!showAdvanced);
                                }
                            }}
                            className={`flex items-center gap-2 text-sm font-black uppercase tracking-wider ${theme.primaryIconText} hover:opacity-80 transition-all w-fit`}
                        >
                            {showAdvanced ? "Hide Advanced Fields" : "Show Advanced Fields"}
                            <ChevronDown size={18} className={`transition-transform duration-300 ${(showAdvanced || asDialog) ? 'rotate-[-90deg]' : ''}`} />
                        </button>

                        {showAdvanced && (
                            <div className="space-y-12 animate-in slide-in-from-top-4 duration-300">
                                {Object.entries(groupedFields).map(([section, fields]) => {
                                    const advancedFieldsInSection = fields.filter(f => {
                                        if (section === 'Units' && f.originalKey === 'unit_id') return true;
                                        return !CORE_FIELD_KEYS.includes(f.originalKey) && f.originalKey !== 'tax_id';
                                    });
                                    
                                    if (advancedFieldsInSection.length === 0) return null;

                                    return (
                                        <div key={section}>
                                            <div className="flex items-center gap-4 mb-8">
                                                <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>{section} Details</h4>
                                                <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                                {advancedFieldsInSection.map(field => {
                                                    // Helper to get options for standard selects
                                                    let options = field.options || [];
                                                    if (field.originalKey === 'category_id') {
                                                        options = categories.map(c => ({ label: c.name, value: c._id }));
                                                    } else if (field.originalKey === 'unit_id' || field.originalKey === 'secondary_unit_id') {
                                                        options = units.map(u => ({ label: u.name, value: u._id }));
                                                    } else if (field.originalKey === 'default_purchase_unit' || field.originalKey === 'default_sales_unit') {
                                                        const priUnit = units.find(u => u._id === formData.unitId)?.name;
                                                        const secUnit = units.find(u => u._id === formData.secondaryUnitId)?.name;
                                                        options = [
                                                            { label: priUnit ? `Primary Unit (${priUnit})` : "Primary Unit (Main / Bigger)", value: "PRIMARY" },
                                                            { label: secUnit ? `Secondary Unit (${secUnit})` : "Secondary Unit (Sub / Smaller)", value: "SECONDARY" }
                                                        ];
                                                    } else if (field.originalKey === 'tax_id') {
                                                        options = shopTaxes.map(t => {
                                                            const typeStr = (t.taxType || 'INCLUSIVE').charAt(0).toUpperCase() + (t.taxType || 'INCLUSIVE').slice(1).toLowerCase();
                                                            return { label: `${t.name} (${t.percentage}% - ${typeStr})`, value: t._id || t.name };
                                                        });
                                                    } else if (field.originalKey === 'item_type') {
                                                        options = field.options || ["STOCK", "SERVICE", "MANUFACTURED"];
                                                    }

                                                    if (hasVariants && isSeparateStock && field.originalKey === 'opening_stock') {
                                                        return (
                                                            <div key={field.originalKey} className={`flex flex-col justify-center p-4 rounded-2xl border-2 border-dashed ${theme.borderLight} ${theme.sectionBg}`}>
                                                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-1 block`}>
                                                                    {field.label}
                                                                </label>
                                                                <p className={`text-xs font-bold ${theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                                    Managed per variant in the Variants section below.
                                                                </p>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div key={field.originalKey} className={field.type === 'textarea' ? 'md:col-span-3' : ''}>
                                                            <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                                            </label>

                                                            {field.type === 'select' ? (
                                                                <CommonSelect
                                                                    options={options}
                                                                    value={field.originalKey === 'tax_percent' ? (formData.taxId || (formData.taxPercent ? shopTaxes.find(t => t.percentage === formData.taxPercent)?._id : "")) : (formData[field.key] || field.defaultValue || "")}
                                                                    onChange={(val) => handleChange(field.originalKey, val)}
                                                                    placeholder={`Select ${field.label}...`}
                                                                    className="w-full"
                                                                />
                                                            ) : field.originalKey === 'barcode' ? (
                                                                <div className="relative group">
                                                                    <input
                                                                        id="field-input-barcode-adv"
                                                                        type="text"
                                                                        value={formData[field.key] !== undefined ? formData[field.key] : ""}
                                                                        onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                                        onFocus={(e) => e.target.select()}
                                                                        className={`w-full p-4 pr-24 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                                        placeholder="Scan or enter barcode..."
                                                                    />
                                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const inp = document.getElementById('field-input-barcode-adv');
                                                                                if (inp) { inp.focus(); toast("Scanner ready."); }
                                                                            }}
                                                                            className={`p-2 text-indigo-500 rounded-xl transition-all ${theme.mode === 'dark' ? 'hover:bg-indigo-900/40' : 'hover:bg-indigo-50'}`}
                                                                            title="Scan with Scanner"
                                                                        >
                                                                            <Scan size={18} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={generateItemBarcode}
                                                                            className={`p-2 text-emerald-600 rounded-xl transition-all ${theme.mode === 'dark' ? 'hover:bg-emerald-900/40' : 'hover:bg-emerald-50'}`}
                                                                            title="Generate Internal Barcode"
                                                                        >
                                                                            <Barcode size={18} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={handlePrintBarcode}
                                                                            className={`p-2 text-orange-500 rounded-xl transition-all ${theme.mode === 'dark' ? 'hover:bg-orange-900/40' : 'hover:bg-orange-50'}`}
                                                                            title="Print Barcode"
                                                                        >
                                                                            <Printer size={18} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : field.type === 'textarea' ? (
                                                                <textarea
                                                                    value={formData[field.key] || ""}
                                                                    onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                                    rows={3}
                                                                    className={`w-full p-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                                />
                                                            ) : field.type === 'boolean' ? (
                                                                <div className={`w-full p-4 border-2 rounded-2xl flex items-center justify-between transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : theme.inputBorder} ${theme.inputBg}`}>
                                                                    <span className={`text-sm font-bold ${formData[field.key] ? 'text-indigo-600' : theme.textSecondary}`}>
                                                                        {formData[field.key] ? 'Yes' : 'No'}
                                                                    </span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); handleChange(field.originalKey, !formData[field.key]); }}
                                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData[field.key] ? 'bg-indigo-600' : (theme.mode === 'dark' ? 'bg-slate-700' : 'bg-gray-300')}`}
                                                                    >
                                                                        <span
                                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData[field.key] ? 'translate-x-6' : 'translate-x-1'}`}
                                                                        />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <input
                                                                        type={field.type}
                                                                        onWheel={(e) => field.type === 'number' ? e.target.blur() : null}
                                                                        value={formData[field.key] !== undefined ? formData[field.key] : ""}
                                                                        onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                                        placeholder={field.placeholder || `Enter ${field.label}...`}
                                                                        className={`w-full p-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                                    />
                                                                    {field.originalKey === 'conversion_factor' && formData.conversionFactor && formData.unitId && formData.secondaryUnitId && (
                                                                        <div className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold w-fit ${
                                                                            theme.mode === 'dark' ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                                        }`}>
                                                                            <span>📦 1 {units.find(u => u._id === formData.unitId)?.name || 'Primary'} = {formData.conversionFactor} {units.find(u => u._id === formData.secondaryUnitId)?.name || 'Secondary'}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {errors[field.originalKey] && (
                                                                <p className="text-red-500 text-xs mt-1 font-bold">{errors[field.originalKey]}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                    {/* DYNAMIC ATTRIBUTES SECTION */}
                    {(() => {
                        const filteredAttrs = dynamicAttributes.filter(attr => {
                            // 1. Filter by Business Type (if both current shop's BT and attribute's BTs are available)
                            if (attr.businessTypes?.length > 0) {
                                if (!currentBusinessType) return false;
                                const attrBTIds = attr.businessTypes.map(bt => String(bt._id || bt));
                                if (!attrBTIds.includes(String(currentBusinessType))) return false;
                            }

                            // 1b. Filter by Business Sub-Type (if set on attribute)
                            if (attr.businessSubTypes?.length > 0) {
                                if (!currentBusinessSubType) return false;
                                const attrBSTIds = attr.businessSubTypes.map(bst => String(bst._id || bst));
                                if (!attrBSTIds.includes(String(currentBusinessSubType))) return false;
                            }

                            // 2. Filter by Category (if attribute is categoryDependent)
                            if (!attr.categoryDependent) return true;
                            const selectedCategoryId = formData.categoryId;
                            const attrCategoryId = attr.categoryId?._id || attr.categoryId;
                            return selectedCategoryId === attrCategoryId;
                        });

                        if (filteredAttrs.length === 0) return null;

                        return (
                            <div className="mt-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Item Attributes</h4>
                                    <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                                </div>
                                <p className={`text-sm ${theme.textMuted} mb-8`}>
                                    Dynamic attributes based on your business type, subtype, or specific shop requirements.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {filteredAttrs.map(attr => (
                                        <div key={attr._id || attr.code} className="flex flex-col gap-2">
                                            <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest block ml-1`}>
                                                {attr.name} {attr.required && <span className="text-red-500">*</span>}
                                            </label>

                                        <div className="flex gap-2">
                                            {attr.dataType === 'SELECT' ? (
                                                <CommonSelect
                                                   options={attr.options || []}
                                                   value={itemAttributes[attr.code]?.value || ""}
                                                   onChange={(val) => handleAttributeChange(attr.code, 'value', val)}
                                                   placeholder={`Select ${attr.name}...`}
                                                   className="w-full"
                                                />
                                            ) : attr.dataType === 'BOOLEAN' ? (
                                                <div className={`w-full p-4 border-2 rounded-2xl flex items-center justify-between transition-all ${theme.inputBorder} ${theme.inputBg}`}>
                                                    <span className={`text-sm font-bold ${itemAttributes[attr.code]?.value ? 'text-blue-600' : theme.textSecondary}`}>
                                                        {itemAttributes[attr.code]?.value ? 'Yes' : 'No'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); handleAttributeChange(attr.code, 'value', !itemAttributes[attr.code]?.value); }}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${itemAttributes[attr.code]?.value ? 'bg-blue-600' : (theme.mode === 'dark' ? 'bg-slate-700' : 'bg-gray-300')}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${itemAttributes[attr.code]?.value ? 'translate-x-6' : 'translate-x-1'}`}
                                                        />
                                                    </button>
                                                </div>
                                            ) : attr.dataType === 'DATE' ? (
                                                <DatePicker
                                                    value={itemAttributes[attr.code]?.value || ""}
                                                    onChange={(val) => handleAttributeChange(attr.code, 'value', val)}
                                                    className={`w-full p-4 border-2 ${theme.inputBorder} outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all focus:border-blue-400 ${attr.requiresUnit ? 'rounded-r-none border-r-0' : 'rounded-r-2xl'}`}
                                                    placeholder={attr.name}
                                                />
                                            ) : (
                                                <input
                                                    type={attr.dataType === 'NUMBER' ? 'number' : 'text'}
                                                    value={itemAttributes[attr.code]?.value || ""}
                                                    onChange={(e) => {
                                                        handleAttributeChange(attr.code, 'value', e.target.value);
                                                        if (attr.requiresUnit && attr.unitId) {
                                                            handleAttributeChange(attr.code, 'unitId', attr.unitId._id);
                                                        }
                                                    }}
                                                    className={`w-full p-4 border-2 ${theme.inputBorder} rounded-l-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all focus:border-blue-400 ${attr.requiresUnit ? 'rounded-r-none border-r-0' : 'rounded-r-2xl'}`}
                                                    placeholder={attr.name}
                                                />
                                            )}

                                            {attr.dataType === 'NUMBER' && attr.requiresUnit && attr.unitId && (
                                                <div className={`flex items-center justify-center ${theme.sectionBg} border-2 border-l-0 ${theme.inputBorder} rounded-r-2xl px-4 text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>
                                                    {attr.unitId.code || attr.unitId.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* VARIANTS */}
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Tag className="text-indigo-500" size={24} />
                            <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Variants</h4>
                            <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                        </div>
                        <label className={`flex items-center gap-3 mb-6 cursor-pointer ${theme.textPrimary}`}>
                            <input
                                type="checkbox"
                                checked={hasVariants}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setHasVariants(checked);
                                    if (!checked) {
                                        setFormData(prev => ({ ...prev, portionPricing: [], inventoryMode: "shared" }));
                                    } else {
                                        setFormData(prev => ({ ...prev, inventoryMode: prev.inventoryMode || "separate" }));
                                    }
                                }}
                                className="accent-indigo-600 w-5 h-5 rounded"
                            />
                            <span className="font-bold text-base">Yes, this product has variants</span>
                        </label>

                        {hasVariants && (
                            <div className="space-y-6">
                                <div>
                                    <p className={`text-xs font-black ${theme.textSecondary} uppercase tracking-widest mb-3`}>
                                        How are variants managed?
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, inventoryMode: "separate" }))}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                isSeparateStock
                                                    ? (theme.mode === 'dark' 
                                                        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-sm' 
                                                        : 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/10 shadow-sm')
                                                    : `${theme.borderLight} ${theme.surfaceBg} hover:border-indigo-300`
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-xl">📦</span>
                                                    <span className={`font-black text-base md:text-lg ${theme.textHeading}`}>
                                                        Each variant has its own stock
                                                    </span>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSeparateStock ? "border-indigo-600 bg-indigo-600" : (theme.mode === 'dark' ? "border-slate-700" : "border-gray-300")}`}>
                                                    {isSeparateStock && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                            </div>
                                            <p className={`text-xs md:text-sm font-semibold mt-1.5 ml-8 ${isSeparateStock ? (theme.mode === 'dark' ? 'text-indigo-300' : 'text-indigo-600') : theme.textMuted}`}>
                                                Example: Shirt S, M, L — independent stock, optional barcode &amp; material usage per variant
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, inventoryMode: "shared" }))}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${
                                                isSharedPortions
                                                    ? (theme.mode === 'dark' 
                                                        ? 'border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/20 shadow-sm' 
                                                        : 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/10 shadow-sm')
                                                    : `${theme.borderLight} ${theme.surfaceBg} hover:border-indigo-300`
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-xl">🍗</span>
                                                    <span className={`font-black text-base md:text-lg ${theme.textHeading}`}>
                                                        Variants are portions of the same stock
                                                    </span>
                                                </div>
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSharedPortions ? "border-indigo-600 bg-indigo-600" : (theme.mode === 'dark' ? "border-slate-700" : "border-gray-300")}`}>
                                                    {isSharedPortions && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                            </div>
                                            <p className={`text-xs md:text-sm font-semibold mt-1.5 ml-8 ${isSharedPortions ? (theme.mode === 'dark' ? 'text-indigo-300' : 'text-indigo-600') : theme.textMuted}`}>
                                                Example: Alfaham Full / Half / Quarter — one shared stock pool with portion factors
                                            </p>
                                        </button>
                                    </div>
                                </div>

                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-end ${isSeparateStock ? 'lg:grid-cols-7' : 'lg:grid-cols-6'}`}>
                                    <div className="lg:col-span-2">
                                        <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>
                                            Variant {isPortionActive && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            value={newPortion.name}
                                            onChange={(e) => setNewPortion({ ...newPortion, name: e.target.value })}
                                            placeholder={isSeparateStock ? "e.g. S, M, L" : "e.g. Full, Half, Quarter"}
                                            className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-500`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>
                                            Price {isPortionActive && <span className="text-red-500">*</span>}
                                        </label>
                                        <input
                                            type="number"
                                            onWheel={(e) => e.target.blur()}
                                            value={newPortion.price}
                                            onChange={(e) => setNewPortion({ ...newPortion, price: e.target.value })}
                                            placeholder="0.00"
                                            className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-500`}
                                        />
                                    </div>
                                    {isSeparateStock ? (
                                        <>
                                            <div>
                                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Opening Stock</label>
                                                <input
                                                    type="number"
                                                    onWheel={(e) => e.target.blur()}
                                                    value={newPortion.openingStock}
                                                    onChange={(e) => setNewPortion({ ...newPortion, openingStock: e.target.value })}
                                                    placeholder="0"
                                                    className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-500`}
                                                />
                                            </div>
                                            <div className="lg:col-span-2">
                                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Barcode (Optional)</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newPortion.barcode}
                                                        onChange={(e) => setNewPortion({ ...newPortion, barcode: e.target.value })}
                                                        placeholder="Auto Generate"
                                                        className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-500`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewPortion({ ...newPortion, barcode: generateVariantBarcodeCode() })}
                                                        className={`px-3.5 rounded-xl border-2 ${theme.inputBorder} ${theme.surfaceBg} ${theme.textPrimary} font-black text-xs uppercase hover:border-indigo-500 hover:text-indigo-600 transition-colors`}
                                                        title="Generate barcode for this variant"
                                                    >
                                                        Auto
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div>
                                            <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Portion Factor</label>
                                            <input
                                                type="number"
                                                onWheel={(e) => e.target.blur()}
                                                value={newPortion.quantityFactor}
                                                onChange={(e) => setNewPortion({ ...newPortion, quantityFactor: parseFloat(e.target.value || 1) })}
                                                placeholder="1 = Full, 0.5 = Half"
                                                className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-500`}
                                                title="How much of the main product this portion uses"
                                            />
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleAddPortion(); }}
                                        className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"
                                        title="Add Variant"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>

                                {formData.portionPricing?.length > 0 && (
                                    <div className={`${theme.surfaceBg} rounded-2xl border ${theme.tableBorder} overflow-hidden shadow-sm`}>
                                        <div className="overflow-x-auto">
                                        <table className="w-full text-left min-w-[640px]">
                                            <thead className={`${theme.tableHeaderBg} text-[10px] uppercase ${theme.tableHeaderText}`}>
                                                <tr>
                                                    <th className="p-4 font-black">Variant</th>
                                                    <th className="p-4 font-black">Price</th>
                                                    {isSeparateStock && <th className="p-4 font-black">Stock</th>}
                                                    {isSeparateStock && <th className="p-4 font-black">Barcode</th>}
                                                    {isSharedPortions && <th className="p-4 font-black">Portion Factor</th>}
                                                    <th className="p-4 font-black text-center">Default</th>
                                                    <th className="p-4 font-black text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className={`text-sm font-bold ${theme.textPrimary}`}>
                                                {formData.portionPricing.map((portion, idx) => (
                                                    <tr key={idx} className={`border-t ${theme.tableBorder} ${theme.tableRowHover} transition-colors`}>
                                                        <td className="p-4">
                                                            <span className="font-extrabold">{portion.name}</span>
                                                        </td>
                                                        <td className="p-4">{formatCurrency(portion.price)}</td>
                                                        {isSeparateStock && (
                                                            <td className="p-3">
                                                                <input
                                                                    type="number"
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={portion.openingStock ?? 0}
                                                                    onChange={(e) => handleUpdatePortion(idx, 'openingStock', e.target.value)}
                                                                    className={`w-24 p-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-lg font-bold text-sm outline-none focus:border-indigo-500`}
                                                                />
                                                            </td>
                                                        )}
                                                        {isSeparateStock && (
                                                            <td className="p-3">
                                                                <div className="flex items-center gap-1.5">
                                                                    <input
                                                                        type="text"
                                                                        value={portion.barcode || ''}
                                                                        onChange={(e) => handleUpdatePortion(idx, 'barcode', e.target.value)}
                                                                        placeholder="Auto Generate"
                                                                        className={`w-36 p-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-lg font-bold text-xs outline-none focus:border-indigo-500`}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        title="Auto Generate Barcode"
                                                                        onClick={() => handleUpdatePortion(idx, 'barcode', generateVariantBarcodeCode())}
                                                                        className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${theme.borderLight} ${theme.surfaceBg} ${theme.textPrimary} hover:border-indigo-500 hover:text-indigo-600 transition-colors`}
                                                                    >
                                                                        Auto
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                        {isSharedPortions && (
                                                            <td className="p-4">
                                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${theme.mode === 'dark' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                                    {portion.quantityFactor || 1}
                                                                </span>
                                                            </td>
                                                        )}
                                                        <td className="p-4 text-center">
                                                            <input
                                                                type="radio"
                                                                checked={portion.isDefault}
                                                                onChange={() => {
                                                                    const updated = formData.portionPricing.map((p, i) => ({
                                                                        ...p,
                                                                        isDefault: i === idx
                                                                    }));
                                                                    setFormData(prev => ({ ...prev, portionPricing: updated }));
                                                                }}
                                                                className="accent-indigo-600 w-4 h-4 cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button
                                                                onClick={() => handleRemovePortion(idx)}
                                                                className="text-red-400 hover:text-red-600 p-1.5 transition-colors"
                                                                title="Remove variant"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                )}

                                {isSeparateStock && (formData.portionPricing || []).length > 0 && (
                                    <div className="flex flex-wrap gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleGenerateAllVariantBarcodes}
                                            className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
                                                theme.mode === 'dark'
                                                    ? 'border-indigo-500/50 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/60 hover:border-indigo-400'
                                                    : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                                            }`}
                                        >
                                            <Barcode size={16} className={theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} /> Generate Variant Barcodes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowMaterialUsage((v) => !v)}
                                            className={`px-4 py-2.5 rounded-xl border-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm ${
                                                showMaterialUsage
                                                    ? (theme.mode === 'dark'
                                                        ? 'border-orange-500/60 bg-orange-950/60 text-orange-300'
                                                        : 'border-orange-300 bg-orange-50 text-orange-700 shadow-orange-100')
                                                    : `${theme.borderLight} ${theme.surfaceBg} ${theme.textPrimary} hover:border-orange-400 hover:text-orange-600`
                                            }`}
                                        >
                                            <Settings size={16} className={showMaterialUsage ? (theme.mode === 'dark' ? 'text-orange-400' : 'text-orange-600') : 'text-orange-500'} /> Material Usage {showMaterialUsage ? "▲" : "▼"}
                                        </button>
                                    </div>
                                )}

                                {isSeparateStock && showMaterialUsage && (
                                    <div className={`rounded-2xl border-2 ${theme.tableBorder} ${theme.surfaceBg} p-5 space-y-6 shadow-sm`}>
                                        <div>
                                            <h5 className={`font-black text-base ${theme.textHeading} flex items-center gap-2`}>
                                                <Settings size={18} className="text-orange-500" /> Material Usage
                                            </h5>
                                            <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                                                Optional raw materials or fabrics consumed per variant (e.g. Cloth → 2 meters).
                                            </p>
                                        </div>

                                        <div className="space-y-6">
                                            {(formData.portionPricing || []).map((portion, idx) => {
                                                const draft = variantBomDraft[idx] || {};
                                                const ingredients = portion.ingredients || [];
                                                return (
                                                    <div key={idx} className={`border ${theme.borderLight} rounded-2xl p-4 ${theme.sectionBg}`}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                                                                theme.mode === 'dark' 
                                                                    ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50' 
                                                                    : 'bg-indigo-100 text-indigo-700'
                                                            }`}>
                                                                {portion.name}
                                                            </span>
                                                            <span className={`text-[11px] font-bold ${theme.textMuted}`}>
                                                                {ingredients.length} material{ingredients.length === 1 ? '' : 's'} linked
                                                            </span>
                                                        </div>

                                                        {/* Tree view of materials */}
                                                        <div className="space-y-2 mb-3">
                                                            {ingredients.length === 0 ? (
                                                                <div className={`text-xs font-mono pl-2 ${theme.textMuted}`}>
                                                                    └── No materials added yet (optional)
                                                                </div>
                                                            ) : (
                                                                ingredients.map((ing, ingIdx) => (
                                                                    <div key={ingIdx} className={`flex items-center justify-between py-2 px-3.5 rounded-xl text-xs font-bold ${theme.surfaceBg} border ${theme.borderLight}`}>
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className={`font-mono ${theme.mode === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>└──</span>
                                                                            <span className={theme.textPrimary}>{ing.name}</span>
                                                                            <span className={theme.textMuted}>→</span>
                                                                            <span className={theme.mode === 'dark' ? 'text-indigo-400 font-extrabold' : 'text-indigo-600 font-extrabold'}>
                                                                                {ing.quantity} {ing.unitName}
                                                                                {ing.selectedUnit === 'SECONDARY' && ing.conversionFactor > 1 && (
                                                                                    <span className="text-[10px] text-gray-400 font-normal ml-1">
                                                                                        (= {(ing.quantity / ing.conversionFactor).toFixed(3)} Primary Units)
                                                                                    </span>
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleUpdatePortion(idx, 'ingredients', ingredients.filter((_, i) => i !== ingIdx))}
                                                                            className="text-red-400 hover:text-red-600 p-1 transition-colors"
                                                                            title="Remove material"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>

                                                        {/* Add material row */}
                                                        <div className={`flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center pt-3 border-t border-dashed ${theme.borderLight}`}>
                                                            <div className="flex-1 min-w-[200px]">
                                                                <CommonSelect
                                                                    options={stockItems.map(item => ({
                                                                        label: `${item.name} (${item.unitId?.name || "N/A"})`,
                                                                        value: item._id || item.id
                                                                    }))}
                                                                    value={draft.itemId || ''}
                                                                    onChange={(val) => {
                                                                        const availUnits = getAvailableUnitsForItem(val, stockItems, units);
                                                                        const defaultUnitId = availUnits.length > 0 ? availUnits[0].value : '';
                                                                        setVariantBomDraft(prev => ({ ...prev, [idx]: { ...prev[idx], itemId: val, unitId: defaultUnitId } }));
                                                                    }}
                                                                    placeholder="Select material..."
                                                                    triggerClassName={`h-11 flex items-center justify-between px-3.5 border-2 rounded-xl text-xs ${theme.inputBorder}`}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    onWheel={(e) => e.target.blur()}
                                                                    value={draft.quantity || ''}
                                                                    onChange={(e) => setVariantBomDraft(prev => ({ ...prev, [idx]: { ...prev[idx], quantity: e.target.value } }))}
                                                                    placeholder="Qty"
                                                                    className={`w-24 h-11 px-3 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold text-xs outline-none focus:border-orange-400`}
                                                                />
                                                                <div className="w-44 sm:w-48">
                                                                    <CommonSelect
                                                                        options={getAvailableUnitsForItem(draft.itemId, stockItems, units)}
                                                                        value={draft.unitId || ''}
                                                                        onChange={(val) => setVariantBomDraft(prev => ({ ...prev, [idx]: { ...prev[idx], unitId: val } }))}
                                                                        placeholder={draft.itemId ? "Select Unit" : "Select material first"}
                                                                        disabled={!draft.itemId}
                                                                        triggerClassName={`h-11 flex items-center justify-between px-3.5 border-2 rounded-xl text-xs ${theme.inputBorder}`}
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddVariantIngredient(idx)}
                                                                    className="h-11 w-11 shrink-0 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-all shadow-sm flex items-center justify-center active:scale-95"
                                                                    title="Add material to variant"
                                                                >
                                                                    <Plus size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Product-level materials for items without separate-variant stock */}
                    {showRecipe && !isSeparateStock && (
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <ClipboardList className="text-orange-500" size={24} />
                                <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Bill of Materials</h4>
                                <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                            </div>
                            <p className={`text-sm ${theme.textMuted} mb-8`}>Define what stock items are used to create this manufactured product.</p>

                            <div className={`grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6 p-4 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg}`}>
                                {/* Stock Item — 6 cols */}
                                <div className="sm:col-span-6">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-1.5 block`}>Stock Item</label>
                                    <CommonSelect
                                        options={stockItems.map(item => ({ 
                                            label: `${item.name} (${item.unitId?.name || "N/A"})`, 
                                            value: item._id || item.id 
                                        }))}
                                        value={selectedRawItem}
                                        onChange={(val) => {
                                            setSelectedRawItem(val);
                                            const availUnits = getAvailableUnitsForItem(val, stockItems, units);
                                            const defaultUnitId = availUnits.length > 0 ? availUnits[0].value : '';
                                            setIngredientUnitId(defaultUnitId);
                                        }}
                                        placeholder="Select Stock Item..."
                                        className="w-full"
                                        triggerClassName={`h-11 flex items-center justify-between px-3.5 border-2 rounded-xl text-xs ${theme.inputBorder}`}
                                    />
                                </div>
                                {/* Qty — 2 cols */}
                                <div className="sm:col-span-2">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-1.5 block`}>Qty</label>
                                    <input
                                        type="number"
                                        onWheel={(e) => e.target.blur()}
                                        value={ingredientQty}
                                        onChange={(e) => setIngredientQty(e.target.value)}
                                        placeholder="0"
                                        className={`w-full h-11 px-3 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-orange-400 text-xs`}
                                    />
                                </div>
                                {/* Unit — 3 cols */}
                                <div className="sm:col-span-3">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-1.5 block`}>Unit</label>
                                    <CommonSelect
                                        options={getAvailableUnitsForItem(selectedRawItem, stockItems, units)}
                                        value={ingredientUnitId}
                                        onChange={(val) => setIngredientUnitId(val)}
                                        placeholder={selectedRawItem ? "Select Unit" : "Select material first"}
                                        disabled={!selectedRawItem}
                                        className="w-full"
                                        triggerClassName={`h-11 flex items-center justify-between px-3.5 border-2 rounded-xl text-xs ${theme.inputBorder}`}
                                    />
                                </div>
                                {/* Add button — 1 col */}
                                <div className="sm:col-span-1 flex flex-col justify-end">
                                    <button
                                        onClick={(e) => { e.preventDefault(); handleAddIngredient(); }}
                                        className="h-11 w-full bg-orange-500 text-white rounded-xl shadow-md hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center"
                                        title="Add material"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            {ingredients.length > 0 && (
                                <div className={`${theme.surfaceBg} rounded-2xl border ${theme.tableBorder} overflow-hidden mt-4`}>
                                    <table className="w-full text-left">
                                        <thead className={`${theme.tableHeaderBg} text-[10px] uppercase ${theme.tableHeaderText}`}>
                                            <tr>
                                                <th className="p-3 font-black">Item</th>
                                                <th className="p-3 font-black">Qty</th>
                                                <th className="p-3 font-black">Unit</th>
                                                <th className="p-3 font-black text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`text-sm font-bold ${theme.textPrimary}`}>
                                            {ingredients.map((ing, idx) => (
                                                <tr key={idx} className={`border-t ${theme.tableBorder}`}>
                                                    <td className="p-3">{ing.name}</td>
                                                    <td className="p-3">{ing.quantity}</td>
                                                    <td className={`p-3 ${theme.textMuted}`}>
                                                        {ing.unitName}
                                                        {ing.selectedUnit === 'SECONDARY' && ing.conversionFactor > 1 && (
                                                            <span className="text-[10px] text-gray-400 font-normal ml-1.5">
                                                                (1 Pri = {ing.conversionFactor} {ing.unitName})
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveIngredient(idx)}
                                                            className="text-red-400 hover:text-red-600 p-1"
                                                            title="Remove material"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>

            {/* Sticky Footer */}
            <div className={`flex flex-row gap-2 p-3 sm:p-6 md:px-8 border-t ${theme.borderLight} ${theme.surfaceBg} shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 shrink-0`}>
                <button
                    onClick={() => asDialog && onClose ? onClose() : navigate('/inventory', { state: { activeTab: currentTab } })}
                    className={`flex-1 py-2.5 sm:py-4 font-black text-xs sm:text-base ${theme.textPrimary} hover:opacity-80 transition-opacity border-2 ${theme.borderLight} ${theme.surfaceBg} rounded-[20px]`}
                >
                    {asDialog ? "Cancel" : "Discard"}
                </button>
                <button
                    onClick={handleSubmit}
                    className={`flex-[2] py-2.5 sm:py-4 ${theme.buttonBg} ${theme.buttonText} rounded-[20px] font-black shadow-lg shadow-indigo-500/20 ${theme.buttonHoverBg} active:scale-95 transition-all flex items-center justify-center gap-1.5 text-sm sm:text-lg`}
                >
                    <Save size={16} className="sm:w-5 sm:h-5" />
                    {isEditing ? "Update Product" : "Save Product"}
                </button>
            </div>


            {/* Create Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className={`w-full max-w-md ${theme.surfaceBg} rounded-[32px] shadow-2xl p-8 relative animate-in zoom-in duration-200`}>
                        <h2 className={`text-2xl font-black ${theme.textHeading} mb-2`}>New Category</h2>
                        <p className={`text-sm ${theme.textSecondary} mb-8 font-medium`}>Create a new category for your products.</p>
                        
                        <form onSubmit={handleCreateCategory} className="space-y-6">
                            <div className="space-y-2">
                                <label className={`text-xs font-black uppercase text-gray-400 ml-1`}>Category Name</label>
                                <input
                                    autoFocus
                                    required
                                    className={`w-full p-4 border-2 rounded-2xl outline-none font-bold transition-all ${theme.inputBg} ${theme.textPrimary} ${theme.inputBorder} focus:border-indigo-500`}
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    placeholder="e.g. Cold Beverages"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryModalOpen(false)}
                                    className={`px-6 py-3 rounded-xl font-bold ${theme.textSecondary} hover:${theme.inputBg.replace('bg-', '')} transition-colors`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCategorySaving || !newCategoryName.trim()}
                                    className={`${theme.buttonBg} ${theme.buttonText} px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-200`}
                                >
                                    {isCategorySaving ? "Saving..." : "Create Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Barcode Print Dialog */}
            <BarcodePrintDialog
                isOpen={barcodePrintDialog.isOpen}
                onClose={() => setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }))}
                dialogState={barcodePrintDialog}
                setDialogState={setBarcodePrintDialog}
                onConfirmPrint={handleConfirmBarcodePrint}
            />
        </div>
    );
};

export default ProductPage;
