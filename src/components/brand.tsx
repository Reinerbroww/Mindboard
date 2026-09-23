import Link from "next/link";
import Image from "next/image";

interface BrandProps {
  className?: string;
  large?: boolean;
}

export function Brand({ className, large = false }: BrandProps) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-semibold tracking-tight text-foreground ${
        large ? "text-xl" : "text-lg"
      } ${className ?? ""}`}
    >
      <Image
        src="/logo.png"
        alt="Mindboard logo"
        width={large ? 28 : 24}
        height={large ? 28 : 24}
        className={`${large ? "h-7 w-7" : "h-6 w-6"} object-contain`}
        priority
      />
      <span>Mindboard</span>
    </Link>
  );
}