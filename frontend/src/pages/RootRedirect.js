import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function RootRedirect() {
  const { status } = useAuth();
  if (status === "loading") return null;
  return <Navigate to={status === "authed" ? "/dashboard" : "/login"} replace />;
}
