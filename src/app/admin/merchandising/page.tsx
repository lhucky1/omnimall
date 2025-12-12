
"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import type { Product, UserProfile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Save, Package, User, PlusCircle, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { getMerchandisedItems, saveAllMerchandisedItems } from '@/app/actions/merchandising';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import Fuse from 'fuse.js';

const supabase = createClient();

type MergedItem = (Product | UserProfile) & { itemType: 'product' | 'seller' };

const SECTIONS = [
  { id: 'hero_slider', title: 'Hero Slider', type: 'product' },
  { id: 'top_sellers', title: 'Top Sellers', type: 'seller' },
  { id: 'featured_items', title: 'Featured Items', type: 'product' },
  { id: 'limited_time_offer', title: 'Limited Offer', type: 'product' },
];

function ItemRow({ item, onRemove, onMove, isFirst, isLast }: { 
    item: MergedItem, 
    onRemove: () => void,
    onMove: (direction: 'up' | 'down') => void,
    isFirst: boolean,
    isLast: boolean,
}) {
  const isProduct = item.itemType === 'product';

  return (
    <div className="p-2 mb-2 rounded-md bg-muted/50 border flex items-center gap-3">
        {isProduct ? (
            <div className="relative h-12 w-12 rounded-md overflow-hidden flex-shrink-0">
                <Image src={(item as Product).image_urls?.[0] || 'https://placehold.co/100x100.png'} alt={(item as Product).name} fill className="object-cover" />
            </div>
        ) : (
            <Avatar className="h-12 w-12">
                <AvatarImage src={(item as UserProfile).avatar_url || ''} />
                <AvatarFallback>{(item as UserProfile).display_name?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
        )}
        <div className="flex-grow">
            <p className="font-medium text-sm truncate">{isProduct ? (item as Product).name : (item as UserProfile).display_name}</p>
            {isProduct && <p className="text-xs text-muted-foreground">GHC {(item as Product).price.toFixed(2)}</p>}
        </div>
        <div className="flex items-center gap-1">
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove('up')} disabled={isFirst}>
                <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onMove('down')} disabled={isLast}>
                <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    </div>
  );
}

function AddItemDialog({ section, allProducts, allSellers, onAddItems }: {
    section: { id: string, title: string, type: 'product' | 'seller' },
    allProducts: Product[],
    allSellers: UserProfile[],
    onAddItems: (sectionId: string, items: MergedItem[]) => void
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const items = useMemo(() => {
        return section.type === 'product' ? allProducts : allSellers;
    }, [section.type, allProducts, allSellers]);

    const fuse = useMemo(() => new Fuse(items, {
        keys: section.type === 'product' ? ['name'] : ['display_name'],
        threshold: 0.4,
    }), [items, section.type]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        return fuse.search(searchTerm).map(result => result.item);
    }, [searchTerm, items, fuse]);

    const handleToggleSelect = (itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    const handleAdd = () => {
        const itemsToAdd = items
            .filter(item => selectedItems.has('id' in item ? item.id : item.uid))
            .map(item => ({...item, itemType: section.type }));
        onAddItems(section.id, itemsToAdd);
        setSelectedItems(new Set());
    };

    return (
        <Dialog onOpenChange={() => { setSearchTerm(''); setSelectedItems(new Set()); }}>
            <DialogTrigger asChild>
                 <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add to: {section.title}</DialogTitle>
                    <DialogDescription>Select {section.type}s to add to this section.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                </div>
                 <div className="max-h-[50vh] overflow-y-auto p-1 space-y-2">
                    {filteredItems.map(item => {
                        const isProduct = 'price' in item;
                        const itemId = isProduct ? item.id : item.uid;
                        const isSelected = selectedItems.has(itemId);
                        return (
                            <div
                                key={itemId}
                                onClick={() => handleToggleSelect(itemId)}
                                className={`p-2 rounded-md border flex items-center gap-3 cursor-pointer ${isSelected ? 'bg-primary/10 border-primary' : 'bg-card'}`}
                            >
                                {isProduct ? (
                                    <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
                                        <Image src={(item as Product).image_urls?.[0] || 'https://placehold.co/100x100.png'} alt={(item as Product).name} fill className="object-cover" />
                                    </div>
                                ) : (
                                    <Avatar className="h-10 w-10">
                                        <AvatarImage src={(item as UserProfile).avatar_url || ''} />
                                        <AvatarFallback>{(item as UserProfile).display_name?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                )}
                                <p className="font-medium text-sm truncate">{isProduct ? (item as Product).name : (item as UserProfile).display_name}</p>
                            </div>
                        )
                    })}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                         <Button onClick={handleAdd} disabled={selectedItems.size === 0}>Add ({selectedItems.size}) Selected</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function MerchandisingPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);
  
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allSellers, setAllSellers] = useState<UserProfile[]>([]);
  
  const [sections, setSections] = useState<Record<string, MergedItem[]>>({
    hero_slider: [],
    top_sellers: [],
    featured_items: [],
    limited_time_offer: [],
  });

  useEffect(() => {
    const timer = setTimeout(() => {
        if (loading) {
            setShowSlowLoadMessage(true);
        }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const productsPromise = supabase.from('products').select('*, profiles(*)').eq('status', 'approved');
        const sellersPromise = supabase.from('profiles').select('*').eq('is_verified_seller', true);
        const merchandisedPromise = getMerchandisedItems();

        const [
          { data: productsData, error: productsError }, 
          { data: sellersData, error: sellersError }, 
          merchandisedResult
        ] = await Promise.all([productsPromise, sellersPromise, merchandisedPromise]);

        if (productsError) throw productsError;
        if (sellersError) throw sellersError;
        if (merchandisedResult.error) throw new Error(merchandisedResult.error);

        setAllProducts(productsData || []);
        setAllSellers(sellersData || []);
        
        const merchandisedContent = merchandisedResult.data || {};
        const initialSections: Record<string, MergedItem[]> = { hero_slider: [], top_sellers: [], featured_items: [], limited_time_offer: [] };

        for (const sectionId of SECTIONS.map(s => s.id)) {
           if (merchandisedContent[sectionId]) {
                initialSections[sectionId] = merchandisedContent[sectionId].map(item => ({
                    ...item,
                    itemType: 'price' in item ? 'product' : 'seller'
                }));
            }
        }
        setSections(initialSections);

      } catch (error: any) {
        toast({ title: "Error", description: `Failed to load data: ${error.message}`, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [toast]);
  

  const handleAddItems = (sectionId: string, itemsToAdd: MergedItem[]) => {
      setSections(prevSections => {
          const currentItems = prevSections[sectionId] || [];
          const currentItemIds = new Set(currentItems.map(item => 'id' in item ? item.id : item.uid));
          const newItems = itemsToAdd.filter(item => !currentItemIds.has('id' in item ? item.id : item.uid));
          return {
              ...prevSections,
              [sectionId]: [...currentItems, ...newItems]
          };
      });
  };

  const handleRemoveItem = (sectionId: string, itemIndex: number) => {
      setSections(prevSections => {
          const newItems = [...prevSections[sectionId]];
          newItems.splice(itemIndex, 1);
          return { ...prevSections, [sectionId]: newItems };
      });
  };

  const handleMoveItem = (sectionId: string, itemIndex: number, direction: 'up' | 'down') => {
      setSections(prevSections => {
          const newItems = [...prevSections[sectionId]];
          const item = newItems[itemIndex];
          const swapIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
          
          if (swapIndex < 0 || swapIndex >= newItems.length) return prevSections;

          newItems[itemIndex] = newItems[swapIndex];
          newItems[swapIndex] = item;
          
          return { ...prevSections, [sectionId]: newItems };
      });
  }

  const handleSave = async () => {
    setIsSaving(true);
    const sectionsToSave = Object.entries(sections)
        .map(([sectionId, items]) => ({
            sectionId,
            items: items.map(item => ({
                id: 'id' in item ? item.id : item.uid,
                type: item.itemType,
            }))
    }));

    const result = await saveAllMerchandisedItems(sectionsToSave);
    if(result.success) {
        toast({ title: "Success", description: "Homepage content has been saved." });
    } else {
        toast({ title: "Error", description: `Failed to save: ${result.error}`, variant: "destructive"});
    }
    setIsSaving(false);
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
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold">Homepage Merchandising</h1>
                <p className="text-muted-foreground">Click to add, remove, and reorder content on the homepage.</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SECTIONS.map(sectionInfo => (
                <Card key={sectionInfo.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{sectionInfo.title}</CardTitle>
                             <CardDescription>Type: {sectionInfo.type}</CardDescription>
                        </div>
                        <AddItemDialog 
                            section={sectionInfo}
                            allProducts={allProducts}
                            allSellers={allSellers}
                            onAddItems={handleAddItems}
                        />
                    </CardHeader>
                    <CardContent>
                        {sections[sectionInfo.id] && sections[sectionInfo.id].length > 0 ? (
                            sections[sectionInfo.id].map((item, index) => (
                                <ItemRow 
                                    key={'id' in item ? item.id : item.uid} 
                                    item={item}
                                    onRemove={() => handleRemoveItem(sectionInfo.id, index)}
                                    onMove={(dir) => handleMoveItem(sectionInfo.id, index, dir)}
                                    isFirst={index === 0}
                                    isLast={index === sections[sectionInfo.id].length - 1}
                                />
                            ))
                        ) : <p className="text-sm text-muted-foreground text-center py-8">No items in this section.</p>}
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
  )
}

    

    