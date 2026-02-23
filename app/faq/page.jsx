'use client';

import { useState } from 'react';

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
        <p className="text-gray-600 mt-2">Everything you need to know about PrintPrep.</p>
      </div>

      <div className="space-y-3">
        <FAQItem
          question="What file formats can I upload?"
          answer="PrintPrep accepts JPG, JPEG, PNG, TIFF, WebP, and BMP files. Maximum file size is 50 MB, and the image can be up to 65 megapixels (roughly 8062×8062 pixels)."
        />
        <FAQItem
          question="What does '300 DPI' mean, and why does it matter?"
          answer="DPI (dots per inch) determines how sharp a printed image looks. At 300 DPI, every inch of the print contains 300 dots of detail — the industry standard for high-quality prints. Anything below 150 DPI tends to look pixelated, which is why PrintPrep disables those sizes."
        />
        <FAQItem
          question="Why are some sizes grayed out?"
          answer="If a size shows a red 'Low' badge and is disabled, your source image doesn't have enough pixels to produce that size at 150+ DPI. To unlock larger sizes, upload a higher-resolution image. The DPI badge next to each size shows you exactly what quality you'd get."
        />
        <FAQItem
          question="What print sizes does PrintPrep support?"
          answer={
            <>
              Five aspect ratios with up to 20 sizes per orientation:
              <br /><br />
              <strong>2:3</strong> — 4×6, 8×12, 16×24, 24×36<br />
              <strong>3:4</strong> — 6×8, 9×12, 12×16, 18×24<br />
              <strong>4:5</strong> — 4×5, 8×10, 16×20<br />
              <strong>8:11</strong> — 8×11<br />
              <strong>A-Series</strong> — A7 through A0<br /><br />
              All sizes are available in both portrait and landscape.
            </>
          }
        />
        <FAQItem
          question="How do credits work?"
          answer="1 credit = 1 image processed. When you generate outputs for an image, it costs one credit regardless of how many sizes or ratios you select. Unused credits carry over when you upgrade your plan and reset on renewal."
        />
        <FAQItem
          question="Can I reprocess an image I already uploaded?"
          answer="Yes. Your uploaded images stay in your history. You can go back, change the crop or select different sizes, and generate again — each reprocess costs one credit."
        />
        <FAQItem
          question="What's the difference between JPEG and PNG output?"
          answer="If you choose a solid background color (white or custom hex), PrintPrep outputs JPEG files at 95% quality — the best balance of file size and quality. If you choose a transparent background, the output is PNG to preserve the transparency."
        />
        <FAQItem
          question="What does the drop shadow option do?"
          answer="When enabled, PrintPrep adds a soft drop shadow behind your artwork (10px offset, 20px blur, 50% opacity black). This is useful for artwork on white or light backgrounds where you want the edges to stand out."
        />
        <FAQItem
          question="How are the output files named?"
          answer={
            <>
              Every file follows a consistent naming pattern:<br />
              <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">a4-8.27x11.69in-2481x3507px-210x297mm-1740268800.jpg</code><br /><br />
              That includes: size label, dimensions in inches, pixel dimensions, millimeters, and a timestamp. Your customers will know exactly what they&apos;re getting.
            </>
          }
        />
        <FAQItem
          question="Is there a limit on how many images I can process?"
          answer="Your monthly credit allowance depends on your plan — Starter (30 credits/mo), Professional (100/mo), or Enterprise (500/mo). Yearly plans give you the full annual allotment upfront at a discount."
        />
        <FAQItem
          question="Can I download individual sizes or do I have to download all of them?"
          answer="Both. After processing, you can download any individual output file or grab everything at once as a ZIP."
        />
        <FAQItem
          question="What happens if my upload is too large?"
          answer="Files over 50 MB or 65 megapixels will be rejected at upload. If your image is large but under the limits, PrintPrep handles the heavy lifting server-side — you don't need a powerful computer."
        />
      </div>

      {/* CTA */}
      <div className="text-center mt-12 pt-6 border-t border-gray-200">
        <p className="text-gray-600 mb-4">Still have questions?</p>
        <a href="/contact" className="btn-primary inline-block py-2.5 px-6">
          Contact Us
        </a>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900 pr-4">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {answer}
        </div>
      )}
    </div>
  );
}
