
export interface Product {
  id: string;
  created_at: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sellerId: string;
  isBoosted?: boolean;
  seller_uid?: string;
  image_urls?: string[]; // Supabase uses this
  condition: 'new' | 'used' | 'na';
  type: 'product' | 'service';
  status: 'pending' | 'approved' | 'rejected'; // New status field
  profiles: { uid:string; phone_number: string | null; display_name: string | null; avatar_url: string | null; } | null;
  sellerProfile?: UserProfile | null;
  view_count?: number;
  edit_count?: number;
  delivery_option: 'none' | 'paid' | 'free' | 'based_on_location';
  delivery_price?: number | null;
  location?: string;
  quantity: number | null;
  is_unlimited: boolean;
  supplier_id?: string | null;
  search_tags?: string[];
}

export interface UserProfile {
  id: string; // Keep for compatibility with MergedItem
  uid: string;
  email: string | null;
  display_name: string | null;
  phone_number: string | null;
  location?: string;
  is_verified_seller?: boolean;
  avatar_url?: string;
}

export interface WishlistItem {
    user_id: string;
    product_id: string;
    created_at: string;
    products: Product;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  created_at: string;
  buyer_uid: string;
  product_id: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'approved' | 'declined';
  product: Pick<Product, 'name' | 'id' | 'image_urls' | 'quantity' | 'is_unlimited'>;
  buyer: UserProfile; // Kept for potential backward compatibility or other uses
  delivery_method: 'pickup' | 'delivery';
  delivery_fee: number;
  final_total: number;
  // Denormalized buyer info at time of order
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  order_notes?: string | null;
}

export interface SellerVerification {
    id: string;
    created_at: string;
    user_id: string;
    selfie_url: string;
    status: 'pending' | 'approved' | 'rejected';
    profile: UserProfile;
    full_name: string;
    business_name: string;
    location: string;
    business_email: string;
    business_phone: string;
}

export interface TeamMember {
    id: string;
    created_at: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    image_url?: string | null;
    school?: string | null;
}

export interface Supplier {
    id: string;
    created_at: string;
    name: string;
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
}

export interface DropshippedProduct {
    id: string;
    created_at: string;
    name: string;
    supplier_id: string;
    product_id?: string | null;
    cost_price: number;
    notes?: string | null;
}

// Chat types
export interface Conversation {
  id: string;
  created_at: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  buyer_deleted: boolean;
  seller_deleted: boolean;
}

export interface Message {
  id: string;
  created_at: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
}

export interface ConversationWithDetails extends Conversation {
    product: Product;
    otherUser: UserProfile;
    unread_count: number;
    last_message_content?: string;
    last_message_at?: string;
}


// Feed Types
export interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
  deleted_at: string | null;
  author: {
    uid: string;
    display_name: string;
    avatar_url: string;
    is_verified_seller: boolean;
  };
  images: string[];
  like_count: number;
  comment_count: number;
  is_liked_by_user: boolean;
}

export interface FeedPostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    uid: string;
    display_name: string;
    avatar_url: string;
    is_verified_seller: boolean;
  };
}
