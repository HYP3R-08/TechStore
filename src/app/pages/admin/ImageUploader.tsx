import { useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

interface ImageUploaderProps {
  images: string[];
  onChange: (urls: string[]) => void;
}

export function ImageUploader({ images, onChange }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (error) {
      toast.error(`Could not upload ${file.name}: ${error.message}`);
      return null;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file);
      if (url) urls.push(url);
    }

    if (urls.length > 0) onChange([...images, ...urls]);
    setUploading(false);
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    try {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad protocol');
    } catch {
      toast.error('That is not a valid http(s) image URL');
      return;
    }

    onChange([...images, trimmed]);
    setUrlInput('');
  };

  const remove = (idx: number) => onChange(images.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <label className="block text-sm text-neutral-700 dark:text-neutral-300 tracking-wide">
        Photos{' '}
        {images.length > 0 && (
          <span className="text-neutral-400 dark:text-neutral-500">
            ({images.length} — first is cover)
          </span>
        )}
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 group"
            >
              <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
              {i === 0 && (
                <span className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-black" />
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg cursor-pointer hover:border-black dark:hover:border-white transition-colors text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {uploading ? 'Uploading...' : 'Upload from file'}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          aria-label="Image URL"
          placeholder="Or paste an image URL..."
          className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white rounded-lg text-sm focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={!urlInput.trim()}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
}
