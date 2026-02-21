import sharp from "sharp";

export default async function Home() {
  let result;
  try {
    // Test 1: Create a canvas and render to PNG
    const buf = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    // Test 2: Resize (simulates the crop/resize pipeline)
    const resized = await sharp(buf).resize(100, 100).toBuffer();

    // Test 3: Composite (simulates pasting image onto background canvas)
    const canvas = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([{ input: resized, left: 50, top: 50 }])
      .jpeg({ quality: 95 })
      .withMetadata({ density: 300 })
      .toBuffer();

    const meta = await sharp(canvas).metadata();

    result = {
      success: true,
      sharpVersion: sharp.versions?.sharp || "unknown",
      tests: {
        createCanvas: `✅ ${buf.length} bytes`,
        resize: `✅ ${resized.length} bytes`,
        compositeWithDPI: `✅ ${canvas.length} bytes, density: ${meta.density}`,
      },
    };
  } catch (err) {
    result = { success: false, error: err.message, stack: err.stack };
  }

  return (
    <div style={{ fontFamily: "monospace", padding: 40 }}>
      <h1>Sharp Test on Hostinger Cloud</h1>
      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
