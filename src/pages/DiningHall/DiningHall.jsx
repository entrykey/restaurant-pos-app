import React, { useEffect, useState } from "react";
import { usePermission } from "../../auth/usePermission";
import { MODULES } from "../../config/permissionStructure";
import { ACTIONS } from "../../constants/actions";
import { ShoppingBag, Users, Link as LinkIcon, Unlink, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableCard from "../../components/TableCard";
import { useTheme } from "../../context/ThemeContext";
import { diningHallService } from "./DiningHallService";
import { tableMergeService } from "../../services/api";
import CommonDialog from "../../components/modals/CommonDialog";
import { toast } from "react-hot-toast";
import { useTakeaway } from "../Takeaway/TakeawayContext";

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
  const { addTableTab, setTableId, activateSaleTab } = useTakeaway();
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');

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
      setSelectedCategoryId('all');
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (refreshData) {
      refreshData();
    }
  }, []); // Refresh every time we enter the Dining Hall component

  const today = new Date().toISOString().split("T")[0];
  const isAdmin = currentUser?.role === "Admin";

  // Natural alphanumeric sort for table numbers (e.g. Table T1, Table T2, Table T10)
  const naturalTableCompare = (tA, tB) => {
    const numA = (tA.tableNumber || tA.name || '').toString();
    const numB = (tB.tableNumber || tB.name || '').toString();
    return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
  };

  // Group tables by category in the exact order of categories array
  const orderedCategoryGroups = (categories || []).map((cat) => {
    const catIdStr = String(cat._id || cat.id);
    const catTables = (propsTables || [])
      .filter((t) => {
        const tCatId = t.diningCategoryId?._id || t.diningCategoryId?.id || t.diningCategoryId;
        return tCatId && String(tCatId) === catIdStr;
      })
      .sort(naturalTableCompare);

    return {
      category: cat,
      categoryName: cat.name,
      tables: catTables,
    };
  }).filter((group) => group.tables.length > 0);

  // Collect any tables without an assigned or recognized category
  const uncategorizedTables = (propsTables || [])
    .filter((t) => {
      const tCatId = t.diningCategoryId?._id || t.diningCategoryId?.id || t.diningCategoryId;
      return !tCatId || !(categories || []).some((c) => String(c._id || c.id) === String(tCatId));
    })
    .sort(naturalTableCompare);

  if (uncategorizedTables.length > 0) {
    orderedCategoryGroups.push({
      category: { _id: "other", name: "Other Tables" },
      categoryName: "Other Tables",
      tables: uncategorizedTables,
    });
  }

  // Tables when a single category tab is selected
  const singleCategoryTables = selectedCategoryId && selectedCategoryId !== 'all'
    ? (propsTables || [])
        .filter((t) => {
          const tCatId = t.diningCategoryId?._id || t.diningCategoryId?.id || t.diningCategoryId;
          return String(tCatId) === String(selectedCategoryId);
        })
        .sort(naturalTableCompare)
    : [];

  // Safely extract the primary table ID / merge group identifier from a table's activeMerge
  const getTableMergeGroupId = (table) => {
    if (!table || !table.activeMerge) return null;
    const am = table.activeMerge;
    if (am.mergeId) return String(am.mergeId);
    if (am._id) return String(am._id);
    if (typeof am === 'string') return am;
    const pt = am.primaryTableId;
    if (pt) {
      if (typeof pt === 'object') return String(pt._id || pt.id || '');
      return String(pt);
    }
    return null;
  };

  // Check if two tables belong to the exact same active merge group
  const isTableInMergeGroup = (table, groupPrimaryId, groupTable) => {
    if (!table || !groupPrimaryId) return false;
    const tid = String(table.id || table._id);
    const tGroupId = getTableMergeGroupId(table);
    if (tGroupId && tGroupId === groupPrimaryId) return true;
    if (tid === groupPrimaryId) return true;

    // Check mergedTables array if present
    const groupMergedTables = (groupTable?.activeMerge?.mergedTables || []).map((m) =>
      String(m?._id || m?.id || m)
    );
    if (groupMergedTables.includes(tid)) return true;

    const tableMergedTables = (table?.activeMerge?.mergedTables || []).map((m) =>
      String(m?._id || m?.id || m)
    );
    if (tableMergedTables.includes(groupPrimaryId)) return true;

    return false;
  };

  // Helper to render an individual TableCard with merge support
  const renderTableCard = (t, renderedTableIds, processedMergeGroups, allTablesList) => {
    if (renderedTableIds.has(t.id)) return null;

    let displayTable = { ...t };
    const mergeGroupId = getTableMergeGroupId(t);

    if (mergeGroupId) {
      if (processedMergeGroups.has(mergeGroupId)) return null;
      processedMergeGroups.add(mergeGroupId);

      const mergeGroup = allTablesList.filter((ft) =>
        isTableInMergeGroup(ft, mergeGroupId, t)
      );

      mergeGroup.forEach((mt) => renderedTableIds.add(mt.id));

      const primaryTable =
        mergeGroup.find((mt) => {
          const mid = String(mt.id || mt._id);
          return (
            mid === mergeGroupId ||
            (mt.activeMerge &&
              (mt.activeMerge.isPrimary ||
                String(mt.activeMerge.primaryTableId?._id || mt.activeMerge.primaryTableId) === mid))
          );
        }) || mergeGroup[0];

      displayTable = { ...primaryTable };
      displayTable.isCombined = true;
      displayTable.mergedTableIds = mergeGroup.map((mt) => mt.id);
      displayTable.name = mergeGroup.map((mt) => mt.tableNumber).join(" + ");
      displayTable.capacity = mergeGroup.reduce((acc, mt) => acc + (mt.capacity || 0), 0);

      const tableWithOrder = mergeGroup.find((mt) => mt.order);
      displayTable.order = tableWithOrder ? tableWithOrder.order : null;
      displayTable.status = mergeGroup.some((mt) => mt.status === "occupied")
        ? "occupied"
        : primaryTable.status;
      displayTable.startTime = tableWithOrder ? tableWithOrder.order?.kotSentAt : primaryTable.startTime;
    } else {
      renderedTableIds.add(t.id);
    }

    const duration = getTableDuration(displayTable.startTime ?? displayTable.order?.kotSentAt);
    const hasReservation = reservations.find(
      (r) =>
        String(r.tableId) === String(displayTable.id) &&
        r.date === today &&
        r.status === "CONFIRMED"
    );

    const tableForCard = {
      ...displayTable,
      isSelectionMode: isJoinMode,
      isSelected: selectedTables.includes(displayTable.id),
    };

    return (
      <TableCard
        key={displayTable.id}
        table={tableForCard}
        duration={duration}
        hasReservation={hasReservation}
        isAdmin={isAdmin}
        totalLabel={
          displayTable.order
            ? formatCurrency(
                displayTable.order.grandTotal != null
                  ? displayTable.order.grandTotal
                  : calculateTotal(displayTable.order)
              )
            : null
        }
        onSelect={handleTableSelect}
        onMarkArrived={handleMarkArrived}
        onCancelReservation={handleCancelReservation}
        onContextMenu={handleTableContextMenu}
      />
    );
  };

  // Join Table Logic
  const [isJoinMode, setIsJoinMode] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, table }

  const handleTableContextMenu = (e, table) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 230;
    const menuHeight = 180;
    const x = Math.min(e.clientX, Math.max(10, window.innerWidth - menuWidth - 16));
    const y = Math.min(e.clientY, Math.max(10, window.innerHeight - menuHeight - 16));
    setContextMenu({ x, y, table });
  };

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    if (contextMenu) {
      window.addEventListener("click", handleCloseMenu);
      window.addEventListener("contextmenu", handleCloseMenu);
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("click", handleCloseMenu);
        window.removeEventListener("contextmenu", handleCloseMenu);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [contextMenu]);

  const handleStartJoinFromContext = (table) => {
    setContextMenu(null);
    setIsJoinMode(true);
    setSelectedTables([table.id]);
    toast.success(`Selected ${table.name}. Click another table to merge.`, { icon: '🔗' });
  };

  const handleMergeDirectlyFromContext = (targetTable) => {
    setContextMenu(null);
    const combined = Array.from(new Set([...selectedTables, targetTable.id]));
    setSelectedTables(combined);
    handleConfirmJoin(combined);
  };

  const handleUnmergeTable = async (table) => {
    try {
      const primaryId = table.id || table._id;
      await tableMergeService.unmergeTables({ primaryTableId: primaryId });
      toast.success(`Table ${table.name || ''} separated successfully`);
      if (refreshData) refreshData();
    } catch (err) {
      console.error("Unmerge error:", err);
      toast.error("Failed to unmerge tables: " + (err?.message || "Unknown error"));
    }
  };

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
      const tableName = table.tableNumber ? `Table ${table.tableNumber}` : table.name || "Table";
      
      if (table.parentTableId) {
        // Redirect to parent table if this is a child
        const parentTable = propsTables.find(pt => pt.id === table.parentTableId);
        const pName = parentTable?.tableNumber ? `Table ${parentTable.tableNumber}` : "Combined Table";
        addTableTab(table.parentTableId, pName);
        setView("order");
        setOrderSearch("");
        refreshData?.();
        navigate(`/dininghall/table/${table.parentTableId}`);
      } else {
        addTableTab(table.id, tableName);
        setView("order");
        setOrderSearch("");
        refreshData?.();
        navigate(`/dininghall/table/${table.id}`);
      }
    }
  };

  const handleConfirmJoin = (explicitList) => {
    const listToProcess = Array.isArray(explicitList) ? explicitList : selectedTables;
    if (listToProcess.length < 2) {
      alert("Please select at least 2 tables to join.");
      return;
    }

    // Expand selected tables:
    // If the user selects a combined/joined table card and another table,
    // all tables in that joined card + the other table will be joined together.
    // If the user selects separate unjoined tables, only those tables will be joined.
    const expandedTableIds = new Set();
    listToProcess.forEach((selectedId) => {
      const foundTable = propsTables.find((t) => String(t.id) === String(selectedId));
      if (!foundTable) {
        expandedTableIds.add(selectedId);
        return;
      }

      const groupId = getTableMergeGroupId(foundTable);
      if (groupId) {
        // Expand to all tables in this merge group
        const groupMembers = propsTables.filter((ft) => isTableInMergeGroup(ft, groupId, foundTable));
        groupMembers.forEach((mt) => expandedTableIds.add(mt.id));
      } else {
        expandedTableIds.add(foundTable.id);
      }
    });

    const finalTableIds = Array.from(expandedTableIds);
    if (finalTableIds.length < 2) {
      alert("Please select at least 2 tables to join.");
      return;
    }

    joinTables(finalTableIds);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-6 md:mb-10">
        <h2 className={`text-2xl md:text-4xl font-black ${theme.textHeading} flex items-center`}>
          <Users className="mr-3 text-indigo-600" /> Dining Hall
        </h2>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {can(MODULES.POS, ACTIONS.POS_DINING_JOINTABLES) && (isJoinMode ? (
            <>
              <button
                onClick={toggleJoinMode}
                className={`${theme.surfaceBg} ${theme.textPrimary} border ${theme.borderLight} px-4 py-2 rounded-2xl font-bold transition-colors flex-1 md:flex-none text-center`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                className="bg-green-600 text-white px-4 py-2 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 flex-[2] md:flex-none"
              >
                Confirm Join ({selectedTables.length})
              </button>
            </>
          ) : (
            <button
              onClick={toggleJoinMode}
              data-tour="dining-jointables"
              className={`${theme.surfaceBg} border-2 ${theme.borderLight} ${theme.linkText} px-4 py-2 rounded-2xl font-bold ${theme.sidebarItemHoverBg} transition-colors flex-1 md:flex-none text-center`}
            >
              Join Tables
            </button>
          ))}

          {can(MODULES.POS, ACTIONS.POS_DINING_TAKEAWAY) && (
            <button
              onClick={() => {
                setTableId(null);
                activateSaleTab("TAKEAWAY");
                setIsTakeaway(true);
                setView("order");
                setOrderSearch("");
                navigate("/takeaway");
              }}
              className="bg-indigo-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg text-sm md:text-base flex-1 md:flex-none"
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
          <>
            <button
              onClick={() => setSelectedCategoryId('all')}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 shadow-sm border ${selectedCategoryId === 'all'
                ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200"
                : `${theme.surfaceBg} ${theme.textPrimary} ${theme.borderLight} hover:border-indigo-400 ${theme.sidebarItemHoverBg}`
                }`}
            >
              All ({propsTables.length})
            </button>
            {categories.map((cat) => (
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
            ))}
          </>
        )}
      </div>

      {propsTables.length === 0 ? (
        <div className={`text-center py-16 ${theme.textMuted} font-bold`}>
          No tables found in Dining Hall.
        </div>
      ) : selectedCategoryId === "all" ? (
        // When in 'All' tab, keep tables in each category order with category section headers
        (() => {
          const renderedTableIds = new Set();
          const processedMergeGroups = new Set();

          return (
            <div className="space-y-10">
              {orderedCategoryGroups.map((group) => {
                const groupCards = group.tables
                  .map((t) => renderTableCard(t, renderedTableIds, processedMergeGroups, propsTables))
                  .filter(Boolean);

                if (groupCards.length === 0) return null;

                return (
                  <div key={group.category?._id || group.categoryName} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base md:text-lg font-black ${theme.textHeading} uppercase tracking-wider`}>
                          {group.categoryName}
                        </h3>
                        <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {groupCards.length} {groupCards.length === 1 ? "Table" : "Tables"}
                        </span>
                      </div>
                      <div className={`h-[1px] flex-1 ${theme.borderLight} bg-gray-200 dark:bg-gray-800/60`} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-10">
                      {groupCards}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()
      ) : (
        // When a specific category tab is selected
        (() => {
          const renderedTableIds = new Set();
          const processedMergeGroups = new Set();

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-10">
              {singleCategoryTables.map((t) =>
                renderTableCard(t, renderedTableIds, processedMergeGroups, propsTables)
              )}
            </div>
          );
        })()
      )}

      {/* Context Menu on Right Click */}
      {contextMenu && (
        <div
          className="fixed z-[100] animate-in fade-in zoom-in-95 duration-150"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`w-60 rounded-2xl shadow-2xl border ${theme.borderLight} ${theme.surfaceBg} p-2 flex flex-col gap-1 backdrop-blur-md`}
          >
            {/* Header info */}
            <div className={`px-3 py-2 border-b ${theme.borderLight} mb-1 flex items-center justify-between`}>
              <div className="min-w-0 pr-2">
                <p className={`text-xs font-black ${theme.textHeading} truncate`}>
                  {contextMenu.table.name}
                </p>
                <p className={`text-[10px] font-bold ${theme.textMuted} truncate`}>
                  {contextMenu.table.diningCategoryId?.name || 'Table'} • Cap: {contextMenu.table.capacity || 0}
                </p>
              </div>
              {contextMenu.table.isCombined && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                  Merged
                </span>
              )}
            </div>

            {/* If already in join mode and this is a secondary table: Merge with selected */}
            {isJoinMode && selectedTables.length > 0 && !selectedTables.includes(contextMenu.table.id) ? (
              <button
                type="button"
                onClick={() => handleMergeDirectlyFromContext(contextMenu.table)}
                className="w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition-all cursor-pointer"
              >
                <Users size={15} />
                <span>Merge with Selected</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartJoinFromContext(contextMenu.table)}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 ${theme.textPrimary} hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer`}
              >
                <LinkIcon size={15} className="text-indigo-600" />
                <span>Join Table</span>
              </button>
            )}

            {/* Unmerge option if table is merged */}
            {contextMenu.table.isCombined && (
              <button
                type="button"
                onClick={() => {
                  setContextMenu(null);
                  handleUnmergeTable(contextMenu.table);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors cursor-pointer`}
              >
                <Unlink size={15} />
                <span>Unmerge / Separate</span>
              </button>
            )}

            {/* Open Table option */}
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                handleTableSelect(contextMenu.table);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 ${theme.textPrimary} hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer`}
            >
              <ShoppingBag size={15} className="text-emerald-500" />
              <span>{contextMenu.table.order ? 'Open Active Order' : 'Start New Order'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Join / Merge Action Banner */}
      {isJoinMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-6 fade-in duration-200">
          <div
            className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 rounded-full shadow-2xl border ${theme.borderLight} ${theme.surfaceBg} backdrop-blur-xl`}
          >
            <div className="flex items-center gap-2.5 text-xs font-black">
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/80 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <LinkIcon size={15} />
              </span>
              <div className="flex flex-col">
                <span className={`text-xs sm:text-sm font-black ${theme.textHeading}`}>
                  {selectedTables.length === 0
                    ? "Select tables to merge"
                    : selectedTables.length === 1
                    ? `1 table selected (${propsTables.find(t => t.id === selectedTables[0])?.name || 'Table'}). Select other table.`
                    : `${selectedTables.length} tables selected`}
                </span>
                {selectedTables.length >= 2 && (
                  <span className={`text-[10px] font-bold ${theme.textMuted} truncate max-w-[200px] sm:max-w-xs`}>
                    {selectedTables
                      .map((id) => propsTables.find((t) => t.id === id)?.name || id)
                      .join(" + ")}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleJoinMode}
                className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold ${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmJoin()}
                disabled={selectedTables.length < 2}
                className={`px-4 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md ${
                  selectedTables.length >= 2
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 active:scale-95 cursor-pointer"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed opacity-60"
                }`}
              >
                <Users size={14} />
                <span>Merge Tables</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <CommonDialog 
        {...dialogConfig}
        onClose={closeDialog}
      />
    </div>
  );
};

export default DiningHall;

