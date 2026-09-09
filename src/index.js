import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./styles.css";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";

// Prevent accidental pinch zoom & Ctrl + Wheel zoom across the entire app
if (typeof window !== 'undefined') {
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  }, { passive: false });

  // Auto-scroll focused inputs into view above virtual keyboard on tablets & phone screens
  const scrollFocusedInputIntoView = (el) => {
    if (
      el &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
    ) {
      setTimeout(() => {
        try {
          el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        } catch (_) {
          el.scrollIntoView(false);
        }
      }, 300);
    }
  };

  document.addEventListener('focusin', (e) => scrollFocusedInputIntoView(e.target), true);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      scrollFocusedInputIntoView(document.activeElement);
    });
  }
}

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
