

"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Product, UserProfile, Order } from "@/types";
import { useEffect, useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Eye, Edit, ShoppingBag, TrendingUp, Inbox, Package, Check, X, Store, Truck, Clock, CheckCircle, XCircle, User as UserIcon, ChevronRight, Phone, ArrowLeft, Archive } from "lucide-react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { approveAndDeductStock } from "@/app/actions/orders";

const supabase = createClient();

export default function ProfilePage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [userProducts, setUserProducts] = useState<Product[]>([]);
    const [purchaseHistory, setPurchaseHistory] = useState<Order[]>([]);
    const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
    const [isFetchingData, setIsFetchingData] = useState(true);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("incoming-orders");
    const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu');
    const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

    const fetchAllData = async () => {
        if (!user) return;
        setIsFetchingData(true);
        try {
            // Fetch user's product listings
            const { data: productsData, error: productsError } = await supabase
                .from('products')
                .select('*')
                .eq('seller_uid', user.id)
                .order('created_at', { ascending: false });
            if (productsError) throw productsError;
            setUserProducts(productsData as Product[]);

            // Fetch user's purchase history
            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('*')
                .eq('buyer_uid', user.id)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            if (ordersData && ordersData.length > 0) {
                const productIds = [...new Set(ordersData.map(o => o.product_id))];
                const { data: productDetails, error: productDetailsError } = await supabase
                    .from('products')
                    .select('*, seller:profiles!products_seller_uid_fkey(display_name, avatar_url)')
                    .in('id', productIds);
                
                if (productDetailsError) throw productDetailsError;

                const ordersWithProducts = ordersData.map(order => {
                    const product = productDetails.find(p => p.id === order.product_id);
                    return { ...order, product: product || null };
                }).filter(o => o.product);

                setPurchaseHistory(ordersWithProducts as any[]);
            } else {
                setPurchaseHistory([]);
            }
            
            // Fetch incoming orders for the user's products
            const userProductIds = productsData.map(p => p.id);
            if (userProductIds.length > 0) {
                const { data: incomingOrdersData, error: incomingOrdersError } = await supabase
                .from('orders')
                .select('*, product:products(name, id, image_urls, quantity, is_unlimited)')
                .in('product_id', userProductIds)
                .order('created_at', { ascending: false });

                if (incomingOrdersError) throw incomingOrdersError;
                setIncomingOrders(incomingOrdersData as any[]);
            }

        } catch (error: any) {
             console.error("Error fetching profile data: ", error);
             toast({ title: "Error", description: "Could not fetch your profile data.", variant: "destructive" });
        }
        setIsFetchingData(false);
    };
    
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading || isFetchingData) {
                setShowSlowLoadMessage(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading, isFetchingData]);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if(user) {
             fetchAllData();
        }
    }, [user, loading, router]);
    
    
    const deleteProductImages = async (imageUrls: string[]) => {
        if (!imageUrls || imageUrls.length === 0) return;
        const filePaths = imageUrls.map(url => new URL(url).pathname.split('/public/product-images/')[1]).filter(Boolean);
        if (filePaths.length > 0) {
            await supabase.storage.from('product-images').remove(filePaths);
        }
    }

    const handleDeleteProduct = async (product: Product) => {
        if (!user) return;
        setDeletingProductId(product.id);
        try {
            await deleteProductImages(product.image_urls!);
            const { error: dbError } = await supabase.from('products').delete().eq('id', product.id);
            if (dbError) throw dbError;
            setUserProducts(prev => prev.filter(p => p.id !== product.id));
            toast({ title: "Product Deleted", description: `${product.name} has been removed.` });
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Could not delete the product.", variant: "destructive" });
        } finally {
            setDeletingProductId(null);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!user) return;
        setDeletingOrderId(orderId);
        try {
            const { error } = await supabase.from('orders').delete().eq('id', orderId);
            if (error) throw error;
            setIncomingOrders(prev => prev.filter(o => o.id !== orderId));
            toast({ title: "Order Deleted", description: "The order request has been removed." });
        } catch (error: any) {
             toast({ title: "Error", description: error.message || "Could not delete the order.", variant: "destructive" });
        } finally {
            setDeletingOrderId(null);
        }
    };
    
    const handleUpdateOrderStatus = async (order: Order, newStatus: 'approved' | 'declined') => {
        setUpdatingOrderId(order.id);
        if (newStatus === 'approved') {
            const product = order.product;
            if (product && !product.is_unlimited && product.quantity !== null && product.quantity < order.quantity) {
                toast({
                    title: "Insufficient Stock",
                    description: `Cannot approve order. Only ${product.quantity} of ${product.name} left in stock.`,
                    variant: "destructive"
                });
                setUpdatingOrderId(null);
                return;
            }
            const result = await approveAndDeductStock(order.id, order.product_id, order.quantity);
            if (result.success) {
                await fetchAllData();
                toast({ title: 'Order Approved', description: 'Stock has been updated.' });
            } else {
                 toast({ title: "Error", description: result.error || "Could not approve order or update stock.", variant: "destructive" });
            }
        } else { // Handle decline
            try {
                const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
                if (error) throw error;
                setIncomingOrders(prevOrders => prevOrders.map(o => o.id === order.id ? {...o, status: newStatus} : o));
                toast({ title: 'Order Declined' });
            } catch (error: any) {
                toast({ title: "Error", description: "Could not decline order.", variant: "destructive" });
            }
        }
        setUpdatingOrderId(null);
    };

    const analyticsData = useMemo(() => {
        const approvedProducts = userProducts.filter(p => p.status === 'approved');
        const totalViews = approvedProducts.reduce((sum, p) => sum + (p.view_count || 0), 0);
        const topViewedProduct = approvedProducts.length > 0 
            ? approvedProducts.sort((a,b) => (b.view_count || 0) - (a.view_count || 0))[0]
            : null;
        return { totalViews, topViewedProduct, approvedProductsCount: approvedProducts.length };
    }, [userProducts]);

    if (loading || !user) {
        return (
            <div className="text-center py-10 flex flex-col items-center justify-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
            </div>
        );
    }

    const ProductStatusIcon = ({ status }: { status: Product['status'] }) => {
        switch (status) {
            case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return null;
        }
    };
    
    const handleMobileNav = (tab: string) => {
        setActiveTab(tab);
        setMobileView('content');
    };


    const dashboardSections = [
        {
            value: "incoming-orders",
            title: "Incoming Orders",
            description: "Review and manage order requests from buyers.",
            icon: Inbox,
        },
        {
            value: "my-listings",
            title: "My Product Listings",
            description: "Manage your products and view their performance.",
            icon: ShoppingBag
        },
        {
            value: "my-purchases",
            title: "My Purchase History",
            description: "A log of all the order requests you've placed.",
            icon: Package
        },
        {
            value: "dashboard",
            title: "Seller Dashboard",
            description: "An overview of your product performance.",
            icon: TrendingUp
        },
    ];

    const currentSection = dashboardSections.find(s => s.value === activeTab);

    const OrderDetailsContent = ({order}: {order: Order}) => (
        <div className="space-y-4 py-4">
            <div className="space-y-2 rounded-lg border p-4">
                <h4 className="font-semibold">Buyer Details</h4>
                <div>
                    <p className="font-medium">{order.buyer_name || 'Buyer'}</p>
                    {order.buyer_phone && (
                        <a href={`tel:${order.buyer_phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                            <Phone className="h-4 w-4" />
                            {order.buyer_phone}
                        </a>
                    )}
                    <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                </div>
            </div>
            {order.order_notes && (
                 <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
                    <h4 className="font-semibold">Buyer's Notes</h4>
                    <p className="text-sm text-muted-foreground italic">"{order.order_notes}"</p>
                </div>
            )}
            <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                    <Image src={(order.product as any).image_urls?.[0] || 'https://placehold.co/100x100.png'} alt={order.product.name} fill className="object-cover" />
                </div>
                <div>
                    <p className="font-semibold">{order.product.name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {order.quantity}</p>
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2">Fulfillment</h4>
                <div className="flex items-center gap-2 text-sm capitalize text-muted-foreground">
                    {order.delivery_method === 'delivery' ? <Truck className="h-4 w-4 text-primary"/> : <Store className="h-4 w-4 text-primary"/>}
                    {order.delivery_method}
                </div>
            </div>
            <div>
                <h4 className="font-semibold mb-2">Pricing</h4>
                <div className="text-sm space-y-2">
                    <div className="flex justify-between"><span>Subtotal:</span><span>GHC {Number(order.total_price).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Delivery Fee:</span><span>GHC {Number(order.delivery_fee).toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base"><span>Total:</span><span>GHC {Number(order.final_total).toFixed(2)}</span></div>
                </div>
            </div>
        </div>
    );

    const OrderDialogFooter = ({order}: {order: Order}) => (
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
             {order.status === 'pending' ? (
                <>
                    <Button variant="outline" size="sm" onClick={() => handleUpdateOrderStatus(order, 'approved')} disabled={updatingOrderId === order.id}>
                        {updatingOrderId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />} Approve
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleUpdateOrderStatus(order, 'declined')} disabled={updatingOrderId === order.id}>
                        {updatingOrderId === order.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4" />} Decline
                    </Button>
                </>
            ) : (
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm" disabled={deletingOrderId === order.id}>{deletingOrderId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4"/>}<span className="ml-2">Delete</span></Button></AlertDialogTrigger>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this order?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this order request.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><DialogClose asChild><AlertDialogAction onClick={() => handleDeleteOrder(order.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></DialogClose></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            )}
             <DialogClose asChild><Button type="button">Close</Button></DialogClose>
        </DialogFooter>
    );

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                     <Avatar className="h-16 w-16 border-2 border-primary">
                        <AvatarImage src={userProfile?.avatar_url || ''} alt={userProfile?.display_name || ''} />
                        <AvatarFallback>
                            {userProfile?.display_name ? userProfile.display_name.charAt(0).toUpperCase() : <UserIcon />}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle>Welcome, {userProfile?.display_name || user?.email}</CardTitle>
                        <CardDescription>{userProfile?.email}</CardDescription>
                        {userProfile?.phone_number && <CardDescription>Phone: {userProfile.phone_number}</CardDescription>}
                        {userProfile?.location && <CardDescription>Location: {userProfile.location}</CardDescription>}
                    </div>
                </CardHeader>
            </Card>

            {/* Mobile View */}
            <div className="md:hidden">
                {mobileView === 'menu' ? (
                     <div className="space-y-4">
                        {dashboardSections.map(section => (
                             <Card key={section.value} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleMobileNav(section.value)}>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-primary/10 text-primary p-3 rounded-lg">
                                            <section.icon className="h-6 w-6"/>
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{section.title}</CardTitle>
                                            <CardDescription>{section.description}</CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </CardHeader>
                             </Card>
                        ))}
                    </div>
                ) : (
                    <div>
                        <Button variant="outline" onClick={() => setMobileView('menu')} className="mb-4 text-primary border-primary">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                        </Button>
                        <div className={cn(activeTab !== 'incoming-orders' && 'hidden', 'w-full')}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Incoming Orders</CardTitle>
                                    <CardDescription>Review and manage order requests from buyers.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                   {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                                    : incomingOrders.length === 0 ? <div className="text-center py-10"><Inbox className="mx-auto h-16 w-16 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No pending orders</h3><p className="text-muted-foreground">You don't have any incoming order requests right now.</p></div>
                                    : (<div className="w-full overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Total</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {incomingOrders.map((order) => (
                                                <Dialog key={order.id}>
                                                    <DialogTrigger asChild>
                                                         <TableRow className="cursor-pointer">
                                                            <TableCell className="font-medium">
                                                                <div>{order.product.name}</div>
                                                                <div className="text-xs text-muted-foreground mt-1">{order.buyer_name || 'N/A'}</div>
                                                            </TableCell>
                                                            <TableCell>GHC {Number(order.final_total).toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">
                                                                 <Badge variant={order.status === 'pending' ? 'secondary' : order.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{order.status}</Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-lg">
                                                        <DialogHeader>
                                                            <DialogTitle>Order Details</DialogTitle>
                                                            <DialogDescription>Submitted on {format(new Date(order.created_at), 'PPP')}</DialogDescription>
                                                        </DialogHeader>
                                                        <OrderDetailsContent order={order} />
                                                        <OrderDialogFooter order={order} />
                                                    </DialogContent>
                                                </Dialog>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                   )}
                                </CardContent>
                            </Card>
                        </div>
                        <div className={cn(activeTab !== 'my-listings' && 'hidden', 'w-full')}>
                           <Card>
                                <CardHeader><CardTitle>My Product Listings</CardTitle><CardDescription>Manage your products and view their performance.</CardDescription></CardHeader>
                                <CardContent>
                                    {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                                    : userProducts.length === 0 ? <div className="text-center py-10"><p>You haven't listed any products yet.</p><Button asChild variant="link"><Link href="/sell">List a Product</Link></Button></div>
                                    : (<div className="w-full overflow-x-auto"><Table>
                                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>{userProducts.map((product) => (<TableRow key={product.id} className={product.status === 'rejected' ? 'bg-red-500/10' : ''}>
                                            <TableCell className="font-medium">
                                                <div>{product.name}</div>
                                                <div className="text-xs text-muted-foreground">GHC {product.price.toFixed(2)}</div>
                                            </TableCell>
                                            <TableCell>
                                                {product.type === 'product' ? (
                                                    product.is_unlimited ? <Badge variant="secondary">Unlimited</Badge> : 
                                                    <span className={cn(product.quantity !== null && product.quantity < 5 && 'text-destructive font-bold')}>{product.quantity} left</span>
                                                ) : <Badge variant="outline">N/A</Badge>}
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" asChild className="h-8 w-8"><Link href={`/products/${product.id}`}><Eye className="h-4 w-4"/></Link></Button>
                                                <Button variant="outline" size="icon" asChild className="h-8 w-8" disabled={product.status === 'pending'}><Link href={`/edit-product/${product.id}`}><Edit className="h-4 w-4"/></Link></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" disabled={deletingProductId === product.id}>{deletingProductId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4"/>}</Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete {product.name}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this listing and its images.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteProduct(product)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>))}
                                        </TableBody>
                                    </Table></div>)}
                                </CardContent>
                            </Card>
                        </div>
                         <div className={cn(activeTab !== 'my-purchases' && 'hidden', 'w-full')}>
                             <Card>
                                <CardHeader><CardTitle>My Purchase History</CardTitle><CardDescription>A log of all the order requests you've placed.</CardDescription></CardHeader>
                                <CardContent>
                                   {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                                    : purchaseHistory.length === 0 ? <div className="text-center py-10"><Package className="mx-auto h-16 w-16 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No purchase history</h3><p className="text-muted-foreground">You haven't placed any order requests yet.</p><Button asChild variant="link" className="mt-2"><Link href="/products">Start Shopping</Link></Button></div>
                                    : (<div className="w-full overflow-x-auto"><Table>
                                        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                                        <TableBody>{purchaseHistory.map((order) => (<TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/products/${order.product.id}`} className="hover:underline">{order.product.name}</Link>
                                            <div className="text-xs text-muted-foreground mt-1">Sold by {(order.product as any).seller?.display_name || 'N/A'}</div>
                                        </TableCell>
                                        <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                                        <TableCell><Badge variant={order.status === 'pending' ? 'secondary' : order.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{order.status}</Badge></TableCell>
                                        <TableCell className="text-right font-medium">GHC {Number(order.final_total).toFixed(2)}</TableCell></TableRow>))}</TableBody>
                                    </Table></div>)}
                                </CardContent>
                            </Card>
                        </div>
                        <div className={cn(activeTab !== 'dashboard' && 'hidden', 'w-full')}>
                            <Card>
                                <CardHeader><CardTitle>Seller Dashboard</CardTitle><CardDescription>An overview of your product performance.</CardDescription></CardHeader>
                                <CardContent className="space-y-8">
                                   {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                                   : userProducts.length === 0 ? <div className="text-center py-10"><p>You haven't listed any products yet.</p><Button asChild variant="link"><Link href="/sell">List a Product</Link></Button></div>
                                   : (<>
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Listings</CardTitle><ShoppingBag className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{analyticsData.approvedProductsCount}</div><p className="text-xs text-muted-foreground">approved products</p></CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Views</CardTitle><Eye className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{analyticsData.totalViews}</div><p className="text-xs text-muted-foreground">on approved items</p></CardContent>
                                            </Card>
                                             <Card>
                                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Top Viewed</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                                <CardContent><div className="text-lg font-bold truncate">{analyticsData.topViewedProduct?.name || 'N/A'}</div><p className="text-xs text-muted-foreground">{analyticsData.topViewedProduct?.view_count || 0} views</p></CardContent>
                                            </Card>
                                        </div>
                                    </>
                                   )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Desktop View */}
            <Tabs defaultValue="incoming-orders" value={activeTab} onValueChange={setActiveTab} className="hidden md:block w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto md:h-10">
                    {dashboardSections.map(section => (
                        <TabsTrigger key={section.value} value={section.value}>
                            {section.title}
                        </TabsTrigger>
                    ))}
                </TabsList>
                
                <div className="mt-6">
                 <TabsContent value="incoming-orders">
                   <Card>
                        <CardHeader><CardTitle>Incoming Orders</CardTitle><CardDescription>Review and manage order requests from buyers.</CardDescription></CardHeader>
                        <CardContent>
                           {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                            : incomingOrders.length === 0 ? <div className="text-center py-10"><Inbox className="mx-auto h-16 w-16 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No pending orders</h3><p className="text-muted-foreground">You don't have any incoming order requests right now.</p></div>
                            : (<div className="w-full overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="hidden md:table-cell">Buyer</TableHead>
                                            <TableHead>Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {incomingOrders.map((order) => (
                                        <Dialog key={order.id}>
                                            <DialogTrigger asChild>
                                                 <TableRow className="cursor-pointer">
                                                    <TableCell className="font-medium">
                                                        <div>{order.product.name}</div>
                                                        <div className="md:hidden text-xs text-muted-foreground mt-1">{order.buyer_name || 'N/A'}</div>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">{order.buyer_name || 'N/A'}</TableCell>
                                                    <TableCell>GHC {Number(order.final_total).toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={order.status === 'pending' ? 'secondary' : order.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{order.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                         <Button variant="outline" size="sm">View</Button>
                                                    </TableCell>
                                                </TableRow>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-lg">
                                                <DialogHeader>
                                                    <DialogTitle>Order Details</DialogTitle>
                                                    <DialogDescription>
                                                        Submitted on {format(new Date(order.created_at), 'PPP')}
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <OrderDetailsContent order={order} />
                                                <OrderDialogFooter order={order} />
                                            </DialogContent>
                                        </Dialog>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="my-listings">
                    <Card>
                        <CardHeader><CardTitle>My Product Listings</CardTitle><CardDescription>Manage your products and view their performance.</CardDescription></CardHeader>
                        <CardContent>
                            {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                            : userProducts.length === 0 ? <div className="text-center py-10"><p>You haven't listed any products yet.</p><Button asChild variant="link"><Link href="/sell">List a Product</Link></Button></div>
                            : (<Table>
                                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Price</TableHead><TableHead className="text-center">Stock</TableHead><TableHead className="text-center">Views</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>{userProducts.map((product) => (
                                <TableRow key={product.id} className={product.status === 'rejected' ? 'bg-red-500/10' : ''}>
                                    <TableCell className="font-medium">{product.name}</TableCell>
                                    <TableCell>GHC {product.price.toFixed(2)}</TableCell>
                                    <TableCell className="text-center">
                                        {product.type === 'product' ? (
                                            product.is_unlimited ? <Badge variant="secondary">Unlimited</Badge> : 
                                            <span className={cn(product.quantity !== null && product.quantity < 5 && 'text-destructive font-bold')}>{product.quantity}</span>
                                        ) : <Badge variant="outline">N/A</Badge>}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                            <Eye className="h-4 w-4"/>{product.view_count || 0}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="icon" asChild className="h-8 w-8" disabled={product.status === 'pending'}><Link href={`/edit-product/${product.id}`}><Edit className="h-4 w-4"/></Link></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="destructive" size="icon" className="h-8 w-8" disabled={deletingProductId === product.id}>{deletingProductId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4"/>}</Button></AlertDialogTrigger>
                                            <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {product.name}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this listing and its images.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteProduct(product)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                                ))}</TableBody>
                            </Table>)}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="my-purchases">
                    <Card>
                        <CardHeader><CardTitle>My Purchase History</CardTitle><CardDescription>A log of all the order requests you've placed.</CardDescription></CardHeader>
                        <CardContent>
                           {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                            : purchaseHistory.length === 0 ? <div className="text-center py-10"><Package className="mx-auto h-16 w-16 text-muted-foreground" /><h3 className="mt-4 text-lg font-semibold">No purchase history</h3><p className="text-muted-foreground">You haven't placed any order requests yet.</p><Button asChild variant="link" className="mt-2"><Link href="/products">Start Shopping</Link></Button></div>
                            : (<Table>
                                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Seller</TableHead><TableHead>Date</TableHead><TableHead>Delivery</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                                <TableBody>{purchaseHistory.map((order) => (<TableRow key={order.id}>
                                <TableCell className="font-medium"><Link href={`/products/${order.product.id}`} className="hover:underline">{order.product.name}</Link></TableCell>
                                <TableCell>
                                    <Link href={`/sellers/${(order.product as any).seller_uid}?from=products`} className="flex items-center gap-2 group">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={(order.product as any).seller?.avatar_url || ''} />
                                            <AvatarFallback>{(order.product as any).seller?.display_name?.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <span className="group-hover:underline">{(order.product as any).seller?.display_name || 'N/A'}</span>
                                    </Link>
                                </TableCell>
                                <TableCell>{format(new Date(order.created_at), 'PPP')}</TableCell>
                                <TableCell className="capitalize">
                                    <div className="flex items-center gap-2">
                                        {order.delivery_method === 'delivery' ? <Truck className="h-4 w-4 text-muted-foreground"/> : <Store className="h-4 w-4 text-muted-foreground"/>}
                                        {order.delivery_method}
                                    </div>
                                </TableCell>
                                <TableCell><Badge variant={order.status === 'pending' ? 'secondary' : order.status === 'approved' ? 'default' : 'destructive'} className="capitalize">{order.status}</Badge></TableCell>
                                <TableCell className="text-right font-medium">GHC {Number(order.final_total).toFixed(2)}</TableCell></TableRow>))}</TableBody>
                            </Table>)}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="dashboard">
                    <Card>
                        <CardHeader><CardTitle>Seller Dashboard</CardTitle><CardDescription>An overview of your product performance.</CardDescription></CardHeader>
                        <CardContent className="space-y-8">
                           {isFetchingData ? <div className="text-center p-8 flex flex-col items-center justify-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" />{showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}</div>
                           : userProducts.length === 0 ? <div className="text-center py-10"><p>You haven't listed any products yet.</p><Button asChild variant="link"><Link href="/sell">List a Product</Link></Button></div>
                           : (<>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Listings</CardTitle><ShoppingBag className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                        <CardContent><div className="text-2xl font-bold">{analyticsData.approvedProductsCount}</div><p className="text-xs text-muted-foreground">approved products</p></CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Views</CardTitle><Eye className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                        <CardContent><div className="text-2xl font-bold">{analyticsData.totalViews}</div><p className="text-xs text-muted-foreground">on approved items</p></CardContent>
                                    </Card>
                                     <Card>
                                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Top Viewed</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader>
                                        <CardContent><div className="text-lg font-bold truncate">{analyticsData.topViewedProduct?.name || 'N/A'}</div><p className="text-xs text-muted-foreground">{analyticsData.topViewedProduct?.view_count || 0} views</p></CardContent>
                                    </Card>
                                </div>
                            </>
                           )}
                        </CardContent>
                    </Card>
                </TabsContent>
                </div>
            </Tabs>
        </div>
    );

}

    

    