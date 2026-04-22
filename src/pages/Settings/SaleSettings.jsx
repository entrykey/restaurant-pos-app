import React from 'react';
import { ShoppingBag, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import CommonSelect from '../../components/ui/CommonSelect';

/**
 * SaleSettings Component
 * Allows shop owners to toggle specific sales features based on their business type capabilities.
 */
const SaleSettings = ({ 
    backendSettings, 
    handleUpdateBackendSetting, 
    handleSaveBackendSetting, 
    isSaving 
}) => {
    const { theme } = useTheme();
    const { businessTypeData } = useApp();

    // Mapping of internal feature flags to setting keys
    // Mapping of internal feature flags to setting keys
    const SALE_FEATURES = [
        {
            key: 'ENABLE_STOCK_ITEMS',
            featureKey: 'sellStockItems',
            displayString: 'Enable Stock Items',
            description: 'Allow selling of predefined stock items from your inventory.',
            type: 'boolean'
        },
        {
            key: 'ENABLE_MANUFACTURED_ITEMS',
            featureKey: 'sellManufacturedItems',
            displayString: 'Enable Manufactured Items',
            description: 'Allow selling of items produced or manufactured in-house.',
            type: 'boolean'
        },
        {
            key: 'ENABLE_TRADE_ITEMS',
            featureKey: 'sellTradeItems',
            displayString: 'Enable Trade Items',
            description: 'Allow selling of trade-based items or services.',
            type: 'boolean'
        },
        {
            key: 'SALE_MARKING_TYPE',
            featureKey: null, // Always available
            displayString: 'Sale Marking Type',
            description: 'Determines how sales sessions are closed. AUTO (24hr) or MANUAL (custom marking).',
            type: 'select'
        },
        {
            key: 'SALE_MARKING_TIME',
            featureKey: null, // Always available
            displayString: 'Sale Marking Alert Time',
            description: 'The scheduled time for daily sale marking notification. Only applicable when using MANUAL mode.',
            type: 'select'
        }
    ];

    // Filter features based on Business Type capabilities
    const availableFeatures = SALE_FEATURES.filter(feature => {
        if (!feature.featureKey) return true; // Always show if no feature key
        if (!businessTypeData || !businessTypeData.features) return false;
        return businessTypeData.features[feature.featureKey] === true;
    });

    const getSettingObj = (key) => {
        return backendSettings.find(s => s.key === key);
    };

    const getSettingValue = (key) => {
        const setting = getSettingObj(key);
        return setting ? setting.value : false;
    };

    const renderSettingControl = (feature, value, setting) => {
        if (feature.type === 'boolean') {
            return (
                <button
                    onClick={() => handleUpdateBackendSetting(feature.key, !value)}
                    className={`w-14 h-7 rounded-full transition-all flex items-center px-1.5 ${value ? theme.buttonBg : "bg-gray-300"}`}
                >
                    <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-6.5" : ""}`} />
                </button>
            );
        }

        if (feature.type === 'select' && setting?.meta?.options) {
            const options = setting.meta.options;
            if (options.length === 2) {
                return (
                    <div 
                        className={`relative w-44 h-11 ${theme.inputBg.replace('bg-', '') === 'bg-slate-900' ? 'bg-slate-700/50' : 'bg-slate-100'} rounded-2xl flex p-1.5 cursor-pointer selection-none relative`}
                        onClick={() => {
                            const opt0 = typeof options[0] === 'object' ? options[0].value : options[0];
                            const opt1 = typeof options[1] === 'object' ? options[1].value : options[1];
                            const newValue = value === opt0 ? opt1 : opt0;
                            handleUpdateBackendSetting(feature.key, newValue);
                        }}
                    >
                        <div 
                            className={`absolute w-[calc(50%-6px)] h-[calc(100%-12px)] ${theme.buttonBg} rounded-xl shadow-lg transition-all duration-300 ease-out`}
                            style={{ 
                                transform: (value === (typeof options[1] === 'object' ? options[1].value : options[1])) ? 'translateX(100%)' : 'translateX(0)'
                            }}
                        />
                        {options.map((opt) => {
                            const label = typeof opt === 'object' ? opt.label : opt;
                            const optValue = typeof opt === 'object' ? opt.value : opt;
                            return (
                                <div 
                                    key={optValue}
                                    className={`flex-1 flex items-center justify-center z-10 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                                        value === optValue ? 'text-white' : (theme.textSecondary || 'text-slate-500')
                                    }`}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                );
            } else {
                // Use CommonSelect for larger dropdowns (e.g. 24h selection)
                return (
                    <CommonSelect
                        options={options}
                        value={value}
                        onChange={(val) => handleUpdateBackendSetting(feature.key, val)}
                        className="w-44"
                        triggerClassName="!py-2.5 !rounded-xl !border-[1px] !border-gray-200"
                    />
                );
            }
        }

        return null;
    };

    if (!businessTypeData) {
        return (
            <div className={`p-8 text-center ${theme.textSecondary} italic`}>
                Loading business capabilities...
            </div>
        );
    }

    if (availableFeatures.length === 0) {
        return (
            <div className={`p-12 ${theme.surfaceBg} rounded-[40px] border ${theme.borderLight} text-center space-y-4`}>
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <AlertCircle size={32} />
                </div>
                <div>
                    <h3 className={`text-xl font-bold ${theme.textHeading}`}>No Sale Settings Available</h3>
                    <p className={`${theme.textSecondary} mt-2 max-w-sm mx-auto`}>
                        Your business type doesn't have any configurable sale features enabled at the moment.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.surfaceBg} ${theme.borderLight} space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-6`}>
                <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                        <ShoppingBag className={theme.primaryIconText} size={24} />
                        Sale Configurations
                    </h3>
                    <p className={`text-sm ${theme.textSecondary} mt-1`}>
                        Enable or disable specific sales modules based on your business needs
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {availableFeatures.map((feature) => {
                    const setting = getSettingObj(feature.key);
                    
                    // Conditional Visibility Logic
                    if (feature.key === 'SALE_MARKING_TIME') {
                         const markingType = getSettingValue('SALE_MARKING_TYPE');
                         if (markingType !== 'MANUAL') return null;
                    }

                    const value = setting ? setting.value : (feature.type === 'boolean' ? false : (feature.key === 'SALE_MARKING_TIME' ? '00:00' : 'AUTO'));
                    
                    const settingObj = setting || { 
                        key: feature.key, 
                        value: value, 
                        displayString: feature.displayString,
                        description: feature.description,
                        isNew: true,
                        type: feature.type,
                        meta: { 
                            inputType: 'select', 
                            options: feature.key === 'SALE_MARKING_TIME' ? [
                                "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", 
                                "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
                                "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
                                "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
                            ] : ["AUTO", "MANUAL"]
                        }
                    };

                    return (
                        <div 
                            key={feature.key} 
                            className={`p-6 ${theme.inputBg} rounded-3xl border ${theme.inputBorder} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-200`}
                        >
                            <div className="space-y-1">
                                <h4 className={`font-black ${theme.textHeading} text-lg`}>{feature.displayString}</h4>
                                <p className={`text-xs ${theme.textSecondary} max-w-md`}>{feature.description}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                {renderSettingControl(feature, value, setting)}

                                {setting && (
                                    <button
                                        onClick={() => handleSaveBackendSetting(setting)}
                                        disabled={isSaving}
                                        className={`p-3.5 ${theme.buttonBg} ${theme.buttonText} rounded-2xl shadow-lg hover:scale-105 transition-all disabled:opacity-50`}
                                        title="Save Changes"
                                    >
                                        <Save size={18} />
                                    </button>
                                )}
                                
                                {!setting && (
                                    <button
                                        onClick={() => handleSaveBackendSetting(settingObj)}
                                        disabled={isSaving}
                                        className={`px-4 py-2 ${theme.buttonBg} ${theme.buttonText} rounded-xl shadow-md text-xs font-bold hover:scale-105 transition-all disabled:opacity-50`}
                                    >
                                        Initialize
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SaleSettings;
