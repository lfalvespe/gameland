import React from 'react';
import { RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RematchButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
}

export const RematchButton: React.FC<RematchButtonProps> = ({ 
  onClick, 
  className, 
  label = "Rematch",
  size = 'md',
  isLoading = false,
  loadingLabel = "Waiting...",
  disabled = false
}) => {
  const sizeClasses = {
    sm: "px-4 py-2 text-[8px] gap-1.5",
    md: "px-8 py-3 text-[10px] gap-2",
    lg: "px-10 py-4 text-sm gap-3"
  };

  const iconSizes = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  const isDisabled = isLoading || disabled;

  return (
    <button 
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "flex items-center justify-center rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg",
        isDisabled 
          ? "bg-slate-800 text-slate-400 cursor-not-allowed border border-white/5 opacity-50 grayscale" 
          : "bg-blue-600 text-white hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,99,235,0.4)]",
        sizeClasses[size],
        className
      )}
    >
      <RotateCcw className={cn(
        "transition-transform duration-500", 
        isLoading ? "animate-spin" : "group-hover:rotate-180",
        iconSizes[size]
      )} />
      {isLoading ? loadingLabel : label}
    </button>
  );
};
