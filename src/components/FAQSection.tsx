const FAQ_ITEMS = [
  {
    question: 'How does PriceGuard monitor my purchases?',
    answer:
      'Connect your retailer accounts and email receipts. We scan new purchases twice daily to identify eligible price adjustments.',
  },
  {
    question: 'What happens when a lower price is found?',
    answer:
      'We automatically file a claim with the retailer or your card issuer, track its status, and notify you when funds are returned.',
  },
  {
    question: 'Can I cancel at any time?',
    answer: 'Yes. Downgrade or cancel directly from the dashboard with no hidden fees or lock-in periods.',
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="bg-[#F9FAFB]">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6 lg:px-8">
        <header className="space-y-2 text-center">
          <h2>Frequently asked questions</h2>
          <p className="text-sm text-[#4B5563]">
            Everything you need to know about getting started with automated price protection.
          </p>
        </header>

        <div className="mx-auto max-w-3xl space-y-6">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              className="rounded-lg border border-[#E5E7EB] bg-white p-6 shadow-sm transition-all duration-150 ease-in-out hover:border-[#D1D5DB]"
            >
              <h3 className="text-base font-semibold text-[#374151]">{item.question}</h3>
              <p className="mt-2 text-sm text-[#4B5563]">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

