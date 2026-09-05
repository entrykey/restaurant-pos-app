import React from 'react';
import { ShoppingBag, Save, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';
import CommonSelect from '../../components/ui/CommonSelect';

/**
 * SaleSettings Component
 * Allows shop owners to toggle specific sales features based on their business type capabilities.
 */
const SaleSettings = ({ 
    backendSettings = [], 
    handleUpdateBackendSetting, 
    handleSaveBackendSetting, 
    handleSaveAllBackendSettings,
    isSaving 
}) => {
    const { theme } = useTheme();
    const { businessTypeData } = useApp();

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
            key: 'ALLOW_CREDIT',
            featureKey: null,
            displayString: 'Allow Credit Purchases',
            description: 'When enabled, orders can be completed with a partial payment, leaving the remaining amount as customer credit.',
            type: 'boolean'
        },
        {
            key: 'PREPAID_AUTO_SERVE_ON_PAYMENT',
            featureKey: null,
            displayString: 'Auto Mark Served on Payment',
            description: 'When enabled, completing payment for an order automatically marks items as served on KDS. Keep disabled for prepaid kitchens where food is prepared after payment.',
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

    const getSettingValue = (key, defaultValue) => {
        const setting = getSettingObj(key);
        if (setting !== undefined && setting.value !== undefined) {
            return setting.value;
        }
        return defaultValue;
    };

    const handleSaveAll = () => {
        const payload = availableFeatures.map(feature => {
            const setting = getSettingObj(feature.key);
            const defaultVal = feature.type === 'boolean' ? false : (feature.key === 'SALE_MARKING_TIME' ? '00:00' : 'AUTO');
            const val = setting !== undefined && setting.value !== undefined ? setting.value : defaultVal;
            return {
                key: feature.key,
                value: val,
                displayString: feature.displayString
            };
        });

        if (handleSaveAllBackendSettings) {
            handleSaveAllBackendSettings(payload);
        }
    };

    const renderSettingControl = (feature, value, setting) => {
        if (feature.type === 'boolean') {
            const boolVal = Boolean(value);
            return (
                <button
                    type="button"
                    onClick={() => handleUpdateBackendSetting(feature.key, !boolVal)}
                    aria-label={`Toggle ${feature.displayString}`}
                    className={`relative w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out cursor-pointer shrink-0 ${
                        boolVal
                            ? `${theme.buttonBg || 'bg-indigo-600'}`
                            : 'bg-gray-300 dark:bg-slate-700/80 border border-gray-400 dark:border-slate-600'
                    }`}
                >
                    <div
                        className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out ${
                            boolVal ? 'translate-x-6' : 'translate-x-0'
                        }`}
                    />
                </button>
            );
        }

        if (feature.type === 'select') {
            const options = setting?.meta?.options || (feature.key === 'SALE_MARKING_TIME' ? [
                "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", 
                "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", 
                "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", 
                "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"
            ] : ["AUTO", "MANUAL"]);

            if (options.length === 2) {
                return (
                    <div 
                        className={`relative w-48 h-11 ${theme.inputBg} rounded-2xl flex p-1.5 cursor-pointer select-none border ${theme.inputBorder}`}
                        onClick={() => {
                            const opt0 = typeof options[0] === 'object' ? options[0].value : options[0];
                            const opt1 = typeof options[1] === 'object' ? options[1].value : options[1];
                            const newValue = value === opt0 ? opt1 : opt0;
                            handleUpdateBackendSetting(feature.key, newValue);
                        }}
                    >
                        <div 
                            className={`absolute w-[calc(50%-6px)] h-[calc(100%-12px)] ${theme.buttonBg || 'bg-indigo-600'} rounded-xl shadow-md transition-transform duration-300 ease-out`}
                            style={{ 
                                transform: (value === (typeof options[1] === 'object' ? options[1].value : options[1])) ? 'translateX(100%)' : 'translateX(0)'
                            }}
                        />
                        {options.map((opt) => {
                            const label = typeof opt === 'object' ? opt.label : opt;
                            const optValue = typeof opt === 'object' ? opt.value : opt;
                            const isSelected = value === optValue;
                            return (
                                <div 
                                    key={optValue}
                                    className={`flex-1 flex items-center justify-center z-10 text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                                        isSelected ? (theme.buttonText || 'text-white') : (theme.textSecondary || 'text-slate-400')
                                    }`}
                                >
                                    {label}
                                </div>
                            );
                        })}
                    </div>
                );
            } else {
                return (
                    <CommonSelect
                        options={options}
                        value={value}
                        onChange={(val) => handleUpdateBackendSetting(feature.key, val)}
                        className="w-48"
                        triggerClassName="!py-2.5 !rounded-xl !border-[1px] !border-gray-200 dark:!border-slate-700"
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
                <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400">
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
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${theme.borderLight} pb-6`}>
                <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                        <ShoppingBag className={theme.primaryIconText} size={24} />
                        Sale Configurations
                    </h3>
                    <p className={`text-sm ${theme.textSecondary} mt-1`}>
                        Enable or disable specific sales modules based on your business needs
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className={`px-6 py-3 ${theme.buttonBg || 'bg-indigo-600'} ${theme.buttonHoverBg || 'hover:bg-indigo-700'} ${theme.buttonText || 'text-white'} rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0`}
                >
                    <Save size={18} />
                    {isSaving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {availableFeatures.map((feature) => {
                    const setting = getSettingObj(feature.key);
                    
                    // Conditional Visibility Logic
                    if (feature.key === 'SALE_MARKING_TIME') {
                         const markingType = getSettingValue('SALE_MARKING_TYPE', 'AUTO');
                         if (markingType !== 'MANUAL') return null;
                    }

                    const defaultVal = feature.type === 'boolean' ? false : (feature.key === 'SALE_MARKING_TIME' ? '00:00' : 'AUTO');
                    const value = getSettingValue(feature.key, defaultVal);

                    return (
                        <div 
                            key={feature.key} 
                            className={`p-6 ${theme.inputBg} rounded-3xl border ${theme.inputBorder} flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-indigo-400/50`}
                        >
                            <div className="space-y-1">
                                <h4 className={`font-black ${theme.textHeading} text-lg`}>{feature.displayString}</h4>
                                <p className={`text-xs ${theme.textSecondary} max-w-md`}>{feature.description}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                {renderSettingControl(feature, value, setting)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SaleSettings;
