"use client";

import { useState, useRef, useEffect } from "react";
import { MapPin, Navigation, Check, ChevronDown, Loader2 } from "lucide-react";
import { useLocation, PRESET_LOCATIONS, type CityLocation } from "@/lib/location";

export function LocationPickerModal() {
  const { currentLocation, setLocation, detectAutoLocation, isDetecting, error } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-primary)]/50 hover:bg-[var(--bg-secondary)]"
        title="Click to choose or auto-detect location"
        aria-expanded={isOpen}
      >
        <MapPin className="h-3.5 w-3.5 text-[var(--accent-copper)] transition-transform group-hover:scale-110" aria-hidden="true" />
        <span className="font-semibold text-[var(--text-primary)]">
          {currentLocation.name}
          {currentLocation.state ? `, ${currentLocation.state}` : ""}
        </span>
        <ChevronDown className="h-3 w-3 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
      </button>

      {isOpen && (
        <div className="glass-floating absolute top-full left-0 z-50 mt-1.5 w-72 rounded-[14px] p-2 shadow-2xl backdrop-blur-md">
          <div className="border-b border-[var(--border-subtle)] px-2.5 py-2">
            <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Select City / Region
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Map and localized assets reflect this location.
            </p>
          </div>

          {/* Auto detect location button */}
          <div className="p-1.5">
            <button
              type="button"
              disabled={isDetecting}
              onClick={async () => {
                await detectAutoLocation();
              }}
              className="flex w-full items-center justify-between rounded-[9px] bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-primary)] transition hover:bg-[var(--accent-primary)] hover:text-[var(--accent-contrast)] disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {isDetecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Navigation className="h-3.5 w-3.5" />
                )}
                {isDetecting ? "Detecting GPS location…" : "Detect My Current Location"}
              </span>
              {currentLocation.isCurrentLocation && (
                <span className="rounded bg-[var(--accent-primary)] px-1.5 py-0.5 text-[10px] text-[var(--accent-contrast)]">
                  Active
                </span>
              )}
            </button>
            {error && (
              <p className="mt-1 px-1 text-[11px] text-[var(--status-danger)]">
                {error}
              </p>
            )}
          </div>

          {/* Preset Locations List */}
          <div className="max-h-56 space-y-0.5 overflow-y-auto px-1 py-1">
            <p className="px-2 py-1 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Major Cities & Hubs
            </p>
            {PRESET_LOCATIONS.map((loc) => {
              const isSelected = !currentLocation.isCurrentLocation && currentLocation.id === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setLocation(loc);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[var(--accent-primary)] text-[var(--accent-contrast)]"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPin className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-[var(--text-muted)]"}`} />
                    <span>{loc.name}, {loc.state}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
