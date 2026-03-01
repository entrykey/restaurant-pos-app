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
import Organization from "../pages/Organization/Organization";

import Supplier from "../pages/Suppliers/Supplier";
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
  } = props;

  const isWholesale = takeawayOrder?.orderType === "WHOLESALE";
  const isDirectSale = takeawayOrder?.orderType === "DIRECT_SALE";
  const stockMenu = (inventoryItems || []).filter((i) => i.itemType === "STOCK");

  const orderProps = {
    isTakeaway,
    activeTableId,
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
    hasPermission: hasPermission || props.hasPermission || (() => false),
    hasPermissionFor: hasPermissionFor || props.hasPermissionFor || (() => false),
    currentUser: currentUser || props.currentUser,
    menu: isWholesale ? stockMenu : (isDirectSale ? [...(props.menu || []), ...stockMenu] : (props.menu || [])),
    setMenu: props.setMenu,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Routes>
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
                salesHistory={salesHistory}
                staffList={staffList}
                tables={tables}
                onlineOrders={onlineOrders}
                settings={settings}
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

        {/* Suppliers Route */}
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

        {/* Maintain existing view-based logic for other pages for now */}
        <Route
          path="*"
          element={
            <>
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
              {view !== "tables" && view !== "order" && view !== "online-orders" && view !== "reservations" && view !== "kds" && view !== "inventory" && view !== "reports" && view !== "organization" && view !== "suppliers" && view !== "service" && view !== "purchases" && view !== "business-types" && view !== "shop-management" && view !== "plan-management" && view !== "table-management" && props.children}
            </>
          }
        />
      </Routes>
    </div>
  );
};

export default AppRoutes;
