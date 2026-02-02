// Mock service for Reservations
export const reservationsService = {
    getReservations: async () => {
        // In a real app, this would be an API call
        return [
            {
                id: 1,
                customerName: "Amit Sharma",
                phone: "9876543210",
                date: new Date().toISOString().split("T")[0],
                time: "19:30",
                guests: 4,
                tableId: 2,
                status: "Confirmed",
            },
            {
                id: 2,
                customerName: "Priya Singh",
                phone: "9988776655",
                date: new Date().toISOString().split("T")[0],
                time: "20:00",
                guests: 2,
                tableId: null,
                status: "Pending",
            },
        ];
    },

    addReservation: async (reservation) => {
        console.log("Adding reservation:", reservation);
        return { ...reservation, id: Date.now(), status: "Confirmed" };
    },

    updateReservationStatus: async (id, status) => {
        console.log(`Updating reservation ${id} to ${status}`);
        return true;
    }
};
