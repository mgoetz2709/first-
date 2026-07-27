import { ReactNode } from "react";
import Container from "@/components/Container";

export default function Section({
  children,
  muted = false,
  className = "",
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <section className={`py-16 sm:py-24 ${muted ? "bg-surface-muted" : ""} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}
