"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { label: "Beranda", href: "/" },
  { label: "Projek Berjalan", href: "/projek-berjalan" },
  { label: "Portofolio", href: "/portofolio" },
  { label: "Artikel", href: "/articles" },
  { label: "Kontak Kami", href: "/kontak" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav
      className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${
        scrolled ? "shadow-md" : "border-b border-slate-100"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center relative">
        {/* Logo — left */}
        <Link href="/" className="flex items-center flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Rubah Rumah"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop Nav — absolutely centered */}
        <div className="hidden md:flex items-center gap-7 absolute left-1/2 -translate-x-1/2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors whitespace-nowrap ${
                isActive(l.href)
                  ? "text-[#FF9122]"
                  : "text-slate-600 hover:text-[#FF9122]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        {/* Hubungi Kami — right */}
        <div className="hidden md:block ml-auto flex-shrink-0">
          <a
            href="https://wa.me/6281376405550"
            target="_blank"
            rel="noreferrer"
            className="btn-primary text-sm py-2 px-5"
          >
            Hubungi Kami
          </a>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden p-2 text-slate-600 ml-auto"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive(l.href)
                  ? "text-[#FF9122] bg-orange-50"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2">
            <a
              href="https://wa.me/6281376405550"
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="btn-primary text-sm w-full justify-center"
            >
              Hubungi Kami
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
