import React from 'react';

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  // biome-ignore lint/style/useNamingConvention: this shim stands in for `next/image` via a Vite alias, so its props must be spelled exactly as Next spells them. `blurDataUrl` would simply not be the prop callers pass.
  blurDataURL?: string;
  unoptimized?: boolean;
};

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  ({ fill, priority, quality, placeholder, blurDataURL, unoptimized, ...props }, ref) => {
    return <img ref={ref} {...props} />;
  },
);

Image.displayName = 'Image';

export default Image;
