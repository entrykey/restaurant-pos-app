import React, { createContext, useContext, useState } from "react";

const TakeawayContext = createContext();

export const useTakeaway = () => useContext(TakeawayContext);

export const TakeawayProvider = ({ children }) => {
    const [isTakeaway, setIsTakeaway] = useState(false);
    const [takeawayOrder, setTakeawayOrder] = useState({
        items: [],
        isSentToKOT: false,
    });
    const [takeawayCustName, setTakeawayCustName] = useState("");
    const [takeawayCustPhone, setTakeawayCustPhone] = useState("");

    const resetTakeaway = () => {
        setTakeawayOrder({ items: [], isSentToKOT: false });
        setTakeawayCustName("");
        setTakeawayCustPhone("");
        setIsTakeaway(false);
    };

    return (
        <TakeawayContext.Provider
            value={{
                isTakeaway,
                setIsTakeaway,
                takeawayOrder,
                setTakeawayOrder,
                takeawayCustName,
                setTakeawayCustName,
                takeawayCustPhone,
                setTakeawayCustPhone,
                resetTakeaway
            }}
        >
            {children}
        </TakeawayContext.Provider>
    );
};
