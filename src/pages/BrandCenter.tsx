import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Palette,
  Image,
  ArrowRight
} from 'lucide-react';
import { LogoFaviconManager } from '@/components/brand/LogoFaviconManager';
import { useNavigate } from 'react-router-dom';

const brandSections = [
  {
    title: 'Logos and Favicon',
    description: 'Manage your brand logos and generate favicons',
    icon: Image,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    statsLine: 'Light logo, Dark logo, Email logo, Favicon set',
    action: 'Manage',
    id: 'logos-favicon'
  },
  {
    title: 'Theme Colors',
    description: 'Customize your brand color palette',
    icon: Palette,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    statsLine: 'Primary, Secondary, Accent colors configured',
    action: 'Customize',
    id: 'theme-colors',
    href: '/system-settings/brand/theme'
  }
];

export default function BrandCenter() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = React.useState<string | null>(null);

  const handleSectionClick = (sectionId: string, href?: string) => {
    if (href) {
      navigate(href);
    } else {
      setActiveSection(sectionId);
    }
  };

  const handleCloseDrawer = () => {
    setActiveSection(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          Brand Center
        </h1>
        <p className="text-muted-foreground">
          Manage logos, favicons, colors, and brand files
        </p>
      </div>

      {/* Brand Management Grid */}
      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        {brandSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id} className="group hover:shadow-md transition-smooth">
              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {section.title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth" />
                </CardTitle>
                <CardDescription>
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {section.statsLine}
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleSectionClick(section.id, (section as any).href)}
                >
                  {section.action}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Logo and Favicon Manager Drawer */}
      {activeSection === 'logos-favicon' && (
        <LogoFaviconManager 
          open={true}
          onClose={handleCloseDrawer}
        />
      )}

    </div>
  );
}