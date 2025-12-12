
"use client";

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, ShoppingCart, Users, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Product, UserProfile } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const supabase = createClient();

interface DashboardData {
  totalRevenue: number;
  totalSales: number;
  totalSellers: number;
  salesLast7Days: { date: string; sales: number }[];
  topSellersByRevenue: (Partial<UserProfile> & { total_revenue: number })[];
  topSellersByViews: (Partial<UserProfile> & { total_views: number })[];
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);


    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                setShowSlowLoadMessage(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading]);
    
    useEffect(() => {
        const defaultDashboardData: DashboardData = {
            totalRevenue: 0,
            totalSales: 0,
            totalSellers: 0,
            salesLast7Days: Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return { date: d.toLocaleDateString('en-US', { weekday: 'short' }), sales: 0 };
            }).reverse(),
            topSellersByRevenue: [],
            topSellersByViews: [],
        };

        async function getDashboardData() {
            let dashboardData = { ...defaultDashboardData };

            try {
                const { data: approvedOrders, error: ordersError } = await supabase
                    .from('orders')
                    .select('final_total, created_at, product:products(seller_uid)')
                    .eq('status', 'approved');

                if (ordersError) throw ordersError;
                
                if (approvedOrders && approvedOrders.length > 0) {
                    dashboardData.totalRevenue = approvedOrders.reduce((sum, order) => sum + (Number(order.final_total) || 0), 0);
                    dashboardData.totalSales = approvedOrders.length;
                    
                    approvedOrders.forEach(order => {
                        const orderDate = new Date(order.created_at);
                        const today = new Date();
                        const diffTime = today.getTime() - orderDate.getTime();
                        const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
                        
                        if (diffDays < 7) {
                            const dayStr = orderDate.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayData = dashboardData.salesLast7Days.find(d => d.date === dayStr);
                            if (dayData) {
                                dayData.sales += Number(order.final_total) || 0;
                            }
                        }
                    });

                    const revenueBySeller: Record<string, number> = {};
                    approvedOrders.forEach(order => {
                        const sellerId = order.product?.seller_uid;
                        if (sellerId) {
                            revenueBySeller[sellerId] = (revenueBySeller[sellerId] || 0) + (Number(order.final_total) || 0);
                        }
                    });

                    const sortedSellerIdsByRevenue = Object.keys(revenueBySeller).sort((a, b) => revenueBySeller[b] - revenueBySeller[a]).slice(0, 5);
                    
                    if (sortedSellerIdsByRevenue.length > 0) {
                        const { data: sellerProfiles, error: profileError } = await supabase
                            .from('profiles')
                            .select('uid, display_name, avatar_url')
                            .in('uid', sortedSellerIdsByRevenue);
                        
                        if (profileError) throw profileError;

                        dashboardData.topSellersByRevenue = sortedSellerIdsByRevenue.map(uid => {
                            const profile = sellerProfiles?.find(p => p.uid === uid);
                            return {
                                ...profile,
                                total_revenue: revenueBySeller[uid]
                            };
                        });
                    }
                }
            } catch (error: any) {
                console.error("Error fetching sales or seller data:", error.message);
            }

            try {
                const { count: totalSellers, error: sellersError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_verified_seller', true);
                    
                if (sellersError) throw sellersError;
                dashboardData.totalSellers = totalSellers || 0;
            } catch (error: any) {
                console.error("Error fetching total seller count:", error.message);
            }
                
            try {
                const { data: allProducts, error: productsError } = await supabase
                    .from('products')
                    .select('seller_uid, view_count, profiles(uid, display_name, avatar_url)')
                    .eq('status', 'approved');

                if (productsError) throw productsError;
                
                if (allProducts) {
                    const viewsBySeller: Record<string, { total_views: number; profile: UserProfile | null }> = {};
                    allProducts.forEach(product => {
                        const sellerId = product.seller_uid;
                        if (sellerId) {
                            if (!viewsBySeller[sellerId]) {
                                viewsBySeller[sellerId] = { total_views: 0, profile: product.profiles as UserProfile };
                            }
                            viewsBySeller[sellerId].total_views += Number(product.view_count) || 0;
                        }
                    });

                    const sortedSellersByViews = Object.entries(viewsBySeller)
                        .sort(([, a], [, b]) => b.total_views - a.total_views)
                        .slice(0, 5);

                    dashboardData.topSellersByViews = sortedSellersByViews.map(([uid, data]) => ({
                        uid,
                        display_name: data.profile?.display_name || 'Unknown',
                        avatar_url: data.profile?.avatar_url,
                        total_views: data.total_views
                    }));
                }
            } catch(error: any) {
                 console.error("Error fetching top products:", error.message);
            }

            return dashboardData;
        }
        
        getDashboardData().then(dashboardData => {
            setData(dashboardData);
            setLoading(false);
        });
    }, []);

    if (loading || !data) {
        return (
            <div className="flex h-full flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
            </div>
        );
    }
    
    const chartData = data.salesLast7Days.map(item => ({
      ...item,
      sales: Number(item.sales || 0),
    }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GHC {Number(data.totalRevenue).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all approved sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{data.totalSales}</div>
            <p className="text-xs text-muted-foreground">Total approved orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sellers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalSellers}</div>
            <p className="text-xs text-muted-foreground">Verified sellers on the platform</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Overview (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: number) => `GHC ${value.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Top Sellers by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Seller</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {data.topSellersByRevenue.length > 0 ? data.topSellersByRevenue.map(seller => (
                            <TableRow key={seller.uid}>
                                <TableCell className="flex items-center gap-2">
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={seller.avatar_url || ''} />
                                        <AvatarFallback>{seller.display_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{seller.display_name}</span>
                                </TableCell>
                                <TableCell className="text-right font-medium">GHC {Number(seller.total_revenue).toFixed(2)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">No seller data available.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Top Sellers by Views</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>Seller</TableHead><TableHead className="text-right">Total Views</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {data.topSellersByViews.length > 0 ? data.topSellersByViews.map(seller => (
                            <TableRow key={seller.uid}>
                                <TableCell className="flex items-center gap-2">
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={seller.avatar_url || ''} />
                                        <AvatarFallback>{seller.display_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{seller.display_name}</span>
                                </TableCell>
                                <TableCell className="text-right font-medium">{seller.total_views}</TableCell>
                            </TableRow>
                        )) : (
                             <TableRow>
                                <TableCell colSpan={2} className="text-center text-muted-foreground">No seller view data available.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

    

    

    