import React from 'react';
import { Palette, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const AppearanceSettings = () => {
    const { theme, themeName, setTheme, availableThemes } = useTheme();

    return (
        <div className={`p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.surfaceBg} ${theme.borderLight} space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
            <div className={`flex justify-between items-center border-b ${theme.borderLight} pb-6`}>
                <div>
                    <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                        <Palette className={theme.primaryIconText} size={24} />
                        Appearance Settings
                    </h3>
                    <p className={`text-sm ${theme.textSecondary} mt-1`}>
                        Customize the look and feel of your workspace
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className={`text-lg font-bold mb-4 ${theme.textHeading}`}>Application Theme</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableThemes.map((t) => (
                            <div
                                key={t}
                                onClick={() => setTheme(t)}
                                className={`
                                    relative p-6 rounded-3xl border-2 cursor-pointer transition-all hover:scale-[1.02]
                                    ${themeName === t ? `${theme.borderLight} ${theme.buttonBg} shadow-lg shadow-indigo-200/50` : `${theme.inputBorder} ${theme.inputBg} hover:${theme.primaryIconText}`}
                                `}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`font-black uppercase tracking-wider ${themeName === t ? 'text-white' : theme.textPrimary}`}>
                                        {t} Mode
                                    </span>
                                    {themeName === t && <CheckCircle2 size={20} className="text-white" />}
                                </div>
                                <p className={`text-sm font-medium ${themeName === t ? 'text-indigo-100' : theme.textSecondary}`}>
                                    Switch to the {t} color palette.
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppearanceSettings;
