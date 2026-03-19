import React, { useEffect } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
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
import Staff from "../pages/Staff/Staff";
import StaffDashboard from "../pages/Staff/StaffDashboard";
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
import PlanManagementPage from "../pages/PlanManagement";
import SubscriptionManagementPage from "../pages/SubscriptionManagement/SubscriptionManagement";
import TableManagement from "../pages/TableManagement/TableManagement";
import OwnerDashboard from "../pages/OwnerDashboard/OwnerDashboard";
import Dashboard from "../pages/Dashboard/Dashboard";
import PayInList from "../pages/Dashboard/PayInList";
import PayOutList from "../pages/Dashboard/PayOutList";
import OperatingExpenses from "../pages/Dashboard/OperatingExpenses";

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
  useEffect(() => {
    setView("order");
    setIsTakeaway(true);
  }, [setView, setIsTakeaway]);

  return <div className="h-full">{children}</div>;
};

const WholesaleOrderWrapper = ({ setView, setIsTakeaway, setTakeawayOrder, children }) => {
  useEffect(() => {
    setView("order");
    setIsTakeaway(true);
    setTakeawayOrder((prev) => ({ ...prev, orderType: "WHOLESALE", items: prev?.items || [] }));
  }, [setView, setIsTakeaway, setTakeawayOrder]);

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
    setReservations,
    handleCheckInReservation,
    handleCompleteKOT,
    currentTime,
    menu,
    setMenu,
    salesHistory,
    staffList,
    organization,
    setOrganization,
    branches,
    setBranches,
    inventoryItems,
    setInventoryItems,
    businessTypeData,
    activeBranchId,
  } = props;

  const isWholesale = takeawayOrder?.orderType === "WHOLESALE";
  const isDirectSale = takeawayOrder?.orderType === "DIRECT_SALE";

  const sellStock = businessTypeData?.features?.sellStockItems ?? true;
  const sellManufactured = businessTypeData?.features?.sellManufacturedItems ?? true;
  const sellTrade = businessTypeData?.features?.sellTradeItems ?? false;

  const stockItems = (inventoryItems || []).filter((i) => i.itemType === "STOCK");
  const tradeItems = (inventoryItems || []).filter((i) => i.itemType === "TRADE");
  const manufacturedItems = props.menu || [];

  // Determine what to show in the POS menu
  let filteredMenu = [];
  if (sellStock) filteredMenu = [...filteredMenu, ...stockItems];
  if (sellManufactured) filteredMenu = [...filteredMenu, ...manufacturedItems];
  if (sellTrade) filteredMenu = [...filteredMenu, ...tradeItems];

  // Specific override for Wholesale: usually only stock, 
  // but if superadmin said "only manufactured", then wholesale should show manufactured?
  // Let's stick to the features flags as the primary source.
  if (isWholesale) {
    filteredMenu = stockItems; // Wholesale is traditionally stock
    if (!sellStock && sellManufactured) filteredMenu = manufacturedItems; // Fallback if stock is disabled
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
    setMenu: props.setMenu,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Routes>
        {/* Generic Dashboard Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <Dashboard hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pay-in"
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <PayInList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/pay-out"
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <PayOutList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/operating-expenses"
          element={
            <ProtectedRoute routeKey="DASHBOARD">
              <OperatingExpenses />
            </ProtectedRoute>
          }
        />

        {/* New specific route for dining hall */}
        <Route
          path="/dininghall"
          element={
            <ProtectedRoute routeKey="DINING">
              <DiningHall
                tables={props.tables}
                categories={props.categories}
                loading={props.diningLoading}
                reservations={props.reservations}
                currentUser={props.currentUser}
                getTableDuration={props.getTableDuration}
                formatCurrency={props.formatCurrency}
                calculateTotal={props.calculateTotal}
                setIsTakeaway={props.setIsTakeaway}
                setTakeawayOrder={props.setTakeawayOrder}
                setView={props.setView}
                setOrderSearch={props.setOrderSearch}
                setActiveTableId={props.setActiveTableId}
                joinTables={props.joinTables}
                refreshData={props.refreshData}
              />
            </ProtectedRoute>
          }
        />

        {/* Route for specific table order */}
        <Route
          path="/dininghall/table/:tableId"
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
          path="/takeaway"
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
          path="/wholesale"
          element={
            <ProtectedRoute routeKey="WHOLESALE">
              <WholesaleOrderWrapper
                setView={setView}
                setIsTakeaway={setIsTakeaway}
                setTakeawayOrder={props.setTakeawayOrder}
              >
                <TakeawayOrder {...orderProps} />
              </WholesaleOrderWrapper>
            </ProtectedRoute>
          }
        />


        {/* Online Orders Route */}
        <Route
          path="/online-orders"
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
          path="/reservations"
          element={
            <ProtectedRoute routeKey="RESERVATIONS">
              <Reservations
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations/new"
          element={
            <ProtectedRoute routeKey="RESERVATIONS">
              <ReservationForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservations/edit/:id"
          element={
            <ProtectedRoute routeKey="RESERVATIONS">
              <ReservationForm />
            </ProtectedRoute>
          }
        />

        {/* KDS Route */}
        <Route
          path="/kds"
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
          path="/inventory"
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
          path="/inventory/new"
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
          path="/inventory/edit/:id"
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
          path="/reports"
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

        {/* Settings Route */}
        <Route
          path="/settings"
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
          path="/organization"
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
          path="/offers"
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
          path="/offers/new"
          element={
            <ProtectedRoute routeKey="OFFERS">
              <OfferForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/offers/edit/:id"
          element={
            <ProtectedRoute routeKey="OFFERS">
              <OfferForm />
            </ProtectedRoute>
          }
        />

        {/* Staff Route */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute routeKey="STAFF">
              <Staff
                staffList={staffList}
                setStaffList={props.setStaffList}
                rolesList={props.rolesList}
                setRolesList={props.setRolesList}
                hasPermission={hasPermission || props.hasPermission}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff-dashboard"
          element={
            <ProtectedRoute routeKey="STAFF_DASHBOARD">
              <StaffDashboard />
            </ProtectedRoute>
          }
        />

        {/* Suppliers Route (standalone) */}
        <Route
          path="/suppliers"
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
          path="/parties"
          element={
            <ProtectedRoute routeKey="PARTIES">
              <Parties hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />

        {/* Service Routes */}
        <Route
          path="/service"
          element={
            <ProtectedRoute routeKey="SERVICE">
              <ServiceList
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/service/new"
          element={
            <ProtectedRoute routeKey="SERVICE">
              <ServiceCreate
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/service/:id"
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
          path="/purchases"
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchaseList
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/new"
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/edit/:id"
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/:id"
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchasePage />
            </ProtectedRoute>
          }
        />

        {/* Business Types (SuperAdmin Only) */}
        <Route
          path="/business-types"
          element={
            <ProtectedRoute routeKey="BUSINESS_TYPES">
              <BusinessTypesPage hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />

        {/* Shop Management (SuperAdmin Only) */}
        <Route
          path="/shop-management"
          element={
            <ProtectedRoute routeKey="SHOP_MANAGEMENT">
              <ShopManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Plan Management (SuperAdmin Only) */}
        <Route
          path="/plan-management"
          element={
            <ProtectedRoute routeKey="PLAN_MANAGEMENT">
              <PlanManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Subscription Management (SuperAdmin Only) */}
        <Route
          path="/subscription-management"
          element={
            <ProtectedRoute routeKey="SUBSCRIPTION_MANAGEMENT">
              <SubscriptionManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Table Management Route */}
        <Route
          path="/table-management"
          element={
            <ProtectedRoute routeKey="TABLE_MANAGEMENT">
              <TableManagement hasPermissionFor={hasPermissionFor || props.hasPermissionFor} />
            </ProtectedRoute>
          }
        />

        {/* Owner Dashboard Route (Keep direct url access optional, though it'll be part of unified dashboard) */}
        <Route
          path="/owner-dashboard"
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
              {view === "table-management" && (
                <Navigate to="/table-management" replace />
              )}
              {view === "offers" && (
                <Navigate to="/offers" replace />
              )}
              {view === "owner-dashboard" && (
                <Navigate to="/owner-dashboard" replace />
              )}
              {view !== "dashboard" && view !== "tables" && view !== "order" && view !== "online-orders" && view !== "reservations" && view !== "kds" && view !== "inventory" && view !== "reports" && view !== "organization" && view !== "suppliers" && view !== "parties" && view !== "service" && view !== "purchases" && view !== "business-types" && view !== "shop-management" && view !== "plan-management" && view !== "table-management" && view !== "owner-dashboard" && view !== "offers" && props.children}
            </>
          }
        />
      </Routes>
    </div >
  );
};

export default AppRoutes;
