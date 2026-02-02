import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Utensils,
  Zap,
  X,
  Plus,
  Minus,
  Check,
  ScrollText,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Phone,
  Globe,
  ShieldCheck,
  Bell,
  ShoppingBag,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Calendar,
  Search,
  CreditCard,
  Receipt,
  TrendingUp,
  Edit3,
  Package,
  Walking,
  Clock,
  UserCheck,
  PlusCircle,
  Printer,
  Filter,
  History,
  Scale,
  Minimize,
  Maximize,
  CircleDashed,
  Timer,
  Shield,
  Lock,
  UserCog,
  BarChart3,
  PieChart,
  LineChart,
  ChefHat,
  Menu as MenuIcon,
  ShoppingCart,
  MonitorPlay,
  Wifi,
  WifiOff,
  Eye,
  ChevronUp,
  ChevronRight,
  Calculator,
  ArrowLeft,
  CheckCircle2,
  TicketPercent,
  MessageSquare,
  Tag,
  FileText,
  Download,
  Share2,
  CalendarCheck,
  Armchair,
  Sun,
  Wind,
  Construction,
} from "lucide-react";

// --- Initial Data ---
const initialMenu = [
  {
    id: "m1",
    name: "Butter Chicken Masala",
    category: "Main Course",
    taxPercent: 5,
    sellingType: "Standard",
    price: 450.0,
    isAvailableOnline: true,
    availableExtras: [
      { name: "Extra Gravy", price: 50 },
      { name: "Butter Cube", price: 20 },
    ],
  },
  {
    id: "m10",
    name: "Chicken Al Faham",
    category: "Grills",
    taxPercent: 5,
    sellingType: "Portion",
    isAvailableOnline: true,
    variants: [
      { name: "Full", price: 600 },
      { name: "Half", price: 320 },
      { name: "Quarter", price: 180 },
    ],
    availableExtras: [
      { name: "Kuboos", price: 10 },
      { name: "Porotta", price: 15 },
      { name: "Mayonnaise", price: 20 },
    ],
  },
  {
    id: "m11",
    name: "Fresh King Fish",
    category: "Sea Food",
    taxPercent: 5,
    sellingType: "Weight",
    pricePerUnit: 1000, // per kg
    unitName: "kg",
    isAvailableOnline: false, // Not available online by default
    availableExtras: [{ name: "Masala Fry", price: 50 }],
  },
  {
    id: "m12",
    name: "Watermelon Juice",
    category: "Drinks",
    taxPercent: 5,
    sellingType: "Volume",
    isAvailableOnline: true,
    variants: [
      { name: "250ml", price: 60 },
      { name: "500ml", price: 110 },
      { name: "1L Jug", price: 200 },
    ],
    availableExtras: [],
  },
  {
    id: "m3",
    name: "Tandoori Roti",
    price: 30.0,
    category: "Breads",
    taxPercent: 5,
    sellingType: "Standard",
    isAvailableOnline: true,
  },
  {
    id: "m4",
    name: "Garlic Naan",
    price: 65.0,
    category: "Breads",
    taxPercent: 5,
    sellingType: "Standard",
    isAvailableOnline: true,
  },
  {
    id: "m5",
    name: "Gulab Jamun (2 pcs)",
    price: 99.0,
    category: "Desserts",
    taxPercent: 12,
    sellingType: "Standard",
    isAvailableOnline: true,
  },
  {
    id: "m6",
    name: "Masala Chai",
    price: 70.0,
    category: "Drinks",
    taxPercent: 5,
    sellingType: "Standard",
    isAvailableOnline: true,
  },
  {
    id: "m7",
    name: "Chicken Biryani",
    price: 350.0,
    category: "Biriyani",
    taxPercent: 5,
    sellingType: "Standard",
    availableExtras: [
      { name: "Extra Raitha", price: 0 },
      { name: "Extra Papad", price: 10 },
    ],
    isAvailableOnline: true,
  },
];

// --- Coupons Data ---
const COUPONS = [
  { code: "SAVE10", type: "percent", value: 10, description: "10% Off" },
  { code: "FLAT100", type: "flat", value: 100, description: "Flat ₹100 Off" },
  {
    code: "FESTIVE20",
    type: "percent",
    value: 20,
    description: "Festive Season Offer",
  },
];

const countries = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "USA", code: "+1", flag: "🇺🇸" },
  { name: "UK", code: "+44", flag: "🇬🇧" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
];

// --- Roles & Permissions Data ---
const PERMISSIONS = {
  POS_ACCESS: "POS Access",
  MANAGE_ORDERS: "Manage Orders (KOT)",
  PROCESS_PAYMENTS: "Process Payments",
  MANAGE_INVENTORY: "Manage Inventory (Add/Edit)",
  VIEW_REPORTS: "View Analytics",
  ACCESS_SETTINGS: "Access Settings",
  MANAGE_STAFF: "Manage Staff & Roles",
  VIEW_KDS: "Access Kitchen Display (KDS)",
  MANAGE_ONLINE_ORDERS: "Manage Online Orders",
  APPLY_DISCOUNTS: "Apply Bill Discounts",
  MANAGE_RESERVATIONS: "Manage Table Reservations",
};

const initialRoles = [
  { id: "r1", name: "Admin", permissions: Object.keys(PERMISSIONS) },
  {
    id: "r2",
    name: "Manager",
    permissions: [
      "POS_ACCESS",
      "MANAGE_ORDERS",
      "PROCESS_PAYMENTS",
      "MANAGE_INVENTORY",
      "VIEW_REPORTS",
      "VIEW_KDS",
      "MANAGE_ONLINE_ORDERS",
      "APPLY_DISCOUNTS",
      "MANAGE_RESERVATIONS",
    ],
  },
  {
    id: "r3",
    name: "Staff",
    permissions: [
      "POS_ACCESS",
      "MANAGE_ORDERS",
      "MANAGE_ONLINE_ORDERS",
      "MANAGE_RESERVATIONS",
    ],
  },
  {
    id: "r4",
    name: "Cashier",
    permissions: [
      "POS_ACCESS",
      "PROCESS_PAYMENTS",
      "VIEW_REPORTS",
      "MANAGE_ONLINE_ORDERS",
      "APPLY_DISCOUNTS",
    ],
  },
  { id: "r5", name: "Kitchen", permissions: ["VIEW_KDS"] },
];

const initialStaff = [
  { id: "s1", name: "Owner", phone: "9876543210", role: "Admin", active: true },
  {
    id: "s2",
    name: "Rahul (Manager)",
    phone: "9000000001",
    role: "Manager",
    active: true,
  },
  {
    id: "s3",
    name: "Waiter John",
    phone: "9000000002",
    role: "Staff",
    active: true,
  },
  {
    id: "s4",
    name: "Chef Mike",
    phone: "9000000003",
    role: "Kitchen",
    active: true,
  },
];

const TABLE_AREAS = ["AC", "Non-AC", "Outdoor"];

const formatCurrency = (amount) => {
  if (isNaN(amount)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState("login");
  const [selectedRole, setSelectedRole] = useState("Staff");
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState({
    loginTime: null,
    logoutTime: null,
  });

  // Staff & Roles State
  const [rolesList, setRolesList] = useState(initialRoles);
  const [staffList, setStaffList] = useState(initialStaff);
  const [activeStaffTab, setActiveStaffTab] = useState("staff");

  // Analytics Tab State
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState("overview");
  const [reportCategory, setReportCategory] = useState("sales");

  // Mobile Order View Tab State ('menu' or 'cart')
  const [mobileOrderTab, setMobileOrderTab] = useState("menu");

  // Online Ordering State
  const [isOnlineOrderingEnabled, setIsOnlineOrderingEnabled] = useState(true);
  const [onlineOrderTab, setOnlineOrderTab] = useState("pending"); // pending, active, history

  // Billing Flow State
  const [billingStage, setBillingStage] = useState("review"); // 'review' | 'payment'
  const [billDiscount, setBillDiscount] = useState({ type: "flat", value: 0 }); // { type: 'percent' | 'flat', value: number }
  const [isAutoRoundOff, setIsAutoRoundOff] = useState(true);

  // Coupon State
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null); // { type: 'success' | 'error', msg: '' }
  const [discountMode, setDiscountMode] = useState("manual"); // 'manual' | 'coupon'
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Note Modal State
  const [noteModal, setNoteModal] = useState({
    isOpen: false,
    idx: null,
    text: "",
  });

  // Full Order Summary Modal State
  const [isFullOrderSummaryOpen, setIsFullOrderSummaryOpen] = useState(false);

  // Reservation State
  const [reservations, setReservations] = useState([
    {
      id: 1,
      customerName: "Amit Sharma",
      phone: "9876543210",
      date: new Date().toISOString().split("T")[0],
      time: "19:30",
      guests: 4,
      tableId: 2,
      status: "Confirmed",
    },
    {
      id: 2,
      customerName: "Priya Singh",
      phone: "9988776655",
      date: new Date().toISOString().split("T")[0],
      time: "20:00",
      guests: 2,
      tableId: null,
      status: "Pending",
    },
  ]);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [newReservation, setNewReservation] = useState({
    customerName: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    time: "",
    guests: 2,
    tableId: "",
  });

  const [country, setCountry] = useState(countries[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");

  // Global Timer State for live updates
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [view, setView] = useState("tables");
  // Tables State with Enhanced Metadata
  const [tables, setTables] = useState([
    {
      id: 1,
      name: "Table 1",
      status: "available",
      order: null,
      startTime: null,
      capacity: 4,
      area: "AC",
      isMaintenance: false,
    },
    {
      id: 2,
      name: "Table 2",
      status: "available",
      order: null,
      startTime: null,
      capacity: 2,
      area: "AC",
      isMaintenance: false,
    },
    {
      id: 3,
      name: "Table 3",
      status: "occupied",
      startTime: Date.now() - 38 * 60 * 1000,
      capacity: 6,
      area: "Non-AC",
      isMaintenance: false,
      order: {
        items: [
          {
            id: "m1",
            name: "Butter Chicken Masala",
            price: 450.0,
            quantity: 1,
            taxPercent: 5,
            sellingType: "Standard",
            selectedExtras: [],
          },
        ],
        isSentToKOT: true,
        kotSentAt: Date.now() - 38 * 60 * 1000,
        kotStatus: "preparing",
      },
    },
    {
      id: 4,
      name: "Table 4",
      status: "available",
      order: null,
      startTime: null,
      capacity: 4,
      area: "Outdoor",
      isMaintenance: false,
    },
  ]);
  const [menu, setMenu] = useState(initialMenu);
  const [inventorySearch, setInventorySearch] = useState("");
  const [orderSearch, setOrderSearch] = useState(""); // New State for Order Menu Search

  // Enhanced Online Orders Data Structure
  const [onlineOrders, setOnlineOrders] = useState([
    {
      id: "ON-201",
      customer: "Arun Kumar",
      phone: "9876543210",
      address: "Flat 4B, Galaxy Apts",
      platform: "Zomato",
      timestamp: Date.now() - 1000 * 60 * 5, // 5 mins ago
      status: "pending", // pending, accepted, preparing, ready, rejected, completed
      paymentStatus: "paid",
      items: [
        {
          id: "m1",
          name: "Butter Chicken Masala",
          price: 450.0,
          quantity: 1,
          taxPercent: 5,
          sellingType: "Standard",
          selectedExtras: [],
        },
        {
          id: "m4",
          name: "Garlic Naan",
          price: 65.0,
          quantity: 2,
          taxPercent: 5,
          sellingType: "Standard",
          selectedExtras: [],
        },
      ],
      total: 580.0,
      note: "Less spicy please",
    },
    {
      id: "ON-202",
      customer: "Sarah J",
      phone: "9988776655",
      address: "Pickup",
      platform: "Swiggy",
      timestamp: Date.now() - 1000 * 60 * 2, // 2 mins ago
      status: "pending",
      paymentStatus: "paid",
      items: [
        {
          id: "m7",
          name: "Chicken Biryani",
          price: 350.0,
          quantity: 2,
          taxPercent: 5,
          sellingType: "Standard",
          selectedExtras: [],
        },
      ],
      total: 700.0,
      note: "",
    },
  ]);

  const [expenses, setExpenses] = useState([
    {
      id: 1,
      title: "Vegetable Supply",
      amount: 1200,
      date: "2023-10-25",
      category: "Supplies",
    },
  ]);

  const [salesHistory, setSalesHistory] = useState([
    {
      id: "S1",
      amount: 1500,
      date: "2023-10-25",
      type: "Dine-in",
      method: "Cash",
      tableId: 3,
      tableName: "Table 3",
      waiterName: "Waiter John",
      startTime: Date.now() - 3600000,
      endTime: Date.now(),
      durationMinutes: 60,
      timestamp: Date.now(),
      subtotal: 1428.57,
      taxAmount: 71.43,
      discountAmount: 0,
      finalTotal: 1500,
      items: [
        {
          id: "m1",
          name: "Butter Chicken Masala",
          quantity: 2,
          price: 450,
          category: "Main Course",
        },
        {
          id: "m4",
          name: "Garlic Naan",
          quantity: 4,
          price: 65,
          category: "Breads",
        },
      ],
    },
  ]);

  const [kotLogs, setKotLogs] = useState([]);

  const [authLogs, setAuthLogs] = useState([
    {
      id: 1,
      role: "Admin",
      phone: "9876543210",
      date: "2023-10-25",
      time: "09:00 AM",
    },
    {
      id: 2,
      role: "Staff",
      phone: "9000000001",
      date: "2023-10-25",
      time: "10:30 AM",
    },
  ]);
  const [logSearch, setLogSearch] = useState("");
  const [logDateFilter, setLogDateFilter] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [activeTableId, setActiveTableId] = useState(null);
  const [isTakeaway, setIsTakeaway] = useState(false);
  const [takeawayOrder, setTakeawayOrder] = useState({
    items: [],
    isSentToKOT: false,
  });
  const [takeawayCustName, setTakeawayCustName] = useState("");
  const [takeawayCustPhone, setTakeawayCustPhone] = useState("");

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] =
    useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);

  // Customization State
  const [customVariant, setCustomVariant] = useState(null);
  const [customWeightInput, setCustomWeightInput] = useState(1);
  const [customWeightUnit, setCustomWeightUnit] = useState("kg");
  const [customExtras, setCustomExtras] = useState({});

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [filterDate, setFilterDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [activeMenuCategory, setActiveMenuCategory] = useState("All");

  const [settings, setSettings] = useState({
    upiId: "restaurant@upi",
    isTaxEnabled: true,
    defaultTaxPercent: 5,
    shopName: "Desi Flavours POS",
  });

  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableArea, setNewTableArea] = useState("AC");
  const [selectedProductCategory, setSelectedProductCategory] =
    useState("Main Course");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [prodSellingType, setProdSellingType] = useState("Standard");
  const [prodVariants, setProdVariants] = useState([{ name: "", price: "" }]);
  const [prodExtras, setProdExtras] = useState([]);

  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("Staff");

  const categories = useMemo(() => {
    const cats = ["All", ...new Set(menu.map((item) => item.category))];
    return cats;
  }, [menu]);

  const hasPermission = (permissionKey) => {
    if (!currentUser) return false;
    if (currentUser.role === "Admin") return true;
    return (
      currentUser.permissions && currentUser.permissions.includes(permissionKey)
    );
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (phone.length >= 10) setAuthStep("otp");
  };

  const handleVerifyOtp = () => {
    if (otpValue.length === 4) {
      const now = new Date();
      const loginDate = now.toISOString().split("T")[0];
      const loginTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      const roleObj = rolesList.find((r) => r.name === selectedRole);
      const permissions = roleObj ? roleObj.permissions : [];
      const existingStaff = staffList.find((s) => s.phone === phone);

      const userObj = {
        phone,
        role: selectedRole,
        name: existingStaff ? existingStaff.name : "Unknown",
        permissions,
      };

      setCurrentUser(userObj);
      setSessionInfo({ loginTime: now.toLocaleTimeString(), logoutTime: null });

      setAuthLogs((prev) => [
        {
          id: Date.now(),
          role: selectedRole,
          phone,
          date: loginDate,
          time: loginTime,
        },
        ...prev,
      ]);

      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthStep("login");
    setPhone("");
    setOtpValue("");
    setCurrentUser(null);
  };

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

  const getTableDuration = (startTime) => {
    if (!startTime) return null;
    const diff = currentTime - startTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    let label = `${minutes} min`;
    if (hours > 0) label = `${hours}h ${mins}m`;

    let colorClass = "bg-green-100 text-green-700";
    if (minutes >= 30) colorClass = "bg-orange-100 text-orange-700";
    if (minutes >= 60) colorClass = "bg-red-100 text-red-700";

    return { label, colorClass };
  };

  // --- Online Order Handlers ---
  const handleAcceptOnlineOrder = (order) => {
    const acceptedOrder = {
      ...order,
      status: "accepted",
      kotStatus: "preparing",
      kotSentAt: Date.now(),
    };

    setOnlineOrders((prev) =>
      prev.map((o) => (o.id === order.id ? acceptedOrder : o))
    );

    // Log KOT
    const kotLog = {
      tableId: order.id, // Using Order ID as Table ID for online
      tableName: `Online: ${order.customer}`,
      sentAt: Date.now(),
      waiterName: "Online Platform",
    };
    setKotLogs((prev) => [...prev, kotLog]);
    setPreviewOrder(null);
  };

  const handleRejectOnlineOrder = (orderId) => {
    setOnlineOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "rejected" } : o))
    );
    setPreviewOrder(null);
  };

  const handleCompleteOnlineKOT = (orderId) => {
    setOnlineOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, kotStatus: "ready", status: "ready" } : o
      )
    );
  };

  // --- Reservation Handlers ---
  const handleAddReservation = () => {
    if (
      newReservation.customerName &&
      newReservation.phone &&
      newReservation.time
    ) {
      const tableId = newReservation.tableId
        ? parseInt(newReservation.tableId)
        : null;
      setReservations([
        ...reservations,
        { ...newReservation, id: Date.now(), tableId, status: "Confirmed" },
      ]);
      setIsReservationModalOpen(false);
      setNewReservation({
        customerName: "",
        phone: "",
        date: new Date().toISOString().split("T")[0],
        time: "",
        guests: 2,
        tableId: "",
      });
    }
  };

  const handleCheckInReservation = (reservation) => {
    if (!reservation.tableId) {
      alert("Please assign a table to this reservation before checking in.");
      return;
    }
    const table = tables.find((t) => t.id === parseInt(reservation.tableId));
    if (!table) {
      alert("Assigned table not found. Please verify table ID.");
      return;
    }
    if (table.status === "occupied") {
      alert(`Table ${table.name} is currently occupied.`);
      return;
    }
    if (table.isMaintenance) {
      alert(`Table ${table.name} is under maintenance.`);
      return;
    }

    // Convert to Active Order
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === table.id) {
          return {
            ...t,
            status: "occupied",
            startTime: Date.now(),
            order: { items: [], isSentToKOT: false }, // Empty order to start
          };
        }
        return t;
      })
    );

    // Update Reservation Status
    setReservations((prev) =>
      prev.map((r) =>
        r.id === reservation.id ? { ...r, status: "Checked-in" } : r
      )
    );

    // Navigate to Order
    setActiveTableId(table.id);
    setIsTakeaway(false);
    setView("order");
    setOrderSearch(""); // Reset search
  };

  const initiateAddItem = (menuItem) => {
    const hasVariants = ["Portion", "Volume", "Weight"].includes(
      menuItem.sellingType
    );
    const hasExtras =
      menuItem.availableExtras && menuItem.availableExtras.length > 0;

    if (hasVariants || hasExtras) {
      setCustomizingItem(menuItem);
      if (menuItem.sellingType === "Weight") {
        setCustomWeightInput(1);
        setCustomWeightUnit("kg");
        setCustomVariant(null);
      } else if (hasVariants) {
        setCustomVariant(menuItem.variants[0]);
        setCustomWeightInput(1);
      } else {
        setCustomVariant(null);
        setCustomWeightInput(1);
      }
      setCustomExtras({});
      setIsCustomizationModalOpen(true);
    } else {
      addToCart(menuItem, 1, null, []);
    }
  };

  const addToCart = (item, quantity, variant, extras, enteredUnit = null) => {
    const orderItem = {
      ...item,
      quantity: parseFloat(quantity),
      selectedVariant: variant,
      selectedExtras: extras,
      suggestion: "",
      enteredUnit: enteredUnit,
    };

    const extrasKey = extras
      .map((e) => `${e.name}-${e.quantity}`)
      .sort()
      .join("|");
    const variantKey = variant ? variant.name : "std";
    const groupKey = `${item.id}|${variantKey}|${extrasKey}`;

    const updateOrderItems = (currentItems) => {
      const existingIndex = currentItems.findIndex((i) => {
        const iExtraKey = (i.selectedExtras || [])
          .map((e) => `${e.name}-${e.quantity}`)
          .sort()
          .join("|");
        const iVariantKey = i.selectedVariant ? i.selectedVariant.name : "std";
        const iGroupKey = `${i.id}|${iVariantKey}|${iExtraKey}`;
        return iGroupKey === groupKey;
      });

      if (existingIndex > -1) {
        const newItems = [...currentItems];
        newItems[existingIndex].quantity += parseFloat(quantity);
        return newItems;
      } else {
        return [...currentItems, orderItem];
      }
    };

    if (isTakeaway) {
      setTakeawayOrder((prev) => ({
        ...prev,
        items: updateOrderItems(prev.items),
        isSentToKOT: false,
      }));
    } else {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === activeTableId) {
            const currentOrder = t.order || { items: [], isSentToKOT: false };
            return {
              ...t,
              status: "occupied",
              order: {
                ...currentOrder,
                items: updateOrderItems(currentOrder.items),
                isSentToKOT: false,
              },
            };
          }
          return t;
        })
      );
    }
  };

  const handleConfirmCustomization = () => {
    const extrasList = Object.keys(customExtras)
      .filter((name) => customExtras[name] > 0)
      .map((name) => {
        const extraDef = customizingItem.availableExtras.find(
          (e) => e.name === name
        );
        return { ...extraDef, quantity: customExtras[name] };
      });

    let finalQuantity =
      typeof customWeightInput === "number"
        ? customWeightInput
        : parseFloat(customWeightInput);
    if (isNaN(finalQuantity)) finalQuantity = 0;

    if (customizingItem.sellingType === "Weight" && customWeightUnit === "g") {
      finalQuantity = finalQuantity / 1000;
    }

    addToCart(
      customizingItem,
      finalQuantity,
      customVariant,
      extrasList,
      customWeightUnit
    );
    setIsCustomizationModalOpen(false);
  };

  const updateItemQuantity = (itemIndex, delta) => {
    const updateList = (items) => {
      const item = items[itemIndex];
      let newQty = item.quantity + delta;
      if (item.sellingType === "Weight") {
        newQty = item.quantity + delta * 0.25;
      }
      if (newQty <= 0.001) {
        return items.filter((_, idx) => idx !== itemIndex);
      }
      const newItems = [...items];
      newItems[itemIndex] = {
        ...item,
        quantity: parseFloat(newQty.toFixed(3)),
      };
      return newItems;
    };

    if (isTakeaway) {
      setTakeawayOrder((prev) => ({
        ...prev,
        items: updateList(prev.items),
        isSentToKOT: false,
      }));
    } else {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === activeTableId && t.order) {
            const newItems = updateList(t.order.items);
            return {
              ...t,
              status: newItems.length > 0 ? "occupied" : "available",
              order:
                newItems.length > 0
                  ? { ...t.order, items: newItems, isSentToKOT: false }
                  : null,
            };
          }
          return t;
        })
      );
    }
  };

  // --- ADD NOTE FEATURE HELPERS ---
  const openNoteModal = (index, currentText) => {
    setNoteModal({ isOpen: true, idx: index, text: currentText || "" });
  };

  const handleSaveNote = () => {
    if (noteModal.idx !== null) {
      updateItemSuggestion(noteModal.idx, noteModal.text);
    }
    setNoteModal({ isOpen: false, idx: null, text: "" });
  };

  const updateItemSuggestion = (itemIndex, text) => {
    const updateList = (items) => {
      const newItems = [...items];
      newItems[itemIndex] = { ...newItems[itemIndex], suggestion: text };
      return newItems;
    };
    if (isTakeaway) {
      setTakeawayOrder((prev) => ({ ...prev, items: updateList(prev.items) }));
    } else {
      setTables((prev) =>
        prev.map((t) =>
          t.id === activeTableId && t.order
            ? { ...t, order: { ...t.order, items: updateList(t.order.items) } }
            : t
        )
      );
    }
  };

  const handleSendToKOT = () => {
    if (isTakeaway) {
      setTakeawayOrder({
        ...takeawayOrder,
        isSentToKOT: true,
        kotSentAt: Date.now(),
        kotStatus: "preparing",
      });
    } else {
      setTables((prev) =>
        prev.map((t) => {
          if (t.id === activeTableId) {
            const newStartTime = t.startTime ? t.startTime : Date.now();
            const kotLog = {
              tableId: t.id,
              tableName: t.name,
              sentAt: Date.now(),
              waiterName: currentUser?.name || "Staff",
            };
            setKotLogs((prev) => [...prev, kotLog]);

            return {
              ...t,
              startTime: newStartTime,
              order: {
                ...t.order,
                isSentToKOT: true,
                kotSentAt: Date.now(),
                kotStatus: "preparing",
              },
            };
          }
          return t;
        })
      );
    }
    console.log("KOT Printed successfully");
  };

  const handleCompleteKOT = (tableId) => {
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === tableId && t.order) {
          return { ...t, order: { ...t.order, kotStatus: "ready" } };
        }
        return t;
      })
    );
  };

  const calculateItemTotal = (item) => {
    let basePrice = item.price;
    if (item.selectedVariant) {
      basePrice = item.selectedVariant.price;
    } else if (item.sellingType === "Weight") {
      basePrice = item.pricePerUnit;
    }
    const itemBaseCost = basePrice * item.quantity;
    const extrasCost = (item.selectedExtras || []).reduce(
      (acc, e) => acc + e.price * e.quantity,
      0
    );
    return itemBaseCost + extrasCost;
  };

  // --- NEW: Bill Calculation Helper ---
  const calculateBillDetails = (
    orderItems,
    discount = { type: "flat", value: 0 },
    taxPercent = 5,
    autoRound = true
  ) => {
    if (!orderItems || orderItems.length === 0)
      return {
        subtotal: 0,
        discountAmount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        total: 0,
        roundOff: 0,
        finalTotal: 0,
      };

    const subtotal = orderItems.reduce(
      (acc, i) => acc + calculateItemTotal(i),
      0
    );

    let discountAmount = 0;
    if (discount.type === "flat") {
      discountAmount = discount.value;
    } else {
      discountAmount = (subtotal * discount.value) / 100;
    }
    // Cap discount at subtotal
    if (discountAmount > subtotal) discountAmount = subtotal;

    const taxableAmount = subtotal - discountAmount;

    // Calculate Tax on taxable amount
    // Note: Assuming taxPercent is global for simplicity as per existing logic which applied global tax on total
    const taxAmount = (taxableAmount * taxPercent) / 100;

    const total = taxableAmount + taxAmount;

    let roundOff = 0;
    let finalTotal = total;

    if (autoRound) {
      finalTotal = Math.round(total);
      roundOff = finalTotal - total;
    }

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      total,
      roundOff,
      finalTotal,
    };
  };

  const calculateTotal = (order) => {
    // Wrapper to maintain compatibility with existing simple calls
    if (!order || !order.items) return 0;
    const details = calculateBillDetails(
      order.items,
      { type: "flat", value: 0 },
      settings.defaultTaxPercent,
      false
    ); // No discount/roundoff for simple view
    return details.total;
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // --- Apply Coupon Logic ---
  const applyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponStatus(null);
      return;
    }
    const coupon = COUPONS.find((c) => c.code === couponCode.toUpperCase());
    if (coupon) {
      setBillDiscount({ type: coupon.type, value: coupon.value });
      setCouponStatus({
        type: "success",
        msg: `${coupon.description} Applied!`,
      });
    } else {
      setCouponStatus({ type: "error", msg: "Invalid Coupon" });
      setBillDiscount({ type: "flat", value: 0 }); // Reset discount if invalid code entered, user can retry
    }
  };

  const handleFinalizePayment = (method) => {
    const table = tables.find((t) => t.id === activeTableId);
    const orderItems = isTakeaway ? takeawayOrder.items : table.order.items;

    // Calculate final numbers with current billing state
    const billDetails = calculateBillDetails(
      orderItems,
      billDiscount,
      settings.defaultTaxPercent,
      isAutoRoundOff
    );

    const type = isTakeaway ? "Takeaway" : "Dine-in";
    const now = Date.now();

    const saleRecord = {
      id: now,
      amount: billDetails.finalTotal, // Final Payable
      ...billDetails, // Store all breakdown details
      couponUsed: couponStatus?.type === "success" ? couponCode : null,
      date: new Date().toISOString().split("T")[0],
      type,
      method,
      timestamp: now,
      tableId: !isTakeaway ? table.id : null,
      tableName: !isTakeaway ? table.name : "Takeaway",
      waiterName: currentUser?.name || "Staff",
      startTime: !isTakeaway ? table.startTime : now,
      endTime: now,
      durationMinutes:
        !isTakeaway && table.startTime
          ? Math.floor((now - table.startTime) / 60000)
          : 0,
      itemCount: orderItems.length,
      items: JSON.parse(JSON.stringify(orderItems)), // IMPORTANT: Add items to history for reporting
    };

    setPaymentSuccess(true);
    setTimeout(() => {
      setSalesHistory((prev) => [...prev, saleRecord]);
      if (isTakeaway) {
        setTakeawayOrder({ items: [], isSentToKOT: false });
        setTakeawayCustName("");
        setTakeawayCustPhone("");
        setIsTakeaway(false);
      } else {
        setTables((prev) =>
          prev.map((t) =>
            t.id === activeTableId
              ? { ...t, status: "available", order: null, startTime: null }
              : t
          )
        );
      }
      setPaymentSuccess(false);
      setIsPaymentModalOpen(false);
      setBillingStage("review"); // Reset billing stage
      setBillDiscount({ type: "flat", value: 0 }); // Reset discount
      setCouponCode("");
      setCouponStatus(null);
      setOrderSearch("");
      setView("tables");
    }, 1500);
  };

  // ... (Login, Filter logic same as before) ...
  const filteredMenu = menu.filter((item) =>
    item.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredLogs = authLogs.filter((log) => {
    const matchesSearch =
      log.role.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.phone.includes(logSearch);
    const matchesDate = !logDateFilter || log.date === logDateFilter;
    return matchesSearch && matchesDate;
  });

  const pendingOnlineOrdersCount = onlineOrders.filter(
    (o) => o.status === "pending"
  ).length;

  const LoginView = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-indigo-900 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 mx-auto">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full">
            <Utensils size={40} className="text-indigo-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-6">
          {settings.shopName}
        </h1>
        {authStep === "login" ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Login Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {rolesList.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.name)}
                    className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                      selectedRole === r.name
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg"
                        : "bg-white border-gray-200 text-gray-500"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
            {/* ... Login Form ... */}
            <div className="relative">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Country
              </label>
              <div
                className="flex items-center justify-between border rounded-xl p-4 bg-gray-50 cursor-pointer"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
              >
                <div className="flex items-center">
                  <span>{country.flag}</span>
                  <span className="ml-2 font-medium">
                    {country.name} ({country.code})
                  </span>
                </div>
                <ChevronDown size={18} className="text-gray-400" />
              </div>
              {isCountryDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white border rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto">
                  {countries.map((c) => (
                    <div
                      key={c.code}
                      className="p-4 hover:bg-indigo-50 cursor-pointer flex justify-between"
                      onClick={() => {
                        setCountry(c);
                        setIsCountryDropdownOpen(false);
                      }}
                    >
                      <span>
                        {c.flag} {c.name}
                      </span>
                      <span className="text-gray-400">{c.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                Phone Number
              </label>
              <div className="flex items-center border rounded-xl p-4 bg-gray-50 focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="text-indigo-600 font-bold mr-3">
                  {country.code}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="bg-transparent flex-1 outline-none text-lg font-medium"
                  placeholder="Enter Mobile Number"
                  required
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95"
            >
              Get OTP
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <p className="text-center text-gray-500">
              Enter code sent for <b>{selectedRole}</b> to {country.code}{" "}
              {phone}
            </p>
            <div className="flex justify-center gap-2 md:gap-4 relative">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-14 md:w-14 md:h-16 border-2 rounded-xl flex items-center justify-center text-xl md:text-2xl font-black ${
                    otpValue.length === i
                      ? "border-indigo-600 bg-indigo-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {otpValue[i] || ""}
                </div>
              ))}
              <input
                type="tel"
                maxLength="4"
                autoFocus
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                className="absolute inset-0 opacity-0 w-full h-full cursor-default"
              />
            </div>
            <button
              onClick={handleVerifyOtp}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg"
            >
              Verify & Login
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col-reverse md:flex-row h-screen bg-gray-50 overflow-hidden font-sans">
      {/* --- HIDDEN RECEIPT COMPONENT --- */}
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0mm; }
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
      <div
        id="receipt-print-area"
        className="hidden print:block p-4 font-mono text-xs w-[80mm] mx-auto bg-white"
      >
        <div className="text-center mb-4">
          <h1 className="text-lg font-bold">{settings.shopName}</h1>
          <p>Ph: {currentUser?.phone}</p>
          <p>{new Date().toLocaleString()}</p>
          <div className="border-b border-dashed my-2"></div>
          <p className="font-bold text-left">
            Order: #{Date.now().toString().slice(-6)}
          </p>
          <p className="text-left">
            Table:{" "}
            {isTakeaway
              ? "Takeaway"
              : tables.find((t) => t.id === activeTableId)?.name}
          </p>
        </div>

        <table className="w-full text-left mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1">Item</th>
              <th className="py-1 text-center">Qty</th>
              <th className="py-1 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {(isTakeaway
              ? takeawayOrder.items
              : tables.find((t) => t.id === activeTableId)?.order?.items || []
            ).map((item, i) => (
              <tr key={i}>
                <td className="py-1 align-top">
                  {item.name}
                  {item.selectedVariant && (
                    <div className="text-[10px]">
                      ({item.selectedVariant.name})
                    </div>
                  )}
                  {item.selectedExtras?.length > 0 && (
                    <div className="text-[10px] pl-1">
                      {item.selectedExtras.map((e) => `+ ${e.name}`).join(", ")}
                    </div>
                  )}
                </td>
                <td className="py-1 align-top text-center">
                  {item.sellingType === "Weight" && item.enteredUnit === "g"
                    ? `${parseFloat((item.quantity * 1000).toFixed(0))}g`
                    : item.quantity}
                </td>
                <td className="py-1 align-top text-right">
                  {formatCurrency(calculateItemTotal(item))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-black pt-2 space-y-1">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>
              {formatCurrency(
                calculateTotal(
                  isTakeaway
                    ? takeawayOrder
                    : tables.find((t) => t.id === activeTableId)?.order
                )
              )}
            </span>
          </div>
          <div className="text-center mt-4 text-[10px]">
            Thank you for dining with us!
          </div>
        </div>
      </div>

      {!isAuthenticated ? (
        <LoginView />
      ) : (
        <>
          <div className="w-full md:w-24 bg-indigo-900 text-white flex flex-row md:flex-col justify-between md:justify-start items-center py-2 md:py-8 shadow-2xl shrink-0 z-50 h-16 md:h-auto overflow-x-auto md:overflow-visible no-scrollbar px-4 md:px-0">
            <div className="hidden md:flex w-12 h-12 bg-white rounded-2xl items-center justify-center text-indigo-900 font-black text-2xl mb-8">
              D
            </div>
            {/* Sidebar Buttons */}
            {hasPermission("POS_ACCESS") && (
              <button
                onClick={() => {
                  setView("tables");
                  setIsTakeaway(false);
                }}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                  view === "tables" || (view === "order" && !isTakeaway)
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                }`}
              >
                <Utensils className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}

            {hasPermission("MANAGE_ONLINE_ORDERS") && (
              <div className="relative">
                <button
                  onClick={() => setView("online")}
                  className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                    view === "online"
                      ? "bg-indigo-600 shadow-xl scale-110"
                      : "hover:bg-indigo-800"
                  }`}
                >
                  <Globe className="w-6 h-6 md:w-7 md:h-7" />
                </button>
                {pendingOnlineOrdersCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center border-2 border-indigo-900">
                    {pendingOnlineOrdersCount}
                  </span>
                )}
              </div>
            )}

            {hasPermission("VIEW_KDS") && (
              <button
                onClick={() => setView("kds")}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                  view === "kds"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                }`}
              >
                <MonitorPlay className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}

            {hasPermission("MANAGE_RESERVATIONS") && (
              <button
                onClick={() => setView("reservations")}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                  view === "reservations"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                }`}
              >
                <CalendarCheck className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}

            <button
              onClick={() => setView("inventory")}
              className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                view === "inventory"
                  ? "bg-indigo-600 shadow-xl scale-110"
                  : "hover:bg-indigo-800"
              }`}
            >
              <Package className="w-6 h-6 md:w-7 md:h-7" />
            </button>

            {hasPermission("VIEW_REPORTS") && (
              <button
                onClick={() => setView("analytics")}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                  view === "analytics"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                }`}
              >
                <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}

            {hasPermission("VIEW_REPORTS") && (
              <button
                onClick={() => setView("reports")}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                  view === "reports"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                }`}
                title="Advanced Reports"
              >
                <FileText className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}

            {hasPermission("ACCESS_SETTINGS") && (
              <button
                onClick={() => setView("settings")}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                  view === "settings"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                }`}
              >
                <Settings className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}

            {hasPermission("MANAGE_STAFF") && (
              <button
                onClick={() => setView("staff")}
                className={`p-3 md:p-4 rounded-xl md:rounded-2xl transition-all ${
                  view === "staff"
                    ? "bg-indigo-600 shadow-xl scale-110"
                    : "hover:bg-indigo-800"
                }`}
              >
                <UserCog className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="mt-0 md:mt-auto p-3 md:p-4 text-red-300 hover:bg-red-900/30 rounded-xl md:rounded-2xl"
            >
              <LogOut className="w-6 h-6 md:w-7 md:h-7" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden relative flex flex-col">
            {/* Header */}
            <div className="h-16 bg-white border-b px-4 md:px-8 flex items-center justify-between shrink-0">
              {/* ... (Same Header) ... */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-indigo-600" />
                  <span className="text-xs md:text-sm font-bold text-gray-700">
                    {currentUser?.role}: {currentUser?.phone}
                  </span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-gray-400">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase tracking-wider">
                    Login: {sessionInfo.loginTime}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {(currentUser.role === "Admin" ||
                  currentUser.role === "Manager") && (
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all ${
                      isOnlineOrderingEnabled
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                    onClick={() =>
                      setIsOnlineOrderingEnabled(!isOnlineOrderingEnabled)
                    }
                    title="Toggle Online Orders"
                  >
                    {isOnlineOrderingEnabled ? (
                      <Wifi size={16} />
                    ) : (
                      <WifiOff size={16} />
                    )}
                    <span className="text-xs font-bold hidden sm:inline">
                      {isOnlineOrderingEnabled ? "Online ON" : "Online OFF"}
                    </span>
                  </div>
                )}
                <div className="text-indigo-900 font-black tracking-tighter text-lg md:text-xl">
                  {settings.shopName}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              {/* ... (Views: tables, kds, online, inventory, staff, analytics, settings, order are same) ... */}
              {view === "tables" && (
                <div className="p-4 md:p-8 h-full overflow-y-auto">
                  {/* ... Table View (Keep existing) ... */}
                  <div className="flex justify-between items-center mb-6 md:mb-10">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-800 flex items-center">
                      <Users className="mr-3 text-indigo-600" /> Dining Hall
                    </h2>
                    <button
                      onClick={() => {
                        setIsTakeaway(true);
                        setTakeawayOrder({ items: [], isSentToKOT: false });
                        setView("order");
                        setOrderSearch("");
                      }}
                      className="bg-indigo-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg text-sm md:text-base"
                    >
                      <ShoppingBag size={20} /> Takeaway
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-8">
                    {tables.map((t) => {
                      const duration = getTableDuration(t.startTime);
                      // Check for reservations
                      const today = new Date().toISOString().split("T")[0];
                      const hasReservation = reservations.find(
                        (r) =>
                          r.tableId === t.id &&
                          r.date === today &&
                          r.status === "Confirmed"
                      );

                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            if (t.isMaintenance && currentUser.role !== "Admin")
                              return; // Prevent selection if maintenance
                            setIsTakeaway(false);
                            setActiveTableId(t.id);
                            setView("order");
                            setOrderSearch("");
                          }}
                          className={`h-32 md:h-40 p-4 md:p-6 rounded-3xl cursor-pointer transition-all hover:scale-105 shadow-lg flex flex-col justify-between relative ${
                            t.isMaintenance
                              ? "bg-red-50 border-2 border-red-200 opacity-80"
                              : t.status === "occupied"
                              ? "bg-indigo-600 text-white"
                              : "bg-white border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:bg-indigo-50"
                          }`}
                        >
                          {/* Maintenance Badge */}
                          {t.isMaintenance && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-[2px] rounded-3xl z-10">
                              <Construction
                                size={24}
                                className="text-red-500 mb-1"
                              />
                              <span className="text-xs font-black text-red-600 uppercase">
                                Maintenance
                              </span>
                            </div>
                          )}

                          {/* Reservation Badge */}
                          {hasReservation && !t.isMaintenance && (
                            <div className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-yellow-200 shadow-sm flex items-center gap-1 z-20">
                              <CalendarCheck size={10} /> Reserved
                            </div>
                          )}

                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-black text-xl md:text-2xl">
                                {t.name}
                              </span>
                              <div className="flex gap-2 mt-1 opacity-70">
                                <span className="text-[10px] flex items-center gap-1">
                                  <Users size={10} /> {t.capacity}
                                </span>
                                <span className="text-[10px] flex items-center gap-1">
                                  {t.area === "AC" ? (
                                    <Wind size={10} />
                                  ) : t.area === "Outdoor" ? (
                                    <Sun size={10} />
                                  ) : (
                                    <Armchair size={10} />
                                  )}
                                  {t.area}
                                </span>
                              </div>
                            </div>
                            {t.order?.isSentToKOT && (
                              <div className="bg-white/20 p-1 rounded-lg">
                                <Printer size={14} />
                              </div>
                            )}
                          </div>
                          {duration && (
                            <div
                              className={`self-start px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] md:text-xs font-bold ${duration.colorClass}`}
                            >
                              <Timer size={10} /> {duration.label}
                            </div>
                          )}
                          {t.order && (
                            <p className="text-lg md:text-xl font-black text-right">
                              {formatCurrency(calculateTotal(t.order))}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* ... (Other views: order, kds, online, inventory, staff, analytics, settings - KEEP SAME) ... */}
              {view === "order" && (
                <div className="flex flex-col h-full overflow-hidden">
                  {/* ... (Keep Order View Logic) ... */}
                  {/* Mobile Tab Switcher */}
                  <div className="lg:hidden flex p-2 bg-white border-b gap-2 shrink-0">
                    <button
                      onClick={() => setMobileOrderTab("menu")}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${
                        mobileOrderTab === "menu"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <MenuIcon size={16} /> Menu
                    </button>
                    <button
                      onClick={() => setMobileOrderTab("cart")}
                      className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${
                        mobileOrderTab === "cart"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      <ShoppingCart size={16} /> Cart
                      {(isTakeaway
                        ? takeawayOrder.items
                        : tables.find((t) => t.id === activeTableId)?.order
                            ?.items || []
                      ).length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                          {
                            (isTakeaway
                              ? takeawayOrder.items
                              : tables.find((t) => t.id === activeTableId)
                                  ?.order?.items || []
                            ).length
                          }
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    {/* Menu Section */}
                    <div
                      className={`flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col ${
                        mobileOrderTab === "cart" ? "hidden lg:flex" : "flex"
                      }`}
                    >
                      {/* ... (Menu grid logic) ... */}
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl md:text-2xl font-black text-indigo-900">
                          {isTakeaway
                            ? "Takeaway Order"
                            : `Table ${activeTableId}`}
                        </h2>
                        <button
                          onClick={() => {
                            setIsTakeaway(false);
                            setView("tables");
                          }}
                          className="p-2 bg-white rounded-full"
                        >
                          <X />
                        </button>
                      </div>
                      {isTakeaway && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <input
                            value={takeawayCustName}
                            onChange={(e) =>
                              setTakeawayCustName(e.target.value)
                            }
                            placeholder="Customer Name"
                            className="p-3 border rounded-xl outline-none"
                          />
                          <input
                            value={takeawayCustPhone}
                            onChange={(e) =>
                              setTakeawayCustPhone(e.target.value)
                            }
                            placeholder="Phone Number"
                            className="p-3 border rounded-xl outline-none"
                          />
                        </div>
                      )}

                      {/* Search Input */}
                      <div className="relative mb-4">
                        <Search
                          className="absolute left-3 top-3.5 text-gray-400"
                          size={18}
                        />
                        <input
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          placeholder="Search menu..."
                          className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-4 shrink-0 no-scrollbar">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setActiveMenuCategory(cat)}
                            className={`px-4 md:px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all border-2 text-sm md:text-base ${
                              activeMenuCategory === cat
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                : "bg-white border-gray-200 text-gray-500"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
                        {menu
                          .filter(
                            (item) =>
                              (activeMenuCategory === "All" ||
                                item.category === activeMenuCategory) &&
                              item.name
                                .toLowerCase()
                                .includes(orderSearch.toLowerCase())
                          )
                          .map((item) => (
                            <div
                              key={item.id}
                              className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-500 cursor-pointer"
                              onClick={() => initiateAddItem(item)}
                            >
                              <div className="flex flex-col h-full">
                                <span className="text-[8px] md:text-[10px] uppercase font-black text-gray-400 tracking-widest mb-1">
                                  {item.category}
                                </span>
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-gray-800 flex-1 text-sm md:text-base">
                                    {item.name}
                                  </p>
                                  {["Portion", "Volume", "Weight"].includes(
                                    item.sellingType
                                  ) && (
                                    <CircleDashed
                                      size={14}
                                      className="text-indigo-400 mt-1"
                                    />
                                  )}
                                </div>
                                <div className="mt-auto pt-2">
                                  {item.sellingType === "Standard" && (
                                    <p className="text-indigo-600 font-black text-sm md:text-base">
                                      {formatCurrency(item.price)}
                                    </p>
                                  )}
                                  {item.sellingType === "Weight" && (
                                    <p className="text-indigo-600 font-black text-xs">
                                      {formatCurrency(item.pricePerUnit)} /{" "}
                                      {item.unitName || "kg"}
                                    </p>
                                  )}
                                  {(item.sellingType === "Portion" ||
                                    item.sellingType === "Volume") && (
                                    <div className="flex flex-wrap gap-1">
                                      {item.variants?.slice(0, 2).map((v) => (
                                        <span
                                          key={v.name}
                                          className="text-[9px] md:text-[10px] bg-indigo-50 text-indigo-700 px-1 rounded"
                                        >
                                          {v.name}
                                        </span>
                                      ))}
                                      {item.variants?.length > 2 && (
                                        <span className="text-[10px] text-gray-400">
                                          ...
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Cart Section */}
                    <div
                      className={`w-full lg:w-[450px] bg-white border-l flex flex-col shrink-0 h-full ${
                        mobileOrderTab === "menu" ? "hidden lg:flex" : "flex"
                      }`}
                    >
                      {/* ... (Cart Logic) ... */}
                      <div className="p-4 md:p-6 border-b bg-white z-10 flex justify-between items-center">
                        <h3 className="text-lg md:text-xl font-black">
                          Order Summary
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsFullOrderSummaryOpen(true)}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                            title="Expand View"
                          >
                            <Maximize size={20} />
                          </button>
                          <button
                            onClick={handlePrintReceipt}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                            title="Print Receipt"
                          >
                            <Printer size={20} />
                          </button>
                          {(isTakeaway
                            ? takeawayOrder.isSentToKOT
                            : tables.find((t) => t.id === activeTableId)?.order
                                ?.isSentToKOT) && (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase">
                              <Check size={14} /> KOT Sent
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3">
                        {/* ... (Same Cart List Items) ... */}
                        {(isTakeaway
                          ? takeawayOrder.items
                          : tables.find((t) => t.id === activeTableId)?.order
                              ?.items || []
                        ).length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2 border-2 border-dashed rounded-3xl m-2">
                            <Utensils size={32} />
                            <p className="text-sm font-bold uppercase tracking-widest">
                              Cart is empty
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y border rounded-xl overflow-hidden">
                            {(isTakeaway
                              ? takeawayOrder.items
                              : tables.find((t) => t.id === activeTableId)
                                  ?.order?.items || []
                            ).map((item, idx) => (
                              <div
                                key={item.id + idx}
                                className="p-3 hover:bg-gray-50 transition-colors bg-white"
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="flex gap-3 flex-1 min-w-0">
                                    <div className="flex flex-col items-center bg-gray-100 rounded-lg p-1 h-fit shrink-0">
                                      <button
                                        onClick={() =>
                                          updateItemQuantity(idx, 1)
                                        }
                                        className="p-1 text-indigo-600 hover:bg-white rounded"
                                      >
                                        <Plus size={12} />
                                      </button>
                                      <span className="font-bold text-sm py-0.5 w-6 text-center">
                                        {item.sellingType === "Weight" &&
                                        item.enteredUnit === "g"
                                          ? `${parseFloat(
                                              (item.quantity * 1000).toFixed(0)
                                            )}`
                                          : item.quantity}
                                      </span>
                                      <button
                                        onClick={() =>
                                          updateItemQuantity(idx, -1)
                                        }
                                        className="p-1 text-red-500 hover:bg-white rounded"
                                      >
                                        <Minus size={12} />
                                      </button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start">
                                        <span className="font-bold text-sm text-gray-800 leading-tight">
                                          {item.name}
                                        </span>
                                        <span className="font-bold text-sm text-gray-900 shrink-0 ml-2">
                                          {formatCurrency(
                                            calculateItemTotal(item)
                                          )}
                                        </span>
                                      </div>
                                      {item.selectedVariant && (
                                        <div className="mt-1">
                                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                            {item.selectedVariant.name}
                                          </span>
                                        </div>
                                      )}
                                      {item.sellingType === "Weight" &&
                                        item.enteredUnit === "g" && (
                                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                            Unit: Grams
                                          </div>
                                        )}
                                      {item.selectedExtras &&
                                        item.selectedExtras.length > 0 && (
                                          <div className="text-[11px] text-gray-500 mt-1 leading-snug">
                                            <span className="font-bold text-gray-400 text-[9px] uppercase mr-1">
                                              Extras:
                                            </span>
                                            {item.selectedExtras
                                              .map(
                                                (e) =>
                                                  `${e.name} (x${e.quantity})`
                                              )
                                              .join(", ")}
                                          </div>
                                        )}
                                      {item.suggestion && (
                                        <div className="text-[11px] text-orange-600 italic mt-1 truncate">
                                          Note: {item.suggestion}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 flex justify-end">
                                  <button
                                    onClick={() =>
                                      openNoteModal(idx, item.suggestion)
                                    }
                                    className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200 text-[10px] font-bold text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                  >
                                    <Edit3 size={10} />
                                    {item.suggestion ? "Edit Note" : "Add Note"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="p-4 md:p-6 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 space-y-3">
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Subtotal</span>
                          <span>
                            {formatCurrency(
                              calculateTotal(
                                isTakeaway
                                  ? takeawayOrder
                                  : tables.find((t) => t.id === activeTableId)
                                      ?.order
                              ) /
                                (1 + settings.defaultTaxPercent / 100)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Tax ({settings.defaultTaxPercent}%)</span>
                          <span>
                            {formatCurrency(
                              calculateTotal(
                                isTakeaway
                                  ? takeawayOrder
                                  : tables.find((t) => t.id === activeTableId)
                                      ?.order
                              ) -
                                calculateTotal(
                                  isTakeaway
                                    ? takeawayOrder
                                    : tables.find((t) => t.id === activeTableId)
                                        ?.order
                                ) /
                                  (1 + settings.defaultTaxPercent / 100)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-2xl font-black text-indigo-900 pt-2 border-t border-dashed">
                          <span>Total</span>
                          <span>
                            {formatCurrency(
                              calculateTotal(
                                isTakeaway
                                  ? takeawayOrder
                                  : tables.find((t) => t.id === activeTableId)
                                      ?.order
                              )
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={handleSendToKOT}
                            disabled={
                              (isTakeaway
                                ? takeawayOrder.items.length === 0
                                : !tables.find((t) => t.id === activeTableId)
                                    ?.order?.items?.length) ||
                              (isTakeaway
                                ? takeawayOrder.isSentToKOT
                                : tables.find((t) => t.id === activeTableId)
                                    ?.order?.isSentToKOT)
                            }
                            className="py-3 md:py-4 rounded-xl font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                          >
                            <Printer size={18} /> KOT
                          </button>
                          <button
                            onClick={() => {
                              setIsPaymentModalOpen(true);
                              setBillingStage("review");
                            }}
                            disabled={
                              !hasPermission("PROCESS_PAYMENTS") ||
                              (isTakeaway
                                ? takeawayOrder.items.length === 0
                                : !tables.find((t) => t.id === activeTableId)
                                    ?.order?.items?.length)
                            }
                            className="py-3 md:py-4 rounded-xl font-bold bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 disabled:shadow-none"
                          >
                            {hasPermission("PROCESS_PAYMENTS")
                              ? "Checkout"
                              : "Checkout (Restricted)"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* ... (Other views: kds, online, inventory, etc. kept same in memory) ... */}
              {view === "kds" && (
                <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-100">
                  <h2 className="text-2xl md:text-4xl font-black mb-10 flex items-center text-gray-800">
                    <MonitorPlay className="mr-3 text-indigo-600" /> Kitchen
                    Display System
                  </h2>
                  {/* ... (KDS Content same as previous) ... */}
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {tables
                      .filter(
                        (t) =>
                          t.order &&
                          t.order.isSentToKOT &&
                          t.order.kotStatus !== "ready"
                      )
                      .map((t) => (
                        <div
                          key={t.id}
                          className="bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col border-l-8 border-orange-400"
                        >
                          <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <div>
                              <h3 className="text-xl font-black text-gray-800">
                                {t.name}
                              </h3>
                              <span className="text-xs font-bold text-gray-400">
                                Waiter: John
                              </span>
                            </div>
                            <div className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-600">
                              {Math.floor(
                                (currentTime - t.order.kotSentAt) / 60000
                              )}{" "}
                              mins
                            </div>
                          </div>
                          <div className="p-4 flex-1 overflow-y-auto max-h-60 space-y-3">
                            {t.order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between items-start border-b border-dashed pb-2 last:border-0"
                              >
                                <div>
                                  <span className="font-bold text-gray-800">
                                    {item.quantity} x {item.name}
                                  </span>
                                  {item.selectedVariant && (
                                    <div className="text-xs text-gray-500 font-bold uppercase">
                                      {item.selectedVariant.name}
                                    </div>
                                  )}
                                  {item.selectedExtras?.map((ex, i) => (
                                    <div
                                      key={i}
                                      className="text-xs text-gray-400"
                                    >
                                      + {ex.name}
                                    </div>
                                  ))}
                                  {item.suggestion && (
                                    <div className="text-xs text-orange-500 italic mt-1">
                                      Note: {item.suggestion}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="p-4 bg-gray-50 border-t">
                            <button
                              onClick={() => handleCompleteKOT(t.id)}
                              className="w-full py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-600 transition-all"
                            >
                              Mark Ready
                            </button>
                          </div>
                        </div>
                      ))}
                    {/* ... (Online Orders KDS & Empty state same as previous) ... */}
                    {/* Empty State */}
                    {tables.filter(
                      (t) =>
                        t.order &&
                        t.order.isSentToKOT &&
                        t.order.kotStatus !== "ready"
                    ).length === 0 &&
                      onlineOrders.filter(
                        (o) =>
                          o.status === "accepted" && o.kotStatus !== "ready"
                      ).length === 0 && (
                        <div className="col-span-full min-h-[50vh] flex flex-col items-center justify-center text-gray-400">
                          <ChefHat size={64} className="mb-4 opacity-20" />
                          <p className="text-xl font-bold">
                            All Orders Cleared!
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* --- Online Management view same as previous --- */}
              {view === "online" && hasPermission("MANAGE_ONLINE_ORDERS") && (
                <div className="p-4 md:p-8 h-full overflow-y-auto">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <h2 className="text-2xl md:text-4xl font-black flex items-center text-gray-800">
                      <Globe className="mr-3 text-indigo-600" /> Online Orders
                    </h2>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border">
                      {["pending", "accepted", "history"].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setOnlineOrderTab(tab)}
                          className={`px-4 py-2 rounded-lg font-bold capitalize transition-all relative ${
                            onlineOrderTab === tab
                              ? "bg-indigo-600 text-white shadow"
                              : "text-gray-500"
                          }`}
                        >
                          {tab === "pending"
                            ? "New Orders"
                            : tab === "accepted"
                            ? "Kitchen / Active"
                            : "History"}
                          {tab === "pending" &&
                            pendingOnlineOrdersCount > 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center shadow-sm">
                                {pendingOnlineOrdersCount}
                              </span>
                            )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {onlineOrders
                      .filter((o) => {
                        if (onlineOrderTab === "pending")
                          return o.status === "pending";
                        if (onlineOrderTab === "accepted")
                          return ["accepted", "preparing", "ready"].includes(
                            o.status
                          );
                        return ["rejected", "completed", "cancelled"].includes(
                          o.status
                        );
                      })
                      .map((order) => (
                        <div
                          key={order.id}
                          className="bg-white p-6 rounded-3xl shadow-lg border relative overflow-hidden group"
                        >
                          <div
                            className={`absolute top-0 left-0 w-full h-2 ${
                              order.platform === "Swiggy"
                                ? "bg-orange-500"
                                : "bg-red-500"
                            }`}
                          />
                          <div className="flex justify-between items-start mb-4 mt-2">
                            <div>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                                  order.platform === "Swiggy"
                                    ? "bg-orange-100 text-orange-600"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {order.platform}
                              </span>
                              <h3 className="text-xl font-bold mt-2">
                                {order.customer}
                              </h3>
                              <p className="text-xs text-gray-400">
                                #{order.id} •{" "}
                                {new Date(order.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-indigo-600">
                                {formatCurrency(order.total)}
                              </p>
                              <p className="text-xs font-bold text-gray-400 uppercase">
                                {order.items.length} Items
                              </p>
                            </div>
                          </div>
                          <div className="border-t border-dashed py-4 space-y-2">
                            <p className="text-xs font-bold text-gray-500">
                              ITEMS:
                            </p>
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div
                                key={idx}
                                className="flex justify-between text-sm"
                              >
                                <span>
                                  {item.quantity} x {item.name}
                                </span>
                              </div>
                            ))}
                          </div>
                          {onlineOrderTab === "pending" && (
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => setPreviewOrder(order)}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => handleAcceptOnlineOrder(order)}
                                className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700"
                              >
                                Accept
                              </button>
                            </div>
                          )}
                          {onlineOrderTab === "accepted" && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-sm font-bold bg-gray-50 p-3 rounded-xl">
                                <span>Status:</span>
                                <span
                                  className={`uppercase ${
                                    order.kotStatus === "ready"
                                      ? "text-green-600"
                                      : "text-orange-500"
                                  }`}
                                >
                                  {order.kotStatus || "Preparing"}
                                </span>
                              </div>
                            </div>
                          )}
                          {onlineOrderTab === "history" && (
                            <div className="mt-4 text-center">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                  order.status === "rejected"
                                    ? "bg-red-100 text-red-600"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    {onlineOrders.filter((o) => {
                      if (onlineOrderTab === "pending")
                        return o.status === "pending";
                      if (onlineOrderTab === "accepted")
                        return ["accepted", "preparing", "ready"].includes(
                          o.status
                        );
                      return ["rejected", "completed", "cancelled"].includes(
                        o.status
                      );
                    }).length === 0 && (
                      <div className="col-span-full h-64 flex items-center justify-center text-gray-400 italic">
                        No orders in this category
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- NEW RESERVATIONS MODULE --- */}
              {view === "reservations" &&
                hasPermission("MANAGE_RESERVATIONS") && (
                  <div className="p-4 md:p-8 h-full overflow-y-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                      <h2 className="text-2xl md:text-4xl font-black flex items-center text-gray-800">
                        <CalendarCheck className="mr-3 text-indigo-600" />{" "}
                        Reservations
                      </h2>
                      <div className="flex gap-4">
                        <input
                          type="date"
                          className="bg-white p-3 rounded-xl border-2 shadow-sm"
                          defaultValue={new Date().toISOString().split("T")[0]}
                        />
                        <button
                          onClick={() => setIsReservationModalOpen(true)}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2"
                        >
                          <Plus size={20} /> New Booking
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {reservations.map((res) => (
                        <div
                          key={res.id}
                          className="bg-white p-6 rounded-3xl shadow-lg border relative overflow-hidden"
                        >
                          <div
                            className={`absolute top-0 left-0 w-2 h-full ${
                              res.status === "Confirmed"
                                ? "bg-green-500"
                                : res.status === "Checked-in"
                                ? "bg-gray-300"
                                : "bg-orange-500"
                            }`}
                          />
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-bold text-gray-800">
                                {res.customerName}
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <Phone size={14} /> {res.phone}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-black text-indigo-600">
                                {res.time}
                              </p>
                              <p className="text-xs font-bold text-gray-400 uppercase">
                                {res.date}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                <Users size={16} /> {res.guests} Guests
                              </span>
                              {res.tableId ? (
                                <span className="text-xs font-bold text-indigo-600">
                                  Table {res.tableId}
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-orange-500">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            {res.status === "Confirmed" && (
                              <button
                                onClick={() => handleCheckInReservation(res)}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl shadow hover:bg-green-700"
                              >
                                Check In
                              </button>
                            )}
                            {res.status === "Checked-in" && (
                              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold">
                                Checked In
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {view === "inventory" && (
                <div className="p-4 md:p-8 h-full overflow-y-auto">
                  {/* Inventory content same as before */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <h2 className="text-2xl md:text-4xl font-black flex items-center text-gray-800">
                      <Package className="mr-3 text-indigo-600" /> Menu
                      Inventory
                    </h2>
                    <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                      <div className="relative flex-1 md:w-64">
                        <Search
                          className="absolute left-3 top-3.5 text-gray-400"
                          size={18}
                        />
                        <input
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          placeholder="Search items..."
                          className="w-full pl-10 p-3 border rounded-2xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      {hasPermission("MANAGE_INVENTORY") && (
                        <button
                          onClick={() => {
                            setEditingProduct(null);
                            setSelectedProductCategory("Main Course");
                            setNewCategoryName("");
                            setProdSellingType("Standard");
                            setProdVariants([{ name: "", price: "" }]);
                            setProdExtras([]);
                            setIsProductModalOpen(true);
                          }}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 shrink-0"
                        >
                          <Plus size={20} /> Add Item
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50">
                        <tr className="text-gray-400 text-xs uppercase font-black border-b tracking-widest">
                          <th className="p-4 md:p-6">Item Name</th>
                          <th className="p-4 md:p-6">Category</th>
                          <th className="p-4 md:p-6">Price</th>
                          <th className="p-4 md:p-6 text-center">Online</th>
                          {hasPermission("MANAGE_INVENTORY") && (
                            <th className="p-4 md:p-6 text-right">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMenu.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b last:border-0 hover:bg-indigo-50/30 transition-colors"
                          >
                            <td className="p-4 md:p-6 font-bold text-gray-800">
                              {item.name}
                            </td>
                            <td className="p-4 md:p-6 font-medium">
                              <span className="bg-gray-100 text-[10px] px-3 py-1 rounded-full uppercase font-bold text-gray-500">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-4 md:p-6 font-medium">
                              {item.sellingType === "Standard" &&
                                formatCurrency(item.price)}
                              {item.sellingType === "Weight" &&
                                `${formatCurrency(item.pricePerUnit)}/${
                                  item.unitName
                                }`}
                              {["Portion", "Volume"].includes(
                                item.sellingType
                              ) && "Var."}
                            </td>
                            {/* Online Toggle Column */}
                            <td className="p-4 md:p-6 text-center">
                              <button
                                onClick={() =>
                                  setMenu(
                                    menu.map((m) =>
                                      m.id === item.id
                                        ? {
                                            ...m,
                                            isAvailableOnline:
                                              !m.isAvailableOnline,
                                          }
                                        : m
                                    )
                                  )
                                }
                                className={`p-2 rounded-full transition-colors ${
                                  item.isAvailableOnline
                                    ? "text-green-600 bg-green-50"
                                    : "text-gray-300 bg-gray-100"
                                }`}
                                title={
                                  item.isAvailableOnline
                                    ? "Available Online"
                                    : "Hidden from Online"
                                }
                              >
                                <Globe size={18} />
                              </button>
                            </td>
                            {hasPermission("MANAGE_INVENTORY") && (
                              <td className="p-4 md:p-6 text-right flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingProduct(item);
                                    setSelectedProductCategory(item.category);
                                    setNewCategoryName("");
                                    setProdSellingType(
                                      item.sellingType || "Standard"
                                    );
                                    setProdVariants(
                                      item.variants
                                        ? [...item.variants]
                                        : [{ name: "", price: "" }]
                                    );
                                    setProdExtras(
                                      item.availableExtras
                                        ? [...item.availableExtras]
                                        : []
                                    );
                                    setIsProductModalOpen(true);
                                  }}
                                  className="text-indigo-600 p-2 hover:bg-indigo-100 rounded-lg"
                                >
                                  <Edit3 size={18} />
                                </button>
                                <button
                                  onClick={() =>
                                    setMenu(
                                      menu.filter((m) => m.id !== item.id)
                                    )
                                  }
                                  className="text-red-400 p-2 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {view === "staff" && hasPermission("MANAGE_STAFF") && (
                <div className="p-4 md:p-8 h-full overflow-y-auto">
                  {/* Staff content */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-800 flex items-center">
                      <ShieldCheck className="mr-3 text-indigo-600" /> Staff &
                      Roles
                    </h2>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border w-full md:w-auto">
                      <button
                        onClick={() => setActiveStaffTab("staff")}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold transition-all ${
                          activeStaffTab === "staff"
                            ? "bg-indigo-600 text-white shadow"
                            : "text-gray-500"
                        }`}
                      >
                        Staff Members
                      </button>
                      <button
                        onClick={() => setActiveStaffTab("roles")}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-bold transition-all ${
                          activeStaffTab === "roles"
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
                        <h3 className="text-lg font-bold mb-4">
                          Add New Staff
                        </h3>
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
                      <div className="bg-white rounded-3xl shadow-xl overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                          <thead className="bg-gray-50 text-xs font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                              <th className="p-6">Name</th>
                              <th className="p-6">Role</th>
                              <th className="p-6">Phone</th>
                              <th className="p-6">Status</th>
                              <th className="p-6 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffList.map((staff) => (
                              <tr
                                key={staff.id}
                                className="border-b last:border-0"
                              >
                                <td className="p-6 font-bold">{staff.name}</td>
                                <td className="p-6">
                                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {staff.role}
                                  </span>
                                </td>
                                <td className="p-6 text-gray-500">
                                  {staff.phone}
                                </td>
                                <td className="p-6">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-bold ${
                                      staff.active
                                        ? "text-green-600 bg-green-100"
                                        : "text-red-600 bg-red-100"
                                    }`}
                                  >
                                    {staff.active ? "Active" : "Inactive"}
                                  </span>
                                </td>
                                <td className="p-6 text-right">
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
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={role.permissions.includes(key)}
                                  disabled={role.name === "Admin"}
                                  onChange={(e) => {
                                    const newPerms = e.target.checked
                                      ? [...role.permissions, key]
                                      : role.permissions.filter(
                                          (p) => p !== key
                                        );
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
              )}

              {/* --- NEW REPORTS MODULE --- */}
              {view === "reports" && hasPermission("VIEW_REPORTS") && (
                <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <h2 className="text-2xl md:text-4xl font-black flex items-center text-gray-800">
                      <FileText className="mr-3 text-indigo-600" /> Reports &
                      Analytics
                    </h2>
                    <div className="flex gap-3 items-center">
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-white p-3 rounded-xl border-2 shadow-sm"
                      />
                      <button className="p-3 bg-white border-2 rounded-xl shadow-sm text-gray-600 hover:text-indigo-600">
                        <Download size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 h-full lg:h-[calc(100vh-200px)] overflow-hidden">
                    {/* Sidebar for Reports (Responsive) */}
                    <div className="w-full lg:w-64 bg-white rounded-3xl shadow-lg border p-2 lg:p-4 flex flex-row lg:flex-col gap-2 shrink-0 overflow-x-auto lg:overflow-y-auto no-scrollbar">
                      {[
                        {
                          id: "sales",
                          label: "Sales Reports",
                          icon: <TrendingUp size={16} />,
                        },
                        {
                          id: "items",
                          label: "Item-wise Sales",
                          icon: <Utensils size={16} />,
                        },
                        {
                          id: "category",
                          label: "Category-wise",
                          icon: <Package size={16} />,
                        },
                        {
                          id: "payments",
                          label: "Payment Modes",
                          icon: <CreditCard size={16} />,
                        },
                        {
                          id: "tax",
                          label: "Tax / GST",
                          icon: <Receipt size={16} />,
                        },
                        {
                          id: "staff_report",
                          label: "Staff Performance",
                          icon: <UserCheck size={16} />,
                        },
                        {
                          id: "table_report",
                          label: "Table Revenue",
                          icon: <LayoutDashboard size={16} />,
                        },
                        {
                          id: "hourly",
                          label: "Peak Hours",
                          icon: <Clock size={16} />,
                        },
                        {
                          id: "online_report",
                          label: "Online Orders",
                          icon: <Globe size={16} />,
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setReportCategory(item.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap flex-shrink-0 ${
                            reportCategory === item.id
                              ? "bg-indigo-600 text-white shadow-md"
                              : "text-gray-500 hover:bg-gray-100"
                          }`}
                        >
                          {item.icon} {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Report Content Area */}
                    <div className="flex-1 bg-white rounded-3xl shadow-lg border p-4 lg:p-6 overflow-y-auto">
                      {/* 1. SALES REPORT */}
                      {reportCategory === "sales" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Sales Summary ({filterDate})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                              <p className="text-xs font-bold text-indigo-400 uppercase">
                                Total Revenue
                              </p>
                              <p className="text-3xl font-black text-indigo-900 mt-2">
                                {formatCurrency(
                                  salesHistory
                                    .filter((s) => s.date === filterDate)
                                    .reduce((a, b) => a + b.amount, 0)
                                )}
                              </p>
                            </div>
                            <div className="p-6 bg-green-50 rounded-2xl border border-green-100">
                              <p className="text-xs font-bold text-green-400 uppercase">
                                Total Orders
                              </p>
                              <p className="text-3xl font-black text-green-900 mt-2">
                                {
                                  salesHistory.filter(
                                    (s) => s.date === filterDate
                                  ).length
                                }
                              </p>
                            </div>
                            <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                              <p className="text-xs font-bold text-orange-400 uppercase">
                                Avg Bill Value
                              </p>
                              <p className="text-3xl font-black text-orange-900 mt-2">
                                {formatCurrency(
                                  salesHistory.filter(
                                    (s) => s.date === filterDate
                                  ).length
                                    ? salesHistory
                                        .filter((s) => s.date === filterDate)
                                        .reduce((a, b) => a + b.amount, 0) /
                                        salesHistory.filter(
                                          (s) => s.date === filterDate
                                        ).length
                                    : 0
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left mt-4 min-w-[600px]">
                              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                                <tr>
                                  <th className="p-4">Bill ID</th>
                                  <th className="p-4">Time</th>
                                  <th className="p-4">Type</th>
                                  <th className="p-4 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {salesHistory
                                  .filter((s) => s.date === filterDate)
                                  .map((sale, i) => (
                                    <tr
                                      key={i}
                                      className="border-b last:border-0 hover:bg-gray-50"
                                    >
                                      <td className="p-4 font-mono text-xs">
                                        #{sale.id.toString().slice(-6)}
                                      </td>
                                      <td className="p-4 text-sm">
                                        {new Date(
                                          sale.timestamp
                                        ).toLocaleTimeString()}
                                      </td>
                                      <td className="p-4 text-sm">
                                        <span
                                          className={`px-2 py-1 rounded text-xs font-bold ${
                                            sale.type === "Dine-in"
                                              ? "bg-blue-100 text-blue-600"
                                              : "bg-orange-100 text-orange-600"
                                          }`}
                                        >
                                          {sale.type}
                                        </span>
                                      </td>
                                      <td className="p-4 text-right font-bold">
                                        {formatCurrency(sale.amount)}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 2. ITEM-WISE REPORT */}
                      {reportCategory === "items" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Item-wise Sales
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                                <tr>
                                  <th className="p-4">Item Name</th>
                                  <th className="p-4 text-center">Qty Sold</th>
                                  <th className="p-4 text-right">Revenue</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const itemStats = {};
                                  salesHistory
                                    .filter((s) => s.date === filterDate)
                                    .forEach((sale) => {
                                      if (sale.items) {
                                        sale.items.forEach((item) => {
                                          if (!itemStats[item.name])
                                            itemStats[item.name] = {
                                              qty: 0,
                                              revenue: 0,
                                            };
                                          itemStats[item.name].qty +=
                                            item.quantity;
                                          itemStats[item.name].revenue +=
                                            item.price * item.quantity; // Approximate revenue
                                        });
                                      }
                                    });
                                  return Object.entries(itemStats).map(
                                    ([name, stats]) => (
                                      <tr
                                        key={name}
                                        className="border-b last:border-0 hover:bg-gray-50"
                                      >
                                        <td className="p-4 font-bold text-gray-700">
                                          {name}
                                        </td>
                                        <td className="p-4 text-center font-bold">
                                          {stats.qty}
                                        </td>
                                        <td className="p-4 text-right font-bold text-indigo-600">
                                          {formatCurrency(stats.revenue)}
                                        </td>
                                      </tr>
                                    )
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 3. CATEGORY REPORT */}
                      {reportCategory === "category" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Category Performance
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(() => {
                              const catStats = {};
                              salesHistory
                                .filter((s) => s.date === filterDate)
                                .forEach((sale) => {
                                  if (sale.items) {
                                    sale.items.forEach((item) => {
                                      const cat =
                                        item.category || "Uncategorized";
                                      if (!catStats[cat]) catStats[cat] = 0;
                                      catStats[cat] +=
                                        item.price * item.quantity;
                                    });
                                  }
                                });
                              return Object.entries(catStats).map(
                                ([cat, revenue]) => (
                                  <div
                                    key={cat}
                                    className="p-4 border rounded-2xl flex justify-between items-center hover:shadow-md transition-all"
                                  >
                                    <span className="font-bold text-gray-600">
                                      {cat}
                                    </span>
                                    <span className="font-black text-indigo-600 text-lg">
                                      {formatCurrency(revenue)}
                                    </span>
                                  </div>
                                )
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* 4. PAYMENT MODES */}
                      {reportCategory === "payments" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Payment Methods
                          </h3>
                          <div className="space-y-4">
                            {["Cash", "UPI", "Card"].map((method) => {
                              const total = salesHistory
                                .filter(
                                  (s) =>
                                    s.date === filterDate && s.method === method
                                )
                                .reduce((a, b) => a + b.amount, 0);
                              const count = salesHistory.filter(
                                (s) =>
                                  s.date === filterDate && s.method === method
                              ).length;
                              return (
                                <div
                                  key={method}
                                  className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border"
                                >
                                  <div className="flex items-center gap-4">
                                    <div
                                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        method === "Cash"
                                          ? "bg-green-100 text-green-600"
                                          : method === "UPI"
                                          ? "bg-indigo-100 text-indigo-600"
                                          : "bg-blue-100 text-blue-600"
                                      }`}
                                    >
                                      {method === "Cash" ? (
                                        <DollarSign size={20} />
                                      ) : method === "UPI" ? (
                                        <Zap size={20} />
                                      ) : (
                                        <CreditCard size={20} />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-800">
                                        {method}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {count} Transactions
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-xl font-black text-gray-900">
                                    {formatCurrency(total)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 5. TAX REPORT */}
                      {reportCategory === "tax" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Tax / GST Report
                          </h3>
                          <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 text-center">
                            <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">
                              Total Tax Collected
                            </p>
                            <p className="text-4xl font-black text-blue-900 mt-2">
                              {formatCurrency(
                                salesHistory
                                  .filter((s) => s.date === filterDate)
                                  .reduce(
                                    (sum, s) => sum + (s.taxAmount || 0),
                                    0
                                  )
                              )}
                            </p>
                            <p className="text-xs text-blue-400 mt-2">
                              Based on {settings.defaultTaxPercent}% Rate
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 6. STAFF PERFORMANCE REPORT */}
                      {reportCategory === "staff_report" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Staff Performance ({filterDate})
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                                <tr>
                                  <th className="p-4">Staff Name</th>
                                  <th className="p-4 text-center">
                                    Orders Handled
                                  </th>
                                  <th className="p-4 text-right">
                                    Total Sales
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffList
                                  .filter((s) => s.role !== "Admin")
                                  .map((s) => {
                                    const staffSales = salesHistory.filter(
                                      (sale) =>
                                        sale.date === filterDate &&
                                        sale.waiterName === s.name
                                    );
                                    const ordersCount = staffSales.length;
                                    const totalSales = staffSales.reduce(
                                      (sum, sale) => sum + sale.amount,
                                      0
                                    );

                                    return (
                                      <tr
                                        key={s.id}
                                        className="border-b last:border-0 hover:bg-gray-50"
                                      >
                                        <td className="p-4 font-bold text-gray-700">
                                          {s.name}
                                        </td>
                                        <td className="p-4 text-center font-bold text-indigo-600">
                                          {ordersCount}
                                        </td>
                                        <td className="p-4 text-right font-black">
                                          {formatCurrency(totalSales)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 7. TABLE REVENUE REPORT */}
                      {reportCategory === "table_report" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Table Revenue Analysis ({filterDate})
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tables.map((t) => {
                              const tableSales = salesHistory.filter(
                                (s) =>
                                  s.date === filterDate &&
                                  s.tableName === t.name
                              );
                              const totalRevenue = tableSales.reduce(
                                (sum, s) => sum + s.amount,
                                0
                              );
                              const orderCount = tableSales.length;

                              return (
                                <div
                                  key={t.id}
                                  className="p-4 border rounded-2xl flex flex-col justify-between hover:shadow-md transition-all bg-gray-50"
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-gray-700 text-lg">
                                      {t.name}
                                    </span>
                                    <span className="text-xs bg-white px-2 py-1 rounded border text-gray-500">
                                      {orderCount} Orders
                                    </span>
                                  </div>
                                  <span className="font-black text-indigo-600 text-2xl">
                                    {formatCurrency(totalRevenue)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 8. PEAK HOURS REPORT */}
                      {reportCategory === "hourly" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Hourly Sales & Activity ({filterDate})
                          </h3>
                          <div className="h-64 flex items-end justify-between gap-1 px-2 pb-2 border-b border-dashed min-w-[600px] overflow-x-auto">
                            {[...Array(14)].map((_, i) => {
                              const hour = 9 + i; // 9 AM to 10 PM
                              // Check sales history based on timestamp hour
                              const hourSales = salesHistory.filter(
                                (s) =>
                                  s.date === filterDate &&
                                  new Date(s.timestamp).getHours() === hour
                              );
                              const revenue = hourSales.reduce(
                                (a, b) => a + b.amount,
                                0
                              );
                              const count = hourSales.length;
                              const maxRev = 5000; // Mock max for scale
                              const height =
                                Math.min(100, (revenue / maxRev) * 100) || 5;

                              return (
                                <div
                                  key={i}
                                  className="flex flex-col items-center gap-1 group flex-1 min-w-[40px]"
                                >
                                  <div
                                    className="w-full bg-indigo-100 rounded-t-lg relative transition-all group-hover:bg-indigo-300 flex items-end justify-center"
                                    style={{ height: `${height}%` }}
                                  >
                                    <span className="text-[10px] font-bold text-indigo-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {count}
                                    </span>
                                  </div>
                                  <span className="text-[10px] font-bold text-gray-400">
                                    {hour > 12 ? hour - 12 : hour}{" "}
                                    {hour >= 12 ? "PM" : "AM"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 9. ONLINE ORDERS REPORT */}
                      {reportCategory === "online_report" && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-black text-gray-800 border-b pb-4">
                            Online Orders Performance
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(() => {
                              const platformStats = {
                                Zomato: { count: 0, sales: 0 },
                                Swiggy: { count: 0, sales: 0 },
                                Others: { count: 0, sales: 0 },
                              };

                              // Aggregate from onlineOrders history (mock) and potentially salesHistory if marked
                              onlineOrders.forEach((o) => {
                                const p = o.platform || "Others";
                                if (!platformStats[p])
                                  platformStats[p] = { count: 0, sales: 0 };
                                platformStats[p].count++;
                                platformStats[p].sales += o.total;
                              });

                              return Object.entries(platformStats).map(
                                ([plat, stats]) => (
                                  <div
                                    key={plat}
                                    className={`p-6 rounded-3xl border flex flex-col ${
                                      plat === "Zomato"
                                        ? "bg-red-50 border-red-100"
                                        : plat === "Swiggy"
                                        ? "bg-orange-50 border-orange-100"
                                        : "bg-gray-50 border-gray-200"
                                    }`}
                                  >
                                    <div className="flex justify-between items-center mb-4">
                                      <h4
                                        className={`text-lg font-black ${
                                          plat === "Zomato"
                                            ? "text-red-600"
                                            : plat === "Swiggy"
                                            ? "text-orange-600"
                                            : "text-gray-600"
                                        }`}
                                      >
                                        {plat}
                                      </h4>
                                      <span className="bg-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                                        {stats.count} Orders
                                      </span>
                                    </div>
                                    <p className="text-3xl font-black text-gray-800">
                                      {formatCurrency(stats.sales)}
                                    </p>
                                  </div>
                                )
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {view === "settings" && (
                <div className="p-4 md:p-8 max-w-5xl mx-auto h-full overflow-y-auto">
                  <h2 className="text-2xl md:text-4xl font-black mb-10 flex items-center text-gray-800">
                    <Settings className="mr-3 text-indigo-600" /> Control Center
                  </h2>
                  <div className="space-y-8 pb-20">
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
                            className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
                              settings.isTaxEnabled
                                ? "bg-indigo-600"
                                : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full transition-transform ${
                                settings.isTaxEnabled ? "translate-x-6" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>

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
                              onChange={(e) =>
                                setNewTableCapacity(e.target.value)
                              }
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
                            className={`bg-gray-50 px-4 py-3 rounded-2xl border flex flex-col justify-between group ${
                              t.isMaintenance ? "border-red-200 bg-red-50" : ""
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-gray-600">
                                {t.name}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    setTables(
                                      tables.map((table) =>
                                        table.id === t.id
                                          ? {
                                              ...table,
                                              isMaintenance:
                                                !table.isMaintenance,
                                            }
                                          : table
                                      )
                                    )
                                  }
                                  className={`p-1 rounded-lg ${
                                    t.isMaintenance
                                      ? "text-red-600 bg-red-100"
                                      : "text-gray-300 hover:text-orange-500"
                                  }`}
                                  title="Maintenance Mode"
                                >
                                  <Settings size={14} />
                                </button>
                                {t.status === "available" && (
                                  <button
                                    onClick={() =>
                                      setTables(
                                        tables.filter(
                                          (table) => table.id !== t.id
                                        )
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

                    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border space-y-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                            <History size={24} />
                          </div>
                          <h3 className="text-xl font-bold">
                            Login Activity Logs
                          </h3>
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
                                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                        log.role === "Admin"
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
                                  <td className="p-4 text-gray-500 text-sm">
                                    {log.date}
                                  </td>
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
                                  No activity found matching criteria
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ... (Modals remain unchanged) ... */}
      {/* Reservation Modal */}
      {isReservationModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6">New Reservation</h3>
            <div className="space-y-4">
              <input
                value={newReservation.customerName}
                onChange={(e) =>
                  setNewReservation({
                    ...newReservation,
                    customerName: e.target.value,
                  })
                }
                placeholder="Customer Name"
                className="w-full p-3 border rounded-xl"
              />
              <input
                value={newReservation.phone}
                onChange={(e) =>
                  setNewReservation({
                    ...newReservation,
                    phone: e.target.value,
                  })
                }
                placeholder="Phone Number"
                className="w-full p-3 border rounded-xl"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  value={newReservation.date}
                  onChange={(e) =>
                    setNewReservation({
                      ...newReservation,
                      date: e.target.value,
                    })
                  }
                  className="w-full p-3 border rounded-xl"
                />
                <input
                  type="time"
                  value={newReservation.time}
                  onChange={(e) =>
                    setNewReservation({
                      ...newReservation,
                      time: e.target.value,
                    })
                  }
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  value={newReservation.guests}
                  onChange={(e) =>
                    setNewReservation({
                      ...newReservation,
                      guests: e.target.value,
                    })
                  }
                  placeholder="Guests"
                  className="w-full p-3 border rounded-xl"
                />
                <input
                  type="number"
                  value={newReservation.tableId}
                  onChange={(e) =>
                    setNewReservation({
                      ...newReservation,
                      tableId: e.target.value,
                    })
                  }
                  placeholder="Table (Opt)"
                  className="w-full p-3 border rounded-xl"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setIsReservationModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddReservation}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold"
                >
                  Book Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal (Add/Edit) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-lg shadow-2xl h-[90vh] overflow-y-auto">
            <h3 className="text-3xl font-black mb-8">
              {editingProduct ? "Edit" : "Add"} Item
            </h3>
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                  Item Name
                </label>
                <input
                  id="prod-name"
                  defaultValue={editingProduct?.name || ""}
                  placeholder="Item Name"
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                  Category
                </label>
                <select
                  id="prod-category"
                  value={selectedProductCategory}
                  onChange={(e) => setSelectedProductCategory(e.target.value)}
                  className="w-full p-4 border rounded-2xl bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {categories
                    .filter((c) => c !== "All")
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  <option value="NEW_CATEGORY_TRIGGER">
                    + Add New Category...
                  </option>
                </select>

                {selectedProductCategory === "NEW_CATEGORY_TRIGGER" && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <input
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Type new category name..."
                      className="w-full p-4 border-2 border-indigo-500 rounded-2xl outline-none shadow-inner"
                    />
                  </div>
                )}
              </div>

              {/* Selling Type Selector */}
              <div>
                <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                  Selling Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["Standard", "Portion", "Weight", "Volume"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setProdSellingType(type)}
                      className={`py-3 rounded-xl text-xs font-bold border transition-all ${
                        prodSellingType === type
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white border-gray-200 text-gray-500"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Pricing Fields */}
              <div className="p-4 bg-gray-50 rounded-2xl border">
                {prodSellingType === "Standard" && (
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                      Price (INR)
                    </label>
                    <input
                      id="prod-price"
                      type="number"
                      defaultValue={editingProduct?.price || ""}
                      placeholder="Standard Price"
                      className="w-full p-4 border rounded-2xl outline-none bg-white"
                    />
                  </div>
                )}

                {prodSellingType === "Weight" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                        Price Per Unit
                      </label>
                      <input
                        id="prod-price-unit"
                        type="number"
                        defaultValue={editingProduct?.pricePerUnit || ""}
                        placeholder="e.g. 500"
                        className="w-full p-4 border rounded-2xl outline-none bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                        Unit Name
                      </label>
                      <input
                        id="prod-unit-name"
                        defaultValue={editingProduct?.unitName || "kg"}
                        placeholder="e.g. kg"
                        className="w-full p-4 border rounded-2xl outline-none bg-white"
                      />
                    </div>
                  </div>
                )}

                {(prodSellingType === "Portion" ||
                  prodSellingType === "Volume") && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                      {prodSellingType} Variants
                    </label>
                    {prodVariants.map((v, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          value={v.name}
                          onChange={(e) => {
                            const n = [...prodVariants];
                            n[i].name = e.target.value;
                            setProdVariants(n);
                          }}
                          placeholder={
                            prodSellingType === "Portion"
                              ? "Name (e.g. Half)"
                              : "Size (e.g. 500ml)"
                          }
                          className="flex-1 p-3 border rounded-xl text-sm outline-none"
                        />
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => {
                            const n = [...prodVariants];
                            n[i].price = e.target.value;
                            setProdVariants(n);
                          }}
                          placeholder="Price"
                          className="w-24 p-3 border rounded-xl text-sm outline-none"
                        />
                        {prodVariants.length > 1 && (
                          <button
                            onClick={() =>
                              setProdVariants(
                                prodVariants.filter((_, idx) => idx !== i)
                              )
                            }
                            className="text-red-400"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        setProdVariants([
                          ...prodVariants,
                          { name: "", price: "" },
                        ])
                      }
                      className="text-indigo-600 text-xs font-bold flex items-center gap-1 mt-2"
                    >
                      + Add Variant
                    </button>
                  </div>
                )}
              </div>

              {/* Extras Setup */}
              <div className="p-4 bg-gray-50 rounded-2xl border">
                <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                  Applicable Extras / Add-ons
                </label>
                <div className="space-y-2">
                  {prodExtras.map((ex, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={ex.name}
                        onChange={(e) => {
                          const n = [...prodExtras];
                          n[i].name = e.target.value;
                          setProdExtras(n);
                        }}
                        placeholder="Extra Name (e.g. Kuboos)"
                        className="flex-1 p-3 border rounded-xl text-sm outline-none"
                      />
                      <input
                        type="number"
                        value={ex.price}
                        onChange={(e) => {
                          const n = [...prodExtras];
                          n[i].price = e.target.value;
                          setProdExtras(n);
                        }}
                        placeholder="Price"
                        className="w-24 p-3 border rounded-xl text-sm outline-none"
                      />
                      <button
                        onClick={() =>
                          setProdExtras(
                            prodExtras.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-red-400"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setProdExtras([...prodExtras, { name: "", price: "" }])
                    }
                    className="text-indigo-600 text-xs font-bold flex items-center gap-1 mt-2"
                  >
                    + Add Extra Option
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-400 uppercase mb-1 block">
                  Tax Rate (%)
                </label>
                <input
                  id="prod-tax"
                  type="number"
                  defaultValue={
                    editingProduct
                      ? editingProduct.taxPercent
                      : settings.defaultTaxPercent
                  }
                  placeholder="Tax %"
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-4 font-bold text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const name = document.getElementById("prod-name").value;
                    const taxPercent =
                      document.getElementById("prod-tax").value;

                    // Handle Prices based on Type
                    let price = 0;
                    let pricePerUnit = 0;
                    let unitName = "";

                    if (prodSellingType === "Standard") {
                      price = parseFloat(
                        document.getElementById("prod-price").value || 0
                      );
                    } else if (prodSellingType === "Weight") {
                      pricePerUnit = parseFloat(
                        document.getElementById("prod-price-unit").value || 0
                      );
                      unitName =
                        document.getElementById("prod-unit-name").value;
                    }

                    let finalCategory = selectedProductCategory;
                    if (selectedProductCategory === "NEW_CATEGORY_TRIGGER") {
                      finalCategory = newCategoryName.trim() || "Uncategorized";
                    }

                    if (name) {
                      const newItem = {
                        id: editingProduct
                          ? editingProduct.id
                          : Date.now().toString(),
                        name,
                        category: finalCategory,
                        taxPercent:
                          parseFloat(taxPercent) || settings.defaultTaxPercent,
                        sellingType: prodSellingType,
                        price,
                        pricePerUnit,
                        unitName,
                        variants: prodVariants
                          .filter((v) => v.name && v.price)
                          .map((v) => ({ ...v, price: parseFloat(v.price) })),
                        availableExtras: prodExtras
                          .filter((e) => e.name && e.price)
                          .map((e) => ({ ...e, price: parseFloat(e.price) })),
                        isAvailableOnline: editingProduct
                          ? editingProduct.isAvailableOnline
                          : true,
                      };

                      if (editingProduct) {
                        setMenu(
                          menu.map((m) =>
                            m.id === editingProduct.id ? newItem : m
                          )
                        );
                      } else {
                        setMenu([...menu, newItem]);
                      }
                      setIsProductModalOpen(false);
                      setEditingProduct(null);
                    }
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Customization Modal (For Portions/Weights/Extras) */}
      {isCustomizationModalOpen && customizingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-lg rounded-t-[40px] md:rounded-[40px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 pb-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {customizingItem.category}
                  </span>
                  <h3 className="text-2xl font-black text-gray-800">
                    {customizingItem.name}
                  </h3>
                </div>
                <button
                  onClick={() => setIsCustomizationModalOpen(false)}
                  className="p-2 bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-8 overflow-y-auto space-y-8 flex-1">
              {/* Variant Selection */}
              {(customizingItem.sellingType === "Portion" ||
                customizingItem.sellingType === "Volume") && (
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase mb-3 block">
                    Select Size / Portion
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {customizingItem.variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setCustomVariant(v)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all ${
                          customVariant?.name === v.name
                            ? "border-indigo-600 bg-indigo-50"
                            : "border-gray-100 hover:border-indigo-200"
                        }`}
                      >
                        <div className="font-bold text-gray-800">{v.name}</div>
                        <div className="font-black text-indigo-600">
                          {formatCurrency(v.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Weight Input */}
              {customizingItem.sellingType === "Weight" && (
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <label className="text-xs font-black text-gray-400 uppercase block">
                      Enter Weight
                    </label>
                    <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                      <button
                        onClick={() => setCustomWeightUnit("kg")}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          customWeightUnit === "kg"
                            ? "bg-white shadow text-indigo-600"
                            : "text-gray-500"
                        }`}
                      >
                        KG
                      </button>
                      <button
                        onClick={() => setCustomWeightUnit("g")}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                          customWeightUnit === "g"
                            ? "bg-white shadow text-indigo-600"
                            : "text-gray-500"
                        }`}
                      >
                        GRAMS
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border-2 border-indigo-100">
                    <Scale className="text-indigo-600" size={24} />
                    <input
                      type="number"
                      value={customWeightInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setCustomWeightInput("");
                        } else {
                          setCustomWeightInput(parseFloat(val));
                        }
                      }}
                      className="flex-1 bg-transparent text-3xl font-black text-gray-800 outline-none w-20"
                      step="0.05"
                      autoFocus
                    />
                    <span className="font-bold text-gray-400 uppercase">
                      {customWeightUnit}
                    </span>
                  </div>
                  <div className="text-right mt-2 text-indigo-600 font-bold">
                    Price:{" "}
                    {formatCurrency(
                      (customWeightUnit === "g"
                        ? (parseFloat(customWeightInput) || 0) / 1000
                        : parseFloat(customWeightInput) || 0) *
                        customizingItem.pricePerUnit
                    )}
                  </div>
                </div>
              )}

              {/* Extras Selection */}
              {customizingItem.availableExtras &&
                customizingItem.availableExtras.length > 0 && (
                  <div>
                    <label className="text-xs font-black text-gray-400 uppercase mb-3 block">
                      Add Extras
                    </label>
                    <div className="space-y-3">
                      {customizingItem.availableExtras.map((extra, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center p-3 rounded-2xl border border-gray-100 bg-white shadow-sm"
                        >
                          <div>
                            <div className="font-bold text-gray-700">
                              {extra.name}
                            </div>
                            <div className="text-xs font-bold text-gray-400">
                              {formatCurrency(extra.price)}
                            </div>
                          </div>

                          {customExtras[extra.name] > 0 ? (
                            <div className="flex items-center gap-3 bg-indigo-50 p-1 rounded-xl">
                              <button
                                onClick={() =>
                                  setCustomExtras({
                                    ...customExtras,
                                    [extra.name]: customExtras[extra.name] - 1,
                                  })
                                }
                                className="p-1 bg-white rounded-lg text-red-500 shadow-sm"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="font-bold text-sm w-4 text-center">
                                {customExtras[extra.name]}
                              </span>
                              <button
                                onClick={() =>
                                  setCustomExtras({
                                    ...customExtras,
                                    [extra.name]: customExtras[extra.name] + 1,
                                  })
                                }
                                className="p-1 bg-white rounded-lg text-indigo-600 shadow-sm"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setCustomExtras({
                                  ...customExtras,
                                  [extra.name]: 1,
                                })
                              }
                              className="p-2 bg-gray-100 rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                            >
                              <Plus size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={handleConfirmCustomization}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl flex justify-between px-8 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <span>Add to Order</span>
                {/* Dynamic Total Calculation for Button */}
                <span>
                  {formatCurrency(
                    (customizingItem.sellingType === "Weight"
                      ? (customWeightUnit === "g"
                          ? (parseFloat(customWeightInput) || 0) / 1000
                          : parseFloat(customWeightInput) || 0) *
                        customizingItem.pricePerUnit
                      : customVariant?.price || customizingItem.price || 0) +
                      Object.keys(customExtras).reduce(
                        (acc, key) =>
                          acc +
                          customizingItem.availableExtras.find(
                            (e) => e.name === key
                          ).price *
                            customExtras[key],
                        0
                      )
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW FEATURE: Full Order Summary Modal --- */}
      {isFullOrderSummaryOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-indigo-900">
                  Full Order Summary
                </h3>
                <p className="text-sm font-bold text-gray-500">
                  {isTakeaway
                    ? `Takeaway Order`
                    : `Table ${activeTableId} • ${
                        tables.find((t) => t.id === activeTableId)?.name
                      }`}
                </p>
              </div>
              <button
                onClick={() => setIsFullOrderSummaryOpen(false)}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Items List */}
              {(isTakeaway
                ? takeawayOrder.items
                : tables.find((t) => t.id === activeTableId)?.order?.items || []
              ).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                  <ShoppingBag size={64} className="mb-4" />
                  <p className="text-xl font-bold">Order is empty</p>
                </div>
              ) : (
                (isTakeaway
                  ? takeawayOrder.items
                  : tables.find((t) => t.id === activeTableId)?.order?.items ||
                    []
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-start p-4 bg-gray-50 rounded-2xl border border-gray-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-100 text-indigo-700 font-black px-3 py-1 rounded-lg text-sm">
                          {item.quantity}x
                        </span>
                        <span className="font-bold text-lg text-gray-800">
                          {item.name}
                        </span>
                      </div>
                      <div className="pl-12 mt-1 space-y-1">
                        {item.selectedVariant && (
                          <div className="text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded">
                            {item.selectedVariant.name}
                          </div>
                        )}
                        {item.sellingType === "Weight" && (
                          <div className="text-sm text-gray-500">
                            Weight:{" "}
                            {item.enteredUnit === "g"
                              ? `${parseFloat(
                                  (item.quantity * 1000).toFixed(0)
                                )}g`
                              : `${item.quantity}${item.unitName}`}
                          </div>
                        )}
                        {item.selectedExtras?.length > 0 && (
                          <div className="text-sm text-gray-500">
                            <span className="font-bold text-gray-400 text-xs uppercase tracking-wider">
                              Extras:
                            </span>{" "}
                            {item.selectedExtras
                              .map((e) => `${e.name} (x${e.quantity})`)
                              .join(", ")}
                          </div>
                        )}
                        {item.suggestion && (
                          <div className="text-sm text-orange-600 italic bg-orange-50 p-2 rounded-lg mt-2 inline-block border border-orange-100">
                            <Edit3 size={12} className="inline mr-1" />
                            {item.suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-gray-900">
                        {formatCurrency(calculateItemTotal(item))}
                      </span>
                      <div className="text-xs text-gray-400 mt-1">
                        {item.sellingType === "Standard"
                          ? formatCurrency(item.price)
                          : "Var. Price"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-500">
                  Total Items
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {
                    (isTakeaway
                      ? takeawayOrder.items
                      : tables.find((t) => t.id === activeTableId)?.order
                          ?.items || []
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between items-center text-3xl font-black text-indigo-900">
                <span>Total Amount</span>
                <span>
                  {formatCurrency(
                    calculateTotal(
                      isTakeaway
                        ? takeawayOrder
                        : tables.find((t) => t.id === activeTableId)?.order
                    )
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setIsFullOrderSummaryOpen(false)}
                  className="py-4 rounded-xl font-bold text-gray-600 bg-white border-2 border-gray-200 hover:bg-gray-100"
                >
                  Close View
                </button>
                <button
                  onClick={handlePrintReceipt}
                  className="py-4 rounded-xl font-bold text-white bg-indigo-600 shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Printer /> Print Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- NEW NOTE MODAL --- */}
      {noteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[30px] shadow-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <MessageSquare size={20} className="text-indigo-600" /> Add Note
              </h3>
              <button
                onClick={() =>
                  setNoteModal({ isOpen: false, idx: null, text: "" })
                }
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <X size={16} />
              </button>
            </div>
            <textarea
              autoFocus
              className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 focus:border-indigo-500 outline-none text-gray-700 font-medium resize-none mb-4"
              placeholder="Enter custom instructions here (e.g. Less spicy, Extra sauce)..."
              value={noteModal.text}
              onChange={(e) =>
                setNoteModal({ ...noteModal, text: e.target.value })
              }
            />
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setNoteModal({ isOpen: false, idx: null, text: "" })
                }
                className="flex-1 py-3 bg-white border-2 border-gray-100 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="flex-1 py-3 bg-indigo-600 rounded-xl font-bold text-white shadow-lg hover:bg-indigo-700"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-2xl">
            <h3 className="text-3xl font-black mb-8">Add Expense</h3>
            <div className="space-y-6">
              <input
                id="exp-title"
                placeholder="Expense Description (e.g. Milk, Power Bill)"
                className="w-full p-4 border rounded-2xl outline-none"
              />
              <input
                id="exp-amount"
                type="number"
                placeholder="Amount (INR)"
                className="w-full p-4 border rounded-2xl outline-none"
              />
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-4 font-bold text-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const title = document.getElementById("exp-title").value;
                    const amount = document.getElementById("exp-amount").value;
                    if (title && amount) {
                      setExpenses([
                        ...expenses,
                        {
                          id: Date.now(),
                          title,
                          amount: parseFloat(amount),
                          date: filterDate,
                          category: "General",
                        },
                      ]);
                      setIsExpenseModalOpen(false);
                    }
                  }}
                  className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg"
                >
                  Record Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ENHANCED BILLING MODAL --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-gray-800">
                  {billingStage === "review" ? "Review Bill" : "Payment"}
                </h3>
                <p className="text-sm text-gray-500">
                  {isTakeaway ? "Takeaway" : `Table ${activeTableId}`}
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-2 bg-white rounded-full shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {billingStage === "review" && (
                <>
                  {/* Item List Compact */}
                  <div className="space-y-3">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                      Items
                    </p>
                    {(isTakeaway
                      ? takeawayOrder.items
                      : tables.find((t) => t.id === activeTableId)?.order
                          ?.items || []
                    ).map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-start text-sm border-b border-dashed pb-2 last:border-0"
                      >
                        <div className="flex gap-3">
                          <span className="font-bold text-gray-500">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="font-bold text-gray-800">
                              {item.name}
                            </span>
                            {item.selectedExtras?.length > 0 && (
                              <div className="text-xs text-gray-400">
                                + Extras
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="font-medium">
                          {formatCurrency(calculateItemTotal(item))}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Code Section - NEW FEATURE */}
                  {hasPermission("APPLY_DISCOUNTS") && (
                    <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-orange-900 text-sm flex items-center gap-2">
                          <Tag size={16} /> Apply Coupon
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponStatus(null); // Clear status when typing
                          }}
                          placeholder="Enter Code"
                          className="flex-1 p-2 rounded-xl border border-orange-200 outline-none uppercase font-bold text-sm"
                        />
                        <button
                          onClick={applyCoupon}
                          className="bg-orange-500 text-white px-4 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      {couponStatus && (
                        <p
                          className={`text-xs font-bold ${
                            couponStatus.type === "success"
                              ? "text-green-600"
                              : "text-red-500"
                          }`}
                        >
                          {couponStatus.msg}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Manual Discount Controls */}
                  {hasPermission("APPLY_DISCOUNTS") && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-indigo-900 text-sm">
                          Manual Discount
                        </span>
                        <div className="flex gap-2 text-xs">
                          <button
                            onClick={() =>
                              setBillDiscount({ ...billDiscount, type: "flat" })
                            }
                            className={`px-3 py-1 rounded-lg font-bold ${
                              billDiscount.type === "flat"
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-gray-500"
                            }`}
                          >
                            Flat ₹
                          </button>
                          <button
                            onClick={() =>
                              setBillDiscount({
                                ...billDiscount,
                                type: "percent",
                              })
                            }
                            className={`px-3 py-1 rounded-lg font-bold ${
                              billDiscount.type === "percent"
                                ? "bg-indigo-600 text-white"
                                : "bg-white text-gray-500"
                            }`}
                          >
                            % Off
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-200">
                        <Calculator size={18} className="text-indigo-400" />
                        <input
                          type="number"
                          value={billDiscount.value}
                          onChange={(e) => {
                            setBillDiscount({
                              ...billDiscount,
                              value: parseFloat(e.target.value) || 0,
                            });
                            // Clear coupon status if manual discount is edited to avoid confusion
                            if (couponStatus?.type === "success") {
                              setCouponStatus(null);
                              setCouponCode("");
                            }
                          }}
                          className="flex-1 outline-none font-bold text-gray-800"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bill Breakdown */}
                  {(() => {
                    const details = calculateBillDetails(
                      isTakeaway
                        ? takeawayOrder.items
                        : tables.find((t) => t.id === activeTableId)?.order
                            ?.items,
                      billDiscount,
                      settings.defaultTaxPercent,
                      isAutoRoundOff
                    );
                    return (
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Subtotal</span>
                          <span>{formatCurrency(details.subtotal)}</span>
                        </div>
                        {details.discountAmount > 0 && (
                          <div className="flex justify-between text-sm text-green-600 font-bold">
                            <span>
                              Discount{" "}
                              {couponStatus?.type === "success"
                                ? "(Coupon)"
                                : ""}
                            </span>
                            <span>
                              - {formatCurrency(details.discountAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm text-gray-500">
                          <span>Tax ({settings.defaultTaxPercent}%)</span>
                          <span>{formatCurrency(details.taxAmount)}</span>
                        </div>
                        {isAutoRoundOff && (
                          <div className="flex justify-between text-sm text-gray-400 italic">
                            <span>Round Off</span>
                            <span>{details.roundOff.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-2xl font-black text-indigo-900 pt-3 border-t border-dashed mt-2">
                          <span>Payable</span>
                          <span>{formatCurrency(details.finalTotal)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {billingStage === "payment" && (
                <div className="flex flex-col items-center space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">
                      Total Payable
                    </p>
                    <h2 className="text-4xl font-black text-indigo-900">
                      {formatCurrency(
                        calculateBillDetails(
                          isTakeaway
                            ? takeawayOrder.items
                            : tables.find((t) => t.id === activeTableId)?.order
                                ?.items,
                          billDiscount,
                          settings.defaultTaxPercent,
                          isAutoRoundOff
                        ).finalTotal
                      )}
                    </h2>
                  </div>

                  <div className="w-full space-y-3">
                    <button
                      onClick={() => handleFinalizePayment("UPI")}
                      className="w-full p-5 border-2 rounded-2xl hover:bg-indigo-50 hover:border-indigo-600 transition-all flex justify-between items-center font-black group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                          <Zap size={20} />
                        </div>{" "}
                        UPI / QR
                      </span>
                      <ChevronRight className="text-gray-300 group-hover:text-indigo-600" />
                    </button>
                    <button
                      onClick={() => handleFinalizePayment("Cash")}
                      className="w-full p-5 border-2 rounded-2xl hover:bg-green-50 hover:border-green-600 transition-all flex justify-between items-center font-black group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <DollarSign size={20} />
                        </div>{" "}
                        Cash
                      </span>
                      <ChevronRight className="text-gray-300 group-hover:text-green-600" />
                    </button>
                    <button
                      onClick={() => handleFinalizePayment("Card")}
                      className="w-full p-5 border-2 rounded-2xl hover:bg-blue-50 hover:border-blue-600 transition-all flex justify-between items-center font-black group"
                    >
                      <span className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <CreditCard size={20} />
                        </div>{" "}
                        Card
                      </span>
                      <ChevronRight className="text-gray-300 group-hover:text-blue-600" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-gray-50 border-t flex gap-3">
              {billingStage === "review" ? (
                <button
                  onClick={() => setBillingStage("payment")}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  Confirm Bill <ArrowLeft className="rotate-180" size={20} />
                </button>
              ) : (
                <button
                  onClick={() => setBillingStage("review")}
                  className="w-full py-4 bg-white text-gray-600 font-bold border-2 border-gray-200 rounded-2xl hover:bg-gray-100"
                >
                  Back to Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
