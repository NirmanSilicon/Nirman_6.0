"use client";
import React from "react";
import { cn } from "@/lib/utils";

const ROW_INDICES = Array.from({ length: 150 }, (_, idx) => idx);
const COL_INDICES = Array.from({ length: 100 }, (_, idx) => idx);
const BOX_COLORS = [
  "#93c5fd",
  "#f9a8d4",
  "#86efac",
  "#fde047",
  "#fca5a5",
  "#d8b4fe",
  "#93c5fd",
  "#a5b4fc",
  "#c4b5fd",
];

function getRandomColor(): string {
  return BOX_COLORS[Math.floor(Math.random() * BOX_COLORS.length)];
}

const handleCellEnter = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.transitionDuration = "0ms";
  e.currentTarget.style.backgroundColor = getRandomColor();
};

const handleCellLeave = (e: React.MouseEvent<HTMLDivElement>) => {
  e.currentTarget.style.transitionDuration = "2000ms";
  e.currentTarget.style.backgroundColor = "";
};

const BoxesCore = ({
  className,
  variant = "dark",
  ...rest
}: {
  className?: string;
  variant?: "dark" | "light";
}) => {
  const borderClass =
    variant === "light" ? "border-slate-400/35" : "border-slate-700";
  const plusClass =
    variant === "light" ? "text-slate-400/45" : "text-slate-700";

  return (
    <div
      style={{
        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
      }}
      className={cn(
        "absolute -top-1/4 left-1/4 z-0 flex h-full w-full -translate-x-1/2 -translate-y-1/2 p-4",
        className,
      )}
      {...rest}
    >
      {ROW_INDICES.map((i) => (
        <div
          key={`row${i}`}
          className={cn("relative h-8 w-16 border-l", borderClass)}
        >
          {COL_INDICES.map((j) => (
            <div
              key={`col${j}`}
              onMouseEnter={handleCellEnter}
              onMouseLeave={handleCellLeave}
              className={cn(
                "relative h-8 w-16 border-t border-r transition-colors duration-[2000ms]",
                borderClass,
              )}
            >
              {j % 2 === 0 && i % 2 === 0 ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className={cn(
                    "pointer-events-none absolute -top-[14px] -left-[22px] h-6 w-10 stroke-[1px]",
                    plusClass,
                  )}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m6-6H6"
                  />
                </svg>
              ) : null}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Boxes = React.memo(BoxesCore);
