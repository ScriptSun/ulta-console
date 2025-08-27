import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { computeSHA256 } from '@/utils/sha256';
import { SHABadge } from './SHABadge';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface FilePreview {
  file: File;
  sha256: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface UploadScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UploadScriptDialog({ open, onOpenChange, onSuccess }: UploadScriptDialogProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles = fileArray.filter(file => 
      file.name.endsWith('.sh') || file.type === 'application/zip'
    );

    if (validFiles.length !== fileArray.length) {
      toast({
        title: 'Invalid files',
        description: 'Only .sh and .zip files are allowed',
        variant: 'destructive',
      });
    }

    const previews: FilePreview[] = [];
    for (const file of validFiles) {
      try {
        const sha256 = await computeSHA256(file);
        previews.push({
          file,
          sha256,
          status: 'pending'
        });
      } catch (error) {
        previews.push({
          file,
          sha256: '',
          status: 'error',
          error: 'Failed to compute SHA256'
        });
      }
    }

    setFiles(previews);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const updatedFiles = [...files];

    try {
      for (let i = 0; i < updatedFiles.length; i++) {
        updatedFiles[i].status = 'processing';
        setFiles([...updatedFiles]);

        try {
          // TODO: Implement API call to upload script
          // const formData = new FormData();
          // formData.append('file', updatedFiles[i].file);
          // const response = await fetch('/api/scripts/upload', {
          //   method: 'POST',
          //   body: formData
          // });

          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          updatedFiles[i].status = 'success';
        } catch (error) {
          updatedFiles[i].status = 'error';
          updatedFiles[i].error = 'Upload failed';
        }

        setFiles([...updatedFiles]);
      }

      const successCount = updatedFiles.filter(f => f.status === 'success').length;
      toast({
        title: 'Upload Complete',
        description: `${successCount} of ${files.length} files uploaded successfully`,
      });

      if (successCount > 0) {
        onSuccess?.();
      }
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: FilePreview['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'processing':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Scripts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">Select Files</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Input
                id="files"
                type="file"
                multiple
                accept=".sh,application/zip"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              <Label
                htmlFor="files"
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-smooth"
              >
                Click to select .sh files or .zip archives
              </Label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>File Preview</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {files.map((preview, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    {getStatusIcon(preview.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {preview.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(preview.file.size / 1024).toFixed(1)} KB
                      </p>
                      {preview.error && (
                        <p className="text-xs text-destructive">{preview.error}</p>
                      )}
                    </div>
                    {preview.sha256 && (
                      <SHABadge sha256={preview.sha256} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setFiles([]);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} Files`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}