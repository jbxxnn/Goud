'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon, Cancel01Icon, CheckmarkCircle01Icon, File01Icon } from '@hugeicons/core-free-icons';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface MediaUploadProps {
    bookingId: string;
    onUploadComplete?: () => void;
}

export function MediaUpload({ bookingId, onUploadComplete }: MediaUploadProps) {
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (fileList: FileList) => {
        const newFiles = Array.from(fileList);
        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const uploadFiles = async () => {
        if (files.length === 0) return;
        setUploading(true);
        setProgress(0);

        const supabase = createClient();
        let uploadedCount = 0;
        let hasError = false;

        for (const file of files) {
            try {
                // Sanitize filename
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(7)}_${Date.now()}.${fileExt}`;
                const filePath = `${bookingId}/${fileName}`;

                const { error } = await supabase.storage
                    .from('booking-results')
                    .upload(filePath, file);

                if (error) throw error;
                uploadedCount++;
                setProgress((uploadedCount / files.length) * 100);
            } catch (error) {
                console.error('Upload error:', error);
                toast.error(`Failed to upload ${file.name}`);
                hasError = true;
            }
        }

        setUploading(false);
        setFiles([]); // Clear queue

        if (!hasError) {
            toast.success('Files uploaded successfully');
            if (onUploadComplete) onUploadComplete();
        } else {
            toast.warning('Some files failed to upload');
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:bg-muted/50'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <HugeiconsIcon icon={CloudUploadIcon} size={32} className="text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">Drag & Drop files here</h3>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleChange}
                    disabled={uploading}
                />
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                >
                    Select Files
                </Button>
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium">
                        <span>{files.length} file(s) selected</span>
                        <Button variant="ghost" size="sm" onClick={() => setFiles([])} disabled={uploading} className="h-auto p-0 text-muted-foreground hover:text-destructive">
                            Clear all
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-muted/40 rounded border text-sm">
                                <span className="truncate max-w-[200px] flex items-center gap-2">
                                    <HugeiconsIcon icon={File01Icon} size={14} className="text-muted-foreground" />
                                    {file.name}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeFile(i)}
                                    disabled={uploading}
                                >
                                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {uploading && (
                        <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">Uploading... {Math.round(progress)}%</p>
                        </div>
                    )}

                    <Button className="w-full" onClick={uploadFiles} disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Upload Media'}
                    </Button>
                </div>
            )}
        </div>
    );
}
