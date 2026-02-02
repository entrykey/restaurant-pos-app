// This service handles dining hall related data operations
// Currently returning static data, will be replaced with API calls later

const diningHallsData = [
    {
        id: 1,
        name: "Main Dining Hall",
        capacity: 50,
        active: true,
    },
    {
        id: 2,
        name: "Outdoor Terrace",
        capacity: 30,
        active: true,
    },
    {
        id: 3,
        name: "Private VIP Room",
        capacity: 12,
        active: true,
    }
];

export const diningHallService = {
    getDiningHalls: () => {
        return new Promise((resolve) => {
            // Simulating API delay
            setTimeout(() => {
                resolve(diningHallsData);
            }, 500);
        });
    }
};
