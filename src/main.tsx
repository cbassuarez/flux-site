    import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/branding.css";

    ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
        <React.StrictMode>
            <div className="app-shell bg-white text-slate-900">
                <BrowserRouter basename={import.meta.env.BASE_URL}>
                    <App />
                </BrowserRouter>
            </div>
        </React.StrictMode>,
    );