import React from "react";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import { X } from "lucide-react";
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
                <Toaster
                  position="top-center"
                  reverseOrder={false}
                  gutter={8}
                  toastOptions={{
                    duration: 3000,
                    success: {
                      duration: 3000,
                    },
                    error: {
                      duration: 3000,
                    },
                    custom: {
                      duration: 3000,
                    },
                  }}
                >
                  {(t) => (
                    <ToastBar toast={t}>
                      {({ icon, message }) => (
                        <div className="flex items-center gap-2 max-w-md">
                          {icon}
                          <div className="flex-1 text-xs font-bold leading-tight">{message}</div>
                          {t.type !== 'loading' && (
                            <button
                              type="button"
                              onClick={() => toast.dismiss(t.id)}
                              className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-gray-400 hover:text-gray-700 dark:hover:text-white shrink-0 ml-1 cursor-pointer"
                              title="Dismiss notification"
                            >
                              <X size={14} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      )}
                    </ToastBar>
                  )}
                </Toaster>
              </OnlineOrderProvider>
            </TakeawayProvider>
          </DiningProvider>
        </OrderProvider>
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
