import React, { useEffect, useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { ChevronRight } from 'lucide-react';

export interface BranchedMenuChild {
  value: string;
  label: string;
  icon?: IconSvgElement;
  dotColor?: string;
}

export interface BranchedMenuGroup {
  label: string;
  children: BranchedMenuChild[];
}

export interface BranchedMenuProps {
  items: BranchedMenuGroup[];
  defaultOpen?: number[];
  defaultActive?: string;
  activeValue?: string;
  onSelect?: (value: string, item: BranchedMenuChild) => void;
  color?: string;
  accentColor?: string;
  lineColor?: string;
  width?: number | string;
  rowHeight?: number;
  indent?: number;
  trunk?: number;
  radius?: number;
  lineWidth?: number;
  fontSize?: number;
  drawDuration?: number;
  foldDuration?: number;
  className?: string;
}

export const BranchedMenu: React.FC<BranchedMenuProps> = ({
  items,
  defaultOpen = [0],
  defaultActive,
  activeValue,
  onSelect,
  color = '#f5f5f5',
  accentColor = '#34d399',
  lineColor = '#3f3f46',
  width = 240,
  rowHeight = 36,
  indent = 40,
  trunk = 14,
  radius = 10,
  lineWidth = 1.5,
  fontSize = 14,
  drawDuration = 400,
  foldDuration = 300,
  className = '',
}) => {
  const [openGroups, setOpenGroups] = useState<Set<number>>(
    () => new Set(defaultOpen)
  );
  const [internalActive, setInternalActive] = useState<string>(
    defaultActive ?? items[0]?.children[0]?.value ?? ''
  );

  const currentActive = activeValue !== undefined ? activeValue : internalActive;

  // Track groups whose SVG lines have mounted/drawn
  const [drawnGroups, setDrawnGroups] = useState<Set<number>>(
    () => new Set(defaultOpen)
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDrawnGroups(new Set(openGroups));
    }, 20);
    return () => window.clearTimeout(t);
  }, [openGroups]);

  const toggleGroup = (idx: number) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleSelect = (child: BranchedMenuChild) => {
    setInternalActive(child.value);
    onSelect?.(child.value, child);
  };

  return (
    <div
      className={`select-none ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        color,
        fontSize: `${fontSize}px`,
      }}
    >
      <div className="space-y-1.5">
        {items.map((group, groupIdx) => {
          const isOpen = openGroups.has(groupIdx);
          const isDrawn = drawnGroups.has(groupIdx);
          const totalHeight = group.children.length * rowHeight;
          const endX = Math.max(trunk + radius + 4, indent - 6);
          const safeRadius = Math.min(radius, rowHeight / 2 - 2, (endX - trunk) / 2);

          return (
            <div key={group.label}>
              {/* Group Header */}
              <button
                type="button"
                onClick={() => toggleGroup(groupIdx)}
                className="w-full flex items-center justify-between px-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer text-left"
                style={{ height: `${rowHeight}px` }}
              >
                <span
                  className="font-semibold tracking-tight truncate"
                  style={{ color, opacity: isOpen ? 0.96 : 0.72 }}
                >
                  {group.label}
                </span>
                <ChevronRight
                  className="w-4 h-4 shrink-0 transition-transform"
                  style={{
                    color: lineColor === '#3f3f46' ? '#a1a1aa' : lineColor,
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transitionDuration: `${foldDuration}ms`,
                  }}
                />
              </button>

              {/* Animated Collapsible Branch Children */}
              <div
                className="grid transition-[grid-template-rows,opacity] ease-out"
                style={{
                  gridTemplateRows: isOpen ? '1fr' : '0fr',
                  opacity: isOpen ? 1 : 0,
                  transitionDuration: `${foldDuration}ms`,
                }}
              >
                <div className="overflow-hidden relative">
                  {/* SVG Trunk & Curved Branch Connectors */}
                  {group.children.length > 0 && (
                    <svg
                      width={indent}
                      height={totalHeight}
                      viewBox={`0 0 ${indent} ${totalHeight}`}
                      fill="none"
                      className="absolute left-0 top-0 pointer-events-none"
                    >
                      {group.children.map((child, idx) => {
                        const y = idx * rowHeight + rowHeight / 2;
                        const prevY = idx === 0 ? 0 : (idx - 1) * rowHeight + rowHeight / 2;
                        const pathLen = Math.ceil((y - prevY) + (endX - trunk) + 20);
                        const isChildActive = currentActive === child.value;

                        // Curved branch from previous segment down into rounded elbow
                        const d =
                          idx === 0
                            ? `M ${trunk} 0 L ${trunk} ${Math.max(0, y - safeRadius)} Q ${trunk} ${y} ${trunk + safeRadius} ${y} L ${endX} ${y}`
                            : `M ${trunk} ${Math.max(0, prevY - safeRadius)} L ${trunk} ${y - safeRadius} Q ${trunk} ${y} ${trunk + safeRadius} ${y} L ${endX} ${y}`;

                        return (
                          <path
                            key={child.value}
                            d={d}
                            stroke={isChildActive ? accentColor : lineColor}
                            strokeWidth={isChildActive ? lineWidth + 0.4 : lineWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              strokeDasharray: pathLen,
                              strokeDashoffset: isOpen && isDrawn ? 0 : pathLen,
                              transition: `stroke-dashoffset ${drawDuration}ms cubic-bezier(0.22, 1, 0.36, 1) ${
                                idx * 45
                              }ms, stroke 200ms ease`,
                            }}
                          />
                        );
                      })}
                    </svg>
                  )}

                  {/* Branch Item Rows */}
                  <div>
                    {group.children.map((child) => {
                      const isActive = currentActive === child.value;
                      return (
                        <button
                          key={child.value}
                          type="button"
                          onClick={() => handleSelect(child)}
                          className="w-full flex items-center gap-2.5 pr-2.5 rounded-xl transition-colors cursor-pointer text-left"
                          style={{
                            height: `${rowHeight}px`,
                            paddingLeft: `${indent}px`,
                            backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                            color: isActive ? accentColor : color,
                            opacity: isActive ? 1 : 0.72,
                          }}
                        >
                          {child.icon ? (
                            <HugeiconsIcon
                              icon={child.icon}
                              size={16}
                              strokeWidth={1.8}
                              color={isActive ? accentColor : color}
                            />
                          ) : child.dotColor ? (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: child.dotColor }}
                            />
                          ) : null}
                          <span
                            className={`truncate ${
                              isActive ? 'font-semibold' : 'font-medium'
                            }`}
                          >
                            {child.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BranchedMenu;
