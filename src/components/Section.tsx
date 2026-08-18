import { ReactNode } from "react";
import Container from "@/components/Container";

export default function Section({
  children,
  muted = false,
  className = "",
  id,
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`py-16 sm:py-24 ${muted ? "bg-surface-muted" : ""} ${className}`}
    >
      <Container>{children}</Container>
    </section>
  );
}
