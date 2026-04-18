import React from 'react';
import { ShoppingBag, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useApp } from '../../context/AppContext';

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
    const SALE_FEATURES = [
        {
            key: 'ENABLE_STOCK_ITEMS',
            featureKey: 'sellStockItems',
            displayString: 'Enable Stock Items',
            description: 'Allow selling of predefined stock items from your inventory.'
        },
        {
            key: 'ENABLE_MANUFACTURED_ITEMS',
            featureKey: 'sellManufacturedItems',
            displayString: 'Enable Manufactured Items',
            description: 'Allow selling of items produced or manufactured in-house.'
        },
        {
            key: 'ENABLE_TRADE_ITEMS',
            featureKey: 'sellTradeItems',
            displayString: 'Enable Trade Items',
            description: 'Allow selling of trade-based items or services.'
        }
    ];

    // Filter features based on Business Type capabilities
    const availableFeatures = SALE_FEATURES.filter(feature => {
        // If businessTypeData is not loaded yet, default to hidden or shown based on requirements
        if (!businessTypeData || !businessTypeData.features) return false;
        return businessTypeData.features[feature.featureKey] === true;
    });

    const getSettingValue = (key) => {
        const setting = backendSettings.find(s => s.key === key);
        return setting ? setting.value : false;
    };

    const isSettingChanged = (key) => {
        // This logic is usually handled in Settings.jsx, but we can verify here if needed
        return true; 
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
                    const value = getSettingValue(feature.key);
                    const setting = backendSettings.find(s => s.key === feature.key);
                    
                    // If setting doesn't exist in backendSettings yet, we mock a basic version for handleSaveBackendSetting
                    const settingObj = setting || { 
                        key: feature.key, 
                        value: false, 
                        displayString: feature.displayString,
                        description: feature.description,
                        isNew: true 
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
                                <button
                                    onClick={() => handleUpdateBackendSetting(feature.key, !value)}
                                    className={`w-14 h-7 rounded-full transition-all flex items-center px-1.5 ${value ? theme.buttonBg : "bg-gray-300"}`}
                                >
                                    <div className={`w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-6.5" : ""}`} />
                                </button>

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
