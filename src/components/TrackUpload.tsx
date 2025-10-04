import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Upload, Music, Loader2 } from "lucide-react";

import { uploadToNFTStorage } from "@/utils/nftStorage";
import { validateAudioFile, extractAudioDuration } from "@/utils/ipfs";
import { supabase } from "@/integrations/supabase/client";

interface TrackUploadProps {
  artistId: string;
  onUploadComplete?: () => void;
}

export const TrackUpload = ({ artistId, onUploadComplete }: TrackUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    try {
      validateAudioFile(selectedFile);
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
    } catch (error: any) {
      toast({
        title: "Invalid file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!file || !title || !artistId) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select a file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Extract audio duration
      const duration = await extractAudioDuration(file);

      // Upload to NFT.Storage
      const nftResult = await uploadToNFTStorage(file);
      setUploadProgress(100);

      // Save to Supabase
      const { error } = await supabase.from("tracks").insert({
        artist_id: artistId,
        title,
        description,
        genre,
        ipfs_cid: nftResult.cid,
        url: nftResult.url,
        duration,
        file_size: file.size,
      });

      if (error) throw error;

      toast({
        title: "Track uploaded!",
        description: "Your track is now available on the platform.",
      });

      // Reset form
      setFile(null);
      setTitle("");
      setDescription("");
      setGenre("");
      setUploadProgress(0);

      if (onUploadComplete) onUploadComplete();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload track. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="glass-card p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg music-gradient neon-glow flex items-center justify-center">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">Upload Track</h3>
            <p className="text-sm text-muted-foreground">Share your music with the world</p>
          </div>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary smooth-transition cursor-pointer">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">MP3, WAV, or OGG (max 100MB)</p>
              </>
            )}
          </label>
        </div>

        {/* Track Details */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Track Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter track title"
              disabled={uploading}
              className="glass-card"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Genre</label>
            <Input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g., Hip Hop, Electronic, Rock"
              disabled={uploading}
              className="glass-card"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your track..."
              disabled={uploading}
              className="glass-card min-h-[100px]"
            />
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading to NFT.Storage...</span>
              <span className="font-medium">{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || !title || uploading}
          className="w-full music-gradient neon-glow"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Track
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
