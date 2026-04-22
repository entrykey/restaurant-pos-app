import React, { useEffect, useState } from "react";
import { usePermission } from "../../auth/usePermission";
import { MODULES } from "../../config/permissionStructure";
import { ACTIONS } from "../../constants/actions";
import { ShoppingBag, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableCard from "../../components/TableCard";
import { useTheme } from "../../context/ThemeContext";
import { diningHallService } from "./DiningHallService";
import CommonDialog from "../../components/modals/CommonDialog";
import { toast } from "react-hot-toast";

const DiningHall = ({
  tables: propsTables,
  categories,
  loading,
  reservations = [],
  currentUser,
  getTableDuration,
  formatCurrency,
  calculateTotal,
  setIsTakeaway,
  setTakeawayOrder,
  setView,
  setOrderSearch,
  setActiveTableId,
  joinTables,
  refreshData,
}) => {
  const { theme, themeName } = useTheme();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  // Modal State
  const [dialogConfig, setDialogConfig] = useState({ 
    isOpen: false, 
    title: "", 
    message: "", 
    type: "confirm", 
    onConfirm: () => {}, 
    confirmText: "Yes" 
  });

  const closeDialog = () => setDialogConfig(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (refreshData) {
      refreshData();
    }
  }, [refreshData]);

  const today = new Date().toISOString().split("T")[0];
  const isAdmin = currentUser?.role === "Admin";

  // Filter tables by selected category
  const filteredTables = selectedCategoryId
    ? propsTables.filter(t => t.diningCategoryId?._id === selectedCategoryId || t.diningCategoryId === selectedCategoryId)
    : propsTables;

  // Join Table Logic
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);

  const toggleJoinMode = () => {
    setIsJoinMode(!isJoinMode);
    setSelectedTables([]);
  };

  const handleTableSelect = (table) => {
    if (isJoinMode) {
      if (selectedTables.includes(table.id)) {
        setSelectedTables(selectedTables.filter(id => id !== table.id));
      } else {
        setSelectedTables([...selectedTables, table.id]);
      }
    } else {
      // Normal Navigation Logic
      if (table.parentTableId) {
        // Redirect to parent table if this is a child
        setActiveTableId(table.parentTableId);
        setView("order");
        setOrderSearch("");
        navigate(`/dininghall/table/${table.parentTableId}`);
      } else {
        setIsTakeaway(false);
        setActiveTableId(table.id);
        setView("order");
        setOrderSearch("");
        navigate(`/dininghall/table/${table.id}`);
      }
    }
  };

  const handleConfirmJoin = () => {
    if (selectedTables.length < 2) {
      alert("Please select at least 2 tables to join.");
      return;
    }
    joinTables(selectedTables);
    setIsJoinMode(false);
    setSelectedTables([]);
  };

  const handleMarkArrived = (reservation) => {
    setDialogConfig({
      isOpen: true,
      title: "Guest Arrival",
      message: `Has the reserved customer "${reservation.customerId?.name || 'Guest'}" arrived for Table ${reservation.tableId?.tableNumber}?`,
      type: "confirm",
      confirmText: "Yes, Seated",
      cancelText: "No",
      onConfirm: async () => {
        try {
          await diningHallService.markArrived(reservation._id);
          toast.success("Guest marked as arrived!");
          if (refreshData) refreshData();
        } catch (error) {
          toast.error("Failed to update status.");
        }
      }
    });
  };

  const handleCancelReservation = (reservation) => {
    setDialogConfig({
      isOpen: true,
      title: "Cancel Reservation",
      message: `Are you sure you want to cancel the reservation for "${reservation.customerId?.name || 'Guest'}"?`,
      type: "confirm",
      confirmText: "Yes, Cancel",
      cancelText: "Go to Reservations",
      onConfirm: async () => {
        try {
          await diningHallService.cancelReservation(reservation._id);
          toast.success("Reservation cancelled.");
          if (refreshData) refreshData();
        } catch (error) {
          toast.error("Failed to cancel reservation.");
        }
      },
      onCancel: () => {
        navigate("/reservations");
      }
    });
  };

  return (
    <div className={`p-4 md:p-8 h-full overflow-y-auto ${theme.pageBg}`}>
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <h2 className={`text-2xl md:text-4xl font-black ${theme.textHeading} flex items-center`}>
          <Users className="mr-3 text-indigo-600" /> Dining Hall
        </h2>

        <div className="flex gap-4">
          {can(MODULES.POS, ACTIONS.POS_DINING_JOINTABLES) && (isJoinMode ? (
            <>
              <button
                onClick={toggleJoinMode}
                className={`${theme.surfaceBg} ${theme.textPrimary} border ${theme.borderLight} px-4 py-2 rounded-2xl font-bold transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                className="bg-green-600 text-white px-4 py-2 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                Confirm Join ({selectedTables.length})
              </button>
            </>
          ) : (
            <button
              onClick={toggleJoinMode}
              className={`${theme.surfaceBg} border-2 ${theme.borderLight} ${theme.linkText} px-4 py-2 rounded-2xl font-bold ${theme.sidebarItemHoverBg} transition-colors`}
            >
              Join Tables
            </button>
          ))}

          {can(MODULES.POS, ACTIONS.POS_DINING_TAKEAWAY) && (
            <button
              onClick={() => {
                setIsTakeaway(true);
                setTakeawayOrder({ items: [], isSentToKOT: false });
                setView("order");
                setOrderSearch("");
                navigate("/takeaway");
              }}
              className="bg-indigo-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg text-sm md:text-base"
            >
              <ShoppingBag size={20} /> Takeaway
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Category Tabs */}
      <div className="mb-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {loading ? (
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`${theme.inputBg} w-32 h-10 rounded-xl animate-pulse`} />
            ))}
          </div>
        ) : (
          categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategoryId(cat._id)}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 shadow-sm border ${selectedCategoryId === cat._id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200"
                : `${theme.surfaceBg} ${theme.textPrimary} ${theme.borderLight} hover:border-indigo-400 ${theme.sidebarItemHoverBg}`
                }`}
            >
              {cat.name} ({propsTables.filter(t => t.diningCategoryId?._id === cat._id || t.diningCategoryId === cat._id).length})
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-8">
        {(() => {
          const renderedTableIds = new Set();
          const processedMergeGroups = new Set();

          return filteredTables.map((t) => {
            if (renderedTableIds.has(t.id)) return null;

            let displayTable = { ...t };

            if (t.activeMerge) {
              const primaryId = String(t.activeMerge.primaryTableId);
              if (processedMergeGroups.has(primaryId)) return null;
              processedMergeGroups.add(primaryId);

              const mergeGroup = filteredTables.filter(ft =>
                String(ft.id) === primaryId ||
                (ft.activeMerge && String(ft.activeMerge.primaryTableId) === primaryId)
              );

              // Mark all tables in this merge as "rendered"
              mergeGroup.forEach(mt => renderedTableIds.add(mt.id));

              // Find the primary table or use the first one available
              const primaryTable = mergeGroup.find(mt => String(mt.id) === primaryId) || mergeGroup[0];

              displayTable = { ...primaryTable };
              displayTable.isCombined = true;
              displayTable.name = mergeGroup.map(mt => mt.tableNumber).join(' + ');
              displayTable.capacity = mergeGroup.reduce((acc, mt) => acc + (mt.capacity || 0), 0);

              // Aggregate status and order
              const tableWithOrder = mergeGroup.find(mt => mt.order);
              displayTable.order = tableWithOrder ? tableWithOrder.order : null;
              displayTable.status = mergeGroup.some(mt => mt.status === 'occupied') ? 'occupied' : primaryTable.status;
              displayTable.startTime = tableWithOrder ? tableWithOrder.order?.kotSentAt : primaryTable.startTime;
            } else {
              renderedTableIds.add(t.id);
            }

            const duration = getTableDuration(displayTable.startTime);
            const hasReservation = reservations.find(
              (r) =>
                String(r.tableId) === String(displayTable.id) &&
                r.date === today &&
                r.status === "CONFIRMED"
            );

            const tableForCard = {
              ...displayTable,
              isSelectionMode: isJoinMode,
              isSelected: selectedTables.includes(displayTable.id)
            };

            return (
              <TableCard
                key={displayTable.id}
                table={tableForCard}
                duration={duration}
                hasReservation={hasReservation}
                isAdmin={isAdmin}
                totalLabel={
                  displayTable.order ? formatCurrency(calculateTotal(displayTable.order)) : null
                }
                onSelect={handleTableSelect}
                onMarkArrived={handleMarkArrived}
                onCancelReservation={handleCancelReservation}
              />
            );
          });
        })()}
      </div>

      <CommonDialog 
        {...dialogConfig}
        onClose={closeDialog}
      />
    </div>
  );
};

export default DiningHall;

