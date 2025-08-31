import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useWidgets } from "../../hooks/useWidgets"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table"
import { Badge } from "../ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Plus, Settings, Calendar, Copy, Info } from "lucide-react"
import { WidgetEditForm } from "./WidgetEditForm"
import { formatDistanceToNow } from "date-fns"
import { toast } from "../ui/use-toast"
import { Label } from "../ui/label"

interface Widget {
  id: string
  site_key: string
  name: string
  allowed_domains: string[]
  theme: Record<string, any>
  created_at: string
  updated_at: string
}

function WidgetList() {
  const navigate = useNavigate()
  const { widgets, loading, createWidget, updateWidget, createdSecret, setCreatedSecret } = useWidgets()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedWidgetInfo, setSelectedWidgetInfo] = useState<Widget | null>(null)

  const handleCreateWidget = async (widgetId: string | null, data: any) => {
    setSaving(true)
    try {
      await createWidget(data)
      setIsCreateDialogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleEditWidget = (widget: Widget) => {
    navigate(`/widget-edit/${widget.id}`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading widgets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {widgets.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No widgets found</h3>
              <p className="text-muted-foreground mb-6">
                Create your first widget to start embedding chat functionality on your websites.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Widget
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Site Key</TableHead>
                    <TableHead>Domains</TableHead>
                    <TableHead>Info</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {widgets.map((widget) => (
                    <TableRow key={widget.id}>
                      <TableCell className="font-medium">{widget.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {widget.site_key.substring(0, 12)}...
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {widget.allowed_domains.slice(0, 2).map((domain, index) => (
                            <div key={index} className="text-sm">
                              {domain.length > 25 ? `${domain.substring(0, 25)}...` : domain}
                            </div>
                          ))}
                          {widget.allowed_domains.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{widget.allowed_domains.length - 2} more
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedWidgetInfo(widget)}
                        >
                          <Info className="w-4 h-4 text-primary" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 mr-1" />
                          {formatDistanceToNow(new Date(widget.updated_at), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditWidget(widget)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Widget</DialogTitle>
            <DialogDescription>
              Create a new chat widget for your website
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <WidgetEditForm
              widget={null}
              onSave={handleCreateWidget}
              onCancel={() => setIsCreateDialogOpen(false)}
              saving={saving}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Secret Display Dialog */}
      <Dialog open={!!createdSecret} onOpenChange={() => setCreatedSecret(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Widget Secret</DialogTitle>
            <DialogDescription>
              Save this secret key - it will only be shown once and is needed for user authentication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-medium">Secret Key</Label>
              <div className="mt-2 p-2 bg-background border rounded font-mono text-sm break-all">
                {createdSecret}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(createdSecret!)
                  toast({ title: "Copied to clipboard" })
                }}
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Secret
              </Button>
              <Button onClick={() => setCreatedSecret(null)}>
                I've Saved It
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Widget Info Dialog */}
      <Dialog open={!!selectedWidgetInfo} onOpenChange={() => setSelectedWidgetInfo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Widget Information</DialogTitle>
            <DialogDescription>
              Detailed information about "{selectedWidgetInfo?.name}"
            </DialogDescription>
          </DialogHeader>
          {selectedWidgetInfo && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Widget Name</Label>
                  <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                    {selectedWidgetInfo.name}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Widget ID</Label>
                  <div className="mt-1 p-2 bg-muted rounded-md font-mono text-sm break-all">
                    {selectedWidgetInfo.id}
                  </div>
                </div>
              </div>

              {/* Site Key */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Site Key</Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-sm break-all">
                  {selectedWidgetInfo.site_key}
                </div>
              </div>

              {/* Allowed Domains */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Allowed Domains</Label>
                <div className="mt-1 space-y-1">
                  {selectedWidgetInfo.allowed_domains.map((domain, index) => (
                    <div key={index} className="p-2 bg-muted rounded-md text-sm">
                      {domain}
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme Information */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Theme Configuration</Label>
                <div className="mt-1 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Primary Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-4 h-4 rounded border" 
                          style={{ backgroundColor: selectedWidgetInfo.theme.color_primary }}
                        ></div>
                        <span className="text-sm">{selectedWidgetInfo.theme.color_primary}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Text Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <div 
                          className="w-4 h-4 rounded border" 
                          style={{ backgroundColor: selectedWidgetInfo.theme.text_color }}
                        ></div>
                        <span className="text-sm">{selectedWidgetInfo.theme.text_color}</span>
                      </div>
                    </div>
                  </div>
                  
                  {selectedWidgetInfo.theme.logo_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Logo URL</Label>
                      <div className="mt-1 p-2 bg-muted rounded-md text-sm break-all">
                        {selectedWidgetInfo.theme.logo_url}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">Welcome Message</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md text-sm">
                      {selectedWidgetInfo.theme.welcome_text}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <div className="mt-1 text-sm">
                    {new Date(selectedWidgetInfo.created_at).toLocaleDateString()} at{" "}
                    {new Date(selectedWidgetInfo.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                  <div className="mt-1 text-sm">
                    {new Date(selectedWidgetInfo.updated_at).toLocaleDateString()} at{" "}
                    {new Date(selectedWidgetInfo.updated_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedWidgetInfo(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setSelectedWidgetInfo(null);
                  handleEditWidget(selectedWidgetInfo);
                }}>
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Widget
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { WidgetList }
export default WidgetList