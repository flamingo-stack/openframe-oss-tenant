import React from 'react';

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
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
