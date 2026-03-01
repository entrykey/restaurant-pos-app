import React, { useState } from "react";
import {
    Settings as SettingsIcon,
    Plus,
    Trash2,
    LayoutDashboard,
    History,
    Search,
    Package,
    Store,
    CreditCard,
    Palette
} from "lucide-react";
import { TABLE_AREAS } from "./SettingsService";
import AttributeSettings from "./AttributeSettings";
import UnitSettings from "./UnitSettings";
import CategorySettings from "./CategorySettings";
import AppearanceSettings from "./AppearanceSettings";
import { ROUTE_ACCESS } from "../../config/permissionStructure";
import { useTheme } from "../../context/ThemeContext";
import CommonTable from "../../components/CommonTable";
import DatePicker from "../../components/ui/DatePicker";

const Settings = ({
    settings,
    setSettings,
    tables,
    setTables,
    authLogs,
    hasPermissionFor,
}) => {
    const { theme } = useTheme();
    const canViewGeneral = hasPermissionFor?.(ROUTE_ACCESS.SETTINGS.module, ROUTE_ACCESS.SETTINGS.resource, ROUTE_ACCESS.SETTINGS.action);
    const canViewAttributes = hasPermissionFor?.('settings', 'inventory_settings', 'manage');

    // Need to initialize state properly since we can't use useState conditionally
    const [activeTab, setActiveTab] = useState(canViewGeneral ? "general" : (canViewAttributes ? "attributes" : ""));
    const [newTableName, setNewTableName] = useState("");
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableArea, setNewTableArea] = useState("AC");
    const [logSearch, setLogSearch] = useState("");
    const [logDateFilter, setLogDateFilter] = useState(
        new Date().toISOString().split("T")[0]
    );

    if (!canViewGeneral && !canViewAttributes) {
        return (
            <div className={`p-8 text-center ${theme.textSecondary} font-bold`}>
                You don't have permission to access settings.
            </div>
        );
    }

    const handleAddTable = () => {
        const nextId =
            tables.length > 0 ? Math.max(...tables.map((t) => t.id)) + 1 : 1;
        const name = newTableName.trim() || `Table ${nextId}`;
        setTables([
            ...tables,
            {
                id: nextId,
                name,
                status: "available",
                order: null,
                startTime: null,
                capacity: parseInt(newTableCapacity) || 4,
                area: newTableArea || "AC",
                isMaintenance: false,
            },
        ]);
        setNewTableName("");
    };

    const filteredLogs = authLogs.filter((log) => {
        const matchesSearch =
            log.role.toLowerCase().includes(logSearch.toLowerCase()) ||
            log.phone.includes(logSearch);
        const matchesDate = !logDateFilter || log.date === logDateFilter;
        return matchesSearch && matchesDate;
    });

    const allTabs = [
        { id: "general", label: "General", icon: Store, show: canViewGeneral },
        { id: "tables", label: "Tables", icon: LayoutDashboard, show: canViewGeneral },
        { id: "attributes", label: "Inventory Settings", icon: Package, show: canViewAttributes },
        { id: "appearance", label: "Appearance", icon: Palette, show: true },
        { id: "activity", label: "Activity", icon: History, show: canViewGeneral },
    ];
    const tabs = allTabs.filter(t => t.show !== false);

    const renderContent = () => {
        switch (activeTab) {
            case "general":
                return (
                    <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <h3 className={`text-xl font-bold flex items-center gap-2 ${theme.textHeading}`}>
                            <Store className={theme.primaryIconText} /> Shop Identity & Tax
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>
                                    Business Name
                                </label>
                                <input
                                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                    value={settings.shopName}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            shopName: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>
                                    UPI ID
                                </label>
                                <input
                                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                    value={settings.upiId}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            upiId: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <label className={`text-xs font-black ${theme.textSecondary} uppercase`}>
                                    Default Tax (%)
                                </label>
                                <input
                                    type="number"
                                    className={`w-full p-4 ${theme.inputBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} transition-all font-bold ${theme.inputText}`}
                                    value={
                                        isNaN(settings.defaultTaxPercent)
                                            ? ""
                                            : settings.defaultTaxPercent
                                    }
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setSettings({
                                            ...settings,
                                            defaultTaxPercent: isNaN(val) ? "" : val,
                                        });
                                    }}
                                />
                            </div>
                            <div className={`flex items-center justify-between p-4 ${theme.inputBg} rounded-2xl border border-transparent transition-all`}>
                                <span className={`font-bold ${theme.textPrimary}`}>
                                    Enable Tax Calculation
                                </span>
                                <button
                                    onClick={() =>
                                        setSettings({
                                            ...settings,
                                            isTaxEnabled: !settings.isTaxEnabled,
                                        })
                                    }
                                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${settings.isTaxEnabled ? theme.buttonBg.replace('bg-', 'bg-') : "bg-gray-300"
                                        }`}
                                >
                                    <div
                                        className={`w-4 h-4 bg-white rounded-full transition-transform ${settings.isTaxEnabled ? "translate-x-6" : ""
                                            }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case "tables":
                return (
                    <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-3 ${theme.primaryIconBg} rounded-2xl ${theme.primaryIconText}`}>
                                <LayoutDashboard size={24} />
                            </div>
                            <h3 className={`text-xl font-bold ${theme.textHeading}`}>Table Management</h3>
                        </div>

                        <div className={`flex flex-col gap-4 ${theme.inputBg} p-6 rounded-3xl border border-dashed ${theme.inputBorder}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    placeholder="New Table Name (e.g. Patio 1)"
                                    className={`w-full p-4 ${theme.surfaceBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} font-bold ${theme.inputText}`}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        value={newTableCapacity}
                                        onChange={(e) => setNewTableCapacity(e.target.value)}
                                        placeholder="Capacity"
                                        className={`w-full p-4 ${theme.surfaceBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} font-bold ${theme.inputText}`}
                                    />
                                    <select
                                        value={newTableArea}
                                        onChange={(e) => setNewTableArea(e.target.value)}
                                        className={`w-full p-4 ${theme.surfaceBg} border ${theme.inputBorder} rounded-2xl outline-none ${theme.inputFocus} font-bold ${theme.inputText}`}
                                    >
                                        {TABLE_AREAS.map((area) => (
                                            <option key={area} value={area}>
                                                {area}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleAddTable}
                                className={`w-full md:w-auto ${theme.buttonBg} ${theme.buttonText} px-8 py-3 md:py-4 rounded-2xl font-bold shadow-lg ${theme.buttonHoverBg} transition-colors flex items-center justify-center gap-2 self-end shadow-indigo-200`}
                            >
                                <Plus size={20} /> Add Table
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                            {tables.map((t) => (
                                <div
                                    key={t.id}
                                    className={`${theme.surfaceBg} px-5 py-4 rounded-3xl border-2 flex flex-col justify-between group transition-all hover:scale-[1.02] shadow-sm ${t.isMaintenance ? "border-red-200 bg-red-50" : `${theme.inputBorder}`
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`font-black text-lg ${t.isMaintenance ? "text-red-500" : theme.textHeading}`}>
                                            {t.name}
                                        </span>
                                        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() =>
                                                    setTables(
                                                        tables.map((table) =>
                                                            table.id === t.id
                                                                ? {
                                                                    ...table,
                                                                    isMaintenance: !table.isMaintenance,
                                                                }
                                                                : table
                                                        )
                                                    )
                                                }
                                                className={`p-2 rounded-xl transition-colors ${t.isMaintenance
                                                    ? "text-red-600 bg-red-100"
                                                    : `${theme.textSecondary} hover:${theme.warningText} ${theme.warningBg.replace('bg-', 'hover:bg-')}`
                                                    }`}
                                                title="Maintenance Mode"
                                            >
                                                <SettingsIcon size={16} />
                                            </button>
                                            {t.status === "available" && (
                                                <button
                                                    onClick={() =>
                                                        setTables(
                                                            tables.filter((table) => table.id !== t.id)
                                                        )
                                                    }
                                                    className={`p-2 rounded-xl transition-colors ${theme.textSecondary} hover:text-red-500 hover:bg-red-50`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`text-xs font-bold ${theme.textSecondary} flex gap-2`}>
                                        <span className={`${theme.inputBg} px-2 py-1 rounded-lg`}>{t.capacity} Seater</span>
                                        <span className={`${theme.inputBg} px-2 py-1 rounded-lg`}>{t.area}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "attributes":
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <CategorySettings />
                        <AttributeSettings />
                        <UnitSettings />
                    </div>
                );

            case "appearance":
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        <AppearanceSettings />
                    </div>
                );

            case "activity":
                return (
                    <div className={`${theme.surfaceBg} p-6 md:p-8 rounded-[40px] shadow-xl border ${theme.borderLight} space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 ${theme.primaryIconBg} rounded-2xl ${theme.primaryIconText}`}>
                                    <History size={24} />
                                </div>
                                <h3 className={`text-xl font-bold ${theme.textHeading}`}>Login Activity Logs</h3>
                            </div>
                            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                <div className="relative">
                                    <Search
                                        className={`absolute left-3 top-3 ${theme.textSecondary}`}
                                        size={16}
                                    />
                                    <input
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        placeholder="Search Role/Phone..."
                                        className={`pl-10 p-2.5 border ${theme.inputBorder} rounded-xl ${theme.inputBg} text-sm ${theme.inputFocus} outline-none w-full font-bold ${theme.inputText}`}
                                    />
                                </div>
                                <DatePicker
                                    value={logDateFilter}
                                    onChange={val => setLogDateFilter(val)}
                                />
                            </div>
                        </div>

                        <CommonTable
                            columns={[
                                {
                                    header: "Role", key: "role", render: (value) => (
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${value === "Admin" ? "bg-purple-100 text-purple-600" :
                                            value === "Manager" ? "bg-blue-100 text-blue-600" :
                                                "bg-green-100 text-green-600"
                                            }`}>{value}</span>
                                    )
                                },
                                { header: "Phone", key: "phone", className: `font-bold ${theme.textPrimary}` },
                                { header: "Date", key: "date", className: `${theme.textMuted} text-sm` },
                                { header: "Time", key: "time", className: `font-medium ${theme.textPrimary}` }
                            ]}
                            data={filteredLogs}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className={`p-4 md:p-8 h-full overflow-hidden flex flex-col ${theme.pageBg}`}>
            <h2 className={`text-2xl md:text-4xl font-black mb-6 flex items-center shrink-0 ${theme.textHeading}`}>
                <SettingsIcon className={`mr-3 ${theme.primaryIconText}`} /> Control Center
            </h2>

            <div className={`inline-flex w-max p-1.5 gap-1 mb-6 shrink-0 no-scrollbar rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm overflow-x-auto`}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap
                                ${isActive
                                    ? `${theme.buttonBg} ${theme.buttonText} shadow-md`
                                    : `bg-transparent ${theme.textSecondary} hover:${theme.inputBg.replace('bg-', '')} hover:${theme.textPrimary}`
                                }
                            `}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-y-auto pb-20 pt-2 custom-scrollbar">
                {renderContent()}
            </div>
        </div>
    );
};

export default Settings;
