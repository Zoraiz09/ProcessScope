/**
 * Hand-built line-art diagram of an OS kernel core with radiating threads.
 * Echoes the "high-fidelity line art diagnostics" motif from the design.
 */
export function KernelDiagram({ className }: { className?: string }) {
  const threads = [
    { x: 70, y: 60, label: "THREAD 1" },
    { x: 300, y: 50, label: "THREAD 2" },
    { x: 360, y: 175, label: "THREAD 3" },
    { x: 250, y: 250, label: "THREAD 4" },
    { x: 90, y: 235, label: "THREAD 5" },
    { x: 30, y: 160, label: "IO" },
  ];
  const cx = 200;
  const cy = 150;

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      fill="none"
      stroke="#0B0B0B"
      strokeWidth="1.6"
    >
      {/* connection lines + sparks */}
      {threads.map((t, i) => (
        <g key={i}>
          <line x1={cx} y1={cy} x2={t.x} y2={t.y} strokeDasharray="4 3" opacity="0.7" />
          {/* spark burst */}
          <g stroke="#84CC16" strokeWidth="1.4">
            <line x1={t.x - 7} y1={t.y} x2={t.x + 7} y2={t.y} />
            <line x1={t.x} y1={t.y - 7} x2={t.x} y2={t.y + 7} />
            <line x1={t.x - 5} y1={t.y - 5} x2={t.x + 5} y2={t.y + 5} />
            <line x1={t.x - 5} y1={t.y + 5} x2={t.x + 5} y2={t.y - 5} />
          </g>
        </g>
      ))}

      {/* thread node boxes */}
      {threads.map((t, i) => (
        <g key={`box-${i}`}>
          <rect
            x={t.x - 14}
            y={t.y - 10}
            width="28"
            height="20"
            fill="#FFFFFF"
            transform={`rotate(${(i % 2 ? -8 : 8)} ${t.x} ${t.y})`}
          />
          <text
            x={t.x}
            y={t.y + 26}
            fontSize="6.5"
            fontFamily="monospace"
            fill="#0B0B0B"
            textAnchor="middle"
            stroke="none"
            letterSpacing="0.5"
          >
            {t.label}
          </text>
        </g>
      ))}

      {/* central core hexagon */}
      <polygon
        points="200,108 236,128 236,172 200,192 164,172 164,128"
        fill="#BEF264"
        strokeWidth="2"
      />
      <polygon
        points="200,122 222,134 222,166 200,178 178,166 178,134"
        fill="#FFFFFF"
        strokeWidth="1.4"
      />
      <circle cx={cx} cy={cy} r="7" fill="#0B0B0B" stroke="none" />

      {/* core / kernel labels */}
      <text x="200" y="100" fontSize="9" fontFamily="monospace" fontWeight="700" fill="#0B0B0B" textAnchor="middle" stroke="none">
        CORE
      </text>
      <text x="270" y="150" fontSize="9" fontFamily="monospace" fontWeight="700" fill="#0B0B0B" textAnchor="start" stroke="none">
        KERNEL
      </text>
    </svg>
  );
}
