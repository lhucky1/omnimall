
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2, ArrowLeft, Package, DollarSign, Wand2, Upload, Edit } from 'lucide-react';
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
import { getSupplierProducts, addDropshippedProduct, deleteDropshippedProduct, updateDropshippedProduct } from '@/app/actions/dropshipping';
import type { Supplier, DropshippedProduct, Product } from '@/types';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { generateProductDescription } from '@/ai/flows/product-description-generator';
import { Checkbox } from '@/components/ui/checkbox';

const MAX_IMAGES = 5;

type FullDropshippedProduct = DropshippedProduct & { product: Product | null };

type ProductFormValues = {
    name: string;
    description: string;
    price: number; // Selling price
    cost_price: number;
    category: string;
    images?: FileList;
    notes?: string;
    location: string;
    delivery_option: 'none' | 'paid' | 'free' | 'based_on_location';
    delivery_price?: number;
    quantity?: number;
    is_unlimited: boolean;
};

function AddProductForm({ supplierId, onFinished }: { supplierId: string, onFinished: () => void }) {
    const { toast } = useToast();
    const { user, userProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const form = useForm<ProductFormValues>({
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            cost_price: 0,
            category: '',
            images: undefined,
            notes: '',
            location: userProfile?.location || '',
            delivery_option: 'none',
            delivery_price: 0,
            quantity: 1,
            is_unlimited: false,
        },
    });

    const imageFiles = form.watch('images');
    const { ref: imageRef, ...imageRest } = form.register("images");
    const deliveryOption = form.watch('delivery_option');
    const isUnlimited = form.watch('is_unlimited');

    useEffect(() => {
        if (imageFiles && imageFiles.length > 0) {
            const urls = Array.from(imageFiles).map(file => URL.createObjectURL(file));
            setImagePreviews(urls);
            return () => { urls.forEach(url => URL.revokeObjectURL(url)); };
        } else {
            setImagePreviews([]);
        }
    }, [imageFiles]);

    useEffect(() => {
        if (deliveryOption !== 'paid') {
          form.setValue('delivery_price', 0);
        }
    }, [deliveryOption, form]);

    const handleGenerateDescription = async () => {
        const productName = form.getValues("name");
        if (!productName) {
            toast({ title: "Product name is required to generate a description.", variant: "destructive" });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateProductDescription({ prompt: productName });
            form.setValue("description", result.description);
            toast({ title: "Description generated!" });
        } catch (error) {
            toast({ title: "Failed to generate description", variant: "destructive" });
        } finally {
            setIsGenerating(false);
        }
    };
    
    async function onSubmit(values: ProductFormValues) {
        if (!user) {
            toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive'});
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('supplier_id', supplierId);
        formData.append('seller_uid', user.id);
        formData.append('name', values.name);
        formData.append('description', values.description);
        formData.append('price', values.price.toString());
        formData.append('cost_price', values.cost_price.toString());
        formData.append('category', values.category);
        if (values.notes) formData.append('notes', values.notes);

        formData.append('location', values.location);
        formData.append('delivery_option', values.delivery_option);
        if (values.delivery_option === 'paid' && values.delivery_price) {
            formData.append('delivery_price', values.delivery_price.toString());
        }
        if (values.is_unlimited) {
            formData.append('is_unlimited', 'on');
        } else if (values.quantity) {
            formData.append('quantity', values.quantity.toString());
        }


        if (values.images) {
            Array.from(values.images).forEach(file => {
                formData.append('images', file);
            });
        }
        
        const result = await addDropshippedProduct(formData);

        if (result.success) {
            toast({ title: 'Success', description: 'New dropshipped product added.' });
            onFinished();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                 <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                             <div className="flex justify-between items-center">
                                <FormLabel>Description</FormLabel>
                                <Button type="button" variant="outline" size="sm" onClick={handleGenerateDescription} disabled={isGenerating || !form.getValues("name")}><Wand2 className="mr-2 h-4 w-4" />AI Generate</Button>
                            </div>
                            <FormControl><Textarea rows={4} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="cost_price" render={({ field }) => (<FormItem><FormLabel>Cost Price (GHC)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Selling Price (GHC)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                     <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="electronics">Electronics</SelectItem>
                                    <SelectItem value="textbooks">Textbooks & Notes</SelectItem>
                                    <SelectItem value="fashion">Fashion & Apparel</SelectItem>
                                    <SelectItem value="services">Services & Tutoring</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                     <div className="grid md:grid-cols-2 gap-6 items-end">
                         <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Quantity Available</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="10" {...field} disabled={isUnlimited} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value, 10))}/>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="is_unlimited"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10">
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>Unlimited stock</FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormItem>
                        <FormLabel>Product Images (up to {MAX_IMAGES})</FormLabel>
                        <FormControl>
                             <Input type="file" multiple accept="image/*" {...imageRest} ref={imageRef} />
                        </FormControl>
                        <FormDescription>Images cannot be changed after creation.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    {imagePreviews.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-4">
                            {imagePreviews.map((src, index) => <Image key={index} src={src} alt={`preview ${index}`} width={100} height={100} className="rounded-md object-cover aspect-square"/>)}
                        </div>
                    )}
                    <FormField control={form.control} name="location" render={({ field }) => (
                         <FormItem>
                            <FormLabel>Pickup Location</FormLabel>
                            <FormControl><Input placeholder="e.g., UPSA Campus, Front Gate" {...field} /></FormControl>
                            <FormDescription>Where should buyers meet you?</FormDescription>
                            <FormMessage />
                        </FormItem>
                     )}/>
                      <FormField control={form.control} name="delivery_option" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Delivery</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a delivery option" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">No delivery (Pickup only)</SelectItem>
                                <SelectItem value="free">Free Delivery</SelectItem>
                                <SelectItem value="paid">Paid Delivery</SelectItem>
                                <SelectItem value="based_on_location">Based on Location</SelectItem>
                            </SelectContent>
                            </Select>
                        <FormMessage />
                        </FormItem>
                    )}/>
                    {deliveryOption === 'paid' && (
                         <FormField control={form.control} name="delivery_price" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Delivery Price (GHC)</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="10.00" {...field} value={field.value || ''} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}

                     <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                 <DialogFooter className="border-t p-4">
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Product</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function UpdateProductForm({ item, onFinished }: { item: FullDropshippedProduct, onFinished: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ProductFormValues>({
        defaultValues: {
            name: item.name,
            description: item.product?.description || '',
            price: item.product?.price || 0,
            cost_price: item.cost_price || 0,
            category: item.product?.category || '',
            notes: item.notes || '',
            location: item.product?.location || '',
            delivery_option: item.product?.delivery_option || 'none',
            delivery_price: item.product?.delivery_price || 0,
            quantity: item.product?.quantity || 1,
            is_unlimited: item.product?.is_unlimited || false,
        },
    });

    const deliveryOption = form.watch('delivery_option');
    const isUnlimited = form.watch('is_unlimited');

    useEffect(() => {
        if (deliveryOption !== 'paid') {
            form.setValue('delivery_price', 0);
        }
    }, [deliveryOption, form]);

    async function onSubmit(values: ProductFormValues) {
        if (!item.product) {
            toast({ title: 'Error', description: 'Associated product listing not found.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('product_id', item.product.id);
        formData.append('dropshipped_product_id', item.id);
        formData.append('supplier_id', item.supplier_id);
        
        formData.append('name', values.name);
        formData.append('description', values.description);
        formData.append('price', values.price.toString());
        formData.append('cost_price', values.cost_price.toString());
        formData.append('category', values.category);
        if (values.notes) formData.append('notes', values.notes);

        formData.append('location', values.location);
        formData.append('delivery_option', values.delivery_option);
        if (values.delivery_option === 'paid' && values.delivery_price) {
            formData.append('delivery_price', values.delivery_price.toString());
        }

        if (values.is_unlimited) {
            formData.append('is_unlimited', 'on');
        } else if (values.quantity) {
            formData.append('quantity', values.quantity.toString());
        }

        const result = await updateDropshippedProduct(formData);

        if (result.success) {
            toast({ title: 'Success', description: 'Product updated successfully.' });
            onFinished();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="cost_price" render={({ field }) => (<FormItem><FormLabel>Cost Price (GHC)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Selling Price (GHC)</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="category" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="electronics">Electronics</SelectItem>
                                    <SelectItem value="textbooks">Textbooks & Notes</SelectItem>
                                    <SelectItem value="fashion">Fashion & Apparel</SelectItem>
                                    <SelectItem value="services">Services & Tutoring</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <div className="grid md:grid-cols-2 gap-6 items-end">
                        <FormField control={form.control} name="quantity" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity Available</FormLabel>
                                <FormControl><Input type="number" placeholder="10" {...field} disabled={isUnlimited} value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value, 10))}/></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="is_unlimited" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 h-10">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <div className="space-y-1 leading-none"><FormLabel>Unlimited stock</FormLabel></div>
                            </FormItem>
                        )}/>
                    </div>
                    <FormDescription>Images cannot be changed after creation.</FormDescription>
                    <FormField control={form.control} name="location" render={({ field }) => (
                         <FormItem><FormLabel>Pickup Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                     )}/>
                    <FormField control={form.control} name="delivery_option" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Delivery</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="none">No delivery (Pickup only)</SelectItem>
                                    <SelectItem value="free">Free Delivery</SelectItem>
                                    <SelectItem value="paid">Paid Delivery</SelectItem>
                                    <SelectItem value="based_on_location">Based on Location</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    {deliveryOption === 'paid' && (
                         <FormField control={form.control} name="delivery_price" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Delivery Price (GHC)</FormLabel>
                                <FormControl><Input type="number" step="0.01" placeholder="10.00" {...field} value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}
                    <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <DialogFooter className="border-t p-4">
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}


export default function SupplierProductsPage() {
    const params = useParams();
    const router = useRouter();
    const supplierId = params.id as string;
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [products, setProducts] = useState<FullDropshippedProduct[]>([]);
    const [isAddFormOpen, setIsAddFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FullDropshippedProduct | null>(null);

    const fetchSupplierProducts = async () => {
        setLoading(true);
        const { data, error } = await getSupplierProducts(supplierId);
        if (error) {
            toast({ title: 'Error', description: 'Failed to fetch supplier details.', variant: 'destructive'});
            router.push('/admin/dropshipping');
        } else if (data) {
            setSupplier(data.supplier);
            setProducts(data.products || []);
        }
        setLoading(false);
    };
    
    useEffect(() => {
        if (supplierId) {
            fetchSupplierProducts();
        }
    }, [supplierId]);

    const handleDelete = async (id: string) => {
        const result = await deleteDropshippedProduct(id);
        if (result.success) {
            toast({ title: 'Success', description: 'Dropshipped product deleted.'});
            fetchSupplierProducts();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive'});
        }
    };
    
    const handleFormFinished = () => {
        setIsAddFormOpen(false);
        setEditingItem(null);
        fetchSupplierProducts();
    };

    if (loading || !supplier) {
        return <div className="flex h-full flex-col items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                     <Button variant="outline" size="sm" asChild className="mb-4">
                        <Link href="/admin/dropshipping"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers</Link>
                    </Button>
                    <h1 className="text-3xl font-bold">{supplier.name}</h1>
                    <p className="text-muted-foreground">Manage products for this supplier.</p>
                </div>
                <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
                    <DialogTrigger asChild>
                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Product</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl p-0">
                         <DialogHeader className="p-6 pb-0">
                            <DialogTitle>Add New Dropshipped Product</DialogTitle>
                            <DialogDescription>This will create a new product listing on the main site under your seller account.</DialogDescription>
                        </DialogHeader>
                        <AddProductForm supplierId={supplierId} onFinished={handleFormFinished} />
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Products from {supplier.name}</CardTitle>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Cost Price</TableHead>
                                <TableHead>Selling Price</TableHead>
                                <TableHead>Listing Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No products found for this supplier.</TableCell></TableRow>
                            ) : products.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>GHC {item.cost_price.toFixed(2)}</TableCell>
                                    <TableCell>GHC {item.product?.price ? item.product.price.toFixed(2) : 'N/A'}</TableCell>
                                     <TableCell>
                                        {item.product ? (
                                            <Link href={`/products/${item.product.id}`} target="_blank" className="text-primary underline hover:no-underline">
                                                Live
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">Not Listed</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {item.product && (
                                            <Dialog open={editingItem?.id === item.id} onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}>
                                                <DialogTrigger asChild>
                                                     <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setEditingItem(item)}><Edit className="h-4 w-4" /></Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl p-0">
                                                    <DialogHeader className="p-6 pb-0">
                                                        <DialogTitle>Edit Dropshipped Product</DialogTitle>
                                                        <DialogDescription>Update the details for this product listing.</DialogDescription>
                                                    </DialogHeader>
                                                    {editingItem && <UpdateProductForm item={editingItem} onFinished={handleFormFinished} />}
                                                </DialogContent>
                                            </Dialog>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will delete the dropshipping record. The main product listing will need to be deleted separately.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
