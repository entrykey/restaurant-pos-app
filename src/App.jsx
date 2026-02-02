import React from "react";
import { AppProvider } from "./context/AppContext";
import { OrderProvider } from "./context/OrderContext";
import { DiningProvider } from "./pages/DiningHall/DiningContext";
import { TakeawayProvider } from "./pages/Takeaway/TakeawayContext";
import { OnlineOrderProvider } from "./pages/OnlineOrders/OnlineOrderContext";
import AppContent from "./components/AppContent";

const App = () => {
  return (
    <AppProvider>
      <OrderProvider>
        <DiningProvider>
          <TakeawayProvider>
            <OnlineOrderProvider>
              <AppContent />
            </OnlineOrderProvider>
          </TakeawayProvider>
        </DiningProvider>
      </OrderProvider>
    </AppProvider>
  );
};

export default App;
