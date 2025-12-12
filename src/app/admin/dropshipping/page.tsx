
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, Edit, Truck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { getSuppliers, addOrUpdateSupplier, deleteSupplier } from '@/app/actions/dropshipping';
import type { Supplier } from '@/types';
import Link from 'next/link';

type SupplierFormValues = {
    id?: string;
    name: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
};

function SupplierForm({ supplier, onFinished }: { supplier?: Supplier, onFinished: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SupplierFormValues>({
        defaultValues: {
            id: supplier?.id || undefined,
            name: supplier?.name || '',
            contact_name: supplier?.contact_name || '',
            contact_email: supplier?.contact_email || '',
            contact_phone: supplier?.contact_phone || '',
        },
    });

    async function onSubmit(values: SupplierFormValues) {
        setIsSubmitting(true);
        const formData = new FormData();
        if (values.id) formData.append('id', values.id);
        formData.append('name', values.name);
        if (values.contact_name) formData.append('contact_name', values.contact_name);
        if (values.contact_email) formData.append('contact_email', values.contact_email);
        if (values.contact_phone) formData.append('contact_phone', values.contact_phone);

        const result = await addOrUpdateSupplier(formData);

        if (result.success) {
            toast({ title: 'Success', description: `Supplier ${values.id ? 'updated' : 'added'}.` });
            onFinished();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="p-6">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Supplier Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contact_name" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Contact Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contact_email" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Contact Email (Optional)</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="contact_phone" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Contact Phone (Optional)</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <DialogFooter className="border-t p-4">
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Supplier</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export default function DropshippingPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => { if (loading) setShowSlowLoadMessage(true); }, 5000);
        return () => clearTimeout(timer);
    }, [loading]);

    const fetchSuppliers = async () => {
        setLoading(true);
        const { data, error } = await getSuppliers();
        if (error) {
            toast({ title: 'Error', description: 'Failed to fetch suppliers.', variant: 'destructive'});
        } else {
            setSuppliers(data || []);
        }
        setLoading(false);
    };
    
    useEffect(() => {
        fetchSuppliers();
    }, [toast]);

    const handleDelete = async (id: string) => {
        const result = await deleteSupplier(id);
        if (result.success) {
            toast({ title: 'Success', description: 'Supplier deleted.'});
            fetchSuppliers();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive'});
        }
    };
    
    const handleFormFinished = () => {
        setIsFormOpen(false);
        setEditingSupplier(undefined);
        fetchSuppliers();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Dropshipping</h1>
                    <p className="text-muted-foreground">Manage your suppliers and their products.</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingSupplier(undefined); }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingSupplier(undefined)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Supplier
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg p-0">
                         <DialogHeader className="p-6 pb-0">
                            <DialogTitle>{editingSupplier ? 'Edit' : 'Add'} Supplier</DialogTitle>
                            <DialogDescription>Fill out the details for the supplier.</DialogDescription>
                        </DialogHeader>
                        <SupplierForm onFinished={handleFormFinished} supplier={editingSupplier} />
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>My Suppliers</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex h-48 flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin"/>
                            {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Supplier</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Products</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suppliers.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No suppliers found. Add one to get started.</TableCell></TableRow>
                                ) : suppliers.map(supplier => (
                                    <TableRow key={supplier.id}>
                                        <TableCell className="font-medium">{supplier.name}</TableCell>
                                        <TableCell>
                                            <div>{supplier.contact_name}</div>
                                            <div className="text-xs text-muted-foreground">{supplier.contact_email}</div>
                                            <div className="text-xs text-muted-foreground">{supplier.contact_phone}</div>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="link" asChild className="p-0 h-auto">
                                                <Link href={`/admin/dropshipping/${supplier.id}`}>Manage Products</Link>
                                            </Button>
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingSupplier(supplier); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {supplier.name} and all associated data.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(supplier.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

    