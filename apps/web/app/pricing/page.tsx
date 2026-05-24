import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — ChaiForms",
  description: "ChaiForms is free during the hackathon. See what's included.",
};

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect for getting started",
    badge: null,
    features: [
      "Up to 5 forms",
      "100 responses / month",
      "3 themes",
      "Basic analytics",
      "Share links",
    ],
    cta: "Get Started",
    ctaVariant: "secondary",
    gradient: "from-gray-600 to-gray-700",
  },
  {
    name: "Creator",
    price: "₹499",
    period: "per month",
    description: "For creators who need more power",
    badge: "Most Popular",
    features: [
      "Unlimited forms",
      "10,000 responses / month",
      "All 8 themes",
      "Advanced analytics",
      "CSV export",
      "Password protection",
      "Email notifications",
      "Custom slug",
    ],
    cta: "Start Building",
    ctaVariant: "primary",
    gradient: "from-orange-500 to-amber-600",
  },
  {
    name: "Pro",
    price: "₹1,499",
    period: "per month",
    description: "For teams and heavy users",
    badge: null,
    features: [
      "Everything in Creator",
      "Unlimited responses",
      "Team collaboration",
      "Custom domain",
      "Priority support",
      "API access",
      "White-label",
      "Webhook integrations",
    ],
    cta: "Contact Us",
    ctaVariant: "secondary",
    gradient: "from-purple-500 to-indigo-600",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span>☕</span>
            <span className="font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              ChaiForms
            </span>
          </Link>
          <Link
            href="/login"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg transition-colors font-semibold text-sm"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-full px-4 py-1.5 text-sm text-orange-400 mb-4">
            🎉 Hackathon special: everything is free!
          </div>
          <h1 className="text-4xl font-black mb-3">Simple, Transparent Pricing</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Start free, scale as you grow. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative border rounded-2xl overflow-hidden transition-all ${
                plan.badge
                  ? "border-orange-500/50 shadow-xl shadow-orange-500/10"
                  : "border-white/10"
              }`}
            >
              {plan.badge && (
                <div
                  className={`bg-gradient-to-r ${plan.gradient} text-white text-xs font-bold text-center py-1.5`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="bg-gray-800/50 p-6">
                <div
                  className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent mb-2`}
                >
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                <Link
                  href="/login"
                  className={`block w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.ctaVariant === "primary"
                      ? `bg-gradient-to-r ${plan.gradient} text-white hover:opacity-90 hover:scale-[1.02]`
                      : "border border-white/20 text-gray-300 hover:border-white/40 hover:text-white"
                  }`}
                >
                  {plan.cta}
                </Link>

                <div className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <span className="text-green-400 flex-shrink-0">✓</span>
                      <span className="text-gray-300">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 text-gray-500 text-sm">
          Questions? Open an issue on{" "}
          <Link href="https://github.com" className="text-orange-400 hover:underline">
            GitHub
          </Link>{" "}
          or{" "}
          <a href="mailto:hello@chaiforms.dev" className="text-orange-400 hover:underline">
            email us
          </a>
          .
        </div>
      </div>
    </div>
  );
}
