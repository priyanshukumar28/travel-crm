import React from "react";

// A slim, low-key echo of FlightPathScene's dashed route + plane motif —
// used behind dashboard headers so the brand mark shows up consistently
// without repeating a full illustration on every page.
export default function RouteStrip({ className }) {
  return (
    <svg viewBox="0 0 900 90" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M 10 70 C 160 20, 320 90, 480 40 C 620 0, 740 55, 890 20"
        fill="none"
        stroke="#F5921F"
        strokeWidth="2"
        strokeDasharray="2 10"
        strokeLinecap="round"
        opacity="0.55"
      />
      <circle cx="10" cy="70" r="4" fill="#F5921F" opacity="0.8" />
      <circle cx="890" cy="20" r="4" fill="#1D4FA0" opacity="0.6" />
      <g transform="translate(480,40) rotate(-18)">
        <path d="M0 -8 L7 7 L0 3.5 L-7 7 Z" fill="#1D4FA0" opacity="0.75" />
      </g>
    </svg>
  );
}