
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldQuestion } from "lucide-react";
import { useEffect, useState } from "react";

export default function PrivacyPolicyPage() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <section className="text-center mb-12">
          <div className="inline-block bg-primary/10 text-primary p-4 rounded-full mb-4">
              <ShieldQuestion className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-foreground/80">
            Last Updated: {lastUpdated}
          </p>
        </section>

        <div className="space-y-8 text-muted-foreground">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">1. Information We Collect</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>We collect information you provide directly to us when you create an account, complete your seller profile, list an item, or communicate with us. This information may include:</p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li><strong>Account Information:</strong> Your name, email address, password, phone number, and location.</li>
                        <li><strong>Seller Profile Information:</strong> If you choose to become a seller, we collect your business name, contact details, and a display photo.</li>
                        <li><strong>Public Profile Information:</strong> Your display name, display photo (avatar), and location may be visible to other users.</li>
                        <li><strong>Transaction Information:</strong> Details about the products and services you buy and sell through the Platform.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">2. How We Use Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>We use the information we collect to:</p>
                     <ul className="list-disc pl-6 space-y-2">
                        <li>Provide, maintain, and improve our Platform.</li>
                        <li>Set up your public user and seller profile, including your display name and avatar.</li>
                        <li>Facilitate transactions and communication between buyers and sellers.</li>
                        <li>Communicate with you about products, services, offers, and events.</li>
                        <li>Monitor and analyze trends, usage, and activities in connection with our Services.</li>
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">3. How We Share Your Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>We may share your information in the following situations to facilitate the use of the platform:</p>
                     <ul className="list-disc pl-6 space-y-2">
                        <li><strong>With other users:</strong> When you list an item, your public seller profile (display name, avatar) is visible. When a user expresses interest in buying your item or vice-versa, we share information necessary to facilitate the transaction, which may include your contact details (phone number) to arrange for payment and pickup/delivery.</li>
                        <li><strong>For legal reasons:</strong> We may share information in response to a request for information if we believe disclosure is in accordance with, or required by, any applicable law or legal process.</li>
                    </ul>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">4. Data Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. All user-provided data is stored securely.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">5. Your Choices</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>You may update, correct, or delete your account information at any time by logging into your account and navigating to your profile. Please note that we may retain certain information as required by law or for legitimate business purposes.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">6. Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>If you have any questions about this Privacy Policy, please contact us through our contact page.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    