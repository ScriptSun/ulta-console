import React from 'react';
import { Button } from '@/components/ui/button';

interface QuickInputChipsProps {
  inputs: string[];
  onInputSelect: (input: string) => void;
}

export const QuickInputChips: React.FC<QuickInputChipsProps> = ({
  inputs,
  onInputSelect
}) => {
  if (!inputs || inputs.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {inputs.map((input, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={() => onInputSelect(input)}
        >
          {input}
        </Button>
      ))}
    </div>
  );
};