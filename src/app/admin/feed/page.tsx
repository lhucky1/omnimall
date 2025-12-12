
"use client";

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { FeedPost } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { deletePostAsAdmin } from '@/app/actions/feed';

const supabase = createClient();
const POST_LIFESPAN_SECONDS = 7 * 24 * 60 * 60; // 7 days

const TimeLeft = ({ createdAt }: { createdAt: string }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const postDate = new Date(createdAt);
            const secondsElapsed = differenceInSeconds(now, postDate);
            const secondsRemaining = POST_LIFESPAN_SECONDS - secondsElapsed;

            if (secondsRemaining <= 0) {
                setTimeLeft('Expired');
                return;
            }

            const days = Math.floor(secondsRemaining / (24 * 3600));
            const hours = Math.floor((secondsRemaining % (24 * 3600)) / 3600);
            const minutes = Math.floor((secondsRemaining % 3600) / 60);

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h left`);
            } else if (hours > 0) {
                 setTimeLeft(`${hours}h ${minutes}m left`);
            } else {
                 setTimeLeft(`${minutes}m left`);
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [createdAt]);

    return <span>{timeLeft}</span>;
};

export default function AdminFeedPage() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
        if (loading) setShowSlowLoadMessage(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  const fetchPosts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('feed_posts')
          .select('*, author:profiles!feed_posts_user_id_fkey(display_name, avatar_url)')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setPosts(data as any[]);
      } catch (error: any) {
        toast({ title: "Error", description: "Could not fetch feed posts.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (post: FeedPost) => {
      setDeletingId(post.id);
      const result = await deletePostAsAdmin(post.id);
      if (result.success) {
          toast({ title: 'Post Deleted', description: `The post has been permanently removed.` });
          fetchPosts(); // Refetch to update the list
      } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
      setDeletingId(null);
  }

  if (loading) {
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            {showSlowLoadMessage && <p className="mt-4 text-sm text-muted-foreground">Taking too long? Please refresh the page</p>}
        </div>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Feed Control</CardTitle>
            <CardDescription>Manage all posts on the platform. Deletions are permanent and remove all associated data and images.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Author</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Posted</TableHead>
                        <TableHead>Time Left</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {posts.map((post) => (
                        <TableRow key={post.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={post.author?.avatar_url || ''} />
                                        <AvatarFallback>{post.author?.display_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{post.author?.display_name || 'N/A'}</span>
                                </div>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{post.content || 'No text content'}</TableCell>
                            <TableCell>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</TableCell>
                            <TableCell>
                                <TimeLeft createdAt={post.created_at} />
                            </TableCell>
                            <TableCell>
                               <Badge variant={post.is_deleted ? 'destructive' : 'default'}>{post.is_deleted ? 'Deleted by User' : 'Live'}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="icon" className="h-8 w-8" disabled={deletingId === post.id}>
                                            {deletingId === post.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete this post and all its data, including images, likes, and comments. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(post)}>Delete Permanently</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
  );
}

    