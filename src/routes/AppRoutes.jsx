import React, { useEffect, lazy, Suspense } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { useTakeaway } from "../pages/Takeaway/TakeawayContext";
import {
  ORGANIZATION_PERMISSION_KEYS,
  MODULES,
  ACTIONS,
  buildPermissionKey,
} from "../config/permissionStructure";
import DiningHall from "../pages/DiningHall/DiningHall";
import TakeawayOrder from "../pages/Takeaway/TakeawayOrder";
import OnlineOrders from "../pages/OnlineOrders/OnlineOrders";
import Reservations from "../pages/Reservations/Reservations";
import ReservationForm from "../pages/Reservations/ReservationForm";
import KDS from "../pages/KDS/KDS";
import Inventory from "../pages/Inventory/Inventory";
import ProductPage from "../pages/Inventory/ProductPage";
import Reports from "../pages/Reports/Reports";
import Settings from "../pages/Settings/Settings";
import StaffDashboard from "../pages/Staff/StaffDashboard";
import MyAttendance from "../pages/Staff/MyAttendance";
import MyLeaves from "../pages/Staff/MyLeaves";
import Organization from "../pages/Organization/Organization";
import OfferList from "../pages/Offers/OfferList";
import OfferForm from "../pages/Offers/OfferForm";

import Supplier from "../pages/Suppliers/Supplier";
import Parties from "../pages/Parties/Parties";
import ServiceList from "../pages/Service/ServiceList";
import ServiceCreate from "../pages/Service/ServiceCreate";
import ServiceDetails from "../pages/Service/ServiceDetails";

import PurchaseList from "../pages/Purchases/PurchaseList";
import PurchasePage from "../pages/Purchases/PurchasePage";
import BusinessTypesPage from "../pages/BusinessTypes/BusinessTypes";
import ShopManagementPage from "../pages/ShopManagement";
import ClientManagementPage from "../pages/ClientManagement/ClientManagement";
import PlanManagementPage from "../pages/PlanManagement";
import SubscriptionManagementPage from "../pages/SubscriptionManagement/SubscriptionManagement";
import TableManagement from "../pages/TableManagement/TableManagement";
import OwnerDashboard from "../pages/OwnerDashboard/OwnerDashboard";
import Dashboard from "../pages/Dashboard/Dashboard";
import PayInList from "../pages/Dashboard/PayInList";
import PayOutList from "../pages/Dashboard/PayOutList";
import OperatingExpenses from "../pages/Dashboard/OperatingExpenses";
import SalesList from "../pages/Dashboard/SalesList";
import SaleMarking from "../pages/Sales/SaleMarking";
import SalePage from "../pages/Sales/SalePage";
import ReturnPage from "../pages/Sales/ReturnPage";


const Staff = lazy(() => import("../pages/Staff/Staff"));
const MySalary = lazy(() => import("../pages/Staff/MySalary"));

const TableOrderWrapper = ({ setActiveTableId, setView, setIsTakeaway, children }) => {
  const { tableId } = useParams();
  useEffect(() => {
    if (tableId) {
      setActiveTableId(tableId);
      setView("order");
      setIsTakeaway(false);
    }
  }, [tableId, setActiveTableId, setView, setIsTakeaway]);

  return <div className="h-full">{children}</div>;
};

const TakeawayOrderWrapper = ({ setView, setIsTakeaway, children }) => {
  const { setTableId } = useTakeaway();
  useEffect(() => {
    setView("order");
    setIsTakeaway(true);
    setTableId(null);
  }, [setView, setIsTakeaway, setTableId]);

  return <div className="h-full">{children}</div>;
};

const WholesaleOrderWrapper = ({ setView, setIsTakeaway, setTakeawayOrder, children }) => {
  const { setTableId } = useTakeaway();
  useEffect(() => {
    setView("order");
    setIsTakeaway(true);
    setTableId(null);
    setTakeawayOrder((prev) => ({ ...prev, orderType: "WHOLESALE", items: prev?.items || [] }));
  }, [setView, setIsTakeaway, setTakeawayOrder, setTableId]);

  return <div className="h-full">{children}</div>;
};

// ---------------------------------------------------------------------------
// Permission keys for backend (use these exact strings when storing/returning permissions)
// ---------------------------------------------------------------------------
export { ORGANIZATION_PERMISSION_KEYS, MODULES, ACTIONS, buildPermissionKey };

const AppRoutes = (props) => {
  const {
    view,
    isTakeaway,
    activeTableId,
    // dependencies
    tables,
    takeawayOrder,
    formatCurrency,
    calculateTotal,
    calculateItemTotal,
    handlePrintReceipt,
    handleSendToKOT,
    setIsPaymentModalOpen,
    setBillingStage,
    initiateAddItem,
    updateItemQuantity,
    updateItemUnit,
    openNoteModal,
    takeawayCustName,
    setTakeawayCustName,
    takeawayCustPhone,
    setTakeawayCustPhone,
    orderSearch,
    setOrderSearch,
    setIsTakeaway,
    setView,
    settings,
    hasPermission,
    hasPermissionFor,
    setActiveTableId,
    reservations,
    getTableDuration,
    setTakeawayOrder,
    currentUser,
    onlineOrders,
    setOnlineOrders,
    onlineOrderTab,
    setOnlineOrderTab,
    pendingOnlineOrdersCount,
    handleAcceptOnlineOrder,
    handleRejectOnlineOrder,
    handleCompleteOnlineKOT,
    setPreviewOrder,
    handleCompleteKOT,
    currentTime,
    menu,
    setMenu,
    staffList,
    organization,
    setOrganization,
    branches,
    setBranches,
    inventoryItems,
    setInventoryItems,
    activeBranchId,
  } = props;

  const isWholesale = takeawayOrder?.orderType === "WHOLESALE";
  const prefix = "/:shopName?";

  // Use props.menu as the primary source of truth for POS items.
  // AppContent handles the hydration and filtering based on business features.
  let filteredMenu = props.menu || [];

  // Specific override for Wholesale: usually only stock
  if (isWholesale) {
    filteredMenu = (inventoryItems || []).filter(i => i.itemType === "STOCK");
  }

  const safeHasPermission = typeof hasPermission === "function" ? hasPermission : (typeof props.hasPermission === "function" ? props.hasPermission : () => false);
  const safeHasPermissionFor = typeof hasPermissionFor === "function" ? hasPermissionFor : (typeof props.hasPermissionFor === "function" ? props.hasPermissionFor : () => false);

  const orderProps = {
    isTakeaway,
    activeTableId,
    tables,
    takeawayOrder,
    formatCurrency,
    calculateTotal,
    calculateItemTotal,
    calculateBillDetails: props.calculateBillDetails,
    offers: props.offers,
    handlePrintReceipt,
    handleSendToKOT,
    setIsPaymentModalOpen,
    setBillingStage,
    initiateAddItem,
    updateItemQuantity,
    updateItemUnit,
    openNoteModal,
    takeawayCustName,
    setTakeawayCustName,
    takeawayCustPhone,
    setTakeawayCustPhone,
    orderSearch,
    setOrderSearch,
    setIsTakeaway,
    setView,
    settings,
    hasPermission: safeHasPermission,
    hasPermissionFor: safeHasPermissionFor,
    currentUser: currentUser || props.currentUser,
    menu: filteredMenu,
    setMenu: props.setMenu
  };

  return (
    <div className="h-full flex-1 flex flex-col">
      <Routes>
        {/* Generic Dashboard Route */}
        <Route
          path={`${prefix}/dashboard`}
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <Dashboard hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/dashboard/sales`}
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <SalesList />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/dashboard/pay-in`}
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <PayInList />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/dashboard/pay-out`}
          element={
            <ProtectedRoute routeKey="PAY_OUT">
              <PayOutList />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/dashboard/operating-expenses`}
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <OperatingExpenses />
            </ProtectedRoute>
          }
        />

        {/* New specific route for dining hall */}
        <Route
          path={`${prefix}/dininghall`}
          element={
            <ProtectedRoute routeKey="DINING">
              <DiningHall
                tables={props.tables}
                categories={props.categories}
                loading={props.diningLoading}
                reservations={reservations}
                currentUser={props.currentUser}
                getTableDuration={getTableDuration}
                formatCurrency={props.formatCurrency}
                calculateTotal={props.calculateTotal}
                setIsTakeaway={props.setIsTakeaway}
                setTakeawayOrder={setTakeawayOrder}
                setView={props.setView}
                setOrderSearch={props.setOrderSearch}
                setActiveTableId={setActiveTableId}
                joinTables={props.joinTables}
                refreshData={props.refreshData}
              />
            </ProtectedRoute>
          }
        />

        {/* Route for specific table order */}
        <Route
          path={`${prefix}/dininghall/table/:tableId`}
          element={
            <ProtectedRoute routeKey="DINING">
              <TableOrderWrapper
                setActiveTableId={setActiveTableId}
                setView={setView}
                setIsTakeaway={setIsTakeaway}
              >
                <TakeawayOrder {...orderProps} />
              </TableOrderWrapper>
            </ProtectedRoute>
          }
        />

        {/* Route for takeaway / direct sale (same screen; heading by orderType) */}
        <Route
          path={`${prefix}/takeaway`}
          element={
            <ProtectedRoute routeKeys={["TAKEAWAY", "DIRECT_SALE"]}>
              <TakeawayOrderWrapper
                setView={setView}
                setIsTakeaway={setIsTakeaway}
              >
                <TakeawayOrder {...orderProps} />
              </TakeawayOrderWrapper>
            </ProtectedRoute>
          }
        />

        {/* Wholesale: same TakeawayOrder UI with stock items only (when shop has pos.wholesale) */}
        <Route
          path={`${prefix}/wholesale`}
          element={
            <ProtectedRoute routeKey="WHOLESALE">
              <WholesaleOrderWrapper
                setView={setView}
                setIsTakeaway={setIsTakeaway}
                setTakeawayOrder={setTakeawayOrder}
              >
                <TakeawayOrder {...orderProps} />
              </WholesaleOrderWrapper>
            </ProtectedRoute>
          }
        />


        {/* Online Orders Route */}
        <Route
          path={`${prefix}/online-orders`}
          element={
            <ProtectedRoute routeKey="ONLINE_ORDERS">
              <OnlineOrders
                onlineOrders={onlineOrders}
                setOnlineOrders={setOnlineOrders}
                onlineOrderTab={onlineOrderTab}
                setOnlineOrderTab={setOnlineOrderTab}
                pendingOnlineOrdersCount={pendingOnlineOrdersCount}
                formatCurrency={formatCurrency}
                handleAcceptOnlineOrder={handleAcceptOnlineOrder}
                handleRejectOnlineOrder={handleRejectOnlineOrder}
                handleCompleteOnlineKOT={handleCompleteOnlineKOT}
                setPreviewOrder={setPreviewOrder}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />

        {/* Reservations Route */}
        <Route
          path={`${prefix}/reservations`}
          element={
            <ProtectedRoute routeKey="RESERVATIONS">
              <Reservations
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/reservations/new`}
          element={
            <ProtectedRoute routeKey="RESERVATIONS">
              <ReservationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/reservations/edit/:id`}
          element={
            <ProtectedRoute routeKey="RESERVATIONS">
              <ReservationForm />
            </ProtectedRoute>
          }
        />

        {/* KDS Route */}
        <Route
          path={`${prefix}/kds`}
          element={
            <ProtectedRoute routeKey="KDS">
              <KDS
                tables={tables}
                onlineOrders={onlineOrders}
                handleCompleteKOT={handleCompleteKOT}
                handleCompleteOnlineKOT={handleCompleteOnlineKOT}
                currentTime={currentTime}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />

        {/* Inventory Route */}
        <Route
          path={`${prefix}/inventory`}
          element={
            <ProtectedRoute routeKey="INVENTORY">
              <Inventory
                menu={menu}
                setMenu={setMenu}
                inventoryItems={inventoryItems}
                setInventoryItems={setInventoryItems}
                formatCurrency={formatCurrency}
                settings={settings}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path={`${prefix}/inventory/new`}
          element={
            <ProtectedRoute routeKey="INVENTORY">
              <ProductPage
                menu={menu}
                setMenu={setMenu}
                inventoryItems={inventoryItems}
                setInventoryItems={setInventoryItems}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/inventory/edit/:id`}
          element={
            <ProtectedRoute routeKey="INVENTORY">
              <ProductPage
                menu={menu}
                setMenu={setMenu}
                inventoryItems={inventoryItems}
                setInventoryItems={setInventoryItems}
              />
            </ProtectedRoute>
          }
        />

        {/* Reports Route */}
        <Route
          path={`${prefix}/reports`}
          element={
            <ProtectedRoute routeKey="REPORTS">
              <Reports
                staffList={staffList}
                tables={tables}
                onlineOrders={onlineOrders}
                settings={settings}
                shopId={currentUser?.shop_id}
                branchId={activeBranchId}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />

        {/* Sale Marking Route */}
        <Route
          path={`${prefix}/sale-marking`}
          element={
            <ProtectedRoute routeKey="SALE_MARKING">
              <SaleMarking />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/sales-history`}
          element={
            <ProtectedRoute routeKey="SALES_HISTORY">
              <SalesList />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/sales/new`}
          element={
            <ProtectedRoute routeKey="SALES_HISTORY">
              <SalePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/sales/return`}
          element={
            <ProtectedRoute routeKey="SALES_HISTORY">
              <ReturnPage />
            </ProtectedRoute>
          }
        />

        {/* Settings Route */}
        <Route
          path={`${prefix}/settings`}
          element={
            <ProtectedRoute routeKey="SETTINGS">
              <Settings
                settings={settings}
                setSettings={props.setSettings}
                tables={tables}
                setTables={props.setTables}
                authLogs={props.authLogs}
                hasPermission={hasPermission || props.hasPermission}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
                currentUser={currentUser}
              />
            </ProtectedRoute>
          }
        />

        {/* Organization Route */}
        <Route
          path={`${prefix}/organization`}
          element={
            <ProtectedRoute routeKey="ORGANIZATION">
              <Organization
                organization={organization}
                setOrganization={setOrganization}
                branches={branches}
                setBranches={setBranches}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />

        {/* Offers Route */}
        <Route
          path={`${prefix}/offers`}
          element={
            <ProtectedRoute routeKey="OFFERS">
              <OfferList
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
                formatCurrency={formatCurrency}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/offers/new`}
          element={
            <ProtectedRoute routeKey="OFFERS">
              <OfferForm />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/offers/edit/:id`}
          element={
            <ProtectedRoute routeKey="OFFERS">
              <OfferForm />
            </ProtectedRoute>
          }
        />

        {/* Staff Route */}
        <Route
          path={`${prefix}/staff`}
          element={
            <ProtectedRoute routeKey="STAFF">
              <Suspense fallback={<div>Loading...</div>}>
                <Staff
                  staffList={staffList}
                  setStaffList={props.setStaffList}
                  rolesList={props.rolesList}
                  setRolesList={props.setRolesList}
                  hasPermission={hasPermission || props.hasPermission}
                  hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
                />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/my-attendance`}
          element={
            <ProtectedRoute routeKey="MYATTENDANCE">
              <MyAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/my-leaves`}
          element={
            <ProtectedRoute routeKey="MYLEAVES">
              <MyLeaves />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/my-salary`}
          element={
            <ProtectedRoute routeKey="MYSALARY">
              <Suspense fallback={<div>Loading...</div>}>
                <MySalary />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/staff-dashboard`}
          element={
            <ProtectedRoute routeKey="STAFF_DASHBOARD">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Suppliers Route (standalone) */}
        <Route
          path={`${prefix}/suppliers`}
          element={
            <ProtectedRoute routeKey="SUPPLIERS">
              <Supplier
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />

        {/* Parties Route (Suppliers + Customers tabs) */}
        <Route
          path={`${prefix}/parties`}
          element={
            <ProtectedRoute routeKey="PARTIES">
              <Parties hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />

        {/* Service Routes */}
        <Route
          path={`${prefix}/service`}
          element={
            <ProtectedRoute routeKey="SERVICE">
              <ServiceList
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/service/new`}
          element={
            <ProtectedRoute routeKey="SERVICE">
              <ServiceCreate
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/service/:id`}
          element={
            <ProtectedRoute routeKey="SERVICE">
              <ServiceDetails
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />

        {/* Purchase Routes */}
        <Route
          path={`${prefix}/purchases`}
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchaseList
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/purchases/new`}
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/purchases/edit/:id`}
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={`${prefix}/purchases/:id`}
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchasePage />
            </ProtectedRoute>
          }
        />

        {/* Business Types (SuperAdmin Only) */}
        <Route
          path={`${prefix}/business-types`}
          element={
            <ProtectedRoute routeKey="BUSINESS_TYPES">
              <BusinessTypesPage hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />

        {/* Shop Management (SuperAdmin Only) */}
        <Route
          path={`${prefix}/shop-management`}
          element={
            <ProtectedRoute routeKey="SHOP_MANAGEMENT">
              <ShopManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Client Management (SuperAdmin Only) */}
        <Route
          path={`${prefix}/client-management`}
          element={
            <ProtectedRoute routeKey="CLIENT_MANAGEMENT">
              <ClientManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Plan Management (SuperAdmin Only) */}
        <Route
          path={`${prefix}/plan-management`}
          element={
            <ProtectedRoute routeKey="PLAN_MANAGEMENT">
              <PlanManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Subscription Management (SuperAdmin Only) */}
        <Route
          path={`${prefix}/subscription-management`}
          element={
            <ProtectedRoute routeKey="SUBSCRIPTION_MANAGEMENT">
              <SubscriptionManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Table Management Route */}
        <Route
          path={`${prefix}/table-management`}
          element={
            <ProtectedRoute routeKey="TABLE_MANAGEMENT">
              <TableManagement hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />

        {/* Owner Dashboard Route (Keep direct url access optional, though it'll be part of unified dashboard) */}
        <Route
          path={`${prefix}/owner-dashboard`}
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Maintain existing view-based logic for other pages for now */}
        <Route
          path="*"
          element={
            <>
              {view === "dashboard" && (
                <Navigate to="/dashboard" replace />
              )}
              {view === "tables" && (
                <Navigate to="/dininghall" replace />
              )}
              {view === "order" && isTakeaway && (
                <Navigate to={takeawayOrder?.orderType === "WHOLESALE" ? "/wholesale" : "/takeaway"} replace />
              )}
              {view === "order" && !isTakeaway && (
                <Navigate to={`/dininghall/table/${activeTableId}`} replace />
              )}
              {view === "online-orders" && (
                <Navigate to="/online-orders" replace />
              )}
              {view === "reservations" && (
                <Navigate to="/reservations" replace />
              )}
              {view === "kds" && (
                <Navigate to="/kds" replace />
              )}
              {view === "inventory" && (
                <Navigate to="/inventory" replace />
              )}
              {view === "reports" && (
                <Navigate to="/reports" replace />
              )}
              {view === "organization" && (
                <Navigate to="/organization" replace />
              )}
              {view === "suppliers" && (
                <Navigate to="/suppliers" replace />
              )}
              {view === "parties" && (
                <Navigate to="/parties" replace />
              )}
              {view === "service" && (
                <Navigate to="/service" replace />
              )}
              {view === "purchases" && (
                <Navigate to="/purchases" replace />
              )}
              {view === "business-types" && (
                <Navigate to="/business-types" replace />
              )}
              {view === "shop-management" && (
                <Navigate to="/shop-management" replace />
              )}
              {view === "plan-management" && (
                <Navigate to="/plan-management" replace />
              )}
              {view === "client-management" && (
                <Navigate to="/client-management" replace />
              )}
              {view === "table-management" && (
                <Navigate to="/table-management" replace />
              )}
              {view === "offers" && (
                <Navigate to="/offers" replace />
              )}
              {view === "owner-dashboard" && (
                <Navigate to="/owner-dashboard" replace />
              )}
              {view === "my-salary" && (
                <Navigate to="/my-salary" replace />
              )}
              {view !== "dashboard" && view !== "tables" && view !== "order" && view !== "online-orders" && view !== "reservations" && view !== "kds" && view !== "inventory" && view !== "reports" && view !== "organization" && view !== "suppliers" && view !== "parties" && view !== "service" && view !== "purchases" && view !== "business-types" && view !== "shop-management" && view !== "client-management" && view !== "plan-management" && view !== "table-management" && view !== "owner-dashboard" && view !== "offers" && props.children}
            </>
          }
        />
      </Routes>
    </div >
  );
};

export default AppRoutes;
