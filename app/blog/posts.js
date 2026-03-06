// Static blog posts — replace with CMS/MDX when ready
export const posts = [
  {
    slug: 'why-300-dpi-matters',
    category: 'Tips',
    title: 'Why 300 DPI Actually Matters for Etsy Print Sellers',
    excerpt: "Your customers are counting on print quality they can't preview. Here's how to make sure every file you sell is truly print-ready.",
    date: 'January 2026',
    body: `
When a customer downloads your digital print and takes it to their local print shop, they're trusting that the file will look as good on paper as it did on their screen. That trust lives or dies with one number: DPI.

## What DPI Actually Means

DPI stands for "dots per inch" — how many dots of ink a printer places in each inch of the output. 300 DPI is the standard for professional-quality print. At 300 DPI, the individual dots are small enough that they blend together and look crisp to the human eye at normal viewing distance.

At 72 DPI (screen resolution) or even 150 DPI, those dots are visible as a subtle blur or pixelation, especially on larger prints.

## The Trap Most Sellers Fall Into

Here's the thing: just because your file is large doesn't mean it's 300 DPI. A 3000×4200 pixel image at 72 DPI will print at roughly 41×58 inches at screen quality — blurry and unusable. The same image tagged as 300 DPI prints at 10×14 inches, sharp and professional.

The pixel dimensions are identical. The metadata is different. Your printer reads the metadata.

## How PrintPrep Handles This

Every output from PrintPrep has 300 DPI metadata embedded using Sharp's \`withMetadata({ density: 300 })\`. The pixel dimensions are calculated to match — a 5×7 inch output is exactly 1500×2100 pixels. No guessing, no manual settings.

## What to Tell Your Buyers

Include a note in your listing that your files are "300 DPI print-ready." Most buyers won't know what that means, but print shops do — and it signals that you know what you're doing.
    `.trim(),
  },
  {
    slug: 'a-series-support',
    category: 'Product',
    title: 'PrintPrep Now Supports A-Series (ISO) Paper Sizes',
    excerpt: 'International buyers can now get perfectly-sized A4, A3, and A2 downloads from a single upload. No manual resizing needed.',
    date: 'December 2025',
    body: `
PrintPrep now supports A-Series (ISO 216) paper sizes alongside our existing US print ratios.

## What's New

You can now generate outputs for:

- **A5** — 148×210mm (5.83×8.27in) · 1748×2480px at 300 DPI
- **A4** — 210×297mm (8.27×11.69in) · 2480×3508px at 300 DPI
- **A3** — 297×420mm (11.69×16.54in) · 3508×4961px at 300 DPI
- **A2** — 420×594mm (16.54×23.39in) · 4961×7087px at 300 DPI
- **A1** — 594×841mm (23.39×33.11in) · 7087×10039px at 300 DPI

Portrait and landscape orientations are both available.

## Why This Matters

If you sell on Etsy, a significant portion of your buyers are outside the US — particularly in Europe, Australia, and the UK — where A-series paper is the standard. Without A-series sizes, those buyers either can't print your artwork at the right size, or they have to manually resize it themselves (which often results in blurry output and a support message to you).

Now you can offer A4 and A3 in the same listing without any extra work.

## How It Works

A-series uses a 1:√2 aspect ratio. The crop tool handles this the same as any other ratio — you adjust the crop, and PrintPrep generates all selected sizes from that single crop definition.

Start generating A-series outputs from any existing or new upload.
    `.trim(),
  },
  {
    slug: 'best-image-formats-etsy',
    category: 'Tips',
    title: 'The Best Image Formats for Etsy Digital Downloads',
    excerpt: 'JPG, PNG, or PDF? A practical guide to which format to offer in your Etsy listings — and when each one matters.',
    date: 'November 2025',
    body: `
When you set up a digital download listing on Etsy, you need to decide what file formats to include. Here's a practical breakdown of the main options.

## JPG — The Default Choice

For most wall art and printable art with solid or photographic backgrounds, JPG is the right call.

**Pros:**
- Universally supported — any printer, any device, any app can open a JPG
- Smaller file size than PNG at comparable quality
- Customers won't have trouble downloading or opening it

**Cons:**
- Lossy compression — at high quality settings (95+) this is invisible, but technically some data is lost
- No transparency support — backgrounds are always solid

**Use JPG when:** your artwork has a solid background color, or you're selling photographic art.

## PNG — For Transparent Backgrounds

PNG supports full transparency (alpha channel), which is essential if your artwork has no background and you want buyers to place it on colored paper or use it in a project.

**Pros:**
- True transparency — buyers see a checkerboard in image preview apps, get transparent background when printing or compositing
- Lossless compression — every pixel is preserved exactly

**Cons:**
- Larger file size (sometimes significantly)
- Some print shops have trouble with large transparent PNGs — they may add a white background automatically

**Use PNG when:** your design has a transparent or complex-edged background.

## PDF — For Framing and Professional Printing

PDF is the format print shops prefer. A PDF can contain vector graphics that stay crisp at any size, and most professional printers accept PDFs directly.

**Pros:**
- Native format for professional printers
- Can bundle multiple sizes in one file
- Preview looks exactly like the print output

**Cons:**
- Customers can't easily view or edit a PDF on mobile
- Larger than JPG at the same quality

**Use PDF when:** you're targeting buyers who will take files to a professional printer.

## What PrintPrep Outputs

PrintPrep currently outputs JPG (for solid backgrounds) and PNG (for transparent backgrounds). PDF export is in development. For most Etsy listings, offering JPGs of each size covers the vast majority of customer needs.
    `.trim(),
  },
];

export function getPost(slug) {
  return posts.find((p) => p.slug === slug) || null;
}
