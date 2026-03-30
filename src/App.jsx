import React from "react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "./context/ThemeContext";
import { AppProvider } from "./context/AppContext";
import { OrderProvider } from "./context/OrderContext";
import { DiningProvider } from "./pages/DiningHall/DiningContext";
import { TakeawayProvider } from "./pages/Takeaway/TakeawayContext";
import { OnlineOrderProvider } from "./pages/OnlineOrders/OnlineOrderContext";
import AppContent from "./components/AppContent";

const App = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <OrderProvider>
          <DiningProvider>
            <TakeawayProvider>
              <OnlineOrderProvider>
                <AppContent />
                <Toaster position="top-center" reverseOrder={false} />
              </OnlineOrderProvider>
            </TakeawayProvider>
          </DiningProvider>
        </OrderProvider>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
