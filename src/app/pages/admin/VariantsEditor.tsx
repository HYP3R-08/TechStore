import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProductVariant } from '../../../lib/supabase';
import { ImageUploader } from './ImageUploader';

interface VariantsEditorProps {
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
}

export function VariantsEditor({ variants, onChange }: VariantsEditorProps) {
  const [newColor, setNewColor] = useState('');

  const addVariant = () => {
    const trimmed = newColor.trim();
    if (!trimmed) return;
    onChange([...variants, { color: trimmed, images: [], stock: 0 }]);
    setNewColor('');
  };

  const removeVariant = (idx: number) => onChange(variants.filter((_, i) => i !== idx));

  const updateVariant = (idx: number, patch: Partial<ProductVariant>) =>
    onChange(variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  return (
    <div className="space-y-4">
      <label className="block text-sm text-neutral-700 dark:text-neutral-300 tracking-wide">
        Color Variants
      </label>

      {variants.map((variant, idx) => (
        <div
          key={idx}
          className="border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-normal text-black dark:text-white flex-1">
              {variant.color}
            </span>
            <div className="flex items-center gap-2">
              <label
                htmlFor={`variant-stock-${idx}`}
                className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
              >
                Stock
              </label>
              <input
                id={`variant-stock-${idx}`}
                type="number"
                min={0}
                value={variant.stock}
                onChange={(e) => updateVariant(idx, { stock: Math.max(0, Number(e.target.value)) })}
                className="w-20 px-2 py-1 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white rounded-lg text-sm focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors text-center"
              />
            </div>
            <button
              type="button"
              onClick={() => removeVariant(idx)}
              aria-label={`Remove ${variant.color} variant`}
              className="p-1 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
          <ImageUploader
            images={variant.images}
            onChange={(imgs) => updateVariant(idx, { images: imgs })}
          />
        </div>
      ))}

      <div className="flex gap-2">
        <input
          type="text"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addVariant();
            }
          }}
          aria-label="New colour name"
          placeholder="Color name (e.g. Space Gray, Midnight Blue)"
          className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-black dark:text-white rounded-lg text-sm focus:outline-none focus:border-black dark:focus:border-neutral-400 transition-colors"
        />
        <button
          type="button"
          onClick={addVariant}
          disabled={!newColor.trim()}
          className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add Color
        </button>
      </div>
    </div>
  );
}
