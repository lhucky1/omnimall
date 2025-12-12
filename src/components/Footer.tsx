
"use client";

import Link from "next/link";
import { Separator } from "./ui/separator";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

const Footer = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const homePath = '/';

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="bg-secondary/40 mt-auto border-t relative z-10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
            <div>
                 <div className="flex items-center justify-center md:justify-start">
                    <Logo />
                </div>
                 <p className="text-sm text-muted-foreground mt-2">The official peer-to-peer marketplace for students.</p>
            </div>
            <div>
                <h4 className="font-semibold mb-2">Quick Links</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><Link href={homePath} className="hover:text-primary hover:underline">Home</Link></li>
                    <li><Link href="/sell" className="hover:text-primary hover:underline">Sell an Item</Link></li>
                     <li><Link href="/about" className="hover:text-primary hover:underline">About Us</Link></li>
                </ul>
            </div>
            <div>
                <h4 className="font-semibold mb-2">My Account</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><Link href="/login" className="hover:text-primary hover:underline">Login</Link></li>
                    <li><Link href="/signup" className="hover:text-primary hover:underline">Sign Up</Link></li>
                    <li><Link href="/profile" className="hover:text-primary hover:underline">My Profile</Link></li>
                </ul>
            </div>
             <div>
                <h4 className="font-semibold mb-2">Support & Legal</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    <li><Link href="/team" className="hover:text-primary hover:underline">Team & Contact</Link></li>
                    <li><Link href="/terms" className="hover:text-primary hover:underline">Terms of Service</Link></li>
                    <li><Link href="/privacy" className="hover:text-primary hover:underline">Privacy Policy</Link></li>
                </ul>
            </div>
        </div>
        <Separator className="my-6"/>
        <div className="text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} OMNIMALL. All rights reserved.</p>
             <p className="mt-1">Developed by <a href="#" className="font-semibold text-primary hover:underline">Eric Agypong Boateng</a>.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
