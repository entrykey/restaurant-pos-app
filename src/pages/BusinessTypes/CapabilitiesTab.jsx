import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Settings2, X, CheckSquare, Square, Package, ShoppingCart, Box, Utensils, Coffee, Users, Monitor, LayoutDashboard } from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";
import { businessTypesService } from "../../services/api/businessTypes";
import { MODULE_TEXT_KEYS } from "../../config/moduleTextKeys";

const AVAILABLE_ICONS = [
    { name: 'Default', icon: LayoutDashboard },
    { name: 'Package', icon: Package },
    { name: 'Cart', icon: ShoppingCart },
    { name: 'Box', icon: Box },
    { name: 'Utensils', icon: Utensils },
    { name: 'Coffee', icon: Coffee },
    { name: 'Users', icon: Users },
    { name: 'Monitor', icon: Monitor },
];

const CapabilitiesTab = () => {
    const { theme } = useTheme();
    const [types, setTypes] = useState([]);
    const [subTypes, setSubTypes] = useState([]);
    const [allModules, setAllModules] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);

    const [selectedType, setSelectedType] = useState('');
    const [selectedSubType, setSelectedSubType] = useState('');

    // Map of moduleId -> { customLabel, customIcon, allowedPermissions: [permissionIds] }
    const [selectedModules, setSelectedModules] = useState({});

    // Config panel state
    const [configuringModule, setConfiguringModule] = useState(null); // module object

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [capabilityId, setCapabilityId] = useState(null);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                const [tRes, sRes, mRes, pRes] = await Promise.all([
                    businessTypesService.getBusinessTypes(),
                    businessTypesService.getBusinessSubTypes(),
                    businessTypesService.getAllModules(),
                    businessTypesService.getAllPermissions()
                ]);
                setTypes(tRes.data || []);
                setSubTypes(sRes.data || []);
                setAllModules(mRes.data || []);
                setAllPermissions(pRes.data || []);
            } catch (err) {
                console.error("Failed to load metadata", err);
            }
        };
        loadInitial();
    }, []);

    const availableSubTypes = subTypes.filter(s =>
        (s.businessTypeId?._id || s.businessTypeId) === selectedType
    );

    useEffect(() => {
        if (availableSubTypes.length > 0 && !availableSubTypes.find(s => s._id === selectedSubType)) {
            setSelectedSubType(availableSubTypes[0]._id);
        } else if (availableSubTypes.length === 0) {
            setSelectedSubType('');
        }
    }, [selectedType, availableSubTypes, selectedSubType]);

    useEffect(() => {
        const loadCapability = async () => {
            if (!selectedType || !selectedSubType) {
                setSelectedModules({});
                setCapabilityId(null);
                setConfiguringModule(null);
                return;
            }

            setIsLoading(true);
            try {
                const res = await businessTypesService.getCapabilityBySubtype(selectedType, selectedSubType);
                const caps = res.data;

                if (caps && caps.length > 0) {
                    const cap = caps[0];
                    setCapabilityId(cap._id);

                    const modMap = {};
                    (cap.modules || []).forEach(m => {
                        modMap[m.module?._id || m.module] = {
                            customLabel: m.customLabel || '',
                            customIcon: m.customIcon || '',
                            customTexts: m.customTexts || {},
                            allowedPermissions: m.allowedPermissions?.map(p => p?._id || p) || []
                        };
                    });
                    setSelectedModules(modMap);
                } else {
                    setCapabilityId(null);
                    setSelectedModules({});
                }
            } catch (err) {
                console.error("Failed to load capabilities", err);
                setSelectedModules({});
                setCapabilityId(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadCapability();
    }, [selectedType, selectedSubType]);

    const handleModuleToggle = (moduleId) => {
        setSelectedModules(prev => {
            const next = { ...prev };
            if (next[moduleId]) {
                delete next[moduleId];
                if (configuringModule?._id === moduleId) setConfiguringModule(null);
            } else {
                next[moduleId] = { customLabel: '', customIcon: '', customTexts: {}, allowedPermissions: [] };
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!selectedType || !selectedSubType) return;
        setIsSaving(true);
        try {
            const modulesArray = Object.keys(selectedModules).map(mId => ({
                module: mId,
                customLabel: selectedModules[mId].customLabel,
                customIcon: selectedModules[mId].customIcon,
                customTexts: selectedModules[mId].customTexts,
                allowedPermissions: selectedModules[mId].allowedPermissions
            }));

            const payload = {
                businessType: selectedType,
                subType: selectedSubType,
                modules: modulesArray
            };

            if (capabilityId) {
                await businessTypesService.updateCapability(capabilityId, payload);
            } else {
                await businessTypesService.createCapability(payload);
                const res = await businessTypesService.getCapabilityBySubtype(selectedType, selectedSubType);
                if (res.data && res.data.length > 0) {
                    setCapabilityId(res.data[0]._id);
                }
            }
            alert("Capabilities saved successfully!");
        } catch (error) {
            console.error("Save failed", error);
            alert("Failed to save capabilities");
        } finally {
            setIsSaving(false);
        }
    };

    const updateConfig = (field, value) => {
        if (!configuringModule) return;
        setSelectedModules(prev => ({
            ...prev,
            [configuringModule._id]: {
                ...prev[configuringModule._id],
                [field]: value
            }
        }));
    };

    const updateCustomText = (textKey, value) => {
        if (!configuringModule) return;
        setSelectedModules(prev => ({
            ...prev,
            [configuringModule._id]: {
                ...prev[configuringModule._id],
                customTexts: {
                    ...(prev[configuringModule._id].customTexts || {}),
                    [textKey]: value
                }
            }
        }));
    };

    const togglePermission = (permId) => {
        if (!configuringModule) return;
        setSelectedModules(prev => {
            const config = prev[configuringModule._id];
            const hasPerm = config.allowedPermissions.includes(permId);
            return {
                ...prev,
                [configuringModule._id]: {
                    ...config,
                    allowedPermissions: hasPerm
                        ? config.allowedPermissions.filter(p => p !== permId)
                        : [...config.allowedPermissions, permId]
                }
            };
        });
    };

    const handleSelectAllPermissions = (isChecked) => {
        if (!configuringModule) return;
        const allPermIds = modulePermissions.map(p => p._id);
        setSelectedModules(prev => ({
            ...prev,
            [configuringModule._id]: {
                ...prev[configuringModule._id],
                allowedPermissions: isChecked ? allPermIds : []
            }
        }));
    };

    // Derived values for the currently configuring module
    const currentConfig = configuringModule ? selectedModules[configuringModule._id] : null;
    const modulePermissions = configuringModule
        ? allPermissions.filter(p => (p.module?._id || p.module) === configuringModule._id)
        : [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className={`text-xl font-black ${theme.textHeading}`}>Module Capabilities</h2>
                    <p className={`text-sm ${theme.textSecondary}`}>Map system modules and refine permissions for specific business types.</p>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Select Business Type</label>
                        <select
                            value={selectedType}
                            onChange={e => setSelectedType(e.target.value)}
                            className={`w-full p-3 rounded-xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} outline-none focus:border-indigo-500 font-bold appearance-none transition-all`}
                        >
                            <option value="" disabled>-- Select Type --</option>
                            {types.map(t => (
                                <option key={t._id} value={t._id}>{t.displayString}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Select Sub Type</label>
                        <select
                            value={selectedSubType}
                            onChange={e => setSelectedSubType(e.target.value)}
                            disabled={!selectedType || availableSubTypes.length === 0}
                            className={`w-full p-3 rounded-xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} outline-none focus:border-indigo-500 font-bold appearance-none transition-all disabled:opacity-50`}
                        >
                            <option value="" disabled>-- Select Sub Type --</option>
                            {availableSubTypes.map(s => (
                                <option key={s._id} value={s._id}>{s.displayString}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedType && selectedSubType ? (
                    <div>
                        <div className="flex items-center justify-between mb-4 border-b pb-2 border-gray-100 dark:border-gray-800">
                            <h3 className={`text-lg font-bold ${theme.textPrimary}`}>Assigned Modules</h3>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || isLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-100"
                            >
                                <Save size={16} />
                                {isSaving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>

                        {isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className={`h-16 rounded-xl border ${theme.borderLight} ${theme.inputBg}`}></div>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Modules List */}
                                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max">
                                    {allModules.map(module => {
                                        const isSelected = !!selectedModules[module._id];
                                        const isConfiguring = configuringModule?._id === module._id;
                                        const conf = selectedModules[module._id];

                                        return (
                                            <div
                                                key={module._id}
                                                className={`relative overflow-hidden flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected
                                                    ? `border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-none ${theme.surfaceBg}`
                                                    : `border-transparent ${theme.sectionBg} hover:border-indigo-200`
                                                    }`}
                                                onClick={() => handleModuleToggle(module._id)}
                                            >
                                                <div className="flex items-center gap-3 flex-1">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 text-white shadow-md' : `${theme.primaryIconBg} ${theme.textMuted} opacity-40`}`}>
                                                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                                    </div>
                                                    <div>
                                                        <span className={`font-bold text-sm leading-tight block ${isSelected ? theme.primaryIconText : theme.textPrimary}`}>
                                                            {(() => {
                                                                const name = conf?.customLabel || module.name || "";
                                                                return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                                                            })()}
                                                        </span>
                                                        {(conf?.customLabel || conf?.customIcon || Object.keys(conf?.customTexts || {}).length > 0 || conf?.allowedPermissions?.length > 0) && isSelected ? (
                                                            <span className="text-[10px] mt-0.5 opacity-80 uppercase tracking-widest block text-indigo-600 font-bold">Customized</span>
                                                        ) : (
                                                            <span className="text-[10px] mt-0.5 opacity-60 uppercase tracking-widest block">{module.key}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setConfiguringModule(module); }}
                                                        className={`p-2.5 rounded-xl ml-2 transition-all ${isConfiguring ? 'bg-indigo-600 text-white shadow-lg' : `text-indigo-600 ${theme.sectionBg} hover:bg-indigo-100`}`}
                                                        title="Configure Module"
                                                    >
                                                        <Settings2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Configuration Panel */}
                                {configuringModule ? (
                                    <div className={`p-5 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 ${theme.surfaceBg} shadow-sm h-fit sticky top-6 animate-in fade-in slide-in-from-right-4`}>
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-50 dark:border-indigo-900/30">
                                            <h4 className={`font-black text-indigo-600 flex items-center gap-2`}>
                                                <Settings2 size={18} /> Configure: {configuringModule.name?.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                            </h4>
                                            <button onClick={() => setConfiguringModule(null)} className="text-gray-400 hover:text-gray-600">
                                                <X size={18} />
                                            </button>
                                        </div>

                                        <div className="space-y-5">
                                            {/* Hide Custom Menu Label and Icon as per user request */}
                                            {/* 
                                            <div>
                                                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Custom Menu Label</label>
                                                <input
                                                    type="text"
                                                    value={currentConfig?.customLabel || ''}
                                                    onChange={e => updateConfig('customLabel', e.target.value)}
                                                    placeholder={`e.g. ${configuringModule.name}`}
                                                    className={`w-full p-2.5 rounded-xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} text-sm font-bold focus:border-indigo-500 outline-none`}
                                                />
                                            </div>

                                            <div>
                                                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme.textMuted}`}>Custom Icon</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {AVAILABLE_ICONS.map(iconObj => {
                                                        const IconComp = iconObj.icon;
                                                        const isActive = currentConfig?.customIcon === iconObj.name || (!currentConfig?.customIcon && iconObj.name === 'Default');
                                                        return (
                                                            <button
                                                                key={iconObj.name}
                                                                onClick={() => updateConfig('customIcon', iconObj.name === 'Default' ? '' : iconObj.name)}
                                                                title={iconObj.name}
                                                                className={`p-2.5 rounded-lg border-2 transition-all flex items-center justify-center ${isActive ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : `${theme.inputBorder} ${theme.textSecondary} hover:border-gray-300`}`}
                                                            >
                                                                <IconComp size={18} />
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            */}

                                            {/* Dynamic Custom Texts */}
                                            {configuringModule.key && MODULE_TEXT_KEYS[configuringModule.key.toUpperCase()] && (
                                                <div className="pt-2 border-t border-indigo-50 dark:border-indigo-900/30">
                                                    <label className={`block text-xs font-black uppercase tracking-wider mb-3 ${theme.textMuted}`}>Custom UI Texts</label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {MODULE_TEXT_KEYS[configuringModule.key.toUpperCase()].keys.map(textDef => (
                                                            <div key={textDef.key}>
                                                                <label className={`block text-[10px] font-bold opacity-70 mb-1 ${theme.textSecondary}`}>{textDef.description}</label>
                                                                <input
                                                                    type="text"
                                                                    value={currentConfig?.customTexts?.[textDef.key] || ''}
                                                                    onChange={e => updateCustomText(textDef.key, e.target.value)}
                                                                    placeholder={textDef.default}
                                                                    className={`w-full p-2.5 rounded-xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} text-xs font-bold focus:border-indigo-500 outline-none`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-indigo-50 dark:border-indigo-900/30">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className={`block text-xs font-black uppercase tracking-wider ${theme.textMuted}`}>
                                                        Allowed Permissions ({currentConfig?.allowedPermissions.length || 0}/{modulePermissions.length})
                                                    </label>
                                                    {modulePermissions.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                id="select-all-perms"
                                                                checked={modulePermissions.length > 0 && modulePermissions.every(p => currentConfig?.allowedPermissions.includes(p._id))}
                                                                onChange={(e) => handleSelectAllPermissions(e.target.checked)}
                                                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                                            />
                                                            <label htmlFor="select-all-perms" className="text-[10px] font-black uppercase text-indigo-600 cursor-pointer">Select All</label>
                                                        </div>
                                                    )}
                                                </div>
                                                {modulePermissions.length === 0 ? (
                                                    <p className="text-xs text-gray-400 italic">No specific permissions registered for this module.</p>
                                                ) : (
                                                    <div className={`space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar`}>
                                                        {modulePermissions.map(perm => {
                                                            const hasPerm = currentConfig?.allowedPermissions.includes(perm._id);
                                                            return (
                                                                <div
                                                                    key={perm._id}
                                                                    onClick={() => togglePermission(perm._id)}
                                                                    className={`group flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${hasPerm
                                                                        ? `border-indigo-500/50 bg-indigo-50/30 dark:bg-indigo-900/10`
                                                                        : `border-transparent hover:${theme.sectionBg}`}`}
                                                                >
                                                                    <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${hasPerm
                                                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                        : `border-gray-200 ${theme.surfaceBg}`}`}>
                                                                        {hasPerm && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                                                    </div>
                                                                    <div>
                                                                        <span className={`text-sm font-bold block leading-none ${hasPerm ? 'text-indigo-700 dark:text-indigo-300' : theme.textPrimary}`}>
                                                                            {(() => {
                                                                                let name = perm.name || "";
                                                                                const modName = configuringModule.name?.toLowerCase();
                                                                                // Remove module name if it's the first word
                                                                                if (modName && name.toLowerCase().startsWith(modName)) {
                                                                                    name = name.substring(modName.length);
                                                                                }
                                                                                // Remove leading dots/underscores
                                                                                name = name.replace(/^[._]+/, "");
                                                                                // Replace dots/underscores with spaces
                                                                                name = name.replace(/[._]/g, " ").trim();
                                                                                // Capitalize
                                                                                return name.charAt(0).toUpperCase() + name.slice(1);
                                                                            })()}
                                                                        </span>
                                                                        {perm.description && <span className={`text-[10px] mt-1 block ${theme.textSecondary}`}>{perm.description}</span>}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed ${theme.borderLight} ${theme.textMuted} h-full min-h-[300px]`}>
                                        <Settings2 size={48} className="opacity-20 mb-4" />
                                        <h4 className="font-bold text-sm">No Module Selected</h4>
                                        <p className="text-xs mt-1 max-w-[200px]">Select a module from the list and click its configure icon to customize label, icon, and permissions.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`text-center py-12 ${theme.textMuted} flex flex-col items-center justify-center`}>
                        <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium">Please select a Business Type and Sub Type to configure capabilities.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CapabilitiesTab;
