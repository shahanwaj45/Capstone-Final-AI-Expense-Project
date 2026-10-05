import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/auth/AuthContext";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopBar from "./DashboardTopBar";
import MobileBottomNav from "./MobileBottomNav";
import MobileInstallBanner from "./MobileInstallBanner";
import type { NavItem, UserRole } from "@/types";

interface Props {
  role: UserRole;
  navItems: NavItem[];
  pageTitle: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function DashboardLayout({
  role,
  navItems,
  pageTitle,
  subtitle,
  children,
}: Props) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f7f3] text-[#172532]">
      <DashboardSidebar
        role={role}
        navItems={navItems}
        activePath={location}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userName={user?.name ?? "User"}
        userInitials={user?.initials ?? "U"}
        onLogout={handleLogout}
      />

      <main className="min-h-screen lg:pl-[264px]">
        <DashboardTopBar
          pageTitle={pageTitle}
          subtitle={subtitle}
          userInitials={user?.initials ?? "U"}
          role={role}
          onMenuOpen={() => setMobileOpen(true)}
        />

        <div className="mx-auto max-w-[1440px] px-4 pb-24 pt-5 sm:px-8 lg:px-10 lg:pb-12 lg:pt-7">
          {children}
        </div>
      </main>

      {/* Mobile native-like bottom navigation */}
      <MobileBottomNav role={role} onMenuOpen={() => setMobileOpen(true)} />

      {/* PWA Install Banner */}
      <MobileInstallBanner />
    </div>
  );
}
