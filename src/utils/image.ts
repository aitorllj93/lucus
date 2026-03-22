import sharp from "sharp";

export type ImageTransformParams = {
	width?: number;
	height?: number;
	quality?: number;
	format?: "jpeg" | "png" | "webp" | "avif" | "gif" | "tiff";
	fit?: "cover" | "contain" | "fill" | "inside" | "outside";
	gravity?:
		| "north"
		| "northeast"
		| "east"
		| "southeast"
		| "south"
		| "southwest"
		| "west"
		| "northwest"
		| "center"
		| "centre"
		| "auto" // Automatic detection (uses attention strategy)
		| "attention" // Content-aware cropping focusing on interesting areas
		| "entropy"; // Edge detection based cropping
	blur?: number;
	sharpen?: boolean;
	grayscale?: boolean;
	rotate?: number;
	flip?: boolean;
	flop?: boolean;
	background?: string;
	animated?: boolean; // Controls whether to preserve animation (GIFs)
};

function hasTransformations(params: ImageTransformParams, ext: string): boolean {
	return !!(
		params.width ||
		params.height ||
		params.blur ||
		params.sharpen ||
		params.grayscale ||
		params.rotate ||
		params.flip ||
		params.flop ||
		(params.format && params.format !== ext) ||
		params.quality !== undefined // Any quality param should trigger transformation
	);
}

async function needsDeanimation(filePath: string, params: ImageTransformParams): Promise<boolean> {
	if (params.animated !== false) return false;

	try {
		const metadata = await sharp(filePath).metadata();
		return (metadata.pages ?? 1) > 1; // Only de-animate if actually animated
	} catch {
		return false;
	}
}

export async function needsTransformations(
  filePath: string,
  ext: string,
  params: ImageTransformParams,
) {
  return hasTransformations(params, ext) || (await needsDeanimation(filePath, params));
}

async function shouldPreserveAnimation(
  inputBuffer: Buffer,
  params: ImageTransformParams,
): Promise<boolean> {
  // If explicitly disabled via params, don't animate
  if (params.animated === false) {
    return false;
  }

  try {
    const metadata = await sharp(inputBuffer).metadata();
    const isAnimated = (metadata.pages ?? 1) > 1;

    // Only preserve animation if:
    // 1. Image is actually animated
    // 2. No incompatible transformations are requested
    const hasIncompatibleTransforms = !!(
      params.blur ||
      params.sharpen ||
      params.grayscale ||
      params.rotate ||
      params.flip ||
      params.flop
    );

    return isAnimated && !hasIncompatibleTransforms;
  } catch {
    return false;
  }
}

export async function transformImage(
  inputBuffer: Buffer,
  params: ImageTransformParams,
  originalFormat?: string,
): Promise<Buffer> {
  const preserveAnimation = await shouldPreserveAnimation(inputBuffer, params);
  // Only pass { animated: true } if we want to preserve animation
  // Otherwise, let Sharp use its default behavior (extract first frame)
  const sharpOptions = preserveAnimation ? { animated: true } : {};
  let pipeline = sharp(inputBuffer, sharpOptions);

  // Rotation
  if (params.rotate !== undefined) {
    pipeline = pipeline.rotate(params.rotate);
  }

  // Flip/Flop
  if (params.flip) {
    pipeline = pipeline.flip();
  }
  if (params.flop) {
    pipeline = pipeline.flop();
  }

  // Resize
  if (params.width !== undefined || params.height !== undefined) {
    const resizeOptions: sharp.ResizeOptions = {
      width: params.width,
      height: params.height,
      fit: params.fit ?? "cover",
    };

    if (params.gravity) {
      // Map gravity to Sharp's position or strategy
      if (params.gravity === "auto" || params.gravity === "attention") {
        // Use attention strategy to detect important areas (faces, objects, etc.)
        resizeOptions.position = sharp.strategy.attention;
      } else if (params.gravity === "entropy") {
        // Use entropy-based strategy for edge detection
        resizeOptions.position = sharp.strategy.entropy;
      } else {
        // Use static position
        resizeOptions.position = params.gravity;
      }
    }

    if (params.background) {
      resizeOptions.background = params.background;
    }

    pipeline = pipeline.resize(resizeOptions);
  }

  // Blur
  if (params.blur !== undefined && params.blur > 0) {
    pipeline = pipeline.blur(params.blur);
  }

  // Sharpen
  if (params.sharpen) {
    pipeline = pipeline.sharpen();
  }

  // Grayscale
  if (params.grayscale) {
    pipeline = pipeline.grayscale();
  }

  // Format and quality
  // Normalize jpg to jpeg for Sharp
  const format = params.format ?? getOutputFormat(originalFormat);
  const quality = params.quality ?? 80;


  if (format === "jpeg" || format === "jpg") {
    pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  } else if (format === "png") {
    pipeline = pipeline.png({ quality, compressionLevel: 9 });
  } else if (format === "webp") {
    pipeline = pipeline.webp({ quality, effort: preserveAnimation ? 4 : 6 });
  } else if (format === "avif") {
    pipeline = pipeline.avif({ quality });
  } else if (format === "gif") {
    pipeline = pipeline.gif();
  } else if (format === "tiff") {
    pipeline = pipeline.tiff({ quality });
  }

  return pipeline.toBuffer();
}

export const getOutputFormat = (ext?: string) => {
	const normalizedFormat = ext === "jpg" ? "jpeg" : ext;
  return normalizedFormat ?? "webp";
}
