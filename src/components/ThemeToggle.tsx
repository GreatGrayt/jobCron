"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = () => {
    if (theme === "system") {
      return <Monitor size={14} />;
    }
    return resolvedTheme === "dark" ? <Moon size={14} /> : <Sun size={14} />;
  };

  const getLabel = () => {
    switch (theme) {
      case "light":
        return "LIGHT";
      case "dark":
        return "DARK";
      case "system":
        return "AUTO";
    }
  };

  return (
    <div className="theme-toggle-wrapper" ref={dropdownRef}>
      <button
        className="terminal-btn theme-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme"
      >
        {getIcon()}
        {getLabel()}
      </button>
      {isOpen && (
        <div className="theme-dropdown">
          <button
            className={`theme-option ${theme === "light" ? "active" : ""}`}
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
          >
            <Sun size={14} />
            Light
          </button>
          <button
            className={`theme-option ${theme === "dark" ? "active" : ""}`}
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
          >
            <Moon size={14} />
            Dark
          </button>
          <button
            className={`theme-option ${theme === "system" ? "active" : ""}`}
            onClick={() => {
              setTheme("system");
              setIsOpen(false);
            }}
          >
            <Monitor size={14} />
            System
          </button>
        </div>
      )}
    </div>
  );
}
