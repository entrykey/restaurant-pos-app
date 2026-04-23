import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ALL_FIELDS } from '../../config/itemFields';
import { attributeService, unitService, shopService, categoryService, itemService, branchService, taxService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { SupplierService } from '../Suppliers/SupplierService';
import { ChevronRight, Save, X, Plus, Trash2, ArrowLeft, ClipboardList, ChevronDown, Package, FilePlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DatePicker from '../../components/ui/DatePicker';
import CommonSelect from '../../components/ui/CommonSelect';

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

    const CORE_FIELD_KEYS = asDialog 
        ? ["name", "category_id", "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "item_type"]
        : ["name", "category_id", "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "item_type"];

    // Determine visible fields based on activeTab
    const getVisibleFields = () => {
        let fields = [];
        if (activeTab === "menu") {
            fields = [
                "item_code", "name", "description", "category_id",
                "unit_id", "selling_price", "mrp", "tax_percent", "hsn_sac_code", "stock_applicable",
                "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking"
            ];
        } else if (activeTab === "raw") {
            fields = [
                "item_code", "name", "description", "category_id",
                "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "hsn_sac_code",
                "stock_applicable", "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking"
            ];
        } else {
            // Trade tab
            fields = [
                "item_code", "name", "description", "category_id",
                "unit_id", "purchase_price", "selling_price", "mrp", "tax_percent", "hsn_sac_code",
                "stock_applicable", "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking", "status"
            ];
        }

        if (!isGSTApplicable) {
            fields = fields.filter(f => f !== 'hsn_sac_code');
        }
        // Remove stock_applicable as it's now automated based on min_stock_alert
        return fields.filter(k => k !== 'stock_applicable');
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
                stockApplicable: minStock > 0, // Automate stock_applicable based on minStockAlert
                minStockAlert: minStock,
                allowNegativeStock: false
            },
            tracking: {
                batchTracking: formData.batchTracking ?? false,
                expiryTracking: formData.expiryTracking ?? false,
                serialTracking: formData.serialTracking ?? false
            },
            weightBased: formData.weightBased ?? false,
            status: formData.status || "ACTIVE",
            ingredients: finalIngredients,
            attributes: itemAttributes
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
                                    Dynamic attributes based on your business type/subtype.
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
        </div>
    );
};

export default ProductPage;
