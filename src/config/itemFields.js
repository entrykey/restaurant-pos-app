export const ALL_FIELDS = {
    // --- Common Fields ---
    product_name: { key: "name", label: "Product Name", type: "text", required: true, section: "Common" },
    sku: { key: "sku", label: "SKU / Item Code", type: "text", section: "Common" },
    barcode: { key: "barcode", label: "Barcode", type: "text", section: "Common" },
    product_type: {
        key: "productType",
        label: "Product Type",
        type: "select",
        options: ["simple", "variant", "combo", "service", "raw-material"],
        defaultValue: "simple",
        section: "Common"
    },
    category: { key: "category", label: "Category", type: "text", required: true, section: "Common" }, // Ideally select but keeping text/creatable for now
    sub_category: { key: "subCategory", label: "Sub-Category", type: "text", section: "Common" },
    brand: { key: "brand", label: "Brand", type: "text", section: "Common" },
    supplier: { key: "supplier", label: "Supplier", type: "text", section: "Common" },
    purchase_price: { key: "purchasePrice", label: "Purchase Price", type: "number", section: "Common" },
    selling_price: { key: "price", label: "Selling Price", type: "number", required: true, section: "Common" },
    mrp: { key: "mrp", label: "MRP", type: "number", section: "Common" },
    tax_applicable: { key: "taxApplicable", label: "Tax Applicable", type: "boolean", defaultValue: true, section: "Common" },
    tax_type: {
        key: "taxType",
        label: "Tax Type",
        type: "select",
        options: ["IGST", "CGST+SGST"],
        defaultValue: "CGST+SGST",
        section: "Common"
    },
    hsn_sac: { key: "hsnCode", label: "HSN / SAC Code", type: "text", section: "Common" },
    stock_applicable: { key: "stockApplicable", label: "Stock Applicable", type: "boolean", defaultValue: true, section: "Common" },
    min_stock_alert: { key: "minStock", label: "Min Stock Alert", type: "number", section: "Common" },
    status: {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Active", "Inactive"],
        defaultValue: "Active",
        section: "Common"
    },

    // --- Food & Beverages ---
    prep_time: { key: "prepTime", label: "Preparation Time (mins)", type: "number", section: "Restaurant" },
    diet_type: {
        key: "dietType",
        label: "Diet Type",
        type: "select",
        options: ["Veg", "Non-Veg", "Egg"],
        section: "Restaurant"
    },
    spice_level: {
        key: "spiceLevel",
        label: "Spice Level",
        type: "select",
        options: ["Low", "Medium", "High", "Extra Hot"],
        section: "Restaurant"
    },
    portion_size: { key: "portionSize", label: "Portion Size", type: "text", section: "Restaurant" },
    kitchen_section: { key: "kitchenSection", label: "Kitchen Section", type: "text", section: "Restaurant" },
    is_combo: { key: "isCombo", label: "Is Combo", type: "boolean", section: "Restaurant" },
    combo_price: { key: "comboPrice", label: "Combo Price", type: "number", section: "Restaurant" }, // Logic depends on is_combo
    addons_allowed: { key: "addonsAllowed", label: "Add-ons Allowed", type: "boolean", section: "Restaurant" },
    parcel_charge: { key: "parcelCharge", label: "Parcel Charge", type: "number", section: "Restaurant" },
    packing_charge: { key: "packingCharge", label: "Packing Charge", type: "number", section: "Restaurant" },

    // --- Groceries ---
    shelf_rack_no: { key: "shelfNo", label: "Shelf / Rack Number", type: "text", section: "Retail" },
    batch_no: { key: "batchNo", label: "Batch No", type: "text", section: "Retail" },
    expiry_date: { key: "expiryDate", label: "Expiry Date", type: "date", section: "Retail" },
    is_weight_based: { key: "isWeightBased", label: "Weight Based", type: "boolean", section: "Retail" },
    weight_unit: { key: "weightUnit", label: "Unit (kg/g/litre)", type: "text", section: "Retail" },
    loose_packed: {
        key: "loosePacked",
        label: "Type",
        type: "select",
        options: ["Loose", "Packed"],
        section: "Retail"
    },
    supplier_invoice_ref: { key: "supplierInvoiceRef", label: "Supplier Invoice Ref", type: "text", section: "Retail" },

    // --- Medical ---
    manufacturer: { key: "manufacturer", label: "Manufacturer", type: "text", section: "Medical" },
    salt_composition: { key: "saltComposition", label: "Salt Composition", type: "text", section: "Medical" },
    prescription_required: { key: "prescriptionRequired", label: "Prescription Required", type: "boolean", section: "Medical" },
    schedule_type: {
        key: "scheduleType",
        label: "Schedule Type",
        type: "select",
        options: ["H", "H1", "X"],
        section: "Medical"
    },
    doctor_margin: { key: "doctorMargin", label: "Doctor Margin", type: "number", section: "Medical" },

    // --- Electronics ---
    model_number: { key: "modelNumber", label: "Model Number", type: "text", section: "Electronics" },
    imei_serial: { key: "imei", label: "IMEI / Serial Number", type: "text", section: "Electronics" },
    ram: { key: "ram", label: "RAM", type: "text", section: "Electronics" },
    rom: { key: "rom", label: "ROM", type: "text", section: "Electronics" },
    color: { key: "color", label: "Color", type: "text", section: "Electronics" }, // Also for clothing
    warranty_period: { key: "warrantyPeriod", label: "Warranty Period", type: "text", section: "Electronics" },
    warranty_type: {
        key: "warrantyType",
        label: "Warranty Type",
        type: "select",
        options: ["Store", "Brand"],
        section: "Electronics"
    },
    spare_part_flag: { key: "isSparePart", label: "Is Spare Part", type: "boolean", section: "Electronics" },

    // --- Clothing ---
    size: { key: "size", label: "Size", type: "text", section: "Clothing" },
    gender: {
        key: "gender",
        label: "Gender",
        type: "select",
        options: ["Men", "Women", "Kids", "Unisex"],
        section: "Clothing"
    },
    material: { key: "material", label: "Material", type: "text", section: "Clothing" },
    season: { key: "season", label: "Season", type: "text", section: "Clothing" },
    fit_type: { key: "fitType", label: "Fit Type", type: "text", section: "Clothing" },
    pattern: { key: "pattern", label: "Pattern", type: "text", section: "Clothing" },

    // --- Vehicle ---
    vehicle_type: { key: "vehicleType", label: "Vehicle Type", type: "text", section: "Vehicle" },
    // brand used from common
    // model used from electronics
    variant: { key: "variant", label: "Variant", type: "text", section: "Vehicle" },
    cc: { key: "cc", label: "CC", type: "text", section: "Vehicle" },
    fuel_type: { key: "fuelType", label: "Fuel Type", type: "text", section: "Vehicle" },
    chassis_no: { key: "chassisNo", label: "Chassis No", type: "text", section: "Vehicle" },
    engine_no: { key: "engineNo", label: "Engine No", type: "text", section: "Vehicle" },
    registration_status: { key: "registrationStatus", label: "Registration Status", type: "text", section: "Vehicle" },
    service_type: { key: "serviceType", label: "Service Type", type: "text", section: "Vehicle" },
    labor_charge: { key: "laborCharge", label: "Labor Charge", type: "number", section: "Vehicle" },
    technician_assigned: { key: "technicianAssigned", label: "Technician Assigned", type: "text", section: "Vehicle" },
    service_status: { key: "serviceStatus", label: "Service Status", type: "text", section: "Vehicle" },

    // --- Services ---
    service_code: { key: "serviceCode", label: "Service Code", type: "text", section: "Services" },
    duration: { key: "duration", label: "Duration (mins)", type: "number", section: "Services" },
    base_price: { key: "basePrice", label: "Base Price", type: "number", section: "Services" },
    assigned_staff: { key: "assignedStaff", label: "Assigned Staff", type: "text", section: "Services" },
    service_notes: { key: "serviceNotes", label: "Internal Notes", type: "textarea", section: "Services" },
};

// Helper to get ALL keys for now (as per requirement)
export const getVisibleFieldKeys = () => {
    return Object.keys(ALL_FIELDS);
};
