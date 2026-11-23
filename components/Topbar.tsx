"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import Icon from "./Icon";

type TopbarProps = {
  onMenuClick: () => void;
};

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-bg-soft/80 backdrop-blur border-b border-border flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-text-soft hover:text-text"
        aria-label="Abrir menu"
      >
        <Icon name="menu" />
      </button>

      <div className="flex-1 lg:flex-none" />

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-red flex items-center justify-center text-white text-sm font-semibold">
            {session?.user?.name?.charAt(0) || "A"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-text leading-tight">
              {session?.user?.name || "Administrador"}
            </p>
            <p className="text-xs text-text-muted leading-tight">
              {session?.user?.email}
            </p>
          </div>
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 card p-2 z-20 animate-slide-up">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text-soft hover:bg-bg-hover hover:text-brand-red-soft transition-colors"
              >
                <Icon name="logout" className="w-4 h-4" />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
