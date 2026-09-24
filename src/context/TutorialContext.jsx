import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { userTutorialService } from '../services/userTutorial.service';
import { usePermission } from '../auth/usePermission';
import { useAuth } from '../context/AuthContext';
import { ROUTE_ACCESS } from '../constants/routeAccess';

const TutorialContext = createContext(null);

// Master list of tutorial steps mapped to modules, pages & buttons
const ALL_TUTORIAL_STEPS = [
  {
    id: 'welcome',
    routeKey: 'DASHBOARD',
    routePath: '/dashboard',
    title: '🎉 Welcome to Your POS System!',
    description: 'Let\'s take a quick interactive tour to explore your dashboard, sidebar navigation, and key feature buttons tailored to your permissions.',
    targetSelector: null,
    buttonLabel: null,
    type: 'welcome'
  },
  {
    id: 'dashboard',
    routeKey: 'DASHBOARD',
    routePath: '/dashboard',
    title: '📊 Business Dashboard',
    description: 'This is your central command center. Here you can monitor daily sales, active orders, net revenue, and operational statistics in real-time.',
    targetSelector: '[data-tour="sidebar-dashboard"]',
    buttonLabel: 'Dashboard Navigation',
    type: 'page'
  },
  {
    id: 'organization',
    routeKey: 'ORGANIZATION',
    routePath: '/organization',
    title: '🏢 Organization & Store Profile',
    description: 'Manage your company master profile, shop logo, GSTIN, receipt currency formats, and multi-branch store locations.',
    targetSelector: '[data-tour="sidebar-organization"]',
    buttonLabel: 'Organization Profile',
    type: 'page'
  },
  {
    id: 'dininghall',
    routeKey: 'DINING',
    routePath: '/dininghall',
    title: '🍽️ Dining Hall & Tables',
    description: 'View your real-time restaurant floor layout, active table seating, occupied tables, and running bill amounts.',
    targetSelector: '[data-tour="sidebar-dining"]',
    buttonLabel: 'Dining Hall',
    type: 'page'
  },
  {
    id: 'dininghall-jointables',
    routeKey: 'DINING',
    routePath: '/dininghall',
    title: '🔗 Join Tables Feature',
    description: 'Use the "Join Tables" button to merge multiple tables for large group bookings and combine billings seamlessly.',
    targetSelector: '[data-tour="dining-jointables"]',
    buttonLabel: 'Join Tables Button',
    type: 'button',
    actionPermission: { module: 'pos', action: 'pos.dining' }
  },
  {
    id: 'direct_sale',
    routeKey: 'DIRECT_SALE',
    routePath: '/takeaway',
    title: '🛒 Direct Sale / Quick Billing',
    description: 'Fast counter sale billing for walk-in retail or quick over-the-counter payments.',
    targetSelector: '[data-tour="sidebar-direct_sale"], [data-tour="sidebar-takeaway"]',
    buttonLabel: 'Direct Sale / Quick Billing',
    type: 'page'
  },
  {
    id: 'takeaway',
    routeKey: 'TAKEAWAY',
    routePath: '/takeaway',
    title: '🛍️ Takeaway POS',
    description: 'Express POS ordering interface for takeaway orders, quick item selection, search, and customer checkout.',
    targetSelector: '[data-tour="sidebar-takeaway"], [data-tour="sidebar-direct_sale"]',
    buttonLabel: 'Takeaway POS',
    type: 'page'
  },
  {
    id: 'takeaway-kot',
    routeKey: 'TAKEAWAY',
    routePath: '/takeaway',
    title: '🍳 Send to KOT Button',
    description: 'Click "Send to KOT" to instantly print or dispatch order tickets to the Kitchen Display System (KDS).',
    targetSelector: '[data-tour="pos-kot-btn"]',
    buttonLabel: 'Send to KOT Button',
    type: 'button'
  },
  {
    id: 'takeaway-pay',
    routeKey: 'TAKEAWAY',
    routePath: '/takeaway',
    title: '💳 Settle / Pay Order Button',
    description: 'Collect customer payments via Cash, Card, or UPI, apply discounts, and generate official receipts.',
    targetSelector: '[data-tour="pos-pay-btn"]',
    buttonLabel: 'Pay / Settle Button',
    type: 'button'
  },
  {
    id: 'wholesale',
    routeKey: 'WHOLESALE',
    routePath: '/wholesale',
    title: '🏬 Wholesale Billing',
    description: 'Create wholesale orders filtered specifically for stock trade items and bulk pricing.',
    targetSelector: '[data-tour="sidebar-wholesale"]',
    buttonLabel: 'Wholesale POS',
    type: 'page'
  },
  {
    id: 'sale_marking',
    routeKey: 'SALE_MARKING',
    routePath: '/sale-marking',
    title: '📝 Sale Marking & Logging',
    description: 'Fast sales logging and quick manual sale invoice generation.',
    targetSelector: '[data-tour="sidebar-sale_marking"], [data-tour="sidebar-sales"]',
    buttonLabel: 'Sale Marking',
    type: 'page'
  },
  {
    id: 'sales_history',
    routeKey: 'SALES_HISTORY',
    routePath: '/sales-history',
    title: '🛍️ Sales Register & Invoices',
    description: 'Complete historical sales register, invoice printing, customer credit logs, and filtering.',
    targetSelector: '[data-tour="sidebar-sales_history"], [data-tour="sidebar-sales"]',
    buttonLabel: 'Sales History',
    type: 'page'
  },
  {
    id: 'online-orders',
    routeKey: 'ONLINE_ORDERS',
    routePath: '/online-orders',
    title: '🌐 Online Orders Hub',
    description: 'Manage incoming delivery orders from Zomato, Swiggy, and direct web orders with live audio alerts.',
    targetSelector: '[data-tour="sidebar-online_orders"]',
    buttonLabel: 'Online Orders',
    type: 'page'
  },
  {
    id: 'kds',
    routeKey: 'KDS',
    routePath: '/kds',
    title: '📺 Kitchen Display System (KDS)',
    description: 'Real-time kitchen order screen for chefs to track prep timers, mark dishes as cooking, and complete orders.',
    targetSelector: '[data-tour="sidebar-kds"]',
    buttonLabel: 'Kitchen Display',
    type: 'page'
  },
  {
    id: 'table_management',
    routeKey: 'TABLE_MANAGEMENT',
    routePath: '/table-management',
    title: '🪑 Table Layouts & Dining Areas',
    description: 'Design dining section layouts (AC, Rooftop, Garden), set table capacities, and generate digital ordering QR codes.',
    targetSelector: '[data-tour="sidebar-table_management"]',
    buttonLabel: 'Table Management',
    type: 'page'
  },
  {
    id: 'inventory',
    routeKey: 'INVENTORY',
    routePath: '/inventory',
    title: '📦 Stock & Inventory Master',
    description: 'Track menu food items, raw material stock levels, trade goods, and receive low-stock alerts.',
    targetSelector: '[data-tour="sidebar-inventory"]',
    buttonLabel: 'Stock Items',
    type: 'page'
  },
  {
    id: 'inventory-add',
    routeKey: 'INVENTORY',
    routePath: '/inventory',
    title: '➕ Add Item Button',
    description: 'Use "+ Add Item" to create new menu items, configure price, barcode, categories, and inventory stock thresholds.',
    targetSelector: '[data-tour="inventory-add-btn"]',
    buttonLabel: '+ Add Item Button',
    type: 'button'
  },
  {
    id: 'operating-expenses',
    routeKey: 'OPERATING_EXPENSES',
    routePath: '/dashboard/operating-expenses',
    title: '💸 Operating Expenses',
    description: 'Log and track shop operating expenses, utility bills, rent, maintenance, and daily cash outlays.',
    targetSelector: '[data-tour="sidebar-operating_expenses"]',
    buttonLabel: 'Operating Expenses',
    type: 'page'
  },
  {
    id: 'purchases',
    routeKey: 'PURCHASES',
    routePath: '/purchases',
    title: '🛒 Purchase Invoices & Vendor Bills',
    description: 'Manage supplier stock intake, record purchase invoices, handle purchase returns, and vendor payables.',
    targetSelector: '[data-tour="sidebar-purchases"], [data-tour="sidebar-purchases_group"]',
    buttonLabel: 'Purchases',
    type: 'page'
  },
  {
    id: 'parties',
    routeKey: 'PARTIES',
    routePath: '/parties',
    title: '👥 Parties Directory (Customers & Suppliers)',
    description: 'Unified database for managing customer contact profiles, loyalty points balance, and vendor accounts.',
    targetSelector: '[data-tour="sidebar-parties"]',
    buttonLabel: 'Parties Directory',
    type: 'page'
  },
  {
    id: 'offers',
    routeKey: 'OFFERS',
    routePath: '/offers',
    title: '🏷️ Offers & Promotional Deals',
    description: 'Configure promotional discount vouchers, BOGO deals, combo pricing, and seasonal campaign offers.',
    targetSelector: '[data-tour="sidebar-offers"]',
    buttonLabel: 'Offers',
    type: 'page'
  },
  {
    id: 'service',
    routeKey: 'SERVICE',
    routePath: '/service',
    title: '🔧 Service & Repair Work Orders',
    description: 'Create service job cards, track repair status, work orders, and maintain equipment logs.',
    targetSelector: '[data-tour="sidebar-service"]',
    buttonLabel: 'Service & Repairs',
    type: 'page'
  },
  {
    id: 'staff',
    routeKey: 'STAFF',
    routePath: '/staff',
    title: '👥 Staff & Role Management',
    description: 'Manage staff profiles, assign custom roles & permissions, manage shift attendance policies, and run payroll.',
    targetSelector: '[data-tour="sidebar-staff"]',
    buttonLabel: 'Staff Management',
    type: 'page'
  },
  {
    id: 'staff-add',
    routeKey: 'STAFF',
    routePath: '/staff',
    title: '➕ Add Employee Button',
    description: 'Click "+ Add Employee" to onboard new team members, create login credentials, and assign custom system roles.',
    targetSelector: '[data-tour="staff-add-btn"]',
    buttonLabel: '+ Add Employee Button',
    type: 'button'
  },
  {
    id: 'staff-roles-tab',
    routeKey: 'STAFF',
    routePath: '/staff',
    title: '🛡️ Staff Roles & Custom Permissions',
    description: 'Create custom job roles (Cashier, Waiter, Manager) and grant exact per-module permissions for your team.',
    targetSelector: '[data-tour="staff-tab-roles"]',
    buttonLabel: 'Roles Tab',
    type: 'button'
  },
  {
    id: 'staff-attendance-policies',
    routeKey: 'STAFF',
    routePath: '/staff',
    title: '⏱️ Attendance Policies & Shift Rules',
    description: 'Configure shift start/end times, grace minutes, half-day thresholds, and overtime parameters.',
    targetSelector: '[data-tour="staff-tab-policies"]',
    buttonLabel: 'Attendance Policies Tab',
    type: 'button',
    actionPermission: { module: 'staff', action: 'ATTENDANCE.POLICIES' }
  },
  {
    id: 'staff-attendance-logs',
    routeKey: 'STAFF',
    routePath: '/staff',
    title: '📋 Clock-In Attendance Logs',
    description: 'Monitor daily staff clock-in/out logs, track late arrivals, and perform manual attendance corrections.',
    targetSelector: '[data-tour="staff-tab-logs"]',
    buttonLabel: 'Attendance Logs Tab',
    type: 'button',
    actionPermission: { module: 'staff', action: 'ATTENDANCE.LOGS' }
  },
  {
    id: 'staff-leaves',
    routeKey: 'STAFF',
    routePath: '/staff',
    title: '📅 Employee Leave Applications',
    description: 'Review staff leave requests, approve or reject applications, and track leave balances.',
    targetSelector: '[data-tour="staff-tab-leaves"]',
    buttonLabel: 'Employee Leaves Tab',
    type: 'button',
    actionPermission: { module: 'staff', action: 'MANAGE.EMPLOYEELEAVES' }
  },
  {
    id: 'staff-payroll',
    routeKey: 'STAFF',
    routePath: '/staff',
    title: '💰 Payroll & Salary Disbursement',
    description: 'Generate monthly payslips, track salary deductions, and mark payment disbursements.',
    targetSelector: '[data-tour="staff-tab-payroll"]',
    buttonLabel: 'Payroll Tab',
    type: 'button',
    actionPermission: { module: 'staff', action: 'MANAGE.EMPLOYEESALARY' }
  },
  {
    id: 'reports',
    routeKey: 'REPORTS',
    routePath: '/reports',
    title: '📈 Sales & Financial Reports',
    description: 'Generate detailed revenue breakdowns, tax/GST reports, staff performance analytics, and export to Excel or PDF.',
    targetSelector: '[data-tour="sidebar-reports"]',
    buttonLabel: 'Reports',
    type: 'page'
  },
  {
    id: 'settings',
    routeKey: 'SETTINGS',
    routePath: '/settings',
    title: '⚙️ System Settings',
    description: 'Configure general business rules, receipt print settings, tax rates, delivery integrations, and custom role permissions.',
    targetSelector: '[data-tour="sidebar-settings"]',
    buttonLabel: 'Settings',
    type: 'page'
  }
];

export const TutorialProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { can, canModule } = usePermission();

  const [tutorialData, setTutorialData] = useState(null);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to test route key access
  const checkRoutePermission = useCallback((routeKey) => {
    if (!routeKey || routeKey === 'DASHBOARD') return true;
    const r = ROUTE_ACCESS[routeKey];
    if (!r) return true;
    if (r.action != null && r.action !== undefined) {
      return can(r.module, r.action);
    }
    return canModule(r.module);
  }, [can, canModule]);

  // Compute tour steps based on allowed user permissions
  const activeSteps = useMemo(() => {
    return ALL_TUTORIAL_STEPS.filter(step => {
      if (step.id === 'welcome') return true;
      const hasRouteAccess = checkRoutePermission(step.routeKey);
      if (!hasRouteAccess) return false;
      if (step.actionPermission) {
        return can(step.actionPermission.module, step.actionPermission.action);
      }
      return true;
    });
  }, [checkRoutePermission, can]);

  // Fetch tutorial status on load when user is logged in
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await userTutorialService.getTutorialStatus();
        if (data) {
          setTutorialData(data);
          // If first login and not completed/skipped, launch tour automatically
          if (data.firstLogin && !data.tutorialCompleted && !data.skipped) {
            setIsTourActive(true);
            setCurrentStepIndex(0);
          }
        }
      } catch (err) {
        console.error('Failed to initialize tutorial context:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [user]);

  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];

  // Navigate to step route if needed
  useEffect(() => {
    if (isTourActive && currentStep && currentStep.routePath) {
      if (!location.pathname.endsWith(currentStep.routePath)) {
        navigate(currentStep.routePath);
      }
    }
  }, [isTourActive, currentStepIndex, currentStep, location.pathname, navigate]);

  const nextStep = async () => {
    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      await finishTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const skipTour = async () => {
    setIsTourActive(false);
    try {
      const updated = await userTutorialService.updateTutorialStatus({
        firstLogin: false,
        skipped: true,
        tutorialCompleted: false
      });
      if (updated) setTutorialData(updated);
    } catch (err) {
      console.error('Failed to update skip tour status:', err);
    }
  };

  const finishTour = async () => {
    setIsTourActive(false);
    try {
      const updated = await userTutorialService.updateTutorialStatus({
        firstLogin: false,
        tutorialCompleted: true,
        skipped: false
      });
      if (updated) setTutorialData(updated);
    } catch (err) {
      console.error('Failed to update finish tour status:', err);
    }
  };

  const restartTour = () => {
    setCurrentStepIndex(0);
    setIsTourActive(true);
    if (activeSteps[0] && activeSteps[0].routePath) {
      navigate(activeSteps[0].routePath);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        isTourActive,
        currentStep,
        currentStepIndex,
        totalSteps: activeSteps.length,
        nextStep,
        prevStep,
        skipTour,
        finishTour,
        restartTour,
        tutorialData,
        isLoading
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
