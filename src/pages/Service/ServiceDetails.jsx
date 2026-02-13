import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Smartphone, Calendar, Wrench, ShieldCheck, Box, DollarSign } from "lucide-react";

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
    const { id } = useParams();
    const service = MOCK_DATA; // In real app, fetch based on ID

    if (!hasPermissionFor("service", "service", "view")) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <Link
                        to="/service"
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            Job Card: {service.id}
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{service.status}</span>
                        </h1>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Customer & Product Info (Grouped) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <User className="w-4 h-4" /> Customer & Product
                            </h2>
                        </div>
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</label>
                                <p className="font-medium text-gray-800">{service.customerName}</p>
                                <p className="text-sm text-gray-600">{service.mobile}</p>
                                <p className="text-sm text-gray-500">{service.address}</p>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</label>
                                <p className="font-medium text-gray-800">{service.brand} {service.product}</p>
                                <p className="text-xs text-gray-500 font-mono">IMEI: {service.imei}</p>
                                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                                    <ShieldCheck className="w-3 h-3" /> {service.warranty}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Issue Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Wrench className="w-4 h-4" /> Issue Reported
                            </h2>
                        </div>
                        <div className="p-4">
                            <p className="font-medium text-red-600 mb-1">{service.issue}</p>
                            <p className="text-gray-600 text-sm leading-relaxed">{service.description}</p>
                        </div>
                    </div>

                    {/* Service Tasks & Parts (The Core Work) */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Box className="w-4 h-4" /> Tasks & Spares
                            </h2>
                            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
                                + Add Task / Part
                            </button>
                        </div>
                        <div className="p-8 text-center text-gray-400 text-sm">
                            <p>No tasks or parts added yet.</p>
                            <p className="text-xs mt-1">Technician will update this section.</p>
                        </div>
                    </div>

                </div>

                {/* Right Column: Actions & Summary */}
                <div className="space-y-6">

                    {/* Status & Assignment */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select className="w-full px-3 py-2 border rounded-lg bg-white">
                            <option>Received</option>
                            <option>Assigned</option>
                            <option>In Progress</option>
                            <option>Pending Parts</option>
                            <option>Completed</option>
                            <option>Delivered</option>
                        </select>

                        <label className="block text-sm font-medium text-gray-700 mt-4">Assigned Technician</label>
                        <select className="w-full px-3 py-2 border rounded-lg bg-white">
                            <option value="">-- Unassigned --</option>
                            <option>Tech Mike</option>
                            <option>Tech Sarah</option>
                        </select>
                    </div>

                    {/* Cost Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> Billing
                        </h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Service Charges</span>
                                <span>$0.00</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Spare Parts</span>
                                <span>$0.00</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Tax</span>
                                <span>$0.00</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between font-bold text-gray-800 text-base">
                                <span>Total</span>
                                <span>$0.00</span>
                            </div>
                        </div>
                        <button className="w-full mt-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">
                            Generate Invoice
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ServiceDetails;
