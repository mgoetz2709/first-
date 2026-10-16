import Image from "next/image";
import logos from "@/content/logos.json";

export default function LogoBand() {
  const items = [...logos.items, ...logos.items];

  return (
    <div className="group border-y border-ink-100 bg-surface py-10">
      <p className="mx-auto mb-6 max-w-6xl px-6 text-center text-xs font-semibold uppercase tracking-wider text-foreground-muted sm:px-8">
        {logos.heading}
      </p>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max items-center gap-16 animate-[logo-scroll_32s_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {items.map((logo, i) => (
            <div
              key={`${logo.name}-${i}`}
              className="relative h-10 w-28 shrink-0 sm:h-12 sm:w-32"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                fill
                sizes="160px"
                className="object-contain grayscale opacity-60 transition hover:grayscale-0 hover:opacity-100"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
