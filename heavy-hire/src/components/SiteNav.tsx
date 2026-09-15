"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function SiteNav() {
  const { status } = useSession();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">HH</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">HeavyHire</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/equipment"
            className="text-gray-700 hover:text-primary-600 font-medium transition"
          >
            Browse Equipment
          </Link>
          {status === "authenticated" ? (
            <>
              <Link
                href="/dashboard"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-gray-700 hover:text-primary-600 font-medium transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="px-6 py-2 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-medium transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
