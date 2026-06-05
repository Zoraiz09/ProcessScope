import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* reducedMotion="user" makes every framer animation honor the OS
          "reduce motion" setting automatically. */}
      <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 360, damping: 30 }}>
        <App />
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>
);
