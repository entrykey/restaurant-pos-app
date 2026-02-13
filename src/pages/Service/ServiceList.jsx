import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Calendar, User, Wrench } from "lucide-react";

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
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");

    // Permission check
    const canView = hasPermissionFor("service", "service", "view");
    const canCreate = hasPermissionFor("service", "jobcard", "create");

    if (!canView) {
        return <div className="p-8 text-center text-red-500">Access Denied</div>;
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
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Service Jobs</h1>
                    <p className="text-sm text-gray-500">Manage repair orders & job cards</p>
                </div>
                {canCreate && (
                    <Link
                        to="/service/new"
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Job Card</span>
                    </Link>
                )}
            </div>

            {/* Filters & Search */}
            <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-4 shrink-0">
                <div className="md:col-span-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name, mobile, ID, product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                </div>
                <div className="md:col-span-3">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
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
                            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 overflow-hidden flex flex-col"
                        >
                            <div className="p-4 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {service.id}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[service.status] || "bg-gray-100 text-gray-800"
                                            }`}
                                    >
                                        {service.status}
                                    </span>
                                </div>

                                <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
                                    <Wrench className="w-4 h-4 text-gray-400" />
                                    {service.product}
                                </h3>

                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                    <User className="w-4 h-4 text-gray-400" />
                                    {service.customerName}
                                </div>
                                <div className="text-xs text-gray-500 ml-6 mb-3">
                                    {service.mobile}
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto pt-3 border-t border-gray-50">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(service.date).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredServices.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400">
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
