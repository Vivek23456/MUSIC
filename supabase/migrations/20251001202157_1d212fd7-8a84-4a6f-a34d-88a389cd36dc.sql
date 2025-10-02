-- Create artists table
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  verified BOOLEAN DEFAULT false,
  total_streams BIGINT DEFAULT 0,
  total_earnings DECIMAL(20, 9) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(wallet_address)
);

-- Create tracks table
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  ipfs_cid TEXT NOT NULL,
  duration INTEGER NOT NULL,
  genre TEXT,
  cover_art_url TEXT,
  description TEXT,
  file_size BIGINT,
  stream_count BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create streams table for analytics
CREATE TABLE public.streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  listener_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  streamed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  duration_listened INTEGER,
  completed BOOLEAN DEFAULT false
);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  amount DECIMAL(20, 9) NOT NULL,
  transaction_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Create playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist_tracks junction table
CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Enable Row Level Security
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for artists
CREATE POLICY "Artists are viewable by everyone"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own artist profile"
  ON public.artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artist profile"
  ON public.artists FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for tracks
CREATE POLICY "Tracks are viewable by everyone"
  ON public.tracks FOR SELECT
  USING (true);

CREATE POLICY "Artists can create tracks"
  ON public.tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artists
      WHERE artists.id = tracks.artist_id
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can update their own tracks"
  ON public.tracks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.artists
      WHERE artists.id = tracks.artist_id
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Artists can delete their own tracks"
  ON public.tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.artists
      WHERE artists.id = tracks.artist_id
      AND artists.user_id = auth.uid()
    )
  );

-- RLS Policies for streams
CREATE POLICY "Users can view their own streams"
  ON public.streams FOR SELECT
  USING (auth.uid() = listener_id);

CREATE POLICY "Anyone can create stream records"
  ON public.streams FOR INSERT
  WITH CHECK (true);

-- RLS Policies for payments
CREATE POLICY "Artists can view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artists
      WHERE artists.id = payments.artist_id
      AND artists.user_id = auth.uid()
    )
  );

-- RLS Policies for playlists
CREATE POLICY "Public playlists are viewable by everyone"
  ON public.playlists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists"
  ON public.playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.playlists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for playlist_tracks
CREATE POLICY "Playlist tracks are viewable based on playlist visibility"
  ON public.playlist_tracks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND (playlists.is_public = true OR playlists.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can add tracks to their own playlists"
  ON public.playlist_tracks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove tracks from their own playlists"
  ON public.playlist_tracks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists
      WHERE playlists.id = playlist_tracks.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_tracks_artist_id ON public.tracks(artist_id);
CREATE INDEX idx_tracks_created_at ON public.tracks(created_at DESC);
CREATE INDEX idx_streams_track_id ON public.streams(track_id);
CREATE INDEX idx_streams_listener_id ON public.streams(listener_id);
CREATE INDEX idx_streams_streamed_at ON public.streams(streamed_at DESC);
CREATE INDEX idx_payments_artist_id ON public.payments(artist_id);
CREATE INDEX idx_playlist_tracks_playlist_id ON public.playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track_id ON public.playlist_tracks(track_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON public.artists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to increment stream count
CREATE OR REPLACE FUNCTION public.increment_stream_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.tracks
  SET stream_count = stream_count + 1
  WHERE id = NEW.track_id;
  
  UPDATE public.artists
  SET total_streams = total_streams + 1
  WHERE id = (SELECT artist_id FROM public.tracks WHERE id = NEW.track_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically increment stream counts
CREATE TRIGGER on_stream_created
  AFTER INSERT ON public.streams
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_stream_count();