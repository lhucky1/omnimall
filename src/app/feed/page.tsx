
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Loader2, Send, Share2, MoreHorizontal, RefreshCw, Heart, PlusSquare, Rss } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { FeedPost, FeedPostComment } from '@/types';
import Image from 'next/image';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import FeedPostSkeleton from '@/components/FeedPostSkeleton';
import { getFeedPosts, togglePostLike, addComment, getPostComments } from '@/app/actions/feed';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

function ImageCarousel({ images }: { images: string[] }) {
    const [api, setApi] = useState<CarouselApi>()
    const [current, setCurrent] = useState(0)

    useEffect(() => {
        if (!api) return;
        setCurrent(api.selectedScrollSnap());
        api.on("select", () => setCurrent(api.selectedScrollSnap()));
        return () => { api.off("select", () => {}) };
    }, [api])

    if (!images || images.length === 0) return null;

    if (images.length === 1) {
        return (
             <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                <Image src={images[0]} alt="Post image" fill className="object-cover" />
            </div>
        );
    }
    
    return (
        <Carousel setApi={setApi} className="w-full relative">
            <CarouselContent>
                {images.map((src, index) => (
                    <CarouselItem key={index}>
                         <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                            <Image src={src} alt={`Post image ${index + 1}`} fill className="object-cover" />
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            {images.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 z-10 flex items-center justify-center gap-2">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => api?.scrollTo(index)}
                            className={cn("h-2 w-2 rounded-full bg-black/30 transition-all", current === index ? "w-4 bg-white" : "hover:bg-white/80")}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </Carousel>
    )
}

function ShowMoreToggle({ text, maxLength = 150 }: { text: string; maxLength?: number }) {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (text.length <= maxLength) {
        return <p className="text-foreground/90 whitespace-pre-wrap">{text}</p>;
    }

    return (
        <div>
            <p className="text-foreground/90 whitespace-pre-wrap">
                {isExpanded ? text : `${text.substring(0, maxLength)}...`}
            </p>
            <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="text-sm font-semibold text-muted-foreground hover:text-primary mt-1"
            >
                {isExpanded ? 'Show less' : 'Show more'}
            </button>
        </div>
    );
}

function CommentSheet({ post, onCommentAdded, children }: { post: FeedPost; onCommentAdded: () => void; children: React.ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [comments, setComments] = useState<FeedPostComment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const fetchComments = async () => {
        setIsLoading(true);
        const result = await getPostComments(post.id);
        if (result.success && result.data) {
            setComments(result.data as FeedPostComment[]);
        } else {
            toast({ title: "Error", description: "Could not load comments.", variant: "destructive" });
        }
        setIsLoading(false);
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;
        setIsPosting(true);
        const result = await addComment(post.id, newComment);
        if (result.success && result.data) {
            setComments(prev => [result.data as FeedPostComment, ...prev]);
            setNewComment('');
            onCommentAdded();
            setTimeout(() => {
                if (scrollAreaRef.current) {
                    scrollAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }, 100);
        } else {
            toast({ title: "Error", description: result.error || "Failed to post comment.", variant: "destructive" });
        }
        setIsPosting(false);
    }

    return (
        <Drawer onOpenChange={(open) => {if (open) fetchComments()}}>
            <DrawerTrigger asChild>
                {children}
            </DrawerTrigger>
            <DrawerContent>
                <div className="flex flex-col h-full">
                    <DrawerHeader className="text-center">
                        <DrawerTitle>Comments</DrawerTitle>
                    </DrawerHeader>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
                            ) : comments.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10">No comments yet.</div>
                            ) : (
                                <div className="space-y-4 pb-4">
                                    {comments.map(comment => (
                                        <div key={comment.id} className="flex items-start gap-3">
                                            <Avatar className="h-8 w-8 border">
                                                <AvatarImage src={comment.author.is_verified_seller ? comment.author.avatar_url : ""} />
                                                <AvatarFallback className="text-xs">
                                                    {comment.author.display_name?.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <div className="rounded-xl rounded-tl-none bg-muted/70 p-3 max-w-[90%]">
                                                    <p className="font-semibold text-sm">{comment.author.display_name}</p>
                                                    <p className="text-sm text-foreground/90">{comment.content}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 ml-1">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                        <form onSubmit={handleAddComment} className="p-4 border-t bg-background mt-auto">
                            <div className="relative">
                                <Input 
                                    placeholder="Add a comment..." 
                                    className="rounded-full pr-12 h-11" 
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    disabled={!user}
                                />
                                <Button type="submit" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-9 w-9" disabled={!newComment.trim() || isPosting}>
                                    {isPosting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}

const CommentIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M21.8,11.3c0,4.9-4.4,8.9-9.8,8.9c-1.5,0-2.9-0.3-4.2-0.9c-0.3-0.1-0.6-0.2-0.9-0.2c-0.2,0-0.4,0-0.5,0.1L2.9,20.8c-0.5,0.2-1-0.1-1.1-0.6c0-0.1,0-0.2,0-0.3l1-3.6c0.2-0.6,0-1.2-0.4-1.7c-1.2-1.6-1.9-3.6-1.9-5.7C1.6,4.5,6,0.5,11.4,0.5S21.8,5.1,21.8,11.3z"/>
    <circle cx="8" cy="11.5" r="1" />
    <circle cx="12" cy="11.5" r="1" />
    <circle cx="16" cy="11.5" r="1" />
  </svg>
);


function FeedPostCard({ post, onLikeToggle }: { post: FeedPost, onLikeToggle: (postId: string, newIsLiked: boolean, newLikeCount: number) => void }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isLiking, setIsLiking] = useState(false);
    const [isLiked, setIsLiked] = useState(post.is_liked_by_user);
    const [likeCount, setLikeCount] = useState(post.like_count);
    const [commentCount, setCommentCount] = useState(post.comment_count);

    const handleLike = async () => {
        if (!user) {
            toast({ title: "Login required", description: "Please log in to like posts.", variant: "destructive" });
            return;
        }
        setIsLiking(true);
        const newIsLiked = !isLiked;
        const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        // Optimistic update
        setIsLiked(newIsLiked);
        setLikeCount(newLikeCount);
        onLikeToggle(post.id, newIsLiked, newLikeCount);

        const result = await togglePostLike(post.id);
        if (!result.success) {
            // Revert on failure
            setIsLiked(!newIsLiked);
            setLikeCount(likeCount);
            onLikeToggle(post.id, !newIsLiked, likeCount);
            toast({ title: "Error", description: "Could not update like status.", variant: "destructive" });
        }
        setIsLiking(false);
    };

    const handleShare = async () => {
        const shareData = {
            title: `Check out this post from ${post.author.display_name} on OMNIMALL`,
            text: post.content,
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(window.location.href);
                toast({ title: "Link Copied!", description: "The link to the feed has been copied to your clipboard." });
            }
        } catch (error) {
            console.error("Share failed:", error);
            toast({ title: "Error", description: "Could not share post.", variant: "destructive" });
        }
    };
    
    return (
        <Card className="w-full overflow-hidden rounded-2xl shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <Link href={`/sellers/${post.author.uid}`} className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                         <AvatarImage src={post.author.avatar_url} />
                         <AvatarFallback>{post.author.display_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm">{post.author.display_name}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                    </div>
                </Link>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="h-5 w-5" />
                         </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/> Share Post</DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
            </CardHeader>
            <CardContent className="px-4 pt-0 pb-3 space-y-4">
                {post.content && <ShowMoreToggle text={post.content} />}
                <ImageCarousel images={post.images} />
            </CardContent>
            <CardFooter className="px-4 pb-4 flex justify-between items-center text-muted-foreground text-sm">
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5">
                         <Button
                            size="icon"
                            variant="ghost"
                            className={cn("rounded-full h-9 w-9", isLiked ? 'text-red-500' : 'hover:text-red-500')}
                            onClick={handleLike} disabled={isLiking}
                         >
                             <Heart className={cn("h-6 w-6", isLiked && "fill-current")}/>
                         </Button>
                         <span>{likeCount}</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <CommentSheet post={post} onCommentAdded={() => setCommentCount(prev => prev + 1)}>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-full h-9 w-9 hover:text-primary"
                            >
                                <CommentIcon className="h-6 w-6"/>
                            </Button>
                        </CommentSheet>
                        <span>{commentCount}</span>
                     </div>
                 </div>
                 <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full h-9 w-9 hover:text-primary"
                    onClick={handleShare}
                 >
                    <Share2 className="h-5 w-5"/>
                 </Button>
            </CardFooter>
        </Card>
    );
}

export default function FeedPage() {
    const { user, userProfile } = useAuth();
    const [posts, setPosts] = useState<FeedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const loaderRef = useRef(null);
    const pageSize = 5;

    const fetchPosts = useCallback(async (pageNum: number) => {
        setLoading(true);
        const result = await getFeedPosts(pageNum, pageSize);
        if (result.success && result.data) {
            setPosts(prev => pageNum === 1 ? result.data : [...prev, ...result.data]);
            setHasMore(result.data.length === pageSize);
        } else {
            console.error("Failed to fetch posts:", result.error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchPosts(1);
    }, [fetchPosts]);

    const handleLikeToggle = (postId: string, newIsLiked: boolean, newLikeCount: number) => {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked_by_user: newIsLiked, like_count: newLikeCount } : p));
    };
    
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            if (target.isIntersecting && hasMore && !loading) {
                setPage(prev => prev + 1);
            }
        });

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [hasMore, loading]);

    useEffect(() => {
        if (page > 1) {
            fetchPosts(page);
        }
    }, [page, fetchPosts]);


    const handleRefresh = () => {
        setPosts([]);
        setPage(1);
        setHasMore(true);
        fetchPosts(1);
    }
    
    return (
        <div className="bg-secondary/50 min-h-full">
            {/* Sticky Header */}
            <header className="sticky top-[80px] sm:top-20 z-30 bg-background/80 backdrop-blur-lg border-b px-4 py-3">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                     <div>
                        <h1 className="text-xl font-bold">Campus Feed</h1>
                        <p className="text-sm text-muted-foreground">See what sellers are posting today</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {userProfile?.is_verified_seller && (
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/my-posts">
                                    <PlusSquare className="h-4 w-4 mr-2" /> My Posts
                                </Link>
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading && page === 1}>
                            <RefreshCw className={cn("h-5 w-5", loading && page === 1 && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </header>

            {/* Main Feed Content */}
            <div className="max-w-2xl mx-auto py-6 space-y-4 px-2 sm:px-0">
                {posts.length === 0 && loading ? (
                    <>
                        <FeedPostSkeleton />
                        <FeedPostSkeleton />
                    </>
                ) : posts.length === 0 && !loading ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <div className="p-6 bg-primary/10 rounded-full mb-4 text-primary">
                            <Rss className="h-16 w-16" />
                        </div>
                        <h2 className="text-2xl font-semibold">The Feed is Empty</h2>
                        <p className="mt-2 text-muted-foreground">Be the first to share something with the campus!</p>
                        {userProfile?.is_verified_seller && (
                            <Button asChild className="mt-6">
                                <Link href="/my-posts">Create First Post</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        {posts.map(post => (
                            <FeedPostCard key={post.id} post={post} onLikeToggle={handleLikeToggle} />
                        ))}
                    </>
                )}
                <div ref={loaderRef} className="h-10 flex justify-center items-center">
                    {loading && page > 1 && <Loader2 className="h-6 w-6 animate-spin" />}
                    {!hasMore && posts.length > 0 && <p className="text-sm text-muted-foreground">You've reached the end!</p>}
                </div>
            </div>
        </div>
    );
}
