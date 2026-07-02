import React from "react";

// Small mark shown inside EmptyNote — same family as FlightPathScene /
// RouteStrip, scaled down to a single glyph instead of a full scene.
export default function EmptyRoute({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#E8EFFB" />
      <path
        d="M14 42 C 22 30, 30 24, 38 26 C 46 28, 44 20, 50 16"
        fill="none"
        stroke="#1D4FA0"
        strokeWidth="2"
        strokeDasharray="1.5 6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <g transform="translate(38,26) rotate(-30)">
        <path d="M0 -6 L5.5 5.5 L0 2.5 L-5.5 5.5 Z" fill="#F5921F" />
      </g>
      <circle cx="14" cy="42" r="3" fill="#1D4FA0" opacity="0.5" />
    </svg>
  );
}