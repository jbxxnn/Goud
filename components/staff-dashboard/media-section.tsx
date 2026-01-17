'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaUpload } from './media-upload';
import { createClient } from '@/lib/supabase/client';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon, VideoReplayIcon, Delete01Icon } from '@hugeicons/core-free-icons';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MediaSectionProps {
    bookingId: string;
}

interface MediaFile {
    name: string;
    url: string;
    type: 'image' | 'video';
}

export function MediaSection({ bookingId }: MediaSectionProps) {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchMedia = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.storage.from('booking-results').list(`${bookingId}/`);

            if (error) {
                console.error(error);
                return;
            }

            if (!data || data.length === 0) {
                setMediaFiles([]);
                return;
            }

            const files: MediaFile[] = [];
            for (const file of data) {
                if (file.name === '.emptyFolderPlaceholder') continue;

                const { data: urlData } = await supabase.storage
                    .from('booking-results')
                    .createSignedUrl(`${bookingId}/${file.name}`, 3600);

                if (urlData?.signedUrl) {
                    const type = file.metadata?.mimetype?.startsWith('video') ? 'video' : 'image';
                    files.push({
                        name: file.name,
                        url: urlData.signedUrl,
                        type
                    });
                }
            }
            setMediaFiles(files);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

    const handleDelete = async (fileName: string) => {
        if (!confirm('Are you sure you want to delete this file?')) return;

        const supabase = createClient();
        const { error } = await supabase.storage
            .from('booking-results')
            .remove([`${bookingId}/${fileName}`]);

        if (error) {
            toast.error('Failed to delete file');
        } else {
            toast.success('File deleted');
            fetchMedia();
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Media & Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <MediaUpload bookingId={bookingId} onUploadComplete={fetchMedia} />

                {mediaFiles.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {mediaFiles.map((file) => (
                            <div key={file.name} className="relative group aspect-square bg-muted rounded-md overflow-hidden border">
                                {file.type === 'image' ? (
                                    <Image
                                        src={file.url}
                                        alt={file.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <HugeiconsIcon icon={VideoReplayIcon} className="text-muted-foreground" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-white hover:text-primary">
                                        View
                                    </a>
                                    <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => handleDelete(file.name)}>
                                        <HugeiconsIcon icon={Delete01Icon} size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
