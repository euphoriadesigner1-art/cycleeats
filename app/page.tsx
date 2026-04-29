import Link from "next/link";
import { Leaf, ScanLine, BarChart2, User } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <Leaf className="text-primary" size={22} />
          <span className="font-heading font-semibold text-stone-800">CycleEats</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-stone-600 hover:text-stone-800 font-medium">Sign in</Link>
          <Link href="/signup" className="text-sm bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary/90 transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-soft text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Leaf size={12} />
          AI-powered PCOS nutrition analysis
        </div>
        <h1 className="font-heading text-4xl sm:text-5xl font-semibold text-stone-800 leading-tight mb-4">
          Eat smarter for <span className="text-primary">PCOS</span>
        </h1>
        <p className="text-stone-500 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          Describe a meal, scan a barcode, or enter nutrition facts. CycleEats analyses every choice
          against your specific PCOS concerns and tells you exactly what to swap.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-primary text-white text-base font-medium px-8 py-3.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Start for free
        </Link>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: ScanLine,
              title: "3 Ways to Analyse",
              body: "Describe your meal in plain English, scan a product barcode with your camera, or type in nutrition label values.",
            },
            {
              icon: BarChart2,
              title: "PCOS-Specific Scoring",
              body: "Every meal gets scored 1–10 across insulin impact, androgen risk, inflammation, and fiber — tailored to your primary concern.",
            },
            {
              icon: User,
              title: "Your Profile, Your Weights",
              body: "Tell CycleEats whether you're focused on insulin resistance, acne, fertility, or weight. The AI adjusts its analysis accordingly.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
              <div className="w-10 h-10 bg-primary-soft rounded-xl flex items-center justify-center mb-4">
                <Icon size={20} className="text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-stone-800 mb-2">{title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
