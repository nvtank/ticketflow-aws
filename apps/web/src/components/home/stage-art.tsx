export function StageArt() {
  return (
    <div className="relative mx-auto w-full max-w-lg px-4 py-8 lg:px-0" aria-hidden="true">
      <div className="absolute inset-10 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="relative rotate-3 overflow-hidden rounded-[24px] border border-white/20 bg-[#141532] shadow-[0_40px_100px_#0008]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 text-[10px] font-semibold tracking-[.22em] text-slate-300">
          <span>TIXFLOW EXPERIENCES</span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-cyan-300" />
            LIVE THE MOMENT
          </span>
        </div>
        <svg viewBox="0 0 500 390" className="w-full" fill="none">
          <defs>
            <linearGradient
              id="stage-bg"
              x1="250"
              y1="0"
              x2="250"
              y2="390"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#282158" />
              <stop offset="1" stopColor="#0b1020" />
            </linearGradient>
            <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#a78bfa" stopOpacity=".7" />
              <stop offset="1" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="beam-cyan" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#67e8f9" stopOpacity=".7" />
              <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="glow">
              <stop stopColor="#7c3aed" stopOpacity=".7" />
              <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path fill="url(#stage-bg)" d="M0 0h500v390H0z" />
          <ellipse cx="250" cy="220" rx="230" ry="200" fill="url(#glow)" />
          <path d="M100 25 0 290h320L100 25Z" fill="url(#beam)" />
          <path d="m400 25-210 265h310L400 25Z" fill="url(#beam-cyan)" />
          <path d="m200 15 40 285H80L200 15Z" fill="url(#beam-cyan)" opacity=".35" />
          <path d="m300 15 120 285H260L300 15Z" fill="url(#beam)" opacity=".4" />
          <path
            d="M60 35h380M60 28v14m380-14v14M65 43v227m370-227v227"
            stroke="#62618c"
            strokeWidth="3"
          />
          {[100, 200, 300, 400].map((x) => (
            <g key={x}>
              <rect x={x - 9} y="30" width="18" height="13" rx="3" fill="#514d7c" />
              <ellipse cx={x} cy="43" rx="7" ry="3" fill={x % 200 === 0 ? '#67e8f9' : '#c4b5fd'} />
            </g>
          ))}
          <rect
            x="100"
            y="115"
            width="300"
            height="155"
            rx="4"
            fill="#140f34"
            stroke="#8b5cf6"
            strokeOpacity=".5"
          />
          <path
            d="m110 125 130 62-130 73m280-135-130 62 130 73"
            stroke="#8b5cf6"
            strokeWidth="2"
            opacity=".5"
          />
          <text
            x="250"
            y="175"
            textAnchor="middle"
            fill="white"
            fontFamily="sans-serif"
            fontSize="17"
            fontWeight="800"
            letterSpacing="7"
          >
            FEEL THE
          </text>
          <text
            x="250"
            y="218"
            textAnchor="middle"
            fill="white"
            fontFamily="sans-serif"
            fontSize="41"
            fontWeight="900"
            letterSpacing="2"
          >
            MOMENT.
          </text>
          <path d="M70 280h360l30 24H40l30-24Z" fill="#453274" />
          <path d="M40 304h420v15H40z" fill="#201935" />
          <path d="M72 280h356" stroke="#a78bfa" strokeWidth="2" />
          <path d="M230 280v-31q20-18 40 0v31" fill="#090b1c" />
          <circle cx="250" cy="239" r="9" fill="#090b1c" />
          {Array.from({ length: 28 }, (_, i) => (
            <g key={i}>
              <ellipse
                cx={i * 19 - 8}
                cy={341 + (i % 3) * 9}
                rx="9"
                ry="11"
                fill={i % 2 ? '#111428' : '#0b0d1b'}
              />
              <path
                d={`M${i * 19 - 20} 390v-26q12-16 24 0v26`}
                fill={i % 2 ? '#111428' : '#0b0d1b'}
              />
            </g>
          ))}
          <path
            d="m90 360-16-39m16 39 9-44m231 44 17-43m-17 43-9-39"
            stroke="#111428"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="130" cy="88" r="1.5" fill="#c4b5fd" />
          <circle cx="360" cy="80" r="2" fill="#67e8f9" />
          <circle cx="425" cy="150" r="1" fill="white" />
        </svg>
        <div className="flex items-center justify-between bg-[#15172a] px-6 py-5">
          <div className="text-sm font-bold text-white">
            YOUR NEXT GREAT MEMORY
            <span className="mt-1 block text-[10px] font-normal tracking-wider text-slate-400">
              MỖI TẤM VÉ, MỘT CÂU CHUYỆN.
            </span>
          </div>
          <span className="text-3xl text-violet-400">↗</span>
        </div>
      </div>
      <div className="absolute -right-1 bottom-13 -rotate-6 rounded-xl border border-cyan-200/20 bg-[#123340] px-5 py-3 text-sm font-semibold text-cyan-200 shadow-xl">
        Hẹn bạn ở hàng ghế cảm xúc ↗
      </div>
      <div className="absolute top-0 left-0 -rotate-12 text-5xl font-thin text-violet-300">✳</div>
    </div>
  );
}
