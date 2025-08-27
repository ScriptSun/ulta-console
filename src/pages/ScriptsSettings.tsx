import { useState } from "react"
import { Save, Shield, Clock, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

export default function ScriptsSettings() {
  const [settings, setSettings] = useState({
    maxExecutionTime: "300",
    maxConcurrentJobs: "10", 
    requireApproval: true,
    logRetention: "30",
    securityLevel: "medium",
    allowedLanguages: ["bash", "python"],
    notificationEmail: "admin@example.com"
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Script Settings</h1>
          <p className="text-muted-foreground">
            Configure script execution policies and security settings
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Execution Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Execution Settings
            </CardTitle>
            <CardDescription>
              Configure script execution limits and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTime">Max Execution Time (seconds)</Label>
                <Input 
                  id="maxTime"
                  type="number"
                  value={settings.maxExecutionTime}
                  onChange={(e) => setSettings({...settings, maxExecutionTime: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxJobs">Max Concurrent Jobs</Label>
                <Input 
                  id="maxJobs"
                  type="number"
                  value={settings.maxConcurrentJobs}
                  onChange={(e) => setSettings({...settings, maxConcurrentJobs: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Manual Approval</Label>
                <div className="text-sm text-muted-foreground">
                  Scripts must be approved before execution
                </div>
              </div>
              <Switch 
                checked={settings.requireApproval}
                onCheckedChange={(checked) => setSettings({...settings, requireApproval: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Settings
            </CardTitle>
            <CardDescription>
              Configure security policies and restrictions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="security">Security Level</Label>
              <Select 
                value={settings.securityLevel}
                onValueChange={(value) => setSettings({...settings, securityLevel: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Basic validation</SelectItem>
                  <SelectItem value="medium">Medium - Standard security</SelectItem>
                  <SelectItem value="high">High - Strict validation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">Allowed Languages</Label>
              <div className="text-sm text-muted-foreground mb-2">
                Select which scripting languages are permitted
              </div>
              <div className="flex gap-4">
                {["bash", "python", "powershell", "javascript"].map((lang) => (
                  <div key={lang} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={lang}
                      checked={settings.allowedLanguages.includes(lang)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettings({
                            ...settings,
                            allowedLanguages: [...settings.allowedLanguages, lang]
                          })
                        } else {
                          setSettings({
                            ...settings,
                            allowedLanguages: settings.allowedLanguages.filter(l => l !== lang)
                          })
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={lang} className="capitalize">{lang}</Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monitoring & Logging */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Monitoring & Logging
            </CardTitle>
            <CardDescription>
              Configure logging and notification settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="retention">Log Retention (days)</Label>
              <Input 
                id="retention"
                type="number"
                value={settings.logRetention}
                onChange={(e) => setSettings({...settings, logRetention: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Notification Email</Label>
              <Input 
                id="email"
                type="email"
                value={settings.notificationEmail}
                onChange={(e) => setSettings({...settings, notificationEmail: e.target.value})}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="blocklist">Global Script Blocklist</Label>
              <Textarea 
                id="blocklist"
                placeholder="Enter blocked script patterns, one per line..."
                className="h-24"
              />
              <div className="text-sm text-muted-foreground">
                Scripts matching these patterns will be automatically blocked
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}