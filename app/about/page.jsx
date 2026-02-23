export const metadata = {
  title: 'About PrintPrep — Built for Etsy Digital Printable Sellers',
  description: 'PrintPrep resizes your digital artwork into every standard print size at 300 DPI. One upload, every format your customers need.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">About PrintPrep</h1>
        <p className="text-lg text-gray-600 mt-3 max-w-2xl mx-auto">
          The print-prep tool built specifically for digital printable sellers.
        </p>
      </div>

      <div className="space-y-10">
        {/* The Problem */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">The Problem</h2>
          <p className="text-gray-600 leading-relaxed">
            If you sell digital printables on Etsy, you know the drill: buyers expect every common
            print size in the listing. A single design might need 4&times;6, 5&times;7, 8&times;10,
            A4, 16&times;20, 24&times;36 — and more. Manually resizing, cropping, and exporting each
            one in Photoshop or Canva eats hours you could spend designing.
          </p>
        </section>

        {/* The Solution */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">The Solution</h2>
          <p className="text-gray-600 leading-relaxed">
            PrintPrep takes one high-resolution image and outputs every standard print size in a
            single click. You choose the crop, pick your ratios and sizes, and we handle the rest —
            proper 300 DPI output, Lanczos3 resampling, optional drop shadows, and custom background
            colors. Every file is named with its exact dimensions so your customers know exactly what
            they&apos;re getting.
          </p>
        </section>

        {/* Who It's For */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Who It&apos;s For</h2>
          <ul className="text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span><strong>Etsy digital printable sellers</strong> who need every standard size for their listings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span><strong>Print-on-demand creators</strong> preparing artwork for multiple product formats</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span><strong>Designers and illustrators</strong> who want to offer more sizes without more work</span>
            </li>
          </ul>
        </section>

        {/* What You Get */}
        <section className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">What You Get</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Up to 20 print sizes per orientation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>300 DPI output, always</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>5 aspect ratios: 2:3, 3:4, 4:5, 8:11, A-Series</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Portrait and landscape modes</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>Optional drop shadows and custom backgrounds</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 font-bold">✓</span>
              <span>One-click ZIP download of all sizes</span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pt-4">
          <a href="/pricing" className="btn-primary inline-block py-3 px-8 text-base">
            View Pricing
          </a>
          <p className="text-sm text-gray-500 mt-3">1 credit = 1 image, all selected sizes included.</p>
        </div>
      </div>
    </div>
  );
}
