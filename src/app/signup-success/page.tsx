
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from 'react'

function SignupSuccessContent() {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        </div>
        <Card className="w-full max-w-md animate-fade-in-up text-center bg-background/80 backdrop-blur-lg border-white/10 shadow-2xl rounded-2xl">
            <CardHeader>
                <div className="mx-auto bg-primary/10 text-primary rounded-full h-16 w-16 flex items-center justify-center mb-4">
                    <MailCheck className="h-8 w-8" />
                </div>
                <CardTitle className="text-3xl font-headline">
                    Check Your Email!
                </CardTitle>
                <CardDescription>
                    A verification link has been sent to your email address. Please check your inbox <span className="font-semibold text-destructive/80">(and spam folder)</span> to complete your registration.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                 <p className="text-sm text-muted-foreground">
                    Already verified? <Link href="/login" className="font-medium text-primary hover:underline">Log in here</Link>.
                </p>
            </CardContent>
        </Card>
      </div>
    );
}

export default function SignupSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SignupSuccessContent />
        </Suspense>
    )
}
