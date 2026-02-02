import React, { useEffect, useState } from "react";
import { ShoppingBag, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TableCard from "../../components/TableCard";
import { diningHallService } from "./DiningHallService";

const DiningHall = ({
  tables: propsTables,
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
}) => {
  const navigate = useNavigate();
  const [diningHalls, setDiningHalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    diningHallService.getDiningHalls().then((data) => {
      setDiningHalls(data);
      setLoading(false);
    });
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const isAdmin = currentUser?.role === "Admin";

  // Use propsTables for now as it contains the real state of tables
  const tables = propsTables;

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto">
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
            navigate("/takeaway");
          }}
          className="bg-indigo-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg text-sm md:text-base"
        >
          <ShoppingBag size={20} /> Takeaway
        </button>
      </div>

      {/* Static data from service demonstration */}
      <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
        {loading ? (
          <div className="text-gray-500 animate-pulse">Loading areas...</div>
        ) : (
          diningHalls.map((hall) => (
            <div
              key={hall.id}
              className="bg-white px-4 py-2 rounded-xl shadow-sm border border-indigo-50 text-indigo-900 font-medium whitespace-nowrap"
            >
              {hall.name} ({hall.capacity})
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-8">
        {tables.map((t) => {
          const duration = getTableDuration(t.startTime);
          const hasReservation = reservations.find(
            (r) =>
              r.tableId === t.id && r.date === today && r.status === "Confirmed"
          );

          return (
            <TableCard
              key={t.id}
              table={t}
              duration={duration}
              hasReservation={hasReservation}
              isAdmin={isAdmin}
              totalLabel={
                t.order ? formatCurrency(calculateTotal(t.order)) : null
              }
              onSelect={() => {
                setIsTakeaway(false);
                setActiveTableId(t.id);
                setView("order");
                setOrderSearch("");
                navigate(`/dininghall/table/${t.id}`);
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DiningHall;

