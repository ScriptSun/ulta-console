import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Shield, AlertTriangle } from "lucide-react"
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

interface AllowlistEntry {
  id: string
  scriptName: string
  hash: string
  status: "approved" | "pending" | "blocked"
  risk: "low" | "medium" | "high"
  createdAt: string
  lastUsed: string
}

const mockData: AllowlistEntry[] = [
  {
    id: "1",
    scriptName: "system_monitor.sh",
    hash: "sha256:abc123...",
    status: "approved",
    risk: "low",
    createdAt: "2024-01-15",
    lastUsed: "2024-01-20"
  },
  {
    id: "2", 
    scriptName: "network_config.py",
    hash: "sha256:def456...",
    status: "pending",
    risk: "medium",
    createdAt: "2024-01-16",
    lastUsed: "Never"
  }
]

const columns: ColumnDef<AllowlistEntry>[] = [
  {
    accessorKey: "scriptName",
    header: "Script Name",
  },
  {
    accessorKey: "hash",
    header: "Hash",
    cell: ({ row }) => (
      <code className="text-xs bg-muted px-2 py-1 rounded">
        {row.getValue("hash")}
      </code>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={
          status === "approved" ? "default" : 
          status === "pending" ? "secondary" : "destructive"
        }>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "risk",
    header: "Risk Level",
    cell: ({ row }) => {
      const risk = row.getValue("risk") as string
      const icon = risk === "high" ? AlertTriangle : Shield
      return (
        <div className="flex items-center gap-2">
          {risk === "high" && <AlertTriangle className="h-4 w-4 text-red-500" />}
          {risk === "medium" && <Shield className="h-4 w-4 text-yellow-500" />}
          {risk === "low" && <Shield className="h-4 w-4 text-green-500" />}
          <span className="capitalize">{risk}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "lastUsed",
    header: "Last Used",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const entry = row.original
      
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
                <DropdownMenuItem>View details</DropdownMenuItem>
              </SheetTrigger>
              <DropdownMenuItem>Edit permissions</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Remove from allowlist
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Script Details</SheetTitle>
              <SheetDescription>
                View and manage allowlist entry for {entry.scriptName}
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <div>
                <h4 className="font-medium">Script Name</h4>
                <p className="text-sm text-muted-foreground">{entry.scriptName}</p>
              </div>
              <div>
                <h4 className="font-medium">Hash</h4>
                <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                  {entry.hash}
                </code>
              </div>
              <div>
                <h4 className="font-medium">Risk Assessment</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="h-4 w-4" />
                  <span className="capitalize text-sm">{entry.risk} risk</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )
    },
  },
]

export default function ScriptsAllowlist() {
  const [data] = useState<AllowlistEntry[]>(mockData)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Script Allowlist</h1>
          <p className="text-muted-foreground">
            Manage approved scripts and security policies
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Script
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data}
        searchKey="scriptName"
        searchPlaceholder="Search scripts..."
      />
    </div>
  )
}