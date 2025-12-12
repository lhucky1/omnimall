
"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { SellerVerification, UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X, ShieldCheck, ShieldOff, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { approveSellerVerification, rejectSellerVerification, revokeSellerPrivileges } from '@/app/actions/admin';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

const supabase = createClient();

type SellerWithVerification = UserProfile & { seller_verifications: SellerVerification[] };

export default function AdminSellersPage() {
  const { toast } = useToast();
  const [sellers, setSellers] = useState<SellerWithVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (loading) {
            setShowSlowLoadMessage(true);
        }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  const fetchSellers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, seller_verifications(*)');
        
        if (error) throw error;

        setSellers(data as SellerWithVerification[]);
      } catch (error: any) {
        toast({ title: "Error", description: "Could not fetch sellers.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleApprove = async (userId: string, verificationId: string) => {
    setActioningId(verificationId);
    const { success, error } = await approveSellerVerification(userId, verificationId);
    if (success) {
      toast({ title: 'Seller Approved' });
      await fetchSellers();
    } else {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
    setActioningId(null);
  };
  
  const handleReject = async (verificationId: string) => {
    setActioningId(verificationId);
    const { success, error } = await rejectSellerVerification(verificationId);
    if (success) {
      toast({ title: 'Seller Rejected' });
      await fetchSellers();
    } else {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
    setActioningId(null);
  };

  const handleRevoke = async (userId: string) => {
    setActioningId(userId);
    const { success, error } = await revokeSellerPrivileges(userId);
    if (success) {
      toast({ title: 'Seller Privileges Revoked' });
      await fetchSellers();
    } else {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    }
    setActioningId(null);
  };


  if (loading) {
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
        </div>
    );
  }

  const pendingVerifications = sellers.flatMap(s => s.seller_verifications.filter(v => v.status === 'pending')).map(v => ({...v, profile: sellers.find(s => s.uid === v.user_id)!}));
  const verifiedSellers = sellers.filter(s => s.is_verified_seller);


  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Pending Verifications</CardTitle>
                <CardDescription>Review and approve new seller applications.</CardDescription>
            </CardHeader>
            <CardContent>
                {pendingVerifications.length === 0 ? <p className="text-muted-foreground text-sm">No pending verifications.</p> : (
                    <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Business</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {pendingVerifications.map((v) => (
                                <TableRow key={v.id}>
                                    <TableCell className="font-medium">{v.full_name}</TableCell>
                                    <TableCell>{v.business_name}</TableCell>
                                    <TableCell>{format(new Date(v.created_at), 'PPP')}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Dialog>
                                            <DialogTrigger asChild><Button variant="outline" size="sm">Review</Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Review Verification</DialogTitle></DialogHeader>
                                                <div className="space-y-4 py-4">
                                                    <div className="relative h-48 w-48 mx-auto rounded-full overflow-hidden border">
                                                        <Image src={v.selfie_url} alt="selfie" fill className="object-cover" />
                                                    </div>
                                                    <p><strong>Full Name:</strong> {v.full_name}</p>
                                                    <p><strong>Business Name:</strong> {v.business_name}</p>
                                                    <p><strong>Email:</strong> {v.business_email}</p>
                                                    <p><strong>Phone:</strong> {v.business_phone}</p>
                                                    <p><strong>Location:</strong> {v.location}</p>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="destructive" size="sm" onClick={() => handleReject(v.id)} disabled={actioningId === v.id}><X className="mr-2"/>Reject</Button>
                                                    <Button size="sm" onClick={() => handleApprove(v.user_id, v.id)} disabled={actioningId === v.id}><Check className="mr-2"/>Approve</Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Verified Sellers</CardTitle>
                <CardDescription>Manage all active sellers on the platform.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Seller</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {verifiedSellers.map((seller) => (
                        <TableRow key={seller.uid}>
                            <TableCell className="font-medium flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={seller.avatar_url || ''}/>
                                    <AvatarFallback>{seller.display_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {seller.display_name}
                            </TableCell>
                            <TableCell>{seller.email}</TableCell>
                            <TableCell>{seller.phone_number}</TableCell>
                            <TableCell className="text-right">
                               <Button variant="destructive" size="sm" onClick={() => handleRevoke(seller.uid)} disabled={actioningId === seller.uid}>
                                    {actioningId === seller.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <ShieldOff className="h-4 w-4"/>}
                                    <span className="ml-2">Revoke</span>
                               </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  );
}

    

    