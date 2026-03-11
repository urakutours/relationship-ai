"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ホーム", icon: "⌂" },
  { href: "/persons", label: "人物", icon: "♟" },
  { href: "/consult", label: "相談", icon: "◈" },
  { href: "/profile", label: "自分", icon: "◉" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border-subtle md:hidden">
      <ul className="flex justify-around items-center h-14">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`
                  flex flex-col items-center justify-center gap-0.5 py-1.5 transition-colors duration-200
                  ${isActive ? "text-gold" : "text-text-secondary"}
                `}
              >
                <span className="text-lg font-display leading-none">{item.icon}</span>
                <span className="text-[10px] tracking-wider">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 w-4 h-[2px] bg-gold rounded-full" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
