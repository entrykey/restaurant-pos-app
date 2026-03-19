import React, { useState, useEffect } from 'react';
import { ArrowLeft, Building2, MapPin, FileText, Check, ChevronRight, Loader2, X } from 'lucide-react';
import { shopService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const STEPS = [
    { id: 1, title: 'Business Info', icon: Building2 },
    { id: 2, title: 'Address & Location', icon: MapPin },
    { id: 3, title: 'Tax Profile', icon: FileText },
];

const AddShopModal = ({ onClose, onSuccess }) => {
    const { theme } = useTheme();
    const { user } = useAuth();

    // Manage step explicitly to avoid confusion with the 4 steps in normal RegisterShop
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [businessTypes, setBusinessTypes] = useState([]);
    const [availableSubTypes, setAvailableSubTypes] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        businessType: '',
        subType: '',
        address: {
            line1: '',
            line2: '',
            city: '',
            state: { name: '', code: '' },
            country: { name: 'India', code: 'IN' },
            pincode: '',
        },
        taxProfile: {
            taxSystem: 'GST',
            registrationNumber: '',
            legalName: '',
            isInterStateAllowed: true,
        },
    });

    useEffect(() => {
        const fetchBusinessTypes = async () => {
            try {
                const types = await shopService.getBusinessTypes();
                setBusinessTypes(types);
            } catch (error) {
                console.error("Failed to fetch business types:", error);
            }
        };
        fetchBusinessTypes();
    }, []);

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddressChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            address: { ...prev.address, [field]: value },
        }));
    };

    const handleTaxChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            taxProfile: { ...prev.taxProfile, [field]: value }
        }));
    };

    const handleBusinessTypeChange = async (typeId) => {
        handleInputChange('businessType', typeId);
        handleInputChange('subType', '');
        setAvailableSubTypes([]);

        if (!typeId) return;

        try {
            const subTypes = await shopService.getBusinessSubTypes(typeId);
            setAvailableSubTypes(subTypes);
        } catch (error) {
            console.error("Failed to fetch subtypes:", error);
        }
    };

    const handlePincodeLookup = async (pincode) => {
        if (pincode.length < 5) return;
        handleAddressChange('pincode', pincode);
        const code = formData.address.country.name === 'USA' ? 'us' : 'in';

        try {
            const data = await shopService.getLocationByPincode(code, pincode);
            if (data && data.places && data.places.length > 0) {
                const place = data.places[0];
                handleAddressChange('city', place['place name']);
                handleAddressChange('state', {
                    name: place['state'],
                    code: place['state abbreviation']
                });
            }
        } catch (e) {
            // ignore error
        }
    };

    const handleCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const data = await shopService.getAddressByCoordinates(latitude, longitude);

                if (data && data.address) {
                    const addr = data.address;
                    if (addr.postcode) handleAddressChange('pincode', addr.postcode);
                    if (addr.city || addr.town || addr.village) handleAddressChange('city', addr.city || addr.town || addr.village);
                    if (addr.state) handleAddressChange('state', { name: addr.state, code: '' });
                    if (addr.country) {
                        let countryCode = addr.country_code === 'us' ? 'US' : 'IN';
                        handleAddressChange('country', { name: addr.country, code: countryCode });
                    }
                    if (addr.road || addr.suburb) handleAddressChange('line2', `${addr.road || ''} ${addr.suburb || ''}`.trim());
                }
            } catch (error) {
                console.error("Location error:", error);
                alert("Could not fetch address details.");
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Unable to retrieve your location.");
            setLoading(false);
        });
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Inject current user's details as the owner
            const payload = {
                ...formData,
                ownerName: user?.name || 'Owner',
                ownerEmail: user?.email || '',
                ownerPhone: user?.phone || '',
                // Password won't be required backwardly if the backend checks if the user exists by email 
                // However, the backend expects a password if the user doesn't exist. 
                // Since user is logged in, their email exists in the DB, so shop.controller.js line 25: 
                // `let user = await User.findOne({ email: ownerEmail });` will reliably fetch the existing user
                // bypassing the new user creation flow entirely.
            };

            await shopService.createShop(payload);
            if (onSuccess) onSuccess();
        } catch (error) {
            alert(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return formData.name && formData.businessType && formData.subType;
            case 2:
                return formData.address.line1 && formData.address.city && formData.address.state.name && formData.address.pincode;
            case 3:
                return true;
            default:
                return false;
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Shop Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                                placeholder="Ex. Tasty Bites"
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Business Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                {businessTypes.map((type) => (
                                    <button
                                        key={type._id}
                                        type="button"
                                        onClick={() => handleBusinessTypeChange(type._id)}
                                        className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${formData.businessType === type._id
                                            ? `border-indigo-500 ${theme.primaryIconBg} ${theme.primaryIconText}`
                                            : `${theme.inputBorder} ${theme.textPrimary} hover:opacity-80`
                                            }`}
                                    >
                                        {type.displayString}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formData.businessType && availableSubTypes.length > 0 && (
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Subtype</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {availableSubTypes.map((sub) => (
                                        <button
                                            key={sub._id}
                                            type="button"
                                            onClick={() => handleInputChange('subType', sub._id)}
                                            className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${formData.subType === sub._id
                                                ? `border-indigo-500 ${theme.primaryIconBg} ${theme.primaryIconText}`
                                                : `${theme.inputBorder} ${theme.textPrimary} hover:opacity-80`
                                                }`}
                                        >
                                            {sub.displayString}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <div className="flex justify-between items-end gap-2">
                            <div className="flex-1">
                                <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Pincode</label>
                                <input
                                    type="text"
                                    value={formData.address.pincode}
                                    onChange={(e) => handlePincodeLookup(e.target.value)}
                                    className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                                    placeholder="Enter Pincode"
                                    maxLength={6}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleCurrentLocation}
                                className={`p-3 rounded-xl font-bold transition-colors flex items-center mb-[2px] ${theme.primaryIconBg} ${theme.primaryIconText} hover:opacity-80`}
                                title="Use Current Location"
                            >
                                <MapPin size={20} />
                            </button>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Address Line 1</label>
                            <input
                                type="text"
                                value={formData.address.line1}
                                onChange={(e) => handleAddressChange('line1', e.target.value)}
                                className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                                placeholder="Shop No, Street"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Address Line 2</label>
                            <input
                                type="text"
                                value={formData.address.line2}
                                onChange={(e) => handleAddressChange('line2', e.target.value)}
                                className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                                placeholder="Landmark (Optional)"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>City</label>
                                <input
                                    type="text"
                                    value={formData.address.city}
                                    onChange={(e) => handleAddressChange('city', e.target.value)}
                                    className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>State</label>
                                <input
                                    type="text"
                                    value={formData.address.state.name}
                                    readOnly
                                    className={`w-full p-3 border rounded-xl cursor-not-allowed outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.textSecondary}`}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Country</label>
                            <input
                                type="text"
                                value={formData.address.country.name}
                                readOnly
                                className={`w-full p-3 border rounded-xl cursor-not-allowed outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.textSecondary}`}
                            />
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Tax System</label>
                            <select
                                value={formData.taxProfile.taxSystem}
                                onChange={(e) => handleTaxChange('taxSystem', e.target.value)}
                                className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                            >
                                <option value="GST">GST</option>
                                <option value="VAT">VAT</option>
                                <option value="SALES_TAX">Sales Tax</option>
                                <option value="NONE">None</option>
                            </select>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Registration Number</label>
                            <input
                                type="text"
                                value={formData.taxProfile.registrationNumber}
                                onChange={(e) => handleTaxChange('registrationNumber', e.target.value)}
                                className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                                placeholder="Ex. 27ABCDE1234F1Z5"
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${theme.textPrimary}`}>Legal Name</label>
                            <input
                                type="text"
                                value={formData.taxProfile.legalName}
                                onChange={(e) => handleTaxChange('legalName', e.target.value)}
                                className={`w-full p-3 border rounded-xl outline-none ${theme.inputBg} ${theme.inputBorder} ${theme.inputFocus} ${theme.inputText}`}
                                placeholder="Legal Business Name"
                            />
                        </div>

                        <div className={`flex items-center space-x-3 p-3 border rounded-xl ${theme.inputBg} ${theme.inputBorder}`}>
                            <input
                                type="checkbox"
                                checked={formData.taxProfile.isInterStateAllowed}
                                onChange={(e) => handleTaxChange('isInterStateAllowed', e.target.checked)}
                                className={`w-5 h-5 rounded ${theme.primaryIconText}`}
                            />
                            <span className={`text-sm font-medium ${theme.textPrimary}`}>Allow Inter-State Transactions</span>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`w-full rounded-3xl shadow-2xl p-8 transition-all duration-300 ${theme.cardBg}`}>

            {/* Header */}
            <div className={`flex items-center justify-between mb-6 ${theme.textHeading}`}>
                <div className="flex items-center">
                    <button onClick={onClose} className={`p-2 rounded-lg mr-4 ${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-800`}>
                        <X size={20} />
                    </button>
                    <h1 className="text-2xl font-bold">Add New Shop</h1>
                </div>
                <div className={`text-sm font-medium px-3 py-1 rounded-full ${theme.primaryIconBg} ${theme.primaryIconText}`}>
                    Step {currentStep} of {STEPS.length}
                </div>
            </div>

            {/* Steps Indicator */}
            <div className="flex justify-between mb-8 relative">
                <div className={`absolute top-1/2 left-0 w-full h-1 -z-10 -translate-y-1/2 rounded-full ${theme.inputBg}`} />
                {STEPS.map((step) => {
                    const Icon = step.icon;
                    const isActive = currentStep >= step.id;
                    return (
                        <div key={step.id} className={`flex flex-col items-center px-4 ${theme.cardBg}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isActive
                                ? `${theme.buttonBg} border-transparent ${theme.buttonText}`
                                : `${theme.cardBg} ${theme.inputBorder} ${theme.textSecondary}`
                                }`}>
                                <Icon size={18} />
                            </div>
                            <span className={`text-[10px] uppercase font-bold mt-2 hidden sm:block ${isActive ? theme.primaryIconText : theme.textSecondary}`}>
                                {step.title}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Content */}
            <div className="min-h-[300px]">
                {renderStepContent()}
            </div>

            {/* Footer Actions */}
            <div className={`flex justify-between mt-8 pt-6 border-t ${theme.inputBorder}`}>
                <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    disabled={currentStep === 1}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${currentStep === 1
                        ? 'opacity-0 pointer-events-none'
                        : `${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-800`
                        }`}
                >
                    Back
                </button>

                <button
                    onClick={() => {
                        if (currentStep < STEPS.length) {
                            setCurrentStep(prev => prev + 1);
                        } else {
                            handleSubmit();
                        }
                    }}
                    disabled={!isStepValid() || loading}
                    className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all ${!isStepValid() || loading
                        ? 'opacity-50 cursor-not-allowed'
                        : `${theme.buttonBg} ${theme.buttonText} hover:-translate-y-1`
                        }`}
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <span>{currentStep === STEPS.length ? 'Create Shop' : 'Next Step'}</span>
                            {currentStep !== STEPS.length && <ChevronRight size={18} />}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default AddShopModal;
