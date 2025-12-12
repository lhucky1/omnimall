
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Cpu, Lightbulb } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary tracking-tight">
            About OMNIMALL
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-foreground/80">
            Connecting the university community, one transaction at a time.
          </p>
        </section>

        <section className="mb-16">
            <Card className="overflow-hidden shadow-lg">
                 <div className="w-full aspect-video bg-gray-100 flex items-center justify-center p-8">
                    <Image
                        src="https://j5uhsgqzs908.space.minimax.io/image2.jpg"
                        alt="OMNIMALL Logo"
                        width={800}
                        height={500}
                        className="object-contain rounded-t-lg"
                        data-ai-hint="logo"
                        />
                </div>
                <CardContent className="p-6 md:p-8">
                     <p className="text-lg md:text-xl text-center leading-relaxed">
                        OMNIMALL is a dedicated online platform designed for university students and faculty. Our mission is to create a secure, centralized, and user-friendly hub where members of the university community can effortlessly buy, sell, and trade goods and services.
                    </p>
                </CardContent>
            </Card>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold font-headline text-center mb-8">What We Offer</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 text-left">
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <ShoppingCart className="w-6 h-6"/>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold">Buy & Sell with Ease</h3>
                    <p className="mt-1 text-muted-foreground">From textbooks and electronics to handmade crafts and event tickets, our platform makes it simple to list your items or find exactly what you need on campus.</p>
                </div>
            </div>
             <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="w-6 h-6"/>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold">For Students, By Students</h3>
                    <p className="mt-1 text-muted-foreground">Built with the needs of the university community in mind, fostering a trusted peer-to-peer environment for commerce and connection.</p>
                </div>
            </div>
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Lightbulb className="w-6 h-6"/>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold">Seller-Focused Tools</h3>
                    <p className="mt-1 text-muted-foreground">Manage your inventory, track product views, and handle orders through a simple and intuitive dashboard designed to help you succeed.</p>
                </div>
            </div>
          </div>
        </section>

        <section className="bg-card border rounded-lg p-8">
            <h2 className="text-2xl font-bold font-headline text-center mb-4">The Creator</h2>
             <p className="text-center text-muted-foreground max-w-2xl mx-auto">
                This platform was conceptualized and developed by <strong className="text-primary">Eric Agypong Boateng</strong>, a forward-thinking Business Administration student. His vision was to apply modern technology to solve a practical need within our university, creating a more connected and resourceful campus for everyone.
            </p>
        </section>
      </div>
    </div>
  );
}
