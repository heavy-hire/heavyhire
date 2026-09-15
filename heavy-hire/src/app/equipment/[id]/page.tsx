"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DayPicker, type DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface EquipmentDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  pricePerDay: number;
  pricePerWeek?: number;
  pricePerMonth?: number;
  location: string;
  city: string;
  country: string;
  images: string[];
  rating: number;
  reviewCount: number;
  minHireDays: number;
  specs: Record<string, any>;
  owner: {
    id: string;
    name: string;
    avatar?: string;
  };
}

// Date-only helpers that stay in the browser's local calendar day throughout.
// Using toISOString() (UTC) here would shift the date backward by a day for
// any positive UTC offset -- including Rwanda (UTC+2), this app's own market.
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateISO: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function todayISO() {
  return formatLocalDate(new Date());
}

function addDaysISO(dateISO: string, days: number) {
  const d = parseLocalDate(dateISO);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { status } = useSession();
  const id = params?.id as string;
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookedRanges, setBookedRanges] = useState<{ from: Date; to: Date }[]>([]);
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseLocalDate(todayISO()),
    to: parseLocalDate(addDaysISO(todayISO(), 1)),
  });
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchEquipment = async () => {
      try {
        const res = await fetch(`/api/equipment/${id}`);
        const data = await res.json();
        setEquipment(data);
      } catch (error) {
        console.error("Error fetching equipment:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailability = async () => {
      try {
        const res = await fetch(`/api/equipment/${id}/availability`);
        const data = await res.json();
        setBookedRanges(
          (data.bookedRanges || []).map((r: { from: string; to: string }) => ({
            from: startOfDay(new Date(r.from)),
            to: startOfDay(new Date(r.to)),
          }))
        );
      } catch (error) {
        console.error("Error fetching availability:", error);
      }
    };

    fetchEquipment();
    fetchAvailability();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Equipment not found</p>
          <Link href="/equipment" className="text-primary-600 font-semibold">
            Back to Equipment
          </Link>
        </div>
      </div>
    );
  }

  const hasValidRange = Boolean(range?.from && range?.to);
  const selectedDays = hasValidRange
    ? Math.max(
        1,
        Math.ceil(
          (range!.to!.getTime() - range!.from!.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;
  const totalPrice = equipment.pricePerDay * selectedDays;

  const handleBook = async () => {
    if (status !== "authenticated") {
      router.push("/auth/login");
      return;
    }

    if (!range?.from || !range?.to) {
      setBookingError("Please select a start and end date");
      return;
    }

    setBooking(true);
    setBookingError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipmentId: equipment.id,
          startDate: formatLocalDate(range.from),
          endDate: formatLocalDate(range.to),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create booking");
      }

      setBookingSuccess(true);
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/equipment" className="text-primary-600 font-semibold">
            ← Back to Equipment
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Images & Info */}
          <div className="lg:col-span-2">
            {/* Main Image */}
            <div className="relative h-96 bg-gray-200 rounded-2xl overflow-hidden mb-3">
              {equipment.images?.[activeImage] ? (
                <img
                  src={equipment.images[activeImage]}
                  alt={equipment.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  🏗️
                </div>
              )}
            </div>

            {/* Thumbnails */}
            <div className="flex gap-2 mb-6 min-h-[1px]">
              {equipment.images && equipment.images.length > 1 &&
                equipment.images.map((img, i) => (
                  <button
                    key={img}
                    onClick={() => setActiveImage(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      i === activeImage ? "border-primary-600" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
            </div>

            {/* Title & Info */}
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {equipment.title}
            </h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Rating</div>
                <div className="text-2xl font-bold">
                  ⭐ {equipment.rating}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Reviews</div>
                <div className="text-2xl font-bold">{equipment.reviewCount}</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Location</div>
                <div className="text-lg font-semibold">{equipment.city}</div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="text-sm text-gray-600">Min Hire</div>
                <div className="text-lg font-semibold">
                  {equipment.minHireDays} day{equipment.minHireDays > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white p-6 rounded-lg mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                About This Equipment
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {equipment.description}
              </p>
            </div>

            {/* Specifications */}
            {equipment.specs && Object.keys(equipment.specs).length > 0 && (
              <div className="bg-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Specifications
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(equipment.specs).map(([key, value]) => (
                    <div key={key}>
                      <dt className="font-semibold text-gray-900">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </dt>
                      <dd className="text-gray-600">{String(value)}</dd>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
              {/* Price */}
              <div className="mb-6">
                <div className="text-sm text-gray-600 mb-2">Price Per Day</div>
                <div className="text-4xl font-bold text-primary-600">
                  {equipment.pricePerDay.toLocaleString()}
                  <span className="text-lg"> RWF</span>
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Select dates
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden flex justify-center py-2">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    disabled={[{ before: parseLocalDate(todayISO()) }, ...bookedRanges]}
                    numberOfMonths={1}
                  />
                </div>
                {bookedRanges.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Greyed-out dates are already booked.
                  </p>
                )}
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 pt-6 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700">
                    {equipment.pricePerDay.toLocaleString()} × {selectedDays} day
                    {selectedDays !== 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold">
                    {totalPrice.toLocaleString()} RWF
                  </span>
                </div>
                {hasValidRange && selectedDays < equipment.minHireDays && (
                  <p className="text-sm text-red-600 mt-2">
                    Minimum hire is {equipment.minHireDays} day
                    {equipment.minHireDays > 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* CTA */}
              {bookingSuccess ? (
                <div className="mb-3 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  ✓ Booking request sent! Check your{" "}
                  <Link href="/dashboard" className="font-semibold underline">
                    dashboard
                  </Link>{" "}
                  for status.
                </div>
              ) : (
                <>
                  {bookingError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {bookingError}
                    </div>
                  )}
                  <button
                    onClick={handleBook}
                    disabled={booking || !hasValidRange || selectedDays < equipment.minHireDays}
                    className="block w-full py-3 bg-primary-600 text-white rounded-lg font-semibold text-center hover:bg-primary-700 transition mb-3 disabled:opacity-50"
                  >
                    {booking
                      ? "Booking..."
                      : status === "authenticated"
                      ? "Book Now"
                      : "Sign in to Book"}
                  </button>
                </>
              )}
              <button
                disabled
                title="Message the owner from your dashboard after booking"
                className="w-full py-3 border-2 border-gray-200 text-gray-400 rounded-lg font-semibold cursor-not-allowed"
              >
                Contact Owner (after booking)
              </button>

              {/* Owner Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Owner</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    {equipment.owner.avatar ? (
                      <img
                        src={equipment.owner.avatar}
                        alt={equipment.owner.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-lg">👤</span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {equipment.owner.name}
                    </p>
                    <p className="text-sm text-gray-600">Equipment Owner</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
