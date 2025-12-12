
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function TermsAndConditionsPage() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <section className="text-center mb-12">
          <div className="inline-block bg-primary/10 text-primary p-4 rounded-full mb-4">
              <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">
            Terms & Conditions
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-foreground/80">
            Last Updated: {lastUpdated}
          </p>
        </section>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">1. Introduction & Platform Role</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-4">
                    <p>Welcome to OMNIMALL ("the Platform"). We provide an online venue to connect individuals within the university community to buy and sell goods and services ("Items"). You acknowledge and agree that OMNIMALL's role is strictly to provide this platform. We are not a party to any agreement entered into between buyers and sellers.</p>
                    <p><strong>OMNIMALL has no control over and does not guarantee: the existence, quality, safety, or legality of items advertised; the truth or accuracy of users' content or listings; the ability of sellers to sell items; the ability of buyers to pay for items; or that a buyer or seller will actually complete a transaction.</strong></p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">2. User Accounts & Seller Registration</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-4">
                    <p>To access certain features, you must register for an account. To list items for sale, you must complete the "Become a Seller" registration process, which includes providing your seller details and a display photo. By registering, you agree to provide accurate, current, and complete information. You are responsible for safeguarding your password and for all activities that occur under your account.</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">3. User Conduct & Prohibited Activities</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-4">
                    <p>You agree not to engage in any of the following prohibited activities: listing illegal items, counterfeit goods, or stolen property; spamming other users; harassment or discriminatory behavior; intellectual property infringement; or any activity that disrupts the Platform's operations. OMNIMALL reserves the right, at its sole discretion, to remove content and suspend or terminate accounts that violate these terms without prior notice.</p>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">4. Transactions, Payments, and Liability</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-4">
                    <p>OMNIMALL is solely a platform to connect buyers and sellers. We are not involved in the actual transaction between users. All arrangements, including payment, delivery, and fulfillment, are made directly between the buyer and the seller.</p>
                    <p><strong>OMNIMALL does not process payments, handle shipments, guarantee transactions, provide escrow services, or offer buyer/seller protection. You are solely responsible for your interactions with other users and for the outcome of any transactions. We strongly advise users to take reasonable precautions, such as meeting in public places, to ensure their personal safety.</strong></p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">5. Disclaimers and Limitation of Liability</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-4">
                    <p>THE PLATFORM AND ALL ITEMS ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. OMNIMALL IS NOT RESPONSIBLE FOR THE QUALITY, SAFETY, LEGALITY, OR ACCURACY OF ITEMS LISTED.</p>
                    <p><strong>IN NO EVENT SHALL OMNIMALL, ITS CREATORS, OR AFFILIATES BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO, LOSS OF PROFITS, DATA, OR GOODWILL, OR FOR ANY DAMAGES FOR PERSONAL OR BODILY INJURY OR EMOTIONAL DISTRESS ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF, OR INABILITY TO USE, THE PLATFORM OR ANY TRANSACTION CONDUCTED THROUGH IT, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY.</strong></p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">6. Changes to Terms</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground space-y-4">
                    <p>We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new Terms and Conditions on this page. Your continued use of the Platform after any such change constitutes your acceptance of the new terms.</p>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

    