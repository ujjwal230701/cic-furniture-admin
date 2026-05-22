import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthProvider";
import { AdminNav, LoginScreen } from "./components";
import DashboardTab from "./DashboardTab";
import ProductsTab from "./ProductsTab";
import InvoiceTab from "./invoice/InvoiceTab";
import QuotationTab from "./invoice/QuotationTab";
import StaffManagementTab from "./StaffManagementTab";
import SkuReferenceTab from "./SkuReferenceTab";

function AppInner() {
  const { session, profile, role, signOut, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f5f0", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontSize: 13, letterSpacing: 2 }}>
      LOADING...
    </div>
  );

  if (!session) return <LoginScreen />;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", minHeight: "100vh", background: "#f5f5f0" }}>
      <AdminNav onLogout={signOut} role={role} userName={profile?.name || profile?.email || ""} />
      <div style={{ padding: 32, maxWidth: 1100, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardTab role={role} />} />
          <Route path="/products/*" element={<ProductsTab role={role} />} />
          <Route path="/invoices/*" element={<InvoiceTab role={role} />} />
          <Route path="/quotations/*" element={<QuotationTab role={role} />} />
          <Route path="/sku-reference" element={<SkuReferenceTab role={role} />} />
          {role === "owner" && <Route path="/staff" element={<StaffManagementTab />} />}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}
