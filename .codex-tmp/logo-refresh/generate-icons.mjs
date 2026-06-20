import sharp from "/Users/juangaudino/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/lib/index.js";

const source = "/Users/juangaudino/Downloads/streex new3.png";
const outputDir = "/Users/juangaudino/Documents/Streex Gig Earnings App/streex-tracker/public/icons";

const pixel = await sharp(source)
  .extract({ left: 0, top: 0, width: 1, height: 1 })
  .removeAlpha()
  .raw()
  .toBuffer();

const background = { r: pixel[0], g: pixel[1], b: pixel[2], alpha: 1 };

async function squareIcon(name, size, logoWidthRatio) {
  const logoWidth = Math.round(size * logoWidthRatio);
  const logo = await sharp(source)
    .resize({ width: logoWidth, withoutEnlargement: false })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(`${outputDir}/${name}`);
}

await Promise.all([
  squareIcon("favicon-16x16.png", 16, 0.94),
  squareIcon("favicon-32x32.png", 32, 0.94),
  squareIcon("favicon-48x48.png", 48, 0.94),
  squareIcon("apple-touch-icon-152x152.png", 152, 0.82),
  squareIcon("apple-touch-icon-167x167.png", 167, 0.82),
  squareIcon("apple-touch-icon-180x180.png", 180, 0.82),
  squareIcon("pwa-192x192.png", 192, 0.76),
  squareIcon("pwa-512x512.png", 512, 0.76),
  squareIcon("pwa-1024x1024.png", 1024, 0.76),
]);
