import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
const web = createRequire(new URL('../../web/package.json', import.meta.url));
const next = createRequire(web.resolve('next/package.json'));
interface ImagePipeline {
  removeAlpha(): ImagePipeline;
  greyscale(): ImagePipeline;
  raw(): ImagePipeline;
  toBuffer(options: {
    resolveWithObject: true;
  }): Promise<{ data: Buffer; info: { width: number; height: number; channels: number } }>;
}
const sharp = next('sharp') as (source: Buffer) => ImagePipeline;
const react = web('react') as {
  createElement: (type: unknown, props: Record<string, unknown>) => unknown;
};
const server = web('react-dom/server') as { renderToStaticMarkup: (element: unknown) => string };
const qr = web('qrcode.react') as { QRCodeSVG: unknown };
const zx = createRequire(web.resolve('@zxing/browser'))('@zxing/library') as {
  RGBLuminanceSource: new (value: Uint8ClampedArray, w: number, h: number) => unknown;
  HybridBinarizer: new (source: unknown) => unknown;
  BinaryBitmap: new (bin: unknown) => unknown;
  QRCodeReader: new () => { decode: (bitmap: unknown) => { getText: () => string } };
};
describe('Real QR renderer and ZXing decoder', () => {
  it('decodes an opaque ticket credential from a rendered QR image', async () => {
    const credential = 'tf1.00000000-0000-4000-8000-000000000001.' + 'a'.repeat(43);
    const svg = server.renderToStaticMarkup(
      react.createElement(qr.QRCodeSVG, { value: credential, size: 320, marginSize: 4 }),
    );
    const { data, info } = await sharp(Buffer.from(svg))
      .removeAlpha()
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(1);
    const result = new zx.QRCodeReader().decode(
      new zx.BinaryBitmap(
        new zx.HybridBinarizer(
          new zx.RGBLuminanceSource(new Uint8ClampedArray(data), info.width, info.height),
        ),
      ),
    );
    expect(result.getText()).toBe(credential);
  });
});
