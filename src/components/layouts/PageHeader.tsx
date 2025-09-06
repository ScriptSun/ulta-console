import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  showBackButton,
  onBack,
  className = ""
}: PageHeaderProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs if not provided
  const autoBreadcrumbs = React.useMemo(() => {
    if (breadcrumbs) return breadcrumbs;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs = [{ label: 'Dashboard', href: '/dashboard' }];

    if (pathSegments.length > 0 && pathSegments[0] !== 'dashboard') {
      // Convert path segments to readable labels
      pathSegments.forEach((segment, index) => {
        const isLast = index === pathSegments.length - 1;
        const href = isLast ? undefined : `/${pathSegments.slice(0, index + 1).join('/')}`;
        
        // Convert kebab-case and snake_case to title case
        const label = segment
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());

        crumbs.push({ label, href });
      });
    }

    return crumbs;
  }, [location.pathname, breadcrumbs]);

  return (
    <div className={`space-y-4 border-b border-border pb-6 ${className}`}>
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          {autoBreadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {crumb.href ? (
                  <BreadcrumbLink href={crumb.href} className="text-muted-foreground hover:text-foreground">
                    {crumb.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-foreground font-medium">
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < autoBreadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header Content */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Go back</span>
              </Button>
            )}
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-muted-foreground text-lg max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}