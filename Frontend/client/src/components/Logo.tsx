import React from "react";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  text?: string;
  badge?: string;
  className?: string;
  textClassName?: string;
  animated?: boolean;
}

const sizeConfig = {
  xs: {
    box: "h-7 w-7 rounded-[10px]",
    svg: "h-5 w-5",
    text: "text-[13px]",
    badge: "text-[8px] px-1 py-0.2",
    dot: "h-1.5 w-1.5",
  },
  sm: {
    box: "h-8 w-8 rounded-[11px]",
    svg: "h-5 w-5",
    text: "text-[14px]",
    badge: "text-[8px] px-1.5 py-0.5",
    dot: "h-1.5 w-1.5",
  },
  md: {
    box: "h-10 w-10 rounded-[14px]",
    svg: "h-6 w-6",
    text: "text-[16px] sm:text-[17px]",
    badge: "text-[9px] px-1.5 py-0.5",
    dot: "h-2 w-2",
  },
  lg: {
    box: "h-12 w-12 rounded-[16px]",
    svg: "h-7 w-7",
    text: "text-[18px] sm:text-[20px]",
    badge: "text-[10px] px-2 py-0.5",
    dot: "h-2.5 w-2.5",
  },
  xl: {
    box: "h-16 w-16 rounded-[22px]",
    svg: "h-10 w-10",
    text: "text-[22px] sm:text-[26px]",
    badge: "text-[11px] px-2.5 py-1",
    dot: "h-3 w-3",
  },
};

export default function Logo({
  size = "md",
  showText = true,
  text = "AI Expense Tracker",
  badge = "AI",
  className = "",
  textClassName = "",
  animated = true,
}: LogoProps) {
  const conf = sizeConfig[size] || sizeConfig.md;

  return (
    <div className={`group inline-flex items-center gap-3 select-none ${className}`}>
      {/* ─── Animated Logo Icon Container ─── */}
      <div className="relative">
        {/* Continuous Rotating Ambient Neon Glow Aura */}
        {animated && (
          <div
            className={`absolute -inset-1 rounded-[inherit] bg-gradient-to-tr from-[#10b981] via-[#06b6d4] to-[#6366f1] opacity-70 blur-md transition-opacity group-hover:opacity-100 ${
              animated ? "animate-logo-spin-slow" : ""
            }`}
          />
        )}

        {/* Core Icon Box */}
        <div
          className={`relative grid place-items-center overflow-hidden border border-[#38ef7d]/40 bg-gradient-to-br from-[#0c1427] via-[#152238] to-[#0a1020] shadow-[0_8px_20px_rgba(16,185,129,0.25),0_2px_8px_rgba(99,102,241,0.2)] ${
            conf.box
          } ${animated ? "animate-logo-float animate-logo-glow" : ""}`}
        >
          {/* Continuous Glare Shimmer Sweep */}
          {animated && (
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-logo-shimmer" />
          )}

          {/* High-definition Animated SVG Icon */}
          <svg
            className={`${conf.svg} relative z-10 transition-transform duration-300 group-hover:scale-110`}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={`grad-emerald-${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="60%" stopColor="#38EF7D" />
                <stop offset="100%" stopColor="#00F2FE" />
              </linearGradient>
              <linearGradient id={`grad-indigo-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id={`grad-gold-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDE047" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Background Neural Track */}
            <path
              d="M 18 70 L 42 46 L 62 58 L 84 24"
              stroke={`url(#grad-emerald-${size})`}
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Growth Bar 1 */}
            <rect
              x="20"
              y="52"
              width="11"
              height="28"
              rx="5.5"
              fill={`url(#grad-indigo-${size})`}
            />

            {/* Growth Bar 2 */}
            <rect
              x="42"
              y="38"
              width="11"
              height="42"
              rx="5.5"
              fill={`url(#grad-emerald-${size})`}
            />

            {/* Growth Bar 3 */}
            <rect
              x="64"
              y="22"
              width="11"
              height="58"
              rx="5.5"
              fill={`url(#grad-emerald-${size})`}
            />

            {/* Currency Symbol ₹ Badge */}
            <circle
              cx="74"
              cy="72"
              r="12"
              fill="#0F172A"
              stroke={`url(#grad-gold-${size})`}
              strokeWidth="2"
            />
            <text
              x="74"
              y="76.5"
              fontFamily="system-ui, sans-serif"
              fontWeight="900"
              fontSize="12.5"
              fill={`url(#grad-gold-${size})`}
              textAnchor="middle"
            >
              ₹
            </text>

            {/* Twinkling AI Spark at Apex */}
            <g transform="translate(84, 24)" className={animated ? "animate-logo-sparkle" : ""}>
              <path
                d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z"
                fill="#FFFFFF"
              />
              <circle cx="0" cy="0" r="2" fill="#00F2FE" />
            </g>
          </svg>

          {/* Continuous Pulsing AI Status Beacon */}
          <div className="absolute bottom-1 right-1 flex items-center justify-center">
            {animated && (
              <span
                className={`absolute rounded-full bg-[#38ef7d] animate-logo-beacon ${conf.dot}`}
              />
            )}
            <span
              className={`relative rounded-full bg-[#38ef7d] shadow-[0_0_8px_#38ef7d] ${conf.dot}`}
            />
          </div>
        </div>
      </div>

      {/* ─── Logo Text Brand ─── */}
      {showText && (
        <div className="flex items-center gap-2">
          <span
            className={`font-display font-extrabold tracking-[-0.04em] text-[#172532] transition-colors group-hover:text-[#0b132b] ${conf.text} ${textClassName}`}
          >
            {text}
          </span>
          {badge && (
            <span
              className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider bg-gradient-to-r from-[#10b981]/15 to-[#6366f1]/15 border border-[#10b981]/30 text-[#0f766e] ${
                conf.badge
              }`}
            >
              <span className="h-1 w-1 rounded-full bg-[#10b981] animate-pulse" />
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
