
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase';
import type { Order } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, Inbox } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function InventoryPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [incomingOrders, setIncomingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     if (!authLoading && !user) {
        router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchIncomingOrders = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id')
          .eq('seller_uid', user.uid);

        if (productsError) throw productsError;
        const productIds = productsData.map(p => p.id);

        if (productIds.length > 0) {
            const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*, product:products(id, name), buyer:profiles(uid, display_name, phone_number)')
            .in('product_id', productIds)
            .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;
            setIncomingOrders(ordersData as Order[]);
        }

      } catch (error: any) {
        console.error("Error fetching incoming orders:", error);
        toast({
          title: "Error",
          description: "Could not fetch your incoming orders.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchIncomingOrders();
    }
  }, [user, toast]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'approved' | 'declined') => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      setIncomingOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast({
        title: `Order ${newStatus}`,
        description: "The buyer will be notified.",
      });
    } catch (error: any) {
      console.error("Error updating order status:", error);
      toast({
        title: "Update Failed",
        description: "Could not update the order status.",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return <div className="text-center py-10"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incoming Orders</CardTitle>
        <CardDescription>Review and manage order requests from buyers for your products.</CardDescription>
      </CardHeader>
      <CardContent>
        {incomingOrders.length === 0 ? (
          <div className="text-center py-10">
            <Inbox className="mx-auto h-24 w-24 text-muted-foreground" />
            <h2 className="mt-4 text-2xl font-semibold">No Incoming Orders</h2>
            <p className="mt-2 text-muted-foreground">You don't have any pending order requests right now.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomingOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/products/${order.product.id}`} className="hover:underline">
                        {order.product.name}
                    </Link>
                  </TableCell>
                  <TableCell>{order.buyer?.display_name || 'N/A'}</TableCell>
                   <TableCell>
                      <a href={`tel:${order.buyer?.phone_number}`} className="hover:underline text-primary">
                        {order.buyer?.phone_number || 'No number'}
                      </a>
                    </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'pending' ? 'bg-yellow-400/20 text-yellow-500' :
                        order.status === 'approved' ? 'bg-green-400/20 text-green-500' :
                        'bg-red-400/20 text-red-500'
                    }`}>
                        {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {order.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'approved')}>
                          <Check className="mr-2 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleUpdateOrderStatus(order.id, 'declined')}>
                          <X className="mr-2 h-4 w-4" /> Decline
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
