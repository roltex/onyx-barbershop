import Link from "next/link";

type Props = {
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
  variant?: "stacked" | "horizontal";
};

const heights = {
  stacked: { sm: 40, md: 52, lg: 88, hero: 280 },
  horizontal: { sm: 36, md: 44, lg: 56, hero: 72 },
} as const;

export default function BrandMark({
  href = "/",
  className = "",
  size = "md",
  variant = "horizontal",
}: Props) {
  const h = heights[variant][size];
  const src =
    variant === "horizontal" ? "/onyx-logo-horizontal.png" : "/onyx-logo.png";
  const img = (
    <img
      src={src}
      alt="Onyx Barbershop"
      className="brand-mark-img"
      style={{ height: h, width: "auto" }}
      decoding="async"
    />
  );
  if (!href) return <span className={"brand-mark " + className}>{img}</span>;
  return (
    <Link
      className={"brand-mark " + className}
      href={href}
      aria-label="Onyx Barbershop"
    >
      {img}
    </Link>
  );
}
