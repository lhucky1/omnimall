
"use client";

import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase";
import { Loader2, Minus, Plus, ShoppingCart, Trash2, Store, Truck, Pencil } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { handleBulkSmsNotification } from "@/app/actions/orders";


const supabase = createClient();

const shippingFormSchema = z.object({
  buyerName: z.string().min(2, "Name is required."),
  buyerPhone: z.string().min(10, "A valid phone number is required."),
  deliveryAddress: z.string().min(5, "A delivery address is required."),
});

type ShippingFormValues = z.infer<typeof shippingFormSchema>;


export default function CartPage() {
    const { cart, updateQuantity, removeFromCart, cartTotal, itemCount, clearCart } = useCart();
    const { user, userProfile, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
    const [orderNotes, setOrderNotes] = useState('');
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);
    const [showSubmitSlowLoadMessage, setShowSubmitSlowLoadMessage] = useState(false);

    const [shippingDetails, setShippingDetails] = useState<ShippingFormValues>({
        buyerName: '',
        buyerPhone: '',
        deliveryAddress: '',
    });

    const form = useForm<ShippingFormValues>({
        resolver: zodResolver(shippingFormSchema),
        defaultValues: shippingDetails,
    });

     useEffect(() => {
        const timer = setTimeout(() => {
            if (authLoading || !user) {
                setShowSlowLoadMessage(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [authLoading, user]);
    
     useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isSubmitting) {
            timer = setTimeout(() => {
                setShowSubmitSlowLoadMessage(true);
            }, 5000);
        } else {
            setShowSubmitSlowLoadMessage(false);
        }
        return () => clearTimeout(timer);
    }, [isSubmitting]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

     useEffect(() => {
        if (userProfile) {
            const initialDetails = {
                buyerName: userProfile.display_name || "",
                buyerPhone: userProfile.phone_number || "",
                deliveryAddress: userProfile.location || "",
            };
            setShippingDetails(initialDetails);
            form.reset(initialDetails);
        }
    }, [userProfile, form]);

    const isDeliveryAvailable = useMemo(() => {
        return cart.every(item => item.delivery_option !== 'none');
    }, [cart]);

    const hasLocationBasedDelivery = useMemo(() => {
        return cart.some(item => item.delivery_option === 'based_on_location');
    }, [cart]);

    const deliveryFee = useMemo(() => {
        if (!isDeliveryAvailable || deliveryMethod !== 'delivery') return 0;
        
        return cart.reduce((total, item) => {
             if (item.delivery_option === 'paid' && item.delivery_price) {
                return total + (Number(item.delivery_price) || 0);
            }
            return total;
        }, 0);
    }, [cart, isDeliveryAvailable, deliveryMethod]);

    const finalTotal = useMemo(() => {
        return cartTotal + deliveryFee;
    }, [cartTotal, deliveryFee]);


    const handleCheckout = async () => {
        if (!user || !userProfile) {
            toast({ title: "Please log in", description: "You need to be logged in to place an order.", variant: "destructive" });
            router.push('/login');
            return;
        }

        setIsSubmitting(true);
        
        try {
            const createdOrderIds = [];
            for (const item of cart) {
                const itemSubtotal = item.price * item.quantity;
                let itemDeliveryFee = 0;
                if (deliveryMethod === 'delivery' && (item.delivery_option !== 'none')) {
                    if (item.delivery_option === 'paid' && item.delivery_price) {
                        itemDeliveryFee = (Number(item.delivery_price) || 0);
                    }
                    // Fee is 0 for 'free' and 'based_on_location' at checkout time
                }
                const itemFinalTotal = itemSubtotal + itemDeliveryFee;

                const orderItem = {
                    buyer_uid: user.id,
                    product_id: item.id,
                    quantity: item.quantity,
                    total_price: itemSubtotal,
                    status: 'pending' as const,
                    delivery_method: deliveryMethod,
                    delivery_fee: itemDeliveryFee,
                    final_total: itemFinalTotal,
                    buyer_name: shippingDetails.buyerName,
                    buyer_phone: shippingDetails.buyerPhone,
                    delivery_address: deliveryMethod === 'delivery' ? shippingDetails.deliveryAddress : item.location,
                    order_notes: orderNotes,
                };
                
                const { data: insertedOrder, error } = await supabase.from('orders').insert(orderItem).select('id').single();
                if (error) throw error;
                if (insertedOrder) {
                    createdOrderIds.push(insertedOrder.id);
                }
            }

            // After all orders are created, send SMS notifications
            if (createdOrderIds.length > 0) {
              await handleBulkSmsNotification(createdOrderIds);
            }


            toast({
                title: "Order Requests Sent!",
                description: "The seller(s) have been notified. They will contact you to arrange payment and fulfillment.",
            });
            
            clearCart();
            router.push('/products');

        } catch (error: any) {
            console.error("Order submission error:", error);
            toast({
                title: "Order Failed",
                description: "Could not submit your order request. " + error.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

     const onShippingSubmit = (values: ShippingFormValues) => {
        setShippingDetails(values);
    };

    if (authLoading || !user) {
        return (
            <div className="flex h-screen flex-col items-center justify-center -mt-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
            </div>
        );
    }
    
    if (itemCount === 0) {
        return (
            <div className="container mx-auto px-4 py-8 text-center py-20">
                <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-semibold">Your Cart is Empty</h2>
                <p className="mt-2 text-muted-foreground">Looks like you haven't added anything to your cart yet.</p>
                <Button asChild className="mt-6">
                    <Link href="/products">Continue Shopping</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold font-headline mb-8">Your Shopping Cart</h1>
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {cart.map(item => (
                        <Card key={item.id} className="flex items-center gap-4 p-4">
                            <div className="relative h-24 w-24 rounded-md overflow-hidden flex-shrink-0">
                                <Image src={item.image_urls![0]} alt={item.name} fill className="object-cover" />
                            </div>
                            <div className="flex-grow">
                                <Link href={`/products/${item.id}`} className="font-semibold hover:underline">{item.name}</Link>
                                <p className="text-sm text-muted-foreground">GHC {item.price.toFixed(2)}</p>
                                <div className="flex items-center gap-2 mt-2">
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                                    <Input type="number" value={item.quantity} readOnly className="w-14 h-8 text-center" />
                                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold">GHC {(item.price * item.quantity).toFixed(2)}</p>
                                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive mt-2" onClick={() => removeFromCart(item.id)}>
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <RadioGroup value={deliveryMethod} onValueChange={(value: any) => setDeliveryMethod(value)}>
                                <Label htmlFor="pickup" className="flex items-center gap-3 p-4 border rounded-md has-[:checked]:border-primary">
                                    <RadioGroupItem value="pickup" id="pickup"/>
                                    <Store className="h-6 w-6 text-primary"/>
                                    <div>
                                        <p className="font-semibold">Pickup</p>
                                        <p className="text-xs text-muted-foreground">Arrange pickup with the seller.</p>
                                    </div>
                                </Label>
                                <Label htmlFor="delivery" className={`flex items-center gap-3 p-4 border rounded-md ${!isDeliveryAvailable ? 'cursor-not-allowed opacity-50' : 'has-[:checked]:border-primary'}`}>
                                    <RadioGroupItem value="delivery" id="delivery" disabled={!isDeliveryAvailable}/>
                                    <Truck className="h-6 w-6 text-primary"/>
                                    <div>
                                        <p className="font-semibold">Home Delivery</p>
                                        {!isDeliveryAvailable ? (
                                             <p className="text-xs text-destructive">Not available for all items</p>
                                        ) : hasLocationBasedDelivery ? (
                                            <p className="text-xs text-muted-foreground">Fee to be arranged with seller</p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">Fee: GHC {deliveryFee.toFixed(2)}</p>
                                        )}
                                    </div>
                                </Label>
                            </RadioGroup>
                            
                            <Separator />
                            
                             <Card className="bg-muted/30">
                                <CardHeader className="flex-row items-center justify-between p-4">
                                    <CardTitle className="text-base">Shipping Details</CardTitle>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                             <Button variant="ghost" size="sm"><Pencil className="mr-2 h-3 w-3"/>Edit</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Edit Shipping Details</DialogTitle>
                                                <DialogDescription>Update your contact and delivery info for this order.</DialogDescription>
                                            </DialogHeader>
                                             <Form {...form}>
                                                <form onSubmit={form.handleSubmit(onShippingSubmit)} className="space-y-4 py-4">
                                                    <FormField control={form.control} name="buyerName" render={({ field }) => (
                                                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                                    )}/>
                                                     <FormField control={form.control} name="buyerPhone" render={({ field }) => (
                                                        <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                                    )}/>
                                                    <FormField control={form.control} name="deliveryAddress" render={({ field }) => (
                                                        <FormItem><FormLabel>Delivery Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                                    )}/>
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button type="submit">Save Details</Button></DialogClose>
                                                    </DialogFooter>
                                                </form>
                                            </Form>
                                        </DialogContent>
                                    </Dialog>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
                                    <p className="font-medium text-foreground">{shippingDetails.buyerName}</p>
                                    <p>{shippingDetails.buyerPhone}</p>
                                    <p>{shippingDetails.deliveryAddress}</p>
                                </CardContent>
                            </Card>

                            <div>
                                <Label htmlFor="orderNotes" className="text-base font-semibold">Additional Notes</Label>
                                <Textarea 
                                    id="orderNotes"
                                    placeholder="e.g., specific delivery instructions, color preference..." 
                                    value={orderNotes}
                                    onChange={(e) => setOrderNotes(e.target.value)}
                                    className="mt-2"
                                />
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>GHC {cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Delivery Fee</span>
                                    <span>
                                        {deliveryMethod === 'delivery' && hasLocationBasedDelivery 
                                            ? 'To be arranged' 
                                            : `GHC ${deliveryFee.toFixed(2)}`
                                        }
                                    </span>
                                 </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-lg">
                                    <span>Total</span>
                                    <span>GHC {finalTotal.toFixed(2)}</span>
                                </div>
                                {deliveryMethod === 'delivery' && hasLocationBasedDelivery && (
                                    <p className="text-xs text-muted-foreground text-right">
                                        + delivery fee to be arranged with seller(s).
                                    </p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col">
                            <Button size="lg" className="w-full" onClick={handleCheckout} disabled={isSubmitting || !shippingDetails.buyerName}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Complete Order Request
                            </Button>
                            {isSubmitting && showSubmitSlowLoadMessage && (
                                <p className="mt-2 text-sm text-muted-foreground text-center">Taking too long? Please refresh and try again.</p>
                            )}
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
