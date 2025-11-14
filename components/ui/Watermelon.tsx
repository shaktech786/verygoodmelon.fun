'use client'

import { SVGProps } from 'react'

// Slice with subtle imperfections (not perfect circle)
export function WatermelonSlice({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      {...props}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Organic, slightly uneven outer rind */}
      <path
        d="M 20 180 Q 10 100 30 40 Q 100 5 170 40 Q 190 100 180 180 Z"
        fill="#1a4d2e"
        stroke="none"
      />

      {/* Light green layer - slightly wavy */}
      <path
        d="M 30 175 Q 20 105 40 50 Q 100 18 160 50 Q 180 105 170 175 Z"
        fill="#74c69d"
        stroke="none"
        opacity="0.9"
      />

      {/* Red flesh - hand-drawn feel */}
      <path
        d="M 40 170 Q 30 110 50 60 Q 100 30 150 60 Q 170 110 160 170 Z"
        fill="#e63946"
        stroke="none"
      />

      {/* Seeds - intentionally imperfect placement */}
      <ellipse cx="70" cy="90" rx="3" ry="5" fill="#1a1a1a" transform="rotate(15 70 90)" />
      <ellipse cx="100" cy="75" rx="2.5" ry="4.5" fill="#1a1a1a" transform="rotate(-10 100 75)" />
      <ellipse cx="130" cy="95" rx="3" ry="5" fill="#1a1a1a" transform="rotate(20 130 95)" />
      <ellipse cx="85" cy="120" rx="2.8" ry="4.8" fill="#1a1a1a" transform="rotate(-15 85 120)" />
      <ellipse cx="115" cy="110" rx="3.2" ry="5.2" fill="#1a1a1a" transform="rotate(8 115 110)" />

      {/* Highlight - adds dimension */}
      <ellipse
        cx="60"
        cy="70"
        rx="20"
        ry="15"
        fill="white"
        opacity="0.15"
        transform="rotate(-30 60 70)"
      />
    </svg>
  )
}

// Whole watermelon with stripes
export function WatermelonWhole({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      {...props}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base shape - slightly oval, not perfect circle */}
      <ellipse
        cx="100"
        cy="105"
        rx="85"
        ry="80"
        fill="#1a4d2e"
      />

      {/* Organic stripes - hand-drawn feel */}
      <path
        d="M 30 100 Q 35 80 45 70 Q 50 100 55 130"
        stroke="#0d2817"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 60 60 Q 65 80 70 100 Q 72 120 75 140"
        stroke="#0d2817"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M 100 50 Q 102 80 104 110 Q 105 135 108 155"
        stroke="#0d2817"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M 140 60 Q 138 85 136 110 Q 135 130 133 145"
        stroke="#0d2817"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M 170 100 Q 165 85 160 75 Q 155 100 152 125"
        stroke="#0d2817"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* Stem - rough, organic */}
      <path
        d="M 95 30 Q 90 25 92 20 Q 98 18 102 22 Q 105 27 100 30"
        fill="#2d5016"
        stroke="none"
      />

      {/* Highlight */}
      <ellipse
        cx="70"
        cy="80"
        rx="25"
        ry="20"
        fill="white"
        opacity="0.2"
        transform="rotate(-35 70 80)"
      />
    </svg>
  )
}

// Animated seed falling (for loading states)
export function WatermelonSeed({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg
      viewBox="0 0 20 30"
      className={className}
      style={{
        animation: `float-seed 3s ease-in-out ${delay}s infinite`,
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse
        cx="10"
        cy="15"
        rx="4"
        ry="7"
        fill="#1a1a1a"
        opacity="0.8"
      />
    </svg>
  )
}
