/**
 * ageru. wordmark: lowercase text, period, red dot (brand).
 */
export function AgeruWordmark({ className }: { className?: string }) {
  return (
    <span
      className={[
        "inline-flex items-baseline gap-0 font-semibold lowercase tracking-tight",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span>ageru</span>
      <span
        className="ml-[0.12em] inline-block h-[0.22em] w-[0.22em] min-h-[5px] min-w-[5px] shrink-0 translate-y-[0.08em] rounded-full bg-[#e53935]"
        aria-hidden
      />
    </span>
  );
}
