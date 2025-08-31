import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Plus, Globe } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Widget } from "@/hooks/useWidgets";

interface WidgetListProps {
  widgets: Widget[];
  loading: boolean;
  onEditWidget: (widget: Widget) => void;
  onCreateWidget: () => void;
}

export function WidgetList({ widgets, loading, onEditWidget, onCreateWidget }: WidgetListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Widgets...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Widget Configurations
            </CardTitle>
            <CardDescription>
              Manage your chat widget configurations and embed codes
            </CardDescription>
          </div>
          <Button onClick={onCreateWidget}>
            <Plus className="h-4 w-4 mr-2" />
            Create Widget
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {widgets.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No widgets configured</h3>
            <p className="text-muted-foreground mb-4">
              Create your first widget to get started with embedding chat functionality
            </p>
            <Button onClick={onCreateWidget}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Widget
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Site Key</TableHead>
                <TableHead>Allowed Domains</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {widgets.map((widget) => (
                <TableRow key={widget.id}>
                  <TableCell className="font-medium">
                    {widget.name}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {widget.site_key.substring(0, 12)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {widget.allowed_domains.length} domain{widget.allowed_domains.length !== 1 ? 's' : ''}
                      </Badge>
                      {widget.allowed_domains.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {widget.allowed_domains[0]}
                          {widget.allowed_domains.length > 1 && ` +${widget.allowed_domains.length - 1} more`}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(widget.updated_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditWidget(widget)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}