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
    CreditCard
} from "lucide-react";
import { TABLE_AREAS } from "./SettingsService";
import InventorySettings from "./InventorySettings";
import { ROUTE_ACCESS } from "../../config/permissionStructure";

const Settings = ({
    settings,
    setSettings,
    tables,
    setTables,
    authLogs,
    hasPermissionFor,
}) => {
    const [activeTab, setActiveTab] = useState("general");
    const [newTableName, setNewTableName] = useState("");
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableArea, setNewTableArea] = useState("AC");
    const [logSearch, setLogSearch] = useState("");
    const [logDateFilter, setLogDateFilter] = useState(
        new Date().toISOString().split("T")[0]
    );

    const settingsAccess = ROUTE_ACCESS.SETTINGS;
    const canView = hasPermissionFor?.(settingsAccess.module, settingsAccess.resource, settingsAccess.action);
    if (!canView) {
        return (
            <div className="p-8 text-center text-gray-500 font-bold">
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

    const tabs = [
        { id: "general", label: "General", icon: Store },
        { id: "tables", label: "Tables", icon: LayoutDashboard },
        { id: "inventory", label: "Inventory", icon: Package },
        { id: "activity", label: "Activity", icon: History },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case "general":
                return (
                    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Store className="text-indigo-600" /> Shop Identity & Tax
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase">
                                    Business Name
                                </label>
                                <input
                                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
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
                                <label className="text-xs font-black text-gray-400 uppercase">
                                    UPI ID
                                </label>
                                <input
                                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
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
                                <label className="text-xs font-black text-gray-400 uppercase">
                                    Default Tax (%)
                                </label>
                                <input
                                    type="number"
                                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold"
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
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all">
                                <span className="font-bold text-gray-700">
                                    Enable Tax Calculation
                                </span>
                                <button
                                    onClick={() =>
                                        setSettings({
                                            ...settings,
                                            isTaxEnabled: !settings.isTaxEnabled,
                                        })
                                    }
                                    className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${settings.isTaxEnabled ? "bg-indigo-600" : "bg-gray-300"
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
                    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <LayoutDashboard size={24} />
                            </div>
                            <h3 className="text-xl font-bold">Table Management</h3>
                        </div>

                        <div className="flex flex-col gap-4 bg-gray-50 p-6 rounded-3xl border border-dashed border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input
                                    value={newTableName}
                                    onChange={(e) => setNewTableName(e.target.value)}
                                    placeholder="New Table Name (e.g. Patio 1)"
                                    className="w-full p-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="number"
                                        value={newTableCapacity}
                                        onChange={(e) => setNewTableCapacity(e.target.value)}
                                        placeholder="Capacity"
                                        className="w-full p-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                    />
                                    <select
                                        value={newTableArea}
                                        onChange={(e) => setNewTableArea(e.target.value)}
                                        className="w-full p-4 bg-white border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
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
                                className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 md:py-4 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 self-end shadow-indigo-200"
                            >
                                <Plus size={20} /> Add Table
                            </button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                            {tables.map((t) => (
                                <div
                                    key={t.id}
                                    className={`bg-white px-5 py-4 rounded-3xl border-2 flex flex-col justify-between group transition-all hover:scale-[1.02] shadow-sm ${t.isMaintenance ? "border-red-200 bg-red-50" : "border-gray-100 hover:border-indigo-100"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`font-black text-lg ${t.isMaintenance ? "text-red-500" : "text-gray-700"}`}>
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
                                                    : "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
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
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-gray-400 flex gap-2">
                                        <span className="bg-gray-100 px-2 py-1 rounded-lg">{t.capacity} Seater</span>
                                        <span className="bg-gray-100 px-2 py-1 rounded-lg">{t.area}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case "inventory":
                return (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <InventorySettings />
                    </div>
                );

            case "activity":
                return (
                    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                    <History size={24} />
                                </div>
                                <h3 className="text-xl font-bold">Login Activity Logs</h3>
                            </div>
                            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                <div className="relative">
                                    <Search
                                        className="absolute left-3 top-3 text-gray-400"
                                        size={16}
                                    />
                                    <input
                                        value={logSearch}
                                        onChange={(e) => setLogSearch(e.target.value)}
                                        placeholder="Search Role/Phone..."
                                        className="pl-10 p-2.5 border rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full font-bold"
                                    />
                                </div>
                                <input
                                    type="date"
                                    value={logDateFilter}
                                    onChange={(e) => setLogDateFilter(e.target.value)}
                                    className="p-2.5 border rounded-xl bg-gray-50 text-sm outline-none font-bold text-gray-600"
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
                                { header: "Phone", key: "phone", className: "font-bold text-gray-700" },
                                { header: "Date", key: "date", className: "text-gray-500 text-sm" },
                                { header: "Time", key: "time", className: "font-medium text-gray-800" }
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
        <div className="p-4 md:p-8 h-full overflow-hidden flex flex-col">
            <h2 className="text-2xl md:text-4xl font-black mb-6 flex items-center text-gray-800 shrink-0">
                <SettingsIcon className="mr-3 text-indigo-600" /> Control Center
            </h2>

            <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 no-scrollbar">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap
                                ${isActive
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105"
                                    : "bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-600 border border-transparent"
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
