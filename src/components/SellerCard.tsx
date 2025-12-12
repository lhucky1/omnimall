

"use client";

import Image from "next/image";
import Link from "next/link";
import type { UserProfile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerCardProps {
  seller: UserProfile;
  className?: string;
}

export default function SellerCard({ seller, className }: SellerCardProps) {

  return (
     <Link href={`/sellers/${seller.uid}?from=home`} className={cn("group text-center", className)}>
        <div className="relative flex flex-col items-center">
            <Avatar className="h-24 w-24 border-4 border-background group-hover:border-primary transition-colors shadow-md">
                <AvatarImage src={seller.avatar_url || ''} />
                <AvatarFallback className="bg-secondary">
                    <User className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
            </Avatar>
            <p className="mt-2 text-sm font-semibold text-foreground truncate w-full">{seller.display_name}</p>
            <p className="text-xs text-muted-foreground">View Store</p>
        </div>
    </Link>
  );
}

    
