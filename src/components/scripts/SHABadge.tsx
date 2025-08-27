import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatSHA256 } from '@/utils/sha256';

interface SHABadgeProps {
  sha256: string;
  variant?: 'default' | 'secondary' | 'outline';
}

export function SHABadge({ sha256, variant = 'outline' }: SHABadgeProps) {
  const [copied, setCopied] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={variant} 
            className="font-mono cursor-pointer transition-smooth"
            onClick={() => setShowFull(!showFull)}
          >
            {formatSHA256(sha256, !showFull)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to toggle full SHA256</p>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied!' : 'Copy full SHA256'}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}