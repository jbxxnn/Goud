'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Booking } from '@/lib/types/booking';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, Image01Icon, VideoReplayIcon, Loading03Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface ResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: Booking | null;
}

interface MediaFile {
    name: string;
    url: string;
    type: 'image' | 'video';
    size: number;
}

export function ResultsModal({ isOpen, onClose, booking }: ResultsModalProps) {
    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && booking) {
            fetchMedia(booking.id);
        } else {
            setMediaFiles([]);
        }
    }, [isOpen, booking]);

    const fetchMedia = async (bookingId: string) => {
        setLoading(true);
        try {
            const supabase = createClient();
            // List files in the folder for this booking
            const { data, error } = await supabase
                .storage
                .from('booking-results')
                .list(`${bookingId}/`);

            if (error) {
                console.error('Error fetching media list:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                setMediaFiles([]);
                return;
            }

            // Generate signed URLs for each file
            const files: MediaFile[] = [];
            for (const file of data) {
                // Skip placeholders or folders if any
                if (file.name === '.emptyFolderPlaceholder') continue;

                const { data: urlData } = await supabase
                    .storage
                    .from('booking-results')
                    .createSignedUrl(`${bookingId}/${file.name}`, 3600); // 1 hour expiry

                if (urlData?.signedUrl) {
                    const type = file.metadata?.mimetype?.startsWith('video') ? 'video' : 'image';
                    files.push({
                        name: file.name,
                        url: urlData.signedUrl,
                        type,
                        size: file.metadata?.size || 0
                    });
                }
            }

            setMediaFiles(files);
        } catch (err) {
            console.error('Failed to load media:', err);
            toast.error('Could not load results media');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (file: MediaFile) => {
        try {
            const response = await fetch(file.url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            toast.error('Download failed');
        }
    };

    const images = mediaFiles.filter(f => f.type === 'image');
    const videos = mediaFiles.filter(f => f.type === 'video');

    if (!booking) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Your Echo Results
                        <Badge variant="outline" className="ml-2">
                            {new Date(booking.start_time).toLocaleDateString()}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        View and download images and videos from your appointment.
                    </DialogDescription>
                </DialogHeader>

                <Alert variant="default" className="bg-amber-50 border-amber-200 text-amber-800">
                    <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4 text-amber-600" />
                    <AlertTitle>Important Disclaimer</AlertTitle>
                    <AlertDescription className="text-amber-700">
                        These images and videos are for keepsake purposes only. They do <strong>not</strong> constitute a medical diagnosis.
                        If you have medical concerns, please consult your healthcare provider.
                    </AlertDescription>
                </Alert>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-sm text-gray-500">Loading your memories...</p>
                    </div>
                ) : mediaFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-lg border border-dashed">
                        <div className="p-3 bg-white rounded-full shadow-sm mb-3">
                            <HugeiconsIcon icon={Image01Icon} className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No results available yet</h3>
                        <p className="text-sm text-gray-500 max-w-xs mx-auto mt-1">
                            Media from your appointment hasn't been uploaded yet. Please check back later.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {images.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <HugeiconsIcon icon={Image01Icon} className="h-5 w-5" />
                                    Images ({images.length})
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {images.map((file) => (
                                        <div key={file.name} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                                            <div className="relative w-full h-full">
                                                {/* Use unoptimized for signed URLs which might expire or differ */}
                                                <Image
                                                    src={file.url}
                                                    alt={file.name}
                                                    fill
                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                    unoptimized
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="gap-2"
                                                    onClick={() => handleDownload(file)}
                                                >
                                                    <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />
                                                    Download
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {videos.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <HugeiconsIcon icon={VideoReplayIcon} className="h-5 w-5" />
                                    Videos ({videos.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {videos.map((file) => (
                                        <div key={file.name} className="bg-black rounded-lg overflow-hidden border">
                                            <video
                                                controls
                                                className="w-full aspect-video"
                                                src={file.url}
                                                preload="metadata"
                                            />
                                            <div className="p-3 bg-white border-t flex justify-between items-center">
                                                <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDownload(file)}
                                                >
                                                    <HugeiconsIcon icon={Download01Icon} className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
