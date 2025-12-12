
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CodeBlockProps {
    code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
    const { toast } = useToast();
    const [hasCopied, setHasCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code).then(() => {
            setHasCopied(true);
            toast({ title: 'Copied to clipboard!' });
            setTimeout(() => setHasCopied(false), 2000);
        });
    };

    return (
        <div className="relative font-mono text-sm bg-muted p-4 rounded-md border">
            <pre><code>{code}</code></pre>
            <Button 
                size="icon" 
                variant="ghost" 
                className="absolute top-2 right-2 h-8 w-8"
                onClick={copyToClipboard}
            >
                {hasCopied ? <Check className="text-green-500" /> : <Copy />}
            </Button>
        </div>
    );
}
