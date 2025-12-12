
'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedPostSkeleton() {
  return (
    <Card className="w-full overflow-hidden rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-3 w-[100px]" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4 space-y-4">
        <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
        </div>
        <Skeleton className="aspect-square w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
