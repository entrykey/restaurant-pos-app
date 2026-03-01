import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronRight, Save, X, ArrowLeft, Calendar, Clock, Users, MessageSquare, Phone, User, LayoutGrid, MapPin } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { reservationsService } from './ReservationsService';
import { tableService, diningCategoryService } from '../../services/api';
import DatePicker from '../../components/ui/DatePicker';
import CommonSelect from '../../components/ui/CommonSelect';
import { toast } from 'react-hot-toast';

const ReservationForm = () => {
    const { theme } = useTheme();
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const { activeBranchId } = useApp();
    const isEditing = Boolean(id);

    const durationOptions = [
        { label: "30 Mins", value: 30 },
        { label: "1 Hour", value: 60 },
        { label: "1.5 Hours", value: 90 },
        { label: "2 Hours", value: 120 },
        { label: "2.5 Hours", value: 150 },
        { label: "3 Hours", value: 180 },
        { label: "4 Hours", value: 240 }
    ];

    const [isLoading, setIsLoading] = useState(isEditing);
    const [categories, setCategories] = useState([]);
    const [tables, setTables] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [formData, setFormData] = useState({
        customerName: "",
        phone: "",
        date: new Date().toISOString().split("T")[0],
        time: "",
        guests: 2,
        tableId: "",
        durationMinutes: 120, // default 2 hours
        specialRequests: ""
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch categories
                const categoriesData = await diningCategoryService.getCategories({
                    shopId: user?.shop_id || user?.shopId,
                    branchId: activeBranchId
                });
                setCategories(categoriesData.data || categoriesData || []);

                if (isEditing) {
                    const res = await reservationsService.getReservationById(id);
                    if (res) {
                        const resDate = new Date(res.reservationTime);
                        setFormData({
                            customerName: res.customerId?.name || "",
                            phone: res.customerId?.phone || "",
                            date: resDate.toISOString().split("T")[0],
                            time: resDate.toTimeString().split(" ")[0].substring(0, 5),
                            guests: res.guestCount || res.guests,
                            tableId: res.tableId?._id || res.tableId || "",
                            durationMinutes: res.durationMinutes || 120,
                            specialRequests: res.specialRequests || ""
                        });

                        // If editing, find the category for the existing table
                        if (res.tableId) {
                            const tableId = res.tableId?._id || res.tableId;
                            // When editing, we need to make sure the category is set so the tables fetch
                            // The table object from backend should have the category info
                            if (res.tableId?.diningCategoryId) {
                                setSelectedCategoryId(res.tableId.diningCategoryId?._id || res.tableId.diningCategoryId);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load data:", err);
                toast.error("Failed to load reservation data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, isEditing, activeBranchId]);

    // Handle Category change and fetch tables from API
    useEffect(() => {
        const fetchTablesByCategory = async () => {
            if (!selectedCategoryId) {
                setTables([]);
                return;
            }

            try {
                const data = await tableService.getTablesByCategory(selectedCategoryId, { branchId: activeBranchId });
                const fetchedTables = data.data || data || [];
                setTables(fetchedTables);

                // If current selected table is not in the new category, clear it
                if (formData.tableId) {
                    const isStillValid = fetchedTables.some(t => t._id === formData.tableId);
                    if (!isStillValid) {
                        setFormData(prev => ({ ...prev, tableId: "" }));
                    }
                }
            } catch (err) {
                console.error("Failed to fetch tables for category:", err);
                toast.error("Failed to load tables for this category");
            }
        };

        fetchTablesByCategory();
    }, [selectedCategoryId, activeBranchId]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.customerName) newErrors.customerName = "Customer name is required";
        if (!formData.phone) newErrors.phone = "Phone number is required";
        if (!formData.date) newErrors.date = "Date is required";
        if (!formData.time) newErrors.time = "Time is required";
        if (formData.guests < 1) newErrors.guests = "At least 1 guest required";
        if (!formData.tableId) newErrors.tableId = "Table selection is required";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const payload = {
            shopId: user?.shop_id || user?.shopId,
            branchId: activeBranchId,
            tableId: formData.tableId,
            reservationTime: new Date(`${formData.date}T${formData.time}`).toISOString(),
            durationMinutes: formData.durationMinutes,
            guestCount: formData.guests,
            specialRequests: formData.specialRequests,
            customerDetails: {
                name: formData.customerName,
                phone: formData.phone
            }
        };

        try {
            if (isEditing) {
                // Assuming update method exists in service, if not I'll add it
                await reservationsService.updateReservation(id, payload);
                toast.success("Reservation updated successfully");
            } else {
                await reservationsService.createReservation(payload);
                toast.success("Reservation created successfully");
            }
            navigate('/reservations');
        } catch (err) {
            console.error("Failed to save reservation:", err);
            toast.error(err.message || "Failed to save reservation");
        }
    };

    if (isLoading) {
        return (
            <div className={`flex justify-center items-center h-screen ${theme.pageBg}`}>
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent flex rounded-full animate-spin"></div>
            </div>
        );
    }

    const title = isEditing ? "Edit Booking" : "New Booking";

    return (
        <div className={`p-4 md:p-8 min-h-screen overflow-y-auto custom-scrollbar ${theme.pageBg}`}>
            {/* Breadcrumb Navigation */}
            <div className={`flex items-center gap-2 mb-6 ${theme.textMuted} text-sm font-bold`}>
                <Link to="/reservations" className={`hover:${theme.textPrimary} flex items-center gap-1 transition-colors`}>
                    <ArrowLeft size={16} />
                    Reservations
                </Link>
                <ChevronRight size={16} />
                <span className={theme.textPrimary}>{title}</span>
            </div>

            <div className="w-full">
                <div className="flex justify-between items-center mb-8 border-b pb-6 border-gray-100 dark:border-gray-800">
                    <div>
                        <h3 className={`text-3xl font-black ${theme.textHeading}`}>{title}</h3>
                        <p className={`text-sm mt-1 ${theme.textMuted}`}>
                            {isEditing ? 'Update the details of this reservation.' : 'Create a new table booking for your guest.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* Guest Details Section */}
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Guest Details</h4>
                            <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Customer Name <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={18} />
                                    <input
                                        type="text"
                                        value={formData.customerName}
                                        onChange={(e) => handleChange('customerName', e.target.value)}
                                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors.customerName ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                        placeholder="Full Name"
                                    />
                                </div>
                                {errors.customerName && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.customerName}</p>}
                            </div>

                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={18} />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleChange('phone', e.target.value)}
                                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors.phone ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                        placeholder="Mobile Number"
                                    />
                                </div>
                                {errors.phone && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.phone}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Booking Details Section */}
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Booking Details</h4>
                            <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                    value={formData.date}
                                    onChange={(val) => handleChange('date', val)}
                                    className={`w-full p-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${errors.date ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                />
                                {errors.date && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.date}</p>}
                            </div>

                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Time <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Clock className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={18} />
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => handleChange('time', e.target.value)}
                                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all dark:[color-scheme:dark] ${errors.time ? 'border-red-400 focus:border-red-500' : `${theme.inputBorder} focus:border-indigo-500`}`}
                                    />
                                </div>
                                {errors.time && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.time}</p>}
                            </div>

                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Guests <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <div className={`flex-1 flex items-center ${theme.inputBg} border-2 ${theme.inputBorder} rounded-2xl p-1 h-[60px]`}>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('guests', Math.max(1, formData.guests - 1))}
                                            className={`w-10 h-10 ${theme.cardBg} rounded-xl shadow-sm text-indigo-500 font-black flex items-center justify-center hover:opacity-80 transition-opacity`}
                                        >
                                            -
                                        </button>
                                        <span className={`flex-1 text-center font-black ${theme.textPrimary}`}>{formData.guests}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('guests', formData.guests + 1)}
                                            className={`w-10 h-10 ${theme.cardBg} rounded-xl shadow-sm text-indigo-500 font-black flex items-center justify-center hover:opacity-80 transition-opacity`}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className={`${theme.textMuted} bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl`}>
                                        <Users size={20} className="text-indigo-500" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Duration (Minutes)
                                </label>
                                <CommonSelect
                                    options={durationOptions}
                                    value={formData.durationMinutes}
                                    onChange={(val) => handleChange('durationMinutes', val)}
                                    placeholder="Select Duration"
                                />
                            </div>

                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Dining Category <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <MapPin className={`absolute left-4 top-[22px] -translate-y-1/2 ${theme.textMuted} z-10`} size={18} />
                                    <CommonSelect
                                        options={categories}
                                        value={selectedCategoryId}
                                        onChange={(val) => setSelectedCategoryId(val)}
                                        placeholder="Select Category"
                                        labelKey="name"
                                        valueKey="_id"
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                    Assign Table <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <LayoutGrid className={`absolute left-4 top-[22px] -translate-y-1/2 ${theme.textMuted} z-10`} size={18} />
                                    <CommonSelect
                                        options={tables}
                                        value={formData.tableId}
                                        onChange={(val) => handleChange('tableId', val)}
                                        placeholder={selectedCategoryId ? "Select Table" : "Select Category First"}
                                        labelKey="tableNumber"
                                        valueKey="_id"
                                        renderOption={(table) => (
                                            <div className={`font-black ${theme.textPrimary}`}>
                                                Table {table.tableNumber} <span className={`text-[10px] ${theme.textMuted} ml-2 font-bold`}>({table.capacity}p)</span>
                                            </div>
                                        )}
                                        className="pl-10"
                                        disabled={!selectedCategoryId}
                                    />
                                </div>
                                {errors.tableId && <p className="text-red-500 text-xs font-bold mt-1 ml-1">{errors.tableId}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Additional Notes Section */}
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            <h4 className={`text-xl font-black ${theme.textHeading} uppercase tracking-tight`}>Additional Notes</h4>
                            <div className={`flex-1 h-px ${theme.borderLight}`}></div>
                        </div>
                        <div>
                            <label className={`text-[10px] font-black ${theme.textSecondary} uppercase tracking-widest mb-2 block ml-1`}>
                                Special Requests / Notes
                            </label>
                            <div className="relative">
                                <MessageSquare className={`absolute left-4 top-4 ${theme.textMuted}`} size={18} />
                                <textarea
                                    value={formData.specialRequests}
                                    onChange={(e) => handleChange('specialRequests', e.target.value)}
                                    rows={4}
                                    className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl outline-none font-bold ${theme.inputBg} ${theme.textPrimary} transition-all ${theme.inputBorder} focus:border-indigo-500 resize-none`}
                                    placeholder="Any special requests or notes for this booking..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className={`flex gap-4 pt-8 mt-12 border-t ${theme.borderLight}`}>
                    <button
                        type="button"
                        onClick={() => navigate('/reservations')}
                        className={`flex-1 py-5 font-black ${theme.textSecondary} hover:${theme.textPrimary} transition-colors border-2 ${theme.borderLight} rounded-[24px] flex items-center justify-center gap-2`}
                    >
                        <X size={20} />
                        Discard
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className={`flex-2 w-2/3 py-5 ${theme.buttonBg} ${theme.buttonText} rounded-[24px] font-black shadow-xl shadow-indigo-100/10 ${theme.buttonHoverBg} active:scale-95 transition-all flex items-center justify-center gap-2 text-lg`}
                    >
                        <Save size={24} />
                        {isEditing ? "Update Booking" : "Confirm Booking"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReservationForm;
