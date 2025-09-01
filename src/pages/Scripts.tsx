import { useState } from "react"
import { Link } from "react-router-dom"
import { Plus, FileText, List, Package, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const scriptSections = [
  {
    title: "Templates", 
    description: "Script templates with batch management",
    icon: FileText,
    url: "/scripts/allowlist/batches",
    color: "bg-green-500/10 text-green-600"
  },
  {
    title: "Batches",
    description: "Batch script execution and monitoring", 
    icon: Package,
    url: "/scripts/batches",
    color: "bg-primary/10 text-primary"
  },
  {
    title: "Settings",
    description: "Script execution settings and configuration",
    icon: Settings,
    url: "/scripts/settings", 
    color: "bg-orange-500/10 text-orange-600"
  }
]

export default function Scripts() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scripts</h1>
          <p className="text-muted-foreground">
            Manage script execution, templates, and security policies
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Script
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {scriptSections.map((section) => (
          <Link key={section.title} to={section.url}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${section.color}`}>
                  <section.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Click to manage {section.title.toLowerCase()}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}