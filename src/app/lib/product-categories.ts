
import { Laptop, BookOpen, Shirt, Briefcase, Home, Utensils, Package, type LucideIcon } from 'lucide-react';

export interface ProductCategory {
    label: string;
    value: string;
    icon: LucideIcon;
}

export const productCategories: ProductCategory[] = [
    {
        label: "Electronics",
        value: "electronics",
        icon: Laptop,
    },
    {
        label: "Fashion",
        value: "fashion",
        icon: Shirt,
    },
    {
        label: "Services",
        value: "services",
        icon: Briefcase,
    },
    {
        label: "Other",
        value: "other",
        icon: Package,
    }
];


