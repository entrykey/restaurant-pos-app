import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ALL_FIELDS } from '../../config/itemFields';
import { attributeService, unitService, shopService, categoryService, itemService, branchService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { SupplierService } from '../Suppliers/SupplierService';
import { ChevronRight, Save, X, Plus, Trash2, ArrowLeft } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';

const ProductPage = ({ menu, setMenu, inventoryItems, setInventoryItems, asDialog, onClose }) => {
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();

    const isEditing = asDialog ? false : Boolean(id);
    const searchParams = new URLSearchParams(location.search);
    const activeTab = asDialog ? 'raw' : (searchParams.get('tab') || 'menu'); // 'menu' or 'raw'
    const showRecipe = activeTab === 'menu';

    const [isLoading, setIsLoading] = useState(isEditing);
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [isGSTApplicable, setIsGSTApplicable] = useState(true);
    const [branchTaxSystem, setBranchTaxSystem] = useState('');

    // Dynamic Attributes & Units
    const [dynamicAttributes, setDynamicAttributes] = useState([]);
    const [units, setUnits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stockItems, setStockItems] = useState([]);
    const [itemAttributes, setItemAttributes] = useState({});
    const [ingredients, setIngredients] = useState([]);

    // Determine visible fields based on activeTab
    const getVisibleFields = () => {
        let fields = [];
        if (activeTab === "menu") {
            fields = [
                "item_code", "name", "description", "category_id",
                "unit_id", "selling_price", "mrp", "tax_id", "hsn_sac_code", "stock_applicable",
                "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking", "status"
            ];
        } else {
            fields = [
                "item_code", "name", "description", "category_id",
                "unit_id", "purchase_price", "selling_price", "mrp", "tax_id", "hsn_sac_code",
                "stock_applicable", "min_stock_alert", "weight_based", "batch_tracking", "expiry_tracking", "serial_tracking", "status"
            ];
        }

        if (!isGSTApplicable) {
            fields = fields.filter(f => f !== 'hsn_sac_code');
        }
        return fields;
    };
    const visibleFields = getVisibleFields();

    useEffect(() => {
        const fetchItemData = async () => {
            if (!isEditing || !id) return;
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
        const fetchAttributesAndUnits = async () => {
            try {
                let businessTypeId = null;
                let businessSubTypeId = null;

                if (user?.shop_id) {
                    try {
                        const shop = await shopService.getShopById(user.shop_id);
                        businessTypeId = shop?.businessType?._id || shop?.businessType;
                        businessSubTypeId = shop?.subType?._id || shop?.subType;
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
                    categoryService.getCategories({ shopId: user?.shop_id }),
                    SupplierService.getSuppliers(user?.shop_id)
                ];

                const results = await Promise.all(promises);
                const attrsRes = results[0];
                const unitsRes = results[1];
                const categoriesRes = results[2];
                const suppliersRes = results[3];

                if (branchIdToUse && user?.shop_id) {
                    try {
                        const branchesData = await branchService.getBranchesByShopId(user.shop_id);
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
            } catch (error) {
                console.error("Failed to load attributes/units", error);
            }
        };

        const fetchStockItems = async () => {
            if (showRecipe && user?.shop_id) {
                try {
                    const response = await itemService.getItems({
                        limit: 1000,
                        filters: {
                            shopid: user.shop_id,
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
    }, [user?.shop_id, activeBranchId, showRecipe]);


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
            options = categories.map(c => ({ label: c.name, value: c._id }));
        } else if (fieldKey === "supplier_id") {
            options = suppliers.map(s => ({ label: s.name, value: s._id }));
        } else if (fieldKey === "unit_id") {
            options = units.map(u => ({ label: u.name || u.code, value: u._id }));
        } else if (fieldKey === "tax_id") {
            options = [
                { label: 'GST', value: 'GST' },
                { label: 'VAT', value: 'VAT' },
                { label: 'SALES_TAX', value: 'SALES_TAX' },
                { label: 'NONE', value: 'NONE' }
            ];
        }

        acc[section].push({ ...fieldDef, originalKey: fieldKey, options });
        return acc;
    }, {});

    const handleChange = (fieldKey, value) => {
        setFormData(prev => ({
            ...prev,
            [ALL_FIELDS[fieldKey].key]: value
        }));

        if (fieldKey === "tax_id") {
            setIsGSTApplicable(value === 'GST');
        }

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

        const payload = {
            ...cleanFormData,
            shopid: user?.shop_id,
            branchId: activeBranchId || (user?.branchIds && user.branchIds.length > 0 ? user.branchIds[0] : formData.branchId),
            itemType: activeTab === "menu" ? "MANUFACTURED" : "STOCK",
            pricing: {
                purchasePrice: parseFloat(formData.purchasePrice || 0),
                sellingPrice: parseFloat(formData.sellingPrice || 0),
                mrp: parseFloat(formData.mrp || 0)
            },
            stockSettings: {
                stockApplicable: formData.stockApplicable ?? true,
                minStockAlert: parseFloat(formData.minStockAlert || 0),
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
            } else if (activeTab === "raw" && setInventoryItems && inventoryItems) {
                if (isEditing) {
                    setInventoryItems(prev => prev.map((m) => (m.id === id ? newItem : m)));
                } else {
                    setInventoryItems(prev => [newItem, ...prev]);
                }
            }

            if (asDialog && onClose) {
                onClose(newItem);
            } else {
                navigate('/inventory');
            }
        } catch (error) {
            console.error("Failed to save product:", error);
            alert("Failed to save product. Please check console for details.");
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
        ? `Edit ${activeTab === 'menu' ? 'Menu Item' : 'Item'}`
        : `Add New ${activeTab === 'menu' ? 'Menu Item' : 'Item'}`;

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            {/* Breadcrumb Navigation */}
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

            <div className={`w-full`}>
                <div className="flex justify-between items-center mb-8 border-b pb-6 border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className={`text-3xl font-black ${theme.textHeading}`}>{title}</h3>
                        <p className={`text-sm mt-1 ${theme.textMuted}`}>
                            Fill in the details below to {isEditing ? 'update' : 'create'} this {activeTab === 'menu' ? 'menu item' : 'inventory item'}.
                        </p>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* Dynamic Sections mapped from config */}
                    {Object.entries(groupedFields).map(([section, fields]) => (
                        <div key={section}>
                            <div className="flex items-center gap-4 mb-8">
                                <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>{section} Details</h4>
                                <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {fields.map(field => {
                                    if (field.originalKey === 'min_stock_alert') {
                                        const isStockApplicable = formData['stockApplicable'] !== false;
                                        if (!isStockApplicable) return null;
                                    }

                                    return (
                                        <div key={field.originalKey} className={field.type === 'textarea' ? 'md:col-span-3' : ''}>
                                            <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                                {field.label} {field.required && <span className="text-red-500">*</span>}
                                            </label>

                                            {field.type === 'select' ? (
                                                <select
                                                    value={formData[field.key] || field.defaultValue || ""}
                                                    onChange={(e) => handleChange(field.originalKey, e.target.value)}
                                                    className={`w-full p-4 border-2 rounded-2xl ${theme.inputBg} ${theme.textPrimary} outline-none font-bold transition-all ${errors[field.originalKey] ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                                >
                                                    <option value="">Select...</option>
                                                    {(field.options || []).map(opt => {
                                                        const val = typeof opt === 'object' ? opt.value : opt;
                                                        const lbl = typeof opt === 'object' ? opt.label : opt;
                                                        return <option key={val} value={val}>{lbl}</option>;
                                                    })}
                                                </select>
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
                                                    placeholder={field.label}
                                                />
                                            )}
                                            {errors[field.originalKey] && (
                                                <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors[field.originalKey]}</p>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* DYNAMIC ATTRIBUTES SECTION */}
                    {dynamicAttributes.length > 0 && (
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Item Attributes</h4>
                                <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                            </div>
                            <p className={`text-sm ${theme.textMuted} mb-8`}>
                                Dynamic attributes based on your business type/subtype.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {dynamicAttributes.filter(attr => {
                                    if (!attr.categoryDependent) return true;
                                    const selectedCategoryId = formData.categoryId;
                                    const attrCategoryId = attr.categoryId?._id || attr.categoryId;
                                    return selectedCategoryId === attrCategoryId;
                                }).map(attr => (
                                    <div key={attr.code} className="flex flex-col gap-2">
                                        <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest block ml-1`}>
                                            {attr.name} {attr.required && <span className="text-red-500">*</span>}
                                        </label>

                                        <div className="flex gap-2">
                                            {attr.dataType === 'SELECT' ? (
                                                <select
                                                    value={itemAttributes[attr.code]?.value || ""}
                                                    onChange={(e) => handleAttributeChange(attr.code, 'value', e.target.value)}
                                                    className={`w-full p-4 border-2 ${theme.inputBorder} rounded-2xl ${theme.inputBg} ${theme.textPrimary} outline-none font-bold transition-all focus:border-blue-400`}
                                                >
                                                    <option value="">Select...</option>
                                                    {(attr.options || []).map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
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
                    )}

                    {/* NEW RECIPE SECTION */}
                    {showRecipe && (
                        <div>
                            <div className="flex items-center gap-4 mb-2">
                                <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Recipe / Ingredients</h4>
                                <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                            </div>
                            <p className={`text-sm ${theme.textMuted} mb-8`}>Define what raw items are used to make this product.</p>

                            <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
                                <div className="flex-1">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Stock Item</label>
                                    <select
                                        value={selectedRawItem}
                                        onChange={(e) => {
                                            setSelectedRawItem(e.target.value);
                                            const item = stockItems.find(i => i._id === e.target.value || i.id === e.target.value);
                                            if (item && item.unitId) {
                                                setIngredientUnitId(item.unitId._id || item.unitId);
                                            }
                                        }}
                                        className={`w-full p-3 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-orange-400`}
                                    >
                                        <option value="">Select Stock Item</option>
                                        {stockItems.map(item => (
                                            <option key={item._id || item.id} value={item._id || item.id}>{item.name} ({item.unitId?.name || "N/A"})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-full md:w-32">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Qty</label>
                                    <input
                                        type="number"
                                        value={ingredientQty}
                                        onChange={(e) => setIngredientQty(e.target.value)}
                                        placeholder="0"
                                        className={`w-full p-3 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-orange-400`}
                                    />
                                </div>
                                <div className="w-full md:w-40">
                                    <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block`}>Unit</label>
                                    <select
                                        value={ingredientUnitId}
                                        onChange={(e) => setIngredientUnitId(e.target.value)}
                                        className={`w-full p-3 border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.textPrimary} rounded-xl font-bold outline-none focus:border-orange-400`}
                                    >
                                        <option value="">Select Unit</option>
                                        {units.map(u => (
                                            <option key={u._id} value={u._id}>{u.name}</option>
                                        ))}
                                    </select>
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

                <div className={`flex gap-4 pt-8 mt-12 border-t ${theme.borderLight}`}>
                    <button
                        onClick={() => asDialog && onClose ? onClose() : navigate('/inventory')}
                        className={`flex-1 py-5 font-black ${theme.textSecondary} hover:${theme.textPrimary} transition-colors border-2 ${theme.borderLight} rounded-[24px]`}
                    >
                        {asDialog ? "Cancel" : "Discard"}
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={`flex-2 w-2/3 py-5 ${theme.buttonBg} ${theme.buttonText} rounded-[24px] font-black shadow-xl shadow-indigo-100/10 ${theme.buttonHoverBg} active:scale-95 transition-all flex items-center justify-center gap-2 text-lg`}
                    >
                        <Save size={24} />
                        {isEditing ? "Update Product" : "Save Product"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductPage;
