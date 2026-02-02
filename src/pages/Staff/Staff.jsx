import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import CommonTable from "../../components/CommonTable";
import { PERMISSIONS } from "./StaffService";

const Staff = ({
    staffList,
    setStaffList,
    rolesList,
    setRolesList,
    hasPermission,
}) => {
    const [activeStaffTab, setActiveStaffTab] = useState("staff");
    const [newStaffName, setNewStaffName] = useState("");
    const [newStaffPhone, setNewStaffPhone] = useState("");
    const [newStaffRole, setNewStaffRole] = useState("Staff");

    if (!hasPermission("MANAGE_STAFF")) {
        return (
            <div className="p-8 text-center text-gray-500 font-bold">
                You do not have permission to access Staff Management.
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <h2 className="text-2xl md:text-4xl font-black text-gray-800 flex items-center">
                    <ShieldCheck className="mr-3 text-indigo-600" /> Staff & Roles
                </h2>
                <div className="flex bg-white p-1 rounded-xl shadow-sm border w-full md:w-auto">
                    <button
                        onClick={() => setActiveStaffTab("staff")}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold transition-all ${activeStaffTab === "staff"
                                ? "bg-indigo-600 text-white shadow"
                                : "text-gray-500"
                            }`}
                    >
                        Staff Members
                    </button>
                    <button
                        onClick={() => setActiveStaffTab("roles")}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold transition-all ${activeStaffTab === "roles"
                                ? "bg-indigo-600 text-white shadow"
                                : "text-gray-500"
                            }`}
                    >
                        Roles
                    </button>
                </div>
            </div>

            {activeStaffTab === "staff" ? (
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-3xl shadow-lg border">
                        <h3 className="text-lg font-bold mb-4">Add New Staff</h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <input
                                value={newStaffName}
                                onChange={(e) => setNewStaffName(e.target.value)}
                                placeholder="Full Name"
                                className="flex-1 p-3 border rounded-xl outline-none"
                            />
                            <input
                                value={newStaffPhone}
                                onChange={(e) => setNewStaffPhone(e.target.value)}
                                placeholder="Mobile Number"
                                className="flex-1 p-3 border rounded-xl outline-none"
                            />
                            <select
                                value={newStaffRole}
                                onChange={(e) => setNewStaffRole(e.target.value)}
                                className="p-3 border rounded-xl outline-none bg-white"
                            >
                                {rolesList.map((r) => (
                                    <option key={r.id} value={r.name}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    if (newStaffName && newStaffPhone) {
                                        setStaffList([
                                            ...staffList,
                                            {
                                                id: Date.now(),
                                                name: newStaffName,
                                                phone: newStaffPhone,
                                                role: newStaffRole,
                                                active: true,
                                            },
                                        ]);
                                        setNewStaffName("");
                                        setNewStaffPhone("");
                                    }
                                }}
                                className="bg-indigo-600 text-white px-6 py-3 md:py-0 rounded-xl font-bold"
                            >
                                Add
                            </button>
                        </div>
                    </div>
                    <CommonTable
                        columns={[
                            {
                                header: "Name",
                                key: "name",
                                className: "font-bold",
                            },
                            {
                                header: "Role",
                                key: "role",
                                render: (value) => (
                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                        {value}
                                    </span>
                                ),
                            },
                            {
                                header: "Phone",
                                key: "phone",
                                className: "text-gray-500",
                            },
                            {
                                header: "Status",
                                key: "active",
                                render: (value) => (
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${value
                                                ? "text-green-600 bg-green-100"
                                                : "text-red-600 bg-red-100"
                                            }`}
                                    >
                                        {value ? "Active" : "Inactive"}
                                    </span>
                                ),
                            },
                            {
                                header: "Action",
                                key: "actions",
                                headerClassName: "text-right",
                                className: "text-right",
                                render: (_, staff) => (
                                    <button
                                        onClick={() =>
                                            setStaffList(
                                                staffList.map((s) =>
                                                    s.id === staff.id
                                                        ? { ...s, active: !s.active }
                                                        : s
                                                )
                                            )
                                        }
                                        className="text-gray-400 hover:text-indigo-600 font-bold text-xs underline"
                                    >
                                        {staff.active ? "Deactivate" : "Activate"}
                                    </button>
                                ),
                            },
                        ]}
                        data={staffList}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {rolesList.map((role) => (
                        <div
                            key={role.id}
                            className="bg-white p-6 rounded-3xl shadow-lg border"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-black">{role.name}</h3>
                                {role.name === "Admin" && (
                                    <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-xs font-bold">
                                        System
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {Object.entries(PERMISSIONS).map(([key, label]) => (
                                    <label
                                        key={key}
                                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={role.permissions.includes(key)}
                                            disabled={role.name === "Admin"}
                                            onChange={(e) => {
                                                const newPerms = e.target.checked
                                                    ? [...role.permissions, key]
                                                    : role.permissions.filter((p) => p !== key);
                                                setRolesList(
                                                    rolesList.map((r) =>
                                                        r.id === role.id
                                                            ? { ...r, permissions: newPerms }
                                                            : r
                                                    )
                                                );
                                            }}
                                            className="w-5 h-5 accent-indigo-600 rounded"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            {label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Staff;
