
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

const Logo = ({ className, onClick }: LogoProps) => {
  return (
    <Link href="/" onClick={onClick} className={cn("text-2xl font-bold text-primary font-display tracking-wider md:text-3xl", className)}>
      OMNIMALL
    </Link>
  );
};

export default Logo;
