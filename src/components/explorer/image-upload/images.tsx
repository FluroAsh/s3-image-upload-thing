import { cn } from '@/lib/utils'
import { LucideX } from 'lucide-react'

type ImageGridProps = {
  items: File[]
  handleRemoveImage: (index: number) => void
  children?: React.ReactNode
}

export const ImageGrid = ({ items, children, handleRemoveImage }: ImageGridProps) => {
  return (
    <div className="">
      <div className="grid grid-cols-4 gap-4">
        {items.map((item, i) => (
          <div key={`preview-image-${i}`} className="size-[150px]">
            {/* eslint-disable-next-line */}
            <Image image={item} onRemoveClick={() => handleRemoveImage(i + 1)} />
          </div>
        ))}

        {children}
      </div>
    </div>
  )
}

type ImageProps = {
  image: File
  onRemoveClick: () => void
}

export const Image = ({ image, onRemoveClick }: ImageProps) => {
  return (
    <div className="relative size-full group">
      <button
        className={cn(
          'absolute z-10 size-[28px] -top-3 -right-3 bg-red-500/70 hover:bg-red-500/90 backdrop-blur-sm rounded-full grid place-items-center',
          'transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg border border-white/20'
        )}
        onClick={onRemoveClick}
        title="Remove image"
      >
        <LucideX className="stroke-neutral-100 size-4" />
      </button>

      <div className="overflow-hidden rounded-md h-full">
        {/* eslint-disable-next-line */}
        <img className="size-full object-cover object-center" src={URL.createObjectURL(image)} alt={image.name} />
      </div>
    </div>
  )
}
