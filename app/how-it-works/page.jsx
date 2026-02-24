export const metadata = {
  title: 'How It Works — PrintPrep',
  description: 'Upload one image, pick your sizes, and download print-ready files at 300 DPI. See how PrintPrep turns one design into every standard print format.',
};

export default function HowItWorksPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900">How It Works</h1>
        <p className="text-lg text-gray-600 mt-3 max-w-2xl mx-auto">
          One image in, every print size out. Four steps, under a minute.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-8 mb-16">
        <Step
          number="1"
          title="Upload Your Artwork"
          description="Upload a high-resolution JPG, PNG, TIFF, WebP, or BMP file — up to 300 MB and 100 megapixels. The higher the resolution, the more sizes you can produce at print quality."
        />
        <Step
          number="2"
          title="Choose Your Crop"
          description="Select an aspect ratio and position the crop exactly where you want it. PrintPrep locks the ratio so your artwork fills the frame perfectly — no stretching, no white bars."
        />
        <Step
          number="3"
          title="Pick Your Sizes"
          description="Check the sizes you want. PrintPrep shows you a color-coded DPI badge for each one so you know exactly which sizes will print well. Sizes below 150 DPI are automatically disabled."
        />
        <Step
          number="4"
          title="Download Everything"
          description="Hit Generate and download all your files individually or as a single ZIP. Every file is named with its dimensions, DPI, and millimeter equivalent — ready to upload directly to your Etsy listing."
        />
      </div>

      {/* Supported Sizes */}
      <section className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Supported Print Sizes</h2>
        <p className="text-gray-600 mb-6">
          Every ratio is available in both portrait and landscape. That&apos;s up to 20 sizes per
          orientation from a single upload.
        </p>

        <div className="space-y-4">
          <SizeRow
            ratio="2:3"
            sizes="4×6, 8×12, 16×24, 24×36"
          />
          <SizeRow
            ratio="3:4"
            sizes="6×8, 9×12, 12×16, 18×24"
          />
          <SizeRow
            ratio="4:5"
            sizes="4×5, 8×10, 16×20"
          />
          <SizeRow
            ratio="8:11"
            sizes="8×11"
          />
          <SizeRow
            ratio="A-Series"
            sizes="A7, A6, A5, A4, A3, A2, A1, A0"
          />
        </div>
      </section>

      {/* DPI Quality */}
      <section className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">DPI Quality Ratings</h2>
        <p className="text-gray-600 mb-6">
          Before you generate, PrintPrep calculates the effective DPI for every size based on your
          source image resolution. You&apos;ll see a badge next to each size:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
            <div>
              <span className="font-medium text-gray-900">Excellent</span>
              <span className="text-gray-500 text-sm ml-1">— 300+ DPI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-400" />
            <div>
              <span className="font-medium text-gray-900">Good</span>
              <span className="text-gray-500 text-sm ml-1">— 200–299 DPI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-400" />
            <div>
              <span className="font-medium text-gray-900">Fair</span>
              <span className="text-gray-500 text-sm ml-1">— 150–199 DPI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
            <div>
              <span className="font-medium text-gray-900">Low</span>
              <span className="text-gray-500 text-sm ml-1">— Below 150 DPI (disabled)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Output Details */}
      <section className="bg-white rounded-xl border border-gray-200 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Output Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8 text-gray-600">
          <div><span className="font-medium text-gray-900">Resolution:</span> 300 DPI, always</div>
          <div><span className="font-medium text-gray-900">Format:</span> JPEG (95% quality) or PNG for transparent backgrounds</div>
          <div><span className="font-medium text-gray-900">Resampling:</span> Lanczos3 for sharp detail</div>
          <div><span className="font-medium text-gray-900">Upscale sharpening:</span> Applied automatically when needed</div>
          <div><span className="font-medium text-gray-900">Shadows:</span> Optional drop shadow (10px offset, 20px blur)</div>
          <div><span className="font-medium text-gray-900">Backgrounds:</span> White default, custom hex color, or transparent</div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center pt-4">
        <a href="/pricing" className="btn-primary inline-block py-3 px-8 text-base">
          Get Started
        </a>
        <p className="text-sm text-gray-500 mt-3">
          1 credit = 1 image processed into all selected sizes.
        </p>
      </div>
    </div>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SizeRow({ ratio, sizes }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-block bg-gray-100 text-gray-800 text-sm font-mono font-medium px-2.5 py-0.5 rounded min-w-[5rem] text-center">
        {ratio}
      </span>
      <span className="text-gray-600">{sizes}</span>
    </div>
  );
}
