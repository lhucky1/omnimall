
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, Bell } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { format } from 'date-fns';
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
import { Badge } from '@/components/ui/badge';

const supabase = createClient();

type LiveNotification = {
    id: string;
    created_at: string;
    title: string;
    message: string;
    is_active: boolean;
    link?: string | null;
    link_text?: string | null;
};

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  message: z.string().min(10, "Message must be at least 10 characters."),
  link: z.string().url().optional().or(z.literal('')),
  link_text: z.string().optional(),
});

export default function NotificationsAdminPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTogglingId, setIsTogglingId] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<LiveNotification[]>([]);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            message: "",
            link: "",
            link_text: "",
        },
    });
    
    const fetchNotifications = async () => {
        const { data, error } = await supabase.from('live_notifications').select('*').order('created_at', { ascending: false });
        if (error) {
            toast({ title: 'Error', description: 'Failed to fetch notifications.', variant: 'destructive'});
        } else {
            setNotifications(data as LiveNotification[]);
        }
        setLoading(false);
    }
    
    useEffect(() => {
        fetchNotifications();
    }, [toast]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        const { data, error } = await supabase.from('live_notifications').insert([{
            title: values.title,
            message: values.message,
            link: values.link || null,
            link_text: values.link_text || null,
            is_active: false
        }]);

        if (error) {
            toast({ title: 'Error', description: 'Failed to create notification.', variant: 'destructive'});
        } else {
            toast({ title: 'Success', description: 'Notification created.'});
            form.reset();
            await fetchNotifications();
        }
        setIsSubmitting(false);
    }

    const handleToggleActive = async (notification: LiveNotification) => {
        setIsTogglingId(notification.id);
        const newStatus = !notification.is_active;

        // If activating, first deactivate all others
        if (newStatus) {
            const { error: deactivateError } = await supabase.from('live_notifications').update({ is_active: false }).neq('id', notification.id);
            if (deactivateError) {
                toast({ title: 'Error', description: 'Failed to deactivate other notifications.', variant: 'destructive'});
                setIsTogglingId(null);
                return;
            }
        }
        
        // Then toggle the target notification
        const { error } = await supabase.from('live_notifications').update({ is_active: newStatus }).eq('id', notification.id);
        if (error) {
            toast({ title: 'Error', description: 'Failed to update notification status.', variant: 'destructive'});
        } else {
            toast({ title: 'Success', description: `Notification ${newStatus ? 'activated' : 'deactivated'}.`});
            await fetchNotifications();
        }
        setIsTogglingId(null);
    }
    
    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('live_notifications').delete().eq('id', id);
        if (error) {
            toast({ title: 'Error', description: 'Failed to delete notification.', variant: 'destructive'});
        } else {
            toast({ title: 'Success', description: 'Notification deleted.'});
            await fetchNotifications();
        }
    }


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Live Notifications</h1>
                <p className="text-muted-foreground">Create and manage site-wide announcements for all users.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Create Notification</CardTitle>
                             <CardDescription>Fill out the form to create a new announcement.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <FormField control={form.control} name="message" render={({ field }) => (
                                        <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="link" render={({ field }) => (
                                        <FormItem><FormLabel>Link (Optional)</FormLabel><FormControl><Input placeholder="https://example.com/..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                     <FormField control={form.control} name="link_text" render={({ field }) => (
                                        <FormItem><FormLabel>Link Text (Optional)</FormLabel><FormControl><Input placeholder="e.g., Learn More" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}/>
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                        Create Notification
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Notifications</CardTitle>
                            <CardDescription>Only one notification can be active at a time.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin"/></div> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notifications.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="text-center h-24">No notifications created yet.</TableCell>
                                            </TableRow>
                                        ) : notifications.map(n => (
                                            <TableRow key={n.id}>
                                                <TableCell className="font-medium">{n.title}</TableCell>
                                                <TableCell>
                                                    <Badge variant={n.is_active ? 'default' : 'secondary'}>
                                                        {n.is_active ? 'Active' : 'Inactive'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{format(new Date(n.created_at), 'PPP')}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Switch
                                                        checked={n.is_active}
                                                        onCheckedChange={() => handleToggleActive(n)}
                                                        disabled={isTogglingId === n.id}
                                                        aria-label="Toggle notification"
                                                    />
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4"/></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This action cannot be undone. This will permanently delete the notification.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(n.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
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
            </div>
        </div>
    )
}
