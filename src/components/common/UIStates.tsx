import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface LoadingStateProps {
  message?: string;
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Sedang memuat data...',
  count = 3,
}) => {
  return (
    <div className="py-6 space-y-3">
      <div className="flex items-center justify-center gap-2 text-primary mb-4">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-xs font-medium text-muted-foreground">{message}</span>
      </div>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-card border border-border rounded-xl p-3.5 space-y-2.5 shadow-2xs"
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-1/3 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2 rounded" />
          <div className="pt-2 flex justify-between items-center border-t border-border/50">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-6 w-14 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="bg-card border border-dashed border-border rounded-2xl p-6 sm:p-8 text-center my-4 flex flex-col items-center justify-center">
      <div className="w-12 h-12 bg-muted text-muted-foreground rounded-xl flex items-center justify-center mb-2.5">
        <Inbox className="w-6 h-6" />
      </div>
      <h3 className="text-sm sm:text-base font-heading font-bold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="rounded-lg text-xs"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
}) => {
  return (
    <Alert variant="destructive" className="my-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <div className="ml-2">
        <AlertTitle className="text-xs sm:text-sm font-bold">Terjadi Kesalahan</AlertTitle>
        <AlertDescription className="text-xs mt-0.5">{message}</AlertDescription>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="mt-2.5 h-6 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Coba Muat Ulang
          </Button>
        )}
      </div>
    </Alert>
  );
};
