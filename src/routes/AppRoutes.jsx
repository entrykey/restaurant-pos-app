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
import KDS from "../pages/KDS/KDS";
import Inventory from "../pages/Inventory/Inventory";
import Reports from "../pages/Reports/Reports";
import Settings from "../pages/Settings/Settings";
import Staff from "../pages/Staff/Staff";
import Organization from "../pages/Organization/Organization";

import Supplier from "../pages/Suppliers/Supplier";
import ServiceList from "../pages/Service/ServiceList";
import ServiceCreate from "../pages/Service/ServiceCreate";
import ServiceDetails from "../pages/Service/ServiceDetails";

import PurchaseList from "../pages/Purchases/PurchaseList";
import PurchaseForm from "../pages/Purchases/PurchaseForm";

const TableOrderWrapper = ({ setActiveTableId, setView, setIsTakeaway, children }) => {
  const { tableId } = useParams();
  useEffect(() => {
    if (tableId) {
      setActiveTableId(Number(tableId));
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
  };

  return (
    <div className="flex-1 overflow-hidden">
      <Routes>
        {/* New specific route for dining hall */}
        <Route
          path="/dininghall"
          element={
            <ProtectedRoute routeKey="DINING">
              <DiningHall
                tables={tables}
                reservations={reservations}
                currentUser={props.currentUser}
                getTableDuration={getTableDuration}
                formatCurrency={formatCurrency}
                calculateTotal={calculateTotal}
                setIsTakeaway={setIsTakeaway}
                setTakeawayOrder={setTakeawayOrder}
                setView={setView}
                setOrderSearch={setOrderSearch}
                setActiveTableId={setActiveTableId}
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

        {/* Route for takeaway order */}
        <Route
          path="/takeaway"
          element={
            <ProtectedRoute routeKey="TAKEAWAY">
              <TakeawayOrderWrapper
                setView={setView}
                setIsTakeaway={setIsTakeaway}
              >
                <TakeawayOrder {...orderProps} />
              </TakeawayOrderWrapper>
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
                reservations={reservations}
                setReservations={setReservations}
                handleCheckInReservation={handleCheckInReservation}
                hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
              />
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
              <PurchaseForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/edit/:id"
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchaseForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/:id"
          element={
            <ProtectedRoute routeKey="PURCHASES">
              <PurchaseForm />
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
                <Navigate to="/takeaway" replace />
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
              {view !== "tables" && view !== "order" && view !== "online-orders" && view !== "reservations" && view !== "kds" && view !== "inventory" && view !== "reports" && view !== "organization" && view !== "suppliers" && view !== "service" && view !== "purchases" && props.children}
            </>
          }
        />
      </Routes>
    </div>
  );
};

export default AppRoutes;
