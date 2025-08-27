import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Copy, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"

interface ScriptTemplate {
  id: string
  name: string
  description: string
  category: string
  language: "bash" | "python" | "powershell"
  createdAt: string
  usageCount: number
}

const mockData: ScriptTemplate[] = [
  {
    id: "1",
    name: "System Health Check",
    description: "Comprehensive system monitoring script",
    category: "monitoring",
    language: "bash",
    createdAt: "2024-01-10",
    usageCount: 42
  },
  {
    id: "2",
    name: "Log Cleanup",
    description: "Automated log rotation and cleanup",
    category: "maintenance", 
    language: "python",
    createdAt: "2024-01-12",
    usageCount: 28
  }
]

const columns: ColumnDef<ScriptTemplate>[] = [
  {
    accessorKey: "name",
    header: "Template Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.getValue("category")}
      </Badge>
    ),
  },
  {
    accessorKey: "language",
    header: "Language",
    cell: ({ row }) => (
      <Badge variant="outline">
        {row.getValue("language")}
      </Badge>
    ),
  },
  {
    accessorKey: "usageCount",
    header: "Usage Count",
  },
  {
    accessorKey: "createdAt",
    header: "Created",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const template = row.original
      
      return (
        <Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <SheetTrigger asChild>
                <DropdownMenuItem>View template</DropdownMenuItem>
              </SheetTrigger>
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Play className="mr-2 h-4 w-4" />
                Execute
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Delete template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <SheetContent className="w-[600px] sm:w-[600px]">
            <SheetHeader>
              <SheetTitle>Template: {template.name}</SheetTitle>
              <SheetDescription>
                {template.description}
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Category</h4>
                  <Badge variant="secondary" className="capitalize mt-1">
                    {template.category}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">Language</h4>
                  <Badge variant="outline" className="mt-1">
                    {template.language}
                  </Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Script Content</h4>
                <Textarea 
                  readOnly
                  value="#!/bin/bash\n\n# System Health Check Script\necho 'Starting system health check...'\n\n# Check disk usage\ndf -h\n\n# Check memory usage\nfree -h\n\n# Check CPU load\nuptime"
                  className="font-mono text-sm h-48"
                />
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Execute Template
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Copy className="h-4 w-4" />
                  Copy Template
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )
    },
  },
]

export default function ScriptsTemplates() {
  const [data] = useState<ScriptTemplate[]>(mockData)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Script Templates</h1>
          <p className="text-muted-foreground">
            Reusable script templates and blueprints
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data}
        searchKey="name"
        searchPlaceholder="Search templates..."
      />
    </div>
  )
}