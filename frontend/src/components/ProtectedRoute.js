import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import MeshBackground from "../components/MeshBackground";

export default function ProtectedRoute({ children }) {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="relative min-h-screen">
        <MeshBackground />
        <div className="flex min-h-screen items-center justify-center">
          <div
            data-testid="auth-loading"
            className="glass rounded-2xl px-6 py-4 font-mono text-sm text-hf-cyan"
          >
            authenticating...
          </div>
        </div>
      </div>
    );
  }

  if (status !== "authed") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
