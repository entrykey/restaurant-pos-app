import React, { useEffect } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
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
          }
        />

        {/* Route for specific table order */}
        <Route
          path="/dininghall/table/:tableId"
          element={
            <TableOrderWrapper
              setActiveTableId={setActiveTableId}
              setView={setView}
              setIsTakeaway={setIsTakeaway}
            >
              <TakeawayOrder {...orderProps} />
            </TableOrderWrapper>
          }
        />

        {/* Route for takeaway order */}
        <Route
          path="/takeaway"
          element={
            <TakeawayOrderWrapper
              setView={setView}
              setIsTakeaway={setIsTakeaway}
            >
              <TakeawayOrder {...orderProps} />
            </TakeawayOrderWrapper>
          }
        />

        {/* Online Orders Route */}
        <Route
          path="/online-orders"
          element={
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
          }
        />

        {/* Reservations Route */}
        <Route
          path="/reservations"
          element={
            <Reservations
              reservations={reservations}
              setReservations={setReservations}
              handleCheckInReservation={handleCheckInReservation}
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* KDS Route */}
        <Route
          path="/kds"
          element={
            <KDS
              tables={tables}
              onlineOrders={onlineOrders}
              handleCompleteKOT={handleCompleteKOT}
              handleCompleteOnlineKOT={handleCompleteOnlineKOT}
              currentTime={currentTime}
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* Inventory Route */}
        <Route
          path="/inventory"
          element={
            <Inventory
              menu={menu}
              setMenu={setMenu}
              inventoryItems={inventoryItems}
              setInventoryItems={setInventoryItems}
              formatCurrency={formatCurrency}
              settings={settings}
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* Reports Route */}
        <Route
          path="/reports"
          element={
            <Reports
              salesHistory={salesHistory}
              staffList={staffList}
              tables={tables}
              onlineOrders={onlineOrders}
              settings={settings}
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* Settings Route */}
        <Route
          path="/settings"
          element={
            <Settings
              settings={settings}
              setSettings={props.setSettings}
              tables={tables}
              setTables={props.setTables}
              authLogs={props.authLogs}
              hasPermission={hasPermission || props.hasPermission}
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* Organization Route */}
        <Route
          path="/organization"
          element={
            <Organization
              organization={organization}
              setOrganization={setOrganization}
              branches={branches}
              setBranches={setBranches}
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* Staff Route */}
        <Route
          path="/staff"
          element={
            <Staff
              staffList={staffList}
              setStaffList={props.setStaffList}
              rolesList={props.rolesList}
              setRolesList={props.setRolesList}
              hasPermission={hasPermission || props.hasPermission}
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* Suppliers Route */}
        <Route
          path="/suppliers"
          element={
            <Supplier
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />

        {/* Service Routes */}
        <Route
          path="/service"
          element={
            <ServiceList
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />
        <Route
          path="/service/new"
          element={
            <ServiceCreate
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
          }
        />
        <Route
          path="/service/:id"
          element={
            <ServiceDetails
              hasPermissionFor={hasPermissionFor || props.hasPermissionFor}
            />
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
              {view !== "tables" && view !== "order" && view !== "online-orders" && view !== "reservations" && view !== "kds" && view !== "inventory" && view !== "reports" && view !== "organization" && view !== "suppliers" && view !== "service" && props.children}
            </>
          }
        />
      </Routes>
    </div>
  );
};

export default AppRoutes;
