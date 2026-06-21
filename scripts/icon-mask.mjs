import sharp from 'sharp';

const SRC = 'public/icons/crocodile/croc-source.jpg';
const OUT = 'public/icons/crocodile/croc-face.png';
const SIZE = 256;
const PAD = 14;
const NOISE = 28;
const GAIN = 1.35;

const { data, info } = await sharp(SRC)
  .toColourspace('b-w')
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;

const alpha = Buffer.alloc(width * height);
for (let i = 0; i < width * height; i++) {
  let a = (255 - data[i] - NOISE) * GAIN;
  a = a < 0 ? 0 : a > 255 ? 255 : a;
  alpha[i] = a;
}

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (alpha[y * width + x] > 20) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const bw = maxX - minX + 1;
const bh = maxY - minY + 1;

const cropped = Buffer.alloc(bw * bh * 4);
for (let y = 0; y < bh; y++) {
  for (let x = 0; x < bw; x++) {
    const a = alpha[(minY + y) * width + (minX + x)];
    const o = (y * bw + x) * 4;
    cropped[o] = 245;
    cropped[o + 1] = 239;
    cropped[o + 2] = 230;
    cropped[o + 3] = a;
  }
}

const inner = SIZE - PAD * 2;
const resized = await sharp(cropped, { raw: { width: bw, height: bh, channels: 4 } })
  .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([{ input: resized, gravity: 'center' }])
  .png()
  .toFile(OUT);

console.log('wrote', OUT, `(source ${width}x${height}, bbox ${bw}x${bh})`);
