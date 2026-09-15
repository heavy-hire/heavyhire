"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

interface Equipment {
  id: string;
  title: string;
  category: string;
  pricePerDay: number;
  location: string;
  city: string;
  images: string[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("ALL");

  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const url =
          category === "ALL"
            ? "/api/equipment"
            : `/api/equipment?category=${category}`;
        const res = await fetch(url);
        const data = await res.json();
        setEquipment(data);
      } catch (error) {
        console.error("Error fetching equipment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, [category]);

  const categories = [
    "ALL",
    "CONSTRUCTION",
    "AGRICULTURAL",
    "HEAVY_TRANSPORT",
    "REFRIGERATED",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteNav />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Browse Equipment
        </h1>

        {/* Category Filter */}
        <div className="mb-8 flex gap-3 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                category === cat
                  ? "bg-primary-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:border-primary-600"
              }`}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Equipment Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading equipment...</p>
          </div>
        ) : equipment.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No equipment found in this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map((item) => (
              <Link key={item.id} href={`/equipment/${item.id}`}>
                <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition cursor-pointer">
                  {/* Image */}
                  <div className="relative h-48 bg-gray-200 overflow-hidden">
                    {item.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        🏗️
                      </div>
                    )}
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white font-bold">
                          Not Available
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{item.location}</p>

                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <span className="text-2xl font-bold text-primary-600">
                          {item.pricePerDay.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-600"> /day</span>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="font-semibold">{item.rating}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          ({item.reviewCount} reviews)
                        </span>
                      </div>
                    </div>

                    <button className="w-full py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
                      View Details
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
