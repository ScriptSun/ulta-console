import { useState } from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Plus, Play, Pause, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import { Progress } from "@/components/ui/progress"
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

interface BatchExecution {
  id: string
  name: string
  status: "running" | "completed" | "failed" | "paused" | "queued"
  progress: number
  totalTargets: number
  completedTargets: number
  startedAt: string
  estimatedCompletion?: string
}

const mockData: BatchExecution[] = [
  {
    id: "1",
    name: "Security Audit - All Servers",
    status: "running",
    progress: 65,
    totalTargets: 24,
    completedTargets: 16,
    startedAt: "2024-01-20 14:30",
    estimatedCompletion: "2024-01-20 16:45"
  },
  {
    id: "2",
    name: "Log Cleanup - Dev Environment", 
    status: "completed",
    progress: 100,
    totalTargets: 8,
    completedTargets: 8,
    startedAt: "2024-01-20 12:00",
    estimatedCompletion: "2024-01-20 12:30"
  },
  {
    id: "3",
    name: "System Updates - Production",
    status: "queued",
    progress: 0,
    totalTargets: 12,
    completedTargets: 0,
    startedAt: "2024-01-20 18:00"
  }
]

const columns: ColumnDef<BatchExecution>[] = [
  {
    accessorKey: "name",
    header: "Batch Name",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      const variants = {
        running: "default",
        completed: "default", 
        failed: "destructive",
        paused: "secondary",
        queued: "outline"
      } as const
      
      return (
        <Badge variant={variants[status as keyof typeof variants]}>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.getValue("progress") as number
      const completed = row.original.completedTargets
      const total = row.original.totalTargets
      
      return (
        <div className="w-full space-y-1">
          <Progress value={progress} className="w-[60px]" />
          <div className="text-xs text-muted-foreground">
            {completed}/{total} targets
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "startedAt",
    header: "Started",
  },
  {
    accessorKey: "estimatedCompletion",
    header: "ETA",
    cell: ({ row }) => {
      const eta = row.getValue("estimatedCompletion") as string
      return eta || "—"
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const batch = row.original
      
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
              {batch.status === "running" && (
                <DropdownMenuItem>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause batch
                </DropdownMenuItem>
              )}
              {batch.status === "paused" && (
                <DropdownMenuItem>
                  <Play className="mr-2 h-4 w-4" />
                  Resume batch
                </DropdownMenuItem>
              )}
              <DropdownMenuItem>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry failed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Cancel batch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <SheetContent className="w-[600px] sm:w-[600px]">
            <SheetHeader>
              <SheetTitle>Batch Execution Details</SheetTitle>
              <SheetDescription>
                {batch.name}
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Status</h4>
                  <Badge variant={
                    batch.status === "running" ? "default" :
                    batch.status === "completed" ? "default" :
                    batch.status === "failed" ? "destructive" :
                    batch.status === "paused" ? "secondary" : "outline"
                  } className="mt-1">
                    {batch.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">Progress</h4>
                  <div className="mt-1">
                    <Progress value={batch.progress} className="w-full" />
                    <div className="text-sm text-muted-foreground mt-1">
                      {batch.completedTargets}/{batch.totalTargets} targets completed
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Target Status</h4>
                <div className="space-y-2">
                  {Array.from({ length: batch.totalTargets }, (_, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">server-{String(i + 1).padStart(2, '0')}.example.com</span>
                      <Badge variant={
                        i < batch.completedTargets ? "default" : 
                        i === batch.completedTargets && batch.status === "running" ? "secondary" : 
                        "outline"
                      }>
                        {i < batch.completedTargets ? "completed" : 
                         i === batch.completedTargets && batch.status === "running" ? "running" : 
                         "pending"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )
    },
  },
]

export default function ScriptsBatches() {
  const [data] = useState<BatchExecution[]>(mockData)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Batch Executions</h1>
          <p className="text-muted-foreground">
            Monitor and manage batch script executions
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Batch
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={data}
        searchKey="name"
        searchPlaceholder="Search batches..."
      />
    </div>
  )
}