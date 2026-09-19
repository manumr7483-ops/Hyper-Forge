import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import { LogOut, Activity, User2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

function Wordmark() {
  return (
    <Link
      to="/dashboard"
      data-testid="brand-home"
      className="group flex items-center gap-2"
    >
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-hf-cyan to-hf-violet blur-md opacity-60 group-hover:opacity-90 transition-opacity" />
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-hf-cyan to-hf-violet font-mono text-[13px] font-bold text-void">
          H
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tracking-tight text-gradient-hf">
          HYPERFORGE
        </span>
        <span className="hidden sm:inline font-mono text-[10px] tracking-[0.3em] text-hf-slate">
          v0.1
        </span>
      </div>
    </Link>
  );
}

export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials = (user?.full_name || user?.email || "H").trim().split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-40 border-b border-white/[0.06] glass-strong"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Link
            to="/health"
            data-testid="nav-health"
            className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-xs font-mono text-hf-slate hover:text-alabaster hover:border-hf-cyan/40 transition-colors"
          >
            <Activity className="h-3.5 w-3.5 text-hf-emerald" />
            <span>SYSTEM</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="user-menu-trigger"
                className="group flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.02] py-1.5 pl-1.5 pr-4 hover:border-hf-cyan/40 transition-colors hf-focus"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-hf-cyan/80 to-hf-violet/80 font-mono text-xs font-bold text-void">
                  {initials || "H"}
                </span>
                <span className="hidden md:block text-left">
                  <span className="block text-xs text-hf-slate">Signed in</span>
                  <span className="block text-sm text-alabaster max-w-[160px] truncate">
                    {user?.email}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="glass-strong border-white/[0.08] rounded-xl min-w-[220px] text-alabaster"
              data-testid="user-menu-content"
            >
              <DropdownMenuLabel className="text-xs font-mono uppercase tracking-widest text-hf-slate">
                Account
              </DropdownMenuLabel>
              <DropdownMenuItem className="text-alabaster/90 focus:bg-white/[0.06] focus:text-alabaster">
                <User2 className="mr-2 h-4 w-4 text-hf-cyan" />
                <span className="truncate">{user?.full_name || user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem
                data-testid="logout-button"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="text-alabaster/90 focus:bg-white/[0.06] focus:text-alabaster cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4 text-hf-violet" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.nav>
  );
}
