

"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Trash2, Edit, User } from 'lucide-react';
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
import { getTeamMembers, addOrUpdateTeamMember, deleteTeamMember } from '@/app/actions/team';
import type { TeamMember } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';

const supabase = createClient();

// This schema is no longer used for validation but kept for type inference reference
const formSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    role: z.string(),
    email: z.string(),
    phone: z.string(),
    school: z.string().optional(),
    image: z.any().optional(),
});


function StaffForm({ member, onFinished }: { member?: TeamMember, onFinished: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(member?.image_url || null);

    const form = useForm({
        defaultValues: {
            id: member?.id,
            name: member?.name || '',
            role: member?.role || '',
            email: member?.email || '',
            phone: member?.phone || '',
            school: member?.school || '',
            image: undefined,
        },
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            form.setValue('image', file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    async function onSubmit(values: any) { // Use `any` since we removed Zod resolver
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            if (values.id) formData.append('id', values.id);
            formData.append('name', values.name);
            formData.append('role', values.role);
            formData.append('email', values.email);
            formData.append('phone', values.phone);
            if(values.school) formData.append('school', values.school);
            if (values.image) formData.append('image', values.image);
            if (member?.image_url && !values.image) formData.append('existingImageUrl', member.image_url);

            const result = await addOrUpdateTeamMember(formData);

            if (result.success) {
                toast({ title: 'Success', description: `Team member ${values.id ? 'updated' : 'added'}.` });
                onFinished();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <ScrollArea className="h-[60vh] p-6 pr-6">
                    <div className="space-y-6">
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-24 w-24">
                                {imagePreview ? <AvatarImage src={imagePreview} /> : <AvatarFallback><User className="h-10 w-10"/></AvatarFallback>}
                            </Avatar>
                            <FormField control={form.control} name="image" render={({ field }) => (
                                <FormItem><FormLabel>Member Photo</FormLabel><FormControl><Input type="file" accept="image/*" onChange={handleFileChange} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="school" render={({ field }) => (<FormItem><FormLabel>School (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                </ScrollArea>
                 <DialogFooter className="border-t p-6">
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export default function StaffAdminPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | undefined>(undefined);
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading) {
                setShowSlowLoadMessage(true);
            }
        }, 5000);
        return () => clearTimeout(timer);
    }, [loading]);
    
    const fetchTeamMembers = async () => {
        setLoading(true);
        const { data, error } = await getTeamMembers();
        if (error) {
            toast({ title: 'Error', description: 'Failed to fetch team members.', variant: 'destructive'});
        } else {
            setTeam(data as TeamMember[]);
        }
        setLoading(false);
    }
    
    useEffect(() => {
        fetchTeamMembers();
    }, [toast]);

    const handleDelete = async (id: string) => {
        const result = await deleteTeamMember(id);
        if (result.success) {
            toast({ title: 'Success', description: 'Team member deleted.'});
            fetchTeamMembers();
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive'});
        }
    }
    
    const handleFormFinished = () => {
        setIsFormOpen(false);
        setEditingMember(undefined);
        fetchTeamMembers();
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Manage Staff</h1>
                    <p className="text-muted-foreground">Add, edit, or remove team members.</p>
                </div>
                <Dialog open={isFormOpen} onOpenChange={(open) => {
                    setIsFormOpen(open);
                    if (!open) setEditingMember(undefined);
                }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingMember(undefined)}>
                            <UserPlus className="mr-2 h-4 w-4" /> Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg p-0">
                         <DialogHeader className="p-6 pb-0">
                            <DialogTitle>{editingMember ? 'Edit' : 'Add'} Team Member</DialogTitle>
                            <DialogDescription>Fill out the details for the team member.</DialogDescription>
                        </DialogHeader>
                        <StaffForm onFinished={handleFormFinished} member={editingMember} />
                    </DialogContent>
                </Dialog>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Current Team Members</CardTitle>
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
                                    <TableHead>Member</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {team.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">No team members found.</TableCell></TableRow>
                                ) : team.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={member.image_url || ''} />
                                                <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p>{member.name}</p>
                                                <p className="text-xs text-muted-foreground">{member.school}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{member.role}</TableCell>
                                        <TableCell>{member.email}<br/>{member.phone}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditingMember(member); setIsFormOpen(true); }}><Edit className="h-4 w-4"/></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {member.name} from the team.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(member.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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

    

    