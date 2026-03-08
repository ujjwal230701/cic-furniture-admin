import { useState } from "react";
import { ADMIN_PASSWORD } from "./config";
import { AdminNav, LoginScreen } from "./components";
import DashboardTab from "./DashboardTab";
import ProductsTab from "./ProductsTab";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [tab, setTab] = useState("dashboard");

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} adminPassword={ADMIN_PASSWORD} />;

  const pages = { dashboard: DashboardTab, products: ProductsTab };
  const Page = pages[tab];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f5f5f0" }}>
      <AdminNav tab={tab} setTab={setTab} onLogout={() => setLoggedIn(false)} />
      <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
        <Page />
      </div>
    </div>
  );
}
