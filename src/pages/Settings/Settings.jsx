import React, { useState } from "react";
import {
    Settings as SettingsIcon,
    Plus,
    Trash2,
    LayoutDashboard,
    History,
    Search,
    Save,
} from "lucide-react";
import { TABLE_AREAS } from "./SettingsService";
import CommonTable from "../../components/CommonTable";

const Settings = ({
    settings,
    setSettings,
    tables,
    setTables,
    authLogs,
    hasPermission,
}) => {
    const [newTableName, setNewTableName] = useState("");
    const [newTableCapacity, setNewTableCapacity] = useState(4);
    const [newTableArea, setNewTableArea] = useState("AC");
    const [logSearch, setLogSearch] = useState("");
    const [logDateFilter, setLogDateFilter] = useState(
        new Date().toISOString().split("T")[0]
    );

    if (!hasPermission("ACCESS_SETTINGS")) {
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

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto">
            <h2 className="text-2xl md:text-4xl font-black mb-10 flex items-center text-gray-800">
                <SettingsIcon className="mr-3 text-indigo-600" /> Control Center
            </h2>
            <div className="space-y-8 pb-20">
                {/* Identity & Tax */}
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-6">
                    <h3 className="text-xl font-bold">Shop Identity & Tax</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-400 uppercase">
                                Business Name
                            </label>
                            <input
                                className="w-full p-4 bg-gray-50 border rounded-2xl"
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
                                className="w-full p-4 bg-gray-50 border rounded-2xl"
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
                                className="w-full p-4 bg-gray-50 border rounded-2xl"
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
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
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

                {/* Table Management */}
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                            <LayoutDashboard size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Table Management</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                value={newTableName}
                                onChange={(e) => setNewTableName(e.target.value)}
                                placeholder="New Table Name (e.g. Patio 1)"
                                className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="number"
                                    value={newTableCapacity}
                                    onChange={(e) => setNewTableCapacity(e.target.value)}
                                    placeholder="Capacity"
                                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <select
                                    value={newTableArea}
                                    onChange={(e) => setNewTableArea(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
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
                            className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3 md:py-4 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 self-end"
                        >
                            <Plus size={20} /> Add Table
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {tables.map((t) => (
                            <div
                                key={t.id}
                                className={`bg-gray-50 px-4 py-3 rounded-2xl border flex flex-col justify-between group ${t.isMaintenance ? "border-red-200 bg-red-50" : ""
                                    }`}
                            >
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-gray-600">{t.name}</span>
                                    <div className="flex gap-1">
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
                                            className={`p-1 rounded-lg ${t.isMaintenance
                                                ? "text-red-600 bg-red-100"
                                                : "text-gray-300 hover:text-orange-500"
                                                }`}
                                            title="Maintenance Mode"
                                        >
                                            <SettingsIcon size={14} />
                                        </button>
                                        {t.status === "available" && (
                                            <button
                                                onClick={() =>
                                                    setTables(
                                                        tables.filter((table) => table.id !== t.id)
                                                    )
                                                }
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-400 font-medium flex gap-2">
                                    <span>{t.capacity} Seater</span>
                                    <span>•</span>
                                    <span>{t.area}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Logs */}
                <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-6">
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
                                    className="pl-10 p-2.5 border rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                />
                            </div>
                            <input
                                type="date"
                                value={logDateFilter}
                                onChange={(e) => setLogDateFilter(e.target.value)}
                                className="p-2.5 border rounded-xl bg-gray-50 text-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border">
                        <table className="w-full text-left border-collapse min-w-[500px]">
                            <thead className="bg-gray-50">
                                <tr className="text-[10px] text-gray-400 uppercase font-black tracking-widest border-b">
                                    <th className="p-4">Role</th>
                                    <th className="p-4">Phone Number</th>
                                    <th className="p-4">Date</th>
                                    <th className="p-4">Login Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="border-b last:border-0 hover:bg-gray-50"
                                        >
                                            <td className="p-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${log.role === "Admin"
                                                        ? "bg-purple-100 text-purple-600"
                                                        : log.role === "Manager"
                                                            ? "bg-blue-100 text-blue-600"
                                                            : "bg-green-100 text-green-600"
                                                        }`}
                                                >
                                                    {log.role}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-gray-700 text-sm">
                                                {log.phone}
                                            </td>
                                            <td className="p-4 text-gray-500 text-sm">{log.date}</td>
                                            <td className="p-4 font-medium text-gray-800 text-sm">
                                                {log.time}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan="4"
                                            className="p-8 text-center text-gray-400 italic text-sm"
                                        >
                                            No logs found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Settings;
