
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Frown, PlusSquare } from 'lucide-react';
import { createPost, getMyPosts, deletePost } from '@/app/actions/feed';
import Image from 'next/image';
import Link from 'next/link';
import type { FeedPost } from '@/types';
import { formatDistanceToNow } from 'date-fns';
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

const MAX_IMAGES = 3;
const MAX_FILE_SIZE_MB = 5;

const postFormSchema = z.object({
  content: z.string().max(1000, "Post content cannot exceed 1000 characters.").optional(),
  images: z.custom<FileList | undefined>()
    .refine(files => !files || Array.from(files).length <= MAX_IMAGES, `You can upload a maximum of ${MAX_IMAGES} images.`)
    .refine(files => !files || Array.from(files).every(file => file.size <= MAX_FILE_SIZE_MB * 1024 * 1024), `Each image must be less than ${MAX_FILE_SIZE_MB}MB.`)
    .optional(),
}).refine(data => data.content?.trim() || (data.images && data.images.length > 0), {
    message: "You must add some text or at least one image.",
    path: ["content"],
});


function MyPostCard({ post, onPostDeleted }: { post: FeedPost, onPostDeleted: (postId: string) => void }) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        setIsDeleting(true);
        const result = await deletePost(post.id);
        if (result.success) {
            toast({ title: "Post Deleted" });
            onPostDeleted(post.id);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
        setIsDeleting(false);
    }
    
    return (
        <Card className="flex flex-col sm:flex-row gap-4 p-4">
            {post.images && post.images.length > 0 && (
                <div className="relative h-24 w-24 rounded-md overflow-hidden flex-shrink-0">
                    <Image src={post.images[0]} alt="Post image" fill className="object-cover" />
                </div>
            )}
            <div className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
            </div>
            <div className="flex-shrink-0">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 text-destructive"/>}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete this post. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </Card>
    );
}

export default function MyPostsPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [myPosts, setMyPosts] = useState<FeedPost[]>([]);
    const [isLoadingPosts, setIsLoadingPosts] = useState(true);
    
    const form = useForm<z.infer<typeof postFormSchema>>({
        resolver: zodResolver(postFormSchema),
        defaultValues: { content: '', images: undefined },
    });
    
    const imageFiles = form.watch('images');

    useEffect(() => {
        if (!authLoading && !userProfile?.is_verified_seller) {
            toast({
                title: "Permission Denied",
                description: "Only verified sellers can manage posts.",
                variant: "destructive"
            });
            router.push('/feed');
        }
    }, [user, userProfile, authLoading, router, toast]);

    useEffect(() => {
        if (user) {
            const fetchPosts = async () => {
                setIsLoadingPosts(true);
                const result = await getMyPosts();
                if (result.success && result.data) {
                    setMyPosts(result.data as FeedPost[]);
                } else {
                    toast({ title: "Error", description: "Could not fetch your posts.", variant: "destructive" });
                }
                setIsLoadingPosts(false);
            };
            fetchPosts();
        }
    }, [user, toast]);

    useEffect(() => {
        const urls: string[] = [];
        if (imageFiles && imageFiles.length > 0) {
            for (const file of Array.from(imageFiles as FileList)) {
                urls.push(URL.createObjectURL(file));
            }
        }
        setImagePreviews(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [imageFiles]);

    async function onSubmit(values: z.infer<typeof postFormSchema>) {
        setIsSubmitting(true);
        const formData = new FormData();
        if (values.content) {
            formData.append('content', values.content);
        }
        if (values.images) {
            Array.from(values.images as FileList).forEach(file => {
                formData.append('images', file);
            });
        }
        
        const result = await createPost(formData);

        if (result.success) {
            toast({ title: 'Post Created!', description: 'Your post is now live on the feed.' });
            if (result.data) {
                setMyPosts(prev => [result.data as FeedPost, ...prev]);
            }
            form.reset();
            setImagePreviews([]);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    }
    
    const handlePostDeleted = (postId: string) => {
        setMyPosts(prev => prev.filter(p => p.id !== postId));
    };

    if (authLoading || !userProfile) {
        return (
            <div className="flex h-screen items-center justify-center -mt-20">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Create a New Post</CardTitle>
                        <CardDescription>Share an update, a new product, or a special offer with the campus.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Post Content</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="What's on your mind?" {...field} rows={5} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                  control={form.control}
                                  name="images"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Add Images (up to {MAX_IMAGES})</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="file"
                                          multiple
                                          accept="image/*"
                                          onChange={(e) => field.onChange(e.target.files)}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />


                                {imagePreviews.length > 0 && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {imagePreviews.map((src) => (
                                            <div key={src} className="relative aspect-square rounded-md overflow-hidden">
                                                <Image src={src} alt="Image preview" fill className="object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {isSubmitting ? 'Posting...' : 'Create Post'}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h2 className="text-2xl font-bold">My Previous Posts</h2>
                {isLoadingPosts ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : myPosts.length === 0 ? (
                    <div className="text-center py-10 border rounded-lg bg-card">
                         <Frown className="mx-auto h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
                        <p className="text-muted-foreground">Your previous posts will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {myPosts.map(post => (
                           <MyPostCard key={post.id} post={post} onPostDeleted={handlePostDeleted} />
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}
