import sharp from 'sharp';
const source = 'public/plans/floorplan-aligned.svg';
const raster = await sharp(source, { density: 216 }).resize(2646, 1740).png().toBuffer();
await sharp(raster).webp({ lossless: true }).toFile('public/plans/floorplan-focus.webp');
await sharp(raster).resize(1323, 870).blur(1.6).webp({ quality: 85 }).toFile('public/plans/floorplan-focus-blurred.webp');
