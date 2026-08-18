export default function PlaceholderImage({
  label,
  aspect = "aspect-[4/3]",
  className = "",
}: {
  label: string;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex ${aspect} w-full items-center justify-center rounded-sm border border-dashed border-ink-300 bg-ink-50 p-6 text-center ${className}`}
    >
      <span className="text-sm text-foreground-muted">{label}</span>
    </div>
  );
}
