import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ALL_FIELDS } from '../../config/itemFields';
import { ChevronRight, Save, X, Plus, Trash2, ArrowLeft, ClipboardList, ChevronDown, Package, FilePlus, Barcode, Scan, Printer, Tag } from 'lucide-react';
import { api, attributeService, unitService, shopService, categoryService, itemService, branchService, taxService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { SupplierService } from '../Suppliers/SupplierService';
import { toast } from 'react-hot-toast';
import DatePicker from '../../components/ui/DatePicker';
import CommonSelect from '../../components/ui/CommonSelect';
import Modal from '../../components/ui/Modal';

const ProductPage = ({ menu, setMenu, inventoryItems, setInventoryItems, asDialog, onClose, fixedBranchId, prefillData, activeTabOverride, id: propId, sourcePage: propSourcePage, returnState: propReturnState, returnUrl: propReturnUrl }) => {
    const { user } = useAuth();
    const { activeBranchId, branches, organization, currentShopId, businessTypeData } = useApp();
    const { theme } = useTheme();
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

    // Dynamic Attributes & Units
    const [dynamicAttributes, setDynamicAttributes] = useState([]);
    const [units, setUnits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [itemAttributes, setItemAttributes] = useState(location.state?.itemAttributes || {});
    const [ingredients, setIngredients] = useState(location.state?.ingredients || []);
    const [shopTaxes, setShopTaxes] = useState([]);
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
        isDefault: false
    });

    const CORE_FIELD_KEYS = asDialog 
        ? ["barcode", "name", "category_id", "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "item_type", "is_sellable"]
        : ["barcode", "name", "category_id", "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "item_type", "is_sellable"];

    // Determine visible fields based on activeTab
    const getVisibleFields = () => {
        let fields = [];
        if (activeTab === "menu") {
            fields = [
                "barcode", "item_code", "name", "description", "category_id",
                "unit_id", "selling_price", "mrp", "tax_percent", "hsn_sac_code", "stock_applicable",
                "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking"
            ];
        } else if (activeTab === "raw") {
            fields = [
                "barcode", "item_code", "name", "description", "category_id",
                "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "hsn_sac_code",
                "stock_applicable", "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking", "is_sellable"
            ];
        } else {
            // Trade tab
            fields = [
                "barcode", "item_code", "name", "description", "category_id",
                "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "hsn_sac_code",
                "stock_applicable", "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking", "status"
            ];
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
                    parts.push(`<div class="slot line price">${showPriceLabel ? 'Price: ' : ''}₹${Number(item.sellingPrice).toFixed(2)}</div>`);
                }
                if (key === "mrp" && includeMRP && item?.mrp != null) {
                    parts.push(`<div class="slot line mrp">${showMRPLabel ? 'MRP: ' : ''}₹${Number(item.mrp).toFixed(2)}</div>`);
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
            toast.info("Scanner ready. Please scan your item.");
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
                        categoryId: full.categoryId?._id || full.categoryId,
                        unitId: full.unitId?._id || full.unitId,
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
                        portionPricing: full.portionPricing || []
                    };
                    setFormData(flat);
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
    }, [id, isEditing]);

    useEffect(() => {
        if (!isEditing && !formData.barcode && !isLoading) {
            generateItemBarcode();
        }
    }, [isEditing, isLoading, formData.barcode]);
 
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
                isSellable: true,
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

                const results = await Promise.all(promises);
                const attrsRes = results[0];
                const unitsRes = results[1];
                const categoriesRes = results[2];
                const suppliersRes = results[3];
                const taxesRes = results[4];

                if (branchIdToUse && currentShopId) {
                    try {
                        const branchesData = await branchService.getBranchesByShopId(currentShopId);
                        const currBranch = branchesData.find(b => String(b._id) === String(branchIdToUse));
                        if (currBranch && currBranch.taxProfile && currBranch.taxProfile.taxSystem) {
                            const system = currBranch.taxProfile.taxSystem;
                            setIsGSTApplicable(system === 'GST');
                            setBranchTaxSystem(system);
                            setFormData(prev => ({
                                ...prev,
                                taxId: prev.taxId || system
                            }));
                        }
                    } catch (err) {
                        console.error("Failed to load branch tax rules:", err);
                    }
                }

                setDynamicAttributes(attrsRes.filter(a => a.isActive !== false));
                setUnits(unitsRes);
                setCategories(categoriesRes.filter(c => c.isActive !== false));

                const suppliersData = Array.isArray(suppliersRes) ? suppliersRes : (suppliersRes.data || []);
                setSuppliers(suppliersData);
                setShopTaxes(taxesRes.filter(t => t.isActive !== false));
            } catch (error) {
                console.error("Failed to load attributes/units", error);
            }
        };

        const fetchStockItems = async () => {
            if (showRecipe && currentShopId) {
                try {
                    const response = await itemService.getItems({
                        limit: 1000,
                        filters: {
                            shopId: currentShopId,
                            branchId: activeBranchId || undefined,
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
    }, [currentShopId, activeBranchId, showRecipe]);


    // Recipe / Ingredients State
    const [selectedRawItem, setSelectedRawItem] = useState("");
    const [ingredientQty, setIngredientQty] = useState("");
    const [ingredientUnitId, setIngredientUnitId] = useState("");

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
        } else if (fieldKey === "unit_id") {
            options = units.map(u => ({ label: u.name || u.code, value: u._id }));
        } else if (fieldKey === "tax_percent") {
            options = shopTaxes.map(t => {
                const typeStr = (t.taxType || 'INCLUSIVE').charAt(0).toUpperCase() + (t.taxType || 'INCLUSIVE').slice(1).toLowerCase();
                return { label: `${t.name} (${t.percentage}% - ${typeStr})`, value: t._id };
            });
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

        const rawItem = stockItems.find(i => i._id === selectedRawItem || i.id === selectedRawItem);
        if (!rawItem) return;

        const selectedUnitObj = units.find(u => u._id === ingredientUnitId || u.id === ingredientUnitId);
        const unitName = selectedUnitObj ? selectedUnitObj.name : 'Unknown';

        const itemId = rawItem._id || rawItem.id;

        const newIngredient = {
            rawItemId: itemId,
            itemId: itemId,
            name: rawItem.name,
            quantity: parseFloat(ingredientQty),
            unitId: ingredientUnitId,
            unitName: unitName,
        };

        setIngredients([...ingredients, newIngredient]);
        setSelectedRawItem("");
        setIngredientQty("");
        setIngredientUnitId("");
    };

    const handleRemoveIngredient = (index) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleAddPortion = () => {
        if (!newPortion.name || !newPortion.price) {
            toast.error("Portion name and price are required");
            return;
        }

        const portions = [...(formData.portionPricing || [])];
        
        // If this is set as default, unset other defaults
        if (newPortion.isDefault) {
            portions.forEach(p => p.isDefault = false);
        } else if (portions.length === 0) {
            // First portion is default by default if not specified
            newPortion.isDefault = true;
        }

        setFormData(prev => ({
            ...prev,
            portionPricing: [...portions, { ...newPortion, price: parseFloat(newPortion.price), mrp: parseFloat(newPortion.mrp || 0) }]
        }));

        setNewPortion({
            name: "",
            code: "",
            quantityFactor: 1,
            price: "",
            mrp: "",
            isDefault: false
        });
    };

    const handleRemovePortion = (index) => {
        setFormData(prev => ({
            ...prev,
            portionPricing: prev.portionPricing.filter((_, i) => i !== index)
        }));
    };

    const validate = () => {
        const newErrors = {};
        visibleFields.forEach(fieldKey => {
            const field = ALL_FIELDS[fieldKey];
            if (!field) return;

            const value = formData[field.key];
            if (field.required && (value === undefined || value === "" || value === null)) {
                newErrors[fieldKey] = `${field.label} is required`;
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        let finalIngredients = [...ingredients];
        // Auto-add current ingredient if fields are filled but "Plus" wasn't clicked
        if (selectedRawItem && ingredientQty && ingredientUnitId) {
            const rawItem = stockItems.find(i => i._id === selectedRawItem || i.id === selectedRawItem);
            if (rawItem) {
                const selectedUnitObj = units.find(u => u._id === ingredientUnitId || u.id === ingredientUnitId);
                const unitName = selectedUnitObj ? selectedUnitObj.name : 'Unknown';
                const itemId = rawItem._id || rawItem.id;

                finalIngredients.push({
                    rawItemId: itemId,
                    itemId: itemId,
                    name: rawItem.name,
                    quantity: parseFloat(ingredientQty),
                    unitId: ingredientUnitId,
                    unitName: unitName,
                });
            }
        }

        const { ingredients: _, ...cleanFormData } = formData;

        const currentBranchId = fixedBranchId || activeBranchId || (user?.branchIds && user.branchIds.length > 0 ? user.branchIds[0] : formData.branchId);

        const minStock = parseFloat(formData.minStockAlert) || 0;

        const payload = {
            ...cleanFormData,
            shopId: currentShopId,
            branchId: currentBranchId,
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
            ingredients: finalIngredients,
            attributes: itemAttributes,
            portionPricing: formData.portionPricing || []
        };

        try {
            let savedItem;
            if (isEditing) {
                savedItem = await itemService.updateItem(id, payload);
            } else {
                savedItem = await itemService.createItem(payload);
            }

            const newItem = { ...savedItem, id: savedItem._id || savedItem.id };

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
                navigate('/inventory');
            }
        } catch (error) {
            console.error("Failed to save product:", error);
            toast.error("Failed to save product. Please check console for details.");
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setIsCategorySaving(true);
        try {
            const res = await categoryService.createCategory({
                name: newCategoryName,
                shopId: user.shop_id,
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
            toast.error("Failed to create category");
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

    const title = isEditing
        ? `Edit ${activeTab === 'menu' ? 'Manufactured Item' : (activeTab === 'raw' ? 'Stock Item' : 'Trade Item')}`
        : `Add New ${activeTab === 'menu' ? 'Manufactured Item' : (activeTab === 'raw' ? 'Stock Item' : 'Trade Item')}`;

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
            className={`flex flex-col ${asDialog ? "h-full max-h-screen" : "h-full"} ${theme.pageBg} overflow-hidden`}
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

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-gray-100 dark:border-gray-800 gap-6">
                    <div>
                        <h3 className={`text-2xl font-black ${theme.textHeading}`}>{title}</h3>
                        <p className={`text-xs mt-1 ${theme.textMuted}`}>
                            Fill in the details below to {isEditing ? 'update' : 'create'} this {activeTab === 'menu' ? 'manufactured item' : (activeTab === 'raw' ? 'stock item' : 'trade item')}.
                        </p>
                    </div>

                    {/* ITEM TYPE SWITCHER */}
                    {!isEditing && sourcePage === 'purchase' && businessTypeData?.features?.sellTradeItems !== false && (
                        <div className={`flex p-1 rounded-2xl shadow-sm border ${theme.borderLight} ${theme.surfaceBg}`}>
                            <button
                                onClick={() => setCurrentTab('raw')}
                                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'raw' 
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/20' 
                                    : `${theme.textMuted} hover:opacity-70`}`}
                            >
                                <Plus size={16} /> Stock Item
                            </button>
                            <button
                                onClick={() => setCurrentTab('trade')}
                                className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${currentTab === 'trade' 
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20' 
                                    : `${theme.textMuted} hover:opacity-70`}`}
                            >
                                <Package size={16} /> Trade Item
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className={`flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar`}>
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
                                } else if (fieldKey === 'unit_id') {
                                    options = units.map(u => ({ label: u.name, value: u._id }));
                                } else if (fieldKey === 'tax_percent') {
                                    options = shopTaxes.map(t => {
                                        const typeStr = (t.taxType || 'INCLUSIVE').charAt(0).toUpperCase() + (t.taxType || 'INCLUSIVE').slice(1).toLowerCase();
                                        return { label: `${t.name} (${t.percentage}% - ${typeStr})`, value: t._id };
                                    });
                                } else if (fieldKey === 'item_type') {
                                    options = field.options || ["STOCK", "SERVICE", "MANUFACTURED"];
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
                                                        className={`w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors border-t ${theme.borderLight}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-100 dark:bg-indigo-900/40 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                <Plus size={18} />
                                                            </div>
                                                            <div className="font-black text-indigo-600 dark:text-indigo-400">Add New Category</div>
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
                                                    className={`w-full p-4 pr-24 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[fieldKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                    placeholder="Scan or enter barcode..."
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBarcodeScan(false)}
                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                                                        title="Scan with Scanner"
                                                    >
                                                        <Scan size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={generateItemBarcode}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-xl transition-all"
                                                        title="Generate Internal Barcode"
                                                    >
                                                        <Barcode size={18} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handlePrintBarcode}
                                                        className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/40 rounded-xl transition-all"
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
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData[field.key] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData[field.key] ? 'translate-x-6' : 'translate-x-1'}`}
                                                    />
                                                </button>
                                            </div>
                                        ) : (
                                            <input
                                                type={field.type}
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
                                    // Filter fields that are NOT in CORE_FIELD_KEYS and filter redundant tax_id duplicate
                                    const advancedFieldsInSection = fields.filter(f => !CORE_FIELD_KEYS.includes(f.originalKey) && f.originalKey !== 'tax_id');
                                    
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
                                                    } else if (field.originalKey === 'unit_id') {
                                                        options = units.map(u => ({ label: u.name, value: u._id }));
                                                    } else if (field.originalKey === 'tax_id') {
                                                        options = shopTaxes.map(t => {
                                                            const typeStr = (t.taxType || 'INCLUSIVE').charAt(0).toUpperCase() + (t.taxType || 'INCLUSIVE').slice(1).toLowerCase();
                                                            return { label: `${t.name} (${t.percentage}% - ${typeStr})`, value: t._id || t.name };
                                                        });
                                                    } else if (field.originalKey === 'item_type') {
                                                        options = field.options || ["STOCK", "SERVICE", "MANUFACTURED"];
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
                                                                    className={`w-full p-4 pr-24 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                                    placeholder="Scan or enter barcode..."
                                                                />
                                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const inp = document.getElementById('field-input-barcode-adv');
                                                                            if (inp) { inp.focus(); toast.info("Scanner ready."); }
                                                                        }}
                                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-xl transition-all"
                                                                        title="Scan with Scanner"
                                                                    >
                                                                        <Scan size={18} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={generateItemBarcode}
                                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-xl transition-all"
                                                                        title="Generate Internal Barcode"
                                                                    >
                                                                        <Barcode size={18} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handlePrintBarcode}
                                                                        className="p-2 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/40 rounded-xl transition-all"
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
                                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData[field.key] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}`}
                                                                >
                                                                    <span
                                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData[field.key] ? 'translate-x-6' : 'translate-x-1'}`}
                                                                    />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <input
                                                                type={field.type}
                                                                value={formData[field.key] !== undefined ? formData[field.key] : ""}
                                                                onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                                className={`w-full p-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                                placeholder={field.placeholder || field.label}
                                                            />
                                                        )}
                                                        {errors[field.originalKey] && (
                                                            <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors[field.originalKey]}</p>
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
                    </div>

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
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${itemAttributes[attr.code]?.value ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'}`}
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

                    {/* NEW RECIPE SECTION */}
                    {showRecipe && (
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <ClipboardList className="text-orange-500" size={24} />
                                <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Bill of Materials</h4>
                                <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                            </div>
                            <p className={`text-sm ${theme.textMuted} mb-8`}>Define what stock items are used to create this manufactured product.</p>

                            <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                                <div className="flex-1">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Stock Item</label>
                                    <CommonSelect
                                        options={stockItems.map(item => ({ 
                                            label: `${item.name} (${item.unitId?.name || "N/A"})`, 
                                            value: item._id || item.id 
                                        }))}
                                        value={selectedRawItem}
                                        onChange={(val) => {
                                            setSelectedRawItem(val);
                                            const item = stockItems.find(i => (i._id || i.id) === val);
                                            if (item && item.unitId) {
                                                setIngredientUnitId(item.unitId._id || item.unitId);
                                            }
                                        }}
                                        placeholder="Select Stock Item..."
                                        className="w-full"
                                    />
                                </div>
                                <div className="w-full md:w-32">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Qty</label>
                                    <input
                                        type="number"
                                        value={ingredientQty}
                                        onChange={(e) => setIngredientQty(e.target.value)}
                                        placeholder="0"
                                        className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-orange-400`}
                                    />
                                </div>
                                <div className="w-full md:w-40">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Unit</label>
                                    <CommonSelect
                                        options={units.map(u => ({ label: u.name, value: u._id }))}
                                        value={ingredientUnitId}
                                        onChange={(val) => setIngredientUnitId(val)}
                                        placeholder="Unit..."
                                        className="w-full"
                                    />
                                </div>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleAddIngredient(); }}
                                    className="p-3 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-200/20 hover:bg-orange-600 active:scale-95 transition-all"
                                >
                                    <Plus size={24} />
                                </button>
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
                                                    <td className={`p-3 ${theme.textMuted}`}>{ing.unitName}</td>
                                                    <td className="p-3 text-right">
                                                        <button
                                                            onClick={() => handleRemoveIngredient(idx)}
                                                            className="text-red-400 hover:text-red-600 p-1"
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

                    {/* PORTION PRICING SECTION */}
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <Tag className="text-indigo-500" size={24} />
                            <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Portion / Variant Pricing</h4>
                            <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                        </div>
                        <p className={`text-sm ${theme.textMuted} mb-8`}>Add variations like Full, Half, or Regular/Large with specific pricing and stock deduction factors.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6 items-end">
                            <div className="lg:col-span-2">
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Portion Name *</label>
                                <input
                                    type="text"
                                    value={newPortion.name}
                                    onChange={(e) => setNewPortion({ ...newPortion, name: e.target.value })}
                                    placeholder="e.g. Full, Half, Large"
                                    className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-400`}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Price *</label>
                                <input
                                    type="number"
                                    value={newPortion.price}
                                    onChange={(e) => setNewPortion({ ...newPortion, price: e.target.value })}
                                    placeholder="0.00"
                                    className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-400`}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>MRP</label>
                                <input
                                    type="number"
                                    value={newPortion.mrp}
                                    onChange={(e) => setNewPortion({ ...newPortion, mrp: e.target.value })}
                                    placeholder="0.00"
                                    className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-400`}
                                />
                            </div>
                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Qty Factor</label>
                                <input
                                    type="number"
                                    value={newPortion.quantityFactor}
                                    onChange={(e) => setNewPortion({ ...newPortion, quantityFactor: parseFloat(e.target.value || 1) })}
                                    placeholder="1.0"
                                    className={`w-full p-4 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-indigo-400`}
                                    title="Stock deduction multiplier (e.g. 0.5 for Half)"
                                />
                            </div>
                            <button
                                onClick={(e) => { e.preventDefault(); handleAddPortion(); }}
                                className="p-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"
                            >
                                <Plus size={24} />
                            </button>
                        </div>

                        {formData.portionPricing?.length > 0 && (
                            <div className={`${theme.surfaceBg} rounded-2xl border ${theme.tableBorder} overflow-hidden mt-4`}>
                                <table className="w-full text-left">
                                    <thead className={`${theme.tableHeaderBg} text-[10px] uppercase ${theme.tableHeaderText}`}>
                                        <tr>
                                            <th className="p-4 font-black">Portion Name</th>
                                            <th className="p-4 font-black">Stock Factor</th>
                                            <th className="p-4 font-black">Price</th>
                                            <th className="p-4 font-black">MRP</th>
                                            <th className="p-4 font-black text-center">Default</th>
                                            <th className="p-4 font-black text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`text-sm font-bold ${theme.textPrimary}`}>
                                        {formData.portionPricing.map((portion, idx) => (
                                            <tr key={idx} className={`border-t ${theme.tableBorder}`}>
                                                <td className="p-4">{portion.name}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${theme.mode === 'dark' ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                                                        x{portion.quantityFactor}
                                                    </span>
                                                </td>
                                                <td className="p-4">₹{portion.price}</td>
                                                <td className="p-4 text-gray-400">₹{portion.mrp || 0}</td>
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
                                                        className="accent-indigo-600 w-4 h-4"
                                                    />
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleRemovePortion(idx)}
                                                        className="text-red-400 hover:text-red-600 p-1"
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
                </div>
            </div>

            {/* Sticky Footer */}
            <div className={`flex gap-4 p-6 md:px-8 border-t ${theme.borderLight} ${theme.surfaceBg} shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10 sticky bottom-0`}>
                <button
                    onClick={() => asDialog && onClose ? onClose() : navigate('/inventory')}
                    className={`flex-1 py-4 font-black ${theme.textSecondary} hover:${theme.textPrimary} transition-colors border-2 ${theme.borderLight} rounded-[24px]`}
                >
                    {asDialog ? "Cancel" : "Discard"}
                </button>
                <button
                    onClick={handleSubmit}
                    className={`flex-2 w-2/3 py-4 ${theme.buttonBg} ${theme.buttonText} rounded-[24px] font-black shadow-xl shadow-indigo-100/10 ${theme.buttonHoverBg} active:scale-95 transition-all flex items-center justify-center gap-2 text-lg`}
                >
                    <Save size={24} />
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
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
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
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
                                        />
                                        <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>H</span>
                                    </div>
                                </div>
                            </div>
                            
                            {barcodePrintDialog.printMode === 'ROLL' && (
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Labels per Row (e.g. 2 for 2-up rolls)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={barcodePrintDialog.labelsPerRow}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, labelsPerRow: parseInt(e.target.value || 1) }))}
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-sm`}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Barcode Size (%)</label>
                                    <input
                                        type="number"
                                        min={10}
                                        max={100}
                                        value={barcodePrintDialog.barcodeHeight}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, barcodeHeight: parseInt(e.target.value || 0) }))}
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Font Size (px)</label>
                                    <input
                                        type="number"
                                        min={6}
                                        max={30}
                                        value={barcodePrintDialog.baseFontSize}
                                        onChange={e => setBarcodePrintDialog(prev => ({ ...prev, baseFontSize: parseInt(e.target.value || 0) }))}
                                        className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                    />
                                </div>
                            </div>
                        </div>

                        {Number(barcodePrintDialog.copies) > 1 && (
                            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/50">
                                <div className="space-y-1 col-span-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Printer / Paper Type</label>
                                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setBarcodePrintDialog(prev => ({ ...prev, printMode: 'ROLL' }))}
                                            className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all ${barcodePrintDialog.printMode === 'ROLL' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : theme.textMuted}`}
                                        >
                                            THERMAL ROLL (1 label / page)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBarcodePrintDialog(prev => ({ ...prev, printMode: 'SHEET' }))}
                                            className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all ${barcodePrintDialog.printMode === 'SHEET' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600' : theme.textMuted}`}
                                        >
                                            A4 / STICKER SHEETS
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2 mt-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Layout Direction</label>
                                    <div className="flex gap-2">
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
                                <div className="space-y-1 col-span-2">
                                    <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Label Gaps (H / V mm)</label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min={0}
                                                value={barcodePrintDialog.labelGapX}
                                                onChange={e => setBarcodePrintDialog(prev => ({ ...prev, labelGapX: parseFloat(e.target.value || 0) }))}
                                                className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
                                            />
                                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>X</span>
                                        </div>
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min={0}
                                                value={barcodePrintDialog.labelGapY}
                                                onChange={e => setBarcodePrintDialog(prev => ({ ...prev, labelGapY: parseFloat(e.target.value || 0) }))}
                                                className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs pl-3 pr-6`}
                                            />
                                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold ${theme.textMuted}`}>Y</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeLogo}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeLogo: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Logo</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeName}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeName: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Name</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeCode}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeCode: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Item Code</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includePrice}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includePrice: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Price</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeMRP}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeMRP: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>MRP</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeBatch}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeBatch: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Batch</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeExpiry}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeExpiry: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Expiry</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeUnit}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeUnit: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Unit/Qty</span>
                            </label>
                            <label className={`flex items-center gap-2 p-3 rounded-xl border ${theme.borderLight} cursor-pointer hover:${theme.inputBg} transition-colors`}>
                                <input
                                    type="checkbox"
                                    checked={barcodePrintDialog.includeShopName}
                                    onChange={e => setBarcodePrintDialog(prev => ({ ...prev, includeShopName: e.target.checked }))}
                                    className="rounded text-indigo-500"
                                />
                                <span className={`text-xs font-black uppercase ${theme.textSecondary}`}>Shop Name</span>
                            </label>
                        </div>

                        {/* Label Toggles Section */}
                        <div className="space-y-4 p-4 rounded-2xl bg-gray-50/50 dark:bg-gray-800/10 border ${theme.borderLight}">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-2`}>Include Label Text (e.g. "Price: ₹100")</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { key: 'showNameLabel', label: 'Item Name', enabled: barcodePrintDialog.includeName },
                                    { key: 'showCodeLabel', label: 'Item Code', enabled: barcodePrintDialog.includeCode },
                                    { key: 'showPriceLabel', label: 'Price', enabled: barcodePrintDialog.includePrice },
                                    { key: 'showMRPLabel', label: 'MRP', enabled: barcodePrintDialog.includeMRP },
                                    { key: 'showBatchLabel', label: 'Batch', enabled: barcodePrintDialog.includeBatch },
                                    { key: 'showExpiryLabel', label: 'Expiry', enabled: barcodePrintDialog.includeExpiry },
                                    { key: 'showUnitLabel', label: 'Unit/Qty', enabled: barcodePrintDialog.includeUnit }
                                ].map(item => (
                                    <label 
                                        key={item.key} 
                                        className={`flex items-center gap-2 cursor-pointer transition-opacity ${!item.enabled ? 'opacity-40 pointer-events-none' : 'hover:opacity-80'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={barcodePrintDialog[item.key]}
                                            onChange={e => setBarcodePrintDialog(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                            disabled={!item.enabled}
                                            className="w-3.5 h-3.5 rounded text-indigo-500"
                                        />
                                        <span className={`text-[9px] font-bold uppercase ${theme.textSecondary}`}>{item.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {(barcodePrintDialog.includeBatch || barcodePrintDialog.includeExpiry || barcodePrintDialog.includeUnit) && (
                            <div className="grid grid-cols-2 gap-4">
                                {barcodePrintDialog.includeBatch && (
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Batch Override</label>
                                        <input
                                            type="text"
                                            value={barcodePrintDialog.batchOverride ?? ""}
                                            onChange={e => setBarcodePrintDialog(prev => ({ ...prev, batchOverride: e.target.value }))}
                                            placeholder="Enter batch"
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                        />
                                    </div>
                                )}
                                {barcodePrintDialog.includeExpiry && (
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Expiry Override</label>
                                        <DatePicker
                                            value={barcodePrintDialog.expiryOverride ?? ""}
                                            onChange={val => setBarcodePrintDialog(prev => ({ ...prev, expiryOverride: val }))}
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                        />
                                    </div>
                                )}
                                {barcodePrintDialog.includeUnit && (
                                    <div className="space-y-1">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Unit/Qty Override</label>
                                        <input
                                            type="text"
                                            value={barcodePrintDialog.unitValueOverride ?? ""}
                                            onChange={e => setBarcodePrintDialog(prev => ({ ...prev, unitValueOverride: e.target.value }))}
                                            placeholder="e.g. 500g, 1 Box"
                                            className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Custom Text</label>
                            <input
                                type="text"
                                value={barcodePrintDialog.customText}
                                onChange={e => setBarcodePrintDialog(prev => ({ ...prev, customText: e.target.value }))}
                                placeholder="Additional text to show on label"
                                className={`w-full p-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg} ${theme.textPrimary} font-black text-xs`}
                            />
                        </div>
                    </div>

                    {/* Right Panel: Preview */}
                    <div className="w-full md:w-[320px] space-y-6 md:sticky md:top-8 h-fit transition-all">
                        <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted}`}>Label Preview</label>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div
                                className={`${theme.surfaceBg} border-2 border-dashed ${theme.borderLight} rounded-2xl flex items-center justify-center overflow-auto p-4`}
                                style={{ width: "240px", height: "180px" }}
                            >
                                <div
                                    className="bg-white text-black shadow-lg"
                                    style={{
                                        width: `${barcodePrintDialog.labelWidth * 3}px`,
                                        minHeight: `${barcodePrintDialog.labelHeight * 3}px`,
                                        padding: "10px",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                        fontSize: `${barcodePrintDialog.baseFontSize}px`,
                                        boxSizing: "border-box"
                                    }}
                                >
                                    {barcodePrintDialog.elementsOrder.map((key) => {
                                        const actualShopName = organization?.name || organization?.businessName;
                                        if (key === "shopName" && barcodePrintDialog.includeShopName && actualShopName) {
                                            return <div key="shopName" style={{ fontWeight: 800, fontSize: `${barcodePrintDialog.baseFontSize * 1.05}px`, textTransform: 'uppercase', marginBottom: '2px', lineHeight: 1, textAlign: "center", width: "100%" }}>{actualShopName}</div>;
                                        }
                                        if (key === "logo" && barcodePrintDialog.includeLogo && organization?.logoUrl) {
                                            const root = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
                                            const logoUrl = organization.logoUrl.startsWith("http") ? organization.logoUrl : `${root}${organization.logoUrl}`;
                                            return <img key="logo" src={logoUrl} alt="Logo" style={{ maxHeight: "40px", maxWidth: "80%", objectFit: "contain", marginBottom: "4px" }} />;
                                        }
                                        if (key === "barcode" && barcodePrintDialog.barcode?.fullUrl) {
                                            return <img key="barcode" src={barcodePrintDialog.barcode.fullUrl} alt="Barcode" style={{ maxHeight: `${barcodePrintDialog.labelHeight * 3 * (barcodePrintDialog.barcodeHeight / 100)}px`, maxWidth: "95%", height: "auto", marginBottom: "2px" }} />;
                                        }
                                        if (key === "price" && barcodePrintDialog.includePrice && barcodePrintDialog.item?.sellingPrice != null) {
                                            return <div key="price" style={{ fontWeight: 800, fontSize: `${barcodePrintDialog.baseFontSize * 0.9}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{barcodePrintDialog.showPriceLabel ? 'Price: ' : ''}₹{Number(barcodePrintDialog.item.sellingPrice).toFixed(2)}</div>;
                                        }
                                        if (key === "mrp" && barcodePrintDialog.includeMRP && barcodePrintDialog.item?.mrp != null) {
                                            return <div key="mrp" style={{ fontWeight: 800, fontSize: `${barcodePrintDialog.baseFontSize * 0.9}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{barcodePrintDialog.showMRPLabel ? 'MRP: ' : ''}₹{Number(barcodePrintDialog.item.mrp).toFixed(2)}</div>;
                                        }
                                        if (key === "name" && barcodePrintDialog.includeName && barcodePrintDialog.item?.name) {
                                            return <div key="name" style={{ fontWeight: 700, lineHeight: 1, textAlign: "center", width: "100%" }}>{barcodePrintDialog.showNameLabel ? 'Item: ' : ''}{barcodePrintDialog.item.name}</div>;
                                        }
                                        if (key === "code" && barcodePrintDialog.includeCode && barcodePrintDialog.item?.itemCode) {
                                            return <div key="code" style={{ fontSize: `${barcodePrintDialog.baseFontSize * 0.8}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{barcodePrintDialog.showCodeLabel ? 'Code: ' : ''}{barcodePrintDialog.item.itemCode}</div>;
                                        }
                                        if (key === "unit" && barcodePrintDialog.includeUnit && barcodePrintDialog.unitValueOverride) {
                                            return <div key="unit" style={{ fontWeight: 600, fontSize: `${barcodePrintDialog.baseFontSize * 0.85}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{barcodePrintDialog.showUnitLabel ? 'Qty: ' : ''}{barcodePrintDialog.unitValueOverride}</div>;
                                        }
                                        if (key === "batch" && barcodePrintDialog.includeBatch && (barcodePrintDialog.batchOverride)) {
                                            return <div key="batch" style={{ fontSize: `${barcodePrintDialog.baseFontSize * 0.8}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{barcodePrintDialog.showBatchLabel ? 'Batch: ' : ''}{barcodePrintDialog.batchOverride}</div>;
                                        }
                                        if (key === "expiry" && barcodePrintDialog.includeExpiry && (barcodePrintDialog.expiryOverride)) {
                                            return <div key="expiry" style={{ fontSize: `${barcodePrintDialog.baseFontSize * 0.8}px`, lineHeight: 1, textAlign: "center", width: "100%" }}>{barcodePrintDialog.showExpiryLabel ? 'Exp: ' : ''}{barcodePrintDialog.expiryOverride}</div>;
                                        }
                                        if (key === "custom" && barcodePrintDialog.customText) {
                                            return <div key="custom" style={{ fontSize: "8px", lineHeight: 1 }}>{barcodePrintDialog.customText}</div>;
                                        }
                                        return null;
                                    })}
                                </div>
                            </div>
                            <p className={`text-[10px] ${theme.textMuted} text-center`}>
                                Drag elements to reorder or click print to send to your label printer.
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`mt-10 py-4 border-t ${theme.borderLight} flex justify-end gap-3`}>
                    <button
                        onClick={() => setBarcodePrintDialog(prev => ({ ...prev, isOpen: false }))}
                        className={`px-8 py-3 rounded-xl font-bold ${theme.textSecondary} hover:${theme.inputBg.replace('bg-', '')} transition-colors`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmBarcodePrint}
                        className={`${theme.buttonBg} ${theme.buttonText} px-10 py-3 rounded-xl font-black shadow-lg shadow-indigo-200 flex items-center gap-2 active:scale-95 transition-all`}
                    >
                        <Printer size={20} />
                        Print Labels
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default ProductPage;
