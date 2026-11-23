"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuItems } from "./menu-config";
import Icon from "./Icon";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-bg-soft border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-purple to-brand-red flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">G6</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text truncate">GTA 6</p>
            <p className="text-xs text-text-muted truncate">Content Manager</p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {menuItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-purple/15 text-brand-purple-soft border border-brand-purple/30"
                    : "text-text-soft hover:bg-bg-hover hover:text-text"
                }`}
              >
                <Icon name={item.icon} className="w-5 h-5 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-text-muted">
            Página independente de fãs.
            <br />
            Sem afiliação com a Rockstar Games.
          </p>
        </div>
      </aside>
    </>
  );
}
