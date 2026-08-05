export function ReallowMark({ className }: { className?: string }) {
  return (
    <svg viewBox="558 222 264 282" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="reallow-gold" x1="759" y1="304" x2="628" y2="446" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D1B276" />
          <stop offset="100%" stopColor="#84693A" />
        </linearGradient>
      </defs>
      <path
        fill="url(#reallow-gold)"
        fillRule="evenodd"
        d="M690,321 L689,336 L695,338 L704,337 L705,323 L703,321 Z M671,321 L670,336 L685,337 L686,323 L684,321 Z M652,304 L626,324 L626,481 L630,484 L709,483 L710,460 L708,457 L656,456 L656,305 Z M719,303 L719,483 L799,484 L802,482 L801,457 L748,456 L748,324 L741,317 Z M689,302 L689,317 L704,317 L705,303 L703,301 Z M670,302 L670,317 L685,317 L685,302 Z M578,321 L587,339 L591,342 L687,272 L783,342 L787,339 L797,322 L791,315 L751,286 L751,253 L749,247 L720,247 L719,262 L717,263 L689,242 L685,242 L641,275 L588,312 Z"
      />
    </svg>
  );
}

export function ReallowLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <ReallowMark className="h-7 w-auto" />
      <span className="font-display text-lg font-semibold tracking-tight">Reallow</span>
    </span>
  );
}
