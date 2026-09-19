import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RootRedirect from "./pages/RootRedirect";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import VideoDetail from "./pages/VideoDetail";
import Health from "./pages/Health";

function App() {
  const basename =
    process.env.REACT_APP_BASENAME !== undefined
      ? process.env.REACT_APP_BASENAME
      : typeof window !== "undefined" && window.location.pathname.startsWith("/Hyper-Forge")
      ? "/Hyper-Forge"
      : typeof window !== "undefined" && window.location.pathname.startsWith("/HypeFoge")
      ? "/HypeFoge"
      : "";

  return (
    <AuthProvider>
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:id"
            element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/video/:id"
            element={
              <ProtectedRoute>
                <VideoDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/health"
            element={
              <ProtectedRoute>
                <Health />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            background: "rgba(12,13,18,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#F8FAFC",
            backdropFilter: "blur(20px)",
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
