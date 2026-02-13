import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Smartphone, User, FileText, ShieldCheck } from "lucide-react";

const ServiceCreate = ({ hasPermissionFor }) => {
    const navigate = useNavigate();

    // Permission Check
    if (!hasPermissionFor("service", "jobcard", "create")) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
    }

    const [formData, setFormData] = useState({
        // Customer
        customerName: "",
        mobile: "",
        email: "",
        address: "",
        // Product
        productType: "Mobile",
        brand: "",
        model: "",
        serialNumber: "",
        purchaseDate: "",
        isSoldByUs: false,
        // Warranty
        hasWarranty: false,
        warrantyType: "Manufacturer",
        // Issue
        issueCategory: "Screen",
        issueDescription: "",
        accessories: [], // e.g. ["Charger", "SIM"]
        remarks: "",
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Submitting Service Job:", formData);
        // TODO: API Call to create service
        // Simulate success
        alert("Job Card Created Successfully! (Mock)");
        navigate("/service");
    };

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
                        <h1 className="text-xl font-bold text-gray-800">New Job Card</h1>
                        <p className="text-sm text-gray-500">Create a new service request</p>
                    </div>
                </div>
                <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Save className="w-5 h-5" />
                    <span>Create Job Card</span>
                </button>
            </div>

            <div className="max-w-5xl mx-auto w-full p-6 space-y-6">

                {/* 1. Customer Details */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-indigo-600" />
                        Customer Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                            <input
                                type="text"
                                name="customerName"
                                required
                                value={formData.customerName}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                            <input
                                type="tel"
                                name="mobile"
                                required
                                value={formData.mobile}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* 2. Product Details */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-indigo-600" />
                        Product Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                            <select
                                name="productType"
                                value={formData.productType}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                            >
                                <option>Mobile</option>
                                <option>Electronics</option>
                                <option>Laptop/PC</option>
                                <option>Appliance</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                            <input
                                type="text"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Model Name/No.</label>
                            <input
                                type="text"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Serial No / IMEI / Chassis</label>
                            <input
                                type="text"
                                name="serialNumber"
                                value={formData.serialNumber}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </section>

                {/* 3. Warranty & Purchase */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" />
                        Warranty Status
                    </h2>
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="isSoldByUs"
                                    name="isSoldByUs"
                                    checked={formData.isSoldByUs}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="isSoldByUs" className="cursor-pointer select-none">
                                    <span className="block font-medium text-gray-800">Sold by our shop?</span>
                                    <span className="text-xs text-gray-500">Check this to auto-fetch warranty if invoice exists</span>
                                </label>
                            </div>

                            <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="hasWarranty"
                                    name="hasWarranty"
                                    checked={formData.hasWarranty}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor="hasWarranty" className="cursor-pointer select-none">
                                    <span className="block font-medium text-gray-800">Under Warranty?</span>
                                </label>
                            </div>
                        </div>

                        <div className={`flex-1 grid grid-cols-1 gap-4 ${!formData.hasWarranty ? 'opacity-50 pointer-events-none' : ''}`}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Type</label>
                                <select
                                    name="warrantyType"
                                    value={formData.warrantyType}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                                >
                                    <option>Manufacturer</option>
                                    <option>Shop Warranty</option>
                                    <option>Extended Warranty</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                                <input
                                    type="date"
                                    name="purchaseDate"
                                    value={formData.purchaseDate}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. Issue Description */}
                <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        Issue & Condition
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Category</label>
                            <select
                                name="issueCategory"
                                value={formData.issueCategory}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                            >
                                <option>Screen / Display</option>
                                <option>Battery / Power</option>
                                <option>Software</option>
                                <option>Audio / Mic</option>
                                <option>Physical Damage</option>
                                <option>Water Damage</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Problem Description</label>
                            <textarea
                                name="issueDescription"
                                rows="3"
                                placeholder="Describe the issue in detail..."
                                value={formData.issueDescription}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Internal)</label>
                            <textarea
                                name="remarks"
                                rows="2"
                                placeholder="Any internal notes..."
                                value={formData.remarks}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                            ></textarea>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};

export default ServiceCreate;
