import { useState } from "react";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AdminNav, LoginScreen } from "./components";
import DashboardTab from "./DashboardTab";
import ProductsTab from "./ProductsTab";
import InvoiceTab from "./invoice/InvoiceTab";
import StaffManagementTab from "./StaffManagementTab";

function AppInner() {
  const { session, profile, role, signOut, loading } = useAuth();
  const [tab, setTab] = useState("dashboard");

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 13, letterSpacing: 2 }}>
      LOADING...
    </div>
  );

  if (!session) return <LoginScreen />;

  const pages = {
    dashboard: <DashboardTab role={role} />,
    products: <ProductsTab role={role} />,
    invoices: <InvoiceTab role={role} />,
    ...(role === "owner" ? { staff: <StaffManagementTab /> } : {}),
  };

  // Fall back to dashboard if the current tab becomes inaccessible
  const activePage = pages[tab] ?? pages.dashboard;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f5f5f0" }}>
      <AdminNav tab={tab} setTab={setTab} onLogout={signOut} role={role} userName={profile?.name || profile?.email || ""} />
      <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
        {activePage}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
