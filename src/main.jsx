import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ChainProvider } from "./store/ChainProvider.jsx";
import { CurrencyProvider } from "./store/CurrencyContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CurrencyProvider>
        <ChainProvider>
          <App />
        </ChainProvider>
      </CurrencyProvider>
    </BrowserRouter>
  </React.StrictMode>
);
