import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Smartphone, Calendar, Wrench, ShieldCheck, Box, Coins } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { formatCurrency } from "../../utils/format";

// Mock Data
const MOCK_DATA = {
    id: "SRV-2023-001",
    customerName: "John Doe",
    mobile: "9876543210",
    address: "123 Main St, Springfield",
    product: "iPhone 13",
    brand: "Apple",
    imei: "356789098765432",
    status: "Received",
    warranty: "Valid (Manufacturer)",
    issue: "Screen Cracked",
    description: "Dropped from height, touch working but glass broken.",
    date: "2023-10-25T10:00:00",
    technician: "Unassigned",
    estimatedCost: 0,
    tasks: [],
    parts: []
};

const ServiceDetails = ({ hasPermissionFor }) => {
    const { theme, themeName } = useTheme();
    const { organization } = useApp();
    const currency = organization?.defaultCurrency || 'USD';
    const { id } = useParams();
    const service = MOCK_DATA; // In real app, fetch based on ID

    if (!hasPermissionFor("service", "service", "view")) {
        return <div className={`p-8 text-center ${theme.errorText} font-bold`}>Access Denied</div>;
    }

    return (
        <div className={`h-full flex flex-col ${theme.pageBg} overflow-auto`}>
            {/* Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between px-6 py-4 ${theme.surfaceBg} border-b ${theme.borderLight} shadow-sm shrink-0`}>
                <div className="flex items-center gap-4">
                    <Link
                        to="/service"
                        className={`p-2 hover:${theme.inputBg.replace('bg-', 'bg-')} rounded-full transition-colors ${theme.textSecondary}`}
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className={`text-xl font-bold ${theme.textHeading} flex items-center gap-2`}>
                            Job Card: {service.id}
                            <span className={`text-xs px-2 py-1 ${themeName === 'dark' ? "bg-blue-900/40 text-blue-400" : "bg-blue-100 text-blue-800"} rounded-full`}>{service.status}</span>
                        </h1>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Customer & Product Info (Grouped) */}
                    <div className={`${theme.surfaceBg} rounded-xl shadow-sm border ${theme.borderLight} overflow-hidden`}>
                        <div className={`p-4 border-b ${theme.borderLight} ${theme.pageBg} flex justify-between items-center`}>
                            <h2 className={`font-semibold ${theme.textHeading} flex items-center gap-2`}>
                                <User className="w-4 h-4" /> Customer & Product
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Customer</label>
                                <p className={`font-medium ${theme.textHeading}`}>{service.customerName}</p>
                                <p className={`text-sm ${theme.textPrimary}`}>{service.mobile}</p>
                                <p className={`text-sm ${theme.textSecondary}`}>{service.address}</p>
                            </div>
                            <div>
                                <label className={`text-xs font-semibold ${theme.textMuted} uppercase tracking-wider`}>Product</label>
                                <p className={`font-medium ${theme.textHeading}`}>{service.brand} {service.product}</p>
                                <p className={`text-xs ${theme.textSecondary} font-mono`}>IMEI: {service.imei}</p>
                                <div className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded ${themeName === 'dark' ? "bg-green-900/30 text-green-400 border-green-800/50" : "bg-green-50 text-green-700 border-green-100"} text-xs font-medium border`}>
                                    <ShieldCheck className="w-3 h-3" /> {service.warranty}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Issue Details */}
                    <div className={`${theme.surfaceBg} rounded-xl shadow-sm border ${theme.borderLight} overflow-hidden`}>
                        <div className={`p-4 border-b ${theme.borderLight} ${theme.pageBg}`}>
                            <h2 className={`font-semibold ${theme.textHeading} flex items-center gap-2`}>
                                <Wrench className="w-4 h-4" /> Issue Reported
                            </h2>
                        </div>
                        <div className="p-4">
                            <p className="font-medium text-red-500 mb-1">{service.issue}</p>
                            <p className={`${theme.textPrimary} text-sm leading-relaxed`}>{service.description}</p>
                        </div>
                    </div>

                    {/* Service Tasks & Parts (The Core Work) */}
                    <div className={`${theme.surfaceBg} rounded-xl shadow-sm border ${theme.borderLight} overflow-hidden`}>
                        <div className={`p-4 border-b ${theme.borderLight} ${theme.pageBg} flex justify-between items-center`}>
                            <h2 className={`font-semibold ${theme.textHeading} flex items-center gap-2`}>
                                <Box className="w-4 h-4" /> Tasks & Spares
                            </h2>
                            <button className={`text-xs font-medium ${theme.linkText} hover:${theme.linkHover}`}>
                                + Add Task / Part
                            </button>
                        </div>
                        <div className={`p-8 text-center ${theme.textMuted} text-sm`}>
                            <p>No tasks or parts added yet.</p>
                            <p className="text-xs mt-1">Technician will update this section.</p>
                        </div>
                    </div>

                </div>

                {/* Right Column: Actions & Summary */}
                <div className="space-y-6">

                    {/* Status & Assignment */}
                    <div className={`${theme.surfaceBg} rounded-xl shadow-sm border ${theme.borderLight} p-4 space-y-4`}>
                        <label className={`block text-sm font-medium ${theme.textPrimary}`}>Status</label>
                        <select className={`w-full px-3 py-2 border rounded-lg ${theme.inputBg} ${theme.inputText} ${theme.borderLight} ${theme.inputFocus} outline-none`}>
                            <option>Received</option>
                            <option>Assigned</option>
                            <option>In Progress</option>
                            <option>Pending Parts</option>
                            <option>Completed</option>
                            <option>Delivered</option>
                        </select>

                        <label className={`block text-sm font-medium ${theme.textPrimary} mt-4`}>Assigned Technician</label>
                        <select className={`w-full px-3 py-2 border rounded-lg ${theme.inputBg} ${theme.inputText} ${theme.borderLight} ${theme.inputFocus} outline-none`}>
                            <option value="">-- Unassigned --</option>
                            <option>Tech Mike</option>
                            <option>Tech Sarah</option>
                        </select>
                    </div>

                    {/* Cost Summary */}
                    <div className={`${theme.surfaceBg} rounded-xl shadow-sm border ${theme.borderLight} p-4`}>
                        <h3 className={`font-semibold ${theme.textHeading} mb-4 flex items-center gap-2`}>
                            <Coins className="w-4 h-4" /> Billing
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className={`flex justify-between ${theme.textPrimary}`}>
                                <span>Service Charges</span>
                                <span>{formatCurrency(0, currency)}</span>
                            </div>
                            <div className={`flex justify-between ${theme.textPrimary}`}>
                                <span>Spare Parts</span>
                                <span>{formatCurrency(0, currency)}</span>
                            </div>
                            <div className={`flex justify-between ${theme.textSecondary}`}>
                                <span>Tax</span>
                                <span>{formatCurrency(0, currency)}</span>
                            </div>
                            <div className={`border-t ${theme.borderLight} pt-2 mt-2 flex justify-between font-bold ${theme.textHeading} text-base`}>
                                <span>Total</span>
                                <span>{formatCurrency(0, currency)}</span>
                            </div>
                        </div>
                        <button className={`w-full mt-6 py-2 ${theme.successBg} ${theme.successText} rounded-lg font-medium hover:opacity-80 transition-colors shadow-sm`}>
                            Generate Invoice
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ServiceDetails;
