import React, { useState } from 'react';
import { Briefcase, Layers, Zap } from 'lucide-react';
import { useTheme } from "../../context/ThemeContext";

import BusinessTypesTab from './BusinessTypesTab';
import BusinessSubTypesTab from './BusinessSubTypesTab';
import CapabilitiesTab from './CapabilitiesTab';

const BusinessTypesPage = () => {
    const { theme } = useTheme();
    const [activeTab, setActiveTab] = useState('types');

    return (
        <div className={`h-full flex flex-col ${theme.pageBg} ${theme.textPrimary}`}>
            <div className={`p-4 md:p-6 pb-0 border-b ${theme.borderLight}`}>
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 ${theme.primaryIconBg} rounded-2xl ${theme.primaryIconText}`}>
                        <Briefcase size={24} />
                    </div>
                    <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${theme.textHeading}`}>
                        Business Types Management
                    </h1>
                </div>

                <div className="flex gap-4 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab('types')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold whitespace-nowrap transition-colors ${activeTab === 'types'
                            ? `border-indigo-600 text-indigo-600`
                            : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
                            }`}
                    >
                        <Briefcase size={18} />
                        Business Types
                    </button>
                    <button
                        onClick={() => setActiveTab('subtypes')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold whitespace-nowrap transition-colors ${activeTab === 'subtypes'
                            ? `border-indigo-600 text-indigo-600`
                            : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
                            }`}
                    >
                        <Layers size={18} />
                        Sub Types
                    </button>
                    <button
                        onClick={() => setActiveTab('capabilities')}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold whitespace-nowrap transition-colors ${activeTab === 'capabilities'
                            ? `border-indigo-600 text-indigo-600`
                            : `border-transparent ${theme.textMuted} hover:${theme.textPrimary}`
                            }`}
                    >
                        <Zap size={18} />
                        Capabilities
                    </button>
                </div>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${theme.pageBg}`}>
                {activeTab === 'types' && <BusinessTypesTab />}
                {activeTab === 'subtypes' && <BusinessSubTypesTab />}
                {activeTab === 'capabilities' && <CapabilitiesTab />}
            </div>
        </div>
    );
};

export default BusinessTypesPage;
