import React, { useEffect, useState } from "react";
import { ShoppingBag, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableCard from "../../components/TableCard";
import { diningHallService } from "./DiningHallService";

const DiningHall = ({
  tables: propsTables,
  categories,
  loading,
  reservations,
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
}) => {
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);

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

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-6 md:mb-10">
        <h2 className="text-2xl md:text-4xl font-black text-gray-800 flex items-center">
          <Users className="mr-3 text-indigo-600" /> Dining Hall
        </h2>

        <div className="flex gap-4">
          {isJoinMode ? (
            <>
              <button
                onClick={toggleJoinMode}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-2xl font-bold hover:bg-gray-300 transition-colors"
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
              className="bg-white border-2 border-indigo-100 text-indigo-700 px-4 py-2 rounded-2xl font-bold hover:bg-indigo-50 transition-colors"
            >
              Join Tables
            </button>
          )}

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
        </div>
      </div>

      {/* Dynamic Category Tabs */}
      <div className="mb-6 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {loading ? (
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gray-100 w-32 h-10 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategoryId(cat._id)}
              className={`px-6 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all duration-200 shadow-sm border ${selectedCategoryId === cat._id
                ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200"
                : "bg-white text-indigo-900 border-indigo-50 hover:border-indigo-200 hover:bg-indigo-50"
                }`}
            >
              {cat.name} ({propsTables.filter(t => t.diningCategoryId?._id === cat._id || t.diningCategoryId === cat._id).length})
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-8">
        {filteredTables.map((t) => {
          const duration = getTableDuration(t.startTime);
          const hasReservation = reservations.find(
            (r) =>
              String(r.tableId) === String(t.id) &&
              r.date === today &&
              r.status === "CONFIRMED"
          );

          // Enhanced table object for UI
          const tableForCard = {
            ...t,
            isSelectionMode: isJoinMode,
            isSelected: selectedTables.includes(t.id)
          };

          return (
            <TableCard
              key={t.id}
              table={tableForCard}
              duration={duration}
              hasReservation={hasReservation}
              isAdmin={isAdmin}
              totalLabel={
                t.order ? formatCurrency(calculateTotal(t.order)) : null
              }
              onSelect={handleTableSelect}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DiningHall;

