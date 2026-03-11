"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "ホーム" },
  { href: "/persons", label: "人物一覧" },
  { href: "/profile", label: "自分のプロフィール" },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`
                relative block px-4 py-2.5 text-sm transition-colors duration-200
                ${
                  isActive
                    ? "text-gold"
                    : "text-text-secondary hover:text-text-primary"
                }
              `}
            >
              {/* アクティブインジケーター */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-gold rounded-full" />
              )}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
