import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Calendar, User, Wrench } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Placeholder data - replace with API call
const MOCK_SERVICES = [
    {
        id: "SRV-2023-001",
        customerName: "John Doe",
        mobile: "9876543210",
        product: "iPhone 13",
        status: "Received",
        date: "2023-10-25T10:00:00",
    },
    {
        id: "SRV-2023-002",
        customerName: "Jane Smith",
        mobile: "8765432109",
        product: "Samsung S21",
        status: "In Progress",
        date: "2023-10-24T14:30:00",
    },
    {
        id: "SRV-2023-003",
        customerName: "Bob Johnson",
        mobile: "7654321098",
        product: "Dell XPS 13",
        status: "Completed",
        date: "2023-10-23T09:15:00",
    },
];

const STATUS_COLORS = {
    Received: "bg-blue-100 text-blue-800",
    "In Progress": "bg-yellow-100 text-yellow-800",
    Completed: "bg-green-100 text-green-800",
    Delivered: "bg-gray-100 text-gray-800",
    Closed: "bg-gray-200 text-gray-600",
};

const ServiceList = ({ hasPermissionFor }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");

    // Permission check
    const canView = hasPermissionFor("service", "service", "view");
    const canCreate = hasPermissionFor("service", "jobcard", "create");

    if (!canView) {
        return <div className={`p-8 text-center ${theme.errorText} font-bold`}>Access Denied</div>;
    }

    const filteredServices = MOCK_SERVICES.filter((service) => {
        const matchesSearch =
            service.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.mobile.includes(searchTerm) ||
            service.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.product.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus =
            filterStatus === "All" || service.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className={`h-full flex flex-col ${theme.pageBg}`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 ${theme.surfaceBg} border-b ${theme.borderLight} shadow-sm shrink-0`}>
                <div>
                    <h1 className={`text-2xl font-bold ${theme.textHeading}`}>Service Jobs</h1>
                    <p className={`text-sm ${theme.textMuted}`}>Manage repair orders & job cards</p>
                </div>
                {canCreate && (
                    <Link
                        to="/service/new"
                        className={`flex items-center gap-2 px-4 py-2 ${theme.buttonBg} ${theme.buttonText} rounded-lg ${theme.buttonHoverBg} transition-colors shadow-sm`}
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Job Card</span>
                    </Link>
                )}
            </div>

            {/* Filters & Search */}
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
                <div className="md:col-span-4 relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textSecondary} w-5 h-5`} />
                    <input
                        type="text"
                        placeholder="Search by name, mobile, ID, product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-lg ${theme.inputFocus} outline-none focus:ring-2`}
                    />
                </div>
                <div className="md:col-span-3">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className={`w-full px-4 py-2 border ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} rounded-lg ${theme.inputFocus} outline-none focus:ring-2`}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Received">Received</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            onClick={() => navigate(`/service/${service.id}`)}
                            className={`${theme.surfaceBg} rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border ${theme.borderLight} overflow-hidden flex flex-col`}
                        >
                            <div className="p-4 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`font-mono text-xs ${theme.textMuted} ${theme.pageBg} px-2 py-1 rounded`}>
                                        {service.id}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[service.status] || "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {service.status}
                                    </span>
                                </div>

                                <h3 className={`font-semibold ${theme.textHeading} mb-1 flex items-center gap-2`}>
                                    <Wrench className={`w-4 h-4 ${theme.textSecondary}`} />
                                    {service.product}
                                </h3>

                                <div className={`flex items-center gap-2 text-sm ${theme.textPrimary} mb-1`}>
                                    <User className={`w-4 h-4 ${theme.textSecondary}`} />
                                    {service.customerName}
                                </div>
                                <div className={`text-xs ${theme.textMuted} ml-6 mb-3`}>
                                    {service.mobile}
                                </div>

                                <div className={`flex items-center gap-2 text-xs ${theme.textSecondary} mt-auto pt-3 border-t ${theme.borderLight}`}>
                                    <Calendar className="w-3 h-3" />
                                    {new Date(service.date).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredServices.length === 0 && (
                        <div className={`col-span-full py-12 text-center ${theme.textMuted}`}>
                            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>No service jobs found matching your criteria.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ServiceList;
