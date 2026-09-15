import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50">
      <SiteNav />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Rent Heavy Equipment from Trusted Owners
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Find and hire construction equipment, agricultural machinery, heavy
              trucks, and refrigerated vehicles across East Africa. Secure,
              transparent, and reliable.
            </p>
            <div className="flex gap-4">
              <Link
                href="/equipment"
                className="px-8 py-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-bold text-lg transition"
              >
                Browse Equipment
              </Link>
              <Link
                href="/auth/register?role=OWNER"
                className="px-8 py-4 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-bold text-lg transition"
              >
                Become an Owner
              </Link>
            </div>
          </div>
          <div className="relative h-96 bg-gradient-to-br from-primary-100 to-blue-100 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🏗️</div>
                <p className="text-gray-600 font-semibold">
                  Heavy Equipment Rental
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-4">
            Why Choose HeavyHire?
          </h2>
          <p className="text-xl text-center text-gray-600 mb-16">
            The most trusted platform for equipment rental in East Africa
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "🔒",
                title: "Secure Escrow Payments",
                description:
                  "Your payments are held safely until the rental is completed successfully.",
              },
              {
                icon: "⭐",
                title: "Verified Owners",
                description:
                  "All equipment owners are verified with badges and customer reviews.",
              },
              {
                icon: "📍",
                title: "Local Equipment",
                description:
                  "Find equipment available in Kigali, Rwanda and across East Africa.",
              },
              {
                icon: "💬",
                title: "Direct Communication",
                description:
                  "Chat with owners directly about availability and specifications.",
              },
              {
                icon: "📋",
                title: "Detailed Tracking",
                description:
                  "Track your bookings in real-time with complete transparency.",
              },
              {
                icon: "🎖️",
                title: "Quality Assurance",
                description:
                  "Every piece of equipment meets our quality and safety standards.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-8 bg-gray-50 rounded-xl border border-gray-200"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipment Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Equipment Categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { category: "Construction", count: "50+ items", emoji: "🏗️" },
            { category: "Agricultural", count: "40+ items", emoji: "🚜" },
            { category: "Heavy Transport", count: "35+ items", emoji: "🚛" },
            {
              category: "Refrigerated Transport",
              count: "20+ items",
              emoji: "🧊",
            },
          ].map((cat, i) => (
            <Link
              key={i}
              href={`/equipment?category=${cat.category.replace(" ", "_").toUpperCase()}`}
              className="p-8 bg-gradient-to-br from-primary-50 to-blue-50 rounded-xl border border-primary-200 hover:shadow-lg transition cursor-pointer"
            >
              <div className="text-5xl mb-4">{cat.emoji}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {cat.category}
              </h3>
              <p className="text-gray-600">{cat.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of businesses and contractors using HeavyHire to find
            the right equipment at the right price.
          </p>
          <Link
            href="/auth/register"
            className="inline-block px-8 py-4 bg-white text-primary-600 rounded-lg hover:bg-gray-100 font-bold text-lg transition"
          >
            Create Your Account Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">HH</span>
                </div>
                <span className="font-bold text-white">HeavyHire</span>
              </Link>
              <p className="text-sm">
                The trusted platform for equipment rental across East Africa.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/equipment" className="hover:text-white">
                    Browse Equipment
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register?role=OWNER" className="hover:text-white">
                    Become an Owner
                  </Link>
                </li>
                <li>
                  <Link href="/auth/login" className="hover:text-white">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li>Email: info@heavyhire.rw</li>
                <li>Phone: +250 (0) 788 123 456</li>
                <li>Kigali, Rwanda</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2024 HeavyHire. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
