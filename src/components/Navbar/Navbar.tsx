"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, Building, GraduationCap as Degree, ShieldCheck, Home, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/unistay/firebase";
import { useAuth } from "@/lib/unistay/auth-context";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  // Close menus on path changes — intentional sync of URL state to local UI
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsOpen(false);
    setDropdownOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const toggleDropdown = (e: React.MouseEvent) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      setDropdownOpen(!dropdownOpen);
    }
  };

  const displayName = user?.displayName || user?.email?.split("@")[0] || null;

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <Image
            src="/images/1.png"
            alt="Casa Educational Solutions"
            width={160}
            height={79}
            className={styles.logoImage}
            priority
          />
        </Link>

        {/* Desktop Navigation Links */}
        <ul className={`${styles.menu} ${isOpen ? styles.menuActive : ""}`}>
          <li className={styles.item}>
            <Link href="/" className={`${styles.link} ${pathname === "/" ? styles.activeLink : ""}`}>
              Home
            </Link>
          </li>
          <li className={styles.item}>
            <Link href="/aboutus" className={`${styles.link} ${pathname === "/aboutus" ? styles.activeLink : ""}`}>
              About Us
            </Link>
          </li>
          <li className={`${styles.item} ${styles.dropdown} ${dropdownOpen ? styles.dropdownOpen : ""}`}>
            <span onClick={toggleDropdown} className={styles.link}>
              Our Solutions <ChevronDown size={16} className={styles.arrowIcon} />
            </span>
            <ul className={styles.dropdownMenu}>
              <li>
                <Link href="/solutions#studymatch" className={styles.dropdownLink}>
                  <Degree size={16} /> StudyMatch AI
                </Link>
              </li>
              <li>
                <Link href="/unistay" className={styles.dropdownLink}>
                  <Home size={16} /> UniStay
                </Link>
              </li>
              <li>
                <Link href="/ausbildung-students" className={styles.dropdownLink}>
                  <Building size={16} /> Ausbildung for Students
                </Link>
              </li>
              <li>
                <Link href="/solutions#visa" className={styles.dropdownLink}>
                  <ShieldCheck size={16} /> Visa Assistance
                </Link>
              </li>
            </ul>
          </li>
          {pathname.startsWith('/unistay') && (
            <li className={styles.navBtn}>
              <Link href="/unistay/list-property" className={styles.listBtn}>
                List Property
              </Link>
            </li>
          )}
          <li className={styles.navBtn}>
            {user ? (
              <div className={styles.userMenu}>
                <Link href="/unistay/profile" className={styles.userName}>
                  {displayName}
                </Link>
                <button
                  onClick={() => signOut(auth)}
                  className={styles.logoutBtn}
                  aria-label="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <Link href="/unistay/auth" className={styles.button}>
                Login
              </Link>
            )}
          </li>
        </ul>

        {/* Mobile Toggle */}
        <button className={styles.toggle} onClick={toggleMenu} aria-label="Toggle menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
}
